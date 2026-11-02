export function asyncRouter<T>(router:T):T {
 for(const method of ['get','post','put','patch','delete','use']){
  const original=(router as any)[method];
  (router as any)[method]=function(...args:any[]){return original.apply(this,args.map((arg,index)=>typeof arg==='function' && arg.length<4 ? function(req:any,res:any,next:any){
    res.locals.pendingAsyncHandlers=(res.locals.pendingAsyncHandlers || 0)+1;
    const done=()=>{res.locals.pendingAsyncHandlers--;res.locals.releaseMysqlScope?.();};
    try{const invoke=()=>arg(req,res,next);const write=method!=='use' && !['get','head','options'].includes(method) && index===args.length-1 && res.locals.acquireMysqlWrite;const promise=write?Promise.resolve(res.locals.acquireMysqlWrite()).then(invoke):invoke();if(promise?.then)promise.then(done,(error:any)=>{done();next(error);});else done();}catch(error){done();next(error);}
  }:arg));};
 }return router;
}
