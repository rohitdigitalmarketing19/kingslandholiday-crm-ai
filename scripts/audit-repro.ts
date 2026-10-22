import express from 'express';
import { initDb, queryOne } from '../server/db/connection';
import { initializeDatabase } from '../server/db/schema';
import users from '../server/routes/users';
import leads from '../server/routes/leads';
import payments from '../server/routes/payments';
import settings from '../server/routes/settings';
import { getRequesterInfo } from '../server/controllers/clientDocumentsController';
import { isAdminUser } from '../server/controllers/pdfThemesController';
import { createQuote, updateQuote } from '../server/controllers/quotesController';
import { getAllOpsCustomers } from '../server/controllers/opsController';

if (!process.cwd().endsWith('.audit-runtime')) throw new Error('Run only from isolated .audit-runtime directory');
await initDb();
initializeDatabase();
const app = express();
app.use(express.json());
app.use('/users', users);
app.use('/leads', leads);
app.use('/payments', payments);
app.use('/settings', settings);
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const port = (server.address() as any).port;
async function call(route: string, method = 'GET', body?: any) {
  const response = await fetch(`http://127.0.0.1:${port}${route}`, { method, headers: {'Content-Type':'application/json'}, body: body ? JSON.stringify(body) : undefined });
  const data = response.headers.get('content-type')?.includes('json') ? await response.json() : null;
  return { status: response.status, data };
}
try {
  const u = await call('/users');
  console.log('AUDIT', JSON.stringify({test:'anonymous users list exposes plaintext password',status:u.status,exposesPassword:!!u.data?.[0]?.password}));
  console.log('AUDIT', JSON.stringify({test:'anonymous database download',status:(await call('/settings/backup/download')).status}));
  console.log('AUDIT', JSON.stringify({test:'forged admin header accepted',accepted:getRequesterInfo({headers:{'x-user-role':'Admin'}} as any).isAdmin}));
  console.log('AUDIT', JSON.stringify({test:'PDF admin check without identity',accepted:isAdminUser({headers:{}} as any)}));
  await call('/leads','POST',{id:'audit-lead',tripId:'AUDIT-1',name:'Synthetic Audit Guest'});
  const won = await call('/leads/audit-lead/status','PATCH',{status:'Closed Won'});
  console.log('AUDIT',JSON.stringify({test:'lead converted without accepted proposal',status:won.status,leadStatus:queryOne('SELECT status FROM leads WHERE id = ?',['audit-lead'])?.status,opsExists:!!queryOne('SELECT id FROM ops_customers WHERE id = ?',['cust-audit-lead'])}));
  createQuote('audit-lead',{id:'audit-quote',finalSellingPrice:1000});
  updateQuote('audit-lead','audit-quote',{finalSellingPrice:9000});
  console.log('AUDIT',JSON.stringify({test:'editing quote rewrites converted revenue',total:queryOne('SELECT total_amount FROM ops_customers WHERE id = ?',['cust-audit-lead'])?.total_amount}));
  const link = await call('/payments/links','POST',{leadId:'audit-lead',amount:1000,packageName:'Synthetic',customerName:'Synthetic'});
  const confirm = await call('/payments/confirm','POST',{payKey:link.data.pay_key,amount:5000});
  console.log('AUDIT',JSON.stringify({test:'anonymous excessive payment confirmation',status:confirm.status,result:confirm.data,record:queryOne('SELECT amount, paid_amount, status FROM payment_links WHERE id = ?',[link.data.id])}));
  const missing = await call('/payments/confirm','POST',{payKey:'missing-audit-key',amount:100});
  console.log('AUDIT',JSON.stringify({test:'nonexistent payment confirmation',status:missing.status,result:missing.data}));
  await call('/leads/audit-lead/status','PATCH',{status:'Lost'});
  getAllOpsCustomers();
  console.log('AUDIT',JSON.stringify({test:'list operations deletes records after lead status change',opsStillExists:!!queryOne('SELECT id FROM ops_customers WHERE id = ?',['cust-audit-lead'])}));
} finally { server.close(); }
