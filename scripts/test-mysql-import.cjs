if(!process.env.MYSQL_TEST_CONFIG || !process.env.CRM_TEST_BACKUP_PATH)throw new Error('Set MYSQL_TEST_CONFIG and CRM_TEST_BACKUP_PATH for an isolated local test database.');
const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto');
Object.assign(process.env,JSON.parse(fs.readFileSync(process.env.MYSQL_TEST_CONFIG,'utf8')));
if(!['127.0.0.1','localhost'].includes(process.env.MYSQL_HOST) || !process.env.MYSQL_DATABASE.startsWith('crm_migration_'))throw new Error('MySQL tests require a disposable local crm_migration_* database.');
(async()=>{const m=require('../server/db/mysql.ts'),b=require('../server/db/mysqlBackup.ts');await m.initMysql();try{await m.withMysqlConnection(async()=>{
const buffer=fs.readFileSync(process.env.CRM_TEST_BACKUP_PATH);const result=await b.importSqliteIntoMysql(buffer);assert.equal(result.counts.leads,12);assert.equal(result.counts.quotes,13);assert.ok(result.archiveId);console.log('PASS: imported and counted '+Object.keys(result.counts).length+' tables including 12 leads and 13 quotes.');
await m.mysqlRun("INSERT INTO leads(id,trip_id,name) VALUES('qa-restore-retained','QA-RESTORE-RETAINED','Must survive failed import')");
await m.mysqlRun("CREATE TRIGGER qa_fail_restore BEFORE INSERT ON leads FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='QA restore failure'");
try{await assert.rejects(()=>b.importSqliteIntoMysql(buffer),/QA restore failure/);assert.equal((await m.mysqlQuery("SELECT COUNT(*) AS count FROM leads WHERE id='qa-restore-retained'"))[0].count,1);}finally{await m.mysqlRun('DROP TRIGGER IF EXISTS qa_fail_restore');await m.mysqlRun("DELETE FROM leads WHERE id='qa-restore-retained'");}
console.log('PASS: a mid-import SQL failure rolls back replacement and retains prior records.');
const exported=await b.exportMysqlBackup();const SQL=await require('sql.js')(),copy=new SQL.Database(exported);assert.equal(copy.exec('SELECT COUNT(*) FROM leads')[0].values[0][0],12);assert.equal(copy.exec('PRAGMA integrity_check')[0].values[0][0],'ok');copy.close();const archive=await b.readMysqlArchive(result.archiveId);assert.ok(archive.length>100);console.log('PASS: MySQL export produces a healthy portable backup and recovery archive downloads.');
});}finally{await m.closeMysql();}})().catch(e=>{console.error(e);process.exitCode=1;});
