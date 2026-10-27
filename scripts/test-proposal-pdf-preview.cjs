const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const esbuild = require(path.join(root, 'node_modules/esbuild'));
const puppeteer = require(path.join(root, 'node_modules/puppeteer-core'));
const { PDFDocument } = require(path.join(root, 'node_modules/pdf-lib'));

(async () => {
  const result = await esbuild.build({ stdin: {
    contents: `import React from 'react';import {createRoot} from 'react-dom/client';import Preview from './components/ProposalPdfPreview';
      const root=createRoot(document.querySelector('#root'));const ref=React.createRef();const partners=[];
      window.mountPreview=(quoteData,designId)=>root.render(React.createElement(Preview,{ref,quoteData,designId,partnerBrands:partners}));
      window.previewDownloadBytes=async()=>Array.from(new Uint8Array(await(await ref.current.getPdf()).arrayBuffer()));window.unmountPreview=()=>root.unmount();`,
    resolveDir: root, loader: 'tsx',
  }, bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"development"' } });
  const serverPdf = await PDFDocument.create();
  serverPdf.addPage().drawText('Server-rendered proposal, page 1');
  serverPdf.addPage().drawText('Server-rendered proposal, page 2');
  const serverBytes = Buffer.from(await serverPdf.save());
  const chrome = [process.env.CHROME_BIN, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => p && fs.existsSync(p));
  assert(chrome, 'Set CHROME_BIN to Chrome/Chromium');
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 900 });
    let serverAvailable = true;
    const requests = [];
    await page.setRequestInterception(true);
    page.on('request', async request => {
      if (request.url().endsWith('/api/pdf-designs/render-pdf')) {
        requests.push(JSON.parse(request.postData()));
        await request.respond(serverAvailable ? { status: 200, contentType: 'application/pdf', body: serverBytes } : { status: 503, contentType: 'application/json', body: '{"error":"test unavailable"}' });
      } else if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
        await request.respond({ status: 200, contentType: 'text/html', body: '<html><head><style>*{box-sizing:border-box}body{margin:0}iframe{width:100%}</style></head><body><div id="root"></div></body></html>' });
      } else {
        await request.continue();
      }
    });
    await page.goto('http://preview.test/');
    await page.addScriptTag({ content: result.outputFiles[0].text });
    const hotel = { nights: '2 Nights', name: 'Test Hotel', type: '3 Star', room: 'Standard', rooms: '2 Adults', city: 'Gangtok' };
    const quote = { client: 'Preview Test Guest', ref: 'PREVIEW-1', packageName: 'Preview consistency', longDuration: '2 Nights / 3 Days', duration: '2N / 3D', city: 'Gangtok', services: 'Cab, Hotel', travellers: '2 Adults', priceNote: 'Private tour', price: '₹25,000', hotel, hotels: [hotel], included: ['Hotel', 'Breakfast'], excluded: ['Flights'], days: Array.from({ length: 3 }, (_, i) => ({ title: 'Day ' + (i+1), text: 'Sightseeing and hotel stay. '.repeat(8) })) };
    await page.evaluate(quote => {
      window.__downloadClicks = 0;
      const click = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function () { if (this.download) window.__downloadClicks++; return click.call(this); };
      window.mountPreview(quote, 'royal');
    }, quote);
    await page.waitForSelector('iframe[title="Proposal PDF preview"]');
    const readPreview = () => page.evaluate(async () => Array.from(new Uint8Array(await (await fetch(document.querySelector('iframe[title="Proposal PDF preview"]').src.split('#')[0])).arrayBuffer())));
    assert.deepEqual(Buffer.from(await readPreview()), serverBytes, 'Preview must show the server PDF');
    assert.deepEqual(Buffer.from(await page.evaluate(() => window.previewDownloadBytes())), serverBytes, 'Download must reuse the exact server PDF');
    assert.equal(requests.length, 1, 'Preview + download must generate only once');
    console.log('PASS: server preview and download contain identical bytes; one generation');

    const previousUrl = await page.$eval('iframe[title="Proposal PDF preview"]', el => el.src);
    serverAvailable = false;
    await page.evaluate(quote => window.mountPreview(quote, 'alpine'), quote);
    await page.waitForFunction(previous => {
      const preview = document.querySelector('iframe[title="Proposal PDF preview"]');
      return preview && preview.src !== previous;
    }, { timeout: 60000 }, previousUrl);
    const fallbackPreview = Buffer.from(await readPreview());
    const fallbackDownload = Buffer.from(await page.evaluate(() => window.previewDownloadBytes()));
    assert.deepEqual(fallbackPreview, fallbackDownload, 'Browser fallback preview/download must contain identical bytes');
    assert.equal(fallbackPreview.subarray(0,5).toString(), '%PDF-', 'Fallback must produce a valid PDF');
    assert((await PDFDocument.load(fallbackPreview)).getPageCount() >= 3, 'Fallback must preserve paginated cover, itinerary, terms');
    assert.equal(requests.length, 2, 'Theme switch should generate once; download must reuse it');
    assert.equal(requests[1].designId, 'alpine', 'Theme switch must refresh the PDF');
    assert.equal(await page.evaluate(() => window.__downloadClicks), 0, 'Preview must never automatically download a file');
    console.log('PASS: browser fallback preview/download identical; theme refresh; no automatic download');
    const out = path.join(os.tmpdir(), 'kingsland-pdf-preview');
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'fallback-preview.pdf'), fallbackPreview);
    await page.waitForNetworkIdle({ idleTime: 750, timeout: 10000 });
    await page.screenshot({ path: path.join(out, 'preview.png'), fullPage: true });
    const activeUrl = await page.$eval('iframe[title="Proposal PDF preview"]', el => el.src.split('#')[0]);
    await page.evaluate(() => window.unmountPreview());
    assert.equal(await page.evaluate(async url => { try { await fetch(url); return true; } catch { return false; } }, activeUrl), false, 'Unmount must revoke preview URL');
    console.log('PASS: preview URL cleaned up on close');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
