let checkoutLoader:Promise<any>|null=null;
export function loadRazorpayCheckout():Promise<any>{
 if((window as any).Razorpay)return Promise.resolve((window as any).Razorpay);
 if(checkoutLoader)return checkoutLoader;
 checkoutLoader=new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.async=true;
   const timer=window.setTimeout(()=>{script.remove();checkoutLoader=null;reject(new Error('Razorpay checkout took too long to load. Please retry.'));},20000);
   script.onload=()=>{clearTimeout(timer);if((window as any).Razorpay)resolve((window as any).Razorpay);else{script.remove();checkoutLoader=null;reject(new Error('Razorpay checkout could not start. Please retry.'));}};
   script.onerror=()=>{clearTimeout(timer);script.remove();checkoutLoader=null;reject(new Error('Could not load Razorpay checkout. Check your connection and retry.'));};document.head.appendChild(script);
 });return checkoutLoader;
}
