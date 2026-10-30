const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
(async () => {
 const users = await (await fetch('http://localhost:5000/api/users')).json();
 const admin = users.find(user => user.role === 'Admin' && user.status === 'Active');
 assert.ok(admin);
 const browser = await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try {
  const page = await browser.newPage(); const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.evaluateOnNewDocument(id=>{localStorage.setItem('kingsland_active_user_id',id);localStorage.setItem('kingsland_active_view','Dashboard');},admin.id);
  await page.setRequestInterception(true);
  page.on('request', request=>{
   const url=new URL(request.url());
   if(url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/hotel-rates') && !url.pathname.startsWith('/api/masters')) {
    const data=url.pathname==='/api/users'?[{...admin,name:'Demo Administrator',email:'admin@example.test',avatar:''}]:url.pathname.includes('settings')?{}:[];
    return request.respond({status:200,contentType:'application/json',body:JSON.stringify(data)});
   }
   if(url.hostname!=='localhost' && url.protocol!=='blob:') return request.abort();
   return request.continue();
  });
  await page.setViewport({width:1440,height:1000});
  await page.goto('http://localhost:3000',{waitUntil:'networkidle2'});
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(button=>button.textContent.trim()==='Hotel Rates'));
  await page.evaluate(()=>[...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='Hotel Rates').click());
  await page.waitForFunction(()=>[...document.querySelectorAll('h1')].some(heading=>heading.textContent==='Hotel Rates') && document.querySelectorAll('tbody tr').length===20);
  const output=path.resolve('tmp/hotel-rates');fs.mkdirSync(output,{recursive:true});
  await page.screenshot({path:path.join(output,'actual-crm-admin-hotel-rates.png'),fullPage:true});
  assert.equal(await page.$$eval('tbody tr',rows=>rows.length),20);
  const pdfResponse=page.waitForResponse(response=>response.url().includes('/pdf') && response.status()===200,{timeout:10000});
  await page.evaluate(()=>[...document.querySelectorAll('tbody button')].find(button=>button.textContent.trim()==='Preview').click());
  await pdfResponse; await page.waitForSelector('iframe');
  assert.deepEqual(errors,[]);
  console.log('PASS actual app on localhost:3000: Admin Hotel Rates menu visible, navigation works, 20 live demo hotel records loaded from actual backend.');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});