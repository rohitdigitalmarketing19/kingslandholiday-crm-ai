const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync('App.tsx','utf8');
(async()=>{
 for(const kind of ['Leads','Agents']){
  const start=source.indexOf(`const load${kind} = useCallback(async () => {`);
  const body=source.slice(start,source.indexOf('\n  }, []);',start)).split('async () => {')[1];
  const records=[{id:'synthetic-old-record',payload:'x'.repeat(10*1024*1024)}];let current=[];
  const context={api:{['fetch'+kind]:async()=>records},['set'+kind]:value=>current=value,window:{},localStorage:{setItem(){throw new Error('QuotaExceededError');},getItem(){return null;}},console};
  await vm.runInNewContext('(async()=>{'+body+'})()',context);
  assert.equal(current,records,kind+' must retain server records when browser storage is full');
  console.log('PASS '+kind+': 10 MB response retained after cache quota failure');
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
