const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const esbuild = require('esbuild'), puppeteer = require('puppeteer-core');
const root = path.resolve(__dirname, '..');
(async () => {
  const output = path.join(root, 'tmp', 'hotel-rates'); fs.mkdirSync(output, { recursive: true });
  const bundle = await esbuild.build({ stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import HotelRatesView from './components/HotelRatesView'; createRoot(document.getElementById('root')).render(<HotelRatesView/>);`, resolveDir: root, loader: 'tsx' }, bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"production"' } });
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message));
    const { PDFDocument } = require('pdf-lib'); const pdf = await PDFDocument.create(); pdf.addPage(); const bytes = Buffer.from(await pdf.save());
    const pdfPath = path.join(output, 'sample.pdf'); fs.writeFileSync(pdfPath, bytes);
    let hotels = [{ id: 'one', name: 'The Grand Palace', city: 'Jaipur', category: '4 Star', seasonalRate: '3500.00', blackoutRate: '5500.00', blackoutDates: [{ start: '2026-01-01', end: '2026-01-05' }, { start: '2026-03-01', end: '2026-03-05' }], pdfName: 'Hotel rates.pdf', updatedAt: '' }];
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.protocol === 'blob:') return request.continue();
      if (request.isNavigationRequest() && !url.pathname.startsWith('/api')) return request.respond({ status: 200, contentType: 'text/html', body: '<html><body style="background:var(--surface-muted);padding:24px"><div id="root" class="crm-app"></div></body></html>' });
      if (url.pathname.endsWith('/pdf')) return request.respond({ status: 200, contentType: 'application/pdf', body: bytes });
      if (url.pathname.includes('/masters')) return request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify([{ name: '4 Star', is_enabled: 1 }, { name: '3 Star', is_enabled: 1 }]) });
      if (request.method() === 'DELETE') { hotels = hotels.filter(hotel => hotel.id !== url.pathname.split('/').pop()); return request.respond({status:200, contentType:'application/json', body:JSON.stringify({success:true})}); }
      if (request.method() === 'POST' || request.method() === 'PUT') {
        const data = JSON.parse(request.postData()); const hotel = { ...data, id: 'two', pdfName: data.pdf?.name || '', updatedAt: '' }; hotels.push(hotel);
        return request.respond({ status: 201, contentType: 'application/json', body: JSON.stringify(hotel) });
      }
      return request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(hotels) });
    });
    await page.setViewport({ width: 1440, height: 1000 }); await page.goto('http://hotel-rates.test');
    const css = fs.readdirSync(path.join(root, 'dist/assets')).find(file => file.endsWith('.css'));
    await page.addStyleTag({ content: fs.readFileSync(path.join(root, 'dist/assets', css), 'utf8') });
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    await page.waitForSelector('tbody tr');
    const clickText = async text => { await page.evaluate(text => { const button = [...document.querySelectorAll('button')].find(item => item.textContent.trim() === text); if (!button) throw new Error('Missing button ' + text); button.click(); }, text); };
    await page.screenshot({ path: path.join(output, 'directory-desktop.png'), fullPage: true });
    await page.select('select', '2000'); await page.waitForFunction(() => document.body.textContent.includes('No hotels match'));
    await page.select('select', '4000'); await page.waitForSelector('tbody tr');
    await page.type('input[placeholder="Search hotels…"]', 'missing'); await page.waitForFunction(() => document.body.textContent.includes('No hotels match'));
    await clickText('Clear filters'); await clickText('Add hotel'); await page.waitForSelector('dialog[open]');
    await page.type('dialog input[maxlength="160"]', 'Lake View Retreat');
    await page.type('dialog input[list]', 'Udaipur'); await page.select('dialog select', '3 Star');
    const rates = await page.$$('dialog input[type="number"]'); await rates[0].type('1200'); await rates[1].type('1800'); await rates[2].type('3000');
    await page.type('dialog input[type="tel"]', '+91 98765 43210');
    await clickText('Add period'); await clickText('Add period');
    await page.$$eval('input[type="date"]', inputs => inputs.forEach((input, i) => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(input, ['2026-04-01','2026-10-01','2026-01-01','2026-01-05','2026-03-01','2026-03-05'][i]); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); }));
    await (await page.$('input[type="file"]')).uploadFile(pdfPath);
    await page.waitForFunction(() => document.body.textContent.includes('sample.pdf'));
    await page.screenshot({ path: path.join(output, 'editor-desktop.png'), fullPage: true });
    await page.evaluate(() => [...document.querySelectorAll('dialog button')].find(item => item.textContent.trim() === 'Preview').click());
    await page.waitForSelector('iframe'); assert.match(await page.$eval('iframe', frame => frame.src), /^blob:/);
    await page.evaluate(() => document.querySelectorAll('dialog')[1].querySelector('button[aria-label="Close"]').click());
    await clickText('Save hotel'); await page.waitForFunction(() => document.body.textContent.includes('Lake View Retreat saved successfully.'));
    assert.equal(hotels[1].offSeasonRate, '1200'); assert.equal(hotels[1].offSeasonStartDate, '2026-04-01'); assert.equal(hotels[1].seasonStartDate, '2026-10-01'); assert.equal(hotels[1].contactNumber, '+91 98765 43210'); assert.equal(hotels[1].blackoutDates.length, 2); assert.equal(hotels[1].pdfName, 'sample.pdf');
    const selects = await page.$$('select');
    await selects[1].select('3 Star'); await selects[2].select('Udaipur');
    await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 1);
    await selects[2].select('Jaipur'); await page.waitForFunction(() => document.body.textContent.includes('No hotels match'));
    await clickText('Clear filters');
    await clickText('Add hotel'); await page.setViewport({ width: 320, height: 850 });
    await page.screenshot({ path: path.join(output, 'editor-mobile.png'), fullPage: true });
    assert.ok(await page.$eval('dialog', dialog => dialog.scrollWidth <= dialog.clientWidth + 1), 'Form must fit a 320px viewport');
    await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('dialog'));
    await page.screenshot({ path: path.join(output, 'directory-mobile.png'), fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= 320), 'Only the table should scroll horizontally, not the page');
    await page.setViewport({ width: 1440, height: 1000 });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.screenshot({ path: path.join(output, 'directory-dark.png'), fullPage: true });
    page.once('dialog', dialog => dialog.dismiss());
    await page.$eval('button[aria-label="Delete Lake View Retreat"]', button => button.click());
    assert.equal(hotels.length, 2, 'Cancel deletion must retain hotel');
    page.once('dialog', dialog => { assert.ok(dialog.message().includes('Lake View Retreat')); return dialog.accept(); });
    await page.$eval('button[aria-label="Delete Lake View Retreat"]', button => button.click());
    await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 1);
    assert.equal(hotels.length, 1);
    assert.deepEqual(errors, []);
    console.log('PASS browser component workflow: combined search/range filters, add hotel, two dates, PDF upload/preview, save feedback, Escape/focus dialog, 320px form fit. Screenshots in tmp/hotel-rates.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
