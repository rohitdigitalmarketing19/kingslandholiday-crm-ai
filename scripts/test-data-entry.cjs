const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { randomUUID } = require('crypto');
const { pathToFileURL } = require('url');
(async () => {
  const root = path.resolve(__dirname, '..');
  process.env.DATABASE_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kingsland-entry-')), 'test.db');
  for (const key of ['SUPABASE_URL','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_API_KEY','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_KEY']) process.env[key] = '';
  const load = file => import(pathToFileURL(path.join(root, file)).href);
  const db = await load('server/db/connection.ts'); await db.initDb();
  const { initializeDatabase } = await load('server/db/schema.ts'); initializeDatabase();
  const { apiAuthorization, createSession } = await load('server/middleware/auth.ts');
  const cookies = {};
  for (const [id, role, access, status] of [['entry-admin','Admin','Editor','Active'], ['entry-sales','Sales','Editor','Active'], ['entry-view','Admin','ViewOnly','Active'], ['entry-inactive','Admin','Editor','Inactive']]) {
    db.runQuery('INSERT INTO users(id,name,email,role,access_level,status) VALUES(?,?,?,?,?,?)', [id,id,`${id}@example.test`,role,access,status]);
    createSession(id, { cookie: (name, value) => cookies[id] = `${name}=${value}` });
  }
  const express = (await import('express')).default;
  const app = express(); app.use(express.json({ limit: '15mb' })); app.use('/api', apiAuthorization);
  app.use('/api/hotel-rates', (await load('server/routes/hotelRates.ts')).default);
  app.use('/api/b2b-data', (await load('server/routes/b2bData.ts')).default);
  app.use('/api/public/data-entry', (await load('server/routes/publicDataEntry.ts')).default);
  app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ error: 'Server error' }); });
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const request = async (url, method='GET', body, user) => {
    const response = await fetch(base+url, { method, headers: {'Content-Type':'application/json', ...(user ? {Cookie:cookies[user]} : {}), 'x-user-id':'entry-admin'}, ...(body ? {body:JSON.stringify(body)} : {}) });
    return {status:response.status, body:await response.json().catch(() => ({}))};
  };
  try {
    for (const desk of ['b2b-data','hotel-rates']) {
      assert.equal((await request(`/${desk}`)).status, 401, 'A forged identity header must not authenticate');
      assert.equal((await request(`/${desk}`, 'GET', null, 'entry-sales')).status, 403);
      assert.equal((await request(`/${desk}`, 'GET', null, 'entry-inactive')).status, 401);
      assert.equal((await request(`/${desk}`, 'GET', null, 'entry-view')).status, 200);
      assert.equal((await request(`/${desk}`, 'POST', {}, 'entry-view')).status, 403);
      assert.equal((await request(`/public/data-entry/${desk}`)).status, 401);
      assert.equal((await request(`/public/data-entry/${desk}/existing`, 'PUT', {})).status, 401);
      assert.equal((await request(`/public/data-entry/${desk}/existing`, 'DELETE')).status, 401);
    }
    const contact = {name:'Entry Test Partner',phone:'+91 98765 43210',city:'Jaipur',state:'Rajasthan',quality:'Potential',requestId:randomUUID()};
    const added = await request('/public/data-entry/b2b-data','POST',contact);
    assert.equal(added.status,201); assert.deepEqual(Object.keys(added.body).sort(),['reference','success']);
    assert.equal((await request('/public/data-entry/b2b-data','POST',contact)).body.reference, added.body.reference);
    let contacts = (await request('/b2b-data','GET',null,'entry-admin')).body;
    assert.equal(contacts.length,1); assert.equal(contacts[0].quality,'Potential');
    for (const change of [{name:''},{phone:'hello'},{phone:'12'},{state:''},{quality:'other'}]) assert.equal((await request('/b2b-data','POST',{...contact,...change},'entry-admin')).status,400);
    const edited = await request(`/b2b-data/${added.body.reference}`,'PUT',{...contact,quality:'Partner'},'entry-admin'); assert.equal(edited.body.quality,'Partner');
    assert.equal((await request(`/b2b-data/${added.body.reference}`,'DELETE',null,'entry-view')).status,403);
    assert.equal((await request(`/b2b-data/${added.body.reference}`,'DELETE',null,'entry-admin')).status,200);
    assert.equal((await request('/b2b-data','GET',null,'entry-admin')).body.length,0);
    assert.equal((await request(`/b2b-data/${added.body.reference}`,'PUT',contact,'entry-admin')).status,404);
    assert.equal(db.queryOne('SELECT COUNT(*) AS n FROM b2b_contact_history').n,3);
    const categoryResult = await request('/public/data-entry/hotel-categories'); assert.equal(categoryResult.status,200); assert.ok(categoryResult.body.length);
    const { PDFDocument } = await import('pdf-lib'); const pdf = await PDFDocument.create(); pdf.addPage();
    const hotel = {name:'Entry Hotel',city:'Udaipur',category:categoryResult.body[0],contactNumber:'+91 98765 43210',offSeasonRate:'1000.50',offSeasonStartDate:'2026-04-01',seasonStartDate:'2026-10-01',seasonalRate:'2000.50',blackoutRate:'3000.50',blackoutDates:[{start:'2026-12-25',end:'2026-12-31'}],pdf:{name:'rates.pdf',data:Buffer.from(await pdf.save()).toString('base64')},requestId:randomUUID()};
    const results = await Promise.all([request('/public/data-entry/hotel-rates','POST',hotel),request('/public/data-entry/hotel-rates','POST',hotel)]);
    assert.ok(results.every(result=>[200,201].includes(result.status)),JSON.stringify(results));
    assert.equal(results[0].body.reference,results[1].body.reference); assert.deepEqual(Object.keys(results[0].body).sort(),['reference','success']);
    const hotels = (await request('/hotel-rates','GET',null,'entry-admin')).body; assert.equal(hotels.length,1); assert.equal(hotels[0].offSeasonRate,'1000.50'); assert.equal(hotels[0].pdfName,'rates.pdf'); assert.deepEqual(hotels[0].blackoutDates,hotel.blackoutDates);
    assert.equal((await request(`/hotel-rates/${hotels[0].id}/pdf`)).status,401);
    for (const change of [{seasonalRate:'-1'},{category:'made-up'},{pdf:{name:'bad.pdf',data:'ZmFrZQ=='}},{blackoutDates:[{start:'2026-12-31',end:'2026-12-01'}]}]) assert.equal((await request('/public/data-entry/hotel-rates','POST',{...hotel,...change,requestId:randomUUID()})).status,400);
    assert.equal((await request('/public/data-entry/b2b-data','POST',{...contact,requestId:undefined})).status,400);
    assert.equal((await request('/public/data-entry/b2b-data','POST',{...contact,requestId:randomUUID(),website:'bot'})).status,400);
    const counts = {hotels:db.queryOne('SELECT COUNT(*) AS n FROM hotel_rates').n, contacts:db.queryOne('SELECT COUNT(*) AS n FROM b2b_contacts').n};
    initializeDatabase(); initializeDatabase();
    assert.equal(db.queryOne('SELECT COUNT(*) AS n FROM hotel_rates').n,counts.hotels); assert.equal(db.queryOne('SELECT COUNT(*) AS n FROM b2b_contacts').n,counts.contacts);
    const SQL = await require('sql.js')(); const disk = new SQL.Database(fs.readFileSync(process.env.DATABASE_PATH));
    assert.equal(disk.exec('SELECT COUNT(*) FROM public_entry_submissions')[0].values[0][0],2); disk.close();
    const limited = await Promise.all(Array.from({length:12},()=>request('/public/data-entry/b2b-data','POST',{...contact,requestId:randomUUID()})));
    assert.ok(limited.some(result=>result.status===429));
    console.log('PASS: cookie authentication, forged-header rejection, admin/sales/inactive/view-only boundaries, anonymous create-only, B2B CRUD/validation/audit, matching hotel fields/PDF, concurrent retry deduplication, persistence, repeat migration, rate limiting.');
  } finally { server.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
