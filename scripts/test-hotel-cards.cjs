const assert = require('node:assert/strict');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
(async () => {
 const { renderHotelOptionTables, renderCompleteProposalHtml, AVAILABLE_QUOTE_DESIGNS } = await import(pathToFileURL(require('node:path').resolve('services/quoteDesignRenderer.ts')).href);
 const hotel = { nights:'1 Night', city:'Jaisalmer', name:'Golden Signature', room:'Standard', mealPlan:'CPAI Breakfast', type:'3 Star', rooms:'' };
 const q = { price:'₹17,500', discountPercent:10, hotels:[hotel, {...hotel,city:'Sam',name:'Royal Jaisalmer Resort'}], hotelAlternative:{price:'₹18,800',hotels:[{...hotel,name:'Jaigarh Palace'},{...hotel,city:'Sam',name:'NK Desert Camp Resort'}]} };
 const html = renderHotelOptionTables(q);
 assert(!html.includes('<table'));
 for (const text of ['₹19,250','₹20,680','₹17,500','₹18,800','1 NIGHT','Jaigarh Palace']) assert(html.includes(text),text);
 assert(!renderHotelOptionTables({...q,discountPercent:0}).includes('hotel-option-cut-price'));
 assert(renderHotelOptionTables({...q,hotels:[{...hotel,name:'<script>unsafe</script>'}]}).includes('&lt;script&gt;'));
 assert.equal(q.price,'₹17,500');
 fs.mkdirSync('tmp/hotel-cards',{recursive:true});
 const puppeteer=require('puppeteer-core');
 const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try {
  const page=await browser.newPage();await page.setViewport({width:900,height:650});
  await page.setContent('<html><meta charset="utf-8"><body style="margin:30px;background:#fcfaf5;font-family:Arial">'+html+'</body></html>');
  const overflow=await page.evaluate(()=>[...document.querySelectorAll('.hotel-option-card')].some(el=>el.scrollWidth>el.clientWidth));assert(!overflow);
  await page.screenshot({path:'tmp/hotel-cards/preview.png',fullPage:true});
  const full={...q,client:'Test Guest',ref:'TEST-001',packageName:'Jaisalmer Escape',longDuration:'2 Nights / 3 Days',duration:'2N / 3D',city:'Jaisalmer',services:'Hotel & Cab',travellers:'2 Adults',priceNote:'Total package',hotel, included:['Stay','Breakfast'],excluded:['Air fare'],days:[{title:'Arrival',text:'Hotel check-in'},{title:'Desert visit',text:'Sam dunes'},{title:'Departure',text:'Transfer'}]};
  for(const design of AVAILABLE_QUOTE_DESIGNS){
   await page.setContent(renderCompleteProposalHtml(full,design.id));
   assert.equal(await page.$$('.hotel-option-card').then(x=>x.length),2,design.id);
   const clipped=await page.evaluate(()=>[...document.querySelectorAll('.hotel-option-card')].some(card=>{const sheet=card.closest('.sheet');return sheet && card.getBoundingClientRect().bottom > sheet.getBoundingClientRect().bottom;}));
   assert(!clipped,design.id+' cards clipped');
   if(design.id==='royal')await page.pdf({path:'tmp/hotel-cards/proposal.pdf',printBackground:true,width:'794px',height:'1123px',preferCSSPageSize:true});
  }

 } finally {await browser.close();}
 console.log('PASS hotel cards: both prices and uplifts, zero uplift, price differences, escaping, unchanged price, layout and screenshot.');
})().catch(e=>{console.error(e);process.exitCode=1});
