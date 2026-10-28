/* Browser regression against the production frontend. All API data is synthetic;
 * the real backend/database is never started or contacted. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { build } = require('esbuild');
const puppeteer = require('puppeteer-core');
const { PDFDocument } = require('pdf-lib');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'tmp/theme-review');
fs.mkdirSync(out, { recursive: true });
const views = ['Dashboard', 'New Inquiry', 'Leads', 'Follow-ups', 'Sales Desk', 'Saved Itinerary', 'Analytics', 'Sales Team', 'Payments', 'Accounts', 'HotelVouchers', 'User Management', 'Masters', 'PDF designs', 'PDF Themes', 'Settings', 'Client Documents', 'Client Details'];
const user = { id: 'theme-review', name: 'Theme Review', email: 'review@example.test', role: 'Admin', department: 'Management', status: 'Active', accessLevel: 'Editor', permissions: views, createdAt: '2026-10-28T00:00:00Z' };
const leads = [{ id: 'review-lead', tripId: 'KL-REVIEW-1', name: 'Sample Guest', phone: '+919000000000', email: 'guest@example.test', rawInquiry: 'A three day Kashmir holiday', summary: 'Private Kashmir holiday for two adults', score: 80, intent: 'High Intent', destination: 'Kashmir', budgetTier: 'Mid', assignedTo: 'review-agent', source: 'Website', status: 'New', createdAt: '2026-10-28T00:00:00Z', lastFollowUp: '2026-10-28T00:00:00Z', travelDate: '2026-11-20', durationDays: 3, travelers: { adults: 2, children: 0, childAges: [] }, notes: [], quotes: [] }];
const customer = { id: 'review-customer', bookingId: 'KL-REVIEW-1', name: 'Sample Guest', email: 'guest@example.test', phone: '+919000000000', destination: 'Kashmir', startDate: '2026-11-20', endDate: '2026-11-23', paxAdults: 2, paxChildren: 0, totalAmount: 32000, currency: 'INR', assignedOpsManager: 'Review', status: 'Upcoming', installments: [], hotelPayments: [], createdAt: '2026-10-28T00:00:00Z' };
const voucher = { id: 'review-voucher', bookingId: customer.bookingId, customerId: customer.id, customerName: customer.name, hotelName: 'Sample Heritage Hotel', city: 'Srinagar', checkIn: '2026-11-20', checkOut: '2026-11-23', nights: 3, roomType: 'Deluxe Double', mealPlan: 'Breakfast', supplierName: 'Sample Hotel', confirmationNumber: 'CONF-REVIEW-1', status: 'Uploaded', dueDate: '2026-11-19', urgency: 'Low', paymentStatus: 'Pending' };
function fixture(url) {
  const p = new URL(url).pathname;
  if (p === '/api/users') return [user];
  if (p === '/api/leads') return leads;
  if (p === '/api/agents') return [{ id: 'review-agent', name: 'Sample Agent', specialty: ['Kashmir'], activeLeads: 1, avatar: '' }];
  if (p === '/api/settings') return { company_name: 'Kingsland Holidays', tagline: 'Travel with confidence' };
  if (p === '/api/payments/settings') return {};
  if (p === '/api/ops/customers') return [customer];
  if (p === '/api/ops/vouchers') return [voucher];
  if (p.includes('/active')) return null;
  if (p.includes('/documents')) return { documents: [], requiredDocumentTypes: [], travellers: [] };
  if (p.includes('/client-details')) return { travellers: [], documents: [] };
  if (p.includes('/backup/')) return { snapshots: [] };
  return [];
}
async function main() {
  const harness = await build({ stdin: { contents: `
    import React from 'react'; import {createRoot} from 'react-dom/client';
    import {InvoiceModule} from './operations-team-portal/src/components/InvoiceModule';
    import {VoucherPreviewModal} from './operations-team-portal/src/components/VoucherPreviewModal';
    import {SendCustomerVoucherPdfModal} from './operations-team-portal/src/components/SendCustomerVoucherPdfModal';
    import {exportElementToPdf} from './utils/pdfExport';
    const root=createRoot(document.querySelector('#root'));
    window.mountDocument=(kind,customer,voucher)=>root.render(React.createElement('div',{className:'crm-app'},
      kind==='invoice'?React.createElement(InvoiceModule,{customers:[customer],initialCustomerId:customer.id}):
      kind==='send-voucher'?React.createElement(SendCustomerVoucherPdfModal,{isOpen:true,customer,voucher,onClose:()=>{}}):
      React.createElement(VoucherPreviewModal,{voucher,onClose:()=>{},onSendWhatsApp:()=>{}})));
    window.exportDocument=async()=>Array.from(new Uint8Array(await(await exportElementToPdf(document.querySelector('.printable-voucher-container'),{download:false,margin:5})).arrayBuffer()));
  `, resolveDir: root, loader: 'tsx' }, bundle: true, write: false, format: 'iife', alias: { react: path.join(root, 'node_modules/react'), 'react-dom': path.join(root, 'node_modules/react-dom') }, define: { 'process.env.NODE_ENV': '"production"' } });
  fs.writeFileSync(path.join(out, 'document-harness.js'), harness.outputFiles[0].text);
  const server = http.createServer((req, res) => {
    if (req.url === '/harness.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(harness.outputFiles[0].text); return; }
    if (req.url === '/harness') {
      const css = fs.readdirSync(path.join(root, 'dist/assets')).find(x => x.endsWith('.css'));
      res.setHeader('Content-Type', 'text/html');
      res.end(`<!doctype html><html><head><link rel="stylesheet" href="/assets/${css}"></head><body><div id="root"></div><script src="/harness.js"></script></body></html>`); return;
    }
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = pathname.startsWith('/ops/assets/') ? path.join(root, 'operations-team-portal/dist', pathname.slice(4)) : pathname.startsWith('/ops') ? path.join(root, 'operations-team-portal/dist/index.html') : pathname.startsWith('/assets/') ? path.join(root, 'dist', pathname) : path.join(root, 'dist/index.html');
    const ext = path.extname(file);
    res.setHeader('Content-Type', ext === '.js' ? 'text/javascript' : ext === '.css' ? 'text/css' : 'text/html');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const executablePath = [process.env.CHROME_BIN, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p => p && fs.existsSync(p));
  const browser = await puppeteer.launch({ executablePath, headless: true });
  const report = [];
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000 });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.setRequestInterception(true);
    page.on('request', async req => {
      if (req.url().startsWith(origin + '/api/')) {
        assert.equal(req.method(), 'GET', 'Theme checks must not write business records');
        return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture(req.url())) });
      }
      if (!req.url().startsWith(origin) && !req.url().startsWith('data:') && !req.url().startsWith('blob:')) return req.abort();
      return req.continue();
    });
    await page.goto(origin);
    await page.evaluate(user => localStorage.setItem('kingsland_active_user_id', user.id), user);
    if (!process.env.DOCUMENTS_ONLY) for (const theme of ['light', 'dark']) {
      for (const view of views) {
        errors.length = 0;
        await page.evaluate(({ theme, view }) => { localStorage.setItem('kingsland_theme', theme); localStorage.setItem('kingsland_active_view', view); }, { theme, view });
        await page.reload({ waitUntil: 'networkidle0' });
        await page.waitForSelector('.crm-app');
        assert.equal(errors.length, 0, `${theme}/${view}: ${errors.join('; ')}`);
        assert.equal(await page.$eval('html', el => el.classList.contains('dark')), theme === 'dark');
        assert(!await page.$eval('body', el => el.textContent.includes('Application Error')), view);
        const body = await page.$eval('body', el => getComputedStyle(el).backgroundColor);
        assert.equal(body, theme === 'dark' ? 'rgb(15, 23, 42)' : 'rgb(248, 250, 252)');
        if (['Dashboard', 'Leads', 'Settings', 'Payments', 'Accounts'].includes(view)) await page.screenshot({ path: path.join(out, `${theme}-${view.toLowerCase()}.png`) });
        report.push(`${theme}: ${view}`);
      }
      for (const tab of ['customer', 'pending-vouchers', 'uploaded-vouchers', 'upcoming-trips', 'day-wise-trip', 'cab-logistics', 'completed-trips', 'invoices']) {
        errors.length = 0;
        await page.evaluate(tab => { localStorage.setItem('kingsland_active_view', 'Operations'); localStorage.setItem('kingsland_ops_tab', tab); }, tab);
        await page.reload({ waitUntil: 'networkidle0' });
        assert.equal(errors.length, 0, `${theme}/Operations/${tab}: ${errors}`);
        report.push(`${theme}: Operations/${tab}`);
      }
    }
    // Exercise the real toggle and reload persistence.
    await page.evaluate(() => { localStorage.setItem('kingsland_active_view', 'Dashboard'); localStorage.setItem('kingsland_theme', 'light'); });
    await page.reload({ waitUntil: 'networkidle0' });
    await page.click('button[title="Switch to Dark Mode"]');
    assert.equal(await page.evaluate(() => localStorage.getItem('kingsland_theme')), 'dark');
    await page.reload({ waitUntil: 'networkidle0' });
    assert(await page.$eval('html', el => el.classList.contains('dark')));
    // Native focus must remain visible, including when no mouse is used.
    await page.focus('button[title="Switch to Light Mode"]');
    assert.equal(await page.$eval('button[title="Switch to Light Mode"]', el => getComputedStyle(el).outlineStyle), 'solid');
    for (const kind of ['invoice', 'voucher', 'send-voucher']) {
      let lightColors;
      for (const theme of ['light', 'dark']) {
        await page.goto(origin + '/harness', { waitUntil: 'networkidle0' });
        await page.evaluate(({ theme, kind, customer, voucher }) => { document.documentElement.className = theme; window.mountDocument(kind, customer, voucher); }, { theme, kind, customer, voucher });
        const selector = kind === 'send-voucher' ? '.doc-preview-protected' : '.printable-voucher-container';
        await page.waitForSelector(selector, { timeout: 10000 }).catch(async error => {
          await page.screenshot({ path: path.join(out, `failed-${kind}.png`), fullPage: true });
          throw new Error(`${kind}: ${errors.join('; ')}; ${await page.$eval('body', el => el.innerText.slice(0, 500))}; ${error}`);
        });
        const colors = await page.$eval(selector, el => ({ background: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color, ink: Array.from(el.querySelectorAll('td, th, p')).map(node => getComputedStyle(node).color) }));
        assert.equal(colors.background, 'rgb(255, 255, 255)', `${kind} must stay white in ${theme}`);
        if (theme === 'light') lightColors = colors;
        else assert.deepEqual(colors, lightColors, `${kind} ink must not change with CRM theme`);
        await page.screenshot({ path: path.join(out, `${theme}-${kind}.png`), fullPage: true });
        if (kind !== 'send-voucher') {
          const bytes = Buffer.from(await page.evaluate(() => window.exportDocument()));
          const pdf = await PDFDocument.load(bytes);
          assert(pdf.getPageCount() > 0 && pdf.getPageCount() < 12, `${kind} valid page count`);
          fs.writeFileSync(path.join(out, `${theme}-${kind}.pdf`), bytes);
          report.push(`${theme}: ${kind} PDF (${pdf.getPageCount()} pages)`);
        }
      }
    }
    // Compact navigation should leave usable workspace at phone width.
    await page.setViewport({ width: 390, height: 844 });
    await page.goto(origin, { waitUntil: 'networkidle0' });
    assert.equal(await page.$eval('.crm-sidebar', el => el.getBoundingClientRect().width), 64);
    await page.screenshot({ path: path.join(out, 'mobile-dashboard.png') });
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => localStorage.setItem('kingsland_theme', theme), theme);
      await page.goto(origin + '/ops/', { waitUntil: 'networkidle0' });
      assert.equal(await page.$eval('html', el => el.classList.contains('dark')), theme === 'dark');
      assert.equal(await page.$eval('body', el => getComputedStyle(el).backgroundColor), theme === 'dark' ? 'rgb(15, 23, 42)' : 'rgb(248, 250, 252)');
      report.push(`${theme}: standalone Operations`);
    }
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2));
    console.log(`PASS: ${report.length} screen/document checks, theme toggle, persistence, focus and compact navigation. Artifacts: ${out}`);
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
