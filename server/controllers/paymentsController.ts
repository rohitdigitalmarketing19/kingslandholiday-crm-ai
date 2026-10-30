import { recordReceipt, moneyPaise } from '../services/receipts';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { runQuery, queryAll, queryOne } from '../db/connection';

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
  const id = `pay-link-${uuidv4()}`;
  const payKey = `pay_${randomBytes(24).toString('hex')}`;
  const gst = data.gst || 0;
  const fee = data.fee || 0;
  const discount = data.discount || 0;
  const netAmount = Math.max(0, data.amount + gst + fee - discount);
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

  return queryOne(`SELECT * FROM payment_links WHERE id = ?`, [id]);
}

export function getPaymentLinkByKey(payKey: string) {
  let link = queryOne(`SELECT * FROM payment_links WHERE pay_key = ?`, [payKey]);
  
  // Always cross-check with payment_installments (source of truth for EMI amounts)
  const inst = queryOne(`SELECT * FROM payment_installments WHERE pay_key = ?`, [payKey]);
  
  if (link && inst) {
    // Installment exists — if amount differs, sync the link to match the installment
    if (Number(inst.amount) !== Number(link.amount)) {
      runQuery(
        `UPDATE payment_links SET amount = ?, net_amount = ? WHERE pay_key = ?`,
        [inst.amount, inst.amount, payKey]
      );
      link.amount = inst.amount;
      link.net_amount = inst.amount;
    }
    return link;
  }
  
  if (link) return link;

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

export function updatePaymentVerificationStatus(id: string,status: 'Approved' | 'Rejected' | 'Pending Review',actor='system') {
  if(!['Approved','Rejected','Pending Review'].includes(status))throw Object.assign(new Error('Invalid verification status.'),{status:400});
  const sub=queryOne('SELECT * FROM payment_submissions WHERE id=?',[id]);if(!sub)return null;
  if(sub.verification_status==='Approved' && status!=='Approved')throw Object.assign(new Error('Verified money requires an audited correction.'),{status:409});
  if(status==='Approved')recordReceipt(sub.pay_key,sub.amount_paid,sub.utr_number,sub.payment_mode,'Receipt verified by staff',actor);
  runQuery('UPDATE payment_submissions SET verification_status=? WHERE id=?',[status,id]);return queryOne('SELECT * FROM payment_submissions WHERE id=?',[id]);
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
  const lead = queryOne(`SELECT * FROM leads WHERE id = ? OR trip_id = ?`, [leadId, leadId]);
  const targetLeadId = lead?.id || leadId;

  if(!lead) throw Object.assign(new Error('Lead not found.'),{status:404});
  const snapshot=queryOne('SELECT total_paise FROM booking_snapshots WHERE lead_id=?',[targetLeadId]);
  const quote=queryOne('SELECT final_selling_price FROM quotes WHERE lead_id=? ORDER BY created_at DESC LIMIT 1',[targetLeadId]);
  const cap=snapshot?.total_paise ?? (quote ? moneyPaise(quote.final_selling_price) : 0);
  const seen=new Set();let scheduleTotal=0;
  for(const row of installments) {
    const amount=moneyPaise(row.amount);if(amount<=0)throw Object.assign(new Error('Installment amounts must be positive.'),{status:400});scheduleTotal+=amount;
    if(row.id && seen.has(row.id))throw Object.assign(new Error('Duplicate installment.'),{status:400});seen.add(row.id);
    const prior=row.id ? queryOne('SELECT * FROM payment_installments WHERE id=?',[row.id]) : null;
    if(prior && prior.lead_id!==targetLeadId)throw Object.assign(new Error('Installment belongs to another booking.'),{status:403});
    if(prior?.paid_amount>0 && moneyPaise(prior.amount)!==amount)throw Object.assign(new Error('A received installment cannot be repriced.'),{status:409});
    if(!prior?.paid_amount && (row.payment_status==='Paid' || Number(row.paid_amount)>0))throw Object.assign(new Error('Use Record Payment to verify money received.'),{status:400});
  }
  for(const prior of queryAll('SELECT * FROM payment_installments WHERE lead_id=? AND paid_amount>0',[targetLeadId])) if(!seen.has(prior.id))scheduleTotal+=moneyPaise(prior.amount);
  if(scheduleTotal>cap)throw Object.assign(new Error('Installment schedule exceeds the quoted booking amount.'),{status:400});
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
