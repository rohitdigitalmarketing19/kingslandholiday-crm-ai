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
  const payKey = `pay_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
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
  runQuery(`DELETE FROM payment_submissions`);
  return { success: true, message: 'All payment submissions cleared.' };
}

export function updatePaymentVerificationStatus(id: string, status: 'Approved' | 'Rejected' | 'Pending Review') {
  runQuery(`UPDATE payment_submissions SET verification_status = ? WHERE id = ?`, [status, id]);
  const sub = queryOne(`SELECT * FROM payment_submissions WHERE id = ?`, [id]);

  if (sub && sub.lead_id) {
    const now = new Date().toISOString();
    const noteId = `note-${uuidv4()}`;
    const noteText = `Payment Verification Status Updated to: ${status} (₹${sub.amount_paid} - UTR: ${sub.utr_number})`;
    runQuery(
      `INSERT INTO lead_notes (id, lead_id, text, type, timestamp) VALUES (?, ?, ?, 'StatusChange', ?)`,
      [noteId, sub.lead_id, noteText, now]
    );

    if (status === 'Approved') {
      runQuery(`UPDATE leads SET status = 'Closed Won' WHERE id = ?`, [sub.lead_id]);
    }
  }

  return sub;
}

// Settings (Razorpay API Keys, UPI & Bank credentials)
export function getPaymentSettings() {
  let settings = queryOne(`SELECT * FROM payment_settings ORDER BY id ASC LIMIT 1`);
  if (!settings) {
    return {
      key_id: 'rzp_test_51HKingslandDemoKey',
      key_secret: '',
      upi_id: 'kingslandholiday@okicici',
      upi_payee: 'Kingsland Holidays Services Pvt Ltd',
      bank_name: 'HDFC Bank',
      bank_acc_num: '50200087628332',
      bank_ifsc: 'HDFC0001234',
      bank_branch: 'Connaught Place, New Delhi',
      bank_acc_name: 'Kingsland Holidays Services',
      support_phone: '+91 6376983416',
      card_fee_percentage: 2.5
    };
  }
  if (settings.card_fee_percentage === undefined || settings.card_fee_percentage === null) {
    settings.card_fee_percentage = 2.5;
  }
  return settings;
}

export function savePaymentSettings(data: any) {
  const existing = queryOne(`SELECT id FROM payment_settings LIMIT 1`);
  const cardFee = data.card_fee_percentage !== undefined ? Number(data.card_fee_percentage) : 2.5;
  
  try {
    runQuery(`ALTER TABLE payment_settings ADD COLUMN card_fee_percentage REAL DEFAULT 2.5`);
  } catch (e) {}

  if (existing) {
    runQuery(
      `UPDATE payment_settings SET key_id = ?, key_secret = ?, upi_id = ?, upi_payee = ?, bank_name = ?, bank_acc_num = ?, bank_ifsc = ?, bank_branch = ?, bank_acc_name = ?, support_phone = ?, card_fee_percentage = ? WHERE id = ?`,
      [
        data.key_id || '',
        data.key_secret || '',
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
        data.key_secret || '',
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

  // Delete existing non-paid installments for this lead
  runQuery(`DELETE FROM payment_installments WHERE (lead_id = ? OR lead_id = ?) AND payment_status != 'Paid'`, [targetLeadId, leadId]);

  const savedInstallments = [];
  const now = new Date().toISOString();

  for (let idx = 0; idx < installments.length; idx++) {
    const inst = installments[idx];
    const id = inst.id || `inst-${uuidv4()}`;
    const payKey = inst.pay_key || `pay_inst_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

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

    // Sync matching payment_link record so URL lookups and link list work seamlessly
    const existingLink = queryOne(`SELECT id FROM payment_links WHERE pay_key = ?`, [payKey]);
    const linkPkgTitle = `${inst.title || `Installment ${idx + 1}`} - ${lead?.name || 'Customer'}`;
    if (!existingLink) {
      const linkId = `link-${uuidv4()}`;
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
    } else {
      runQuery(
        `UPDATE payment_links SET amount = ?, net_amount = ?, package_name = ?, customer_name = ?, status = ?, travel_date = ? WHERE pay_key = ?`,
        [inst.amount || 0, inst.amount || 0, linkPkgTitle, lead?.name || 'Customer', inst.payment_status || 'Pending', inst.due_date || '', payKey]
      );
    }

    savedInstallments.push(queryOne(`SELECT * FROM payment_installments WHERE id = ?`, [id]));
  }

  // Also sync directly to ops_customer_installments if customer exists in operations
  try {
    const custId = `cust-${targetLeadId}`;
    const opsCust = queryOne(`SELECT id FROM ops_customers WHERE id = ? OR booking_id = ?`, [custId, lead?.trip_id]);
    if (opsCust) {
      runQuery(`DELETE FROM ops_customer_installments WHERE customer_id = ?`, [opsCust.id]);
      for (let i = 0; i < savedInstallments.length; i++) {
        const sInst = savedInstallments[i];
        if (!sInst) continue;
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
            sInst.payment_status === 'Paid' ? 'Paid' : 'Pending',
            sInst.payment_status === 'Paid' ? now.split('T')[0] : '',
            '',
            '',
            sInst.payment_condition || ''
          ]
        );
      }
    }
  } catch (_syncErr) {}

  return savedInstallments;
}

export function updateInstallmentStatus(
  id: string,
  status: 'Pending' | 'Paid',
  paidAmount?: number,
  paymentMode?: string,
  transactionRef?: string
) {
  const now = new Date().toISOString().split('T')[0];
  const nowIso = new Date().toISOString();
  const mode = paymentMode || 'UPI';
  const ref = transactionRef || `TXN-${Math.floor(100000 + Math.random() * 900000)}`;

  // 1. Update in payment_installments (by id or by pay_key)
  runQuery(
    `UPDATE payment_installments
     SET payment_status = ?, paid_amount = ?, paid_at = ?, payment_mode = ?, transaction_ref = ?
     WHERE id = ? OR pay_key = ?`,
    [status, status === 'Paid' ? (paidAmount || 0) : 0, status === 'Paid' ? now : '', status === 'Paid' ? mode : '', status === 'Paid' ? ref : '', id, id]
  );

  let inst = queryOne(`SELECT * FROM payment_installments WHERE id = ? OR pay_key = ?`, [id, id]);

  // 2. Update payment_links
  const paidAmt = status === 'Paid' ? (paidAmount || inst?.amount || 0) : 0;
  runQuery(
    `UPDATE payment_links
     SET status = ?, paid_amount = ?, paid_at = ?, transaction_ref = ?, payment_mode = ?
     WHERE pay_key = ? OR id = ?`,
    [status, paidAmt, status === 'Paid' ? now : '', status === 'Paid' ? ref : '', status === 'Paid' ? mode : '', id, id]
  );
  if (inst && inst.pay_key) {
    runQuery(
      `UPDATE payment_links
       SET status = ?, paid_amount = ?, paid_at = ?, transaction_ref = ?, payment_mode = ?
       WHERE pay_key = ?`,
      [status, paidAmt, status === 'Paid' ? now : '', status === 'Paid' ? ref : '', status === 'Paid' ? mode : '', inst.pay_key]
    );
  }

  // 3. Sync with ops_customer_installments
  try {
    if (inst) {
      const custId = `cust-${inst.lead_id}`;
      runQuery(
        `UPDATE ops_customer_installments
         SET status = ?, paid_at = ?, payment_mode = ?, transaction_ref = ?
         WHERE id = ? OR (customer_id = ? AND title = ?)`,
        [status, status === 'Paid' ? now : '', status === 'Paid' ? mode : '', status === 'Paid' ? ref : '', inst.id, custId, inst.title]
      );
    } else {
      // Direct update by installment id in ops_customer_installments
      runQuery(
        `UPDATE ops_customer_installments
         SET status = ?, paid_at = ?, payment_mode = ?, transaction_ref = ?
         WHERE id = ?`,
        [status, status === 'Paid' ? now : '', status === 'Paid' ? mode : '', status === 'Paid' ? ref : '', id]
      );
    }
  } catch (_e) {}

  // 4. If marked as Paid, create/update payment_submissions audit trail
  if (status === 'Paid' && inst) {
    try {
      const lead = queryOne(`SELECT * FROM leads WHERE id = ?`, [inst.lead_id]);
      const subId = `sub-${uuidv4()}`;
      runQuery(
        `INSERT INTO payment_submissions (id, pay_key, lead_id, customer_name, mobile, package_name, amount_paid, utr_number, payment_mode, verification_status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Approved', ?)`,
        [
          subId,
          inst.pay_key || id,
          inst.lead_id,
          lead?.name || 'Customer',
          lead?.phone || '',
          inst.title || 'EMI Installment',
          paidAmt,
          ref,
          mode,
          nowIso
        ]
      );
    } catch (_subErr) {}
  }

  return inst || { id, status, paidAmount: paidAmt };
}

export function confirmPaymentLink(
  payKeyOrId: string,
  refNumber?: string,
  paymentMode?: string,
  amount?: number
) {
  const now = new Date().toISOString().split('T')[0];
  const nowIso = new Date().toISOString();
  const mode = paymentMode || 'UPI';
  const ref = refNumber || `CONFIRMED-${Date.now()}`;

  // 1. Update link
  const link = queryOne(`SELECT * FROM payment_links WHERE pay_key = ? OR id = ?`, [payKeyOrId, payKeyOrId]);
  const inst = queryOne(`SELECT * FROM payment_installments WHERE pay_key = ? OR id = ?`, [payKeyOrId, payKeyOrId]);
  const paidAmt = amount || link?.net_amount || link?.amount || inst?.amount || 0;
  const leadId = link?.lead_id || inst?.lead_id || '';

  runQuery(
    `UPDATE payment_links SET status = 'Paid', paid_amount = ?, paid_at = ?, transaction_ref = ?, payment_mode = ? WHERE pay_key = ? OR id = ?`,
    [paidAmt, now, ref, mode, payKeyOrId, payKeyOrId]
  );

  // 2. Update installment
  runQuery(
    `UPDATE payment_installments
     SET payment_status = 'Paid', paid_amount = ?, paid_at = ?, payment_mode = ?, transaction_ref = ?
     WHERE pay_key = ? OR id = ?`,
    [paidAmt, now, mode, ref, payKeyOrId, payKeyOrId]
  );

  // 3. Update ops customer installments
  if (leadId) {
    const custId = `cust-${leadId}`;
    const opsCust = queryOne("SELECT id FROM ops_customers WHERE id = ? OR id = ? OR booking_id = ?", [custId, leadId, leadId]);
    const targetCustId = opsCust ? opsCust.id : custId;

    // Check if there is an ops installment with this id or pay_key
    const matchedInst = queryOne("SELECT id FROM ops_customer_installments WHERE id = ? OR id = ?", [payKeyOrId, link?.id || inst?.id]);
    if (matchedInst) {
      runQuery(
        `UPDATE ops_customer_installments
         SET status = 'Paid', paid_at = ?, payment_mode = ?, transaction_ref = ?
         WHERE id = ?`,
        [now, mode, ref, matchedInst.id]
      );
    } else {
      // Find the first pending/overdue installment for this customer
      const firstPending = queryOne(
        "SELECT id FROM ops_customer_installments WHERE customer_id = ? AND status != 'Paid' ORDER BY installment_number ASC LIMIT 1",
        [targetCustId]
      );
      if (firstPending) {
        runQuery(
          `UPDATE ops_customer_installments
           SET status = 'Paid', paid_at = ?, payment_mode = ?, transaction_ref = ?
           WHERE id = ?`,
          [now, mode, ref, firstPending.id]
        );
      }
    }
  }

  // 4. Create an entry in payment_submissions so it shows in "Submissions & UTR / Confirmation" tab
  try {
    const lead = leadId ? queryOne(`SELECT * FROM leads WHERE id = ?`, [leadId]) : null;
    const subId = `sub-${uuidv4()}`;
    const custName = link?.customer_name || lead?.name || 'Customer';
    const custPhone = link?.customer_phone || lead?.phone || '';
    const pkgName = link?.package_name || inst?.title || 'Tour Payment';

    runQuery(
      `INSERT INTO payment_submissions (id, pay_key, lead_id, customer_name, mobile, package_name, amount_paid, utr_number, payment_mode, verification_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Approved', ?)`,
      [
        subId,
        link?.pay_key || inst?.pay_key || payKeyOrId,
        leadId,
        custName,
        custPhone,
        pkgName,
        paidAmt,
        ref,
        mode,
        nowIso
      ]
    );
  } catch (_subErr) {}

  // 5. Add note to lead
  if (leadId) {
    try {
      const noteText = `Payment Confirmed: ₹${paidAmt.toLocaleString()} via ${mode} (Ref: ${ref}) for ${link?.package_name || inst?.title || 'Package'}`;
      runQuery(
        `INSERT INTO lead_notes (id, lead_id, text, type, timestamp) VALUES (?, ?, ?, 'Action', ?)`,
        [`note-${uuidv4()}`, leadId, noteText, nowIso]
      );
    } catch (_noteErr) {}
  }

  return { success: true, payKeyOrId, status: 'Paid', amount: paidAmt, refNumber: ref };
}
