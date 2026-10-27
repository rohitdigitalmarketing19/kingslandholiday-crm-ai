const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const esbuild = require(path.join(root, 'node_modules/esbuild'));
const puppeteer = require(path.join(root, 'node_modules/puppeteer-core'));
const { PDFDocument } = require(path.join(root, 'node_modules/pdf-lib'));
const out = path.join(os.tmpdir(), 'kingsland-itinerary-preserved-images');

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const exporter = fs.readFileSync(path.join(root, 'utils/pdfExport.ts'), 'utf8')
    .replace('await pdf.save(finalName, { returnPromise: true });', 'window.__pdfBytes=Array.from(new Uint8Array(pdf.output("arraybuffer")));')
    .replace('if (pageCount > 0) {', '(window.__slices ||= []).push({start:currentStartY,end:currentStartY+sliceH}); if (pageCount > 0) {')
    .replace('const containerRect = contClone.getBoundingClientRect();', `const containerRect = contClone.getBoundingClientRect();
      window.__photos=Array.from(contClone.querySelectorAll('.day-img-box')).map(el=>{const r=el.getBoundingClientRect();return {top:r.top-containerRect.top,bottom:r.bottom-containerRect.top,height:r.height,width:r.width,html:el.innerHTML}});
      window.__descriptions=Array.from(contClone.querySelectorAll('.day-text')).map(el=>{const r=el.getBoundingClientRect();return {top:r.top-containerRect.top,bottom:r.bottom-containerRect.top}});`);
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
      // This description must span pages. Its photo must stay at its original
      // size on one page, while text below it can continue onto another page.
      quote.days[1].text = Array(5).fill(quote.days[1].text).join('\n');
      await page.evaluate((quote, theme) => { document.querySelector('#proposal').innerHTML = window.renderQuote(quote, theme); }, quote, theme);
      const originals = await page.evaluate(() => Array.from(document.querySelectorAll('.day-img-box')).map(el => { const r=el.getBoundingClientRect(); return {height:r.height,width:r.width,html:el.innerHTML}; }));
      await page.evaluate(() => window.exportQuote(document.querySelector('#proposal'), { margin: 0, width: 794, scale: 1 }));
      const result = await page.evaluate(() => ({ slices: window.__slices, bytes: window.__pdfBytes, photos:window.__photos, descriptions:window.__descriptions }));
      assert(result.slices.length >= 2, `${theme}: expected a multi-page itinerary`);
      assert.equal(result.photos.length, originals.length, `${theme}: missing photo`);
      for (let i=0;i<result.photos.length;i++) {
        const photo=result.photos[i], original=originals[i];
        assert(Math.abs(photo.height-original.height)<1, `${theme}: photo ${i+1} resized vertically`);
        assert(Math.abs(photo.width-original.width)<1, `${theme}: photo ${i+1} resized horizontally`);
        assert.equal(photo.html,original.html,`${theme}: photo source or image styling modified`);
        assert(result.slices.some(s=>photo.top>=s.start-1 && photo.bottom<=s.end+1),`${theme}: photo ${i+1} split across pages`);
      }
      assert(result.descriptions.some(d=>result.slices.some(s=>d.top<s.end && d.bottom>s.end)),`${theme}: long text did not continue across a page break`);
      const bytes = Uint8Array.from(result.bytes);
      const pdf = await PDFDocument.load(bytes);
      assert(pdf.getPageCount() >= 4 && pdf.getPageCount() <= 10, `${theme}: unexpected page count`);
      fs.writeFileSync(path.join(out, theme + '.pdf'), bytes);
      console.log(`${theme}: PASS; ${result.photos.length} photos unchanged and uncut; long description continues across pages`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
