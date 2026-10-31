export const invoiceMoney=(value:number)=>Number(value || 0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
export function taxTotals(items:any[],mode:string){
 let subtotal=0,cgst=0,sgst=0,igst=0;
 for(const item of items){const value=Math.round(Number(item.taxableValue || 0)*100);subtotal+=value;cgst+=Math.round(value*Number(item.cgstRate || 0)/100);sgst+=Math.round(value*Number(item.sgstRate || 0)/100);igst+=Math.round(value*Number(item.igstRate || 0)/100);}
 return {subtotal:subtotal/100,cgst:cgst/100,sgst:sgst/100,igst:igst/100,total:(subtotal+(mode==='igst'?igst:cgst+sgst))/100};
}
export function numberToWordsINR(amount:number):string {
 const ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'],tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
 const words=(n:number):string=>n<20?ones[n]:n<100?tens[Math.floor(n/10)]+(n%10?' '+ones[n%10]:''):n<1000?ones[Math.floor(n/100)]+' Hundred'+(n%100?' '+words(n%100):''):n<100000?words(Math.floor(n/1000))+' Thousand'+(n%1000?' '+words(n%1000):''):n<10000000?words(Math.floor(n/100000))+' Lakh'+(n%100000?' '+words(n%100000):''):words(Math.floor(n/10000000))+' Crore'+(n%10000000?' '+words(n%10000000):'');
 const paise=Math.round(Math.max(0,amount)*100);return (words(Math.floor(paise/100)) || 'Zero')+' Rupees'+(paise%100?' and '+words(paise%100)+' Paise':'')+' Only';
}
export const invoiceToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function readInvoiceSettings(){try{return JSON.parse(localStorage.getItem('kingsland_invoice_settings') || 'null');}catch{return null;}}
