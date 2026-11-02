import React,{useEffect,useState} from 'react';
export function MysqlMigrationPanel(){
 const [state,setState]=useState<any>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[archives,setArchives]=useState<any[]>([]);
 const request=async(url:string,options?:RequestInit)=>{const response=await fetch('/api/settings'+url,options);const data=await response.json().catch(()=>({error:'The server returned an invalid response.'}));if(!response.ok)throw new Error(data.error || 'Database request failed.');return data;};
 useEffect(()=>{request('/database').then(setState).catch(e=>setMessage(e.message));},[]);
 const loadArchives=()=>request('/database/mysql/archives').then(setArchives).catch(()=>{});
 if(!state?.mysqlConfigured)return null;
 return <section aria-label="MySQL migration" className="p-5 rounded-xl border border-line bg-surface space-y-4"><div><h3 className="font-semibold text-content">MySQL database</h3><p className="text-sm text-secondary mt-1">Active database: <strong>{state.active==='mysql'?'MySQL':'SQLite'}</strong>. Importing here replaces records in the configured MySQL database.</p></div>
 <div className="flex flex-wrap gap-3"><button disabled={busy} onClick={async()=>{setBusy(true);setMessage('Checking MySQL connection…');try{await request('/database/mysql/test',{method:'POST'});setMessage('MySQL connection verified. You can import your CRM backup.');loadArchives();}catch(e:any){setMessage(e.message);}finally{setBusy(false);}}} className="px-4 py-2.5 border border-line rounded-lg text-content disabled:opacity-50">Test connection</button>
 <label className="px-4 py-2.5 rounded-lg bg-brand text-white font-medium cursor-pointer"><span>{busy?'Working…':'Import .db backup into MySQL'}</span><input aria-label="Import backup into MySQL" type="file" accept=".db,.sqlite" disabled={busy} className="hidden" onChange={async e=>{
 const input=e.currentTarget,file=input.files?.[0];if(!file)return;if(file.size>100*1024*1024){setMessage('Choose a backup smaller than 100 MB.');input.value='';return;}
 if(!window.confirm('Import '+file.name+' into MySQL? This replaces MySQL records, users and settings. A MySQL recovery backup is saved first. Your original .db file is unchanged.')){input.value='';return;}
 setBusy(true);setMessage('Importing and checking records. Keep this page open…');
 try{const result=await request('/database/mysql/import',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:file});setMessage('Import verified: '+(result.counts.leads || 0)+' leads, '+(result.counts.quotes || 0)+' quotations. '+(state.active==='mysql'?'Refresh and sign in using an account from the imported backup.':'MySQL is ready. Set DB_CLIENT=mysql in Hostinger and redeploy to activate it.'));loadArchives();}catch(error:any){setMessage(error.message);}finally{setBusy(false);input.value='';}
 }}/></label></div>
 {message && <p role="status" className="text-sm text-content p-3 rounded-lg bg-canvas">{message}</p>}
 {archives.length>0 && <div className="border-t border-line pt-3"><p className="text-sm font-medium text-content">Recovery copies before previous imports</p>{archives.map(a=><a key={a.id} href={'/api/settings/database/mysql/archives/'+encodeURIComponent(a.id)} download className="block text-sm text-brand-ink py-2">Download backup · {new Date(a.created_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})}</a>)}</div>}
 </section>;
}
