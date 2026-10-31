import { queryOne } from '../db/connection';
export const PAYMENT_LINK_TTL_MS = 24 * 60 * 60 * 1000;
export function paymentExpiry(row:any, now=Date.now()) {
  const raw=String(row?.created_at || '');
  const created=Date.parse(/Z$|[+-]\d{2}:?\d{2}$/.test(raw)?raw:raw.replace(' ','T')+'Z');
  const expires=created+PAYMENT_LINK_TTL_MS;
  return {expires_at:Number.isFinite(expires)?new Date(expires).toISOString():null,expired:!Number.isFinite(expires)||now>=expires};
}
export function assertPaymentLinkActive(payKey:string) {
  const link=queryOne('SELECT created_at FROM payment_links WHERE pay_key=?',[payKey]) || queryOne('SELECT created_at FROM payment_installments WHERE pay_key=?',[payKey]);
  if(!link)throw Object.assign(new Error('Payment link not found.'),{status:404});
  if(paymentExpiry(link).expired)throw Object.assign(new Error('This payment link has expired after 24 hours. Ask your travel expert for a new link.'),{status:410});
}
