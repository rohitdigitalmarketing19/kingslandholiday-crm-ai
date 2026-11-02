import { INSERT_BOOKING_SNAPSHOT, snapshotValues } from '../db/bookingSnapshotCompatibility';
import { getDb, queryOne, queryAll, saveDb } from '../db/connection';
export async function acceptBookingQuote(leadId: string, quoteId: string, actor: string) {
    const existing = await queryOne('SELECT * FROM booking_snapshots WHERE lead_id=?', [leadId]);
    if (existing) {
        if (existing.quote_id !== quoteId)
            throw Object.assign(new Error('This booking already has an accepted quote. Create an authorized adjustment instead.'), { status: 409 });
        return existing;
    }
    const quote = await queryOne('SELECT * FROM quotes WHERE id=? AND lead_id=?', [quoteId, leadId]);
    if (!quote || !Number.isFinite(quote.final_selling_price) || quote.final_selling_price <= 0)
        throw Object.assign(new Error('Save a quotation with a positive price before acceptance.'), { status: 400 });
    const snapshot = { ...quote, hotels: await queryAll('SELECT * FROM quote_hotels WHERE quote_id=? ORDER BY sort_order', [quoteId]), itinerary: await queryAll('SELECT * FROM quote_itinerary_days WHERE quote_id=? ORDER BY day_number', [quoteId]) };
    const db = getDb();
    await db.run('BEGIN');
    try {
        await db.run(INSERT_BOOKING_SNAPSHOT, snapshotValues(leadId, quoteId, Math.round(quote.final_selling_price * 100), JSON.stringify(snapshot), actor, new Date().toISOString()));
        await db.run('COMMIT');
        saveDb();
    }
    catch (error) {
        await db.run('ROLLBACK');
        throw error;
    }
    return await queryOne('SELECT * FROM booking_snapshots WHERE lead_id=?', [leadId]);
}
