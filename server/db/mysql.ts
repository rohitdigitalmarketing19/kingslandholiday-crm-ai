import mysql, {Pool,PoolConnection} from 'mysql2/promise';
import { AsyncLocalStorage } from 'node:async_hooks';
import metadata from './mysqlSchema.json';
export const mysqlEnabled=()=>{const value=(process.env.DB_CLIENT || 'sqlite').trim().toLowerCase();if(!['sqlite','mysql'].includes(value))throw new Error('DB_CLIENT must be sqlite or mysql.');return value==='mysql';};
let pool:Pool;
let initialized=false;
let initializing:Promise<void>|null=null;
const scope=new AsyncLocalStorage<PoolConnection>();
const identifier=(v:string)=>{if(!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(v))throw new Error('Invalid database identifier.');return '`'+v+'`';};
export function initMysql():Promise<void>{if(initialized)return Promise.resolve();if(!initializing)initializing=connectMysql().finally(()=>{initializing=null;});return initializing;}
async function connectMysql(){
 if(initialized)return;
 for(const name of ['MYSQL_HOST','MYSQL_USER','MYSQL_PASSWORD','MYSQL_DATABASE'])if(!process.env[name])throw new Error(name+' is required for MySQL.');
 const host=(process.env.MYSQL_HOST || '').trim();if(!/^[a-zA-Z0-9._:-]+$/.test(host))throw Object.assign(new Error('Invalid MySQL hostname.'),{code:'MYSQL_HOST_INVALID'});
 const port=Number(process.env.MYSQL_PORT || 3306);if(!Number.isInteger(port)||port<1||port>65535)throw new Error('MYSQL_PORT is invalid.');
 pool=mysql.createPool({host,port,user:process.env.MYSQL_USER?.trim(),password:process.env.MYSQL_PASSWORD,database:process.env.MYSQL_DATABASE?.trim(),connectionLimit:8,connectTimeout:10000,charset:'utf8mb4',decimalNumbers:true,dateStrings:true,multipleStatements:false,enableKeepAlive:true,...(process.env.MYSQL_SSL==='true'?{ssl:{rejectUnauthorized:true}}:{})});

 try{const c=await configuredConnection();try{await c.ping();initialized=true;}finally{c.release();}}catch(error){await pool.end().catch(()=>{});throw error;}
}
export async function withMysqlConnection<T>(work:()=>Promise<T>):Promise<T>{
 if(scope.getStore())return work();
 const connection=await configuredConnection();
 try{await lockWrites(connection);return await scope.run(connection,work);}finally{await connection.rollback().catch(()=>{});await unlockWrites(connection);connection.release();}
}
async function lockWrites(connection:PoolConnection){const [rows]:any=await connection.execute('SELECT GET_LOCK(?,30) AS acquired',['kingsland:'+process.env.MYSQL_DATABASE]);if(Number(rows[0].acquired)!==1)throw Object.assign(new Error('The database is busy. Please retry.'),{status:503});}
async function unlockWrites(connection:PoolConnection){await connection.execute('SELECT RELEASE_LOCK(?)',['kingsland:'+process.env.MYSQL_DATABASE]).catch(()=>{});}
export function mysqlRequestScope(req:any,res:any,next:any){
 configuredConnection().then(async connection=>{
  let released=false,ended=false,locked=false;
  const release=()=>{if(released||!ended||res.locals.pendingAsyncHandlers>0)return;released=true;connection.rollback().catch(()=>{}).finally(async()=>{if(locked)await unlockWrites(connection);connection.release();});};
  res.locals.releaseMysqlScope=release;
  res.once('finish',()=>{ended=true;release();});res.once('close',()=>{ended=true;release();});
  try{
   res.locals.acquireMysqlWrite=async()=>{if(!locked){await lockWrites(connection);locked=true;}};
   if(res.destroyed){ended=true;release();return;}
   scope.run(connection,()=>next());
  }catch(error){ended=true;release();next(error);}
 }).catch(next);
}
export const mysqlConnection=()=>{const connection=scope.getStore();if(!connection)throw new Error('MySQL work must run in a request or startup connection scope.');return connection;};
function translate(sql:string):string {
 sql=sql.replace(/COLLATE NOCASE/gi,'COLLATE utf8mb4_general_ci');
 sql=sql.replace(/(\b[\w.]+)\s+LIKE\s+\?/gi,'$1 COLLATE utf8mb4_general_ci LIKE ?');
 sql=sql.replace(/datetime\('now'\)/gi,"DATE_FORMAT(UTC_TIMESTAMP(),'%Y-%m-%dT%H:%i:%s.000Z')");
 const upsert=sql.match(/^\s*INSERT OR (REPLACE|IGNORE) INTO\s+([\w]+)\s*\(([^)]+)\)/i);
 if(upsert){const names=upsert[3].split(',').map(n=>n.trim());sql=sql.replace(/INSERT OR (REPLACE|IGNORE)/i,'INSERT');sql+=' ON DUPLICATE KEY UPDATE '+(upsert[1].toUpperCase()==='IGNORE'?identifier(names[0])+'='+identifier(names[0]):names.map(n=>identifier(n)+'=VALUES('+identifier(n)+')').join(','));}
 sql=sql.replace(/ON CONFLICT\(\w+\) DO UPDATE SET/i,'ON DUPLICATE KEY UPDATE').replace(/excluded\.([\w]+)/gi,(_,name)=>'VALUES('+identifier(name)+')');
 return sql;
}
export async function mysqlQuery(sql:string,params:any[]=[]):Promise<any[]> {
 const pragma=sql.match(/^PRAGMA table_info\((\w+)\)/i);
 if(pragma){const [rows]:any=await mysqlConnection().execute('SELECT COLUMN_NAME AS name,DATA_TYPE AS type,IS_NULLABLE,COLUMN_DEFAULT AS dflt_value,COLUMN_KEY FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY ORDINAL_POSITION',[pragma[1]]);return rows.map((r:any)=>({...r,notnull:r.IS_NULLABLE==='NO'?1:0,pk:r.COLUMN_KEY==='PRI'?1:0}));}
 const statement=translate(sql);
 const [rows]:any=params.length?await mysqlConnection().execute(statement,params.map(v=>v===undefined?null:v)):await mysqlConnection().query(statement);
 return rows;
}
export async function mysqlRun(sql:string,params:any[]=[]):Promise<{changes:number}>{
 if(/^BEGIN\b/i.test(sql.trim())){await mysqlConnection().beginTransaction();await mysqlQuery('SELECT id FROM crm_transaction_lock WHERE id=1 FOR UPDATE');return {changes:0};}
 if(/^COMMIT\b/i.test(sql.trim())){await mysqlConnection().commit();return {changes:0};}
 if(/^ROLLBACK\b/i.test(sql.trim())){await mysqlConnection().rollback();return {changes:0};}
 const result:any=await mysqlQuery(sql,params);return {changes:result.affectedRows || 0};
}
function columnSql(c:any,indexed:Set<string>,table:any){
 const name=identifier(c.name), type=String(c.type).toUpperCase();
 let sqlType=/INT/.test(type)?'BIGINT':/REAL|FLOAT|DOUBLE|DECIMAL|NUMERIC/.test(type)?'DECIMAL(20,6)':/BLOB/.test(type)?'LONGBLOB':indexed.has(c.name)?'VARCHAR(191)':/date|time|_at$/.test(c.name)?'VARCHAR(40)':'LONGTEXT';
 const auto=c.pk && /AUTOINCREMENT/i.test(table.sql) && /INT/.test(type);
 let text=name+' '+sqlType+(c.notnull||c.pk?' NOT NULL':' NULL')+(auto?' AUTO_INCREMENT':'');
 if(c.dflt_value!==null && c.dflt_value!==undefined && !auto){let def=String(c.dflt_value);if(/datetime\('now'\)/i.test(def))def="(DATE_FORMAT(UTC_TIMESTAMP(),'%Y-%m-%dT%H:%i:%s.000Z'))";else if(sqlType==='LONGTEXT')def='('+def+')';text+=' DEFAULT '+def;}
 return text;
}
function checkClauses(sql:string){const result:string[]=[];const pattern=/CHECK\s*\(/gi;let match:RegExpExecArray|null;
 while((match=pattern.exec(sql))){let depth=1,pos=pattern.lastIndex,quoteChar='';const start=pos;for(;pos<sql.length && depth;pos++){const char=sql[pos];if(quoteChar){if(char===quoteChar){if(sql[pos+1]===char){pos++;continue;}quoteChar='';}}else if(char==="'"||char==='"')quoteChar=char;else if(char==='(')depth++;else if(char===')')depth--;}if(depth===0)result.push('CHECK ('+sql.slice(start,pos-1)+')');pattern.lastIndex=pos;}
 return result;
}
export function mysqlTableSql(table:any){
 const indexed=new Set<string>();for(const c of table.columns)if(c.pk)indexed.add(c.name);
 for(const index of table.indexes)for(const c of index.columns)indexed.add(c.name);
 for(const f of table.foreignKeys)indexed.add(f.from);
 // Referenced IDs must have the same type even when SQLite did not declare an index locally.
 for(const c of table.columns)if(c.name==='id'||c.name.endsWith('_id')||c.name==='pay_key'||c.name==='request_key'||c.name==='token_hash')indexed.add(c.name);
 const definitions=table.columns.map((c:any)=>columnSql(c,indexed,table));
 definitions.push(...checkClauses(table.sql || ''));
 const primary=table.columns.filter((c:any)=>c.pk).sort((a:any,b:any)=>a.pk-b.pk);if(primary.length)definitions.push('PRIMARY KEY('+primary.map((c:any)=>identifier(c.name)).join(',')+')');
 for(const index of table.indexes){if(index.origin==='pk'||index.partial)continue;const name=(index.unique?'uidx_':'idx_')+table.name+'_'+index.columns.map((c:any)=>c.name).join('_');definitions.push((index.unique?'UNIQUE ':'')+'KEY '+identifier(name.slice(0,64))+' ('+index.columns.map((c:any)=>identifier(c.name)).join(',')+')');}
 return 'CREATE TABLE IF NOT EXISTS '+identifier(table.name)+' ('+definitions.join(',')+') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin';
}
export async function initializeMysqlSchema(){
 for(const table of metadata){
  await mysqlRun(mysqlTableSql(table));
  const existing=await mysqlQuery('SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?',[table.name]);
  for(const column of table.columns)if(!existing.some(c=>c.name===column.name))await mysqlRun('ALTER TABLE '+identifier(table.name)+' ADD COLUMN '+columnSql(column,new Set(['id','lead_id','customer_id','quote_id','pay_key']),table));
 }
 const mobileColumns=await mysqlQuery("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='lead_travellers' AND COLUMN_NAME='crm_unique_mobile'");
 if(!mobileColumns.length){await mysqlRun("ALTER TABLE lead_travellers ADD COLUMN crm_unique_mobile VARCHAR(191) GENERATED ALWAYS AS (NULLIF(mobile,'')) STORED, ADD UNIQUE KEY unique_traveller_mobile(lead_id,crm_unique_mobile)");}
 await mysqlRun('CREATE TABLE IF NOT EXISTS crm_transaction_lock(id BIGINT PRIMARY KEY) ENGINE=InnoDB');
 await mysqlRun('INSERT INTO crm_transaction_lock(id) VALUES(1) ON DUPLICATE KEY UPDATE id=id');
 for(const table of metadata)for(const f of table.foreignKeys){
  const name=('fk_'+table.name+'_'+f.from).slice(0,64);
  const exists=await mysqlQuery('SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME=? AND CONSTRAINT_NAME=?',[table.name,name]);
  if(!exists.length)await mysqlRun('ALTER TABLE '+identifier(table.name)+' ADD CONSTRAINT '+identifier(name)+' FOREIGN KEY ('+identifier(f.from)+') REFERENCES '+identifier(f.table)+' ('+identifier(f.to)+')'+(f.on_delete==='CASCADE'?' ON DELETE CASCADE':''));
 }
}
export async function mysqlExec(sql:string){
 if(/^CREATE TABLE IF NOT EXISTS/i.test(sql.trim())){const name=sql.match(/EXISTS\s+(\w+)/i)?.[1];const table=metadata.find(t=>t.name===name);if(table)return mysqlRun(mysqlTableSql(table));}
 if(/^CREATE (UNIQUE )?INDEX IF NOT EXISTS/i.test(sql.trim()))return; // indexes are installed by the schema metadata.
 if(/^DROP TRIGGER/i.test(sql.trim()))return mysqlRun(sql);
 if(/^CREATE TRIGGER/i.test(sql.trim()))return installMysqlBookingGuard();
 return mysqlRun(sql);
}
export async function installMysqlBookingGuard(){
 await mysqlRun('DROP TRIGGER IF EXISTS protect_booking_snapshots_update');
 await mysqlRun("CREATE TRIGGER protect_booking_snapshots_update BEFORE UPDATE ON booking_snapshots FOR EACH ROW BEGIN IF NOT(NEW.lead_id <=> OLD.lead_id) OR NOT(NEW.quote_id <=> OLD.quote_id) OR NOT(NEW.accepted_by <=> OLD.accepted_by) OR NOT(NEW.accepted_at <=> OLD.accepted_at) OR NOT(NEW.total_paise <=> NEW.total_minor) OR NOT(NEW.quote_json <=> NEW.snapshot_json) OR EXISTS (SELECT 1 FROM ops_customers c JOIN leads l ON c.id=CONCAT('cust-',l.id) OR c.booking_id=l.trip_id WHERE l.id=OLD.lead_id AND LOWER(c.status)='completed') OR NOT EXISTS (SELECT 1 FROM workflow_events e WHERE e.parent_id=OLD.lead_id AND e.event='Booking amended' AND e.before_json=OLD.quote_json AND e.after_json=NEW.quote_json AND ROUND(JSON_EXTRACT(e.after_json,'$.final_selling_price')*100)=NEW.total_paise) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Booking changes require an audited revision before trip completion'; END IF; END");
}
export async function closeMysql(){await pool?.end();initialized=false;}

const configuredConnections=new WeakSet<object>();
async function configuredConnection():Promise<PoolConnection>{
 const connection=await pool.getConnection();
 try{if(!configuredConnections.has(connection)){await connection.query("SET SESSION sql_mode='STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION,NO_BACKSLASH_ESCAPES,PIPES_AS_CONCAT'");configuredConnections.add(connection);}return connection;}
 catch(error:any){connection.release();throw Object.assign(error,{stage:'session'});}
}
