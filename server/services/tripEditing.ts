import { queryOne } from '../db/connection';
export async function assertTripEditable(leadId: string) {
    const completed = await queryOne("SELECT c.id FROM ops_customers c JOIN leads l ON c.id='cust-' || l.id OR c.booking_id=l.trip_id WHERE l.id=? AND lower(c.status)='completed'", [leadId]);
    const lead = await queryOne('SELECT status FROM leads WHERE id=?', [leadId]);
    if (completed || /^completed$/i.test(lead?.status || ''))
        throw Object.assign(new Error('This trip is complete. Lead and quotation details are read-only.'), { status: 409 });
}
