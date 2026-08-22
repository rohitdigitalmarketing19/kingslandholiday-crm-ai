import { runQuery, queryAll, queryOne } from '../db/connection';

function hydrateLead(row: any): any {
  const lead: any = {
    id: row.id, tripId: row.trip_id, name: row.name, phone: row.phone || '', email: row.email || '',
    rawInquiry: row.raw_inquiry || '', summary: row.summary || '', score: row.score,
    intent: row.intent, destination: row.destination, budgetTier: row.budget_tier,
    assignedTo: row.assigned_to || '', source: row.source, status: row.status,
    postponedDate: row.postponed_date || '', postponedReason: row.postponed_reason || '',
    followUpDate: row.follow_up_date || '', followUpTime: row.follow_up_time || '',
    followUpType: row.follow_up_type || 'Call', followUpNote: row.follow_up_note || '',
    followUpCompleted: !!row.follow_up_completed,
    accountsRemarks: row.accounts_remarks || '',
    reviewRequestedAt: row.review_requested_at || '',
    reviewChannel: row.review_channel || '',
    travelDate: row.travel_date || '', durationDays: row.duration_days,
    travelers: { adults: row.adults || 2, children: row.children || 0, childAges: JSON.parse(row.child_ages || '[]') },
    otherInfo: row.other_info || '', includeStay: row.include_stay || 'Yes',
    includeFlight: row.include_flight || 'No', includeCab: row.include_cab || 'Yes',
    hotelCategory: row.hotel_category || '4/3 Star', englishDriver: !!row.english_driver,
    createdAt: row.created_at, lastFollowUp: row.last_follow_up, notes: [], quotes: [],
  };
  lead.notes = queryAll('SELECT * FROM lead_notes WHERE lead_id = ? ORDER BY timestamp ASC', [lead.id]).map((n: any) => ({ id: n.id, text: n.text, type: n.type, timestamp: n.timestamp }));
  lead.quotes = queryAll('SELECT * FROM quotes WHERE lead_id = ? ORDER BY created_at ASC', [lead.id]).map((q: any) => hydrateQuote(q));
  return lead;
}

function hydrateQuote(row: any): any {
  const quote: any = {
    id: row.id, packageTitle: row.package_title || '', finalSellingPrice: row.final_selling_price || 0,
    visaCost: row.visa_cost || 0, flightCost: row.flight_cost || 0, landPackageCost: row.land_package_cost || 0,
    marketingFees: row.marketing_fees || 0, discountPercentage: row.discount_percentage || 0, nights: row.nights || 6,
    hotelsNotIncluded: !!row.hotels_not_included, flightsNotIncluded: !!row.flights_not_included,
    cabsNotIncluded: !!row.cabs_not_included, flightDetails: row.flight_details || '', cabDetails: row.cab_details || '',
    otherInclusions: row.other_inclusions || '', otherExclusions: row.other_exclusions || '',
    termsAndConditions: row.terms_and_conditions || '', useDefaultTC: !!row.use_default_tc,
    otherInformation: row.other_information || '', workingAgentId: row.working_agent_id || '', createdAt: row.created_at,
  };
  quote.hotels = queryAll('SELECT * FROM quote_hotels WHERE quote_id = ? ORDER BY sort_order ASC', [row.id]).map((h: any) => ({
    nights: h.nights, selectedNightIndices: JSON.parse(h.selected_night_indices || '[]'),
    hotelName: h.hotel_name || '', city: h.city || '', category: h.category || '4 Star',
    roomType: h.room_type || 'Standard Room', comments: h.comments || '',
  }));
  quote.inclusions = {
    accommodation: { single: { included: false, comments: '' }, double: { included: false, comments: '' }, triple: { included: false, comments: '' } },
    mealPlan: { breakfast: { included: false, comments: '' }, lunch: { included: false, comments: '' }, dinner: { included: false, comments: '' } },
    transfer: { arrival: { included: false, comments: '' }, departure: { included: false, comments: '' } },
    sightseeing: { included: false, comments: '' }, taxes: { included: false, comments: '' },
    tollParking: { included: false, comments: '' }, tripSupplements: { included: false, comments: '' },
  };
  for (const inc of queryAll('SELECT * FROM quote_inclusions WHERE quote_id = ?', [row.id])) {
    const cat = inc.category; const sub = inc.sub_category;
    if (sub && quote.inclusions[cat]?.[sub]) { quote.inclusions[cat][sub].included = !!inc.included; quote.inclusions[cat][sub].comments = inc.comments || ''; }
    else if (!sub && quote.inclusions[cat]) { quote.inclusions[cat].included = !!inc.included; quote.inclusions[cat].comments = inc.comments || ''; }
  }
  quote.itinerary = queryAll('SELECT * FROM quote_itinerary_days WHERE quote_id = ? ORDER BY day_number ASC', [row.id]).map((d: any) => ({ day: d.day_number, title: d.title || '', description: d.description || '' }));
  return quote;
}

export function getAllLeads(filters?: { status?: string; assignedTo?: string; search?: string }) {
  let query = 'SELECT * FROM leads WHERE 1=1'; const params: any[] = [];
  if (filters?.status) { query += ' AND status = ?'; params.push(filters.status); }
  if (filters?.assignedTo) { query += ' AND assigned_to = ?'; params.push(filters.assignedTo); }
  if (filters?.search) { query += ' AND (name LIKE ? OR destination LIKE ? OR trip_id LIKE ?)'; const s = `%${filters.search}%`; params.push(s, s, s); }
  query += ' ORDER BY created_at DESC';
  return queryAll(query, params).map((r: any) => hydrateLead(r));
}

export function getLeadById(id: string) {
  const row = queryOne('SELECT * FROM leads WHERE id = ?', [id]);
  return row ? hydrateLead(row) : null;
}

import { generateNextTripId } from './settingsController';

export function createLead(data: any) {
  const id = data.id || `lead-${Date.now()}`;
  const tripId = data.tripId || generateNextTripId();
  const now = new Date().toISOString();
  runQuery('INSERT INTO leads (id, trip_id, name, phone, email, raw_inquiry, summary, score, intent, destination, budget_tier, assigned_to, source, status, travel_date, duration_days, adults, children, child_ages, other_info, include_stay, include_flight, include_cab, hotel_category, english_driver, created_at, last_follow_up) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [id, tripId, data.name || '', data.phone || '', data.email || '', data.rawInquiry || '', data.summary || '', data.score || 50, data.intent || 'Information Seeking', data.destination || '', data.budgetTier || 'Mid', data.assignedTo || '', data.source || 'Website Form', data.status || 'New', data.travelDate || '', data.durationDays || 7, data.travelers?.adults || 2, data.travelers?.children || 0, JSON.stringify(data.travelers?.childAges || []), data.otherInfo || '', data.includeStay || 'Yes', data.includeFlight || 'No', data.includeCab || 'Yes', data.hotelCategory || '4/3 Star', data.englishDriver ? 1 : 0, now, now]
  );
  return getLeadById(id);
}

import { syncConvertedLeadsToOps } from './opsController';

export function updateLeadStatus(id: string, status: string, extra?: { 
  postponedDate?: string; 
  postponedReason?: string;
  followUpDate?: string;
  followUpTime?: string;
  followUpType?: string;
  followUpNote?: string;
  followUpCompleted?: boolean;
}) {
  const now = new Date().toISOString();
  let result;
  if (status === 'Postponed' && extra?.postponedDate) {
    result = runQuery('UPDATE leads SET status = ?, postponed_date = ?, postponed_reason = ?, last_follow_up = ? WHERE id = ?', [status, extra.postponedDate, extra.postponedReason || '', now, id]);
  } else if ((status === 'Follow-up' || extra?.followUpDate) && extra?.followUpDate) {
    result = runQuery('UPDATE leads SET status = ?, follow_up_date = ?, follow_up_time = ?, follow_up_type = ?, follow_up_note = ?, follow_up_completed = ?, last_follow_up = ? WHERE id = ?', 
      [status, extra.followUpDate, extra.followUpTime || '10:00', extra.followUpType || 'Call', extra.followUpNote || '', extra.followUpCompleted ? 1 : 0, now, id]
    );
    if (extra.followUpNote) {
      const noteId = `note-${Date.now()}`;
      runQuery('INSERT INTO lead_notes (id, lead_id, text, type, timestamp) VALUES (?,?,?,?,?)',
        [noteId, id, `📅 Scheduled ${extra.followUpType || 'Call'} on ${extra.followUpDate} at ${extra.followUpTime || '10:00'}: ${extra.followUpNote}`, 'Action', now]
      );
    }
  } else if (extra?.followUpCompleted !== undefined) {
    result = runQuery('UPDATE leads SET follow_up_completed = ?, last_follow_up = ? WHERE id = ?', [extra.followUpCompleted ? 1 : 0, now, id]);
  } else {
    result = runQuery('UPDATE leads SET status = ?, last_follow_up = ? WHERE id = ?', [status, now, id]);
  }
  if (status === 'Closed Won') {
    syncConvertedLeadsToOps();
  }
  return result.changes > 0 ? getLeadById(id) : null;
}

export function updateLeadAccounts(id: string, data: { accountsRemarks?: string; reviewRequestedAt?: string; reviewChannel?: string }) {
  const fields: string[] = [];
  const params: any[] = [];
  if (data.accountsRemarks !== undefined) { fields.push('accounts_remarks = ?'); params.push(data.accountsRemarks); }
  if (data.reviewRequestedAt !== undefined) { fields.push('review_requested_at = ?'); params.push(data.reviewRequestedAt); }
  if (data.reviewChannel !== undefined) { fields.push('review_channel = ?'); params.push(data.reviewChannel); }
  if (fields.length > 0) {
    params.push(id);
    runQuery(`UPDATE leads SET ${fields.join(', ')} WHERE id = ?`, params);
  }
  return getLeadById(id);
}

export function updateLeadTravelers(
  id: string,
  adults: number,
  children: number,
  childAges: number[] = [],
  budgetTier?: string,
  includeStay?: string,
  includeFlight?: string,
  includeCab?: string,
  hotelCategory?: string,
  otherInfo?: string
) {
  const fields = ['adults = ?', 'children = ?', 'child_ages = ?'];
  const params: any[] = [adults, children, JSON.stringify(childAges)];

  if (budgetTier !== undefined) { fields.push('budget_tier = ?'); params.push(budgetTier); }
  if (includeStay !== undefined) { fields.push('include_stay = ?'); params.push(includeStay); }
  if (includeFlight !== undefined) { fields.push('include_flight = ?'); params.push(includeFlight); }
  if (includeCab !== undefined) { fields.push('include_cab = ?'); params.push(includeCab); }
  if (hotelCategory !== undefined) { fields.push('hotel_category = ?'); params.push(hotelCategory); }
  if (otherInfo !== undefined) { fields.push('other_info = ?'); params.push(otherInfo); }

  params.push(id);
  runQuery(`UPDATE leads SET ${fields.join(', ')} WHERE id = ?`, params);
  return getLeadById(id);
}

export function deleteLead(id: string) {
  const target = queryOne('SELECT id, trip_id FROM leads WHERE id = ? OR trip_id = ?', [id, id]);
  const leadId = target ? target.id : id;
  const tripId = target ? target.trip_id : id;

  runQuery('DELETE FROM quote_inclusions WHERE quote_id IN (SELECT id FROM quotes WHERE lead_id = ? OR lead_id = ?)', [leadId, tripId]);
  runQuery('DELETE FROM quote_hotels WHERE quote_id IN (SELECT id FROM quotes WHERE lead_id = ? OR lead_id = ?)', [leadId, tripId]);
  runQuery('DELETE FROM quote_itinerary_days WHERE quote_id IN (SELECT id FROM quotes WHERE lead_id = ? OR lead_id = ?)', [leadId, tripId]);
  runQuery('DELETE FROM quotes WHERE lead_id = ? OR lead_id = ?', [leadId, tripId]);
  runQuery('DELETE FROM lead_notes WHERE lead_id = ? OR lead_id = ?', [leadId, tripId]);
  runQuery('DELETE FROM payment_installments WHERE lead_id = ? OR lead_id = ?', [leadId, tripId]);
  runQuery('DELETE FROM payment_links WHERE lead_id = ? OR lead_id = ?', [leadId, tripId]);
  runQuery('DELETE FROM payment_submissions WHERE lead_id = ? OR lead_id = ?', [leadId, tripId]);

  // Clean ops tables completely using possible resolved customer IDs
  const possibleCustIds = [leadId, tripId, `cust-${leadId}`, `cust-${tripId}`].filter(Boolean);
  if (possibleCustIds.length > 0) {
    const placeHolders = possibleCustIds.map(() => '?').join(',');
    runQuery(`DELETE FROM ops_customer_installments WHERE customer_id IN (${placeHolders})`, possibleCustIds);
    runQuery(`DELETE FROM ops_vouchers WHERE customer_id IN (${placeHolders})`, possibleCustIds);
    runQuery(`DELETE FROM ops_daily_activities WHERE itinerary_id IN (SELECT id FROM ops_itineraries WHERE customer_id IN (${placeHolders}))`, possibleCustIds);
    runQuery(`DELETE FROM ops_itineraries WHERE customer_id IN (${placeHolders})`, possibleCustIds);
    runQuery(`DELETE FROM ops_customers WHERE id IN (${placeHolders}) OR booking_id IN (${placeHolders})`, [...possibleCustIds, ...possibleCustIds]);
  }

  const res = runQuery('DELETE FROM leads WHERE id = ? OR trip_id = ?', [leadId, tripId]);
  return res.changes > 0 || !!target;
}
export { hydrateQuote };

