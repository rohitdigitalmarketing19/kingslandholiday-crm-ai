const assert = require('assert/strict'), fs = require('fs'), os = require('os'), path = require('path');
const {pathToFileURL} = require('url');
(async () => {
  const root = path.resolve(__dirname,'..'), output = path.join(root,'tmp','data-entry-ui'); fs.mkdirSync(output,{recursive:true});
  process.env.DATABASE_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(),'kingsland-entry-ui-')),'test.db');
  for (const key of ['SUPABASE_URL','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_API_KEY','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_KEY']) process.env[key]='';
  const load = file=>import(pathToFileURL(path.join(root,file)).href);
  const db = await load('server/db/connection.ts'); await db.initDb(); (await load('server/db/schema.ts')).initializeDatabase();
  db.runQuery("INSERT INTO users(id,name,email,role,status,access_level) VALUES ('ui-admin','UI Admin','ui-admin@example.test','Admin','Active','Editor')");
  const {createSession,apiAuthorization} = await load('server/middleware/auth.ts'); let cookie;
  createSession('ui-admin',{cookie:(name,value)=>cookie={name,value}});
  const esbuild=require('esbuild');
  const bundle=await esbuild.build({stdin:{contents:"import React from 'react';import {createRoot} from 'react-dom/client';import B2BDataView from './components/B2BDataView';createRoot(document.getElementById('root')).render(<main style={{padding:16}}><B2BDataView/></main>);",resolveDir:root,loader:'tsx'},bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"'}});
  const express=(await import('express')).default, app=express();app.use(express.json({limit:'15mb'}));app.use('/api',apiAuthorization);
  app.use('/api/hotel-rates',(await load('server/routes/hotelRates.ts')).default);app.use('/api/b2b-data',(await load('server/routes/b2bData.ts')).default);app.use('/api/public/data-entry',(await load('server/routes/publicDataEntry.ts')).default);
  const css=fs.readdirSync(path.join(root,'dist/assets')).find(name=>name.endsWith('.css'));
  app.get('/test/admin',(_req,res)=>res.send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/assets/${css}"></head><body><div id="root"></div><script>${bundle.outputFiles[0].text}</script></body></html>`));
  app.use(express.static(path.join(root,'dist')));app.get('*',(_req,res)=>res.sendFile(path.join(root,'dist/index.html')));
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));const base=`http://127.0.0.1:${server.address().port}`;
  const puppeteer=require('puppeteer-core');const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try {
    const page=await browser.newPage(), errors=[]; page.on('pageerror',error=>errors.push(error.message));
    await page.setRequestInterception(true);page.on('request',request=>request.url().startsWith(base)||request.url().startsWith('blob:')||request.url().startsWith('data:')?request.continue():request.abort());
    const click=async text=>{const handle=await page.evaluateHandle(text=>[...document.querySelectorAll('button')].find(button=>button.textContent.trim()===text),text);assert.ok(handle.asElement(),`Button ${text}`);await handle.asElement().click();await handle.dispose();};
    const fill=async (label,value)=>{const handle=await page.evaluateHandle(label=>[...(document.querySelector('dialog[open]') || document).querySelectorAll('label')].find(el=>el.textContent.trim().startsWith(label))?.querySelector('input,select'),label);const el=handle.asElement();assert.ok(el,`Field ${label}`);const tag=await el.evaluate(el=>el.tagName);if(tag==='SELECT')await el.select(value);else await el.type(value);await handle.dispose();};
    const fits=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Page fits viewport');
    for(const kind of ['hotel-rates','b2b-data']){
      await page.goto(`${base}/forms/${kind}`);await page.waitForSelector('form');if(kind==='hotel-rates')await page.waitForFunction(()=>document.querySelector('select')?.options.length>1);
      for(const width of [320,768,1440]){await page.setViewport({width,height:950});await fits();await page.screenshot({path:path.join(output,`${kind}-${width}.png`),fullPage:true});}
      await page.setViewport({width:1280,height:950});await page.evaluate(()=>document.body.style.zoom='2');await fits();await page.evaluate(()=>document.body.style.zoom='1');
      assert.equal(await page.$$eval('main',els=>els.length),1);assert.ok(await page.$$eval('input:not([type="hidden"]),select',els=>els.every(el=>el.labels?.length)),'Inputs have associated labels');
    }
    await page.goto(`${base}/forms/b2b-data`);await fill('Name','Browser Partner');await fill('Phone number','bad phone');await fill('City','Jaipur');await fill('State','Rajasthan');await click('Submit B2B contact');await page.waitForSelector('[role="alert"]');
    await page.$eval('input[name="phone"]',el=>el.select());await page.type('input[name="phone"]','+91 98765 43210');await fill('Quality label','Partner');await click('Submit B2B contact');await page.waitForFunction(()=>document.body.textContent.includes('Saved successfully'));
    assert.equal(db.queryOne("SELECT quality FROM b2b_contacts WHERE name='Browser Partner'").quality,'Partner');await click('Add another contact');assert.equal(await page.$eval('input[name="name"]',el=>el.value),'');
    await page.goto(`${base}/forms/hotel-rates`);await page.waitForFunction(()=>document.querySelector('select')?.options.length>1);const category=await page.$eval('select',el=>el.options[1].value);
    await fill('Hotel name','Browser Hotel');await fill('Hotel city','Udaipur');await fill('Hotel category',category);await fill('Contact number','+91 98765 43210');await fill('Off-season rate','1500');await fill('Seasonal rate','2500');await fill('Blackout rate','3500');await click('Add period');
    const values=['2026-04-01','2026-10-01','2026-12-25','2026-12-31'];await page.$$eval('input[type="date"]',(els,values)=>els.forEach((el,i)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,values[i]);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}),values);
    const {PDFDocument}=require('pdf-lib');const pdf=await PDFDocument.create();pdf.addPage();const pdfPath=path.join(output,'test-rate-sheet.pdf');fs.writeFileSync(pdfPath,await pdf.save());await(await page.$('input[type="file"]')).uploadFile(pdfPath);await page.waitForSelector('a[href^="blob:"]');await click('Submit hotel rates');await page.waitForFunction(()=>document.body.textContent.includes('Saved successfully'));
    const savedHotel=db.queryOne("SELECT * FROM hotel_rates WHERE name='Browser Hotel'");assert.equal(savedHotel.seasonal_paise,250000);assert.equal(savedHotel.pdf_name,'test-rate-sheet.pdf');assert.equal(JSON.parse(savedHotel.blackout_dates).length,1);
    await page.setCookie({...cookie,url:base});await page.goto(`${base}/test/admin`);await page.waitForFunction(()=>document.body.textContent.includes('Browser Partner'));await click('Add contact');await page.waitForSelector('dialog[open]');
    await page.setViewport({width:320,height:850});await page.screenshot({path:path.join(output,'b2b-admin-editor-320.png'),fullPage:true});assert.ok(await page.$eval('dialog',el=>el.scrollWidth<=el.clientWidth+1));
    await fill('Name','Admin Contact');await fill('Phone number','+91 91234 56789');await fill('City','Delhi');await fill('State','Delhi');await click('Save contact');await page.waitForFunction(()=>document.body.textContent.includes('Admin Contact saved successfully.'));await page.setViewport({width:1440,height:950});
    await page.type('input[placeholder="Name, phone or location"]','Admin Contact');await page.waitForFunction(()=>document.querySelectorAll('tbody tr').length===1);await page.click('button[aria-label="Edit Admin Contact"]');await page.waitForSelector('dialog[open]');await fill('Quality label','Not Active');await click('Save contact');await page.waitForFunction(()=>!document.querySelector('dialog'));assert.equal(db.queryOne("SELECT quality FROM b2b_contacts WHERE name='Admin Contact'").quality,'Not Active');
    page.once('dialog',dialog=>dialog.accept());await page.click('button[aria-label="Delete Admin Contact"]');await page.waitForFunction(()=>document.body.textContent.includes('Contact deleted.'));assert.ok(db.queryOne("SELECT deleted_at FROM b2b_contacts WHERE name='Admin Contact'").deleted_at);
    await page.screenshot({path:path.join(output,'b2b-admin-desktop.png'),fullPage:true});assert.deepEqual(errors,[]);console.log('PASS: real browser submissions save to backend; PDF/blackout/season fields; B2B admin add/edit/delete/search; anonymous deep links; validation and add-another; 320/768/1440 layouts, 200% zoom, labels, no browser errors. Screenshots: '+output);
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
