import {asyncMap} from '../utils/asyncCollections';
import { paymentExpiry } from './paymentExpiry';
import { queryAll, queryOne } from '../db/connection';
import { collectedPaise } from './receipts';
export async function paymentOverview(leadId?: string, owners?: string[]) {
    const leads = (await queryAll('SELECT id,trip_id,name,assigned_to FROM leads')).filter(l => (!owners || owners.includes(l.assigned_to)) && (!leadId || l.id === leadId || l.trip_id === leadId));
    const ids = new Set(leads.flatMap(l => [l.id, l.trip_id]));
    const allowed = (row: any) => ids.has(row.lead_id) || (!owners && !leadId && !row.lead_id);
    const installments = (await queryAll('SELECT * FROM payment_installments ORDER BY due_date,id')).filter(allowed);
    const links = (await queryAll('SELECT * FROM payment_links ORDER BY created_at DESC')).filter(allowed).map(l => ({ ...l, ...paymentExpiry(l) }));
    const submissions = (await queryAll('SELECT * FROM payment_submissions ORDER BY created_at DESC')).filter(allowed);
    const keys = new Set(installments.map(i => i.pay_key).filter(Boolean));
    const requests = [...installments.map(i => ({ ...i, status: i.payment_status, net_amount: i.amount, kind: 'Installment' })), ...links.filter(l => !keys.has(l.pay_key)).map(l => ({ ...l, kind: 'Payment link', due_date: '' }))].filter(r => r.status !== 'Cancelled');
    const snapshots=new Map((await queryAll('SELECT lead_id,total_paise FROM booking_snapshots')).map(b=>[b.lead_id,b.total_paise]));
    const bookings=leads.map(l=>{const matches=(r:any)=>r.lead_id===l.id || r.lead_id===l.trip_id;const paid=[...installments.filter(matches),...links.filter(r=>matches(r)&&!installments.some(i=>(i.pay_key && i.pay_key===r.pay_key)||i.id===r.id))].reduce((sum,r)=>sum+Math.round(Number(r.paid_amount || 0)*100),0);return {...l,total_paise:snapshots.get(l.id)??null,collected_paise:paid};});
    const receipts = (await queryAll('SELECT e.*,COALESCE(u.name,e.actor) AS actor_name FROM receipt_events e LEFT JOIN users u ON u.id=e.actor ORDER BY e.created_at DESC')).filter(allowed);
    return { bookings, requests, receipts, submissions, links };
}
