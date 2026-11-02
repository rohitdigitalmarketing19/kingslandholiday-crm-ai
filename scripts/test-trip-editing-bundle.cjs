const fs = require('fs'), path = require('path'), os = require('os'), assert = require('assert/strict');
const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '..');
(async () => {
    const runtime = fs.mkdtempSync(path.join(os.tmpdir(), 'crm-edit-'));
    process.chdir(runtime);
    process.env.DATABASE_PATH = path.join(runtime, 'test.db');
    process.env.BACKUP_PATH = path.join(runtime, 'backups');
    for (const key of ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_API_KEY', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_KEY'])
        process.env[key] = '';
    const load = async (f) => { switch (f) {
        case 'server/db/connection.ts': return require('../server/db/connection.ts');
        case 'server/db/schema.ts': return require('../server/db/schema.ts');
        case 'server/controllers/leadsController.ts': return require('../server/controllers/leadsController.ts');
        case 'server/controllers/quotesController.ts': return require('../server/controllers/quotesController.ts');
        case 'server/services/bookingAcceptance.ts': return require('../server/services/bookingAcceptance.ts');
    } };
    const db = await load('server/db/connection.ts');
    await db.initDb();
    await (await load('server/db/schema.ts')).initializeDatabase();
    const leads = await load('server/controllers/leadsController.ts'), quotes = await load('server/controllers/quotesController.ts');
    await leads.createLead({ id: 'edit-test', name: 'QA', tripId: 'QA-EDIT' });
    await quotes.createQuote('edit-test', { id: 'q-edit', finalSellingPrice: 1000 });
    await (await load('server/services/bookingAcceptance.ts')).acceptBookingQuote('edit-test', 'q-edit', 'qa');
    await leads.updateLeadStatus('edit-test', 'Closed Won');
    await quotes.updateQuote('edit-test', 'q-edit', { finalSellingPrice: 1200, packageTitle: 'Revised', hotels: [{ hotelName: 'Updated Hotel' }] }, 'qa');
    assert.equal((await db.queryOne('SELECT total_paise FROM booking_snapshots WHERE lead_id=?', ['edit-test'])).total_paise, 120000);
    assert.equal((await db.queryOne('SELECT total_amount FROM ops_customers WHERE id=?', ['cust-edit-test'])).total_amount, 1200);
    const event = await db.queryOne("SELECT * FROM workflow_events WHERE event='Quotation revised'");
    assert.equal(JSON.parse(event.before_json).booking.total_paise, 100000);
    assert.equal(event.actor, 'qa');
    await assert.rejects(async () => await quotes.updateQuote('edit-test', 'q-edit', { finalSellingPrice: -1 }, 'qa'));
    await assert.rejects(async () => await quotes.updateQuote('wrong', 'q-edit', { finalSellingPrice: 1200 }, 'qa'), e => e.status === 403);
    await db.runQuery("UPDATE ops_customers SET status='Completed' WHERE id=?", ['cust-edit-test']);
    await assert.rejects(async () => await quotes.updateQuote('edit-test', 'q-edit', { finalSellingPrice: 1300 }, 'qa'), e => e.status === 409);
    await assert.rejects(async () => await quotes.createQuote('edit-test', { finalSellingPrice: 1300 }), e => e.status === 409);
    await assert.rejects(async () => await leads.updateLeadTravelers('edit-test', 3, 0), e => e.status === 409);
    console.log('PASS: accepted quotation revision, booking/Operations totals, original audit snapshot, actor, invalid price, cross-lead rejection, and completion lock.');
})().catch(e => { console.error(e); process.exitCode = 1; });
