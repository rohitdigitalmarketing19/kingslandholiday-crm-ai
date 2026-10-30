import { Request, Response, NextFunction } from 'express';
import { randomBytes, createHash, scryptSync, timingSafeEqual } from 'crypto';
import { queryOne, queryAll, runQuery } from '../db/connection';
const cookieName = 'kingsland_session';
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(password,salt,64).toString('hex')}`;
}
export function verifyPassword(password: string, stored: string): boolean {
  if (!stored) return false;
  if (!stored.startsWith('scrypt$')) { const a=Buffer.from(password), b=Buffer.from(stored); return a.length===b.length && timingSafeEqual(a,b); }
  try { const [,salt,key]=stored.split('$'); const actual=scryptSync(password,salt,64); const expected=Buffer.from(key,'hex'); return actual.length===expected.length && timingSafeEqual(actual,expected); } catch {return false;}
}
export function createSession(userId: string, res: Response) {
  const token=randomBytes(32).toString('hex'), now=new Date();
  runQuery('INSERT INTO auth_sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)',[createHash('sha256').update(token).digest('hex'),userId,new Date(now.getTime()+12*60*60*1000).toISOString(),now.toISOString()]);
  res.cookie(cookieName,token,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',maxAge:12*60*60*1000,path:'/'});
}
export function endSession(req: Request,res: Response) {
  const token=readCookie(req);
  if(token) runQuery('DELETE FROM auth_sessions WHERE token_hash=?',[createHash('sha256').update(token).digest('hex')]);
  res.clearCookie(cookieName,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/'});
}
function readCookie(req: Request) { return (req.headers.cookie || '').split(';').map(part=>part.trim()).find(part=>part.startsWith(cookieName+'='))?.slice(cookieName.length+1) || ''; }
export function apiAuthorization(req: Request,res: Response,next: NextFunction) {
  const route=req.path.replace(/^\/api/, '') || '/';
  const token=readCookie(req);
  const user=token ? queryOne('SELECT u.* FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.status=\'Active\'', [createHash('sha256').update(token).digest('hex'),new Date().toISOString()]) : null;
  delete req.headers['x-user-id']; delete req.headers['x-user-role']; delete req.headers['x-role'];
  if(user) {res.locals.user=user;req.headers['x-user-id']=user.id;req.headers['x-user-role']=user.role;}
  const publicRoute = route==='/health' || route.startsWith('/public/client-details/') ||
    (req.method==='POST' && ['/users/login','/users/send-admin-otp','/users/verify-admin-otp'].includes(route)) ||
    (req.method==='PUT' && /^\/users\/[^/]+\/change-password$/.test(route)) ||
    (req.method==='GET' && /^\/payments\/links\/[^/]+$/.test(route)) ||
    (req.method==='GET' && route==='/payments/settings') ||
    (req.method==='POST' && route==='/payments/submissions');
  if(publicRoute) return next();
  if(!user) return res.status(401).json({error:'Please sign in to the CRM.'});
  if(!['GET','HEAD'].includes(req.method)) {
    const origin=req.header('origin');
    try {
      // Managed hosting can forward an internal Host. Pin the public origin explicitly.
      const configured=(process.env.APP_ORIGIN || process.env.PUBLIC_APP_URL || '').split(',').map(value=>value.trim()).filter(Boolean).map(value=>new URL(value).origin);
      if(origin && new URL(origin).hostname!==req.hostname && !configured.includes(new URL(origin).origin)) return res.status(403).json({error:'This website address is not allowed to save data. Configure APP_ORIGIN to match the public CRM address.',code:'ORIGIN_NOT_ALLOWED'});
    } catch {return res.status(403).json({error:'The request origin or APP_ORIGIN configuration is invalid.',code:'ORIGIN_NOT_ALLOWED'});}
    if(user.access_level==='ViewOnly' && route!=='/users/logout' && !['/pdf-themes/generate-pdf','/pdf-themes/preview-html','/pdf-designs/render-pdf'].includes(route)) return res.status(403).json({error:'Your account has view-only access.'});
  }
  if(route==='/users/me' || route==='/users/logout') return next();
  const admin=user.role==='Admin';
  if((route==='/ops/reset' || req.method==='DELETE' && route==='/payments/submissions') && !admin)return res.status(403).json({error:'Administrator access required.'});
  const templateUse=req.method==='GET' && /^\/(masters|pdf-themes|pdf-designs)(\/|$)/.test(route) || req.method==='POST' && ['/pdf-themes/generate-pdf','/pdf-themes/preview-html','/pdf-designs/render-pdf'].includes(route);
  if((/^\/(users|hotel-rates)(\/|$)/.test(route) || /^\/(masters|pdf-themes|pdf-designs)(\/|$)/.test(route) && !templateUse || route.startsWith('/settings') && (route!=='/settings' || req.method!=='GET')) && !admin) return res.status(403).json({error:'Administrator access required.'});
  let permissions: string[]=[];try {permissions=JSON.parse(user.permissions || '[]');}catch{}
  const section=route.startsWith('/leads')?['Leads','New Inquiry','Follow-ups','Sales Desk','Operations','Accounts']:route.startsWith('/ops')?['Operations','Accounts','HotelVouchers']:route.startsWith('/payments')?['Payments','Operations','Accounts']:route.startsWith('/agents')?['Sales Team','Leads','New Inquiry']:route.startsWith('/templates')?['Saved Itinerary']:['Leads','New Inquiry','Saved Itinerary','Operations','Accounts'];
  if(!admin && !section.some(name=>permissions.includes(name))) return res.status(403).json({error:'This account cannot access this desk.'});
  if(!admin && user.role==='Accounts' && req.method!=='GET' && !route.includes('/accounts') && !route.startsWith('/payments')) return res.status(403).json({error:'Accounts cannot change sales or operations records.'});
  if(!admin && /\/leads\/[^/]+\/reassign$/.test(route))return res.status(403).json({error:'Only an administrator can reassign leads.'});
  if(!admin && user.role==='Sales') {
    const agent=queryOne('SELECT id FROM agents WHERE LOWER(email)=LOWER(?)',[user.email]);
    const owners=[user.id,agent?.id].filter(Boolean);
    res.locals.allowedOwners=owners;
    if(route==='/leads' && req.method==='GET') req.query.assignedTo=owners[owners.length-1];
    if(route==='/leads' && req.method==='POST') req.body.assignedTo=owners[owners.length-1];
    const leadMatch=route.match(/^\/leads\/([^/]+)/);
    let lead=leadMatch ? queryOne('SELECT * FROM leads WHERE id=?',[decodeURIComponent(leadMatch[1])]) : null;
    if(route.startsWith('/payments')) {
      const key=route.split('/')[3] || req.body?.payKey || req.body?.id;
      const request=key ? queryOne('SELECT lead_id FROM payment_installments WHERE id=? OR pay_key=? UNION SELECT lead_id FROM payment_links WHERE id=? OR pay_key=?',[key,key,key,key]) : null;
      const leadId=req.query.leadId || req.body?.leadId || request?.lead_id;
      lead=leadId ? queryOne('SELECT * FROM leads WHERE id=? OR trip_id=?',[leadId,leadId]) : null;
      if(!lead) return res.status(403).json({error:'Select one of your assigned leads.'});
    }
    if(lead && !owners.includes(lead.assigned_to)) return res.status(403).json({error:'This lead belongs to another sales representative.'});
    if(route.startsWith('/ops')) return res.status(403).json({error:'Use the dedicated Operations account for this desk.'});
  }
  next();
}
