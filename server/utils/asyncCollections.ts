export async function asyncMap(values:any[],callback:any){const result:any[]=[];for(let i=0;i<values.length;i++)result.push(await callback(values[i],i,values));return result;}
export async function asyncForEach(values:any[],callback:any){for(let i=0;i<values.length;i++)await callback(values[i],i,values);}
export async function asyncFilter(values:any[],callback:any){const result:any[]=[];for(let i=0;i<values.length;i++)if(await callback(values[i],i,values))result.push(values[i]);return result;}
export async function asyncFind(values:any[],callback:any){for(let i=0;i<values.length;i++)if(await callback(values[i],i,values))return values[i];}
export async function asyncSome(values:any[],callback:any){for(let i=0;i<values.length;i++)if(await callback(values[i],i,values))return true;return false;}
export async function asyncEvery(values:any[],callback:any){for(let i=0;i<values.length;i++)if(!await callback(values[i],i,values))return false;return true;}
