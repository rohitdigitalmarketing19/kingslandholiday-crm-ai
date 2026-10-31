const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert/strict');const{pathToFileURL}=require('url');const root=path.resolve(__dirname,'..');
(async()=>{const runtime=fs.mkdtempSync(path.join(os.tmpdir(),'crm-edit-'));process.chdir(runtime);process.env.DATABASE_PATH=path.join(runtime,'test.db');process.env.BACKUP_PATH=path.join(runtime,'backups');for(const key of ['SUPABASE_URL','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_API_KEY','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_KEY'])process.env[key]='';
const load=async f=>{switch(f){case 'server/db/connection.ts':return require('../server/db/connection.ts');case 'server/db/schema.ts':return require('../server/db/schema.ts');case 'server/controllers/leadsController.ts':return require('../server/controllers/leadsController.ts');case 'server/controllers/quotesController.ts':return require('../server/controllers/quotesController.ts');case 'server/services/bookingAcceptance.ts':return require('../server/services/bookingAcceptance.ts');}};const db=await load('server/db/connection.ts');await db.initDb();(await load('server/db/schema.ts')).initializeDatabase();
const leads=await load('server/controllers/leadsController.ts'),quotes=await load('server/controllers/quotesController.ts');

const request={requestId:'request-1234567890',name:'QA inquiry',destination:'Goa'};
const start=Date.now();const first=leads.createLead(request,'qa');const elapsed=Date.now()-start;
for(let i=0;i<5;i++) assert.equal(leads.createLead(request,'qa').id,first.id);
assert.equal(db.queryOne('SELECT COUNT(*) AS count FROM leads').count,1);
assert.throws(()=>leads.createLead({...request,name:'Changed'},'qa'),e=>e.status===409);
const second=leads.createLead({...request,requestId:'request-0987654321'},'qa');assert.notEqual(first.id,second.id);
const otherActor=leads.createLead(request,'other-actor');assert.notEqual(first.id,otherActor.id);
assert.equal(db.queryOne('SELECT COUNT(*) AS count FROM leads').count,3);
console.log('PASS: repeated save returns one lead, changed request rejected, new inquiries allowed, actors isolated. Isolated save '+elapsed+'ms.');
})().catch(e=>{console.error(e);process.exitCode=1;});
