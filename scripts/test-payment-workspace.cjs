const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
process.chdir(fs.mkdtempSync(path.join(os.tmpdir(),'crm-payment-')));process.env.DATABASE_PATH=path.resolve('test.db');process.env.BACKUP_PATH=path.resolve('backups');for(const k of ['SUPABASE_URL','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_API_KEY','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_KEY'])process.env[k]='';
const db=require('../server/db/connection.ts');await db.initDb();require('../server/db/schema.ts').initializeDatabase();const leads=require('../server/controllers/leadsController.ts'),quotes=require('../server/controllers/quotesController.ts'),payments=require('../server/controllers/paymentsController.ts'),{recordReceipt}=require('../server/services/receipts.ts'),{paymentOverview}=require('../server/services/paymentOverview.ts');
leads.createLead({id:'qa-lead',name:'QA Customer',destination:'Goa',tripId:'QA-1001',assignedTo:'owner-a'});quotes.createQuote('qa-lead',{id:'qa-quote',finalSellingPrice:1000});require('../server/services/bookingAcceptance.ts').acceptBookingQuote('qa-lead','qa-quote','qa');
let rows=payments.saveInstallmentSchedule('qa-lead',[{title:'Deposit',amount:400,due_date:'2026-10-01'},{title:'Balance',amount:600,due_date:'2026-11-20'}]);assert.equal(rows.length,2);
const key=rows[0].pay_key;recordReceipt(key,100,'QA-PARTIAL','UPI','Verified','qa');assert.equal(paymentOverview().requests.length,2,'Do not double count installment links');assert.equal(paymentOverview().bookings[0].collected_paise,10000);assert.equal(paymentOverview(undefined,['owner-b']).requests.length,0);
recordReceipt(key,100,'QA-PARTIAL','UPI','Verified','qa');assert.equal(db.queryOne('SELECT COUNT(*) AS count FROM receipt_events').count,1);
const submission=payments.createPaymentSubmission({payKey:key,leadId:'qa-lead',customerName:'QA Customer',mobile:'',packageName:'Deposit',amountPaid:300,utrNumber:'QA-BALANCE',paymentMode:'Bank Transfer'});payments.updatePaymentVerificationStatus(submission.id,'Approved','qa');assert.equal(db.queryOne('SELECT verification_status FROM payment_submissions WHERE id=?',[submission.id]).verification_status,'Approved');assert.equal(paymentOverview().bookings[0].collected_paise,40000);
assert.throws(()=>payments.createPaymentLink({leadId:'qa-lead',amount:-1,customerName:'QA',packageName:'Bad'}),/valid non-negative/);assert.throws(()=>payments.createPaymentLink({leadId:'qa-lead',amount:601,customerName:'QA',packageName:'Too much'}),/remaining booking balance/);
const oldSecond=rows[1];rows=payments.saveInstallmentSchedule('qa-lead',[rows[0],{title:'New balance',amount:600,due_date:'2026-11-20'}]);assert.equal(db.queryOne('SELECT status FROM payment_links WHERE pay_key=?',[oldSecond.pay_key]).status,'Cancelled');assert.throws(()=>recordReceipt(oldSecond.pay_key,600,'OLD','UPI','','qa'),/cancelled/);
assert.throws(()=>payments.saveInstallmentSchedule('qa-lead',[{amount:1,due_date:''}]),/valid due date/);assert.equal(db.queryOne('SELECT COUNT(*) AS count FROM payment_installments').count,2);
const before=JSON.stringify(db.queryAll('SELECT * FROM payment_installments ORDER BY id'));
db.execSql("CREATE TRIGGER qa_payment_fail BEFORE INSERT ON payment_links WHEN NEW.package_name LIKE 'FAIL%' BEGIN SELECT RAISE(ABORT,'QA failure'); END");
assert.throws(()=>payments.saveInstallmentSchedule('qa-lead',[rows[0],{title:'FAIL',amount:600,due_date:'2026-11-20'}]),/QA failure/);
assert.equal(JSON.stringify(db.queryAll('SELECT * FROM payment_installments ORDER BY id')),before,'Roll back entire schedule on persistence failure');
const standalone=payments.createPaymentLink({amount:100,customerName:'Standalone QA',packageName:'Standalone request'});
const matched=payments.createPaymentSubmission({payKey:standalone.pay_key,customerName:'Standalone QA',mobile:'',packageName:'Standalone request',amountPaid:10,utrNumber:'SAME-BANK-REFERENCE',paymentMode:'UPI'});
recordReceipt(standalone.pay_key,10,'SAME-BANK-REFERENCE','UPI','','qa');const eventCount=db.queryOne('SELECT COUNT(*) AS count FROM receipt_events').count;
payments.updatePaymentVerificationStatus(matched.id,'Approved','qa');assert.equal(db.queryOne('SELECT COUNT(*) AS count FROM receipt_events').count,eventCount,'Approve already recorded proof without counting money twice');
db.runQuery('INSERT INTO users(id,name,email,role,status,access_level,permissions) VALUES(?,?,?,?,?,?,?)',['sales-qa','QA Sales','sales@example.test','Sales','Active','Editor',JSON.stringify(['Payments','Leads'])]);
leads.createLead({id:'other-lead',tripId:'QA-OTHER',name:'Other owner',assignedTo:'owner-a'});
leads.createLead({id:'own-lead',tripId:'QA-OWN',name:'Own customer',assignedTo:'sales-qa'});quotes.createQuote('own-lead',{id:'own-quote',finalSellingPrice:100});
const auth=require('../server/middleware/auth.ts');let token;auth.createSession('sales-qa',{cookie:(name,value)=>token=name+'='+value});
const express=require('express'),app=express();app.use(express.json());app.use('/api',auth.apiAuthorization);app.use('/api/payments',require('../server/routes/payments.ts').default);const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
try {
 const base='http://127.0.0.1:'+server.address().port+'/api/payments';
 assert.equal((await fetch(base+'/overview')).status,401);
 const view=await fetch(base+'/overview',{headers:{Cookie:token}});assert.equal(view.status,200);assert.deepEqual((await view.json()).bookings.map(b=>b.id),['own-lead']);
 assert.equal((await fetch(base+'/overview?leadId=qa-lead',{headers:{Cookie:token}})).status,403);
 const spoof=await fetch(base+'/confirm',{method:'POST',headers:{Cookie:token,'Content-Type':'application/json'},body:JSON.stringify({leadId:'own-lead',payKey:key,amount:400,refNumber:'SPOOF'})});assert.equal(spoof.status,403,'Cannot override payment request ownership with body leadId');
}finally{await new Promise(r=>server.close(r));}
console.log('PASS: scoped dashboard, deduplicated requests, partial receipts, replay protection, proof approval, amount validation, schedule preservation, and retired payment links.');
})().catch(e=>{console.error(e);process.exitCode=1;});
