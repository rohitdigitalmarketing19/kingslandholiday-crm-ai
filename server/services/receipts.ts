import { randomUUID } from 'crypto';
import { getDb, queryOne, queryAll, saveDb } from '../db/connection';
const fail=(message: string,status=400)=>Object.assign(new Error(message),{status});
export function moneyPaise(value: unknown): number {
  if ((typeof value!=='number' && typeof value!=='string') || !/^\d+(\.\d{1,2})?$/.test(String(value)) || !Number.isFinite(Number(value))) throw fail('Enter a valid non-negative amount with up to two decimals.');
  const parts=String(value).split('.');const amount=Number(parts[0])*100+Number((parts[1] || '').padEnd(2,'0'));
  if(!Number.isSafeInteger(amount))throw fail('Amount is too large.');return amount;
}
export function collectedPaise(leadId: string): number {
  const lead=queryOne('SELECT id,trip_id FROM leads WHERE id=? OR trip_id=?',[leadId,leadId]);const ids=[lead?.id || leadId,lead?.trip_id || leadId];
  const rows=queryAll('SELECT paid_amount AS paid FROM payment_installments WHERE lead_id IN (?,?)',[...ids]);
  const links=queryAll(`SELECT p.paid_amount AS paid FROM payment_links p WHERE p.lead_id IN (?,?) AND NOT EXISTS (SELECT 1 FROM payment_installments i WHERE (i.pay_key != '' AND i.pay_key=p.pay_key) OR i.id=p.id)`,ids);
  return [...rows,...links].reduce((sum,row)=>sum+Math.round(Number(row.paid || 0)*100),0);
}
// API amount means cumulative amount verified for this request. Repeated confirmation is idempotent.
export function recordReceipt(key: string, amount: unknown, reference: string | undefined, mode: string | undefined, notes: string | undefined, actor: string, externalTransaction=false) {
  let inst=queryOne(`SELECT * FROM payment_installments WHERE id=? OR (pay_key != '' AND pay_key=?)`,[key,key]);
  let link=queryOne('SELECT * FROM payment_links WHERE id=? OR pay_key=?',[key,key]);
  if(!inst && link) inst=queryOne('SELECT * FROM payment_installments WHERE pay_key=?',[link.pay_key]);
  if(!link && inst?.pay_key) link=queryOne('SELECT * FROM payment_links WHERE pay_key=?',[inst.pay_key]);
  if(!inst && !link) throw fail('Payment request not found.',404);
  if(link?.status==='Cancelled')throw fail('This payment request has been cancelled.',409);
  const requestKey=inst?.id || link.id;
  const requested=moneyPaise(inst ? inst.amount : (link.net_amount ?? link.amount));
  const received=amount===undefined ? requested : moneyPaise(amount);
  const old=Math.max(Math.round(Number(inst?.paid_amount || 0)*100),Math.round(Number(link?.paid_amount || 0)*100));
  if(received<=0 || received>requested) throw fail('Confirmed amount must be positive and cannot exceed this payment request.');

  const ref=(reference || `RECEIPT-${randomUUID()}`).trim();if(ref.length>160 || !ref)throw fail('Enter a valid payment reference.');
  const duplicate=queryOne('SELECT received_paise FROM receipt_events WHERE request_key=? AND reference=?',[requestKey,ref]);
  if(duplicate && duplicate.received_paise!==received) throw fail('This reference was already used for a different amount.',409);
  if(duplicate) return {success:true,payKeyOrId:key,status:old===requested?'Paid':'Partial',amount:old/100,refNumber:ref};
  if(received<old) throw fail('Verified receipts cannot be reduced or reset. An audited correction is required.',409);
  const leadKey=inst?.lead_id || link?.lead_id || '';const lead=leadKey ? queryOne('SELECT id,trip_id,status FROM leads WHERE id=? OR trip_id=?',[leadKey,leadKey]) : null;
  if(lead && /lost|cancel/i.test(lead.status)) throw fail('Cannot collect against a cancelled booking.',409);
  const booking=lead ? queryOne('SELECT total_paise FROM booking_snapshots WHERE lead_id=?',[lead.id]) : null;
  const quote=lead && !booking ? queryOne('SELECT final_selling_price FROM quotes WHERE lead_id=? ORDER BY created_at DESC LIMIT 1',[lead.id]) : null;
  const limit=booking?.total_paise ?? (quote ? moneyPaise(quote.final_selling_price) : null);
  const delta=received-old;
  if(lead && limit===null) throw fail('Save a priced quotation before collecting payment.');
  if(lead && collectedPaise(lead.id)+delta>limit) throw fail('This payment would exceed the booking balance.',409);
  const status=received===requested?'Paid':'Partial';const now=new Date().toISOString();const paymentMode=mode || 'Bank Transfer';
  const db=getDb();if(!externalTransaction)db.run('BEGIN');
  try {
    if(old>0 && !queryOne('SELECT id FROM receipt_events WHERE request_key=?',[requestKey])) db.run('INSERT INTO receipt_events(id,request_key,lead_id,amount_paise,received_paise,reference,actor,created_at) VALUES(?,?,?,?,?,?,?,?)',[randomUUID(),requestKey,lead?.id || '',old,old,'legacy-opening','legacy-migration',now]);
    if(delta>0)db.run('INSERT INTO receipt_events(id,request_key,lead_id,amount_paise,received_paise,reference,actor,created_at) VALUES(?,?,?,?,?,?,?,?)',[randomUUID(),requestKey,lead?.id || '',delta,received,ref,actor,now]);
    const paid=received/100;
    if(inst)db.run('UPDATE payment_installments SET payment_status=?,paid_amount=?,paid_at=?,payment_mode=?,transaction_ref=?,comments=?,notes=? WHERE id=?',[status,paid,now,paymentMode,ref,notes || inst.comments || '',notes || inst.notes || '',inst.id]);
    if(link)db.run('UPDATE payment_links SET status=?,paid_amount=?,paid_at=?,payment_mode=?,transaction_ref=?,comments=?,notes=? WHERE id=?',[status,paid,now,paymentMode,ref,notes || link.comments || '',notes || link.notes || '',link.id]);
    if(inst) db.run('UPDATE ops_customer_installments SET status=?,paid_at=?,payment_mode=?,transaction_ref=? WHERE id=?',[status,now,paymentMode,ref,inst.id]);
    if(delta>0 && lead) db.run('INSERT INTO lead_notes(id,lead_id,text,type,timestamp) VALUES(?,?,?,?,?)',[randomUUID(),lead.id,`Verified receipt: INR ${(delta/100).toFixed(2)} via ${paymentMode}; reference ${ref}`,'Action',now]);
    if(!externalTransaction){db.run('COMMIT');saveDb();}
  } catch(error){if(!externalTransaction)db.run('ROLLBACK');throw error;}
  return {success:true,payKeyOrId:key,status,amount:received/100,refNumber:ref};
}
