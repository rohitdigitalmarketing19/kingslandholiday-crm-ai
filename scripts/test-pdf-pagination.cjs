const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const esbuild = require(root + '/node_modules/esbuild');
const puppeteer = require(root + '/node_modules/puppeteer-core');
const { PDFDocument } = require(root + '/node_modules/pdf-lib');
const staged = true;
const out = path.join(require('os').tmpdir(), 'kingsland-pdf-bottom-regression');
fs.mkdirSync(out, { recursive: true });
const renderer = fs.readFileSync(root+'/services/quoteDesignRenderer.ts','utf8');
const exporter = fs.readFileSync(root+'/utils/pdfExport.ts','utf8').replace('await pdf.save(finalName, { returnPromise: true });', 'window.__pdfResult = Array.from(new Uint8Array(pdf.output("arraybuffer")));');
const plugin = { name:'staged-source', setup(build) {
  build.onLoad({filter:/quoteDesignRenderer\.ts$/},()=>({contents:renderer,loader:'ts',resolveDir:root+'/services'}));
  build.onLoad({filter:/utils[\\/]pdfExport\.ts$/},()=>({contents:exporter,loader:'ts',resolveDir:root+'/utils'}));
}};
(async()=>{
  const built = await esbuild.build({stdin:{contents:'import * as renderer from "./services/quoteDesignRenderer"; import {exportElementToPdf} from "./utils/pdfExport"; window.renderProposal=renderer.renderCompleteProposalHtml; window.fitTerms=renderer["fitProposalTermsSheets"]; window.runExport=exportElementToPdf;',resolveDir:root},bundle:true,write:false,format:'iife',plugins:[plugin]});
  await esbuild.build({stdin:{contents:fs.readFileSync(root+'/server/services/proposalPdfPagination.ts','utf8'),resolveDir:root+'/server/services',loader:'ts'},platform:'node',bundle:true,format:'cjs',outfile:path.join(out,'pagination.cjs')}); const {renderProposalPdfPages}=require(path.join(out,'pagination.cjs')); const browser = await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try {
    const results=[];
    for(const theme of ['royal','alpine','sunset','editorial','playful','diwali']) {
      const page=await browser.newPage();
      await page.setViewport({width:1000,height:1200});
      await page.setContent('<html><head><style>*{box-sizing:border-box}body{margin:0}</style></head><body><div id="proposal"></div></body></html>');
      await page.addScriptTag({content:built.outputFiles[0].text});
      await page.evaluate((theme)=>{
        const hotel={nights:'4 Nights',name:'Premium Mountain Hotel',type:'4 Star',room:'Deluxe Room',rooms:'2 Adults',city:'Manali'};
        const q={client:'PDF Regression Guest',ref:'TEST-1001',packageName:'Himachal Option 1',longDuration:'4 Nights / 5 Days',duration:'4N / 5D',city:'Manali',services:'Cab, Hotel, Sightseeing',travellers:'2 Adults',priceNote:'All taxes included',price:'₹35,500',hotel,hotels:[hotel],included:['Hotel stay','Breakfast and dinner','Private cab','Sightseeing','All tolls and parking'],excluded:['Personal expenses','Flights and trains'],days:Array.from({length:5},(_,i)=>({title:'Day '+(i+1)+' Scenic mountain sightseeing',text:'Breakfast at hotel. Enjoy local sightseeing, scenic mountain viewpoints, markets and cultural landmarks. Return to the hotel for dinner and an overnight stay. '.repeat(3)}))};
        document.querySelector('#proposal').innerHTML=window.renderProposal(q,theme);
      },theme);
      await page.evaluate(()=>window.runExport(document.querySelector('#proposal'),{margin:0,width:794,scale:1}));
      const bytes=Uint8Array.from(await page.evaluate(()=>window.__pdfResult));
      fs.writeFileSync(path.join(out,theme+'.pdf'),bytes);
      const pdf=await PDFDocument.load(bytes);
      // Export works on a clone; separately inspect the shared layout adjustment.
      const metric=await page.evaluate(()=>{
        if(window.fitTerms) window.fitTerms();
        const sheet=document.querySelector('.sheet-terms');
        const grid=sheet.querySelector('.terms-content-grid') || sheet.children[1];
        const partner=grid.nextElementSibling;
        const rect=grid.getBoundingClientRect();
        let bottom=rect.bottom;
        for(const el of grid.querySelectorAll('*')) bottom=Math.max(bottom,el.getBoundingClientRect().bottom);
        return {overlap:Math.max(0,bottom-partner.getBoundingClientRect().top),height:sheet.getBoundingClientRect().height};
      });
      await (await page.$('.sheet-terms')).screenshot({path:path.join(out,theme+'-terms.png')});
      await page.addStyleTag({content:'@page{size:A4 portrait;margin:0}'+(staged ? '.sheet:not(.sheet-terms){height:1120px!important;min-height:1120px;max-height:1120px;break-after:page}table.itinerary-table{break-before:page}.sheet:last-child{break-after:auto}' : '')});
      const content=await page.evaluate(()=>document.querySelector('#proposal').innerHTML); const full=await page.content(); const serverBytes=await renderProposalPdfPages(page,full,content);
      fs.writeFileSync(path.join(out,theme+'-chromium.pdf'),serverBytes);
      const serverPdf=await PDFDocument.load(serverBytes);
      results.push({theme,pages:pdf.getPageCount(),serverPages:serverPdf.getPageCount(),...metric});
      console.log(JSON.stringify(results.at(-1)));
      await page.close();
    }
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
    if(results.some(r=>r.overlap>1 || r.pages!==4 || r.serverPages!==4)) throw Error('PDF pagination or terms regression detected');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});



