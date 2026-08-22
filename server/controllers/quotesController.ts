import { runQuery, queryAll, queryOne } from '../db/connection';
import { getLeadById } from './leadsController';
import { syncConvertedLeadsToOps } from './opsController';

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
  hotels.forEach((h, i) => runQuery('INSERT INTO quote_hotels (quote_id, hotel_name, city, category, room_type, comments, nights, selected_night_indices, sort_order) VALUES (?,?,?,?,?,?,?,?,?)', [quoteId, h.hotelName || '', h.city || '', h.category || '4 Star', h.roomType || 'Standard Room', h.comments || '', h.nights || 1, JSON.stringify(h.selectedNightIndices || []), i]));
}

function saveItineraryDays(quoteId: string, itinerary: any[]) {
  if (!Array.isArray(itinerary)) return;
  runQuery('DELETE FROM quote_itinerary_days WHERE quote_id = ?', [quoteId]);
  itinerary.forEach((d) => runQuery('INSERT INTO quote_itinerary_days (quote_id, day_number, title, description) VALUES (?,?,?,?)', [quoteId, d.day || 1, d.title || '', d.description || '']));
}

export function createQuote(leadId: string, data: any) {
  const quoteId = data.id || `quote-${Date.now()}`;
  const now = new Date().toISOString();

  // Check if quote ID already exists in DB, if so perform update
  const existingQuote = queryOne('SELECT id FROM quotes WHERE id = ?', [quoteId]);
  if (existingQuote) {
    return updateQuote(leadId, quoteId, data);
  }

  // Ensure lead exists in DB to prevent FK constraint error
  const existingLead = queryOne('SELECT id FROM leads WHERE id = ?', [leadId]);
  if (!existingLead) {
    const tripId = `KL-${Math.floor(1000 + Math.random() * 9000)}`;
    runQuery('INSERT INTO leads (id, trip_id, name, created_at, last_follow_up) VALUES (?,?,?,?,?)', [leadId, tripId, 'Client', now, now]);
  }

  runQuery('INSERT INTO quotes (id, lead_id, package_title, final_selling_price, visa_cost, flight_cost, land_package_cost, marketing_fees, discount_percentage, nights, hotels_not_included, flights_not_included, cabs_not_included, flight_details, cab_details, other_inclusions, other_exclusions, terms_and_conditions, use_default_tc, other_information, working_agent_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [quoteId, leadId, data.packageTitle || '', data.finalSellingPrice || 0, data.visaCost || 0, data.flightCost || 0, data.landPackageCost || 0, data.marketingFees || 0, data.discountPercentage || 0, data.nights || 6, data.hotelsNotIncluded ? 1 : 0, data.flightsNotIncluded ? 1 : 0, data.cabsNotIncluded ? 1 : 0, data.flightDetails || '', data.cabDetails || '', data.otherInclusions || '', data.otherExclusions || '', data.termsAndConditions || '', data.useDefaultTC ? 1 : 0, data.otherInformation || '', data.workingAgentId || '', data.createdAt || now]);

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

export function updateQuote(leadId: string, quoteId: string, data: any) {
  const now = new Date().toISOString();

  // Check if quote ID exists, if not perform create
  const existingQuote = queryOne('SELECT id FROM quotes WHERE id = ? AND lead_id = ?', [quoteId, leadId]);
  if (!existingQuote) {
    return createQuote(leadId, { ...data, id: quoteId });
  }

  runQuery('UPDATE quotes SET package_title=?, final_selling_price=?, visa_cost=?, flight_cost=?, land_package_cost=?, marketing_fees=?, discount_percentage=?, nights=?, hotels_not_included=?, flights_not_included=?, cabs_not_included=?, flight_details=?, cab_details=?, other_inclusions=?, other_exclusions=?, terms_and_conditions=?, use_default_tc=?, other_information=?, working_agent_id=? WHERE id=? AND lead_id=?',
    [data.packageTitle || '', data.finalSellingPrice || 0, data.visaCost || 0, data.flightCost || 0, data.landPackageCost || 0, data.marketingFees || 0, data.discountPercentage || 0, data.nights || 6, data.hotelsNotIncluded ? 1 : 0, data.flightsNotIncluded ? 1 : 0, data.cabsNotIncluded ? 1 : 0, data.flightDetails || '', data.cabDetails || '', data.otherInclusions || '', data.otherExclusions || '', data.termsAndConditions || '', data.useDefaultTC ? 1 : 0, data.otherInformation || '', data.workingAgentId || '', quoteId, leadId]);

  if (data.hotels) saveHotels(quoteId, data.hotels);
  if (data.inclusions) saveInclusions(quoteId, data.inclusions);
  if (data.itinerary) saveItineraryDays(quoteId, data.itinerary);

  syncConvertedLeadsToOps();
  return getLeadById(leadId);
}

export function deleteQuote(leadId: string, quoteId: string) {
  return runQuery('DELETE FROM quotes WHERE id = ? AND lead_id = ?', [quoteId, leadId]).changes > 0;
}
