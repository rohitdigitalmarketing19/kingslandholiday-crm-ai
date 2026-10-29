const fs=require('fs'),path=require('path'),assert=require('assert/strict'),os=require('os');
const root=path.resolve(__dirname,'..');const esbuild=require(path.join(root,'node_modules/esbuild')),puppeteer=require(path.join(root,'node_modules/puppeteer-core'));const {PDFDocument}=require(path.join(root,'node_modules/pdf-lib'));
(async()=>{
 const exporter=fs.readFileSync(path.join(root,'utils/pdfExport.ts'),'utf8').replaceAll('onclone: normalizePdfColors,','onclone: doc => { window.__capturedCrm.push(!!doc.querySelector("#unrelated-crm")); normalizePdfColors(doc); },');
 const built=await esbuild.build({stdin:{contents:'import {exportElementToPdf} from "./utils/pdfExport";window.runExport=exportElementToPdf;',resolveDir:root},bundle:true,write:false,format:'iife',plugins:[{name:'inspect-capture',setup(b){b.onLoad({filter:/utils[\\/]pdfExport\.ts$/},()=>({contents:exporter,loader:'ts',resolveDir:path.join(root,'utils')}));}}]});
 const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage();await page.setContent('<html><head><style>body{margin:0}.price{color:oklch(.5 .1 240)}</style></head><body><div id="unrelated-crm"></div><div id="pdf"></div></body></html>');await page.addScriptTag({content:built.outputFiles[0].text});
  const result=await page.evaluate(async()=>{
   window.__capturedCrm=[];
   document.querySelector('#unrelated-crm').innerHTML=Array.from({length:4000},(_,i)=>'<div>CRM row '+i+'<span>Customer status</span></div>').join('');
   const source=document.querySelector('#pdf');source.innerHTML=Array.from({length:4},(_,i)=>'<div class="pdf-page" style="width:794px;height:1123px;background:white"><h1>Proposal page '+(i+1)+'</h1><p class="price">Actual package price</p><div style="height:400px;background:#1b2b54"></div></div>').join('');
   const start=performance.now();const blob=await window.runExport(source,{download:false,scale:2});return{ms:Math.round(performance.now()-start),bytes:Array.from(new Uint8Array(await blob.arrayBuffer())),capturedCrm:window.__capturedCrm,crmStillPresent:document.querySelector('#unrelated-crm').children.length};
  });
  assert.deepEqual(result.capturedCrm,[false,false,false,false],'Each capture must exclude unrelated CRM and other preview branches');assert.equal(result.crmStillPresent,4000,'Live CRM must be untouched');const pdf=await PDFDocument.load(Uint8Array.from(result.bytes));assert.equal(pdf.getPageCount(),4);const out=path.join(os.tmpdir(),'kingsland-export-isolation.pdf');fs.writeFileSync(out,Buffer.from(result.bytes));console.log('PASS four pages at scale 2; unrelated CRM excluded on every capture; live DOM unchanged; modern CSS normalized. Export '+result.ms+'ms.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
