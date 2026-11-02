import {asyncMap} from '../utils/asyncCollections';
import { assertTripEditable } from '../services/tripEditing';
import crypto from 'crypto';
import { normalizeHotelAlternative } from '../../utils/hotelOptions';
import { getDb, withDbPersistenceBatch, runQuery, queryAll, queryOne } from '../db/connection';
async function hydrateLead(row: any, cache?:any): Promise<any> {
    const lead: any = {
        bookingTotal: cache ? (cache.booking.get(row.id) ?? null) : await (async () => { const b = await queryOne('SELECT total_paise FROM booking_snapshots WHERE lead_id=?', [row.id]); return b ? b.total_paise / 100 : null; })(),
        tripCompleted: cache ? cache.completed.has(row.id) : !!await queryOne("SELECT id FROM ops_customers WHERE (id=? OR booking_id=?) AND lower(status)='completed'", ['cust-' + row.id, row.trip_id]),
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
        documentsCount: 0,
    };
    try {
        const docCountRow = cache ? {count:cache.docs.get(row.id) || 0} : await queryOne('SELECT COUNT(*) as count FROM client_documents WHERE lead_id = ? AND deleted_at IS NULL', [lead.id]);
        lead.documentsCount = docCountRow ? Number(docCountRow.count) : 0;
    }
    catch (_e) {
        lead.documentsCount = 0;
    }
    lead.notes = (cache ? cache.notes.get(row.id) || [] : await queryAll('SELECT * FROM lead_notes WHERE lead_id = ? ORDER BY timestamp ASC', [lead.id])).map((n: any) => ({ id: n.id, text: n.text, type: n.type, timestamp: n.timestamp }));
    lead.quotes = await asyncMap((cache ? cache.quotes.get(row.id) || [] : await queryAll('SELECT * FROM quotes WHERE lead_id = ? ORDER BY created_at ASC', [lead.id])), async (q: any) => await hydrateQuote(q,cache));
    return lead;
}
async function hydrateQuote(row: any, cache?:any): Promise<any> {
    const quote: any = {
        id: row.id, packageTitle: row.package_title || '', finalSellingPrice: row.final_selling_price || 0,
        hotelAlternative: row.hotel_alternative ? normalizeHotelAlternative(JSON.parse(row.hotel_alternative)) : null,
        visaCost: row.visa_cost || 0, flightCost: row.flight_cost || 0, landPackageCost: row.land_package_cost || 0,
        marketingFees: row.marketing_fees || 0, discountPercentage: row.discount_percentage || 0, nights: row.nights || 6,
        hotelsNotIncluded: !!row.hotels_not_included, flightsNotIncluded: !!row.flights_not_included,
        cabsNotIncluded: !!row.cabs_not_included, flightDetails: row.flight_details || '', cabDetails: row.cab_details || '',
        otherInclusions: row.other_inclusions || '', otherExclusions: row.other_exclusions || '',
        termsAndConditions: row.terms_and_conditions || '', useDefaultTC: !!row.use_default_tc,
        otherInformation: row.other_information || '', workingAgentId: row.working_agent_id || '', createdAt: row.created_at,
    };
    quote.hotels = (cache ? cache.hotels.get(row.id) || [] : await queryAll('SELECT * FROM quote_hotels WHERE quote_id = ? ORDER BY sort_order ASC', [row.id])).map((h: any) => ({
        nights: h.nights, selectedNightIndices: JSON.parse(h.selected_night_indices || '[]'),
        hotelName: h.hotel_name || '', city: h.city || '', category: h.category || '4 Star',
        roomType: h.room_type || 'Standard Room', comments: h.comments || '', mealPlan: h.meal_plan || '',
    }));
    quote.inclusions = {
        accommodation: { single: { included: false, comments: '' }, double: { included: false, comments: '' }, triple: { included: false, comments: '' } },
        mealPlan: { breakfast: { included: false, comments: '' }, lunch: { included: false, comments: '' }, dinner: { included: false, comments: '' } },
        transfer: { arrival: { included: false, comments: '' }, departure: { included: false, comments: '' } },
        sightseeing: { included: false, comments: '' }, taxes: { included: false, comments: '' },
        tollParking: { included: false, comments: '' }, tripSupplements: { included: false, comments: '' },
    };
    for (const inc of (cache ? cache.inclusions.get(row.id) || [] : await queryAll('SELECT * FROM quote_inclusions WHERE quote_id = ?', [row.id]))) {
        const cat = inc.category;
        const sub = inc.sub_category;
        if (sub && quote.inclusions[cat]?.[sub]) {
            quote.inclusions[cat][sub].included = !!inc.included;
            quote.inclusions[cat][sub].comments = inc.comments || '';
        }
        else if (!sub && quote.inclusions[cat]) {
            quote.inclusions[cat].included = !!inc.included;
            quote.inclusions[cat].comments = inc.comments || '';
        }
    }
    quote.itinerary = (cache ? cache.days.get(row.id) || [] : await queryAll('SELECT * FROM quote_itinerary_days WHERE quote_id = ? ORDER BY day_number ASC', [row.id])).map((d: any) => ({
        day: d.day_number,
        title: d.title || '',
        description: d.description || '',
        imageUrl: d.image_url || '',
        img: d.image_url || ''
    }));
    quote.coverImage = row.cover_image || '';
    return quote;
}
export async function getAllLeads(filters?: {
    status?: string;
    assignedTo?: string | string[];
    search?: string;
}) {
    let query = 'SELECT * FROM leads WHERE 1=1';
    const params: any[] = [];
    if (filters?.status) {
        query += ' AND status = ?';
        params.push(filters.status);
    }
    if (Array.isArray(filters?.assignedTo)) {
        query += ` AND assigned_to IN (${filters.assignedTo.map(() => '?').join(',')})`;
        params.push(...filters.assignedTo);
    }
    else if (filters?.assignedTo) {
        query += ' AND assigned_to = ?';
        params.push(filters.assignedTo);
    }
    if (filters?.search) {
        query += ' AND (name LIKE ? OR destination LIKE ? OR trip_id LIKE ?)';
        const s = `%${filters.search}%`;
        params.push(s, s, s);
    }
    query += ' ORDER BY created_at DESC';
    const rows=await queryAll(query,params);if(!rows.length)return [];
    const ids=rows.map(r=>r.id),marks=ids.map(()=>'?').join(',');
    const group=(values:any[],key:string)=>{const map=new Map<string,any[]>();for(const value of values){const list=map.get(value[key]) || [];list.push(value);map.set(value[key],list);}return map;};
    const quoteRows=await queryAll('SELECT * FROM quotes WHERE lead_id IN ('+marks+') ORDER BY created_at',ids);
    const qids=quoteRows.map(q=>q.id),qm=qids.map(()=>'?').join(',');
    const cache={booking:new Map((await queryAll('SELECT lead_id,total_paise FROM booking_snapshots WHERE lead_id IN ('+marks+')',ids)).map(b=>[b.lead_id,b.total_paise/100])),
      completed:new Set((await queryAll("SELECT l.id FROM leads l JOIN ops_customers c ON c.id='cust-' || l.id OR c.booking_id=l.trip_id WHERE lower(c.status)='completed' AND l.id IN ("+marks+")",ids)).map(l=>l.id)),
      docs:new Map((await queryAll('SELECT lead_id,COUNT(*) AS count FROM client_documents WHERE deleted_at IS NULL AND lead_id IN ('+marks+') GROUP BY lead_id',ids)).map(r=>[r.lead_id,r.count])),
      notes:group(await queryAll('SELECT * FROM lead_notes WHERE lead_id IN ('+marks+') ORDER BY timestamp',ids),'lead_id'),quotes:group(quoteRows,'lead_id'),
      hotels:group(qids.length?await queryAll('SELECT * FROM quote_hotels WHERE quote_id IN ('+qm+') ORDER BY sort_order',qids):[],'quote_id'),
      inclusions:group(qids.length?await queryAll('SELECT * FROM quote_inclusions WHERE quote_id IN ('+qm+')',qids):[],'quote_id'),
      days:group(qids.length?await queryAll('SELECT * FROM quote_itinerary_days WHERE quote_id IN ('+qm+') ORDER BY day_number',qids):[],'quote_id')};
    return asyncMap(rows,(row:any)=>hydrateLead(row,cache));
}
export async function getLeadById(id: string) {
    const row = await queryOne('SELECT * FROM leads WHERE id = ?', [id]);
    return row ? await hydrateLead(row) : null;
}
import { generateNextTripId } from './settingsController';
export async function createLead(data: any, actor = 'system') {
    const requestId = data.requestId;
    if (requestId !== undefined && (typeof requestId !== 'string' || !/^[a-zA-Z0-9-]{16,100}$/.test(requestId)))
        throw Object.assign(new Error('Invalid inquiry request ID.'), { status: 400 });
    const requestKey = requestId ? 'lead-create:' + actor + ':' + requestId : '';
    const { requestId: _requestId, ...payload } = data;
    const fingerprint = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const previous = requestKey ? await queryOne("SELECT after_json FROM workflow_events WHERE parent_id=? AND event='Lead created' AND actor=?", [requestKey, actor]) : null;
    if (previous) {
        const saved = JSON.parse(previous.after_json);
        if (saved.fingerprint !== fingerprint)
            throw Object.assign(new Error('This save request was already used for different inquiry details.'), { status: 409 });
        return await getLeadById(saved.leadId);
    }
    return await withDbPersistenceBatch(async () => {
        const db = getDb();
        await db.run('BEGIN');
        try {
            const lead = await createLeadRecord(data);
            if (requestKey)
                await runQuery('INSERT INTO workflow_events(id,parent_id,event,before_json,after_json,actor,created_at) VALUES(?,?,?,?,?,?,?)', [crypto.randomUUID(), requestKey, 'Lead created', '{}', JSON.stringify({ leadId: lead.id, fingerprint }), actor, new Date().toISOString()]);
            await db.run('COMMIT');
            return lead;
        }
        catch (error) {
            await db.run('ROLLBACK');
            throw error;
        }
    });
}
async function createLeadRecord(data: any) {
    if (['Closed Won', 'Won', 'Converted', 'CONVERTED'].includes(data.status))
        throw Object.assign(new Error('Create the lead and accept a saved quotation before conversion.'), { status: 400 });
    const id = data.id || `lead-${crypto.randomUUID()}`;
    const tripId = typeof data.tripId === 'string' && data.tripId.trim() ? data.tripId.trim() : await generateNextTripId();
    if (await queryOne('SELECT id FROM leads WHERE trip_id=?', [tripId]))
        throw Object.assign(new Error(`Trip ID ${tripId} already exists. Use a different Trip ID or leave it blank to generate one.`), { status: 409 });
    const now = new Date().toISOString();
    await runQuery('INSERT INTO leads (id, trip_id, name, phone, email, raw_inquiry, summary, score, intent, destination, budget_tier, assigned_to, source, status, travel_date, duration_days, adults, children, child_ages, other_info, include_stay, include_flight, include_cab, hotel_category, english_driver, created_at, last_follow_up) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [id, tripId, data.name || '', data.phone || '', data.email || '', data.rawInquiry || '', data.summary || '', data.score || 50, data.intent || 'Information Seeking', data.destination || '', data.budgetTier || 'Mid', data.assignedTo || '', data.source || 'Website Form', data.status || 'New', data.travelDate || '', data.durationDays || 7, data.travelers?.adults || 2, data.travelers?.children || 0, JSON.stringify(data.travelers?.childAges || []), data.otherInfo || '', data.includeStay || 'Yes', data.includeFlight || 'No', data.includeCab || 'Yes', data.hotelCategory || '4/3 Star', data.englishDriver ? 1 : 0, now, now]);
    return await getLeadById(id);
}
import { syncConvertedLeadsToOps } from './opsController';
export async function updateLeadStatus(id: string, status: string, extra?: {
    postponedDate?: string;
    postponedReason?: string;
    followUpDate?: string;
    followUpTime?: string;
    followUpType?: string;
    followUpNote?: string;
    followUpCompleted?: boolean;
}) {
    if (['Closed Won', 'Won', 'Converted', 'CONVERTED'].includes(status) && !await queryOne('SELECT lead_id FROM booking_snapshots WHERE lead_id=?', [id]))
        throw Object.assign(new Error('Open the saved proposal and confirm the selected quotation is accepted before converting.'), { status: 400 });
    await assertTripEditable(id);
    const now = new Date().toISOString();
    let result;
    if (status === 'Postponed' && extra?.postponedDate) {
        result = await runQuery('UPDATE leads SET status = ?, postponed_date = ?, postponed_reason = ?, last_follow_up = ? WHERE id = ?', [status, extra.postponedDate, extra.postponedReason || '', now, id]);
    }
    else if ((status === 'Follow-up' || extra?.followUpDate) && extra?.followUpDate) {
        result = await runQuery('UPDATE leads SET status = ?, follow_up_date = ?, follow_up_time = ?, follow_up_type = ?, follow_up_note = ?, follow_up_completed = ?, last_follow_up = ? WHERE id = ?', [status, extra.followUpDate, extra.followUpTime || '10:00', extra.followUpType || 'Call', extra.followUpNote || '', extra.followUpCompleted ? 1 : 0, now, id]);
        if (extra.followUpNote) {
            const noteId = `note-${Date.now()}`;
            await runQuery('INSERT INTO lead_notes (id, lead_id, text, type, timestamp) VALUES (?,?,?,?,?)', [noteId, id, `📅 Scheduled ${extra.followUpType || 'Call'} on ${extra.followUpDate} at ${extra.followUpTime || '10:00'}: ${extra.followUpNote}`, 'Action', now]);
        }
    }
    else if (extra?.followUpCompleted !== undefined) {
        result = await runQuery('UPDATE leads SET follow_up_completed = ?, last_follow_up = ? WHERE id = ?', [extra.followUpCompleted ? 1 : 0, now, id]);
    }
    else {
        result = await runQuery('UPDATE leads SET status = ?, last_follow_up = ? WHERE id = ?', [status, now, id]);
    }
    if (status === 'Closed Won') {
        await syncConvertedLeadsToOps();
    }
    return result.changes > 0 ? await getLeadById(id) : null;
}
export async function updateLeadAccounts(id: string, data: {
    accountsRemarks?: string;
    reviewRequestedAt?: string;
    reviewChannel?: string;
}) {
    const fields: string[] = [];
    const params: any[] = [];
    if (data.accountsRemarks !== undefined) {
        fields.push('accounts_remarks = ?');
        params.push(data.accountsRemarks);
    }
    if (data.reviewRequestedAt !== undefined) {
        fields.push('review_requested_at = ?');
        params.push(data.reviewRequestedAt);
    }
    if (data.reviewChannel !== undefined) {
        fields.push('review_channel = ?');
        params.push(data.reviewChannel);
    }
    if (fields.length > 0) {
        params.push(id);
        await runQuery(`UPDATE leads SET ${fields.join(', ')} WHERE id = ?`, params);
    }
    return await getLeadById(id);
}
export async function updateLeadTravelers(id: string, adults: number, children: number, childAges: number[] = [], budgetTier?: string, includeStay?: string, includeFlight?: string, includeCab?: string, hotelCategory?: string, otherInfo?: string) {
    await assertTripEditable(id);
    const fields = ['adults = ?', 'children = ?', 'child_ages = ?'];
    const params: any[] = [adults, children, JSON.stringify(childAges)];
    if (budgetTier !== undefined) {
        fields.push('budget_tier = ?');
        params.push(budgetTier);
    }
    if (includeStay !== undefined) {
        fields.push('include_stay = ?');
        params.push(includeStay);
    }
    if (includeFlight !== undefined) {
        fields.push('include_flight = ?');
        params.push(includeFlight);
    }
    if (includeCab !== undefined) {
        fields.push('include_cab = ?');
        params.push(includeCab);
    }
    if (hotelCategory !== undefined) {
        fields.push('hotel_category = ?');
        params.push(hotelCategory);
    }
    if (otherInfo !== undefined) {
        fields.push('other_info = ?');
        params.push(otherInfo);
    }
    params.push(id);
    await runQuery(`UPDATE leads SET ${fields.join(', ')} WHERE id = ?`, params);
    return await getLeadById(id);
}
export async function deleteLead(id: string) {
    if (await queryOne('SELECT lead_id FROM booking_snapshots WHERE lead_id=?', [id]) || await queryOne('SELECT id FROM receipt_events WHERE lead_id=?', [id]))
        throw Object.assign(new Error('Booked or paid leads cannot be deleted. Use cancellation to preserve history.'), { status: 409 });
    const target = await queryOne('SELECT id, trip_id FROM leads WHERE id = ? OR trip_id = ?', [id, id]);
    const leadId = target ? target.id : id;
    const tripId = target ? target.trip_id : id;
    await runQuery('DELETE FROM quote_inclusions WHERE quote_id IN (SELECT id FROM quotes WHERE lead_id = ? OR lead_id = ?)', [leadId, tripId]);
    await runQuery('DELETE FROM quote_hotels WHERE quote_id IN (SELECT id FROM quotes WHERE lead_id = ? OR lead_id = ?)', [leadId, tripId]);
    await runQuery('DELETE FROM quote_itinerary_days WHERE quote_id IN (SELECT id FROM quotes WHERE lead_id = ? OR lead_id = ?)', [leadId, tripId]);
    await runQuery('DELETE FROM quotes WHERE lead_id = ? OR lead_id = ?', [leadId, tripId]);
    await runQuery('DELETE FROM lead_notes WHERE lead_id = ? OR lead_id = ?', [leadId, tripId]);
    await runQuery('DELETE FROM payment_installments WHERE lead_id = ? OR lead_id = ?', [leadId, tripId]);
    await runQuery('DELETE FROM payment_links WHERE lead_id = ? OR lead_id = ?', [leadId, tripId]);
    await runQuery('DELETE FROM payment_submissions WHERE lead_id = ? OR lead_id = ?', [leadId, tripId]);
    // Clean ops tables completely using possible resolved customer IDs
    const possibleCustIds = [leadId, tripId, `cust-${leadId}`, `cust-${tripId}`].filter(Boolean);
    if (possibleCustIds.length > 0) {
        const placeHolders = possibleCustIds.map(() => '?').join(',');
        await runQuery(`DELETE FROM ops_customer_installments WHERE customer_id IN (${placeHolders})`, possibleCustIds);
        await runQuery(`DELETE FROM ops_vouchers WHERE customer_id IN (${placeHolders})`, possibleCustIds);
        await runQuery(`DELETE FROM ops_daily_activities WHERE itinerary_id IN (SELECT id FROM ops_itineraries WHERE customer_id IN (${placeHolders}))`, possibleCustIds);
        await runQuery(`DELETE FROM ops_itineraries WHERE customer_id IN (${placeHolders})`, possibleCustIds);
        await runQuery(`DELETE FROM ops_customers WHERE id IN (${placeHolders}) OR booking_id IN (${placeHolders})`, [...possibleCustIds, ...possibleCustIds]);
    }
    const res = await runQuery('DELETE FROM leads WHERE id = ? OR trip_id = ?', [leadId, tripId]);
    return res.changes > 0 || !!target;
}
export async function reassignLead(id: string, assignedTo: string) {
    await runQuery('UPDATE leads SET assigned_to = ? WHERE id = ?', [assignedTo, id]);
    return await getLeadById(id);
}
export { hydrateQuote };
