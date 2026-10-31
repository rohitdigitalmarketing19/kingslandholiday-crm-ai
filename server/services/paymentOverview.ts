import { paymentExpiry } from './paymentExpiry';
import { queryAll, queryOne } from '../db/connection';
import { collectedPaise } from './receipts';
export function paymentOverview(leadId?: string, owners?: string[]) {
    const leads = queryAll('SELECT id,trip_id,name,assigned_to FROM leads').filter(l => (!owners || owners.includes(l.assigned_to)) && (!leadId || l.id === leadId || l.trip_id === leadId));
    const ids = new Set(leads.flatMap(l => [l.id, l.trip_id]));
    const allowed = (row: any) => ids.has(row.lead_id) || (!owners && !leadId && !row.lead_id);
    const installments = queryAll('SELECT * FROM payment_installments ORDER BY due_date,id').filter(allowed);
    const links = queryAll('SELECT * FROM payment_links ORDER BY created_at DESC').filter(allowed).map(l=>({...l,...paymentExpiry(l)}));
    const submissions = queryAll('SELECT * FROM payment_submissions ORDER BY created_at DESC').filter(allowed);
    const keys = new Set(installments.map(i => i.pay_key).filter(Boolean));
    const requests = [...installments.map(i => ({ ...i, status: i.payment_status, net_amount: i.amount, kind: 'Installment' })), ...links.filter(l => !keys.has(l.pay_key)).map(l => ({ ...l, kind: 'Payment link', due_date: '' }))].filter(r => r.status !== 'Cancelled');
    const bookings = leads.map(l => { const booking = queryOne('SELECT total_paise FROM booking_snapshots WHERE lead_id=?', [l.id]); return { ...l, total_paise: booking?.total_paise ?? null, collected_paise: collectedPaise(l.id) }; });
    const receipts = queryAll('SELECT e.*,COALESCE(u.name,e.actor) AS actor_name FROM receipt_events e LEFT JOIN users u ON u.id=e.actor ORDER BY e.created_at DESC').filter(allowed);
    return { bookings, requests, receipts, submissions, links };
}
