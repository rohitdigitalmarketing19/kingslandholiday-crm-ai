const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '..');
(async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'kingsland-rates-'));
  process.env.DATABASE_PATH = path.join(temp, 'test.db');
  for (const key of ['SUPABASE_URL','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_API_KEY','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_KEY']) process.env[key] = '';
  const load = file => import(pathToFileURL(path.join(root, file)).href);
  const db = await load('server/db/connection.ts');
  assert.equal(db.supabase, null);
  await db.initDb();
  const { initializeDatabase } = await load('server/db/schema.ts');
  initializeDatabase();
  const { matchesRateBand, toPaise } = await load('utils/hotelRates.ts');
  for (const rate of ['0', '1000', '1000.01', '1100', '2000', '2000.01', '2999', '3000', '4000', '4500', '5000', '8000', '8000.01']) {
    const bands = ['1000','2000','3000','4000','5000','8000','above'].filter(band => matchesRateBand(rate, band));
    assert.equal(bands.length, 1, `${rate} must appear in exactly one range`);
  }
  assert.equal(toPaise('1234.56'), 123456);
  for (const bad of ['-1','1.001','NaN','Infinity','1e3']) assert.throws(() => toPaise(bad));
  db.runQuery("INSERT INTO users (id,name,email,role,status,access_level) VALUES ('rate-admin','Admin','rate-admin@example.test','Admin','Active','Editor'), ('rate-sales','Sales','rate-sales@example.test','Sales','Active','Editor'), ('rate-view','View','rate-view@example.test','Admin','Active','ViewOnly'), ('rate-inactive','Inactive','rate-inactive@example.test','Admin','Inactive','Editor')");
  const category = db.queryOne("SELECT name FROM masters_data WHERE category='Hotel Categories' AND is_enabled=1").name;
  const express = (await import('express')).default;
  const app = express(); app.use(express.json({ limit: '15mb' }));
  app.use('/api/hotel-rates', (await load('server/routes/hotelRates.ts')).default);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api/hotel-rates`;
  const request = async (suffix = '', method = 'GET', body, user = 'rate-admin') => {
    const response = await fetch(base + suffix, { method, headers: { 'Content-Type': 'application/json', 'x-user-id': user }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  try {
    assert.equal((await request('', 'GET', null, '')).status, 401);
    assert.equal((await request('', 'GET', null, 'rate-sales')).status, 403);
    assert.equal((await request('', 'GET', null, 'rate-inactive')).status, 401);
    const { PDFDocument } = await import('pdf-lib');
    const document = await PDFDocument.create(); document.addPage();
    const pdf = { name: 'Hotel rates.pdf', data: Buffer.from(await document.save()).toString('base64') };
    const data = { name: 'Grand Palace', city: 'Jaipur', category, offSeasonRate: '800.50', offSeasonStartDate: '2026-04-01', seasonStartDate: '2026-10-01', contactNumber: '+91 98765 43210', seasonalRate: '1000.01', blackoutRate: '2500.50', blackoutDates: [{ start: '2026-01-01', end: '2026-01-05' }, { start: '2026-03-01', end: '2026-03-05' }], pdf };
    assert.equal((await request('', 'POST', data, 'rate-view')).status, 403);
    const result = await request('', 'POST', data); assert.equal(result.status, 201);
    const id = result.body.id;
    assert.deepEqual(result.body.blackoutDates, data.blackoutDates); assert.equal(result.body.seasonalRate, '1000.01'); assert.equal(result.body.offSeasonRate, '800.50'); assert.equal(result.body.offSeasonStartDate, '2026-04-01'); assert.equal(result.body.seasonStartDate, '2026-10-01'); assert.equal(result.body.contactNumber, '+91 98765 43210');
    assert.equal((await request()).body[0].pdfName, pdf.name);
    assert.equal('pdf_data' in (await request()).body[0], false);
    const sheet = await fetch(`${base}/${id}/pdf`, { headers: { 'x-user-id': 'rate-admin' } });
    assert.equal(sheet.status, 200); assert.equal(sheet.headers.get('content-type'), 'application/pdf');
    assert.equal(Buffer.from(await sheet.arrayBuffer()).toString('base64'), pdf.data);
    assert.equal((await request(`/${id}/pdf`, 'GET', null, 'rate-sales')).status, 403);
    for (const change of [
      { offSeasonRate: '-1' }, { offSeasonStartDate: '2026-02-30' }, { seasonStartDate: 'wrong' }, { contactNumber: 'bad contact' }, { seasonalRate: '-5' }, { blackoutRate: '1.234' }, { name: '' }, { category: 'invented' },
      { blackoutDates: [{ start: '2026-02-30', end: '2026-03-05' }] },
      { blackoutDates: [{ start: '2026-03-05', end: '2026-03-01' }] },
      { pdf: { name: 'bad.pdf', data: Buffer.from('%PDF-broken').toString('base64') } },
      { pdf: { ...pdf, name: '../bad.pdf' } },
      { pdf: { ...pdf, data: 'a'.repeat(13981020) } },
    ]) assert.equal((await request(`/${id}`, 'PUT', { ...data, ...change })).status, 400);
    const { pdf: ignored, offSeasonRate: legacyOff, offSeasonStartDate: legacyOffStart, seasonStartDate: legacyStart, contactNumber: legacyContact, ...withoutPdf } = data;
    assert.equal((await request(`/${id}`, 'PUT', { ...withoutPdf, name: 'Grand Palace Updated' })).status, 200);
    assert.equal((await request()).body[0].pdfName, pdf.name, 'Editing retains the existing PDF'); assert.equal((await request()).body[0].offSeasonRate, '800.50', 'Older clients preserve off-season fields'); assert.equal((await request()).body[0].contactNumber, '+91 98765 43210');
    assert.equal((await request(`/${id}`, 'PUT', { ...withoutPdf, removePdf: true })).body.pdfName, '');
    assert.equal((await request(`/${id}/pdf`)).status, 404);
    assert.equal(db.queryOne('SELECT COUNT(*) AS count FROM hotel_rate_history').count, 3);
    initializeDatabase(); assert.equal((await request()).body.length, 1, 'Additive migration preserves hotels');
    assert.equal((await request(`/${id}`, 'DELETE', null, '')).status, 401);
    assert.equal((await request(`/${id}`, 'DELETE', null, 'rate-sales')).status, 403);
    assert.equal((await request(`/${id}`, 'DELETE', null, 'rate-view')).status, 403);
    assert.equal((await request(`/${id}`, 'DELETE')).status, 200);
    assert.equal((await request()).body.length, 0);
    assert.equal((await request(`/${id}/pdf`)).status, 404);
    assert.equal((await request(`/${id}`, 'PUT', data)).status, 404);
    assert.equal((await request(`/${id}`, 'DELETE')).status, 404);
    assert.ok(db.queryOne('SELECT deleted_at FROM hotel_rates WHERE id=?', [id]).deleted_at);
    assert.equal(db.queryOne('SELECT COUNT(*) AS count FROM hotel_rate_history').count, 4);
    console.log('PASS: isolated database; create/reopen/edit; two blackout periods; rate boundaries without gaps; exact paise; auth/roles/view-only; PDF validation, preview, retain/remove; invalid requests unchanged; audit history; repeat migration.');
  } finally { server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
