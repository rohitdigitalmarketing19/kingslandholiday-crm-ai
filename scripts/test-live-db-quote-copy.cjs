const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert/strict');const{pathToFileURL}=require('url');const root=path.resolve(__dirname,'..');
(async()=>{const runtime=fs.mkdtempSync(path.join(os.tmpdir(),'crm-edit-'));process.chdir(runtime);process.env.DATABASE_PATH=path.join(runtime,'test.db');process.env.BACKUP_PATH=path.join(runtime,'backups');for(const key of ['SUPABASE_URL','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_API_KEY','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_KEY'])process.env[key]='';
const load=async f=>{switch(f){case 'server/db/connection.ts':return require('../server/db/connection.ts');case 'server/db/schema.ts':return require('../server/db/schema.ts');case 'server/controllers/leadsController.ts':return require('../server/controllers/leadsController.ts');case 'server/controllers/quotesController.ts':return require('../server/controllers/quotesController.ts');case 'server/services/bookingAcceptance.ts':return require('../server/services/bookingAcceptance.ts');}};fs.copyFileSync(path.join(root,'kingsland.db'),process.env.DATABASE_PATH);const db=await load('server/db/connection.ts');await db.initDb();(await load('server/db/schema.ts')).initializeDatabase();
const leads=await load('server/controllers/leadsController.ts'),quotes=await load('server/controllers/quotesController.ts');

const target=db.queryOne("SELECT q.id,q.lead_id FROM quotes q JOIN booking_snapshots b ON b.quote_id=q.id WHERE lower(q.package_title) LIKE '%jodhpur%' LIMIT 1");assert.ok(target,'Find affected saved quotation');
const lead=leads.getLeadById(target.lead_id),quote=lead.quotes.find(q=>q.id===target.id);
const receipts=JSON.stringify(db.queryAll('SELECT * FROM receipt_events'));
quotes.updateQuote(lead.id,quote.id,quote,'qa-copy-verification');
assert.equal(JSON.stringify(db.queryAll('SELECT * FROM receipt_events')),receipts);
assert.throws(()=>db.runQuery('UPDATE booking_snapshots SET total_paise=total_paise+1 WHERE lead_id=?',[lead.id]),/audited revision/);
console.log('PASS: affected quotation saves against an isolated copy of current database; receipts unchanged; unaudited snapshot update remains blocked.');
})().catch(e=>{console.error(e);process.exitCode=1;});
