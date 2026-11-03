import {reconcileQuoteStays} from '../../utils/quoteStayPlan';
import {asyncForEach} from '../utils/asyncCollections';
import { randomUUID } from 'crypto';
import { assertTripEditable } from '../services/tripEditing';
import { collectedPaise, moneyPaise } from '../services/receipts';
import { normalizeHotelAlternative, HotelOptionValidationError } from '../../utils/hotelOptions';
import { withDbPersistenceBatch, getDb, saveDb, runQuery, queryAll, queryOne } from '../db/connection';
import { getLeadById } from './leadsController';
import { syncConvertedLeadsToOps } from './opsController';
import { generateNextTripId } from './settingsController';
async function insertRows(table:string,columns:string[],rows:any[][]){
    // Keep image-bearing inserts below a conservative packet size.
    let batch:any[][]=[],bytes=0;
    const flush=async()=>{if(!batch.length)return;await runQuery('INSERT INTO '+table+' ('+columns.join(',')+') VALUES '+batch.map(()=> '('+columns.map(()=>'?').join(',')+')').join(','),batch.flat());batch=[];bytes=0;};
    for(const row of rows){const size=Buffer.byteLength(JSON.stringify(row));if(batch.length&&(bytes+size>1000000||batch.length>=100))await flush();batch.push(row);bytes+=size;}
    await flush();
}
async function saveInclusions(quoteId:string,inclusions:any){
    if(!inclusions)return;
    await runQuery('DELETE FROM quote_inclusions WHERE quote_id=?',[quoteId]);
    const rows:any[][]=[];
    for(const [category,subs] of Object.entries({accommodation:['single','double','triple'],mealPlan:['breakfast','lunch','dinner'],transfer:['arrival','departure']}))
        for(const sub of subs){const entry=inclusions[category]?.[sub];if(entry)rows.push([quoteId,category,sub,entry.included?1:0,entry.comments||'']);}
    for(const category of ['sightseeing','taxes','tollParking','tripSupplements']){const entry=inclusions[category];if(entry)rows.push([quoteId,category,null,entry.included?1:0,entry.comments||'']);}
    await insertRows('quote_inclusions',['quote_id','category','sub_category','included','comments'],rows);
}
async function saveHotels(quoteId:string,hotels:any[]){
    if(!Array.isArray(hotels))return;
    await runQuery('DELETE FROM quote_hotels WHERE quote_id=?',[quoteId]);
    await insertRows('quote_hotels',['quote_id','hotel_name','city','category','room_type','comments','nights','selected_night_indices','sort_order','meal_plan'],hotels.map((h,i)=>[quoteId,h.hotelName||'',h.city||'',h.category||'4 Star',h.roomType||'Standard Room',h.comments||'',h.nights??0,JSON.stringify(h.selectedNightIndices||[]),i,h.mealPlan||'']));
}
async function saveItineraryDays(quoteId:string,itinerary:any[]){
    if(!Array.isArray(itinerary))return;
    await runQuery('DELETE FROM quote_itinerary_days WHERE quote_id=?',[quoteId]);
    await insertRows('quote_itinerary_days',['quote_id','day_number','title','description','image_url'],itinerary.map(d=>[quoteId,d.day||1,d.title||'',d.description||'',d.imageUrl||d.image_url||d.img||'']));
}
export async function createQuote(leadId: string,data:any){return withDbPersistenceBatch(()=>createQuoteRecord(leadId,data));}
async function createQuoteRecord(leadId:string,data:any){
    if(data.imagesDeferred)throw Object.assign(new Error('Load the full quotation before saving so its images are preserved.'),{status:400});
    data=reconcileQuoteStays(data);
    await assertTripEditable(leadId);
    const alternative = normalizeHotelAlternative(data.hotelAlternative);
    if (alternative && (!Number.isFinite(data.finalSellingPrice) || data.finalSellingPrice <= 0))
        throw new HotelOptionValidationError('Enter a valid price for Hotel Option 1.');
    const quoteId = data.id || `quote-${Date.now()}`;
    const now = new Date().toISOString();
    // Check if quote ID already exists in DB, if so perform update
    const existingQuote = await queryOne('SELECT id,lead_id FROM quotes WHERE id = ?', [quoteId]);
    if (existingQuote && existingQuote.lead_id !== leadId)
        throw Object.assign(new Error('Quotation belongs to another lead.'), { status: 403 });
    if (existingQuote) {
        return await updateQuote(leadId, quoteId, data);
    }
    // Ensure lead exists in DB to prevent FK constraint error
    const existingLead = await queryOne('SELECT id FROM leads WHERE id = ?', [leadId]);
    if (!existingLead)
        throw Object.assign(new Error('Lead not found.'), { status: 404 });
    await runQuery('INSERT INTO quotes (id, lead_id, package_title, final_selling_price, visa_cost, flight_cost, land_package_cost, marketing_fees, discount_percentage, nights, hotels_not_included, flights_not_included, cabs_not_included, flight_details, cab_details, other_inclusions, other_exclusions, terms_and_conditions, use_default_tc, other_information, working_agent_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [quoteId, leadId, data.packageTitle || '', data.finalSellingPrice || 0, data.visaCost || 0, data.flightCost || 0, data.landPackageCost || 0, data.marketingFees || 0, data.discountPercentage || 0, data.nights ?? 6, data.hotelsNotIncluded ? 1 : 0, data.flightsNotIncluded ? 1 : 0, data.cabsNotIncluded ? 1 : 0, data.flightDetails || '', data.cabDetails || '', data.otherInclusions || '', data.otherExclusions || '', data.termsAndConditions || '', data.useDefaultTC ? 1 : 0, data.otherInformation || '', data.workingAgentId || '', data.createdAt || now]);
    if (Object.prototype.hasOwnProperty.call(data, 'hotelAlternative'))
        await runQuery('UPDATE quotes SET hotel_alternative = ? WHERE id = ?', [alternative ? JSON.stringify(alternative) : null, quoteId]);
    if (data.hotels)
        await saveHotels(quoteId, data.hotels);
    if (data.inclusions)
        await saveInclusions(quoteId, data.inclusions);
    if (data.itinerary)
        await saveItineraryDays(quoteId, data.itinerary);
    const lead = await queryOne('SELECT status FROM leads WHERE id = ?', [leadId]);
    if (lead && (lead.status === 'New' || lead.status === 'Qualified')) {
        await runQuery('UPDATE leads SET status = ?, last_follow_up = ? WHERE id = ?', ['Itinerary Sent', now, leadId]);
    }
    await syncConvertedLeadsToOps(leadId);
    return await getLeadById(leadId);
}
export async function updateQuote(leadId: string, quoteId: string, data: any, actor = 'system') {
    if(data.imagesDeferred)throw Object.assign(new Error('Load the full quotation before saving so its images are preserved.'),{status:400});
    await assertTripEditable(leadId);
    const existing = await queryOne('SELECT lead_id FROM quotes WHERE id=?', [quoteId]);
    if (existing && existing.lead_id !== leadId)
        throw Object.assign(new Error('Quotation belongs to another lead.'), { status: 403 });
    if (!existing)
        return await createQuote(leadId, { ...data, id: quoteId });
    const booking = await queryOne('SELECT * FROM booking_snapshots WHERE lead_id=? AND quote_id=?', [leadId, quoteId]);
    const total = booking ? moneyPaise(data.finalSellingPrice) : 0;
    if (booking && (total <= 0 || total < await collectedPaise(leadId)))
        throw Object.assign(new Error('Quotation total must be positive and cannot be less than verified customer payments.'), { status: 400 });
    const before = { lead: await getLeadById(leadId), booking };
    await withDbPersistenceBatch(async () => {
        const db = getDb();
        await db.run('BEGIN');
        try {
            await updateQuoteDetails(leadId, quoteId, data);
            if (booking) {
                const snapshot = { ...await queryOne('SELECT * FROM quotes WHERE id=?', [quoteId]), hotels: await queryAll('SELECT * FROM quote_hotels WHERE quote_id=? ORDER BY sort_order', [quoteId]), itinerary: await queryAll('SELECT * FROM quote_itinerary_days WHERE quote_id=? ORDER BY day_number', [quoteId]), inclusions: await queryAll('SELECT * FROM quote_inclusions WHERE quote_id=?', [quoteId]) };
                await db.run('INSERT INTO workflow_events(id,parent_id,event,before_json,after_json,actor,created_at) VALUES(?,?,?,?,?,?,?)', [randomUUID(), leadId, 'Booking amended', booking.quote_json, JSON.stringify(snapshot), actor, new Date().toISOString()]);
                await db.run('UPDATE booking_snapshots SET total_paise=?,total_minor=?,quote_json=?,snapshot_json=? WHERE lead_id=?', [total, total, JSON.stringify(snapshot), JSON.stringify(snapshot), leadId]);
                await db.run('UPDATE ops_customers SET total_amount=? WHERE id=? OR booking_id=(SELECT trip_id FROM leads WHERE id=?)', [total / 100, 'cust-' + leadId, leadId]);
            }
            await db.run('INSERT INTO workflow_events(id,parent_id,event,before_json,after_json,actor,created_at) VALUES(?,?,?,?,?,?,?)', [randomUUID(), leadId, 'Quotation revised', JSON.stringify(before), JSON.stringify(await getLeadById(leadId)), actor, new Date().toISOString()]);
            await db.run('COMMIT');
        }
        catch (error) {
            await db.run('ROLLBACK');
            throw error;
        }
    });
    saveDb();
    await syncConvertedLeadsToOps(leadId);
    return await getLeadById(leadId);
}
async function updateQuoteDetails(leadId: string, quoteId: string, data: any) {
    data=reconcileQuoteStays(data);
    const runQuery = async (sql: string, params: any[]) => await getDb().run(sql, params);
    const alternative = normalizeHotelAlternative(data.hotelAlternative);
    if (alternative && (!Number.isFinite(data.finalSellingPrice) || data.finalSellingPrice <= 0))
        throw new HotelOptionValidationError('Enter a valid price for Hotel Option 1.');
    const now = new Date().toISOString();
    // Check if quote ID exists, if not perform create
    const existingQuote = await queryOne('SELECT id FROM quotes WHERE id = ? AND lead_id = ?', [quoteId, leadId]);
    if (!existingQuote) {
        return await createQuote(leadId, { ...data, id: quoteId });
    }
    await runQuery('UPDATE quotes SET package_title=?, final_selling_price=?, visa_cost=?, flight_cost=?, land_package_cost=?, marketing_fees=?, discount_percentage=?, nights=?, hotels_not_included=?, flights_not_included=?, cabs_not_included=?, flight_details=?, cab_details=?, other_inclusions=?, other_exclusions=?, terms_and_conditions=?, use_default_tc=?, other_information=?, working_agent_id=? WHERE id=? AND lead_id=?', [data.packageTitle || '', data.finalSellingPrice || 0, data.visaCost || 0, data.flightCost || 0, data.landPackageCost || 0, data.marketingFees || 0, data.discountPercentage || 0, data.nights ?? 6, data.hotelsNotIncluded ? 1 : 0, data.flightsNotIncluded ? 1 : 0, data.cabsNotIncluded ? 1 : 0, data.flightDetails || '', data.cabDetails || '', data.otherInclusions || '', data.otherExclusions || '', data.termsAndConditions || '', data.useDefaultTC ? 1 : 0, data.otherInformation || '', data.workingAgentId || '', quoteId, leadId]);
    if (Object.prototype.hasOwnProperty.call(data, 'hotelAlternative'))
        await runQuery('UPDATE quotes SET hotel_alternative = ? WHERE id = ?', [alternative ? JSON.stringify(alternative) : null, quoteId]);
    if (data.hotels)
        await saveHotels(quoteId, data.hotels);
    if (data.inclusions)
        await saveInclusions(quoteId, data.inclusions);
    if (data.itinerary)
        await saveItineraryDays(quoteId, data.itinerary);
    return await getLeadById(leadId);
}
export async function deleteQuote(leadId: string, quoteId: string) {
    if (await queryOne('SELECT lead_id FROM booking_snapshots WHERE quote_id=?', [quoteId]))
        throw Object.assign(new Error('Accepted quotations cannot be deleted.'), { status: 409 });
    return (await runQuery('DELETE FROM quotes WHERE id = ? AND lead_id = ?', [quoteId, leadId])).changes > 0;
}
