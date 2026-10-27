const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const esbuild=require(path.join(root,'node_modules/esbuild'));
const puppeteer=require(path.join(root,'node_modules/puppeteer-core'));
const {PDFDocument}=require(path.join(root,'node_modules/pdf-lib'));
const out=path.join(os.tmpdir(),'kingsland-continuous-terms');
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const exporter=fs.readFileSync(path.join(root,'utils/pdfExport.ts'),'utf8')
    .replace('await pdf.save(finalName, { returnPromise: true });','window.__pdfBytes=Array.from(new Uint8Array(pdf.output("arraybuffer")));')
    .replace('if (pageCount > 0) {','(window.__slices ||= []).push({start:currentStartY,end:currentStartY+sliceH}); if (pageCount > 0) {')
    .replace('const containerRect = contClone.getBoundingClientRect();',`const containerRect=contClone.getBoundingClientRect();
      window.__termsPosition={lastDayBottom:contClone.querySelector('.day-card-wrapper:last-child').getBoundingClientRect().bottom-containerRect.top,termsTop:contClone.querySelector('.terms-title').getBoundingClientRect().top-containerRect.top,firstFeeBottom:contClone.querySelector('.terms-flow table tbody tr').getBoundingClientRect().bottom-containerRect.top};`);
  const built=await esbuild.build({stdin:{contents:'import {renderCompleteProposalHtml} from "./services/quoteDesignRenderer";import {exportElementToPdf} from "./utils/pdfExport";window.renderQuote=renderCompleteProposalHtml;window.exportQuote=exportElementToPdf;',resolveDir:root},bundle:true,write:false,format:'iife',plugins:[{name:'capture',setup(build){build.onLoad({filter:/utils[\\/]pdfExport\.ts$/},()=>({contents:exporter,loader:'ts',resolveDir:path.join(root,'utils')}));}}]});
  await esbuild.build({stdin:{contents:fs.readFileSync(path.join(root,'server/services/proposalPdfPagination.ts'),'utf8'),resolveDir:path.join(root,'server/services'),loader:'ts'},platform:'node',bundle:true,format:'cjs',outfile:path.join(out,'server.cjs')});
  const {renderProposalPdfPages}=require(path.join(out,'server.cjs'));
  const chrome=[process.env.CHROME_BIN,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','/usr/bin/google-chrome','/usr/bin/chromium'].find(p=>p&&fs.existsSync(p));
  assert(chrome,'Set CHROME_BIN to Chrome/Chromium');
  const browser=await puppeteer.launch({executablePath:chrome,headless:true});
  try {
    for(const theme of ['royal','alpine','sunset','editorial','playful','diwali']) {
      const page=await browser.newPage();await page.setViewport({width:794,height:1123});
      await page.setContent('<html><head><style>@page{size:A4 portrait;margin:0}*{box-sizing:border-box}body{margin:0}.sheet:not(.sheet-terms){height:1120px!important;break-after:page}.sheet:last-child{break-after:auto}</style></head><body><div id="proposal"></div></body></html>');
      await page.addScriptTag({content:built.outputFiles[0].text});
      const hotel={nights:'1 Night',name:'Test Hotel',type:'3 Star',room:'Standard',rooms:'2 Adults',city:'Gangtok'};
      const quote={client:'Terms Flow Guest',ref:'TERMS-FLOW-1',packageName:'Continuous terms test',longDuration:'1 Night / 1 Day',duration:'1N / 1D',city:'Gangtok',services:'Hotel, Cab',travellers:'2 Adults',priceNote:'Private tour',price:'₹10,000',hotel,hotels:[hotel],included:['Hotel stay'],excluded:['Personal expenses'],days:[{title:'Arrival and sightseeing',text:'Explore the town and return to your hotel. End of itinerary.'}]};
      await page.evaluate((q,theme)=>{document.querySelector('#proposal').innerHTML=window.renderQuote(q,theme);},quote,theme);
      assert.equal(await page.$$('.sheet-terms').then(items=>items.length),0,`${theme}: terms must not be a separate sheet`);
      assert(await page.$('.itin-content-cell .terms-flow'),`${theme}: terms missing from itinerary flow`);
      await page.evaluate(()=>window.exportQuote(document.querySelector('#proposal'),{margin:0,width:794,scale:1}));
      const result=await page.evaluate(()=>({position:window.__termsPosition,slices:window.__slices,bytes:window.__pdfBytes}));
      const lastDayPage=result.slices.findIndex(s=>result.position.lastDayBottom>s.start&&result.position.lastDayBottom<=s.end);
      const termsPage=result.slices.findIndex(s=>result.position.termsTop>=s.start&&result.position.firstFeeBottom<=s.end);
      assert.equal(termsPage,lastDayPage,`${theme}: terms should begin on the same page as the last day when space exists`);
      assert(result.position.termsTop-result.position.lastDayBottom<70,`${theme}: unnecessary gap before terms`);
      const client=Uint8Array.from(result.bytes);await PDFDocument.load(client);
      fs.writeFileSync(path.join(out,theme+'-client.pdf'),client);
      const content=await page.$eval('#proposal',el=>el.innerHTML);const html=await page.content();
      const server=await renderProposalPdfPages(page,html,content);await PDFDocument.load(server);
      fs.writeFileSync(path.join(out,theme+'-server.pdf'),server);
      console.log(`${theme}: PASS; terms and first policy rows start immediately after the last day on the same page`);
      await page.close();
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
