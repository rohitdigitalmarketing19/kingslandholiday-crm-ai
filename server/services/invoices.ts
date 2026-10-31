import { randomUUID } from 'crypto';
import { queryOne, queryAll, getDb, saveDb } from '../db/connection';
import { paymentOverview } from './paymentOverview';
import { moneyPaise } from './receipts';
const fail=(message:string,status=400)=>Object.assign(new Error(message),{status});
export function invoiceData(customerId:string) {
 const customer=queryOne('SELECT * FROM ops_customers WHERE id=? OR booking_id=?',[customerId,customerId]);
 if(!customer)throw fail('Customer not found.',404);
 const lead=queryOne('SELECT * FROM leads WHERE id=? OR trip_id=?',[customer.booking_id,customer.booking_id]) || queryOne('SELECT * FROM leads WHERE id=?',[customer.id.replace(/^cust-/, '')]);
 if(!lead)throw fail('This customer is not linked to a booking. Correct the booking association before creating an invoice.',409);
 const booking=queryOne('SELECT * FROM booking_snapshots WHERE lead_id=?',[lead.id]);
 if(!booking)throw fail('An accepted booking is required before creating an invoice.',409);
 const overview=paymentOverview(lead.id);
 const installments=overview.requests.filter(r=>r.kind==='Installment').map((r:any,index:number)=>({id:r.id,num:index+1,title:r.title,amount:Number(r.amount),dueDate:r.due_date || '',status:r.status==='Paid'?'PAID':Number(r.paid_amount)>0?'PARTIAL':'UPCOMING',paidAt:r.paid_at || '',paymentMode:r.payment_mode || '',transactionRef:r.transaction_ref || ''}));
 const payments=overview.receipts.map((r:any)=>({id:r.id,date:r.created_at,mode:r.actor==='razorpay'?'Razorpay card':'Verified receipt',utrNumber:r.reference,amount:r.amount_paise/100,status:'Verified'}));
 const paid=overview.bookings[0]?.collected_paise || 0;
 const pending=installments.filter(i=>i.status!=='PAID');if(pending[0] && pending[0].status!=='PARTIAL')pending[0].status='DUE NOW';
 return {leadId:lead.id,bookingId:lead.trip_id,packageTotal:booking.total_paise/100,totalPaidAmount:paid/100,balanceDue:Math.max(0,booking.total_paise-paid)/100,installments,paymentsList:payments,nextDueDate:pending[0]?.dueDate || '',pkgDepositStatus:paid===0?'AWAITING PAYMENT':paid>=booking.total_paise?'PAID IN FULL':'PART PAYMENT RECEIVED'};
}
export function listInvoices(customerId:string){const data=invoiceData(customerId);return queryAll('SELECT id,invoice_number,document_type,created_at FROM invoice_documents WHERE lead_id=? ORDER BY created_at DESC',[data.leadId]);}
export function getInvoice(id:string){const row=queryOne('SELECT * FROM invoice_documents WHERE id=?',[id]);if(!row)throw fail('Invoice not found.',404);return {...row,fields:JSON.parse(row.snapshot_json)};}
export function issueInvoice(input:any,actor:string){
 if(!['tax','package_description','package_customer'].includes(input.documentType))throw fail('Choose an invoice template.');
 if(!/^[a-f0-9-]{36}$/i.test(input.requestId || ''))throw fail('A valid invoice request ID is required.');
 const prior=queryOne('SELECT id,customer_id,document_type FROM invoice_documents WHERE request_id=?',[input.requestId]);
 if(prior){if(prior.customer_id!==input.customerId || prior.document_type!==input.documentType)throw fail('Invoice request was already used.',409);return getInvoice(prior.id);}
 const data=invoiceData(input.customerId), f=JSON.parse(JSON.stringify(input.fields || {}));
 for(const key of ['companyName','companyAddress','companyCity','customerName','placeOfSupply'])if(typeof f[key]!=='string' || !f[key].trim())throw fail('Complete company name, registered address, customer name and place of supply.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(f.invoiceDate || '') || !Number.isFinite(Date.parse(f.invoiceDate)))throw fail('Enter a valid invoice date.');
 if(input.documentType==='tax'){
  if(!/^[0-9]{2}[A-Z0-9]{13}$/.test(f.companyGstin || '') || f.companyGstin==='08AABCK1234F1Z9')throw fail('Enter your verified company GSTIN in Company details before issuing a tax invoice.');
  if(!['cgst_sgst','igst'].includes(f.taxMode))throw fail('Choose a tax mode.');
  if(!Array.isArray(f.taxItems) || !f.taxItems.length)throw fail('Add at least one tax line.');
  let total=0;for(const item of f.taxItems){const value=moneyPaise(item.taxableValue);if(!item.description?.trim() || !/^\d{6}$/.test(item.sacCode || ''))throw fail('Each tax line needs a description and six-digit SAC.');total+=value;for(const rate of ['cgstRate','sgstRate','igstRate'])if(!Number.isFinite(item[rate]) || item[rate]<0 || item[rate]>100)throw fail('Tax rates must be between 0 and 100.');}
  if(total<=0)throw fail('Enter the actual taxable service amounts. No commission or tax allocation is assumed.');
 }
 if(input.documentType==='package_description'){
  if(!Array.isArray(f.pkgDescItems) || !f.pkgDescItems.length)throw fail('Add package line items.');
  const total=f.pkgDescItems.reduce((sum:number,item:any)=>sum+moneyPaise(item.price),0);
  if(total!==moneyPaise(data.packageTotal))throw fail('Package line items must equal the accepted booking total.');
 }
 const snapshot={...f,...data,tripId:data.bookingId};
 const year=String(new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata',year:'numeric'}));
 const db=getDb();db.run('BEGIN');
 try{
  const sequence=Number(queryOne('SELECT last_number FROM invoice_sequences WHERE year=?',[year])?.last_number || 0)+1;
  db.run('INSERT OR REPLACE INTO invoice_sequences(year,last_number) VALUES(?,?)',[year,sequence]);
  const id=randomUUID(),number='INV-'+year+'-'+String(sequence).padStart(6,'0');snapshot.invoiceNo=number;
  db.run('INSERT INTO invoice_documents(id,invoice_number,document_type,customer_id,lead_id,request_id,snapshot_json,actor,created_at) VALUES(?,?,?,?,?,?,?,?,?)',[id,number,input.documentType,input.customerId,data.leadId,input.requestId,JSON.stringify(snapshot),actor,new Date().toISOString()]);
  db.run('COMMIT');saveDb();return getInvoice(id);
 }catch(error){db.run('ROLLBACK');throw error;}
}
