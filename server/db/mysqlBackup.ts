import initSqlJs from 'sql.js';
import {createHash,randomUUID} from 'crypto';
import {mysqlConnection,mysqlQuery,mysqlRun,mysqlTableSql,initializeMysqlSchema} from './mysql';
import metadata from './mysqlSchema.json';
const quote=(name:string)=>{if(!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name))throw new Error('Unsupported backup identifier.');return '`'+name+'`';};
function sqliteRows(db:any,sql:string){const r=db.exec(sql)[0];return r?r.values.map((v:any[])=>Object.fromEntries(r.columns.map((c:string,i:number)=>[c,v[i]]))):[];}
export async function exportMysqlBackup():Promise<Buffer>{
 const SQL=await initSqlJs(),output=new SQL.Database();
 try{
  output.run('PRAGMA foreign_keys=OFF');
  const tables=await mysqlQuery("SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' AND TABLE_NAME NOT LIKE 'crm\\_%' ORDER BY TABLE_NAME");
  await mysqlRun('BEGIN');
  try{for(const table of tables){
   const columns=await mysqlQuery('SELECT COLUMN_NAME AS name,DATA_TYPE AS type,IS_NULLABLE AS nullable,COLUMN_KEY AS key_type,EXTRA AS extra FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND EXTRA NOT LIKE \'%GENERATED%\' ORDER BY ORDINAL_POSITION',[table.name]);
   const standard=metadata.find(t=>t.name===table.name);
   // Generate a portable SQLite backup including legacy/custom columns too.
   const defs=columns.map((c:any)=>quote(c.name)+' '+(/int|decimal|double|float/.test(c.type)?'NUMERIC':/blob|binary/.test(c.type)?'BLOB':'TEXT'));
   if(standard){output.run(standard.sql);for(const c of columns)if(!standard.columns.some(existing=>existing.name===c.name))output.run('ALTER TABLE '+quote(table.name)+' ADD COLUMN '+quote(c.name)+' '+(/int|decimal|double|float/.test(c.type)?'NUMERIC':'TEXT'));}
   else{const primary=columns.filter((c:any)=>c.key_type==='PRI').map((c:any)=>quote(c.name));if(primary.length)defs.push('PRIMARY KEY('+primary.join(',')+')');output.run('CREATE TABLE '+quote(table.name)+' ('+defs.join(',')+')');}
   const rows=await mysqlQuery('SELECT * FROM '+quote(table.name));
   const statement=output.prepare('INSERT INTO '+quote(table.name)+' ('+columns.map((c:any)=>quote(c.name)).join(',')+') VALUES ('+columns.map(()=>'?').join(',')+')');
   for(const row of rows)statement.run(columns.map((c:any)=>row[c.name]??null));statement.free();
  }await mysqlRun('COMMIT');}catch(error){await mysqlRun('ROLLBACK');throw error;}
  return Buffer.from(output.export());
 }finally{output.close();}
}
export async function archiveMysqlBackup(buffer:Buffer){
 await mysqlRun('CREATE TABLE IF NOT EXISTS crm_restore_archives(id VARCHAR(64) PRIMARY KEY,created_at VARCHAR(40) NOT NULL,sha256 VARCHAR(64) NOT NULL,bytes BIGINT NOT NULL) ENGINE=InnoDB');
 await mysqlRun('CREATE TABLE IF NOT EXISTS crm_restore_chunks(archive_id VARCHAR(64) NOT NULL,chunk_no BIGINT NOT NULL,payload LONGBLOB NOT NULL,PRIMARY KEY(archive_id,chunk_no)) ENGINE=InnoDB');
 const id=randomUUID();await mysqlRun('BEGIN');
 try{await mysqlRun('INSERT INTO crm_restore_archives(id,created_at,sha256,bytes) VALUES(?,?,?,?)',[id,new Date().toISOString(),createHash('sha256').update(buffer).digest('hex'),buffer.length]);
 for(let offset=0,index=0;offset<buffer.length;offset+=1024*1024,index++)await mysqlRun('INSERT INTO crm_restore_chunks(archive_id,chunk_no,payload) VALUES(?,?,?)',[id,index,buffer.subarray(offset,offset+1024*1024)]);
 await mysqlRun('COMMIT');return id;
 }catch(error){await mysqlRun('ROLLBACK');throw error;}
}
export async function listMysqlArchives(){try{return await mysqlQuery('SELECT id,created_at,bytes FROM crm_restore_archives ORDER BY created_at DESC');}catch(error:any){if(error.code==='ER_NO_SUCH_TABLE')return [];throw error;}}
export async function readMysqlArchive(id:string){
 const records=await mysqlQuery('SELECT sha256 FROM crm_restore_archives WHERE id=?',[id]);if(!records[0])throw Object.assign(new Error('Backup not found.'),{status:404});
 const chunks=await mysqlQuery('SELECT payload FROM crm_restore_chunks WHERE archive_id=? ORDER BY chunk_no',[id]);const buffer=Buffer.concat(chunks.map(r=>r.payload));
 if(createHash('sha256').update(buffer).digest('hex')!==records[0].sha256)throw new Error('Archived backup integrity check failed.');return buffer;
}
function digestRows(rows:any[],names:string[]){const values=rows.map(row=>createHash('sha256').update(JSON.stringify(names.map(name=>{const value=row[name];return value instanceof Uint8Array?Buffer.from(value).toString('hex'):value??null;}))).digest('hex')).sort();return createHash('sha256').update(values.join('')).digest('hex');}
export async function importSqliteIntoMysql(buffer:Buffer){
 if(buffer.length<100 || buffer.subarray(0,16).toString('binary')!=='SQLite format 3\0')throw Object.assign(new Error('Choose a valid CRM .db backup.'),{status:400});
 const SQL=await initSqlJs(),source=new SQL.Database(buffer);
 try{
  if(source.exec('PRAGMA integrity_check')[0]?.values[0]?.[0]!=='ok')throw Object.assign(new Error('Backup integrity check failed.'),{status:400});
  const tables=sqliteRows(source,"SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").map((t:any)=>({...t,columns:sqliteRows(source,'PRAGMA table_info('+quote(t.name)+')'),indexes:sqliteRows(source,'PRAGMA index_list('+quote(t.name)+')').map((i:any)=>({...i,columns:sqliteRows(source,'PRAGMA index_info('+quote(i.name)+')')})),foreignKeys:sqliteRows(source,'PRAGMA foreign_key_list('+quote(t.name)+')')}));
  for(const name of ['leads','users','quotes','payment_links'])if(!tables.some((t:any)=>t.name===name))throw Object.assign(new Error('Backup is missing '+name+'.'),{status:400});
  const broken=source.exec('PRAGMA foreign_key_check');if(broken.length)throw Object.assign(new Error('Backup has broken record relationships. Import cancelled.'),{status:400});
  for(const table of metadata){const present=tables.find((t:any)=>t.name===table.name);if(!present)continue;const keys=table.columns.filter((c:any)=>c.pk);if(keys.length){const group=keys.map((c:any)=>quote(c.name)).join(',');const duplicates=sqliteRows(source,'SELECT '+group+',COUNT(*) AS n FROM '+quote(table.name)+' GROUP BY '+group+' HAVING COUNT(*)>1');if(duplicates.length)throw Object.assign(new Error('Backup contains duplicate record IDs in '+table.name),{status:400});}}
  await initializeMysqlSchema();
  // Forward-only schema preparation happens before the replacement transaction.
  for(const table of tables){
   await mysqlRun(mysqlTableSql(table));
   const present=await mysqlQuery('SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?',[table.name]);
   for(const column of table.columns)if(!present.some(p=>p.name===column.name))await mysqlRun('ALTER TABLE '+quote(table.name)+' ADD COLUMN '+quote(column.name)+' '+(/INT|REAL|NUMERIC/i.test(column.type)?'DECIMAL(20,6)':'LONGTEXT')+' NULL');
  }
  const prior=await exportMysqlBackup();const archiveId=await archiveMysqlBackup(prior);
  const allTables=await mysqlQuery("SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' AND TABLE_NAME NOT LIKE 'crm\\_%'");
  await mysqlQuery('SET FOREIGN_KEY_CHECKS=0');await mysqlRun('BEGIN');
  const counts:Record<string,number>={};
  try{
   for(const table of allTables)await mysqlRun('DELETE FROM '+quote(table.name));
   for(const table of tables){
    const rows=sqliteRows(source,'SELECT * FROM '+quote(table.name));const names=table.columns.map((c:any)=>c.name);
    for(const row of rows){
     if(table.name==='booking_snapshots'){row.total_paise ??=row.total_minor;row.total_minor ??=row.total_paise;row.quote_json ??=row.snapshot_json;row.snapshot_json ??=row.quote_json;for(const alias of ['total_paise','total_minor','quote_json','snapshot_json'])if(!names.includes(alias))names.push(alias);}
     await mysqlRun('INSERT INTO '+quote(table.name)+' ('+names.map(quote).join(',')+') VALUES ('+names.map(()=>'?').join(',')+')',names.map((n:string)=>row[n]??null));
    }
    const stored=await mysqlQuery('SELECT '+names.map(quote).join(',')+' FROM '+quote(table.name));if(stored.length!==rows.length || digestRows(rows,names)!==digestRows(stored,names))throw new Error('Imported record verification failed for '+table.name);counts[table.name]=rows.length;
   }
   // Check every declared foreign key after loading; checks are disabled only for load order.
   for(const table of metadata)for(const fk of table.foreignKeys){const invalid=await mysqlQuery('SELECT COUNT(*) AS count FROM '+quote(table.name)+' child LEFT JOIN '+quote(fk.table)+' parent ON child.'+quote(fk.from)+'=parent.'+quote(fk.to)+' WHERE child.'+quote(fk.from)+' IS NOT NULL AND parent.'+quote(fk.to)+' IS NULL');if(Number(invalid[0].count))throw new Error('Imported relationship check failed for '+table.name);}
   await mysqlRun('COMMIT');return {success:true,counts,archiveId};
  }catch(error){await mysqlRun('ROLLBACK');throw error;}
  finally{await mysqlQuery('SET FOREIGN_KEY_CHECKS=1');}
 }finally{source.close();}
}
