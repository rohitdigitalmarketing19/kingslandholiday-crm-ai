const fs = require('fs'), path = require('path'), os = require('os'), assert = require('assert/strict');
const { pathToFileURL } = require('url');
const root = path.resolve(__dirname, '..');
(async () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'kingsland-hotel-options-'));
    process.env.DATABASE_PATH = path.join(temp, 'isolated.db');
    for (const name of ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_API_KEY', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_KEY'])
        process.env[name] = '';
    const load = p => import(pathToFileURL(path.join(root, p)).href);
    const db = await load('server/db/connection.ts');
    assert.equal(db.supabase, null);
    await db.initDb();
    const { initializeDatabase } = await load('server/db/schema.ts');
    await initializeDatabase();
    const { createQuote, updateQuote } = await load('server/controllers/quotesController.ts');
    const { getLeadById } = await load('server/controllers/leadsController.ts');
    await db.runQuery('INSERT INTO leads(id,trip_id,name,status) VALUES(?,?,?,?)', ['hotel-test', 'HOTEL-TEST', 'Hotel Test Guest', 'New']);
    const hotel = { hotelName: 'Golden Signature', city: 'Jaisalmer', nights: 1, category: '3 Star', roomType: 'Standard', mealPlan: 'CPAI (Breakfast)', comments: '', selectedNightIndices: [0] };
    const q = { id: 'quote-hotel-test', packageTitle: 'Hotel comparison', finalSellingPrice: 17500, nights: 2, hotels: [hotel], hotelAlternative: { price: 18800, hotels: [{ ...hotel, hotelName: 'Jaigarh Palace', roomType: 'Heritage' }] } };
    await createQuote('hotel-test', q);
    const read = async () => (await getLeadById('hotel-test')).quotes.find(x => x.id === q.id);
    assert.equal((await read()).finalSellingPrice, 17500);
    assert.equal((await read()).hotels[0].mealPlan, hotel.mealPlan);
    assert.equal((await read()).hotelAlternative.price, 18800);
    assert.equal((await read()).hotelAlternative.hotels[0].hotelName, 'Jaigarh Palace');
    await updateQuote('hotel-test', q.id, { ...q, hotelAlternative: { ...q.hotelAlternative, price: 19000 } });
    assert.equal((await read()).hotelAlternative.price, 19000);
    assert.equal((await read()).finalSellingPrice, 17500);
    const legacy = { ...q };
    delete legacy.hotelAlternative;
    await updateQuote('hotel-test', q.id, legacy);
    assert.equal((await read()).hotelAlternative.price, 19000, 'Older clients must preserve secondary option');
    for (const bad of [{ price: 0, hotels: [hotel] }, { price: 18000, hotels: [{ ...hotel, hotelName: '' }] }]) {
        await assert.rejects(async () => await updateQuote('hotel-test', q.id, { ...q, hotelAlternative: bad }));
        assert.equal((await read()).hotelAlternative.price, 19000);
    }
    await initializeDatabase();
    assert.equal((await read()).hotelAlternative.price, 19000, 'Migration must preserve existing data');
    await updateQuote('hotel-test', q.id, { ...q, hotelAlternative: null });
    assert.equal((await read()).hotelAlternative, null);
    assert.equal((await read()).finalSellingPrice, 17500);
    assert.equal((await read()).hotels[0].hotelName, hotel.hotelName);
    console.log('PASS isolated SQLite: create, save, reopen, edit, clear, meal type, legacy payload, invalid input, additive migration. Primary price unchanged.');
})().catch(e => { console.error(e); process.exitCode = 1; });
