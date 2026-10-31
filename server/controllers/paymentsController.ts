import { paymentExpiry, assertPaymentLinkActive } from '../services/paymentExpiry';
import { recordReceipt, moneyPaise, collectedPaise } from '../services/receipts';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { saveDb, getDb, withDbPersistenceBatch, runQuery, queryAll, queryOne } from '../db/connection';

export function createPaymentLink(data: {
  leadId?: string;
  packageName: string;
  amount: number;
  gst?: number;
  fee?: number;
  discount?: number;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  destination?: string;
  travelDate?: string;
  adults?: number;
  children?: number;
  duration?: string;
  hotels?: string;
  travelers?: string;
}) {
  const amount=moneyPaise(data.amount),tax=moneyPaise(data.gst ?? 0),feePaise=moneyPaise(data.fee ?? 0),discountPaise=moneyPaise(data.discount ?? 0);
  const netPaise=amount+tax+feePaise-discountPaise;
  if(amount<=0 || netPaise<=0 || !Number.isSafeInteger(netPaise))throw Object.assign(new Error('Enter a positive payment request amount.'),{status:400});
  if(!data.customerName?.trim())throw Object.assign(new Error('Customer name is required.'),{status:400});
  if(data.leadId){
    const lead=queryOne('SELECT id,status FROM leads WHERE id=? OR trip_id=?',[data.leadId,data.leadId]);
    if(!lead)throw Object.assign(new Error('Lead not found.'),{status:404});
    if(/cancel|lost/i.test(lead.status))throw Object.assign(new Error('Cannot request payment for a cancelled lead.'),{status:409});
    const booking=queryOne('SELECT total_paise FROM booking_snapshots WHERE lead_id=?',[lead.id]);
    const quote=queryOne('SELECT final_selling_price FROM quotes WHERE lead_id=? ORDER BY created_at DESC LIMIT 1',[lead.id]);
    const cap=booking?.total_paise ?? (quote ? moneyPaise(quote.final_selling_price) : 0);
    if(netPaise>cap-collectedPaise(lead.id))throw Object.assign(new Error('Payment request exceeds the remaining booking balance.'),{status:400});
    data.leadId=lead.id;
  }
  const id = `pay-link-${uuidv4()}`;
  const payKey = `pay_${randomBytes(24).toString('hex')}`;
  const gst = data.gst || 0;
  const fee = data.fee || 0;
  const discount = data.discount || 0;
  const netAmount = netPaise/100;
  const now = new Date().toISOString();

  // Try to insert with extended columns
  try {
    runQuery(
      `INSERT INTO payment_links (id, pay_key, lead_id, package_name, amount, gst, fee, discount, net_amount, customer_name, customer_phone, customer_email, destination, travel_date, adults, children, duration, hotels, travelers, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)`,
      [
        id,
        payKey,
        data.leadId || '',
        data.packageName || 'Tour Booking',
        data.amount || 0,
        gst,
        fee,
        discount,
        netAmount,
        data.customerName || '',
        data.customerPhone || '',
        data.customerEmail || '',
        data.destination || '',
        data.travelDate || '',
        data.adults || 2,
        data.children || 0,
        data.duration || '',
        data.hotels || '',
        data.travelers || '',
        now,
      ]
    );
  } catch (_err) {
    // Fallback if column migration not yet run in memory
    runQuery(
      `INSERT INTO payment_links (id, pay_key, lead_id, package_name, amount, gst, fee, discount, net_amount, customer_name, customer_phone, duration, hotels, travelers, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?)`,
      [
        id,
        payKey,
        data.leadId || '',
        data.packageName || 'Tour Booking',
        data.amount || 0,
        gst,
        fee,
        discount,
        netAmount,
        data.customerName || '',
        data.customerPhone || '',
        data.duration || '',
        data.hotels || '',
        data.travelers || '',
        now,
      ]
    );
  }

  const saved=queryOne(`SELECT * FROM payment_links WHERE id = ?`, [id]);
  return {...saved,...paymentExpiry(saved)};
}

export function getPaymentLinkByKey(payKey: string) {
  let link = queryOne(`SELECT * FROM payment_links WHERE pay_key = ?`, [payKey]);
  
  // Always cross-check with payment_installments (source of truth for EMI amounts)
  const inst = queryOne(`SELECT * FROM payment_installments WHERE pay_key = ?`, [payKey]);
  
  if (link && inst) {
    // Reflect the saved installment without making a GET request mutate storage.
    link={...link,amount:inst.amount,net_amount:inst.amount,status:inst.payment_status,paid_amount:inst.paid_amount};
    return {...link,...paymentExpiry(link)};
  }
  
  if (link) return {...link,...paymentExpiry(link)};

  // Fallback: Build a virtual link object from the installment record
  if (inst) {
    const lead = queryOne(`SELECT * FROM leads WHERE id = ?`, [inst.lead_id]);
    return {
      id: inst.id,
      pay_key: inst.pay_key,
      lead_id: inst.lead_id,
      package_name: `${inst.title} - ${lead?.name || 'Customer'}`,
      amount: inst.amount,
      gst: 0,
      fee: 0,
      discount: 0,
      net_amount: inst.amount,
      customer_name: lead?.name || 'Customer',
      customer_phone: lead?.phone || '',
      customer_email: lead?.email || '',
      destination: lead?.destination || '',
      travel_date: inst.due_date || lead?.travel_date || '',
      status: inst.payment_status || 'Pending',
      created_at: inst.created_at
    };
  }
  return null;
}

export function getAllPaymentLinks(leadId?: string) {
  if (leadId) {
    const lead = queryOne(`SELECT id, trip_id FROM leads WHERE id = ? OR trip_id = ?`, [leadId, leadId]);
    const leadIds = Array.from(new Set([leadId, lead?.id, lead?.trip_id].filter(Boolean)));
    const placeholders = leadIds.map(() => '?').join(',');
    return queryAll(`SELECT * FROM payment_links WHERE lead_id IN (${placeholders}) ORDER BY created_at DESC`, leadIds);
  }
  return queryAll(`SELECT * FROM payment_links ORDER BY created_at DESC`);
}

export function createPaymentSubmission(data: {
  payKey?: string;
  leadId?: string;
  customerName: string;
  mobile: string;
  packageName: string;
  amountPaid: number;
  utrNumber: string;
  paymentMode: 'Razorpay' | 'UPI' | 'Bank Transfer' | 'Cash';
  receiptUrl?: string;
}) {
  assertPaymentLinkActive(data.payKey || '');
  const reference=(data.utrNumber || '').trim();
  if(!reference || reference.length>160)throw Object.assign(new Error('Enter the actual transaction reference / UTR.'),{status:400});
  const amount=moneyPaise(data.amountPaid);
  const request=queryOne('SELECT net_amount AS amount,paid_amount,status FROM payment_links WHERE pay_key=?',[data.payKey || '']) || queryOne('SELECT amount,paid_amount,payment_status AS status FROM payment_installments WHERE pay_key=?',[data.payKey || '']);
  if(!request || request.status==='Cancelled')throw Object.assign(new Error('This payment request is unavailable.'),{status:400});
  const previous=queryOne('SELECT * FROM payment_submissions WHERE pay_key=? AND utr_number=?',[data.payKey || '',reference]);
  if(previous){if(moneyPaise(previous.amount_paid)!==amount)throw Object.assign(new Error('This reference was already submitted with a different amount.'),{status:409});return previous;}
  if(amount<=0 || amount>moneyPaise(request.amount)-moneyPaise(request.paid_amount || 0))throw Object.assign(new Error('Submitted amount exceeds the remaining request balance.'),{status:400});
  data.utrNumber=reference;
  const id = `sub-${uuidv4()}`;
  const now = new Date().toISOString();

  runQuery(
    `INSERT INTO payment_submissions (id, pay_key, lead_id, customer_name, mobile, package_name, amount_paid, utr_number, payment_mode, receipt_url, verification_status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending Review', ?)`,
    [
      id,
      data.payKey || '',
      data.leadId || '',
      data.customerName || '',
      data.mobile || '',
      data.packageName || 'Tour Package',
      data.amountPaid || 0,
      data.utrNumber || '',
      data.paymentMode || 'UPI',
      data.receiptUrl || '',
      now,
    ]
  );

  if (data.leadId) {
    const noteId = `note-${uuidv4()}`;
    const noteText = `Payment Receipt Submitted: ₹${(data.amountPaid || 0).toLocaleString()} via ${data.paymentMode} (UTR: ${data.utrNumber || 'N/A'}). Verification Pending.`;
    runQuery(
      `INSERT INTO lead_notes (id, lead_id, text, type, timestamp) VALUES (?, ?, ?, 'Action', ?)`,
      [noteId, data.leadId, noteText, now]
    );

    runQuery(`UPDATE leads SET status = 'Payment Pending' WHERE id = ? AND status IN ('New', 'Qualified', 'Itinerary Sent')`, [data.leadId]);
  }

  return queryOne(`SELECT * FROM payment_submissions WHERE id = ?`, [id]);
}

export function getAllPaymentSubmissions(leadId?: string) {
  if (leadId) {
    const lead = queryOne(`SELECT id, trip_id FROM leads WHERE id = ? OR trip_id = ?`, [leadId, leadId]);
    const leadIds = Array.from(new Set([leadId, lead?.id, lead?.trip_id].filter(Boolean)));
    const placeholders = leadIds.map(() => '?').join(',');
    return queryAll(`SELECT * FROM payment_submissions WHERE lead_id IN (${placeholders}) ORDER BY created_at DESC`, leadIds);
  }
  return queryAll(`SELECT * FROM payment_submissions ORDER BY created_at DESC`);
}

export function clearAllPaymentSubmissions() {
  if(queryOne("SELECT id FROM payment_submissions WHERE verification_status='Approved' LIMIT 1"))throw Object.assign(new Error('Verified receipts cannot be deleted.'),{status:409});
  runQuery(`DELETE FROM payment_submissions`);
  return { success: true, message: 'All payment submissions cleared.' };
}

export function updatePaymentVerificationStatus(id:string,status:'Approved'|'Rejected'|'Pending Review',actor='system') {
  if(!['Approved','Rejected','Pending Review'].includes(status))throw Object.assign(new Error('Invalid verification status.'),{status:400});
  const sub=queryOne('SELECT * FROM payment_submissions WHERE id=?',[id]);if(!sub)return null;
  if(sub.verification_status==='Approved'){
    if(status!=='Approved')throw Object.assign(new Error('Verified money requires an audited correction.'),{status:409});
    return sub;
  }
  const db=getDb();db.run('BEGIN');
  try {
    if(status==='Approved'){
      const request=queryOne('SELECT id,paid_amount FROM payment_installments WHERE pay_key=?',[sub.pay_key]) || queryOne('SELECT id,paid_amount FROM payment_links WHERE pay_key=?',[sub.pay_key]);
      const existing=request ? queryOne('SELECT amount_paise,received_paise FROM receipt_events WHERE request_key=? AND reference=?',[request.id,sub.utr_number]) : null;
      if(existing){
        if(![existing.amount_paise,existing.received_paise].includes(moneyPaise(sub.amount_paid)))throw Object.assign(new Error('The recorded reference has a different received amount. Review the receipt before approval.'),{status:409});
      } else {
        const cumulative=(moneyPaise(request?.paid_amount || 0)+moneyPaise(sub.amount_paid))/100;
        recordReceipt(sub.pay_key,cumulative,sub.utr_number,sub.payment_mode,'Receipt verified by staff',actor,true);
      }
    }
    db.run('UPDATE payment_submissions SET verification_status=? WHERE id=?',[status,id]);db.run('COMMIT');
  }catch(error){db.run('ROLLBACK');throw error;}
  saveDb();return queryOne('SELECT * FROM payment_submissions WHERE id=?',[id]);
}

// Settings (Razorpay API Keys, UPI & Bank credentials)
export function getPaymentSettings() {
  let settings = queryOne(`SELECT * FROM payment_settings ORDER BY id ASC LIMIT 1`);
  if (!settings) {
    return { key_id:'', key_secret:'', upi_id:'', upi_payee:'', bank_name:'', bank_acc_num:'', bank_ifsc:'', bank_branch:'', bank_acc_name:'', support_phone:'', card_fee_percentage:0 };
  }
  if (settings.card_fee_percentage === undefined || settings.card_fee_percentage === null) {
    settings.card_fee_percentage = 2.5;
  }
  return settings;
}

export function savePaymentSettings(data: any) {
  const existing = queryOne(`SELECT * FROM payment_settings LIMIT 1`);
  const cardFee = data.card_fee_percentage !== undefined ? Number(data.card_fee_percentage) : 2.5;
  
  try {
    runQuery(`ALTER TABLE payment_settings ADD COLUMN card_fee_percentage REAL DEFAULT 2.5`);
  } catch (e) {}

  if (existing) {
    runQuery(
      `UPDATE payment_settings SET key_id = ?, key_secret = ?, upi_id = ?, upi_payee = ?, bank_name = ?, bank_acc_num = ?, bank_ifsc = ?, bank_branch = ?, bank_acc_name = ?, support_phone = ?, card_fee_percentage = ? WHERE id = ?`,
      [
        data.key_id || '',
        data.key_secret || existing?.key_secret || '',
        data.upi_id || '',
        data.upi_payee || '',
        data.bank_name || '',
        data.bank_acc_num || '',
        data.bank_ifsc || '',
        data.bank_branch || '',
        data.bank_acc_name || '',
        data.support_phone || '',
        cardFee,
        existing.id
      ]
    );
  } else {
    runQuery(
      `INSERT INTO payment_settings (key_id, key_secret, upi_id, upi_payee, bank_name, bank_acc_num, bank_ifsc, bank_branch, bank_acc_name, support_phone, card_fee_percentage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.key_id || '',
        data.key_secret || existing?.key_secret || '',
        data.upi_id || '',
        data.upi_payee || '',
        data.bank_name || '',
        data.bank_acc_num || '',
        data.bank_ifsc || '',
        data.bank_branch || '',
        data.bank_acc_name || '',
        data.support_phone || '',
        cardFee
      ]
    );
  }
  return getPaymentSettings();
}

// EMI / Installments Schedule
export function getLeadInstallments(leadId: string) {
  const lead = queryOne(`SELECT id, trip_id FROM leads WHERE id = ? OR trip_id = ?`, [leadId, leadId]);
  const leadIds = Array.from(new Set([leadId, lead?.id, lead?.trip_id].filter(Boolean)));
  const placeholders = leadIds.map(() => '?').join(',');
  
  let insts = queryAll(`SELECT * FROM payment_installments WHERE lead_id IN (${placeholders}) ORDER BY created_at ASC`, leadIds);
  
  // If no installments found in payment_installments, check ops_customer_installments fallback
  if (!insts || insts.length === 0) {
    const targetLeadId = lead?.id || leadId;
    const opsInsts = queryAll(
      `SELECT * FROM ops_customer_installments WHERE customer_id = ? OR customer_id = ? ORDER BY installment_number ASC`,
      [`cust-${targetLeadId}`, targetLeadId]
    );
    if (opsInsts && opsInsts.length > 0) {
      insts = opsInsts.map((oi: any) => ({
        id: oi.id,
        lead_id: targetLeadId,
        title: oi.title,
        amount: oi.amount,
        due_date: oi.due_date,
        payment_condition: oi.notes || '',
        payment_status: oi.status === 'Paid' ? 'Paid' : 'Pending',
        paid_amount: oi.status === 'Paid' ? oi.amount : 0,
        pay_key: oi.id,
        created_at: oi.paid_at || new Date().toISOString(),
      }));
    }
  }

  return insts || [];
}

export function saveInstallmentSchedule(leadId: string, installments: any[]) {
  return withDbPersistenceBatch(()=>{
    const db=getDb();db.run('BEGIN');
    try {const result=saveInstallmentScheduleRows(leadId,installments);db.run('COMMIT');return result;}
    catch(error){db.run('ROLLBACK');throw error;}
  });
}
function saveInstallmentScheduleRows(leadId: string, installments: any[]) {
  const lead = queryOne(`SELECT * FROM leads WHERE id = ? OR trip_id = ?`, [leadId, leadId]);
  const targetLeadId = lead?.id || leadId;

  if(!lead) throw Object.assign(new Error('Lead not found.'),{status:404});
  const snapshot=queryOne('SELECT total_paise FROM booking_snapshots WHERE lead_id=?',[targetLeadId]);
  const quote=queryOne('SELECT final_selling_price FROM quotes WHERE lead_id=? ORDER BY created_at DESC LIMIT 1',[targetLeadId]);
  const cap=snapshot?.total_paise ?? (quote ? moneyPaise(quote.final_selling_price) : 0);
  const seen=new Set(),seenKeys=new Set();let scheduleTotal=0;
  for(const row of installments) {
    if(!row.due_date || !/^\d{4}-\d{2}-\d{2}$/.test(row.due_date) || Number.isNaN(Date.parse(row.due_date)))throw Object.assign(new Error('Enter a valid due date for every installment.'),{status:400});
    const amount=moneyPaise(row.amount);if(amount<=0)throw Object.assign(new Error('Installment amounts must be positive.'),{status:400});scheduleTotal+=amount;
    if(row.id && seen.has(row.id))throw Object.assign(new Error('Duplicate installment.'),{status:400});seen.add(row.id);
    if(row.pay_key){
      if(seenKeys.has(row.pay_key))throw Object.assign(new Error('Duplicate installment payment link.'),{status:400});seenKeys.add(row.pay_key);
      const linked=queryOne('SELECT lead_id FROM payment_links WHERE pay_key=?',[row.pay_key]);
      const keyed=queryOne('SELECT id,lead_id FROM payment_installments WHERE pay_key=?',[row.pay_key]);
      if((linked && linked.lead_id!==targetLeadId) || (keyed && (keyed.lead_id!==targetLeadId || keyed.id!==row.id)))throw Object.assign(new Error('Payment link belongs to another installment or booking.'),{status:403});
    }
    const prior=row.id ? queryOne('SELECT * FROM payment_installments WHERE id=?',[row.id]) : null;
    if(prior && prior.lead_id!==targetLeadId)throw Object.assign(new Error('Installment belongs to another booking.'),{status:403});
    if(prior?.paid_amount>0 && moneyPaise(prior.amount)!==amount)throw Object.assign(new Error('A received installment cannot be repriced.'),{status:409});
    if(!prior?.paid_amount && (row.payment_status==='Paid' || Number(row.paid_amount)>0))throw Object.assign(new Error('Use Record Payment to verify money received.'),{status:400});
  }
  for(const prior of queryAll('SELECT * FROM payment_installments WHERE lead_id=? AND paid_amount>0',[targetLeadId])) if(!seen.has(prior.id))scheduleTotal+=moneyPaise(prior.amount);
  if(scheduleTotal>cap)throw Object.assign(new Error('Installment schedule exceeds the quoted booking amount.'),{status:400});
  // Deactivate links removed from the schedule so old URLs cannot collect money.
  for(const prior of queryAll('SELECT id,pay_key FROM payment_installments WHERE lead_id=? AND COALESCE(paid_amount,0)=0',[targetLeadId])) {
    if(!installments.some(row=>row.id===prior.id || row.pay_key && row.pay_key===prior.pay_key))runQuery("UPDATE payment_links SET status='Cancelled' WHERE pay_key=? AND COALESCE(paid_amount,0)=0",[prior.pay_key]);
  }
  // Delete existing non-paid installments for this lead
  runQuery(`DELETE FROM payment_installments WHERE (lead_id = ? OR lead_id = ?) AND COALESCE(paid_amount,0) = 0`, [targetLeadId, leadId]);

  const savedInstallments = [];
  const now = new Date().toISOString();

  for (let idx = 0; idx < installments.length; idx++) {
    const inst = installments[idx];
    const id = inst.id || `inst-${uuidv4()}`;
    const prior=queryOne('SELECT * FROM payment_installments WHERE id=?',[id]);
    if(prior?.paid_amount>0) {savedInstallments.push(prior);continue;}
    const payKey = inst.pay_key || `pay_${randomBytes(24).toString('hex')}`;
    const instComment = inst.comments || inst.notes || '';

    try {
      runQuery(
        `INSERT OR REPLACE INTO payment_installments (id, lead_id, title, amount, due_date, payment_condition, payment_status, paid_amount, pay_key, comments, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          targetLeadId,
          inst.title || `Installment ${idx + 1}`,
          inst.amount || 0,
          inst.due_date || '',
          inst.payment_condition || '',
          inst.payment_status || 'Pending',
          inst.paid_amount || 0,
          payKey,
          instComment,
          instComment,
          now,
        ]
      );
    } catch (_e) {
      runQuery(
        `INSERT OR REPLACE INTO payment_installments (id, lead_id, title, amount, due_date, payment_condition, payment_status, paid_amount, pay_key, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          targetLeadId,
          inst.title || `Installment ${idx + 1}`,
          inst.amount || 0,
          inst.due_date || '',
          inst.payment_condition || '',
          inst.payment_status || 'Pending',
          inst.paid_amount || 0,
          payKey,
          now,
        ]
      );
    }

    // Sync matching payment_link record so URL lookups and link list work seamlessly (only if payKey exists)
    if (payKey) {
      const existingLink = queryOne(`SELECT id FROM payment_links WHERE pay_key = ?`, [payKey]);
      const linkPkgTitle = `${inst.title || `Installment ${idx + 1}`} - ${lead?.name || 'Customer'}`;
      if (!existingLink) {
        const linkId = `link-${uuidv4()}`;
        try {
          runQuery(
            `INSERT INTO payment_links (id, pay_key, lead_id, package_name, amount, gst, fee, discount, net_amount, customer_name, customer_phone, customer_email, destination, travel_date, comments, notes, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              linkId,
              payKey,
              targetLeadId,
              linkPkgTitle,
              inst.amount || 0,
              0,
              0,
              0,
              inst.amount || 0,
              lead?.name || 'Customer',
              lead?.phone || '',
              lead?.email || '',
              lead?.destination || '',
              inst.due_date || lead?.travel_date || '',
              instComment,
              instComment,
              inst.payment_status || 'Pending',
              now
            ]
          );
        } catch (_linkErr) {
          runQuery(
            `INSERT INTO payment_links (id, pay_key, lead_id, package_name, amount, gst, fee, discount, net_amount, customer_name, customer_phone, customer_email, destination, travel_date, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              linkId,
              payKey,
              targetLeadId,
              linkPkgTitle,
              inst.amount || 0,
              0,
              0,
              0,
              inst.amount || 0,
              lead?.name || 'Customer',
              lead?.phone || '',
              lead?.email || '',
              lead?.destination || '',
              inst.due_date || lead?.travel_date || '',
              inst.payment_status || 'Pending',
              now
            ]
          );
        }
      } else {
        try {
          runQuery(
            `UPDATE payment_links SET amount = ?, net_amount = ?, package_name = ?, customer_name = ?, status = ?, travel_date = ?, comments = ?, notes = ? WHERE pay_key = ?`,
            [inst.amount || 0, inst.amount || 0, linkPkgTitle, lead?.name || 'Customer', inst.payment_status || 'Pending', inst.due_date || '', instComment, instComment, payKey]
          );
        } catch (_updErr) {
          runQuery(
            `UPDATE payment_links SET amount = ?, net_amount = ?, package_name = ?, customer_name = ?, status = ?, travel_date = ? WHERE pay_key = ?`,
            [inst.amount || 0, inst.amount || 0, linkPkgTitle, lead?.name || 'Customer', inst.payment_status || 'Pending', inst.due_date || '', payKey]
          );
        }
      }
    }

    savedInstallments.push(queryOne(`SELECT * FROM payment_installments WHERE id = ?`, [id]));
  }

  for(const prior of queryAll('SELECT * FROM payment_installments WHERE lead_id=? AND paid_amount>0',[targetLeadId])) if(!savedInstallments.some(row=>row.id===prior.id))savedInstallments.push(prior);

  // Also sync directly to ops_customer_installments if customer exists in operations
  try {
    const custId = `cust-${targetLeadId}`;
    const opsCust = queryOne(`SELECT id FROM ops_customers WHERE id = ? OR booking_id = ?`, [custId, lead?.trip_id]);
    if (opsCust) {
      runQuery(`DELETE FROM ops_customer_installments WHERE customer_id = ?`, [opsCust.id]);
      for (let i = 0; i < savedInstallments.length; i++) {
        const sInst = savedInstallments[i];
        if (!sInst) continue;
        const sComment = sInst.comments || sInst.notes || sInst.payment_condition || '';
        runQuery(
          `INSERT INTO ops_customer_installments (id, customer_id, installment_number, title, amount, due_date, status, paid_at, payment_mode, transaction_ref, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            sInst.id,
            opsCust.id,
            i + 1,
            sInst.title,
            sInst.amount,
            sInst.due_date || '',
            sInst.payment_status || 'Pending',
            sInst.payment_status === 'Paid' ? now.split('T')[0] : '',
            sInst.payment_mode || '',
            sInst.transaction_ref || '',
            sComment
          ]
        );
      }
    }
  } catch (_syncErr) {}

  return savedInstallments;
}

export function updateInstallmentComment(id: string, comment: string) {
  const commentText = (comment || '').trim();
  try {
    runQuery(
      `UPDATE payment_installments SET comments = ?, notes = ? WHERE id = ? OR pay_key = ?`,
      [commentText, commentText, id, id]
    );
  } catch (_e) {}

  try {
    runQuery(
      `UPDATE ops_customer_installments SET notes = ? WHERE id = ?`,
      [commentText, id]
    );
  } catch (_e) {}

  try {
    runQuery(
      `UPDATE payment_links SET comments = ?, notes = ? WHERE pay_key = ? OR id = ?`,
      [commentText, commentText, id, id]
    );
  } catch (_e) {}

  return queryOne(`SELECT * FROM payment_installments WHERE id = ? OR pay_key = ?`, [id, id]) || { id, comments: commentText, notes: commentText };
}

export function updateInstallmentStatus(id: string,status: 'Pending' | 'Paid',paidAmount?: number,paymentMode?: string,transactionRef?: string,comments?: string,actor='system') {
  if(status!=='Paid') {
    const row=queryOne('SELECT * FROM payment_installments WHERE id=? OR pay_key=?',[id,id]);
    if(!row) throw Object.assign(new Error('Installment not found.'),{status:404});
    if(row.paid_amount>0) throw Object.assign(new Error('Verified receipts cannot be reset. An audited correction is required.'),{status:409});
    return row;
  }
  recordReceipt(id,paidAmount,transactionRef,paymentMode,comments,actor);
  return queryOne('SELECT * FROM payment_installments WHERE id=? OR pay_key=?',[id,id]);
}

export function confirmPaymentLink(payKeyOrId: string,refNumber?: string,paymentMode?: string,amount?: number,comments?: string,actor='system') {
  return recordReceipt(payKeyOrId,amount,refNumber,paymentMode,comments,actor);
}
