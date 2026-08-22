import { runQuery, queryAll, queryOne } from '../db/connection';
import { INITIAL_CUSTOMERS, INITIAL_HOTEL_VOUCHERS, INITIAL_ITINERARIES } from '../../operations-team-portal/src/data/mockData';

// --- Hydration Helpers ---

function hydrateCustomer(row: any): any {
  if (!row) return null;
  const customer = {
    id: row.id,
    bookingId: row.booking_id,
    name: row.name,
    email: row.email || '',
    phone: row.phone || '',
    destination: row.destination || '',
    startDate: row.start_date || '',
    endDate: row.end_date || '',
    paxAdults: row.pax_adults || 2,
    paxChildren: row.pax_children || 0,
    totalAmount: row.total_amount || 0,
    currency: row.currency || 'INR',
    assignedOpsManager: row.assigned_ops_manager || '',
    status: row.status || 'Upcoming',
    notes: row.notes || '',
    specialRequests: row.special_requests || '',
    emergencyContact: row.emergency_contact || '',
    driverName: row.driver_name || '',
    driverPhone: row.driver_phone || '',
    cabModel: row.cab_model || '',
    cabNumber: row.cab_number || '',
    cabPickupLocation: row.cab_pickup_location || '',

    hotelTotalCost: row.hotel_total_cost || 0,
    hotelPaymentStatus: row.hotel_payment_status || 'Pending',
    hotelPaymentAmount: row.hotel_payment_amount || 0,
    hotelPaymentDate: row.hotel_payment_date || '',
    hotelPaymentMode: row.hotel_payment_mode || '',
    hotelPaymentRef: row.hotel_payment_ref || '',
    hotelPaymentRemarks: row.hotel_payment_remarks || '',

    cabTotalCost: row.cab_total_cost || 0,
    cabPaymentStatus: row.cab_payment_status || 'Pending',
    cabPaymentAmount: row.cab_payment_amount || 0,
    cabPaymentDate: row.cab_payment_date || '',
    cabPaymentMode: row.cab_payment_mode || '',
    cabPaymentRef: row.cab_payment_ref || '',
    cabPaymentRemarks: row.cab_payment_remarks || '',

    opsRemarks: row.ops_remarks || '',
    accountsRemarks: row.accounts_remarks || '',
    reviewRequestedAt: row.review_requested_at || '',
    reviewChannel: row.review_channel || '',
    hotelPayments: (() => {
      try {
        return row.hotel_payments_json ? JSON.parse(row.hotel_payments_json) : [];
      } catch (_e) {
        return [];
      }
    })(),
    cabPaymentLogs: (() => {
      try {
        return row.cab_payment_logs_json ? JSON.parse(row.cab_payment_logs_json) : [];
      } catch (_e) {
        return [];
      }
    })(),
    createdAt: row.created_at,
    installments: [],
  };

  const instRows = queryAll(
    'SELECT * FROM ops_customer_installments WHERE customer_id = ? ORDER BY installment_number ASC',
    [customer.id]
  ) || [];

  customer.installments = instRows.map((inst: any) => ({
    id: inst.id,
    installmentNumber: inst.installment_number,
    title: inst.title,
    amount: inst.amount,
    dueDate: inst.due_date,
    status: inst.status,
    paidAt: inst.paid_at || undefined,
    paymentMode: inst.payment_mode || undefined,
    transactionRef: inst.transaction_ref || undefined,
    notes: inst.notes || undefined,
  }));

  return customer;
}

function hydrateVoucher(row: any): any {
  if (!row) return null;
  return {
    id: row.id,
    bookingId: row.booking_id,
    customerId: row.customer_id,
    customerName: row.customer_name || '',
    hotelName: row.hotel_name || '',
    city: row.city || '',
    checkIn: row.check_in || '',
    checkOut: row.check_out || '',
    nights: row.nights || 1,
    roomType: row.room_type || '',
    mealPlan: row.meal_plan || '',
    supplierName: row.supplier_name || '',
    confirmationNumber: row.confirmation_number || undefined,
    status: row.status || 'Pending',
    dueDate: row.due_date || '',
    fileUrl: row.file_url || undefined,
    fileName: row.file_name || undefined,
    uploadedAt: row.uploaded_at || undefined,
    uploadedBy: row.uploaded_by || undefined,
    urgency: row.urgency || 'Medium',
    totalCost: row.total_cost || 0,
    paidAmount: row.paid_amount || 0,
    paidAt: row.paid_at || '',
    paymentMode: row.payment_mode || '',
    paymentRef: row.payment_ref || '',
    paymentRemarks: row.payment_remarks || '',
    paymentStatus: row.payment_status || 'Pending',
    paymentLogs: (() => {
      try {
        return row.payment_logs_json ? JSON.parse(row.payment_logs_json) : [];
      } catch (_e) {
        return [];
      }
    })(),
  };
}

function hydrateItinerary(row: any): any {
  if (!row) return null;
  const itinerary: any = {
    id: row.id,
    bookingId: row.booking_id,
    customerId: row.customer_id,
    customerName: row.customer_name || '',
    destination: row.destination || '',
    startDate: row.start_date || '',
    endDate: row.end_date || '',
    readinessChecklist: {
      airTickets: !!row.readiness_air_tickets,
      hotelVouchers: !!row.readiness_hotel_vouchers,
      cabAssigned: !!row.readiness_cab_assigned,
      briefingCompleted: !!row.readiness_briefing_completed,
    },
    feedbackScore: row.feedback_score || undefined,
    feedbackComment: row.feedback_comment || undefined,
    reviewCollected: !!row.review_collected,
    days: [],
  };

  const rawActivities = queryAll(
    'SELECT * FROM ops_daily_activities WHERE itinerary_id = ? ORDER BY day_number ASC, time_slot ASC',
    [row.id]
  );

  // Group activities by day
  const daysMap = new Map<number, any>();
  for (const act of rawActivities) {
    const dayNum = act.day_number;
    if (!daysMap.has(dayNum)) {
      daysMap.set(dayNum, {
        dayNumber: dayNum,
        date: act.day_date || row.start_date || '',
        title: act.day_title || `Day ${dayNum} Schedule`,
        dayRemark: act.notes || '',
        activities: [],
      });
    }
    daysMap.get(dayNum).activities.push({
      id: act.id,
      timeSlot: act.time_slot || '',
      title: act.title || '',
      description: act.description || '',
      location: act.location || '',
      driverName: act.driver_name || undefined,
      driverPhone: act.driver_phone || undefined,
      cabModel: act.cab_model || undefined,
      cabNumber: act.cab_number || undefined,
      guideName: act.guide_name || undefined,
      guidePhone: act.guide_phone || undefined,
      voucherRef: act.voucher_ref || undefined,
      status: act.status || 'Pending',
      notes: act.notes || undefined,
    });
  }

  itinerary.days = Array.from(daysMap.values());
  return itinerary;
}

// --- Sync Converted Leads into Operations Desk ---

export function syncConvertedLeadsToOps() {
  // 1. Fetch all converted leads from CRM database
  const convertedLeads = queryAll("SELECT * FROM leads WHERE status IN ('Closed Won', 'CONVERTED', 'Won', 'Converted') OR LOWER(status) LIKE '%won%' OR LOWER(status) LIKE '%converted%'") || [];

  console.log(`[OPS SYNC] Found ${convertedLeads.length} converted leads to sync`);

  const validCustIds = convertedLeads.map((l: any) => `cust-${l.id}`);
  const validBookingIds = convertedLeads.map((l: any) => l.trip_id).filter(Boolean);

  // 2. Remove ops_customers that do NOT correspond to any converted lead
  const allOpsCusts = queryAll("SELECT id, booking_id FROM ops_customers") || [];
  for (const c of allOpsCusts) {
    if (!validCustIds.includes(c.id) && !validBookingIds.includes(c.booking_id)) {
      try {
        runQuery("DELETE FROM ops_daily_activities WHERE itinerary_id IN (SELECT id FROM ops_itineraries WHERE customer_id = ?)", [c.id]);
        runQuery("DELETE FROM ops_itineraries WHERE customer_id = ?", [c.id]);
        // Only delete auto-generated pending vouchers, preserve uploaded ones
        runQuery("DELETE FROM ops_vouchers WHERE customer_id = ? AND status = 'Pending'", [c.id]);
        runQuery("DELETE FROM ops_customer_installments WHERE customer_id = ?", [c.id]);
        runQuery("DELETE FROM ops_customers WHERE id = ?", [c.id]);
      } catch (cleanupErr) {
        console.error(`[OPS SYNC] Cleanup error for ${c.id}:`, cleanupErr);
      }
    }
  }

  if (convertedLeads.length === 0) return;

  const now = new Date().toISOString().split('T')[0];

  // 3. Process each converted lead INDEPENDENTLY (one failure must not block others)
  for (const lead of convertedLeads) {
    try {
      const custId = `cust-${lead.id}`;
      const bookingId = lead.trip_id || `KL-${lead.id}`;
      const name = lead.name || 'Converted Guest';
      const email = lead.email || '';
      const phone = lead.phone || '';
      const destination = lead.destination || 'Package Tour';
      const startDate = lead.travel_date || now;

      let endDate = startDate;
      try {
        if (lead.travel_date) {
          const d = new Date(lead.travel_date);
          d.setDate(d.getDate() + (lead.duration_days || 7));
          endDate = d.toISOString().split('T')[0];
        }
      } catch (_e) {
        endDate = startDate;
      }

      const paxAdults = lead.adults || 2;
      const paxChildren = lead.children || 0;

      const latestQuote = queryOne("SELECT * FROM quotes WHERE lead_id = ? ORDER BY created_at DESC LIMIT 1", [lead.id]);
      const totalAmount = latestQuote?.final_selling_price || 0;
      const currency = 'INR';
      const assignedOpsManager = lead.assigned_to || 'Ops Team';
      const notes = lead.summary || lead.raw_inquiry || 'Converted Lead Package';
      const specialRequests = lead.other_info || '';

      // --- UPSERT customer: check by custId first, then by bookingId ---
      const existingById = queryOne("SELECT id FROM ops_customers WHERE id = ?", [custId]);
      const existingByBooking = !existingById ? queryOne("SELECT id FROM ops_customers WHERE booking_id = ?", [bookingId]) : null;
      const existing = existingById || existingByBooking;

      if (!existing) {
        try {
          runQuery(
            `INSERT INTO ops_customers (id, booking_id, name, email, phone, destination, start_date, end_date, pax_adults, pax_children, total_amount, currency, assigned_ops_manager, status, notes, special_requests, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [custId, bookingId, name, email, phone, destination, startDate, endDate, paxAdults, paxChildren, totalAmount, currency, assignedOpsManager, 'Upcoming', notes, specialRequests, now]
          );
          console.log(`[OPS SYNC] Inserted customer ${custId} (${name})`);
        } catch (insertErr: any) {
          // If UNIQUE constraint on booking_id fails, try updating the existing row instead
          if (insertErr?.message?.includes('UNIQUE') || insertErr?.message?.includes('unique')) {
            console.warn(`[OPS SYNC] UNIQUE conflict for ${custId}, updating instead`);
            runQuery(
              `UPDATE ops_customers SET name = ?, email = ?, phone = ?, destination = ?, start_date = ?, end_date = ?, pax_adults = ?, pax_children = ?, total_amount = ?, currency = ?, assigned_ops_manager = ?, notes = ?, special_requests = ? WHERE booking_id = ?`,
              [name, email, phone, destination, startDate, endDate, paxAdults, paxChildren, totalAmount, currency, assignedOpsManager, notes, specialRequests, bookingId]
            );
          } else {
            console.error(`[OPS SYNC] Insert failed for lead ${lead.id}:`, insertErr);
            continue; // skip this lead, try the next one
          }
        }
      } else {
        runQuery(
          `UPDATE ops_customers SET name = ?, email = ?, phone = ?, destination = ?, start_date = ?, end_date = ?, pax_adults = ?, pax_children = ?, total_amount = ?, currency = ?, assigned_ops_manager = ?, notes = ?, special_requests = ? WHERE id = ?`,
          [name, email, phone, destination, startDate, endDate, paxAdults, paxChildren, totalAmount, currency, assignedOpsManager, notes, specialRequests, existing.id]
        );
      }

      // Resolve the actual customer ID in the DB
      const resolvedCust = queryOne("SELECT id FROM ops_customers WHERE id = ? OR booking_id = ?", [custId, bookingId]);
      const targetCustId = resolvedCust ? resolvedCust.id : custId;

      // --- Sync Payment Installments (always re-sync from payment_installments source of truth) ---
      let dbInstallments = queryAll(
        "SELECT * FROM payment_installments WHERE lead_id = ? OR lead_id = ? ORDER BY created_at ASC",
        [lead.id, lead.trip_id || lead.id]
      ) || [];

      const existingOpsInsts = queryAll("SELECT * FROM ops_customer_installments WHERE customer_id = ?", [targetCustId]) || [];
      const existingOpsMap = new Map<string, any>();
      for (const oi of existingOpsInsts) {
        existingOpsMap.set(oi.id, oi);
      }

      // If payment_installments is empty, but ops already has installments, sync them to payment_installments
      if (dbInstallments.length === 0 && existingOpsInsts.length > 0) {
        for (const oi of existingOpsInsts) {
          try {
            runQuery(
              `INSERT OR REPLACE INTO payment_installments (id, lead_id, title, amount, due_date, payment_condition, payment_status, paid_amount, pay_key, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                oi.id,
                lead.id,
                oi.title,
                oi.amount || 0,
                oi.due_date || startDate,
                oi.notes || '',
                oi.status === 'Paid' ? 'Paid' : 'Pending',
                oi.status === 'Paid' ? (oi.amount || 0) : 0,
                oi.id,
                oi.paid_at || now
              ]
            );
          } catch (_e) {}
        }
      }

      // If existing installments all have 0 amount (or only non-paid 0-amount) but we now have totalAmount > 0,
      // purge the stale 0-amount installments so they get regenerated with actual milestone amounts
      if (dbInstallments.length > 0 && totalAmount > 0) {
        const hasOnlyZeroOrUnpaidZero = dbInstallments.every((i: any) => (!i.amount || Number(i.amount) === 0) && i.payment_status !== 'Paid');
        if (hasOnlyZeroOrUnpaidZero) {
          runQuery("DELETE FROM payment_installments WHERE (lead_id = ? OR lead_id = ?) AND payment_status != 'Paid'", [lead.id, lead.trip_id || lead.id]);
          runQuery("DELETE FROM ops_customer_installments WHERE customer_id = ? AND status != 'Paid'", [targetCustId]);
          dbInstallments = queryAll(
            "SELECT * FROM payment_installments WHERE lead_id = ? OR lead_id = ? ORDER BY created_at ASC",
            [lead.id, lead.trip_id || lead.id]
          ) || [];
        }
      }

      // If still empty but we have a total amount > 0, generate standard 3-stage milestone schedule
      if (dbInstallments.length === 0 && totalAmount > 0) {
        const inst1Amt = Math.round(totalAmount * 0.3);
        const inst2Amt = Math.round(totalAmount * 0.4);
        const inst3Amt = Math.max(0, totalAmount - inst1Amt - inst2Amt);

        const defaultMilestones = [
          { id: `inst-${targetCustId}-1`, title: 'Booking Advance Token (30%)', amount: inst1Amt, due_date: startDate },
          { id: `inst-${targetCustId}-2`, title: 'Second Milestone Installment (40%)', amount: inst2Amt, due_date: startDate },
          { id: `inst-${targetCustId}-3`, title: 'Final Balance Clearance (30%)', amount: inst3Amt, due_date: endDate || startDate }
        ];

        for (const dm of defaultMilestones) {
          try {
            runQuery(
              `INSERT OR REPLACE INTO payment_installments (id, lead_id, title, amount, due_date, payment_condition, payment_status, paid_amount, pay_key, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [dm.id, lead.id, dm.title, dm.amount, dm.due_date, 'Standard Payment Milestone', 'Pending', 0, dm.id, now]
            );
          } catch (_e) {}
        }

        dbInstallments = queryAll(
          "SELECT * FROM payment_installments WHERE lead_id = ? OR lead_id = ? ORDER BY created_at ASC",
          [lead.id, lead.trip_id || lead.id]
        ) || [];
      }

      if (dbInstallments.length > 0) {
        // Rewrite ops_customer_installments cleanly matching the source of truth
        runQuery("DELETE FROM ops_customer_installments WHERE customer_id = ?", [targetCustId]);

        for (let idx = 0; idx < dbInstallments.length; idx++) {
          const inst = dbInstallments[idx];
          const instId = inst.id;
          const instNum = idx + 1;
          const existingOps = existingOpsMap.get(instId);
          
          // If EITHER desk or ops recorded payment, mark as Paid
          const isPaid = inst.payment_status === 'Paid' || existingOps?.status === 'Paid';
          const status = isPaid ? 'Paid' : (existingOps?.status || inst.payment_status || 'Pending');
          const paidAt = isPaid ? (existingOps?.paid_at || inst.paid_at || now) : '';
          const paymentMode = existingOps?.payment_mode || inst.payment_mode || (isPaid ? 'UPI' : '');
          const transactionRef = existingOps?.transaction_ref || inst.transaction_ref || (isPaid ? 'TXN-CONFIRMED' : '');
          const notes = existingOps?.notes || inst.payment_condition || inst.notes || '';
          const effectiveAmount = (inst.amount && inst.amount > 0) ? inst.amount : (existingOps?.amount || 0);

          try {
            runQuery(
              `INSERT OR REPLACE INTO ops_customer_installments (id, customer_id, installment_number, title, amount, due_date, status, paid_at, payment_mode, transaction_ref, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                instId,
                targetCustId,
                instNum,
                inst.title || `Installment ${instNum}`,
                effectiveAmount,
                inst.due_date || startDate,
                status,
                paidAt,
                paymentMode,
                transactionRef,
                notes,
              ]
            );
          } catch (_instErr) { /* skip */ }
        }
      }

      // --- Sync Hotel Vouchers (only from actual quoted hotels) ---
      const quoteHotels = latestQuote ? (queryAll("SELECT * FROM quote_hotels WHERE quote_id = ? ORDER BY sort_order ASC", [latestQuote.id]) || []) : [];

      const currentVouchIds: string[] = [];

      for (let hIdx = 0; hIdx < quoteHotels.length; hIdx++) {
        const h = quoteHotels[hIdx];
        const vId = `vouch-${lead.id}-h${hIdx + 1}`;
        currentVouchIds.push(vId);

        const existingVoucher = queryOne("SELECT id, hotel_name FROM ops_vouchers WHERE id = ?", [vId]);
        const targetHotelName = h.hotel_name || `${h.city || destination} Resort & Hotel`;
        const targetCity = h.city || destination;
        const targetNights = h.nights || 1;
        const targetRoomType = h.room_type || 'Deluxe Room';

        if (!existingVoucher) {
          try {
            runQuery(
              `INSERT INTO ops_vouchers (id, booking_id, customer_id, customer_name, hotel_name, city, check_in, check_out, nights, room_type, meal_plan, supplier_name, confirmation_number, status, due_date, urgency, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                vId,
                bookingId,
                targetCustId,
                name,
                targetHotelName,
                targetCity,
                startDate,
                endDate,
                targetNights,
                targetRoomType,
                'CPAI (Breakfast)',
                'Kingsland Holidays Partner',
                '',
                'Pending',
                startDate,
                hIdx === 0 ? 'High' : 'Medium',
                now,
              ]
            );
            console.log(`[OPS SYNC] Created pending voucher ${vId} for ${name} (${h.hotel_name})`);
          } catch (_vErr) { /* skip */ }
        } else {
          // If the hotel name has changed, reset the confirmation status and files
          if (existingVoucher.hotel_name !== targetHotelName) {
            runQuery(
              `UPDATE ops_vouchers
               SET hotel_name = ?, city = ?, check_in = ?, check_out = ?, nights = ?, room_type = ?,
                   confirmation_number = '', status = 'Pending', file_name = '', file_url = '', uploaded_at = '', uploaded_by = ''
               WHERE id = ?`,
              [targetHotelName, targetCity, startDate, endDate, targetNights, targetRoomType, vId]
            );
          } else {
            // Just update dates and city but preserve status and uploaded files
            runQuery(
              `UPDATE ops_vouchers
               SET city = ?, check_in = ?, check_out = ?, nights = ?, room_type = ?
               WHERE id = ?`,
              [targetCity, startDate, endDate, targetNights, targetRoomType, vId]
            );
          }
        }
      }

      // Delete orphaned vouchers
      if (currentVouchIds.length > 0) {
        const placeholders = currentVouchIds.map(() => '?').join(',');
        runQuery(`DELETE FROM ops_vouchers WHERE customer_id = ? AND id NOT IN (${placeholders})`, [targetCustId, ...currentVouchIds]);
      } else {
        runQuery(`DELETE FROM ops_vouchers WHERE customer_id = ?`, [targetCustId]);
      }

      // --- Sync Itinerary & Daily Activities ---
      const existingItin = queryOne("SELECT id FROM ops_itineraries WHERE customer_id = ?", [targetCustId]);
      const itinId = existingItin ? existingItin.id : `itin-${targetCustId}`;
      if (!existingItin) {
        try {
          runQuery(
            `INSERT INTO ops_itineraries (id, booking_id, customer_id, customer_name, destination, start_date, end_date, readiness_air_tickets, readiness_hotel_vouchers, readiness_cab_assigned, readiness_briefing_completed, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [itinId, bookingId, targetCustId, name, destination, startDate, endDate, 0, 0, 1, 0, now]
          );
        } catch (itinErr: any) {
          // If booking_id UNIQUE conflict, find existing and use its ID
          if (itinErr?.message?.includes('UNIQUE') || itinErr?.message?.includes('unique')) {
            const conflictItin = queryOne("SELECT id FROM ops_itineraries WHERE booking_id = ?", [bookingId]);
            if (conflictItin) {
              // Update instead
              runQuery("UPDATE ops_itineraries SET customer_id = ?, customer_name = ?, destination = ?, start_date = ?, end_date = ? WHERE id = ?",
                [targetCustId, name, destination, startDate, endDate, conflictItin.id]);
            }
          }
        }
      }

      // Resolve actual itinerary ID
      const resolvedItin = queryOne("SELECT id FROM ops_itineraries WHERE customer_id = ? OR booking_id = ?", [targetCustId, bookingId]);
      const finalItinId = resolvedItin ? resolvedItin.id : itinId;

      const qDays = latestQuote ? queryAll("SELECT * FROM quote_itinerary_days WHERE quote_id = ? ORDER BY day_number ASC", [latestQuote.id]) : [];
      if (qDays && qDays.length > 0) {
        for (const d of qDays) {
          const actId = `act-${finalItinId}-${d.day_number}`;
          const existingAct = queryOne("SELECT id FROM ops_daily_activities WHERE id = ?", [actId]);
          if (!existingAct) {
            try {
              runQuery(
                `INSERT INTO ops_daily_activities (id, itinerary_id, day_number, day_date, day_title, time_slot, title, description, location, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [actId, finalItinId, d.day_number, startDate, d.title || `Day ${d.day_number} Tour`, '09:00 AM - 05:00 PM', d.title || `Day ${d.day_number} Sightseeing`, d.description || '', destination, 'Pending']
              );
            } catch (_actErr) { /* skip */ }
          }
        }
      } else {
        for (let dayNum = 1; dayNum <= Math.min(lead.duration_days || 3, 15); dayNum++) {
          const actId = `act-${finalItinId}-${dayNum}`;
          const existingAct = queryOne("SELECT id FROM ops_daily_activities WHERE id = ?", [actId]);
          if (!existingAct) {
            try {
              runQuery(
                `INSERT INTO ops_daily_activities (id, itinerary_id, day_number, day_date, day_title, time_slot, title, description, location, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [actId, finalItinId, dayNum, startDate, `Day ${dayNum} Sightseeing & Transfers`, '09:00 AM - 05:00 PM', `Day ${dayNum}: ${destination} Sightseeing`, `Explore key attractions in ${destination}`, destination, 'Pending']
              );
            } catch (_actErr) { /* skip */ }
          }
        }
      }

      console.log(`[OPS SYNC] ✅ Lead ${lead.id} (${name}) synced successfully`);
    } catch (leadErr) {
      console.error(`[OPS SYNC] ❌ Failed to sync lead ${lead.id}:`, leadErr);
      // Continue to next lead - do NOT break the loop
    }
  }
}

// --- Customer Controllers ---

export function getAllOpsCustomers(filters?: { status?: string; search?: string }) {
  syncConvertedLeadsToOps();
  seedOpsDefaultsIfEmpty();
  let sql = 'SELECT * FROM ops_customers WHERE 1=1';
  const params: any[] = [];

  if (filters?.status) {
    sql += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters?.search) {
    sql += ' AND (name LIKE ? OR destination LIKE ? OR booking_id LIKE ? OR email LIKE ?)';
    const term = `%${filters.search}%`;
    params.push(term, term, term, term);
  }
  sql += ' ORDER BY created_at DESC';

  return queryAll(sql, params).map((r) => hydrateCustomer(r));
}

export function getOpsCustomerById(id: string) {
  if (!id) return null;
  const cleanId = id.startsWith('cust-') ? id.replace('cust-', '') : id;
  const row = queryOne(
    'SELECT * FROM ops_customers WHERE id = ? OR id = ? OR id = ? OR booking_id = ? OR phone = ? LIMIT 1',
    [id, `cust-${cleanId}`, cleanId, id, id]
  );
  return hydrateCustomer(row);
}

export function createOpsCustomer(data: any) {
  const id = data.id || `cust-${Date.now()}`;
  const bookingId = data.bookingId || `LIXKT-${Math.floor(8000 + Math.random() * 1999)}`;
  const now = new Date().toISOString().split('T')[0];

  runQuery(
    `INSERT INTO ops_customers (id, booking_id, name, email, phone, destination, start_date, end_date, pax_adults, pax_children, total_amount, currency, assigned_ops_manager, status, notes, special_requests, emergency_contact, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      bookingId,
      data.name || 'New Guest',
      data.email || '',
      data.phone || '',
      data.destination || 'Destination',
      data.startDate || now,
      data.endDate || now,
      data.paxAdults || 2,
      data.paxChildren || 0,
      data.totalAmount || 1850,
      data.currency || 'INR',
      data.assignedOpsManager || 'Unassigned',
      data.status || 'Upcoming',
      data.notes || '',
      data.specialRequests || '',
      data.emergencyContact || '',
      now,
    ]
  );

  // Auto-create payment installments if provided
  const insts = data.installments || [];

  for (const inst of insts) {
    runQuery(
      `INSERT INTO ops_customer_installments (id, customer_id, installment_number, title, amount, due_date, status, paid_at, payment_mode, transaction_ref, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        inst.id || `inst-${id}-${inst.installmentNumber}`,
        id,
        inst.installmentNumber,
        inst.title,
        inst.amount,
        inst.dueDate,
        inst.status || 'Pending',
        inst.paidAt || '',
        inst.paymentMode || '',
        inst.transactionRef || '',
        inst.notes || '',
      ]
    );
  }

  // Auto-create initial itinerary if not exists
  const existingItin = queryOne('SELECT id FROM ops_itineraries WHERE customer_id = ?', [id]);
  if (!existingItin) {
    const itinId = `itin-${Date.now()}`;
    runQuery(
      `INSERT INTO ops_itineraries (id, booking_id, customer_id, customer_name, destination, start_date, end_date, readiness_air_tickets, readiness_hotel_vouchers, readiness_cab_assigned, readiness_briefing_completed)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, 0, 0)`,
      [itinId, bookingId, id, data.name || '', data.destination || '', data.startDate || now, data.endDate || now]
    );

    // Initial 2-day template activities
    runQuery(
      `INSERT INTO ops_daily_activities (id, itinerary_id, day_number, day_date, day_title, time_slot, title, description, location, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [`act-${itinId}-1`, itinId, 1, data.startDate || now, `Arrival in ${data.destination || 'Destination'}`, '01:00 PM', 'Airport Pickup & Hotel Transfer', `Private pickup from airport holding guest board "${data.name}".`, 'Airport Terminal', 'Pending']
    );
    runQuery(
      `INSERT INTO ops_daily_activities (id, itinerary_id, day_number, day_date, day_title, time_slot, title, description, location, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [`act-${itinId}-2`, itinId, 2, data.startDate || now, 'Guided City Sightseeing Tour', '09:00 AM', 'Landmark Exploration Tour', 'Full day guided tour with private vehicle.', data.destination || '', 'Pending']
    );
  }

  return getOpsCustomerById(id);
}

export function updateOpsCustomer(id: string, data: any) {
  const fields: string[] = [];
  const params: any[] = [];

  const fieldMap: Record<string, string> = {
    name: 'name',
    email: 'email',
    phone: 'phone',
    destination: 'destination',
    startDate: 'start_date',
    endDate: 'end_date',
    paxAdults: 'pax_adults',
    paxChildren: 'pax_children',
    totalAmount: 'total_amount',
    currency: 'currency',
    assignedOpsManager: 'assigned_ops_manager',
    status: 'status',
    notes: 'notes',
    specialRequests: 'special_requests',
    emergencyContact: 'emergency_contact',
    driverName: 'driver_name',
    driverPhone: 'driver_phone',
    cabModel: 'cab_model',
    cabNumber: 'cab_number',
    cabPickupLocation: 'cab_pickup_location',
    hotelTotalCost: 'hotel_total_cost',
    hotelPaymentStatus: 'hotel_payment_status',
    hotelPaymentAmount: 'hotel_payment_amount',
    hotelPaymentDate: 'hotel_payment_date',
    hotelPaymentMode: 'hotel_payment_mode',
    hotelPaymentRef: 'hotel_payment_ref',
    hotelPaymentRemarks: 'hotel_payment_remarks',

    cabTotalCost: 'cab_total_cost',
    cabPaymentStatus: 'cab_payment_status',
    cabPaymentAmount: 'cab_payment_amount',
    cabPaymentDate: 'cab_payment_date',
    cabPaymentMode: 'cab_payment_mode',
    cabPaymentRef: 'cab_payment_ref',
    cabPaymentRemarks: 'cab_payment_remarks',
    opsRemarks: 'ops_remarks',
    accountsRemarks: 'accounts_remarks',
    reviewRequestedAt: 'review_requested_at',
    reviewChannel: 'review_channel',
    hotelPayments: 'hotel_payments_json',
    cabPaymentLogs: 'cab_payment_logs_json',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if (data[key] !== undefined) {
      fields.push(`${col} = ?`);
      if ((key === 'hotelPayments' || key === 'cabPaymentLogs') && typeof data[key] !== 'string') {
        params.push(JSON.stringify(data[key]));
      } else {
        params.push(data[key]);
      }
    }
  }

  if (fields.length > 0) {
    params.push(id);
    runQuery(`UPDATE ops_customers SET ${fields.join(', ')} WHERE id = ?`, params);
  }

  return getOpsCustomerById(id);
}

export function deleteOpsCustomer(id: string) {
  const result = runQuery('DELETE FROM ops_customers WHERE id = ?', [id]);
  return result.changes > 0;
}

export function recordOpsPayment(customerId: string, installmentId: string, details: any) {
  const status = details.status || 'Paid';
  const paidAt = details.paidAt || new Date().toISOString().split('T')[0];
  const paymentMode = details.paymentMode || 'UPI';
  const transactionRef = details.transactionRef || `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
  const notesVal = details.notes || '';

  const cust = getOpsCustomerById(customerId);
  const actualCustId = cust ? cust.id : customerId;

  // 1. Update ops_customer_installments
  runQuery(
    `UPDATE ops_customer_installments
     SET status = ?, paid_at = ?, payment_mode = ?, transaction_ref = ?, notes = ?
     WHERE id = ? OR (customer_id = ? AND id = ?)`,
    [status, status === 'Paid' ? paidAt : '', status === 'Paid' ? paymentMode : '', status === 'Paid' ? transactionRef : '', notesVal, installmentId, actualCustId, installmentId]
  );

  // Also update title, amount, dueDate if provided
  if (details.title !== undefined || details.amount !== undefined || details.dueDate !== undefined) {
    const extraFields: string[] = [];
    const extraParams: any[] = [];
    if (details.title !== undefined) { extraFields.push('title = ?'); extraParams.push(details.title); }
    if (details.amount !== undefined) { extraFields.push('amount = ?'); extraParams.push(Number(details.amount)); }
    if (details.dueDate !== undefined) { extraFields.push('due_date = ?'); extraParams.push(details.dueDate); }
    if (extraFields.length > 0) {
      extraParams.push(installmentId);
      runQuery(`UPDATE ops_customer_installments SET ${extraFields.join(', ')} WHERE id = ?`, extraParams);
    }
  }

  // 2. Sync status back to payment_installments & payment_links source tables
  try {
    const paidAmount = details.amount || 0;
    runQuery(
      `UPDATE payment_installments
       SET payment_status = ?, paid_amount = ?, paid_at = ?, payment_mode = ?, transaction_ref = ?
       WHERE id = ? OR pay_key = ?`,
      [status, status === 'Paid' ? paidAmount : 0, status === 'Paid' ? paidAt : '', status === 'Paid' ? paymentMode : '', status === 'Paid' ? transactionRef : '', installmentId, installmentId]
    );

    runQuery(
      `UPDATE payment_links
       SET status = ?, transaction_ref = ?, payment_mode = ?
       WHERE pay_key = ? OR id = ?`,
      [status, status === 'Paid' ? transactionRef : '', status === 'Paid' ? paymentMode : '', installmentId, installmentId]
    );
  } catch (_e) { /* skip */ }

  return getOpsCustomerById(actualCustId);
}

export function updateOpsInstallment(customerId: string, installmentId: string, details: any) {
  const cust = getOpsCustomerById(customerId);
  const actualCustId = cust ? cust.id : customerId;

  const fields: string[] = [];
  const params: any[] = [];

  if (details.title !== undefined) { fields.push('title = ?'); params.push(details.title); }
  if (details.amount !== undefined) { fields.push('amount = ?'); params.push(Number(details.amount)); }
  if (details.dueDate !== undefined) { fields.push('due_date = ?'); params.push(details.dueDate); }
  if (details.status !== undefined) { fields.push('status = ?'); params.push(details.status); }
  if (details.paidAt !== undefined) { fields.push('paid_at = ?'); params.push(details.paidAt); }
  if (details.paymentMode !== undefined) { fields.push('payment_mode = ?'); params.push(details.paymentMode); }
  if (details.transactionRef !== undefined) { fields.push('transaction_ref = ?'); params.push(details.transactionRef); }
  if (details.notes !== undefined) { fields.push('notes = ?'); params.push(details.notes); }

  if (fields.length > 0) {
    params.push(installmentId, actualCustId);
    runQuery(
      `UPDATE ops_customer_installments SET ${fields.join(', ')} WHERE id = ? OR (customer_id = ? AND id = ?)`,
      params
    );
  }

  // Sync status back to payment_installments & payment_links source table
  if (details.status !== undefined) {
    try {
      const paidAmount = details.amount || 0;
      runQuery(
        `UPDATE payment_installments
         SET payment_status = ?, paid_amount = ?, paid_at = ?, payment_mode = ?, transaction_ref = ?
         WHERE id = ? OR pay_key = ?`,
        [details.status, details.status === 'Paid' ? paidAmount : 0, details.paidAt || '', details.paymentMode || '', details.transactionRef || '', installmentId, installmentId]
      );
      runQuery(
        `UPDATE payment_links
         SET status = ?, transaction_ref = ?, payment_mode = ?
         WHERE pay_key = ? OR id = ?`,
        [details.status, details.transactionRef || '', details.paymentMode || '', installmentId, installmentId]
      );
    } catch (_e) { /* skip */ }
  }

  return getOpsCustomerById(actualCustId);
}

// --- Voucher Controllers ---

export function getAllOpsVouchers(filters?: { status?: string; search?: string }) {
  syncConvertedLeadsToOps();
  seedOpsDefaultsIfEmpty();
  let sql = 'SELECT * FROM ops_vouchers WHERE 1=1';
  const params: any[] = [];

  if (filters?.status) {
    sql += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters?.search) {
    sql += ' AND (hotel_name LIKE ? OR customer_name LIKE ? OR booking_id LIKE ? OR city LIKE ?)';
    const term = `%${filters.search}%`;
    params.push(term, term, term, term);
  }
  sql += ' ORDER BY due_date ASC';

  return queryAll(sql, params).map((r) => hydrateVoucher(r));
}

export function createOpsVoucher(data: any) {
  const id = data.id || `v-${Date.now()}`;
  runQuery(
    `INSERT INTO ops_vouchers (id, booking_id, customer_id, customer_name, hotel_name, city, check_in, check_out, nights, room_type, meal_plan, supplier_name, confirmation_number, status, due_date, file_url, file_name, uploaded_at, uploaded_by, urgency)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.bookingId,
      data.customerId,
      data.customerName || '',
      data.hotelName || '',
      data.city || '',
      data.checkIn || '',
      data.checkOut || '',
      data.nights || 1,
      data.roomType || 'Standard Room',
      data.mealPlan || 'Breakfast Included',
      data.supplierName || 'Hotel Supplier',
      data.confirmationNumber || '',
      data.status || 'Pending',
      data.dueDate || '',
      data.fileUrl || '',
      data.fileName || '',
      data.uploadedAt || '',
      data.uploadedBy || '',
      data.urgency || 'Medium',
    ]
  );
  const row = queryOne('SELECT * FROM ops_vouchers WHERE id = ?', [id]);
  return hydrateVoucher(row);
}

export function updateOpsVoucher(id: string, data: any) {
  const fields: string[] = [];
  const params: any[] = [];

  const fieldMap: Record<string, string> = {
    hotelName: 'hotel_name',
    city: 'city',
    checkIn: 'check_in',
    checkOut: 'check_out',
    confirmationNumber: 'confirmation_number',
    status: 'status',
    fileUrl: 'file_url',
    fileName: 'file_name',
    uploadedAt: 'uploaded_at',
    uploadedBy: 'uploaded_by',
    urgency: 'urgency',
    supplierName: 'supplier_name',
    roomType: 'room_type',
    mealPlan: 'meal_plan',
    totalCost: 'total_cost',
    paidAmount: 'paid_amount',
    paidAt: 'paid_at',
    paymentMode: 'payment_mode',
    paymentRef: 'payment_ref',
    paymentRemarks: 'payment_remarks',
    paymentStatus: 'payment_status',
    paymentLogs: 'payment_logs_json',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if (data[key] !== undefined) {
      fields.push(`${col} = ?`);
      if (key === 'paymentLogs' && typeof data[key] !== 'string') {
        params.push(JSON.stringify(data[key]));
      } else {
        params.push(data[key]);
      }
    }
  }

  if (fields.length > 0) {
    params.push(id);
    runQuery(`UPDATE ops_vouchers SET ${fields.join(', ')} WHERE id = ?`, params);
  }

  const row = queryOne('SELECT * FROM ops_vouchers WHERE id = ?', [id]);
  return hydrateVoucher(row);
}

export function uploadOpsVoucherFile(id: string, confirmationNumber: string, fileName: string, fileUrl?: string) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
  runQuery(
    `UPDATE ops_vouchers
     SET confirmation_number = ?, file_name = ?, file_url = COALESCE(?, file_url), status = 'Uploaded', uploaded_at = ?, uploaded_by = 'Ops Manager'
     WHERE id = ?`,
    [confirmationNumber, fileName, fileUrl || null, now, id]
  );
  const row = queryOne('SELECT * FROM ops_vouchers WHERE id = ?', [id]);
  return hydrateVoucher(row);
}

export function deleteOpsVoucher(id: string) {
  const result = runQuery('DELETE FROM ops_vouchers WHERE id = ?', [id]);
  return result.changes > 0;
}

// --- Itinerary & Activity Controllers ---

export function getAllOpsItineraries() {
  syncConvertedLeadsToOps();
  seedOpsDefaultsIfEmpty();
  const rows = queryAll('SELECT * FROM ops_itineraries ORDER BY created_at DESC');
  return rows.map((r) => hydrateItinerary(r));
}

export function getOpsItineraryByBookingId(bookingId: string) {
  const row = queryOne(
    'SELECT * FROM ops_itineraries WHERE booking_id = ? OR customer_id = ?',
    [bookingId, bookingId]
  );
  return hydrateItinerary(row);
}

export function updateOpsItinerary(id: string, data: any) {
  let existing = queryOne('SELECT * FROM ops_itineraries WHERE id = ? OR customer_id = ? OR booking_id = ?', [id, data.customerId || id, data.bookingId || id]);

  if (!existing) {
    const itinId = id.startsWith('itin-') ? id : `itin-${data.customerId || id}`;
    const now = new Date().toISOString().split('T')[0];
    runQuery(
      `INSERT INTO ops_itineraries (id, booking_id, customer_id, customer_name, destination, start_date, end_date, readiness_air_tickets, readiness_hotel_vouchers, readiness_cab_assigned, readiness_briefing_completed)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, 0, 0)`,
      [itinId, data.bookingId || 'LIXKT-8000', data.customerId || id, data.customerName || '', data.destination || '', data.startDate || now, data.endDate || now]
    );
    existing = queryOne('SELECT * FROM ops_itineraries WHERE id = ?', [itinId]);
  }

  const realId = existing ? existing.id : id;
  const fields: string[] = [];
  const params: any[] = [];

  if (data.readinessChecklist) {
    const rc = data.readinessChecklist;
    if (rc.airTickets !== undefined) { fields.push('readiness_air_tickets = ?'); params.push(rc.airTickets ? 1 : 0); }
    if (rc.hotelVouchers !== undefined) { fields.push('readiness_hotel_vouchers = ?'); params.push(rc.hotelVouchers ? 1 : 0); }
    if (rc.cabAssigned !== undefined) { fields.push('readiness_cab_assigned = ?'); params.push(rc.cabAssigned ? 1 : 0); }
    if (rc.briefingCompleted !== undefined) { fields.push('readiness_briefing_completed = ?'); params.push(rc.briefingCompleted ? 1 : 0); }
  }

  if (data.feedbackScore !== undefined) { fields.push('feedback_score = ?'); params.push(data.feedbackScore); }
  if (data.feedbackComment !== undefined) { fields.push('feedback_comment = ?'); params.push(data.feedbackComment); }
  if (data.reviewCollected !== undefined) { fields.push('review_collected = ?'); params.push(data.reviewCollected ? 1 : 0); }

  if (fields.length > 0) {
    params.push(realId);
    runQuery(`UPDATE ops_itineraries SET ${fields.join(', ')} WHERE id = ?`, params);
  }

  // Update day wise activities if provided
  if (data.days && Array.isArray(data.days)) {
    for (const day of data.days) {
      for (const act of day.activities || []) {
        addOrUpdateOpsActivity(realId, { 
          ...act, 
          dayNumber: day.dayNumber, 
          dayDate: day.date, 
          dayTitle: day.title,
          notes: day.dayRemark || act.notes || '' 
        });
      }
    }
  }

  const row = queryOne('SELECT * FROM ops_itineraries WHERE id = ?', [realId]);
  return hydrateItinerary(row);
}

export function addOrUpdateOpsActivity(itineraryId: string, actData: any) {
  const actId = actData.id || `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const existing = queryOne('SELECT id FROM ops_daily_activities WHERE id = ?', [actId]);

  if (existing) {
    runQuery(
      `UPDATE ops_daily_activities
       SET day_number = ?, day_date = ?, day_title = ?, time_slot = ?, title = ?, description = ?, location = ?, driver_name = ?, driver_phone = ?, cab_model = ?, cab_number = ?, guide_name = ?, guide_phone = ?, voucher_ref = ?, status = ?, notes = ?
       WHERE id = ?`,
      [
        actData.dayNumber || 1,
        actData.dayDate || '',
        actData.dayTitle || '',
        actData.timeSlot || '',
        actData.title || '',
        actData.description || '',
        actData.location || '',
        actData.driverName || '',
        actData.driverPhone || '',
        actData.cabModel || '',
        actData.cabNumber || '',
        actData.guideName || '',
        actData.guidePhone || '',
        actData.voucherRef || '',
        actData.status || 'Pending',
        actData.notes || '',
        actId,
      ]
    );
  } else {
    runQuery(
      `INSERT INTO ops_daily_activities (id, itinerary_id, day_number, day_date, day_title, time_slot, title, description, location, driver_name, driver_phone, cab_model, cab_number, guide_name, guide_phone, voucher_ref, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        actId,
        itineraryId,
        actData.dayNumber || 1,
        actData.dayDate || '',
        actData.dayTitle || '',
        actData.timeSlot || '',
        actData.title || '',
        actData.description || '',
        actData.location || '',
        actData.driverName || '',
        actData.driverPhone || '',
        actData.cabModel || '',
        actData.cabNumber || '',
        actData.guideName || '',
        actData.guidePhone || '',
        actData.voucherRef || '',
        actData.status || 'Pending',
        actData.notes || '',
      ]
    );
  }
}

export function deleteOpsActivity(activityId: string) {
  const result = runQuery('DELETE FROM ops_daily_activities WHERE id = ?', [activityId]);
  return result.changes > 0;
}

// --- Seeding & Defaults ---

export function seedOpsDefaultsIfEmpty() {
  const countObj = queryOne('SELECT COUNT(*) as count FROM ops_customers');
  if (countObj && countObj.count > 0) return;

  console.log('🌱 Seeding default Operations Portal records into database...');

  // 1. Seed Customers & Installments
  for (const c of INITIAL_CUSTOMERS) {
    runQuery(
      `INSERT INTO ops_customers (id, booking_id, name, email, phone, destination, start_date, end_date, pax_adults, pax_children, total_amount, currency, assigned_ops_manager, status, notes, special_requests, emergency_contact, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        c.id,
        c.bookingId,
        c.name,
        c.email,
        c.phone,
        c.destination,
        c.startDate,
        c.endDate,
        c.paxAdults,
        c.paxChildren,
        c.totalAmount,
        c.currency,
        c.assignedOpsManager,
        c.status,
        c.notes || '',
        c.specialRequests || '',
        c.emergencyContact || '',
        c.createdAt || new Date().toISOString().split('T')[0],
      ]
    );

    if (c.installments) {
      for (const inst of c.installments) {
        runQuery(
          `INSERT INTO ops_customer_installments (id, customer_id, installment_number, title, amount, due_date, status, paid_at, payment_mode, transaction_ref, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            inst.id,
            c.id,
            inst.installmentNumber,
            inst.title,
            inst.amount,
            inst.dueDate,
            inst.status,
            inst.paidAt || '',
            inst.paymentMode || '',
            inst.transactionRef || '',
            inst.notes || '',
          ]
        );
      }
    }
  }

  // 2. Seed Vouchers
  for (const v of INITIAL_HOTEL_VOUCHERS) {
    runQuery(
      `INSERT INTO ops_vouchers (id, booking_id, customer_id, customer_name, hotel_name, city, check_in, check_out, nights, room_type, meal_plan, supplier_name, confirmation_number, status, due_date, file_url, file_name, uploaded_at, uploaded_by, urgency)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        v.id,
        v.bookingId,
        v.customerId,
        v.customerName,
        v.hotelName,
        v.city,
        v.checkIn,
        v.checkOut,
        v.nights,
        v.roomType,
        v.mealPlan,
        v.supplierName,
        v.confirmationNumber || '',
        v.status,
        v.dueDate,
        v.fileUrl || '',
        v.fileName || '',
        v.uploadedAt || '',
        v.uploadedBy || '',
        v.urgency,
      ]
    );
  }

  // 3. Seed Itineraries & Activities
  for (const itin of INITIAL_ITINERARIES) {
    runQuery(
      `INSERT INTO ops_itineraries (id, booking_id, customer_id, customer_name, destination, start_date, end_date, readiness_air_tickets, readiness_hotel_vouchers, readiness_cab_assigned, readiness_briefing_completed, feedback_score, feedback_comment, review_collected)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        itin.id,
        itin.bookingId,
        itin.customerId,
        itin.customerName,
        itin.destination,
        itin.startDate,
        itin.endDate,
        itin.readinessChecklist.airTickets ? 1 : 0,
        itin.readinessChecklist.hotelVouchers ? 1 : 0,
        itin.readinessChecklist.cabAssigned ? 1 : 0,
        itin.readinessChecklist.briefingCompleted ? 1 : 0,
        itin.feedbackScore || 0,
        itin.feedbackComment || '',
        itin.reviewCollected ? 1 : 0,
      ]
    );

    for (const day of itin.days) {
      for (const act of day.activities) {
        runQuery(
          `INSERT INTO ops_daily_activities (id, itinerary_id, day_number, day_date, day_title, time_slot, title, description, location, driver_name, driver_phone, cab_model, cab_number, guide_name, guide_phone, voucher_ref, status, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            act.id,
            itin.id,
            day.dayNumber,
            day.date,
            day.title,
            act.timeSlot,
            act.title,
            act.description,
            act.location,
            act.driverName || '',
            act.driverPhone || '',
            act.cabModel || '',
            act.cabNumber || '',
            act.guideName || '',
            act.guidePhone || '',
            act.voucherRef || '',
            act.status,
            act.notes || '',
          ]
        );
      }
    }
  }

  console.log('✅ Default Operations Portal records seeded!');
}

export function resetOpsData() {
  runQuery('DELETE FROM ops_daily_activities');
  runQuery('DELETE FROM ops_itineraries');
  runQuery('DELETE FROM ops_vouchers');
  runQuery('DELETE FROM ops_customer_installments');
  runQuery('DELETE FROM ops_customers');
  seedOpsDefaultsIfEmpty();
  return { success: true };
}
