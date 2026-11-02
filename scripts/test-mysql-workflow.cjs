if(!process.env.MYSQL_TEST_CONFIG || !process.env.CRM_TEST_BACKUP_PATH)throw new Error('Set MYSQL_TEST_CONFIG and CRM_TEST_BACKUP_PATH for an isolated local test database.');
const fs=require('fs'),assert=require('assert/strict'),path=require('path');Object.assign(process.env,JSON.parse(fs.readFileSync(process.env.MYSQL_TEST_CONFIG,'utf8')));
if(!['127.0.0.1','localhost'].includes(process.env.MYSQL_HOST) || !process.env.MYSQL_DATABASE.startsWith('crm_migration_'))throw new Error('MySQL tests require a disposable local crm_migration_* database.');
(async()=>{const c=require('../server/db/connection.ts'),m=require('../server/db/mysql.ts');await c.initDb();await require('../server/db/schema.ts').initializeDatabase();const auth=require('../server/middleware/auth.ts');let cookie,key1,key2;await m.withMysqlConnection(()=>require('../server/db/mysqlBackup.ts').importSqliteIntoMysql(fs.readFileSync(process.env.CRM_TEST_BACKUP_PATH)));
try{
await m.withMysqlConnection(async()=>{
await c.runQuery("INSERT INTO users(id,name,email,role,status,access_level) VALUES('qa-mysql-admin','QA MySQL','qa-mysql@example.test','Admin','Active','Editor')");await auth.createSession('qa-mysql-admin',{cookie:(name,value)=>cookie=name+'='+value});
const leads=require('../server/controllers/leadsController.ts'),quotes=require('../server/controllers/quotesController.ts'),payments=require('../server/controllers/paymentsController.ts');
await leads.createLead({id:'qa-money-lead',tripId:'QA-MYSQL-MONEY',name:'MySQL financial QA',assignedTo:'qa-mysql-admin'});await quotes.createQuote('qa-money-lead',{id:'qa-money-quote',finalSellingPrice:1000});await require('../server/services/bookingAcceptance.ts').acceptBookingQuote('qa-money-lead','qa-money-quote','qa');
key1=(await payments.createPaymentLink({leadId:'qa-money-lead',amount:800,customerName:'QA',packageName:'QA A'})).pay_key;key2=(await payments.createPaymentLink({leadId:'qa-money-lead',amount:800,customerName:'QA',packageName:'QA B'})).pay_key;
});
const express=require('express'),app=require('../server/utils/asyncRouter.ts').asyncRouter(express());app.use(express.json({limit:'50mb'}));app.use('/api',m.mysqlRequestScope);app.use('/api',auth.apiAuthorization);app.use('/api/payments',require('../server/routes/payments.ts').default);app.use('/api/leads',require('../server/routes/leads.ts').default);app.use('/api/settings',require('../server/routes/settings.ts').default);app.use(require('../server/middleware/errorHandler.ts').errorHandler);const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
try{const base='http://127.0.0.1:'+server.address().port+'/api';
assert.equal((await fetch(base+'/leads')).status,401);
const headers={Cookie:cookie,'Content-Type':'application/json'};
const confirmations=await Promise.all([key1,key2].map((key,index)=>fetch(base+'/payments/confirm',{method:'POST',headers,body:JSON.stringify({payKey:key,amount:800,refNumber:'MYSQL-QA-'+index,paymentMode:'UPI'})})));
assert.deepEqual(confirmations.map(r=>r.status).sort(),[200,409],'Concurrent requests cannot over-collect');
const winner=confirmations[0].status===200?key1:key2,reference=confirmations[0].status===200?'MYSQL-QA-0':'MYSQL-QA-1';assert.equal((await fetch(base+'/payments/confirm',{method:'POST',headers,body:JSON.stringify({payKey:winner,amount:800,refNumber:reference,paymentMode:'UPI'})})).status,200,'Receipt retries are idempotent');
await m.withMysqlConnection(async()=>{
assert.equal((await require('../server/services/receipts.ts').collectedPaise('qa-money-lead')),80000);
assert.equal((await c.queryOne('SELECT COUNT(*) AS count FROM receipt_events WHERE lead_id=?',['qa-money-lead'])).count,1);
const quotes=require('../server/controllers/quotesController.ts');await quotes.updateQuote('qa-money-lead','qa-money-quote',{finalSellingPrice:1100},'qa');assert.equal((await c.queryOne('SELECT total_paise FROM booking_snapshots WHERE lead_id=?',['qa-money-lead'])).total_paise,110000);
await assert.rejects(()=>c.runQuery('UPDATE booking_snapshots SET total_paise=2 WHERE lead_id=?',['qa-money-lead']),/audited revision/);
});
const overview=await fetch(base+'/payments/overview?leadId=qa-money-lead',{headers});assert.equal(overview.status,200);assert.equal((await overview.json()).bookings[0].collected_paise,80000);
const exported=await fetch(base+'/settings/backup/download',{headers:{Cookie:cookie}});assert.equal(exported.status,200);const bytes=Buffer.from(await exported.arrayBuffer()),SQL=await require('sql.js')(),backup=new SQL.Database(bytes);assert.equal(backup.exec('PRAGMA integrity_check')[0].values[0][0],'ok');assert.equal(backup.exec("SELECT total_paise FROM booking_snapshots WHERE lead_id='qa-money-lead'")[0].values[0][0],110000);assert.ok(backup.exec('PRAGMA table_info(leads)')[0].values.find(row=>row[1]==='id')[5]);backup.close();
console.log('PASS: MySQL authenticated APIs, parallel over-collection rejection, receipt replay, accepted-quote revision, audited snapshot protection, dashboard balance, and portable download with primary keys.');
}finally{await new Promise(r=>server.close(r));}
}finally{await m.closeMysql();}})().catch(e=>{console.error(e);process.exitCode=1;});
