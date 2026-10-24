import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import initSqlJs from 'sql.js';
import { convertPdfToPngs } from './pdf-to-png';
import { TH, DEFAULT_TERMS, BRAND } from '../services/quoteDesignRenderer';
import { PartnerBrand, deduplicatePartners, HOTEL_PARTNERS, TRAVEL_PARTNERS, renderPartnerBadgeHtml } from '../utils/partnerLogos';

const CHROME_PATH = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const ARTIFACT_DIR = 'C:\\Users\\Rahul\\.gemini\\antigravity-ide\\brain\\10f6a607-5bf3-4559-8d92-e10f3577f82d';

function renderPerfectTermsSheet(Q: any, thKey = 'diwali', customPartners?: PartnerBrand[]): string {
  const th = TH[thKey] || TH.royal;
  const e = (s: any) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const ico = (n: string, s = 15) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-0.15em;flex:none;"><circle cx="12" cy="12" r="10"/></svg>`;

  const base = `font-family:${th.head};font-size:13.5px;font-weight:700;margin-bottom:6px;`;
  let sec = base + `color:${th.ink};text-transform:uppercase;letter-spacing:0.8px;border-bottom:2px solid ${th.accent};padding-bottom:3px;`;
  if (th.sec === 'pill') sec = base + `display:inline-block;background:${th.accent};color:${th.onAccent};padding:3px 12px;border-radius:999px;font-size:12px;`;
  if (th.sec === 'bar') sec = base + `color:${th.ink};border-left:3px solid ${th.accent};padding-left:8px;`;

  const bl = (arr: string[]) => arr.map((t) => `<div style="display:flex;gap:6px"><span style="color:${th.accent};flex:none">●</span><span>${e(t)}</span></div>`).join('');
  // Scaled up font-size to 11.2px, line-height 1.45, gap 5px
  const col = (arr: string[]) => `<div style="display:flex;flex-direction:column;gap:5px;font-size:11.2px;line-height:1.42;color:${th.muted}">${bl(arr)}</div>`;
  const fees = DEFAULT_TERMS.fees.map((f) => `<div style="display:flex;justify-content:space-between;gap:6px;font-size:11.5px;padding:3.5px 0;border-bottom:1px solid ${th.line}"><span>${e(f[0])}</span><b>${e(f[1])}</b></div>`).join('');

  const hotelsToRender = (customPartners && customPartners.filter(p => p.category === 'hotel').length > 0)
    ? customPartners.filter(p => p.category === 'hotel')
    : HOTEL_PARTNERS;
  const travelsToRender = (customPartners && customPartners.filter(p => p.category === 'travel').length > 0)
    ? customPartners.filter(p => p.category === 'travel')
    : TRAVEL_PARTNERS;

  const dedupedHotels = deduplicatePartners(hotelsToRender);
  const dedupedTravels = deduplicatePartners(travelsToRender);

  const hotelBadges = dedupedHotels.map(b => renderPartnerBadgeHtml(b, { line: th.line, card: th.card, ink: th.ink, showTag: false, showName: false })).join('');
  const travelBadges = dedupedTravels.map(b => renderPartnerBadgeHtml(b, { line: th.line, card: th.card, ink: th.ink, showTag: false, showName: false })).join('');

  const adv = Q.advisor || {
    name: 'Kingsland Holiday Specialist',
    role: 'Senior Trip Advisor',
    phones: '+91 6376983416 · +91 7014939068',
    email: 'official.kingslandholidays@gmail.com',
  };
  const isB2BMode = Q.isB2B || (!adv.name && !adv.phones && !adv.email);

  return `
    <div class="sheet sheet-terms" style="width:794px;height:1123px;padding:32px 46px 26px;background:${th.bg};color:${th.ink};font-family:${th.body};display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;position:relative;overflow:hidden;margin:0 auto;page-break-before:always;break-before:page;">
      
      <!-- Top Header -->
      <div style="flex:none">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;align-items:center;gap:12px">
            ${(!isB2BMode && Q.logoUrl) ? `<div style="background:#ffffff;padding:4px 10px;border-radius:8px;border:1px solid ${th.line};box-shadow:0 2px 6px rgba(0,0,0,0.06);display:flex;align-items:center"><img src="${Q.logoUrl}" alt="${e(Q.companyName || BRAND)}" crossOrigin="anonymous" style="max-height:34px;max-width:130px;width:auto;height:auto;object-fit:contain;display:block" /></div>` : ''}
            <div style="font-family:${th.head};font-size:19px;font-weight:700">${isB2BMode ? 'Travel Quotation' : e(Q.companyName || BRAND)}</div>
          </div>
          <div style="font-size:11.5px;color:${th.muted};font-weight:600">${e(Q.packageName)} · Ref. No. ${e(Q.ref)}</div>
        </div>
        <div style="font-family:${th.head};font-size:24px;font-weight:800;margin:6px 0 0;line-height:1.15;color:${th.ink}">Terms &amp; Cancellation Policy</div>
      </div>

      <!-- Main Content Area: flex 1 with justify-content: space-between so sections stretch and fill the page with NO gap above advisor bar -->
      <div style="flex:1;min-height:0;display:flex;flex-direction:column;justify-content:space-between;padding:16px 0 20px;">
        
        <!-- Grid 1: Cancellation & Hotels -->
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:flex-start">
          <div>
            <div style="${sec}">Cancellation policy · land package</div>
            <div style="background:${th.card};border:1px solid ${th.line};border-radius:${th.radius};padding:6px 12px;margin-bottom:8px">${fees}</div>
            <div>${col(DEFAULT_TERMS.feeNotes)}</div>
          </div>
          <div>
            <div style="${sec}">Hotels &amp; accommodation</div>
            ${col(DEFAULT_TERMS.hotels)}
          </div>
        </div>

        <!-- Grid 2: Important Info & Pure Agent -->
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:flex-start">
          <div>
            <div style="${sec}">Important information</div>
            ${col(DEFAULT_TERMS.important)}
          </div>
          <div>
            <div style="${sec}">Pure agent declaration</div>
            ${col(isB2BMode ? [
              'We provide services strictly as a pure agent for planning and coordinating tours on behalf of the customer.',
              'Transport, hotel stays, and entry permits are procured on behalf of the guest and recovered at actuals.',
              'All legal and statutory obligations subject to applicable travel laws and competent jurisdiction.'
            ] : DEFAULT_TERMS.agent)}
          </div>
        </div>

        <!-- Partner Boxes: Hotel Working Partners & Working Partners -->
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:flex-start">
          <!-- Hotel Working Partners -->
          <div style="background:${th.card};border:1px solid ${th.line};border-radius:${th.radius};padding:10px 14px;display:flex;flex-direction:column;gap:8px">
            <div style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:${th.ink};display:flex;align-items:center;gap:6px">
              <span style="width:6px;height:6px;border-radius:50%;background:${th.accent};display:inline-block"></span>
              <span>Hotel Working Partners</span>
            </div>
            <div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px">
              ${hotelBadges}
            </div>
          </div>

          <!-- Working Partners -->
          <div style="background:${th.card};border:1px solid ${th.line};border-radius:${th.radius};padding:10px 14px;display:flex;flex-direction:column;gap:8px">
            <div style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:${th.ink};display:flex;align-items:center;gap:6px">
              <span style="width:6px;height:6px;border-radius:50%;background:${th.accent};display:inline-block"></span>
              <span>Working Partners</span>
            </div>
            <div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px">
              ${travelBadges}
            </div>
          </div>
        </div>
      </div>

      <!-- Advisor bar pinned at bottom -->
      <div style="flex:none;background:${th.footBg};color:${th.footInk};border-radius:${th.radius};padding:14px 20px;display:flex;justify-content:space-between;align-items:center;gap:14px">
        <div>
          <div style="font-size:10.5px;opacity:.85">Your trip advisor</div>
          <div style="font-family:${th.head};font-size:16px;font-weight:700;margin-top:2px">${e(adv.name)}</div>
          <div style="font-size:10.5px;opacity:.85">${e(adv.role)}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;font-size:11.5px;font-weight:600">
          <div>📞 ${e(adv.phones)}</div>
          <div>✉️ ${e(adv.email)}</div>
        </div>
      </div>
    </div>
  `;
}

async function run() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync('kingsland.db'));
  const leadRows = db.exec("SELECT * FROM leads WHERE trip_id = 'KL-1003'")[0];
  const lead: any = Object.fromEntries(leadRows.columns.map((c, i) => [c, leadRows.values[0][i]]));
  const agencyRows = db.exec("SELECT * FROM agency_settings")[0];
  const agency: any = Object.fromEntries(agencyRows.columns.map((c, i) => [c, agencyRows.values[0][i]]));
  const partnerRows = db.exec("SELECT * FROM partner_brands WHERE is_active=1 ORDER BY sort_order ASC, created_at ASC")[0];
  const partners = partnerRows ? partnerRows.values.map(v => Object.fromEntries(partnerRows.columns.map((c, i) => [c, v[i]]))) : [];

  const html = renderPerfectTermsSheet({
    client: lead.name,
    ref: lead.trip_id,
    logoUrl: agency.logo_url || '',
    companyName: agency.company_name || 'Kingsland Holidays',
    packageName: '7 Days Magical Kashmir Holiday Tour',
  }, 'diwali', partners as any);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    const doc = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;0,800&display=swap" rel="stylesheet">
          <style>
            @page { size: A4 portrait; margin: 0; }
            * { box-sizing: border-box; }
            body { margin: 0; padding: 0; background: #fff; -webkit-print-color-adjust: exact !important; }
            .sheet { width: 794px; height: 1123px; margin: 0 auto; overflow: hidden; position: relative; }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;
    await page.setContent(doc, { waitUntil: 'networkidle0' as any });
    const outPdf = path.join(ARTIFACT_DIR, 'test_terms_perfect.pdf');
    await page.pdf({ path: outPdf, format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    await convertPdfToPngs(outPdf, 'test_terms_perfect');
  } finally {
    await browser.close();
  }
}

run().catch(console.error);
