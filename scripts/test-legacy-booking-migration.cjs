const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert/strict');const{pathToFileURL}=require('url');const root=path.resolve(__dirname,'..');
(async()=>{
 const runtime=fs.mkdtempSync(path.join(os.tmpdir(),'kingsland-legacy-'));process.chdir(runtime);process.env.DATABASE_PATH=path.join(runtime,'legacy.db');process.env.BACKUP_PATH=path.join(runtime,'backups');for(const key of ['SUPABASE_URL','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_API_KEY','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_KEY'])process.env[key]='';
 const load=file=>import(pathToFileURL(path.join(root,file)).href);const db=await load('server/db/connection.ts');await db.initDb();const {initializeDatabase}=await load('server/db/schema.ts');initializeDatabase();
 // Replace an empty test table only, to reproduce the actual previous deployment layout.
 db.execSql('DROP TABLE booking_snapshots');
 db.execSql('CREATE TABLE booking_snapshots(lead_id TEXT PRIMARY KEY,quote_id TEXT NOT NULL,total_minor INTEGER NOT NULL,snapshot_json TEXT NOT NULL,accepted_by TEXT NOT NULL,accepted_at TEXT NOT NULL)');
 for(const id of ['legacy-saved','legacy-backfill','new-accept']) {db.runQuery('INSERT INTO leads(id,trip_id,name,status) VALUES(?,?,?,?)',[id,'QA-'+id,'[QA] Legacy Migration','Closed Won']);db.runQuery('INSERT INTO quotes(id,lead_id,final_selling_price) VALUES(?,?,?)',['q-'+id,id,9999]);}
 const original={lead_id:'legacy-saved',quote_id:'q-legacy-saved',total_minor:123456,snapshot_json:'{"acceptedPrice":1234.56,"immutable":"original"}',accepted_by:'legacy-admin',accepted_at:'2026-01-01T00:00:00.000Z'};
 db.runQuery('INSERT INTO booking_snapshots VALUES(?,?,?,?,?,?)',Object.values(original));
 db.runQuery('INSERT INTO ops_customers(id,booking_id,name,total_amount) VALUES(?,?,?,?)',['cust-legacy-saved','QA-legacy-saved','[QA] Legacy Existing',9999]);
 db.runQuery('INSERT INTO ops_customers(id,booking_id,name,total_amount) VALUES(?,?,?,?)',['cust-legacy-backfill','QA-legacy-backfill','[QA] Legacy Backfill',987.65]);
 db.execSql('CREATE TABLE qa_size_fixture(data BLOB)');db.runQuery('INSERT INTO qa_size_fixture VALUES(zeroblob(?))',[26*1024*1024]);
 fs.mkdirSync(path.join(root,'tmp'),{recursive:true});const fixture=path.join(root,'tmp/legacy-startup-fixture.db');fs.writeFileSync(fixture,db.getDb().export());
 const start=Date.now();initializeDatabase();const elapsed=Date.now()-start;
 const migrated=db.queryOne('SELECT * FROM booking_snapshots WHERE lead_id=?',['legacy-saved']);for(const[key,value]of Object.entries(original))assert.equal(migrated[key],value,'Preserve original '+key);assert.equal(migrated.total_paise,123456);assert.equal(migrated.quote_json,original.snapshot_json);
 const backfill=db.queryOne('SELECT * FROM booking_snapshots WHERE lead_id=?',['legacy-backfill']);assert.equal(backfill.total_paise,98765);assert.equal(backfill.total_minor,98765);assert.equal(backfill.snapshot_json,backfill.quote_json);
 (await load('server/services/bookingAcceptance.ts')).acceptBookingQuote('new-accept','q-new-accept','qa-admin');const accepted=db.queryOne('SELECT * FROM booking_snapshots WHERE lead_id=?',['new-accept']);assert.equal(accepted.total_paise,999900);assert.equal(accepted.total_minor,999900);assert.equal(accepted.quote_json,accepted.snapshot_json);
 initializeDatabase();assert.equal(db.queryOne('SELECT COUNT(*) AS count FROM booking_snapshots').count,3);
 assert.equal(db.queryOne('SELECT length(data) AS bytes FROM qa_size_fixture').bytes,26*1024*1024);
 console.log(`PASS: legacy total_minor/snapshot_json migration; original rows unchanged; backfill and new acceptance satisfy legacy NOT NULL columns; repeat migration; 26 MB data retained. Migration ${elapsed}ms.`);
 console.log('Legacy startup fixture: '+fixture);
})().catch(error=>{console.error(error);process.exitCode=1;});
