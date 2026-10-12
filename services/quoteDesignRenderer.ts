/**
 * Quote Design Renderer
 * Faithfully ports the 5 quote designs from Kingsland-Quote-Designs.html:
 *  1. Royal Gold (royal)
 *  2. Alpine Teal (alpine)
 *  3. Sunset Coral (sunset)
 *  4. Editorial (editorial)
 *  5. Playful Violet (playful)
 *
 * Each design produces exact A4 sheets (794px x 1123px) with:
 *  - Page 1: Cover / Overview
 *  - Page 2+: Day-wise Itinerary (cleanly chunked so no day cuts across pages)
 *  - Page Last: Terms & Cancellation Policy (with SVG brand icons for partners)
 */

import { HOTEL_PARTNERS, TRAVEL_PARTNERS, PartnerBrand, renderPartnerBadgeHtml } from '../utils/partnerLogos';

export interface HotelItemModel {
  nights: string;
  name: string;
  type: string;
  room: string;
  rooms: string;
  city?: string;
}

export interface QuoteDataModel {
  client: string;
  ref: string;
  packageName: string;
  longDuration: string;
  duration: string;
  city: string;
  services: string;
  travellers: string;
  priceNote: string;
  price: string;
  rawPrice?: number;
  discountPercent?: number;
  cutPrice?: string;
  coverImage?: string;
  hotel: HotelItemModel;
  hotels?: HotelItemModel[];
  advisor: {
    name: string;
    role: string;
    phones: string;
    email: string;
  };
  stats: [string, string][];
  included: string[];
  excluded: string[];
  note: string;
  days: Array<{
    title: string;
    text: string;
    img?: string;
  }>;
}

export const BRAND = 'Kingsland Holidays';

export const DEFAULT_TERMS = {
  fees: [
    ['More than 30 days before start', '25%'],
    ['16–30 days before start', '40%'],
    ['7–15 days before start', '55%'],
    ['3–6 days before start', '70%'],
    ['0–2 days before start', '85%'],
    ['No show', '100%'],
  ],
  feeNotes: [
    'Percentages apply to the total land package cost.',
    'Peak periods (Diwali, Christmas, New Year, long weekends): non-refundable & no amendment.',
    'Days counted from first formal contact via email or WhatsApp check-in timestamp.',
    'Flights / rail: charges strictly as per airline or IRCTC cancellation rules.',
  ],
  hotels: [
    'If a mentioned hotel is unavailable for unforeseen reasons, an equivalent or upgraded hotel is provided.',
    '24–31 Dec: Gala Dinner is compulsory in select luxury hotels (payable directly).',
    'Standard check-in 12:00 PM and check-out 10:00 AM (early check-in subject to availability).',
    'Room heaters available on request at minimal extra cost paid directly before checkout.',
    'Indicative itinerary may adjust for road, weather, or local administrative conditions.',
  ],
  important: [
    'All guests must carry valid Government photo ID (Passport / Driving Licence / Voter ID). PAN card is not valid ID.',
    'Vehicle capacity: strictly within Motor Vehicle Act permissions. AC does not operate on uphill ghat drives.',
    'Landslides & road closures: alternate diversions or extra route expenses borne by guest.',
    'Delayed installments attract a 5% late administrative charge.',
  ],
  agent: [
    'We provide services strictly as a pure agent for planning and coordinating tours on behalf of the customer.',
    'Transport, hotel stays, and entry permits are procured on behalf of the guest and recovered at actuals.',
    'All legal and statutory obligations subject to Jaipur, Rajasthan jurisdiction only.',
  ],
};

const e = (s: any) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const IC: Record<string, string> = {
  mountain: '<path d="m8 3 4 8 5-5 5 15H2z"/>',
  user: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  cal: '<path d="M8 2v4M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
  bed: '<path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9"/>',
  food: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-10 6L2 7"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>'
};

const ico = (n: string, s = 16, w = 2) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:inline-block;vertical-align:-0.15em;flex:none;width:${s}px;height:${s}px">${IC[n] || ''}</svg>`;

const greeting = (Q: QuoteDataModel) => `Dear <b>${e(Q.client)}</b>, thank you for considering ${BRAND}. Please find below our detailed quotation for your requested itinerary.`;

export const getCutPrice = (Q: QuoteDataModel): string | null => {
  if (Q.cutPrice) return Q.cutPrice;
  if (!Q.discountPercent || Q.discountPercent <= 0) return null;
  const num = Q.rawPrice || parseFloat(String(Q.price).replace(/[^0-9.]/g, '')) || 0;
  if (!num) return null;
  const cut = Math.round(num + (num * (Q.discountPercent / 100)));
  return `₹${cut.toLocaleString('en-IN')}`;
};

const brk = (s: string) => e(s).replace(' ', '<br>');
const svcIcons = ['car', 'bed', 'pin'];
const note = () => `Itinerary is indicative and may change with weather, road conditions or local permits.`;

const PAL: Record<string, { sky: string; far: string; mid: string; near: string; accent: string }> = {
  royal: { sky: '#cfdcf2', far: '#8fa6cf', mid: '#51709f', near: '#1f3a6b', accent: '#d4af37' },
  alpine: { sky: '#d6f0ee', far: '#8cc7c0', mid: '#3f9a8f', near: '#14574f', accent: '#f2b84b' },
  sunset: { sky: '#ffd9b8', far: '#f7a072', mid: '#e0603a', near: '#8f2f2a', accent: '#fff1b8' },
  editorial: { sky: '#efece6', far: '#bdb8ae', mid: '#6f6b64', near: '#2a2825', accent: '#e5431f' },
  playful: { sky: '#e4dcff', far: '#b9a6ff', mid: '#7b5cf5', near: '#3b2a9c', accent: '#ff9f7a' }
};

const SC = [
  (p: any) => `<rect width="400" height="240" fill="${p.sky}"/><circle cx="305" cy="62" r="26" fill="${p.accent}"/><polygon points="0,150 70,80 120,125 190,55 270,135 330,90 400,140 400,240 0,240" fill="${p.far}"/><polygon points="0,182 90,122 170,172 250,116 340,172 400,152 400,240 0,240" fill="${p.mid}"/><rect y="196" width="400" height="44" fill="${p.near}"/><polygon points="140,240 260,240 214,170 188,170" fill="#2b2f3a"/><path d="M201 236 L203 208 M204 198 L205 184" stroke="#fff" stroke-width="3" stroke-dasharray="10 8" fill="none"/>`,
  (p: any) => `<rect width="400" height="240" fill="${p.sky}"/><polygon points="0,140 80,70 140,120 220,50 300,120 360,80 400,120 400,240 0,240" fill="${p.far}"/><polygon points="0,170 100,115 200,165 300,110 400,160 400,240 0,240" fill="${p.mid}"/><rect y="190" width="400" height="50" fill="${p.near}"/><polygon points="20,192 38,140 56,192" fill="${p.near}"/><polygon points="62,192 80,150 98,192" fill="${p.near}"/><polygon points="300,192 318,142 336,192" fill="${p.near}"/><polygon points="344,192 362,150 380,192" fill="${p.near}"/><rect x="170" y="152" width="60" height="40" fill="${p.accent}"/><polygon points="150,154 250,154 200,124" fill="${p.mid}"/><rect x="183" y="112" width="34" height="14" fill="${p.accent}"/><polygon points="172,114 228,114 200,90" fill="${p.mid}"/><rect x="199" y="74" width="2" height="18" fill="${p.mid}"/><rect x="192" y="166" width="16" height="26" fill="${p.near}"/>`,
  (p: any) => `<rect width="400" height="240" fill="${p.sky}"/><circle cx="80" cy="60" r="22" fill="${p.accent}"/><polygon points="0,130 60,90 130,125 210,70 290,120 350,85 400,115 400,240 0,240" fill="${p.far}"/><polygon points="0,165 120,125 220,160 320,120 400,155 400,240 0,240" fill="${p.mid}"/><path d="M0 208 C80 186 150 230 230 206 S350 190 400 212 L400 240 L0 240 Z" fill="${p.sky}"/><rect x="30" y="150" width="30" height="24" fill="${p.near}"/><polygon points="26,150 64,150 45,132" fill="${p.accent}"/><rect x="76" y="156" width="24" height="20" fill="${p.near}"/><polygon points="72,156 104,156 88,140" fill="${p.accent}"/><rect x="300" y="146" width="36" height="30" fill="${p.near}"/><polygon points="294,146 342,146 318,126" fill="${p.accent}"/><rect x="346" y="156" width="26" height="22" fill="${p.near}"/><polygon points="342,156 376,156 359,140" fill="${p.accent}"/>`,
  (p: any) => `<rect width="400" height="240" fill="${p.sky}"/><polygon points="0,200 90,70 150,140 230,40 320,150 360,100 400,160 400,240 0,240" fill="${p.far}"/><polygon points="90,70 70,102 84,96 95,110 108,98" fill="#fff"/><polygon points="230,40 204,88 220,80 232,98 246,82 264,94" fill="#fff"/><polygon points="360,100 346,124 356,119 364,128 374,118" fill="#fff"/><polygon points="0,205 110,150 210,195 300,150 400,200 400,240 0,240" fill="${p.mid}"/><rect y="215" width="400" height="25" fill="${p.near}"/><polygon points="30,218 46,176 62,218" fill="${p.near}"/><polygon points="70,218 84,184 98,218" fill="${p.near}"/><polygon points="330,218 346,178 362,218" fill="${p.near}"/><ellipse cx="305" cy="52" rx="20" ry="8" fill="${p.accent}"/><path d="M290 58 L305 78 M320 58 L305 78" stroke="${p.near}" stroke-width="1.5" fill="none"/>`,
  (p: any) => `<rect width="400" height="240" fill="${p.sky}"/><circle cx="200" cy="128" r="48" fill="${p.accent}"/><polygon points="0,140 80,100 150,135 230,95 320,138 400,105 400,240 0,240" fill="${p.far}"/><polygon points="0,172 110,138 200,168 300,132 400,170 400,240 0,240" fill="${p.mid}"/><polygon points="0,205 120,180 260,205 400,185 400,240 0,240" fill="${p.near}"/><path d="M150 240 C180 215 230 205 250 190" stroke="#2b2f3a" stroke-width="22" fill="none"/><path d="M150 240 C180 215 230 205 250 190" stroke="#fff" stroke-width="2" stroke-dasharray="8 7" fill="none"/>`
];

const scene = (d: any, i: number, key: string) => d.img
  ? `<img src="${d.img}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">`
  : `<svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block" aria-hidden="true">${SC[i % 5](PAL[key])}</svg>`;

const scBox = (w: number | string, h: number, d: any, i: number, key: string, extra = '') =>
  `<div style="width:${typeof w === 'number' ? w + 'px' : w};height:${h}px;flex:none;overflow:hidden;${extra}">${scene(d, i, key)}</div>`;

const pg = (style: string, inner: string) =>
  `<div class="sheet" style="width:794px;height:1123px;position:relative;overflow:hidden;box-sizing:border-box;background:#ffffff;margin:0 auto;box-shadow:0 6px 24px rgba(20,24,50,.14);${style}">${inner}</div>`;

/* Theme settings for Terms and Shared styling */
export const TH: Record<string, any> = {
  royal: { bg: '#fdfbf6', ink: '#1b2540', muted: '#3b455f', accent: '#d4af37', onAccent: '#12213f', line: '#e3dac0', card: '#ffffff', footBg: '#12213f', footInk: '#ffffff', head: "'Playfair Display',serif", body: "'Manrope',sans-serif", radius: '14px', sec: 'rule' },
  alpine: { bg: '#fbfdfc', ink: '#12302f', muted: '#3f5a58', accent: '#f2a93b', onAccent: '#2a1c00', line: '#cfe5e1', card: '#e6f4f1', footBg: '#0f4c4a', footInk: '#ffffff', head: "'DM Serif Display',serif", body: "'DM Sans',sans-serif", radius: '16px', sec: 'pill' },
  sunset: { bg: '#fffaf6', ink: '#231f2b', muted: '#4a4352', accent: '#ff6a3d', onAccent: '#ffffff', line: '#f3d9c8', card: '#fff1e6', footBg: '#231f2b', footInk: '#ffffff', head: "'Outfit',sans-serif", body: "'Nunito Sans',sans-serif", radius: '20px', sec: 'bar' },
  editorial: { bg: '#f7f7f4', ink: '#111111', muted: '#33332f', accent: '#e5431f', onAccent: '#ffffff', line: '#cfcfca', card: '#ffffff', footBg: '#111111', footInk: '#ffffff', head: "'Bricolage Grotesque',sans-serif", body: "'Hanken Grotesk',sans-serif", radius: '0px', sec: 'rule' },
  playful: { bg: '#f8f6ff', ink: '#1e1b3a', muted: '#3d3a5c', accent: '#4a2fe0', onAccent: '#ffffff', line: '#ddd3ff', card: '#ffffff', footBg: '#4a2fe0', footInk: '#ffffff', head: "'Baloo 2',sans-serif", body: "'Nunito',sans-serif", radius: '24px', sec: 'pill' }
};

/* =====================================================================
   TERMS PAGE (With authentic Partner Brand SVG Icons!)
   ===================================================================== */
export function renderTermsSheet(Q: QuoteDataModel, thKey: string, customPartners?: PartnerBrand[]): string {
  const th = TH[thKey] || TH.royal;
  const base = `font-family:${th.head};font-size:12px;font-weight:700;margin-bottom:5px;`;
  let sec = base + `color:${th.ink};text-transform:uppercase;letter-spacing:0.8px;border-bottom:2px solid ${th.accent};padding-bottom:3px;`;
  if (th.sec === 'pill') sec = base + `display:inline-block;background:${th.accent};color:${th.onAccent};padding:2px 9px;border-radius:999px;`;
  if (th.sec === 'bar') sec = base + `color:${th.ink};border-left:3px solid ${th.accent};padding-left:7px;`;

  const bl = (arr: string[]) => arr.map((t) => `<div style="display:flex;gap:5px"><span style="color:${th.accent};flex:none">●</span><span>${e(t)}</span></div>`).join('');
  const col = (arr: string[]) => `<div style="display:flex;flex-direction:column;gap:3px;font-size:10px;line-height:1.3;color:${th.muted}">${bl(arr)}</div>`;
  const fees = DEFAULT_TERMS.fees.map((f) => `<div style="display:flex;justify-content:space-between;gap:6px;font-size:10.5px;padding:2.5px 0;border-bottom:1px solid ${th.line}"><span>${e(f[0])}</span><b>${e(f[1])}</b></div>`).join('');

  // Support custom manually added partners or fallback to curated partner network
  const hotelsToRender = (customPartners && customPartners.filter(p => p.category === 'hotel').length > 0)
    ? customPartners.filter(p => p.category === 'hotel')
    : HOTEL_PARTNERS;

  const travelsToRender = (customPartners && customPartners.filter(p => p.category === 'travel').length > 0)
    ? customPartners.filter(p => p.category === 'travel')
    : TRAVEL_PARTNERS;

  // Render badges with brand logo ONLY (names not shown with logo as requested)
  const hotelBadges = hotelsToRender.map(b => renderPartnerBadgeHtml(b, { line: th.line, card: th.card, ink: th.ink, showTag: false, showName: false })).join('');
  const travelBadges = travelsToRender.map(b => renderPartnerBadgeHtml(b, { line: th.line, card: th.card, ink: th.ink, showTag: false, showName: false })).join('');

  // Use flex column layout so content and footer never overlap.
  // The outer page wrapper (pg) provides the 1123px fixed height.
  // Content fills remaining space, footer is pinned at bottom via flex.
  return pg(`padding:0;background:${th.bg};color:${th.ink};font-family:${th.body};display:flex;flex-direction:column`, `
    <div style="flex:1;padding:24px 40px 0;display:flex;flex-direction:column;min-height:0;overflow:hidden">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-family:${th.head};font-size:17px;font-weight:700">${BRAND}</div>
        <div style="font-size:10.5px;color:${th.muted}">${e(Q.packageName)} · Ref. No. ${e(Q.ref)}</div>
      </div>
      <div style="font-family:${th.head};font-size:20px;font-weight:700;margin:6px 0 6px;line-height:1.15">Terms &amp; Cancellation Policy</div>
      
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
        <div>
          <div style="${sec}">Cancellation policy · land package</div>
          <div style="background:${th.card};border:1px solid ${th.line};border-radius:${th.radius};padding:2px 8px">${fees}</div>
          <div style="margin-top:4px">${col(DEFAULT_TERMS.feeNotes)}</div>
        </div>
        <div>
          <div style="${sec}">Hotels &amp; accommodation</div>
          ${col(DEFAULT_TERMS.hotels)}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:6px">
        <div>
          <div style="${sec}">Important information</div>
          ${col(DEFAULT_TERMS.important)}
        </div>
        <div>
          <div style="${sec}">Pure agent declaration</div>
          ${col(DEFAULT_TERMS.agent)}
        </div>
      </div>

      <!-- Two Separate Distinct Containers: Hotel Working Partners & Working Partners -->
      <div data-last="1" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:6px">
        <!-- 1st Box: Hotel Working Partners -->
        <div style="background:${th.card};border:1px solid ${th.line};border-radius:${th.radius};padding:6px 10px;display:flex;flex-direction:column;gap:4px">
          <div style="font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.7px;color:${th.ink};display:flex;align-items:center;gap:5px">
            <span style="width:5px;height:5px;border-radius:50%;background:${th.accent};display:inline-block"></span>
            <span>Hotel Working Partners</span>
          </div>
          <div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px">
            ${hotelBadges}
          </div>
        </div>

        <!-- 2nd Box: Working Partners -->
        <div style="background:${th.card};border:1px solid ${th.line};border-radius:${th.radius};padding:6px 10px;display:flex;flex-direction:column;gap:4px">
          <div style="font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.7px;color:${th.ink};display:flex;align-items:center;gap:5px">
            <span style="width:5px;height:5px;border-radius:50%;background:${th.accent};display:inline-block"></span>
            <span>Working Partners</span>
          </div>
          <div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px">
            ${travelBadges}
          </div>
        </div>
      </div>
    </div>

    <!-- Advisor Footer — inside flex flow so it never overlaps content -->
    <div data-foot="1" style="flex:none;margin:8px 40px 18px;background:${th.footBg};color:${th.footInk};border-radius:${th.radius};padding:10px 16px;display:flex;justify-content:space-between;align-items:center;gap:14px">
      <div>
        <div style="font-size:10px;opacity:.85">Your trip advisor</div>
        <div style="font-family:${th.head};font-size:14px;font-weight:700;margin-top:1px">${e(Q.advisor.name)}</div>
        <div style="font-size:10px;opacity:.85">${e(Q.advisor.role)}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:3px;font-size:11px;font-weight:600">
        <div style="display:flex;align-items:center;gap:6px">${ico('phone', 12)}${e(Q.advisor.phones)}</div>
        <div style="display:flex;align-items:center;gap:6px">${ico('mail', 12)}${e(Q.advisor.email)}</div>
      </div>
    </div>
  `);
}

/* =====================================================================
   DESIGN 1 — ROYAL GOLD
   ===================================================================== */
const rF = "'Manrope',sans-serif", rH = "'Playfair Display',serif";

export function royalCoverSheet(Q: QuoteDataModel): string {
  const tile = (ic: string, l: string, v: string) => `
    <div style="background:#fff;border:1px solid #e8e1cf;border-radius:14px;padding:12px 14px;min-height:104px;box-sizing:border-box;box-shadow:0 4px 16px rgba(18,33,63,.1);display:flex;flex-direction:column;justify-content:flex-start">
      <div style="width:28px;height:28px;border-radius:14px;background:#f4ecd2;color:#8a6a1c;display:flex;align-items:center;justify-content:center;flex:none">${ico(ic, 15)}</div>
      <div style="font-size:11px;letter-spacing:1px;color:#5f6985;margin-top:6px;font-weight:600;flex:none">${l}</div>
      <div style="font-size:13.5px;font-weight:800;margin-top:2px;line-height:1.25;word-break:break-word">${e(v)}</div>
    </div>`;

  const item = (t: string, c: string, ic: string) => `
    <div style="display:flex;gap:8px;align-items:flex-start;font-size:12px;line-height:1.35;color:#1b2540">
      <span style="color:${c};margin-top:1px">${ico(ic, 13, 3)}</span><span>${e(t)}</span>
    </div>`;

  return pg(`background:#fdfbf6;font-family:${rF};color:#1b2540`, `
    <div style="position:relative;height:258px;background:#12213f;overflow:hidden;padding:36px 46px 0">
      ${Q.coverImage ? `<img src="${Q.coverImage}" alt="${e(Q.city)}" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;opacity:0.26;mix-blend-mode:luminosity" />` : ''}
      <svg viewBox="0 0 794 110" preserveAspectRatio="none" style="position:absolute;left:0;bottom:0;width:794px;height:110px" aria-hidden="true">
        <path d="M0 110V62L90 20l70 38 80-48 90 56 70-30 100 44 80-36 114 40v64z" fill="#1c3160"/>
        <path d="M0 110V86l110-30 90 34 100-40 120 38 110-30 120 34v24z" fill="#243c70"/>
      </svg>
      <div style="position:relative;display:flex;justify-content:space-between;align-items:flex-start">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:42px;height:42px;border-radius:21px;border:1.5px solid #d4af37;display:flex;align-items:center;justify-content:center;color:#d4af37">${ico('mountain', 20)}</div>
          <div>
            <div style="font-family:${rH};font-size:26px;font-weight:700;color:#fff;line-height:1.2">${BRAND}</div>
            <div style="font-size:11px;letter-spacing:1.6px;color:#d4af37;font-weight:600;margin-top:2px">REGISTERED TOUR OPERATOR</div>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11.5px;letter-spacing:3px;color:#d4af37;font-weight:800">TRAVEL QUOTATION</div>
          <div style="font-size:12.5px;color:#cfd6e6;margin-top:3px">Ref. No. ${e(Q.ref)}</div>
        </div>
      </div>
      <div style="position:relative;margin-top:28px">
        <div style="font-family:${rH};font-size:42px;font-weight:700;color:#fff;line-height:1.2">${e(Q.packageName)}</div>
        <div style="font-size:13.5px;color:#dfe5f2;margin-top:6px;line-height:1.3">${e(Q.longDuration)} · ${e(Q.city)} · ${e(Q.priceNote)}</div>
      </div>
    </div>

    <div style="position:relative;margin:-48px 46px 0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px">
      ${tile('user', 'PREPARED FOR', Q.client)}
      ${tile('pin', 'PACKAGE', Q.packageName)}
      ${tile('cal', 'DURATION', Q.duration)}
      ${tile('car', 'SERVICES', Q.services)}
    </div>

    <div style="margin:16px 46px 0;font-size:13px;line-height:1.5;color:#3b455f">${greeting(Q)}</div>

    <div style="margin:14px 46px 0;display:flex;min-height:98px;border-radius:14px;overflow:hidden;border:1.5px solid #12213f">
      <div style="flex:1;padding:16px 22px;background:#fff;display:flex;flex-direction:column;justify-content:center">
        <div style="font-size:11px;letter-spacing:2px;color:#8a6a1c;font-weight:800">QUOTED PACKAGE PRICE</div>
        <div style="font-family:${rH};font-size:24px;font-weight:700;margin-top:3px;line-height:1.25">${e(Q.packageName)}</div>
        <div style="font-size:12.5px;color:#5f6985;margin-top:2px;line-height:1.3">${e(Q.travellers)} · ${e(Q.priceNote)}</div>
      </div>
      <div style="width:220px;background:#12213f;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:8px 10px">
        ${(Q.discountPercent && Q.discountPercent > 0) ? `
          <div style="background:#d4af37;color:#12213f;font-size:10px;font-weight:800;letter-spacing:1px;padding:2px 8px;border-radius:4px;line-height:1.2;display:inline-flex;align-items:center;justify-content:center">${Q.discountPercent}% OFF</div>
          <div style="font-family:${rH};font-size:32px;font-weight:700;color:#fff;line-height:1.1">${e(Q.price)}</div>
          <div style="font-size:12px;color:#cfd6e6;text-decoration:line-through;opacity:0.85;line-height:1">${e(getCutPrice(Q) || '')}</div>
        ` : `
          <div style="background:#d4af37;color:#12213f;font-size:11px;font-weight:800;letter-spacing:1px;padding:4px 10px;border-radius:4px;line-height:1.2;display:inline-flex;align-items:center;justify-content:center">ALL-INCLUSIVE QUOTE</div>
          <div style="font-family:${rH};font-size:36px;font-weight:700;color:#fff;line-height:1.15;margin-top:2px">${e(Q.price)}</div>
        `}
      </div>
    </div>

    <div style="margin:14px 46px 0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid #d9cfae;border-bottom:1px solid #d9cfae;height:60px">
      ${Q.stats.map((s, i) => `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;${i ? 'border-left:1px solid #d9cfae' : ''}">
          <div style="font-family:${rH};font-size:20px;font-weight:700">${e(s[0])}</div>
          <div style="font-size:11px;letter-spacing:1px;color:#5f6985">${e(s[1].toUpperCase())}</div>
        </div>
      `).join('')}
    </div>

    <div style="margin:${(Q.hotels && Q.hotels.length > 1) ? '12px' : '18px'} 46px 0;display:flex;align-items:center;gap:10px">
      <div style="color:#8a6a1c">${ico('bed', 18)}</div>
      <div style="font-family:${rH};font-size:17px;font-weight:700">Accommodation Schedule (${((Q.hotels && Q.hotels.length > 0) ? Q.hotels : [Q.hotel]).length} ${((Q.hotels && Q.hotels.length > 0) ? Q.hotels : [Q.hotel]).length > 1 ? 'Hotels' : 'Hotel'})</div>
      <div style="flex:1;height:1px;background:#d9cfae"></div>
    </div>

    <div style="margin:8px 46px 0;display:flex;flex-direction:column;gap:6px">
      ${((Q.hotels && Q.hotels.length > 0) ? Q.hotels : [Q.hotel]).map(h => `
        <div style="background:#fff;border:1px solid #e8e1cf;border-radius:12px;padding:${(Q.hotels && Q.hotels.length > 1) ? '8px 14px' : '12px 18px'};display:flex;align-items:center;gap:14px">
          <div style="width:115px;flex-shrink:0">
            <div style="font-size:12px;font-weight:800">${e(h.nights)}</div>
            <div style="font-size:11px;color:#5f6985;margin-top:1px">${e(h.city || Q.city)}</div>
          </div>
          <div style="flex:1;min-width:0">
            <div style="margin-top:1px;line-height:1.3">
              <span style="font-size:${(Q.hotels && Q.hotels.length > 1) ? '13.5px' : '15px'};font-weight:800;display:inline;margin-right:8px">${e(h.name)}</span>
              <span style="background:#f4ecd2;color:#6b4f10;font-size:10px;font-weight:700;padding:2px 7px;border-radius:6px;display:inline-block;vertical-align:middle;white-space:nowrap">${e(h.type)}</span>
            </div>
            ${h.rooms ? `
            <div style="display:flex;align-items:center;gap:6px;font-size:11.5px;color:#3b455f;margin-top:3px;line-height:1.35">
              <span style="color:#8a6a1c;display:inline-flex;align-items:center;flex:none;width:13px;height:13px">${ico('food', 13)}</span><span style="min-width:0">${e(h.rooms)}</span>
            </div>` : ''}
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:${(Q.hotels && Q.hotels.length > 1) ? '12.5px' : '13.5px'};font-weight:800">${e(h.room)}</div>
            <div style="font-size:11px;color:#5f6985;margin-top:1px">${e(Q.travellers)}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div style="margin:18px 46px 0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px">
      <div style="background:#eef7f1;border:1px solid #bfe0cc;border-radius:14px;padding:14px 18px">
        <div style="display:flex;align-items:center;gap:8px;font-family:${rH};font-size:17px;font-weight:700;color:#14573a;margin-bottom:8px">${ico('check', 17, 2.4)}Included</div>
        <div style="display:flex;flex-direction:column;gap:6px">${Q.included.slice(0, 8).map((t) => item(t, '#1f8a5b', 'check')).join('')}</div>
      </div>
      <div style="background:#fdf1f0;border:1px solid #efc4c0;border-radius:14px;padding:14px 18px">
        <div style="display:flex;align-items:center;gap:8px;font-family:${rH};font-size:17px;font-weight:700;color:#9c2b22;margin-bottom:8px">${ico('x', 17, 2.4)}Excluded</div>
        <div style="display:flex;flex-direction:column;gap:6px">${Q.excluded.slice(0, 6).map((t) => item(t, '#c0392b', 'x')).join('')}</div>
        ${Q.note ? `<div style="margin-top:8px;font-size:11.5px;line-height:1.4;color:#6b4f10;background:#fbf1d6;border-radius:8px;padding:7px 9px">${e(Q.note)}</div>` : ''}
      </div>
    </div>
  `);
}

export function royalDaysSheet(Q: QuoteDataModel, daysSlice: Array<{ title: string; text: string; img?: string }>, startIdx: number): string {
  const n = daysSlice.length;
  return pg(`padding:38px 46px;background:#fdfbf6;font-family:${rF};color:#1b2540`, `
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div style="font-family:${rH};font-size:18px;font-weight:700">${BRAND}</div>
      <div style="font-size:12px;color:#5f6985">${e(Q.packageName)} · Ref. No. ${e(Q.ref)}</div>
    </div>
    <div style="display:flex;align-items:center;gap:12px;margin:12px 0 16px">
      <div style="color:#8a6a1c">${ico('pin', 24)}</div>
      <div style="font-family:${rH};font-size:28px;font-weight:700;line-height:1.1">Day-wise Itinerary</div>
      <div style="flex:1;height:2px;background:#d4af37"></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${daysSlice.map((d, i) => {
        const dayNum = startIdx + i + 1;
        const textLen = (d.text || '').length;
        const imgH = textLen > 600 ? 185 : (textLen > 350 ? 155 : 126);
        return `
          <div style="display:flex;gap:14px;align-items:stretch">
            <div style="width:42px;flex:none;display:flex;flex-direction:column;align-items:center">
              <div style="width:38px;height:38px;border-radius:19px;background:#12213f;color:#d4af37;font-family:${rH};font-weight:700;font-size:15px;display:flex;align-items:center;justify-content:center">${String(dayNum).padStart(2, '0')}</div>
              ${i < n - 1 ? '<div style="width:2px;flex:1;background:#d4af37;margin-top:4px"></div>' : ''}
            </div>
            <div style="flex:1;display:flex;gap:14px;background:#fff;border:1px solid #e8e1cf;border-radius:14px;padding:12px 14px;box-shadow:0 3px 10px rgba(18,33,63,.05);align-items:center">
              <div style="flex:1;min-width:0">
                <div style="font-family:${rH};font-size:15px;font-weight:700;line-height:1.25">Day ${dayNum}: ${e(d.title)}</div>
                <div style="font-size:11.5px;line-height:1.45;color:#3b455f;margin-top:5px;word-break:break-word">${e(d.text)}</div>
              </div>
              <div style="width:190px;height:${imgH}px;flex:none;border-radius:10px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.06);transition:height 0.2s ease">
                ${scene(d, startIdx + i, 'royal')}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
    <div style="position:absolute;left:46px;right:46px;bottom:30px;display:flex;align-items:center;gap:8px;font-size:11.5px;color:#5f6985">
      <span style="color:#8a6a1c">${ico('shield', 14)}</span>${note()}
    </div>
  `);
}

/* =====================================================================
   DESIGN 2 — ALPINE TEAL
   ===================================================================== */
const aF = "'DM Sans',sans-serif", aH = "'DM Serif Display',serif";

export function alpineCoverSheet(Q: QuoteDataModel): string {
  const row = (ic: string, l: string, v: string) => `
    <div style="display:flex;gap:10px;align-items:center">
      <div style="width:32px;height:32px;border-radius:16px;background:#14605d;display:flex;align-items:center;justify-content:center;flex:none;color:#f2a93b">${ico(ic, 16)}</div>
      <div>
        <div style="font-size:11px;color:#a8d5cf">${l}</div>
        <div style="font-size:13.5px;font-weight:700">${e(v)}</div>
      </div>
    </div>`;

  const chip = (t: string, ok: boolean) => `
    <div style="display:flex;align-items:center;gap:6px;background:${ok ? '#e3f4ec' : '#fdeeee'};border:1px solid ${ok ? '#b7e0cc' : '#f0c4c4'};border-radius:999px;padding:4px 11px;font-size:12px;font-weight:500">
      <span style="color:${ok ? '#1f8a5b' : '#c0392b'}">${ico(ok ? 'check' : 'x', 12, 3)}</span>${e(t)}
    </div>`;

  return pg(`display:flex;background:#fbfdfc;font-family:${aF};color:#12302f`, `
    <div style="width:250px;flex:none;background:#0f4c4a;color:#fff;padding:36px 24px;display:flex;flex-direction:column;position:relative;overflow:hidden">
      ${Q.coverImage ? `<img src="${Q.coverImage}" alt="${e(Q.city)}" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;opacity:0.25;mix-blend-mode:luminosity" />` : ''}
      <svg viewBox="0 0 250 200" preserveAspectRatio="none" style="position:absolute;left:0;bottom:0;width:250px;height:200px" aria-hidden="true">
        <path d="M0 200V120L60 60l50 50 50-70 90 100v40z" fill="#14605d"/>
        <path d="M0 200v-50l70-40 60 50 70-40 50 30v50z" fill="#1a7470" opacity=".8"/>
      </svg>
      <div style="position:relative;display:flex;align-items:center;gap:10px">
        <div style="width:38px;height:38px;border-radius:19px;background:#f2a93b;color:#0f4c4a;display:flex;align-items:center;justify-content:center;flex:none">${ico('mountain', 20, 2.2)}</div>
        <div>
          <div style="font-family:${aH};font-size:21px;line-height:1.05">${BRAND}</div>
          <div style="font-size:11px;letter-spacing:1px;color:#a8d5cf;margin-top:2px">TOUR OPERATOR</div>
        </div>
      </div>
      <div style="position:relative;margin-top:30px">
        <div style="font-size:11.5px;letter-spacing:3px;color:#f2a93b;font-weight:700">TRAVEL QUOTATION</div>
        <div style="font-size:12.5px;color:#d7ece8;margin-top:3px">Ref. No. ${e(Q.ref)}</div>
      </div>
      <div style="position:relative;margin-top:20px;background:rgba(255,255,255,.12);border-radius:14px;padding:12px 14px">
        <div style="font-size:11px;letter-spacing:1px;color:#a8d5cf;font-weight:600">PREPARED FOR</div>
        <div style="font-family:${aH};font-size:20px;margin-top:3px">${e(Q.client)}</div>
      </div>
      <div style="position:relative;margin-top:20px;display:flex;flex-direction:column;gap:12px">
        ${row('pin', 'Package', Q.packageName)}
        ${row('cal', 'Duration', Q.duration)}
        ${row('car', 'Services', Q.services)}
        ${row('user', 'Travellers', Q.travellers)}
      </div>
      <div style="position:relative;margin-top:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 10px">
        ${Q.stats.map((s) => `
          <div>
            <div style="font-family:${aH};font-size:24px;line-height:1">${e(s[0])}</div>
            <div style="font-size:11px;color:#d7ece8;margin-top:2px">${e(s[1])}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div style="flex:1;min-width:0;padding:36px 36px 32px 32px;display:flex;flex-direction:column;gap:15px">
      <div>
        <div style="font-family:${aH};font-size:42px;line-height:1.05;color:#0f4c4a">${e(Q.packageName)}</div>
        <div style="font-size:12.5px;line-height:1.55;color:#3f5a58;margin-top:8px">${greeting(Q)}</div>
      </div>
      <div style="background:#f2a93b;border-radius:18px;padding:18px 22px;color:#2a1c00">
        <div style="font-size:11px;letter-spacing:2px;font-weight:700">QUOTED PACKAGE PRICE</div>
        <div style="display:flex;align-items:baseline;gap:10px;margin-top:4px">
          <div style="font-family:${aH};font-size:48px;line-height:1.05">${e(Q.price)}</div>
          ${(Q.discountPercent && Q.discountPercent > 0) ? `
            <div style="font-size:18px;font-weight:700;text-decoration:line-through;opacity:0.65">${e(getCutPrice(Q) || '')}</div>
          ` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:12.5px;font-weight:600">
          <span style="background:#2a1c00;color:#f2a93b;font-size:11px;font-weight:700;letter-spacing:1px;padding:2px 8px;border-radius:999px">
            ${(Q.discountPercent && Q.discountPercent > 0) ? `${Q.discountPercent}% OFF` : 'ALL-INCLUSIVE'}
          </span>
          ${e(Q.travellers)} · ${e(Q.priceNote)}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${((Q.hotels && Q.hotels.length > 0) ? Q.hotels : [Q.hotel]).map(h => `
          <div style="background:#e6f4f1;border-radius:14px;padding:${(Q.hotels && Q.hotels.length > 1) ? '8px 12px' : '12px 16px'};display:flex;gap:12px;align-items:center">
            <div style="width:${(Q.hotels && Q.hotels.length > 1) ? '34px' : '42px'};height:${(Q.hotels && Q.hotels.length > 1) ? '34px' : '42px'};border-radius:10px;background:#0f4c4a;color:#fff;display:flex;align-items:center;justify-content:center;flex:none">${ico('bed', (Q.hotels && Q.hotels.length > 1) ? 16 : 20)}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:10px;letter-spacing:1px;color:#3f5a58;font-weight:700">ACCOMMODATION · ${e(h.nights.toUpperCase())} · ${e((h.city || Q.city).toUpperCase())}</div>
              <div style="margin-top:1px;line-height:1.25">
                <span style="font-family:${aH};font-size:${(Q.hotels && Q.hotels.length > 1) ? '15px' : '18px'};display:inline;margin-right:8px">${e(h.name)}</span>
                <span style="background:#fff;color:#0f4c4a;font-size:10px;font-weight:700;padding:1.5px 7px;border-radius:999px;display:inline-block;vertical-align:middle;white-space:nowrap">${e(h.type)}</span>
              </div>
              <div style="font-size:11.5px;color:#3f5a58;margin-top:2px">${e(h.room)}${h.rooms ? ` · ${e(h.rooms)}` : ''}</div>
            </div>
          </div>
        `).join('')}
      </div>
      <div>
        <div style="display:flex;align-items:center;gap:8px;font-family:${aH};font-size:19px;color:#0f4c4a;margin-bottom:7px">
          <span style="color:#1f8a5b">${ico('check', 18, 2.4)}</span>What is included
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:7px">${Q.included.slice(0, 8).map((t) => chip(t, true)).join('')}</div>
      </div>
      <div>
        <div style="display:flex;align-items:center;gap:8px;font-family:${aH};font-size:19px;color:#0f4c4a;margin-bottom:7px">
          <span style="color:#c0392b">${ico('x', 18, 2.4)}</span>What is not included
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:7px">${Q.excluded.slice(0, 6).map((t) => chip(t, false)).join('')}</div>
        ${Q.note ? `<div style="margin-top:8px;font-size:11.5px;line-height:1.45;color:#5a3d00;background:#fdf0d5;border-radius:10px;padding:7px 11px">${e(Q.note)}</div>` : ''}
      </div>
    </div>
  `);
}

export function alpineDaysSheet(Q: QuoteDataModel, daysSlice: Array<{ title: string; text: string; img?: string }>, startIdx: number): string {
  const pill = (i: number) => `<div style="position:absolute;left:10px;top:10px;background:#f2a93b;color:#2a1c00;font-size:10px;font-weight:700;letter-spacing:1px;padding:2px 8px;border-radius:999px">DAY ${startIdx + i + 1}</div>`;

  return pg(`padding:38px 46px;background:#fbfdfc;font-family:${aF};color:#12302f`, `
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div style="display:flex;align-items:center;gap:8px;font-family:${aH};font-size:18px;color:#0f4c4a">
        <span style="color:#f2a93b">${ico('mountain', 20, 2.2)}</span>${BRAND}
      </div>
      <div style="font-size:12px;color:#4a6462">${e(Q.packageName)} · Ref. No. ${e(Q.ref)}</div>
    </div>
    <div style="margin:12px 0 16px">
      <div style="font-size:11.5px;letter-spacing:3px;color:#b36b00;font-weight:700">${e(Q.longDuration.toUpperCase().replace('/', '·'))}</div>
      <div style="font-family:${aH};font-size:32px;line-height:1.1;color:#0f4c4a;margin-top:2px">Your journey, day by day</div>
    </div>

    <div style="display:flex;flex-direction:column;gap:11px">
      ${daysSlice.map((d, i) => {
        const dayNum = startIdx + i + 1;
        const textLen = (d.text || '').length;
        const imgH = textLen > 600 ? 180 : (textLen > 350 ? 150 : 124);
        return `
          <div style="display:flex;gap:14px;background:#fff;border:1px solid #cfe5e1;border-radius:16px;padding:12px 14px;box-shadow:0 3px 10px rgba(15,76,74,.06);align-items:center">
            <div style="width:190px;height:${imgH}px;flex:none;position:relative;border-radius:12px;overflow:hidden">
              ${scene(d, startIdx + i, 'alpine')}
              ${pill(i)}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-family:${aH};font-size:17px;line-height:1.2;color:#0f4c4a">Day ${dayNum}: ${e(d.title)}</div>
              <div style="font-size:11.5px;line-height:1.45;color:#3f5a58;margin-top:5px;word-break:break-word">${e(d.text)}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <div style="position:absolute;left:46px;right:46px;bottom:30px;display:flex;align-items:center;gap:8px;font-size:11.5px;color:#4a6462">
      <span style="color:#0f4c4a">${ico('shield', 14)}</span>${note()}
    </div>
  `);
}

/* =====================================================================
   DESIGN 3 — SUNSET CORAL
   ===================================================================== */
const sF = "'Nunito Sans',sans-serif", sH = "'Outfit',sans-serif";

export function sunsetCoverSheet(Q: QuoteDataModel): string {
  const chips = Q.services.split(',').map((s) => s.trim()).filter(Boolean).map((s, i) => `
    <div style="display:flex;align-items:center;gap:5px;background:rgba(255,255,255,.24);border-radius:999px;padding:3px 9px;font-size:11px;font-weight:700">
      ${ico(svcIcons[i % 3], 12, 2.2)}${e(s)}
    </div>`).join('');

  const item = (t: string, c: string, ic: string) => `
    <div style="display:flex;gap:6px;align-items:flex-start;font-size:11px;line-height:1.3">
      <span style="color:${c};margin-top:1px">${ico(ic, 12, 2.8)}</span><span>${e(t)}</span>
    </div>`;

  const hotelList = (Q.hotels && Q.hotels.length > 0) ? Q.hotels : [Q.hotel];
  const isMulti = hotelList.length > 1;

  return pg(`background:#fffaf6;font-family:${sF};color:#231f2b`, `
    <div style="position:relative;height:255px;background:linear-gradient(135deg,#ff5e4d 0%,#ff8a3d 60%,#ffb347 100%);border-bottom-left-radius:48px;overflow:hidden;padding:26px 46px;color:#fff">
      ${Q.coverImage ? `<img src="${Q.coverImage}" alt="${e(Q.city)}" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;opacity:0.25;mix-blend-mode:luminosity" />` : ''}
      <svg viewBox="0 0 794 140" preserveAspectRatio="none" style="position:absolute;left:0;bottom:0;width:794px;height:140px" aria-hidden="true">
        <path d="M0 140V80L110 30l80 50 90-60 100 70 90-40 130 60 80-30 114 50v30z" fill="rgba(255,255,255,.16)"/>
        <path d="M0 140v-30l120-34 90 40 110-46 120 44 120-30 120 36v20z" fill="rgba(255,255,255,.14)"/>
      </svg>
      <div style="position:relative;display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:9px">
          <div style="width:34px;height:34px;border-radius:10px;background:#fff;color:#ff5e4d;display:flex;align-items:center;justify-content:center">${ico('mountain', 18, 2.2)}</div>
          <div style="font-family:${sH};font-size:19px;font-weight:700">${BRAND}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;letter-spacing:2.5px;font-weight:800">TRAVEL QUOTATION</div>
          <div style="font-size:11.5px;margin-top:2px;opacity:.9">Ref. No. ${e(Q.ref)}</div>
        </div>
      </div>
      <div style="position:relative;margin-top:18px">
        <div style="font-size:11px;letter-spacing:2px;font-weight:800">${e(Q.longDuration.toUpperCase().replace('/', '·'))} · ${e(Q.city.toUpperCase())}</div>
        <div style="font-family:${sH};font-size:38px;font-weight:800;line-height:1.06;margin-top:4px">${brk(Q.packageName)}</div>
      </div>
      <div style="position:relative;display:flex;gap:6px;margin-top:10px">${chips}</div>
    </div>

    <!-- Floating Price Stamp -->
    <div style="position:absolute;right:46px;top:180px;width:146px;height:146px;border-radius:73px;background:#fff;border:5px solid #ffe3cf;box-shadow:0 10px 24px rgba(35,31,43,.18);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:10;padding:6px">
      ${(Q.discountPercent && Q.discountPercent > 0) ? `
        <div style="font-size:9.5px;letter-spacing:1px;font-weight:800;color:#c2410c">${Q.discountPercent}% OFF</div>
        <div style="font-family:${sH};font-size:24px;font-weight:800;line-height:1.1;color:#231f2b;margin:1px 0">${e(Q.price)}</div>
        <div style="font-size:11.5px;color:#8f2f2a;text-decoration:line-through;font-weight:700;line-height:1">${e(getCutPrice(Q) || '')}</div>
        <div style="font-size:10px;color:#5a5262;font-weight:600;margin-top:2px">${e(Q.travellers)}</div>
      ` : `
        <div style="font-size:10px;letter-spacing:1px;font-weight:800;color:#c2410c">ALL-INCLUSIVE</div>
        <div style="font-family:${sH};font-size:26px;font-weight:800;line-height:1.1;color:#231f2b;margin:2px 0">${e(Q.price)}</div>
        <div style="font-size:11px;color:#5a5262;font-weight:600">${e(Q.travellers)}</div>
      `}
    </div>

    <!-- Client Greeting Section -->
    <div style="padding:14px 46px 0;width:520px">
      <div style="font-size:10.5px;letter-spacing:1.5px;font-weight:800;color:#c2410c">PREPARED FOR</div>
      <div style="font-family:${sH};font-size:22px;font-weight:700;margin-top:1px">${e(Q.client)}</div>
      <div style="font-size:12px;line-height:1.45;color:#4a4352;margin-top:4px">${greeting(Q)}</div>
    </div>

    <!-- Hotel Accommodations -->
    <div style="margin:${isMulti ? '10px' : '14px'} 46px 0;display:flex;flex-direction:column;gap:5px">
      ${hotelList.map(h => `
        <div style="background:#ffe9d9;border-radius:14px;padding:${isMulti ? '6px 12px' : '10px 16px'};display:flex;align-items:center;gap:11px">
          <div style="width:${isMulti ? '32px' : '40px'};height:${isMulti ? '32px' : '40px'};border-radius:10px;background:#ff5e4d;color:#fff;display:flex;align-items:center;justify-content:center;flex:none">${ico('bed', isMulti ? 16 : 20)}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:9.5px;letter-spacing:1px;font-weight:800;color:#c2410c">${e(h.nights.toUpperCase())} · ${e((h.city || Q.city).toUpperCase())}</div>
            <div style="margin-top:1px;line-height:1.25">
              <span style="font-family:${sH};font-size:${isMulti ? '14.5px' : '17.5px'};font-weight:700;display:inline;margin-right:8px">${e(h.name)}</span>
              <span style="background:#231f2b;color:#fff;font-size:9.5px;font-weight:700;padding:1.5px 7px;border-radius:999px;display:inline-block;vertical-align:middle;white-space:nowrap">${e(h.type)}</span>
            </div>
            <div style="font-size:11px;color:#4a4352;margin-top:1px">${e(h.room)}${h.rooms ? ` · ${e(h.rooms)}` : ''}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Operational Stats Strip -->
    <div style="margin:10px 46px 0;background:#231f2b;color:#fff;border-radius:14px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));height:54px">
      ${Q.stats.map((s, i) => `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;${i ? 'border-left:1px solid #4a4352' : ''}">
          <div style="font-family:${sH};font-size:18px;font-weight:700;color:#ffb347;line-height:1">${e(s[0])}</div>
          <div style="font-size:10.5px;color:#e6e1ee;margin-top:2px">${e(s[1])}</div>
        </div>
      `).join('')}
    </div>

    <!-- Inclusions & Exclusions -->
    <div style="margin:12px 46px 0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px">
      <div style="background:#e8f7ee;border-radius:14px;padding:10px 14px">
        <div style="display:flex;align-items:center;gap:6px;font-family:${sH};font-size:15px;font-weight:700;color:#14573a;margin-bottom:6px">
          <span style="width:20px;height:20px;border-radius:10px;background:#1f8a5b;color:#fff;display:flex;align-items:center;justify-content:center">${ico('check', 12, 3)}</span>Included
        </div>
        <div style="display:flex;flex-direction:column;gap:4.5px">${Q.included.slice(0, isMulti && hotelList.length > 2 ? 5 : 6).map((t) => item(t, '#1f8a5b', 'check')).join('')}</div>
      </div>
      <div style="background:#fdeaea;border-radius:14px;padding:10px 14px">
        <div style="display:flex;align-items:center;gap:6px;font-family:${sH};font-size:15px;font-weight:700;color:#9c2b22;margin-bottom:6px">
          <span style="width:20px;height:20px;border-radius:10px;background:#c0392b;color:#fff;display:flex;align-items:center;justify-content:center">${ico('x', 12, 3)}</span>Not included
        </div>
        <div style="display:flex;flex-direction:column;gap:4.5px">${Q.excluded.slice(0, 4).map((t) => item(t, '#c0392b', 'x')).join('')}</div>
        ${Q.note ? `<div style="margin-top:6px;font-size:10.5px;line-height:1.35;color:#7a3a00;background:#ffe9c7;border-radius:8px;padding:5px 8px">${e(Q.note)}</div>` : ''}
      </div>
    </div>
  `);
}

export function sunsetDaysSheet(Q: QuoteDataModel, daysSlice: Array<{ title: string; text: string; img?: string }>, startIdx: number): string {
  return pg(`padding:38px 46px;background:#fffaf6;font-family:${sF};color:#231f2b`, `
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div style="display:flex;align-items:center;gap:8px;font-family:${sH};font-size:18px;font-weight:700">
        <span style="width:28px;height:28px;border-radius:9px;background:#ff5e4d;color:#fff;display:flex;align-items:center;justify-content:center">${ico('mountain', 16, 2.2)}</span>${BRAND}
      </div>
      <div style="font-size:12px;color:#5a5262">${e(Q.packageName)} · Ref. No. ${e(Q.ref)}</div>
    </div>
    <div style="display:flex;align-items:flex-end;gap:14px;margin:12px 0 16px">
      <div style="font-family:${sH};font-size:34px;font-weight:800;line-height:1">Day by day</div>
      <div style="font-size:12px;font-weight:700;color:#c2410c;padding-bottom:3px;letter-spacing:2px">${e(Q.longDuration.toUpperCase().replace('/', '·'))}</div>
      <div style="flex:1;height:3px;border-radius:2px;background:linear-gradient(90deg,#ff5e4d,#ffb347);margin-bottom:5px"></div>
    </div>

    <div style="display:flex;flex-direction:column;gap:11px">
      ${daysSlice.map((d, i) => {
        const dayNum = startIdx + i + 1;
        const textLen = (d.text || '').length;
        const imgH = textLen > 600 ? 180 : (textLen > 350 ? 150 : 126);
        return `
          <div style="display:flex;flex-direction:${i % 2 ? 'row-reverse' : 'row'};gap:16px;align-items:center;background:#fff;border-radius:18px;padding:12px 14px;border:1px solid #f3d9c8;box-shadow:0 3px 8px rgba(255,106,61,.05)">
            <div style="width:220px;height:${imgH}px;flex:none;border-radius:14px;overflow:hidden;box-shadow:3px 3px 0 #ffd9b8">
              ${scene(d, startIdx + i, 'sunset')}
            </div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:9px">
                <div style="font-family:${sH};font-size:30px;font-weight:800;line-height:1;color:#ff6a3d">${String(dayNum).padStart(2, '0')}</div>
                <div style="font-family:${sH};font-size:15.5px;font-weight:700;line-height:1.2">Day ${dayNum}: ${e(d.title)}</div>
              </div>
              <div style="font-size:11.5px;line-height:1.45;color:#4a4352;margin-top:5px;word-break:break-word">${e(d.text)}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <div style="position:absolute;left:46px;right:46px;bottom:28px;display:flex;align-items:center;gap:8px;font-size:11.5px;color:#5a5262">
      <span style="color:#ff5e4d">${ico('shield', 14)}</span>${note()}
    </div>
  `);
}

/* =====================================================================
   DESIGN 4 — EDITORIAL
   ===================================================================== */
const eF = "'Hanken Grotesk',sans-serif", eH = "'Bricolage Grotesque',sans-serif";

function editorialBar(right: string) {
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:3px solid #111"><div style="display:flex;align-items:center;gap:8px;font-family:${eH};font-size:17px;font-weight:800;letter-spacing:1px"><span style="color:#e5431f">${ico('mountain', 20, 2.4)}</span>${BRAND.toUpperCase()}</div><div style="font-size:12px;font-weight:700;letter-spacing:2px">${right}</div></div>`;
}

export function editorialCoverSheet(Q: QuoteDataModel): string {
  const meta = (ic: string, l: string, v: string) => `
    <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #cfcfca">
      <span style="color:#e5431f;margin-top:2px">${ico(ic, 15, 2.2)}</span>
      <div>
        <div style="font-size:11px;color:#555550;font-weight:600">${l}</div>
        <div style="font-size:14px;font-weight:700">${e(v)}</div>
      </div>
    </div>`;

  const li = (t: string, c: string, ic: string) => `
    <div style="display:flex;gap:7px;align-items:center;font-size:12px;padding:3.5px 0;border-bottom:1px solid #dcdcd6">
      <span style="color:${c}">${ico(ic, 13, 3)}</span><span>${e(t)}</span>
    </div>`;

  return pg(`padding:34px 46px 32px;background:#f7f7f4;font-family:${eF};color:#111`, `
    ${editorialBar('TRAVEL QUOTATION · NO. ' + e(Q.ref))}
    <div style="display:flex;gap:28px;margin-top:20px;align-items:flex-end">
      <div style="flex:1;min-width:0">
        <div style="font-size:11.5px;letter-spacing:2px;font-weight:700;color:#c2371a">${e(Q.longDuration.toUpperCase())} · ${e(Q.city.toUpperCase())}</div>
        <div style="font-family:${eH};font-size:76px;font-weight:800;line-height:.94;letter-spacing:-2px;margin-top:8px">${brk(Q.packageName)}</div>
      </div>
      <div style="width:200px;flex:none;display:flex;flex-direction:column;border-top:1px solid #111">
        ${meta('user', 'Prepared for', Q.client)}
        ${meta('cal', 'Duration', Q.duration)}
        ${meta('car', 'Services', Q.services)}
      </div>
    </div>

    <div style="margin-top:14px;font-size:13px;line-height:1.5;color:#33332f;max-width:540px">${greeting(Q)}</div>
    ${Q.coverImage ? `<div style="margin-top:12px;height:95px;border-radius:4px;overflow:hidden;border:1px solid #111"><img src="${Q.coverImage}" alt="${e(Q.city)}" style="width:100%;height:100%;object-fit:cover;display:block" /></div>` : ''}

    <div style="margin-top:14px;display:flex;align-items:center;gap:22px;border-top:3px solid #111;border-bottom:1px solid #111;padding:10px 0">
      <div>
        <div style="font-size:11.5px;letter-spacing:2px;font-weight:700">QUOTED PACKAGE PRICE</div>
        <div style="display:flex;align-items:baseline;gap:12px;margin-top:2px">
          <div style="font-family:${eH};font-size:${(Q.discountPercent && Q.discountPercent > 0) ? '62px' : '74px'};font-weight:800;line-height:1;color:#e5431f;letter-spacing:-2px">${e(Q.price)}</div>
          ${(Q.discountPercent && Q.discountPercent > 0) ? `
            <div style="font-family:${eH};font-size:24px;font-weight:700;color:#777;text-decoration:line-through">${e(getCutPrice(Q) || '')}</div>
          ` : ''}
        </div>
      </div>
      <div style="flex:1;border-left:1px solid #111;padding-left:18px">
        <div style="display:inline-block;background:#111;color:#fff;font-size:11px;font-weight:700;letter-spacing:1px;padding:3px 9px">
          ${(Q.discountPercent && Q.discountPercent > 0) ? `${Q.discountPercent}% OFF · ALL-INCLUSIVE` : 'ALL-INCLUSIVE QUOTE'}
        </div>
        <div style="font-size:13.5px;font-weight:600;margin-top:6px;line-height:1.4">${e(Q.travellers)}<br>${e(Q.priceNote)}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-bottom:1px solid #cfcfca;padding:8px 0">
      ${Q.stats.map((s) => `
        <div>
          <div style="font-family:${eH};font-size:22px;font-weight:800">${e(s[0])}</div>
          <div style="font-size:11.5px;color:#555550">${e(s[1])}</div>
        </div>
      `).join('')}
    </div>

    <div style="margin-top:14px;font-family:${eH};font-size:18px;font-weight:800;letter-spacing:.5px">ACCOMMODATION SCHEDULE (${((Q.hotels && Q.hotels.length > 0) ? Q.hotels : [Q.hotel]).length} ${((Q.hotels && Q.hotels.length > 0) ? Q.hotels : [Q.hotel]).length > 1 ? 'HOTELS' : 'HOTEL'})</div>
    <div style="margin-top:5px;border-top:2px solid #111">
      <div style="display:grid;grid-template-columns:120px 85px 1fr 115px;gap:10px;font-size:11px;font-weight:700;letter-spacing:1px;color:#555550;padding:5px 0;border-bottom:1px solid #111">
        <div>NIGHT</div><div>CITY</div><div>HOTEL</div><div style="text-align:right">ROOM</div>
      </div>
      ${((Q.hotels && Q.hotels.length > 0) ? Q.hotels : [Q.hotel]).map(h => `
        <div style="display:grid;grid-template-columns:120px 85px 1fr 115px;gap:10px;align-items:center;padding:7px 0;border-bottom:1px solid #cfcfca">
          <div style="font-size:12.5px;font-weight:700">${e(h.nights)}</div>
          <div style="font-size:12px">${e(h.city || Q.city)}</div>
          <div>
            <div style="line-height:1.25">
              <span style="font-size:13.5px;font-weight:700;display:inline;margin-right:8px">${e(h.name)}</span>
              <span style="font-size:10px;font-weight:700;color:#e5431f;border:1px solid #e5431f;padding:0 5px;display:inline-block;vertical-align:middle;white-space:nowrap">${e(h.type)}</span>
            </div>
            ${h.rooms ? `<div style="font-size:11.5px;color:#33332f;margin-top:1px">${e(h.rooms)}</div>` : ''}
          </div>
          <div style="text-align:right">
            <div style="font-size:12.5px;font-weight:700">${e(h.room)}</div>
            <div style="font-size:11px;color:#555550">${e(Q.travellers)}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div style="margin-top:16px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px">
      <div>
        <div style="font-family:${eH};font-size:19px;font-weight:800;letter-spacing:.5px;padding-bottom:5px;border-bottom:2px solid #111">INCLUDED</div>
        ${Q.included.slice(0, 8).map((t) => li(t, '#111', 'check')).join('')}
      </div>
      <div>
        <div style="font-family:${eH};font-size:19px;font-weight:800;letter-spacing:.5px;padding-bottom:5px;border-bottom:2px solid #e5431f;color:#c2371a">EXCLUDED</div>
        ${Q.excluded.slice(0, 6).map((t) => li(t, '#e5431f', 'x')).join('')}
        ${Q.note ? `<div style="margin-top:8px;font-size:11.5px;line-height:1.4;color:#33332f;border-left:3px solid #e5431f;padding-left:8px">${e(Q.note)}</div>` : ''}
      </div>
    </div>
  `);
}

export function editorialDaysSheet(Q: QuoteDataModel, daysSlice: Array<{ title: string; text: string; img?: string }>, startIdx: number): string {
  return pg(`padding:34px 46px 32px;background:#f7f7f4;font-family:${eF};color:#111`, `
    ${editorialBar('' + e(Q.packageName.toUpperCase()) + ' · NO. ' + e(Q.ref))}
    <div style="display:flex;align-items:flex-end;justify-content:space-between;margin:16px 0 10px">
      <div style="font-family:${eH};font-size:46px;font-weight:800;line-height:.95;letter-spacing:-1.5px">The<br>itinerary</div>
      <div style="text-align:right;font-size:11px;letter-spacing:2px;font-weight:700;color:#c2371a;line-height:1.5">
        ${e(Q.longDuration.toUpperCase().replace(' / ', '<br>'))}<br>1 BASE · ${e(Q.city.toUpperCase())}
      </div>
    </div>

    <div style="border-top:2px solid #111">
      ${daysSlice.map((d, i) => {
        const dayNum = startIdx + i + 1;
        const textLen = (d.text || '').length;
        const imgH = textLen > 600 ? 175 : (textLen > 350 ? 145 : 120);
        return `
          <div style="display:flex;gap:14px;align-items:center;padding:10px 0;border-bottom:1px solid #cfcfca">
            <div style="width:58px;flex:none;font-family:${eH};font-size:44px;font-weight:800;line-height:1;color:#e5431f;letter-spacing:-2px">${String(dayNum).padStart(2, '0')}</div>
            <div style="flex:1;min-width:0">
              <div style="font-family:${eH};font-size:15px;font-weight:700;line-height:1.2">Day ${dayNum}: ${e(d.title)}</div>
              <div style="font-size:11.5px;line-height:1.45;color:#33332f;margin-top:4px;word-break:break-word">${e(d.text)}</div>
            </div>
            <div style="width:140px;height:${imgH}px;flex:none;border:1px solid #111;overflow:hidden">
              ${scene(d, startIdx + i, 'editorial')}
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <div style="position:absolute;left:46px;right:46px;bottom:26px;display:flex;align-items:center;gap:8px;font-size:11px;color:#555550">
      <span style="color:#e5431f">${ico('shield', 13)}</span>${note()}
    </div>
  `);
}

/* =====================================================================
   DESIGN 5 — PLAYFUL VIOLET
   ===================================================================== */
const pF = "'Nunito',sans-serif", pH = "'Baloo 2',sans-serif";

export function playfulCoverSheet(Q: QuoteDataModel): string {
  const tile = (bg: string, dot: string, lc: string, ic: string, l: string, v: string, fs: number) => `
    <div style="background:${bg};border-radius:22px;padding:12px 16px;height:86px;display:flex;align-items:center;gap:10px">
      <div style="width:38px;height:38px;border-radius:19px;background:${dot};color:#fff;display:flex;align-items:center;justify-content:center;flex:none">${ico(ic, 18, 2.2)}</div>
      <div>
        <div style="font-size:11px;font-weight:800;letter-spacing:1px;color:${lc}">${l}</div>
        <div style="font-family:${pH};font-size:${fs}px;font-weight:700;line-height:1.2">${e(v)}</div>
      </div>
    </div>`;

  const chip = (ic: string, t: string) => `
    <div style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.2);border-radius:999px;padding:3px 11px;font-size:12.5px;font-weight:700">
      ${ico(ic, 13, 2.4)}${e(t)}
    </div>`;

  const item = (t: string, c: string, ic: string) => `
    <div style="display:flex;gap:7px;align-items:flex-start;font-size:12px;line-height:1.35;font-weight:600">
      <span style="color:${c};margin-top:1px">${ico(ic, 13, 3)}</span><span>${e(t)}</span>
    </div>`;

  return pg(`padding:34px 40px;background:#f8f6ff;font-family:${pF};color:#1e1b3a`, `
    <div style="display:flex;gap:12px;height:270px">
      <div style="flex:1;min-width:0;position:relative;overflow:hidden;background:#4a2fe0;border-radius:30px;padding:22px 26px;color:#fff">
        ${Q.coverImage ? `<img src="${Q.coverImage}" alt="${e(Q.city)}" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;opacity:0.22;mix-blend-mode:luminosity" />` : ''}
        <div style="position:absolute;right:-40px;top:-50px;width:170px;height:170px;border-radius:85px;background:rgba(255,255,255,.1)"></div>
        <svg viewBox="0 0 460 90" preserveAspectRatio="none" style="position:absolute;left:0;bottom:0;width:100%;height:90px" aria-hidden="true">
          <path d="M0 90V50L70 14l60 34 70-40 80 46 70-26 110 36v26z" fill="rgba(255,255,255,.14)"/>
        </svg>
        <div style="position:relative;display:flex;align-items:center;gap:10px">
          <div style="width:36px;height:36px;border-radius:18px;background:#ffb996;color:#4a2fe0;display:flex;align-items:center;justify-content:center">${ico('mountain', 18, 2.4)}</div>
          <div style="font-family:${pH};font-size:19px;font-weight:700">${BRAND}</div>
        </div>
        <div style="position:relative;margin-top:22px">
          <div style="font-size:11px;letter-spacing:2px;font-weight:800;color:#ffd4bd">TRAVEL QUOTATION · REF. NO. ${e(Q.ref)}</div>
          <div style="font-family:${pH};font-size:40px;font-weight:800;line-height:1.05;margin-top:2px">${e(Q.packageName)}</div>
        </div>
        <div style="position:relative;display:flex;gap:7px;margin-top:10px">
          ${chip('cal', Q.duration)}
          ${chip('pin', Q.city)}
          ${chip('user', Q.travellers)}
        </div>
      </div>

      <div style="width:230px;flex:none;background:#ffb996;border-radius:30px;padding:22px 20px;display:flex;flex-direction:column;justify-content:space-between">
        <div>
          <div style="font-size:11px;letter-spacing:1.5px;font-weight:800;color:#5a2a10">QUOTED PACKAGE PRICE</div>
          <div style="font-family:${pH};font-size:${(Q.discountPercent && Q.discountPercent > 0) ? '36px' : '42px'};font-weight:800;line-height:1.1;margin-top:4px;color:#2a1240">${e(Q.price)}</div>
          ${(Q.discountPercent && Q.discountPercent > 0) ? `
            <div style="font-size:14px;font-weight:700;color:#7a3518;text-decoration:line-through;margin-top:2px;line-height:1.1">${e(getCutPrice(Q) || '')}</div>
          ` : ''}
        </div>
        <div>
          <div style="display:inline-block;background:#2a1240;color:#fff;font-size:11px;font-weight:800;letter-spacing:1px;padding:3px 10px;border-radius:999px">
            ${(Q.discountPercent && Q.discountPercent > 0) ? `${Q.discountPercent}% OFF · ALL-INCLUSIVE` : 'ALL-INCLUSIVE QUOTE'}
          </div>
          <div style="font-size:12.5px;font-weight:700;line-height:1.35;margin-top:6px;color:#3d1f10">${e(Q.priceNote)}</div>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:10px">
      ${tile('#e5dcff', '#4a2fe0', '#3c2a8a', 'user', 'PREPARED FOR', Q.client, 17)}
      ${tile('#c9f2e3', '#12805c', '#0c5a41', 'pin', 'PACKAGE', Q.packageName, 17)}
      ${tile('#ffe58a', '#8a5a00', '#5e3d00', 'car', 'SERVICES', Q.services, 15)}
    </div>

    <div style="margin-top:10px;font-size:12.5px;line-height:1.5;color:#3d3a5c">${greeting(Q)}</div>

    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:10px">
      ${Q.stats.map((s) => `
        <div style="background:#fff;border:2px solid #e5dcff;border-radius:18px;padding:7px 5px;text-align:center">
          <div style="font-family:${pH};font-size:20px;font-weight:800;color:#4a2fe0;line-height:1.1">${e(s[0])}</div>
          <div style="font-size:11px;color:#4a4670;font-weight:600">${e(s[1])}</div>
        </div>
      `).join('')}
    </div>

    <div style="margin-top:10px;display:flex;flex-direction:column;gap:6px">
      ${((Q.hotels && Q.hotels.length > 0) ? Q.hotels : [Q.hotel]).map(h => `
        <div style="background:#fff;border:2px solid #e5dcff;border-radius:18px;padding:${(Q.hotels && Q.hotels.length > 1) ? '8px 14px' : '12px 18px'};display:flex;align-items:center;gap:12px">
          <div style="width:${(Q.hotels && Q.hotels.length > 1) ? '34px' : '42px'};height:${(Q.hotels && Q.hotels.length > 1) ? '34px' : '42px'};border-radius:12px;background:#4a2fe0;color:#fff;display:flex;align-items:center;justify-content:center;flex:none">${ico('bed', (Q.hotels && Q.hotels.length > 1) ? 18 : 22)}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:10px;letter-spacing:1px;font-weight:800;color:#3c2a8a">${e(h.nights.toUpperCase())} · ${e((h.city || Q.city).toUpperCase())}</div>
            <div style="margin-top:1px;line-height:1.25">
              <span style="font-family:${pH};font-size:${(Q.hotels && Q.hotels.length > 1) ? '15px' : '18px'};font-weight:700;display:inline;margin-right:8px">${e(h.name)}</span>
              <span style="background:#ffe58a;color:#5e3d00;font-size:10px;font-weight:800;padding:1.5px 8px;border-radius:999px;display:inline-block;vertical-align:middle;white-space:nowrap">${e(h.type)}</span>
            </div>
            <div style="font-size:11.5px;color:#4a4670;margin-top:2px">${e(h.room)}${h.rooms ? ` · ${e(h.rooms)}` : ''}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px">
      <div style="background:#e3f7ee;border-radius:24px;padding:14px 18px">
        <div style="display:flex;align-items:center;gap:8px;font-family:${pH};font-size:18px;font-weight:700;color:#0c5a41;margin-bottom:6px">
          <span style="width:24px;height:24px;border-radius:12px;background:#12805c;color:#fff;display:flex;align-items:center;justify-content:center">${ico('check', 14, 3)}</span>Included
        </div>
        <div style="display:flex;flex-direction:column;gap:5px">${Q.included.slice(0, 8).map((t) => item(t, '#12805c', 'check')).join('')}</div>
      </div>
      <div style="background:#ffe8e4;border-radius:24px;padding:14px 18px">
        <div style="display:flex;align-items:center;gap:8px;font-family:${pH};font-size:18px;font-weight:700;color:#9c2b22;margin-bottom:6px">
          <span style="width:24px;height:24px;border-radius:12px;background:#c0392b;color:#fff;display:flex;align-items:center;justify-content:center">${ico('x', 14, 3)}</span>Not included
        </div>
        <div style="display:flex;flex-direction:column;gap:5px">${Q.excluded.slice(0, 6).map((t) => item(t, '#c0392b', 'x')).join('')}</div>
        ${Q.note ? `<div style="margin-top:8px;font-size:11px;line-height:1.4;color:#5e3d00;background:#ffe58a;border-radius:12px;padding:6px 10px;font-weight:600">${e(Q.note)}</div>` : ''}
      </div>
    </div>
  `);
}

export function playfulDaysSheet(Q: QuoteDataModel, daysSlice: Array<{ title: string; text: string; img?: string }>, startIdx: number): string {
  const tints = ['#e5dcff', '#c9f2e3', '#fff1b8', '#ffd9c7', '#d8e8ff'];
  return pg(`padding:34px 40px;background:#f8f6ff;font-family:${pF};color:#1e1b3a`, `
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div style="display:flex;align-items:center;gap:8px;font-family:${pH};font-size:18px;font-weight:700">
        <span style="width:28px;height:28px;border-radius:14px;background:#4a2fe0;color:#fff;display:flex;align-items:center;justify-content:center">${ico('mountain', 15, 2.4)}</span>${BRAND}
      </div>
      <div style="font-size:12px;color:#4a4670;font-weight:600">${e(Q.packageName)} · Ref. No. ${e(Q.ref)}</div>
    </div>
    <div style="display:flex;align-items:center;gap:12px;margin:12px 0 14px">
      <div style="font-family:${pH};font-size:36px;font-weight:800;line-height:1.1;color:#4a2fe0">Your adventure</div>
      <div style="background:#ffb996;color:#3d1f10;font-size:11.5px;font-weight:800;letter-spacing:1px;padding:3px 11px;border-radius:999px">${e(Q.duration)}</div>
    </div>

    <div style="display:flex;flex-direction:column;gap:9px">
      ${daysSlice.map((d, i) => {
        const dayNum = startIdx + i + 1;
        const textLen = (d.text || '').length;
        const imgH = textLen > 600 ? 175 : (textLen > 350 ? 150 : 124);
        return `
          <div style="display:flex;gap:14px;align-items:center;background:${tints[(startIdx + i) % 5]};border-radius:22px;padding:10px 12px">
            <div style="width:175px;height:${imgH}px;flex:none;border-radius:16px;overflow:hidden;position:relative">
              ${scene(d, startIdx + i, 'playful')}
              <div style="position:absolute;left:7px;top:7px;background:#fff;color:#4a2fe0;font-family:${pH};font-size:12px;font-weight:800;padding:1px 8px;border-radius:999px">DAY ${dayNum}</div>
            </div>
            <div style="flex:1;min-width:0;padding-right:8px">
              <div style="font-family:${pH};font-size:16px;font-weight:700;line-height:1.2">${e(d.title)}</div>
              <div style="font-size:11.5px;line-height:1.45;color:#2f2b52;margin-top:4px;font-weight:500;word-break:break-word">${e(d.text)}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <div style="position:absolute;left:40px;right:40px;bottom:28px;display:flex;align-items:center;gap:8px;font-size:11.5px;color:#4a4670">
      <span style="color:#4a2fe0">${ico('shield', 14)}</span>${note()}
    </div>
  `);
}

/* =====================================================================
   MAIN BUILDER: Renders all pages for a chosen design
   ===================================================================== */
export const AVAILABLE_QUOTE_DESIGNS = [
  { id: 'royal', name: 'Royal Gold', dot: '#d4af37', font: 'Playfair Display + Manrope', desc: 'Classic regal luxury with gold trims and majestic dark navy headers.' },
  { id: 'alpine', name: 'Alpine Teal', dot: '#0f4c4a', font: 'DM Serif Display + DM Sans', desc: 'Mountain green & golden amber, designed for hill excursions & nature trails.' },
  { id: 'sunset', name: 'Sunset Coral', dot: '#ff6a3d', font: 'Outfit + Nunito Sans', desc: 'Warm sunset gradient banner, circular price stamp, energetic leisure layout.' },
  { id: 'editorial', name: 'Editorial', dot: '#111111', font: 'Bricolage Grotesque + Hanken', desc: 'High-contrast monochrome with red accent, bold typography, magazine aesthetic.' },
  { id: 'playful', name: 'Playful Violet', dot: '#4a2fe0', font: 'Baloo 2 + Nunito', desc: 'Vibrant modern purple & peach colors with rounded cards and playful curves.' }
];

/**
 * Smart content-aware dynamic pagination for itinerary days.
 * Calculates exact estimated card heights based on text character count and title length.
 * Accurately fits cards onto 1123px A4 pages without slicing or cutting off cards.
 */
export function chunkItineraryDays(
  days: Array<{ title: string; text: string; img?: string }>,
  _key = 'royal'
): Array<{ slice: Array<{ title: string; text: string; img?: string }>; startIdx: number }> {
  // A4 Page Height = 1123px. Overhead is ~240px (header, footer, padding).
  // Available budget is ~820px to ensure zero clipping across all browser engines.
  const maxPageBudget = 820;
  const result: Array<{ slice: Array<{ title: string; text: string; img?: string }>; startIdx: number }> = [];

  let currentSlice: Array<{ title: string; text: string; img?: string }> = [];
  let currentSliceStartIdx = 0;
  let currentBudget = 0;

  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    const textLen = (d.text || '').length;
    const titleLen = (d.title || '').length;

    // Estimate lines based on text column width (~65 chars per line)
    const lines = Math.ceil(textLen / 65) + (titleLen > 40 ? 1 : 0);
    const textH = lines * 17.5;
    const imgH = textLen > 600 ? 185 : (textLen > 350 ? 155 : 126);

    // Height of this card = content + padding + gap
    const cardH = Math.max(textH + 45, imgH + 26) + 12;

    // If adding this card exceeds the budget and we already have at least 1 card in this slice:
    // or if we already have 4 cards in this slice (never cram more than 4 cards on an A4 sheet):
    if (currentSlice.length > 0 && (currentBudget + cardH > maxPageBudget || currentSlice.length >= 4)) {
      result.push({ slice: currentSlice, startIdx: currentSliceStartIdx });
      currentSlice = [d];
      currentSliceStartIdx = i;
      currentBudget = cardH;
    } else {
      currentSlice.push(d);
      currentBudget += cardH;
    }
  }

  if (currentSlice.length > 0) {
    result.push({ slice: currentSlice, startIdx: currentSliceStartIdx });
  }

  return result;
}

export function renderCompleteProposalHtml(Q: QuoteDataModel, designId = 'royal', customPartners?: PartnerBrand[]): string {
  const normId = (designId || 'royal').toLowerCase();
  let key = 'royal';
  if (normId.includes('alpine') || normId.includes('emerald')) key = 'alpine';
  else if (normId.includes('sunset') || normId.includes('coral')) key = 'sunset';
  else if (normId.includes('editorial') || normId.includes('dark')) key = 'editorial';
  else if (normId.includes('playful') || normId.includes('violet')) key = 'playful';

  const pages: string[] = [];

  // 1. Cover Page
  if (key === 'royal') pages.push(royalCoverSheet(Q));
  else if (key === 'alpine') pages.push(alpineCoverSheet(Q));
  else if (key === 'sunset') pages.push(sunsetCoverSheet(Q));
  else if (key === 'editorial') pages.push(editorialCoverSheet(Q));
  else if (key === 'playful') pages.push(playfulCoverSheet(Q));
  // 2. Day-wise Itinerary Pages (smart content-aware chunking so NO day is cut across pages)
  const totalDays = Q.days.length > 0 ? Q.days : [
    { title: 'Arrival & Hotel Check-in', text: 'Arrive at destination, private transfer to hotel and evening leisure.' },
    { title: 'Local Sightseeing & Experiences', text: 'Full day sightseeing tour exploring key heritage landmarks and markets.' },
    { title: 'Departure with Cherished Memories', text: 'Breakfast at hotel and seamless transfer to airport / railway station.' }
  ];

  const chunks = chunkItineraryDays(totalDays, key);
  for (const c of chunks) {
    if (key === 'royal') pages.push(royalDaysSheet(Q, c.slice, c.startIdx));
    else if (key === 'alpine') pages.push(alpineDaysSheet(Q, c.slice, c.startIdx));
    else if (key === 'sunset') pages.push(sunsetDaysSheet(Q, c.slice, c.startIdx));
    else if (key === 'editorial') pages.push(editorialDaysSheet(Q, c.slice, c.startIdx));
    else if (key === 'playful') pages.push(playfulDaysSheet(Q, c.slice, c.startIdx));
  }

  // 3. Terms & Policy Page (with custom or default hotel and travel partner badges)
  pages.push(renderTermsSheet(Q, key, customPartners));

  return pages.join('\n');
}
