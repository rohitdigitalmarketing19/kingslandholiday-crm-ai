const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const esbuild = require(path.join(root, 'node_modules/esbuild'));
const puppeteer = require(path.join(root, 'node_modules/puppeteer-core'));
const { PDFDocument } = require(path.join(root, 'node_modules/pdf-lib'));
const out = path.join(os.tmpdir(), 'kingsland-itinerary-bottom-gaps');

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const exporter = fs.readFileSync(path.join(root, 'utils/pdfExport.ts'), 'utf8')
    .replace('await pdf.save(finalName, { returnPromise: true });', 'window.__pdfBytes=Array.from(new Uint8Array(pdf.output("arraybuffer")));')
    .replace('if (pageCount > 0) {', '(window.__slices ||= []).push({used:sliceH,capacity:standardPageCanvasH}); if (pageCount > 0) {');
  const bundle = await esbuild.build({
    stdin: { contents: 'import {renderCompleteProposalHtml} from "./services/quoteDesignRenderer";import {exportElementToPdf} from "./utils/pdfExport";window.renderQuote=renderCompleteProposalHtml;window.exportQuote=exportElementToPdf;', resolveDir: root },
    bundle: true, write: false, format: 'iife', plugins: [{ name: 'capture-test-pdf', setup(build) {
      build.onLoad({ filter: /utils[\\/]pdfExport\.ts$/ }, () => ({ contents: exporter, loader: 'ts', resolveDir: path.join(root, 'utils') }));
    } }],
  });
  const chrome = [process.env.CHROME_BIN, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => p && fs.existsSync(p));
  assert(chrome, 'Set CHROME_BIN to an installed Chrome/Chromium executable');
  const browser = await puppeteer.launch({ executablePath: chrome, headless: true });
  try {
    for (const theme of ['royal', 'alpine', 'sunset', 'editorial', 'playful', 'diwali']) {
      const page = await browser.newPage();
      await page.setViewport({ width: 794, height: 1123 });
      await page.setContent('<html><head><style>*{box-sizing:border-box}body{margin:0;padding:0}</style></head><body><div id="proposal"></div></body></html>');
      await page.addScriptTag({ content: bundle.outputFiles[0].text });
      const img = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="300"><rect width="800" height="300" fill="#447b8c"/><path d="M0 250L200 40L400 220L600 50L800 250" fill="#d4d9bb"/></svg>').toString('base64');
      const hotel = { nights: 'All Nights', name: 'Handpicked Hotel', type: '3 Star', room: 'Standard Room', rooms: '2 Adults', city: 'Gangtok' };
      const quote = { client: 'Regression Guest', ref: 'Trip-10013', packageName: '5 Days (2N GTK / 2N DJ)', longDuration: '4 Nights / 5 Days', duration: '4N / 5D', city: 'Gangtok', services: 'Cab, Hotel, Sightseeing', travellers: '2 Adults', priceNote: 'Private Vehicle & Handpicked Stays', price: '₹50,000', rawPrice: 50000, hotel, hotels: Array.from({ length: 3 }, (_, i) => ({ ...hotel, nights: 'Night ' + (i + 1) })), flightDetails: 'Flight details as selected', cabDetails: 'Private transfers', included: ['Accommodation on Double', 'Meals: Breakfast', 'Cab / Transit: private transfer', 'Flight: subject to the selected flight details and availability', 'Sightseeing as per day itinerary'], excluded: ['Personal expenses (laundry, beverages)', 'Monument entry fees & camera permits', 'GST as applicable', 'Tips to driver & guides'], days: JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/itinerary-bottom-gaps.json'), 'utf8')).map(day => ({ ...day, img })) };
      await page.evaluate((quote, theme) => { document.querySelector('#proposal').innerHTML = window.renderQuote(quote, theme); }, quote, theme);
      await page.evaluate(() => window.exportQuote(document.querySelector('#proposal'), { margin: 0, width: 794, scale: 1 }));
      const result = await page.evaluate(() => ({ slices: window.__slices, bytes: window.__pdfBytes }));
      assert(result.slices.length >= 2, `${theme}: expected a multi-page itinerary`);
      // The last page may be partly occupied; every earlier itinerary page
      // must use at least 90% of its height in this boundary regression case.
      for (const slice of result.slices.slice(0, -1)) assert(slice.used / slice.capacity > 0.9, `${theme}: large bottom gap (${Math.round((1-slice.used/slice.capacity)*100)}%)`);
      const bytes = Uint8Array.from(result.bytes);
      const pdf = await PDFDocument.load(bytes);
      assert(pdf.getPageCount() >= 4 && pdf.getPageCount() <= 5, `${theme}: unexpected page count`);
      fs.writeFileSync(path.join(out, theme + '.pdf'), bytes);
      console.log(`${theme}: PASS; non-final itinerary utilization ${result.slices.slice(0,-1).map(s => Math.round(s.used/s.capacity*100)+'%').join(', ')}`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
