import { assertPaymentLinkActive } from './paymentExpiry';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { getDb, queryOne, runQuery, saveDb } from '../db/connection';
import { getPaymentSettings } from '../controllers/paymentsController';
import { collectedPaise, moneyPaise, recordReceipt } from './receipts';
const fail=(message:string,status=400)=>Object.assign(new Error(message),{status});
const pendingOrders=new Map<string,Promise<any>>();
function credentials(){const config=getPaymentSettings();config.key_id=String(config.key_id || '').trim();config.key_secret=String(config.key_secret || '').trim();if(!config.key_id || !config.key_secret)throw fail('Razorpay is not configured. Contact your travel expert.',503);return {keyId:config.key_id,secret:config.key_secret};}
async function razorpay(path:string,method='GET',body?:any){
 const config=credentials();let response:Response;
 try{response=await fetch('https://api.razorpay.com/v1/'+path,{method,headers:{Authorization:'Basic '+Buffer.from(config.keyId+':'+config.secret).toString('base64'),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});}catch{throw fail('Razorpay could not be reached. Please retry; do not make a second payment if your bank was already debited.',502);}
 const data=await response.json().catch(()=>null);
 if(!response.ok || !data)throw fail(response.status===401?'Razorpay rejected the saved credentials. Ask your travel expert to check payment settings.':'Razorpay could not complete this request. Please retry or contact your travel expert.',502);
 return data;
}
function context(payKey:string){
 if(typeof payKey!=='string' || !payKey || payKey.length>180)throw fail('Invalid payment link.');
 const inst=queryOne('SELECT * FROM payment_installments WHERE pay_key=?',[payKey]);
 const link=queryOne('SELECT * FROM payment_links WHERE pay_key=?',[payKey]);
 if(!inst && !link)throw fail('Payment request not found.',404);
 if(link?.status==='Cancelled')throw fail('This payment request was cancelled.',409);
 const requested=moneyPaise(inst?.amount ?? link.net_amount),paid=Math.max(moneyPaise(inst?.paid_amount || 0),moneyPaise(link?.paid_amount || 0));
 const leadKey=inst?.lead_id || link?.lead_id;
 const lead=leadKey ? queryOne('SELECT id,status FROM leads WHERE id=? OR trip_id=?',[leadKey,leadKey]) : null;
 if(lead && /cancel|lost/i.test(lead.status))throw fail('This booking was cancelled. Contact your travel expert.',409);
 let limit:number|null=null;
 if(lead){const booking=queryOne('SELECT total_paise FROM booking_snapshots WHERE lead_id=?',[lead.id]);const quote=queryOne('SELECT final_selling_price FROM quotes WHERE lead_id=? ORDER BY created_at DESC LIMIT 1',[lead.id]);limit=booking?.total_paise ?? (quote?moneyPaise(quote.final_selling_price):0);}
 return {requested,paid,remaining:Math.max(0,requested-paid),leadId:lead?.id || '',available:lead ? Math.max(0,Number(limit)-collectedPaise(lead.id)) : requested-paid,customerName:link?.customer_name || '',packageName:link?.package_name || inst?.title || 'Travel booking'};
}
function checkout(order:any){return {orderId:order.order_id,keyId:order.key_id,currency:'INR',principalPaise:order.principal_paise,feePaise:order.fee_paise,totalPaise:order.total_paise};}
export async function createRazorpayOrder(payKey:string,expectedPrincipalPaise?:number){
 if(pendingOrders.has(payKey))return pendingOrders.get(payKey);
 const work=(async()=>{
  assertPaymentLinkActive(payKey);
  const config=credentials(),current=context(payKey);
  if(expectedPrincipalPaise!==undefined && expectedPrincipalPaise!==current.remaining)throw fail('The payment amount changed. Reload the payment page before proceeding.',409);
  if(current.remaining<=0)throw fail('This payment request is already paid.',409);
  if(current.remaining>current.available)throw fail('This request exceeds the remaining booking balance. Ask your travel expert for an updated link.',409);
  if(queryOne("SELECT order_id FROM razorpay_orders WHERE pay_key=? AND status='reconciliation_required' LIMIT 1",[payKey]))throw fail('An earlier card payment needs reconciliation. Contact your travel expert before paying again.',409);
  const existing=queryOne("SELECT * FROM razorpay_orders WHERE pay_key=? AND key_id=? AND status='created' ORDER BY created_at DESC LIMIT 1",[payKey,config.keyId]);
  if(existing){
    const reconciled=await reconcileRazorpayOrder(payKey,existing.order_id);
    if(reconciled.status==='paid')return reconciled;
    if(existing.principal_paise!==current.remaining || existing.baseline_paid_paise!==current.paid || existing.request_paise!==current.requested)throw fail('An earlier checkout has a different booking balance. Ask your travel expert to review it before starting another payment.',409);
    return checkout(existing);
  }
  const fee=Math.round(current.remaining*25/1000),total=current.remaining+fee;
  if(!Number.isSafeInteger(total))throw fail('Invalid payment amount.');
  const receipt='kl_'+randomUUID().replace(/-/g,'');
  const remote=await razorpay('orders','POST',{amount:total,currency:'INR',receipt,notes:{payment_request:payKey,principal_paise:String(current.remaining),card_fee_paise:String(fee)}});
  if(!/^order_[A-Za-z0-9]+$/.test(remote.id || '') || remote.amount!==total || remote.currency!=='INR')throw fail('Razorpay returned an unexpected order. No payment was started.',502);
  const order={order_id:remote.id,pay_key:payKey,principal_paise:current.remaining,fee_paise:fee,total_paise:total,request_paise:current.requested,baseline_paid_paise:current.paid,key_id:config.keyId};
  runQuery("INSERT INTO razorpay_orders(order_id,pay_key,principal_paise,fee_paise,total_paise,request_paise,baseline_paid_paise,key_id,status,created_at) VALUES(?,?,?,?,?,?,?,?,'created',?)",[order.order_id,payKey,order.principal_paise,fee,total,current.requested,current.paid,config.keyId,new Date().toISOString()]);
  return checkout(order);
 })();pendingOrders.set(payKey,work);try{return await work;}finally{pendingOrders.delete(payKey);}
}
function savedOrder(payKey:string,orderId:string){if(!/^order_[A-Za-z0-9]+$/.test(orderId || ''))throw fail('Invalid Razorpay order.');const order=queryOne('SELECT * FROM razorpay_orders WHERE order_id=? AND pay_key=?',[orderId,payKey]);if(!order)throw fail('Payment order does not belong to this link.',404);if(order.key_id!==credentials().keyId)throw fail('Payment settings changed. Contact your travel expert to reconcile this payment.',409);return order;}
function result(order:any){return {...checkout(order),status:order.status,paymentId:order.payment_id || ''};}
function checkBalance(order:any){const current=context(order.pay_key);if(current.requested!==order.request_paise || current.paid!==order.baseline_paid_paise || current.remaining!==order.principal_paise || current.available<order.principal_paise)throw fail('The booking balance changed after checkout started. Contact your travel expert before paying again.',409);return current;}
async function settle(order:any,payment:any,allowCapture:boolean){
 const latest=queryOne('SELECT * FROM razorpay_orders WHERE order_id=?',[order.order_id]);if(latest.status==='paid')return result(latest);
 if(!/^pay_[A-Za-z0-9]+$/.test(payment?.id || '') || payment.order_id!==order.order_id || payment.amount!==order.total_paise || payment.currency!=='INR' || payment.method!=='card')throw fail('Razorpay payment details do not match this card order.',409);
 if(payment.status==='authorized' && allowCapture){assertPaymentLinkActive(order.pay_key);checkBalance(order);payment=await razorpay('payments/'+payment.id+'/capture','POST',{amount:order.total_paise,currency:'INR'});}
 if(payment.status!=='captured')return {...result(latest),status:'pending'};
 if(payment.order_id!==order.order_id || payment.amount!==order.total_paise || payment.currency!=='INR' || payment.method!=='card' || payment.captured!==true)throw fail('Payment capture has not been verified.',409);
 const db=getDb();db.run('BEGIN');
 try {
  const fresh=queryOne('SELECT * FROM razorpay_orders WHERE order_id=?',[order.order_id]);
  if(fresh.status==='paid'){db.run('COMMIT');return result(fresh);}
  const current=checkBalance(fresh);
  recordReceipt(order.pay_key,(current.paid+order.principal_paise)/100,payment.id,'Razorpay',`Verified Razorpay card payment. Booking: INR ${(order.principal_paise/100).toFixed(2)}; card charge: INR ${(order.fee_paise/100).toFixed(2)}; charged total: INR ${(order.total_paise/100).toFixed(2)}.`,'razorpay',true);
  db.run("UPDATE razorpay_orders SET status='paid',payment_id=?,paid_at=? WHERE order_id=?",[payment.id,new Date().toISOString(),order.order_id]);db.run('COMMIT');saveDb();return result(queryOne('SELECT * FROM razorpay_orders WHERE order_id=?',[order.order_id]));
 }catch(error){db.run('ROLLBACK');runQuery("UPDATE razorpay_orders SET status='reconciliation_required',payment_id=? WHERE order_id=? AND status!='paid'",[payment.id,order.order_id]);throw fail('Razorpay captured your payment, but the booking balance needs reconciliation. Contact your travel expert with payment reference '+payment.id+'. Do not pay again.',409);}
}
export async function verifyRazorpayPayment(data:{payKey:string;razorpay_order_id:string;razorpay_payment_id:string;razorpay_signature:string}){
 const order=savedOrder(data.payKey,data.razorpay_order_id);
 if(!/^pay_[A-Za-z0-9]+$/.test(data.razorpay_payment_id || '') || !/^[a-f0-9]{64}$/i.test(data.razorpay_signature || ''))throw fail('Payment signature is invalid.',400);
 const expected=createHmac('sha256',credentials().secret).update(order.order_id+'|'+data.razorpay_payment_id).digest();
 if(!timingSafeEqual(expected,Buffer.from(data.razorpay_signature,'hex')))throw fail('Payment signature verification failed. Contact your travel expert if you were debited.',400);
 if(order.status==='paid')return result(order);
 const payment=await razorpay('payments/'+data.razorpay_payment_id);
 return settle(order,payment,true);
}
export async function reconcileRazorpayOrder(payKey:string,orderId?:string){
 if(typeof payKey!=='string' || !payKey || payKey.length>180)throw fail('Invalid payment link.');
 if(!orderId){const latest=queryOne('SELECT order_id FROM razorpay_orders WHERE pay_key=? ORDER BY created_at DESC LIMIT 1',[payKey]);if(!latest)return {status:'none'};orderId=latest.order_id;}
 const order=savedOrder(payKey,orderId!);if(order.status==='paid' || order.status==='reconciliation_required')return result(order);
 const response=await razorpay('orders/'+order.order_id+'/payments');
 const payment=(response.items || []).find((p:any)=>p.order_id===order.order_id && p.status==='captured');
 return payment ? settle(order,payment,false) : {...result(order),status:'pending'};
}
