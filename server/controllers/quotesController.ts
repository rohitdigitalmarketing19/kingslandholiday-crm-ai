import { randomUUID } from 'crypto';
import { assertTripEditable } from '../services/tripEditing';
import { collectedPaise, moneyPaise } from '../services/receipts';
import { normalizeHotelAlternative, HotelOptionValidationError } from '../../utils/hotelOptions';
import { withDbPersistenceBatch, getDb, saveDb, runQuery, queryAll, queryOne } from '../db/connection';
import { getLeadById } from './leadsController';
import { syncConvertedLeadsToOps } from './opsController';
import { generateNextTripId } from './settingsController';

function saveInclusions(quoteId: string, inclusions: any) {
  if (!inclusions) return;
  runQuery('DELETE FROM quote_inclusions WHERE quote_id = ?', [quoteId]);
  if (inclusions.accommodation) {
    for (const s of ['single','double','triple']) {
      const e = inclusions.accommodation[s];
      if (e) runQuery('INSERT INTO quote_inclusions (quote_id, category, sub_category, included, comments) VALUES (?,?,?,?,?)', [quoteId, 'accommodation', s, e.included ? 1 : 0, e.comments || '']);
    }
  }
  if (inclusions.mealPlan) {
    for (const s of ['breakfast','lunch','dinner']) {
      const e = inclusions.mealPlan[s];
      if (e) runQuery('INSERT INTO quote_inclusions (quote_id, category, sub_category, included, comments) VALUES (?,?,?,?,?)', [quoteId, 'mealPlan', s, e.included ? 1 : 0, e.comments || '']);
    }
  }
  if (inclusions.transfer) {
    for (const s of ['arrival','departure']) {
      const e = inclusions.transfer[s];
      if (e) runQuery('INSERT INTO quote_inclusions (quote_id, category, sub_category, included, comments) VALUES (?,?,?,?,?)', [quoteId, 'transfer', s, e.included ? 1 : 0, e.comments || '']);
    }
  }
  for (const c of ['sightseeing','taxes','tollParking','tripSupplements']) {
    const e = inclusions[c];
    if (e) runQuery('INSERT INTO quote_inclusions (quote_id, category, sub_category, included, comments) VALUES (?,?,?,?,?)', [quoteId, c, null, e.included ? 1 : 0, e.comments || '']);
  }
}

function saveHotels(quoteId: string, hotels: any[]) {
  if (!Array.isArray(hotels)) return;
  runQuery('DELETE FROM quote_hotels WHERE quote_id = ?', [quoteId]);
  hotels.forEach((h, i) => runQuery('INSERT INTO quote_hotels (quote_id, hotel_name, city, category, room_type, comments, nights, selected_night_indices, sort_order, meal_plan) VALUES (?,?,?,?,?,?,?,?,?,?)', [quoteId, h.hotelName || '', h.city || '', h.category || '4 Star', h.roomType || 'Standard Room', h.comments || '', h.nights || 1, JSON.stringify(h.selectedNightIndices || []), i, h.mealPlan || '']));
}

function saveItineraryDays(quoteId: string, itinerary: any[]) {
  if (!Array.isArray(itinerary)) return;
  runQuery('DELETE FROM quote_itinerary_days WHERE quote_id = ?', [quoteId]);
  itinerary.forEach((d) => {
    const img = d.imageUrl || d.image_url || d.img || '';
    runQuery('INSERT INTO quote_itinerary_days (quote_id, day_number, title, description, image_url) VALUES (?,?,?,?,?)', [quoteId, d.day || 1, d.title || '', d.description || '', img]);
  });
}

export function createQuote(leadId: string, data: any) {
  assertTripEditable(leadId);
  const alternative = normalizeHotelAlternative(data.hotelAlternative);
  if (alternative && (!Number.isFinite(data.finalSellingPrice) || data.finalSellingPrice <= 0)) throw new HotelOptionValidationError('Enter a valid price for Hotel Option 1.');
  const quoteId = data.id || `quote-${Date.now()}`;
  const now = new Date().toISOString();

  // Check if quote ID already exists in DB, if so perform update
  const existingQuote = queryOne('SELECT id,lead_id FROM quotes WHERE id = ?', [quoteId]);
  if(existingQuote && existingQuote.lead_id!==leadId)throw Object.assign(new Error('Quotation belongs to another lead.'),{status:403});
  if (existingQuote) {
    return updateQuote(leadId, quoteId, data);
  }

  // Ensure lead exists in DB to prevent FK constraint error
  const existingLead = queryOne('SELECT id FROM leads WHERE id = ?', [leadId]);
  if (!existingLead) throw Object.assign(new Error('Lead not found.'), {status:404});

  runQuery('INSERT INTO quotes (id, lead_id, package_title, final_selling_price, visa_cost, flight_cost, land_package_cost, marketing_fees, discount_percentage, nights, hotels_not_included, flights_not_included, cabs_not_included, flight_details, cab_details, other_inclusions, other_exclusions, terms_and_conditions, use_default_tc, other_information, working_agent_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [quoteId, leadId, data.packageTitle || '', data.finalSellingPrice || 0, data.visaCost || 0, data.flightCost || 0, data.landPackageCost || 0, data.marketingFees || 0, data.discountPercentage || 0, data.nights || 6, data.hotelsNotIncluded ? 1 : 0, data.flightsNotIncluded ? 1 : 0, data.cabsNotIncluded ? 1 : 0, data.flightDetails || '', data.cabDetails || '', data.otherInclusions || '', data.otherExclusions || '', data.termsAndConditions || '', data.useDefaultTC ? 1 : 0, data.otherInformation || '', data.workingAgentId || '', data.createdAt || now]);

  if (Object.prototype.hasOwnProperty.call(data, 'hotelAlternative')) runQuery('UPDATE quotes SET hotel_alternative = ? WHERE id = ?', [alternative ? JSON.stringify(alternative) : null, quoteId]);
  if (data.hotels) saveHotels(quoteId, data.hotels);
  if (data.inclusions) saveInclusions(quoteId, data.inclusions);
  if (data.itinerary) saveItineraryDays(quoteId, data.itinerary);

  const lead = queryOne('SELECT status FROM leads WHERE id = ?', [leadId]);
  if (lead && (lead.status === 'New' || lead.status === 'Qualified')) {
    runQuery('UPDATE leads SET status = ?, last_follow_up = ? WHERE id = ?', ['Itinerary Sent', now, leadId]);
  }

  syncConvertedLeadsToOps();
  return getLeadById(leadId);
}

export function updateQuote(leadId: string, quoteId: string, data: any, actor='system') {
  assertTripEditable(leadId);
  const existing=queryOne('SELECT lead_id FROM quotes WHERE id=?',[quoteId]);
  if(existing && existing.lead_id!==leadId) throw Object.assign(new Error('Quotation belongs to another lead.'),{status:403});
  if(!existing) return createQuote(leadId,{...data,id:quoteId});
  const booking=queryOne('SELECT * FROM booking_snapshots WHERE lead_id=? AND quote_id=?',[leadId,quoteId]);
  const total=booking ? moneyPaise(data.finalSellingPrice) : 0;
  if(booking && (total<=0 || total<collectedPaise(leadId))) throw Object.assign(new Error('Quotation total must be positive and cannot be less than verified customer payments.'),{status:400});
  const before={lead:getLeadById(leadId),booking};
  withDbPersistenceBatch(() => {
  const db=getDb();db.run('BEGIN');
  try {
    updateQuoteDetails(leadId,quoteId,data);
    if(booking) {
      const snapshot={...queryOne('SELECT * FROM quotes WHERE id=?',[quoteId]),hotels:queryAll('SELECT * FROM quote_hotels WHERE quote_id=? ORDER BY sort_order',[quoteId]),itinerary:queryAll('SELECT * FROM quote_itinerary_days WHERE quote_id=? ORDER BY day_number',[quoteId]),inclusions:queryAll('SELECT * FROM quote_inclusions WHERE quote_id=?',[quoteId])};
      db.run('INSERT INTO workflow_events(id,parent_id,event,before_json,after_json,actor,created_at) VALUES(?,?,?,?,?,?,?)',[randomUUID(),leadId,'Booking amended',booking.quote_json,JSON.stringify(snapshot),actor,new Date().toISOString()]);
      db.run('UPDATE booking_snapshots SET total_paise=?,total_minor=?,quote_json=?,snapshot_json=? WHERE lead_id=?',[total,total,JSON.stringify(snapshot),JSON.stringify(snapshot),leadId]);
      db.run('UPDATE ops_customers SET total_amount=? WHERE id=? OR booking_id=(SELECT trip_id FROM leads WHERE id=?)',[total/100,'cust-'+leadId,leadId]);
    }
    db.run('INSERT INTO workflow_events(id,parent_id,event,before_json,after_json,actor,created_at) VALUES(?,?,?,?,?,?,?)',[randomUUID(),leadId,'Quotation revised',JSON.stringify(before),JSON.stringify(getLeadById(leadId)),actor,new Date().toISOString()]);
    db.run('COMMIT');
  }catch(error){db.run('ROLLBACK');throw error;}
  });
  saveDb();syncConvertedLeadsToOps();return getLeadById(leadId);
}
function updateQuoteDetails(leadId: string, quoteId: string, data: any) {
  const runQuery=(sql:string,params:any[])=>getDb().run(sql,params);
  const alternative = normalizeHotelAlternative(data.hotelAlternative);
  if (alternative && (!Number.isFinite(data.finalSellingPrice) || data.finalSellingPrice <= 0)) throw new HotelOptionValidationError('Enter a valid price for Hotel Option 1.');
  const now = new Date().toISOString();

  // Check if quote ID exists, if not perform create

  const existingQuote = queryOne('SELECT id FROM quotes WHERE id = ? AND lead_id = ?', [quoteId, leadId]);
  if (!existingQuote) {
    return createQuote(leadId, { ...data, id: quoteId });
  }

  runQuery('UPDATE quotes SET package_title=?, final_selling_price=?, visa_cost=?, flight_cost=?, land_package_cost=?, marketing_fees=?, discount_percentage=?, nights=?, hotels_not_included=?, flights_not_included=?, cabs_not_included=?, flight_details=?, cab_details=?, other_inclusions=?, other_exclusions=?, terms_and_conditions=?, use_default_tc=?, other_information=?, working_agent_id=? WHERE id=? AND lead_id=?',
    [data.packageTitle || '', data.finalSellingPrice || 0, data.visaCost || 0, data.flightCost || 0, data.landPackageCost || 0, data.marketingFees || 0, data.discountPercentage || 0, data.nights || 6, data.hotelsNotIncluded ? 1 : 0, data.flightsNotIncluded ? 1 : 0, data.cabsNotIncluded ? 1 : 0, data.flightDetails || '', data.cabDetails || '', data.otherInclusions || '', data.otherExclusions || '', data.termsAndConditions || '', data.useDefaultTC ? 1 : 0, data.otherInformation || '', data.workingAgentId || '', quoteId, leadId]);

  if (Object.prototype.hasOwnProperty.call(data, 'hotelAlternative')) runQuery('UPDATE quotes SET hotel_alternative = ? WHERE id = ?', [alternative ? JSON.stringify(alternative) : null, quoteId]);
  if (data.hotels) saveHotels(quoteId, data.hotels);
  if (data.inclusions) saveInclusions(quoteId, data.inclusions);
  if (data.itinerary) saveItineraryDays(quoteId, data.itinerary);


  return getLeadById(leadId);
}

export function deleteQuote(leadId: string, quoteId: string) {
  if (queryOne('SELECT lead_id FROM booking_snapshots WHERE quote_id=?',[quoteId])) throw Object.assign(new Error('Accepted quotations cannot be deleted.'),{status:409});
  return runQuery('DELETE FROM quotes WHERE id = ? AND lead_id = ?', [quoteId, leadId]).changes > 0;
}
