const fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert/strict'),{spawn,spawnSync}=require('child_process'),net=require('net');
const root=path.resolve(__dirname,'..');
(async()=>{
 const stage=fs.mkdtempSync(path.join(os.tmpdir(),'kingsland-production-'));
 for(const file of ['package.json','package-lock.json','server.js'])fs.copyFileSync(path.join(root,file),path.join(stage,file));
 fs.cpSync(path.join(root,'dist'),path.join(stage,'dist'),{recursive:true});
 if(process.argv.includes('--legacy'))fs.copyFileSync(path.join(root,'tmp/legacy-startup-fixture.db'),path.join(stage,'smoke.db'));
 console.log('Installing only production dependencies in an isolated deployment folder...');
 const install=spawnSync(process.platform==='win32'?'npm.cmd':'npm',['ci','--omit=dev','--ignore-scripts','--no-audit','--no-fund'],{cwd:stage,shell:process.platform==='win32',encoding:'utf8',timeout:240000});
 if(install.status!==0)throw new Error('Production dependency install failed: '+(install.stderr || install.stdout || install.error?.message).slice(-1800));
 assert.ok(fs.existsSync(path.join(stage,'node_modules/puppeteer-core/package.json')),'Browser runtime must be installed in production');
 console.log('PASS production-only install includes puppeteer-core.');
 const probe=net.createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
 const env={...process.env,NODE_ENV:'production',PORT:String(port),APP_ORIGIN:'https://crm.kingslandholiday.com',DATABASE_PATH:path.join(stage,'smoke.db'),BACKUP_PATH:path.join(stage,'backups')};for(const key of ['SUPABASE_URL','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_API_KEY','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_KEY'])env[key]='';
 const child=spawn(process.execPath,['server.js'],{cwd:stage,env,stdio:['ignore','pipe','pipe'],windowsHide:true});let log='';child.stdout.on('data',data=>log+=data);child.stderr.on('data',data=>log+=data);
 try {
  let ready=false;for(let attempt=0;attempt<80;attempt++){if(child.exitCode!==null)throw new Error('Production server exited: '+log.slice(-1600));try{const response=await fetch(`http://127.0.0.1:${port}/api/health`);if(response.status===200){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,250));}
  assert.ok(ready,'Production server did not become ready: '+log.slice(-1600));
  assert.equal((await fetch(`http://127.0.0.1:${port}/`)).status,200);
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/leads`)).status,401);
  console.log('PASS production server starts, honors PORT, serves the CRM, and protects lead data.');
  fs.mkdirSync(path.join(root,'tmp'),{recursive:true});fs.writeFileSync(path.join(root,'tmp/production-smoke-result.json'),JSON.stringify({passed:true,node:process.version,port,productionOnly:true,stage},null,2));
 } finally {child.kill();}
})().catch(error=>{console.error(error.message);process.exitCode=1;});

