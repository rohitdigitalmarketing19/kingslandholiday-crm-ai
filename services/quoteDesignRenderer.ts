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
 *  - Page 1: Cover / Overview (natural-height sections, fixed 14px gap, footer pinned at bottom)
 *  - If Inclusions/Exclusions overflow Cover: dedicated Inclusions & Exclusions sheet(s) directly following cover
 *  - Page 2+: Day-wise Itinerary (height-aware chunking, image on TOP before title, title and text below image, natural height cards)
 *  - Page Last: Terms & Cancellation Policy (natural heights, fixed gaps, partner boxes directly below content, advisor footer at bottom)
 */

import {
  HOTEL_PARTNERS,
  TRAVEL_PARTNERS,
  PartnerBrand,
  renderPartnerBadgeHtml,
  deduplicatePartners,
} from '../utils/partnerLogos';

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
  advisor?: {
    name: string;
    role: string;
    phones: string;
    email: string;
  };
  stats?: [string, string][];
  included: string[];
  excluded: string[];
  note?: string;
  days: Array<{
    title: string;
    text: string;
    img?: string;
  }>;
  termsText?: string;
  logoUrl?: string;
  companyName?: string;
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

const ico = (n: string, s = 16, w = 2) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:inline-block;vertical-align:-0.15em;flex:none;width:${s}px;height:${s}px">${IC[n] || ''}</svg>`;

const greeting = (Q: QuoteDataModel) =>
  `Dear <b>${e(Q.client)}</b>, thank you for considering ${BRAND}. Please find below our detailed quotation for your requested itinerary.`;

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
  playful: { sky: '#e4dcff', far: '#b9a6ff', mid: '#7b5cf5', near: '#3b2a9c', accent: '#ff9f7a' },
  diwali: { sky: '#ffeedb', far: '#f79d5c', mid: '#e65100', near: '#1b0b2e', accent: '#ffd700' }
};

const SC = [
  (p: any) => `<rect width="400" height="240" fill="${p.sky}"/><circle cx="305" cy="62" r="26" fill="${p.accent}"/><polygon points="0,150 70,80 120,125 190,55 270,135 330,90 400,140 400,240 0,240" fill="${p.far}"/><polygon points="0,182 90,122 170,172 250,116 340,172 400,152 400,240 0,240" fill="${p.mid}"/><rect y="196" width="400" height="44" fill="${p.near}"/><polygon points="140,240 260,240 214,170 188,170" fill="#2b2f3a"/><path d="M201 236 L203 208 M204 198 L205 184" stroke="#fff" stroke-width="3" stroke-dasharray="10 8" fill="none"/>`,
  (p: any) => `<rect width="400" height="240" fill="${p.sky}"/><polygon points="0,140 80,70 140,120 220,50 300,120 360,80 400,120 400,240 0,240" fill="${p.far}"/><polygon points="0,170 100,115 200,165 300,110 400,160 400,240 0,240" fill="${p.mid}"/><rect y="190" width="400" height="50" fill="${p.near}"/><polygon points="20,192 38,140 56,192" fill="${p.near}"/><polygon points="62,192 80,150 98,192" fill="${p.near}"/><polygon points="300,192 318,142 336,192" fill="${p.near}"/><polygon points="344,192 362,150 380,192" fill="${p.near}"/><rect x="170" y="152" width="60" height="40" fill="${p.accent}"/><polygon points="150,154 250,154 200,124" fill="${p.mid}"/><rect x="183" y="112" width="34" height="14" fill="${p.accent}"/><polygon points="172,114 228,114 200,90" fill="${p.mid}"/><rect x="199" y="74" width="2" height="18" fill="${p.mid}"/><rect x="192" y="166" width="16" height="26" fill="${p.near}"/>`,
  (p: any) => `<rect width="400" height="240" fill="${p.sky}"/><circle cx="80" cy="60" r="22" fill="${p.accent}"/><polygon points="0,130 60,90 130,125 210,70 290,120 350,85 400,115 400,240 0,240" fill="${p.far}"/><polygon points="0,165 120,125 220,160 320,120 400,155 400,240 0,240" fill="${p.mid}"/><path d="M0 208 C80 186 150 230 230 206 S350 190 400 212 L400 240 L0 240 Z" fill="${p.sky}"/><rect x="30" y="150" width="30" height="24" fill="${p.near}"/><polygon points="26,150 64,150 45,132" fill="${p.accent}"/><rect x="76" y="156" width="24" height="20" fill="${p.near}"/><polygon points="72,156 104,156 88,140" fill="${p.accent}"/><rect x="300" y="146" width="36" height="30" fill="${p.near}"/><polygon points="294,146 342,146 318,126" fill="${p.accent}"/><rect x="346" y="156" width="26" height="22" fill="${p.near}"/><polygon points="342,156 376,156 359,140" fill="${p.accent}"/>`,
  (p: any) => `<rect width="400" height="240" fill="${p.sky}"/><polygon points="0,200 90,70 150,140 230,40 320,150 360,100 400,160 400,240 0,240" fill="${p.far}"/><polygon points="90,70 70,102 84,96 95,110 108,98" fill="#fff"/><polygon points="230,40 204,88 220,80 232,98 246,82 264,94" fill="#fff"/><polygon points="360,100 346,124 356,119 364,128 374,118" fill="#fff"/><polygon points="0,205 110,150 210,195 300,150 400,200 400,240 0,240" fill="${p.mid}"/><rect y="215" width="400" height="25" fill="${p.near}"/><polygon points="30,218 46,176 62,218" fill="${p.near}"/><polygon points="70,218 84,184 98,218" fill="${p.near}"/><polygon points="330,218 346,178 362,218" fill="${p.near}"/><ellipse cx="305" cy="52" rx="20" ry="8" fill="${p.accent}"/><path d="M290 58 L305 78 M320 58 L305 78" stroke="${p.near}" stroke-width="1.5" fill="none"/>`,
  (p: any) => `<rect width="400" height="240" fill="${p.sky}"/><circle cx="200" cy="128" r="48" fill="${p.accent}"/><polygon points="0,140 80,100 150,135 230,95 320,138 400,105 400,240 0,240" fill="${p.far}"/><polygon points="0,172 110,138 200,168 300,132 400,170 400,240 0,240" fill="${p.mid}"/><polygon points="0,205 120,180 260,205 400,185 400,240 0,240" fill="${p.near}"/><path d="M150 240 C180 215 230 205 250 190" stroke="#2b2f3a" stroke-width="22" fill="none"/><path d="M150 240 C180 215 230 205 250 190" stroke="#fff" stroke-width="2" stroke-dasharray="8 7" fill="none"/>`
];

const scene = (d: any, i: number, key: string) => d.img
  ? `<img src="${d.img}" alt="" crossOrigin="anonymous" style="width:100%;height:100%;object-fit:cover;object-position:center 35%;display:block">`
  : `<svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block" aria-hidden="true">${SC[i % 5](PAL[key] || PAL.royal)}</svg>`;

const pg = (style: string, inner: string, design = '') =>
  `<div class="sheet" data-design="${design}" style="width:794px;height:1123px;position:relative;overflow:hidden;box-sizing:border-box;background:#ffffff;margin:0 auto;box-shadow:0 6px 24px rgba(20,24,50,.14);display:flex;flex-direction:column;justify-content:flex-start;${style}">${inner}</div>`;

/* Theme settings for Terms and Shared styling */
export const TH: Record<string, any> = {
  royal: {
    bg: '#fdfbf6', ink: '#1b2540', muted: '#3b455f', accent: '#d4af37', onAccent: '#12213f',
    line: '#e3dac0', card: '#ffffff', footBg: '#12213f', footInk: '#ffffff',
    head: "'Playfair Display',serif", body: "'Manrope',sans-serif", radius: '14px', sec: 'rule',
    incBg: '#eef7f1', incBorder: '#bfe0cc', incTitle: '#14573a', incCheck: '#1f8a5b',
    excBg: '#fdf1f0', excBorder: '#efc4c0', excTitle: '#9c2b22', excX: '#c0392b',
    noteBg: '#fbf1d6', noteColor: '#6b4f10',
  },
  alpine: {
    bg: '#fbfdfc', ink: '#12302f', muted: '#3f5a58', accent: '#f2a93b', onAccent: '#2a1c00',
    line: '#cfe5e1', card: '#e6f4f1', footBg: '#0f4c4a', footInk: '#ffffff',
    head: "'DM Serif Display',serif", body: "'DM Sans',sans-serif", radius: '16px', sec: 'pill',
    incBg: '#e6f4f1', incBorder: '#b0d9cf', incTitle: '#0f4c4a', incCheck: '#1a7a74',
    excBg: '#fdf1f0', excBorder: '#efc4c0', excTitle: '#9c2b22', excX: '#c0392b',
    noteBg: '#fef3d6', noteColor: '#6b4f10',
  },
  sunset: {
    bg: '#fffaf6', ink: '#231f2b', muted: '#4a4352', accent: '#ff6a3d', onAccent: '#ffffff',
    line: '#f3d9c8', card: '#fff1e6', footBg: '#231f2b', footInk: '#ffffff',
    head: "'Outfit',sans-serif", body: "'Nunito Sans',sans-serif", radius: '20px', sec: 'bar',
    incBg: '#e8f7ee', incBorder: '#bfe0cc', incTitle: '#14573a', incCheck: '#1f8a5b',
    excBg: '#fdeaea', excBorder: '#efc4c0', excTitle: '#9c2b22', excX: '#c0392b',
    noteBg: '#ffe9c7', noteColor: '#7a3a00',
  },
  editorial: {
    bg: '#f7f7f4', ink: '#111111', muted: '#33332f', accent: '#e5431f', onAccent: '#ffffff',
    line: '#cfcfca', card: '#ffffff', footBg: '#111111', footInk: '#ffffff',
    head: "'Bricolage Grotesque',sans-serif", body: "'Hanken Grotesk',sans-serif", radius: '0px', sec: 'rule',
    incBg: '#ffffff', incBorder: '#111111', incTitle: '#111111', incCheck: '#111111',
    excBg: '#ffffff', excBorder: '#e5431f', excTitle: '#e5431f', excX: '#e5431f',
    noteBg: '#f0efeb', noteColor: '#111111',
  },
  playful: {
    bg: '#f8f6ff', ink: '#1e1b3a', muted: '#3d3a5c', accent: '#4a2fe0', onAccent: '#ffffff',
    line: '#ddd3ff', card: '#ffffff', footBg: '#4a2fe0', footInk: '#ffffff',
    head: "'Baloo 2',sans-serif", body: "'Nunito',sans-serif", radius: '24px', sec: 'pill',
    incBg: '#e3f7ee', incBorder: '#bfe0cc', incTitle: '#0c5a41', incCheck: '#12805c',
    excBg: '#ffe8e4', excBorder: '#efc4c0', excTitle: '#9c2b22', excX: '#c0392b',
    noteBg: '#ffe58a', noteColor: '#5e3d00',
  },
  diwali: {
    bg: '#fffbf2', ink: '#1b0b2e', muted: '#4a385a', accent: '#ff9900', onAccent: '#1b0b2e',
    line: '#ffe0b2', card: '#ffffff', footBg: '#1b0b2e', footInk: '#ffffff',
    head: "'Playfair Display',serif", body: "'Manrope',sans-serif", radius: '16px', sec: 'pill',
    incBg: '#fff8e7', incBorder: '#ffd599', incTitle: '#b26a00', incCheck: '#e65100',
    excBg: '#fdf1f0', excBorder: '#efc4c0', excTitle: '#9c2b22', excX: '#c0392b',
    noteBg: '#fff3d6', noteColor: '#7a4100',
  }
};

/* =====================================================================
   NORMALIZATION & ESTIMATION HELPERS
   ===================================================================== */

/**
 * Normalises list items: strips leading bullets/dashes, trims, ignores empty lines,
 * and cleanly splits multiple items embedded with \n.
 */
export function normalizeListItems(items: string[]): string[] {
  const result: string[] = [];
  if (!items || !Array.isArray(items)) return result;
  for (const item of items) {
    if (!item) continue;
    const lines = String(item).split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim().replace(/^[\u2022\u25cf\u25cb\u25aa\u25ab\u2023\u2219\*\-\+]\s*/, '').trim();
      if (trimmed.length > 0) {
        result.push(trimmed);
      }
    }
  }
  return result;
}

/**
 * Estimates block heights and whether Inclusions / Exclusions fit on the cover sheet.
 * Calculation:
 *  - Sheet Height = 1123px.
 *  - Fixed overhead on cover (banner, tiles, greeting, price, stats, hotel header, footer, paddings, gaps)
 *  - Hotels: each hotel row ≈ 48-54px.
 *  - Inclusions / Exclusions: 2-column grid with ~50 chars per line (line-height 17px + 5px gap).
 * If total estimated height > (1123 - 40px), inclusions must move to dedicated sheet.
 */
export function estimateBlockHeight(
  Q: QuoteDataModel,
  design = 'royal'
): { fitsOnCover: boolean; totalEstimatedHeight: number; coverBaseHeight: number; incExcGridHeight: number } {
  const allHotels = (Q.hotels && Q.hotels.length > 0) ? Q.hotels : (Q.hotel ? [Q.hotel] : []);
  const hotelCount = Math.max(1, allHotels.length);

  // Base overhead by design (without hotels and without inclusions/exclusions)
  let baseWithoutHotels = 600;
  if (design === 'royal' || design === 'diwali') baseWithoutHotels = 610;
  else if (design === 'alpine') baseWithoutHotels = 590;
  else if (design === 'sunset') baseWithoutHotels = 600;
  else if (design === 'editorial') baseWithoutHotels = 620;
  else if (design === 'playful') baseWithoutHotels = 615;

  const hotelsHeight = (hotelCount * 50) + 36; // hotels + section header
  const coverBaseHeight = baseWithoutHotels + hotelsHeight;

  // Inclusions / Exclusions calculation
  const incList = normalizeListItems(Q.included);
  const excList = normalizeListItems(Q.excluded);

  let incHeight = 36; // Header "Included"
  for (const item of incList) {
    const lines = Math.ceil(item.length / 50) || 1;
    incHeight += (lines * 17) + 5;
  }

  let excHeight = 36; // Header "Excluded"
  if (excList.length === 0) {
    excHeight += 24; // "Nothing excluded"
  } else {
    for (const item of excList) {
      const lines = Math.ceil(item.length / 50) || 1;
      excHeight += (lines * 17) + 5;
    }
  }
  if (Q.note) {
    const noteLines = Math.ceil(Q.note.length / 45) || 1;
    excHeight += (noteLines * 16) + 18;
  }

  // 2-column grid height matches taller list + 28px box padding + 14px gap
  const incExcGridHeight = Math.max(incHeight, excHeight) + 28 + 14;
  const totalEstimatedHeight = coverBaseHeight + incExcGridHeight;

  // Maximum safe content height on cover is 1080px (1123 minus safety margin)
  const fitsOnCover = totalEstimatedHeight <= 1080;

  return { fitsOnCover, totalEstimatedHeight, coverBaseHeight, incExcGridHeight };
}

/**
 * Estimates day card height based on vertically stacked layout:
 * Image on top (before title), then title and description text below image.
 * Text & title span the full width (~660-690px), yielding ~75 chars/line for title, ~88 chars/line for text.
 */
export function estimateDayCardHeight(d: { title: string; text: string; img?: string }): number {
  const textChars = (d.text || '').length;
  const titleChars = (d.title || '').length;

  const titleLines = Math.ceil(titleChars / 75) || 1;
  const titleHeight = titleLines * 22; // ~15.5px font, line-height ~1.3

  const textParagraphs = (d.text || '').split(/\r?\n/);
  let textLines = 0;
  for (const p of textParagraphs) {
    textLines += Math.ceil(p.length / 88) || 1;
  }
  const textHeight = textLines * 17; // ~11.5px font * 1.45 line-height

  // Image height stacked on top of title (generous photo size so pictures show properly without severe cropping)
  const imgHeight = textChars > 500 ? 190 : (textChars > 300 ? 210 : 230);

  // Card padding (12px top + 12px bottom = 24px)
  // Gaps: 10px between image & title, 6px between title & text = 16px
  const cardPaddingAndGaps = 24 + 16;

  return imgHeight + titleHeight + textHeight + cardPaddingAndGaps;
}

/**
 * Smart content-aware dynamic pagination for itinerary days.
 * Estimates each card's height from title and text length.
 * Adds cards to page until adding next would exceed available height (1123 minus overhead).
 * Never splits a day across pages. Leftover space stays at the bottom.
 */
export function chunkItineraryDays(
  days: Array<{ title: string; text: string; img?: string }>,
  _key = 'royal'
): Array<{ slice: Array<{ title: string; text: string; img?: string }>; startIdx: number }> {
  if (!days || days.length === 0) return [];

  // Available budget on Days sheet: 1123 - padding(56) - header(88) - footer(40) = 939px.
  // Use safe budget of 880px to guarantee zero overflow across all fonts/browsers.
  const maxPageBudget = 880;
  const cardGap = 12;
  const result: Array<{ slice: Array<{ title: string; text: string; img?: string }>; startIdx: number }> = [];

  let currentSlice: Array<{ title: string; text: string; img?: string }> = [];
  let currentSliceStartIdx = 0;
  let currentHeight = 0;

  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    const cardH = estimateDayCardHeight(d);
    const additionalGap = currentSlice.length > 0 ? cardGap : 0;

    if (currentSlice.length > 0 && (currentHeight + additionalGap + cardH > maxPageBudget)) {
      result.push({ slice: currentSlice, startIdx: currentSliceStartIdx });
      currentSlice = [d];
      currentSliceStartIdx = i;
      currentHeight = cardH;
    } else {
      currentSlice.push(d);
      currentHeight += additionalGap + cardH;
    }
  }

  if (currentSlice.length > 0) {
    result.push({ slice: currentSlice, startIdx: currentSliceStartIdx });
  }

  return result;
}

/* =====================================================================
   INCLUSIONS / EXCLUSIONS 2-COLUMN GRID HELPER
   ===================================================================== */

/**
 * Renders the 2-column Inclusions and Exclusions grid.
 * Requirements:
 *  - Shows ALL items (NO .slice()). 15 in = 15 out.
 *  - Boxes take natural height, align-items: stretch so shorter side matches taller side.
 *  - Equal padding-top and padding-bottom (12px 16px).
 *  - If excluded is empty: "Nothing excluded".
 *  - If note exists, sits inside Excluded box at natural height.
 */
function renderIncExcGrid(
  included: string[],
  excluded: string[],
  noteText: string | undefined,
  th: any
): string {
  const incItems = normalizeListItems(included);
  const excItems = normalizeListItems(excluded);

  const incListHtml = incItems.length > 0
    ? incItems.map(t => `
        <div style="display:flex;gap:7px;align-items:flex-start;font-size:11.5px;line-height:1.35;color:${th.ink}">
          <span style="color:${th.incCheck};margin-top:1px">${ico('check', 12, 3)}</span><span>${e(t)}</span>
        </div>
      `).join('')
    : `<div style="font-size:11.5px;color:${th.muted};font-style:italic">No specific inclusions mentioned</div>`;

  const excListHtml = excItems.length > 0
    ? excItems.map(t => `
        <div style="display:flex;gap:7px;align-items:flex-start;font-size:11.5px;line-height:1.35;color:${th.ink}">
          <span style="color:${th.excX};margin-top:1px">${ico('x', 12, 3)}</span><span>${e(t)}</span>
        </div>
      `).join('')
    : `<div style="font-size:11.5px;color:${th.muted};font-style:italic">Nothing excluded</div>`;

  const noteHtml = noteText
    ? `<div style="margin-top:8px;font-size:11px;line-height:1.4;color:${th.noteColor};background:${th.noteBg};border-radius:8px;padding:6px 9px">${e(noteText)}</div>`
    : '';

  return `
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:stretch;width:100%;box-sizing:border-box">
      <div style="background:${th.incBg};border:1px solid ${th.incBorder};border-radius:${th.radius};padding:12px 16px;display:flex;flex-direction:column;justify-content:flex-start;box-sizing:border-box">
        <div style="display:flex;align-items:center;gap:8px;font-family:${th.head};font-size:16px;font-weight:700;color:${th.incTitle};margin-bottom:8px">
          ${ico('check', 16, 2.4)} Included
        </div>
        <div style="display:flex;flex-direction:column;gap:5px">
          ${incListHtml}
        </div>
      </div>

      <div style="background:${th.excBg};border:1px solid ${th.excBorder};border-radius:${th.radius};padding:12px 16px;display:flex;flex-direction:column;justify-content:flex-start;box-sizing:border-box">
        <div style="display:flex;align-items:center;gap:8px;font-family:${th.head};font-size:16px;font-weight:700;color:${th.excTitle};margin-bottom:8px">
          ${ico('x', 16, 2.4)} Excluded
        </div>
        <div style="display:flex;flex-direction:column;gap:5px">
          ${excListHtml}
        </div>
        ${noteHtml}
      </div>
    </div>
  `;
}

/* =====================================================================
   TERMS & CANCELLATION SHEET (ALL 5 DESIGNS)
   ===================================================================== */

/**
 * Parses dynamic or default terms into structured atomic sections.
 */
function parseTermsSections(termsText?: string): Array<{ title: string; bullets?: string[]; isFees?: boolean }> {
  if (!termsText || termsText.trim().length < 20) {
    return [
      { title: 'Cancellation policy · land package', isFees: true },
      { title: 'Hotels & accommodation', bullets: DEFAULT_TERMS.hotels },
      { title: 'Important information', bullets: DEFAULT_TERMS.important },
      { title: 'Pure agent declaration', bullets: DEFAULT_TERMS.agent },
    ];
  }

  const sections: Array<{ title: string; bullets?: string[]; isFees?: boolean }> = [];
  let currentSection: { title: string; bullets: string[]; isFees?: boolean } = {
    title: 'Standard Terms & Conditions',
    bullets: [],
  };

  const rawLines = termsText.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of rawLines) {
    const lower = line.toLowerCase();
    if (
      lower.startsWith('cancellation policy') ||
      lower.startsWith('hotels') ||
      lower.startsWith('important') ||
      lower.startsWith('pure agent') ||
      lower.startsWith('payment schedule') ||
      line.endsWith(':')
    ) {
      if (currentSection.bullets.length > 0 || currentSection.title !== 'Standard Terms & Conditions') {
        sections.push(currentSection);
      }
      currentSection = {
        title: line.replace(/:$/, ''),
        bullets: [],
        isFees: lower.startsWith('cancellation policy') && lower.includes('land'),
      };
    } else if (lower === 'terms & conditions' || lower === 'terms and conditions') {
      // skip top header
    } else {
      const bullet = line.replace(/^[\u2022\u25cf\u25cb\u25aa\u25ab\u2023\u2219\*\-\+]\s*/, '').trim();
      if (bullet) {
        currentSection.bullets.push(bullet);
      }
    }
  }

  if (currentSection.bullets.length > 0) {
    sections.push(currentSection);
  }

  return sections.length > 0 ? sections : [
    { title: 'Cancellation policy · land package', isFees: true },
    { title: 'Hotels & accommodation', bullets: DEFAULT_TERMS.hotels },
    { title: 'Important information', bullets: DEFAULT_TERMS.important },
    { title: 'Pure agent declaration', bullets: DEFAULT_TERMS.agent },
  ];
}

export function renderTermsSheet(Q: QuoteDataModel, thKey = 'royal', customPartners?: PartnerBrand[]): string {
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

  return pg(
    `padding:28px 42px 20px;background:${th.bg};color:${th.ink};font-family:${th.body};display:flex;flex-direction:column;justify-content:flex-start;gap:14px;box-sizing:border-box`,
    `
    <!-- Header -->
    <div style="flex:none">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:12px">
          ${Q.logoUrl ? `<div style="background:#ffffff;padding:4px 10px;border-radius:8px;border:1px solid ${th.line};box-shadow:0 2px 6px rgba(0,0,0,0.06);display:flex;align-items:center"><img src="${Q.logoUrl}" alt="${e(Q.companyName || BRAND)}" crossOrigin="anonymous" style="max-height:34px;max-width:130px;width:auto;height:auto;object-fit:contain;display:block" /></div>` : ''}
          <div style="font-family:${th.head};font-size:18px;font-weight:700">${e(Q.companyName || BRAND)}</div>
        </div>
        <div style="font-size:11px;color:${th.muted}">${e(Q.packageName)} · Ref. No. ${e(Q.ref)}</div>
      </div>
      <div style="font-family:${th.head};font-size:22px;font-weight:700;margin:6px 0 0;line-height:1.15">Terms &amp; Cancellation Policy</div>
    </div>

    <!-- Grid 1: Cancellation & Hotels (natural heights, fixed gap) -->
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:flex-start">
      <div>
        <div style="${sec}">Cancellation policy · land package</div>
        <div style="background:${th.card};border:1px solid ${th.line};border-radius:${th.radius};padding:4px 10px">${fees}</div>
        <div style="margin-top:6px">${col(DEFAULT_TERMS.feeNotes)}</div>
      </div>
      <div>
        <div style="${sec}">Hotels &amp; accommodation</div>
        ${col(DEFAULT_TERMS.hotels)}
      </div>
    </div>

    <!-- Grid 2: Important Info & Pure Agent (natural heights, fixed gap) -->
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:flex-start">
      <div>
        <div style="${sec}">Important information</div>
        ${col(DEFAULT_TERMS.important)}
      </div>
      <div>
        <div style="${sec}">Pure agent declaration</div>
        ${col(DEFAULT_TERMS.agent)}
      </div>
    </div>

    <!-- Partner Boxes directly below content (natural heights, fixed gap) -->
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:flex-start">
      <!-- 1st Box: Hotel Working Partners -->
      <div style="background:${th.card};border:1px solid ${th.line};border-radius:${th.radius};padding:8px 12px;display:flex;flex-direction:column;gap:5px">
        <div style="font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.7px;color:${th.ink};display:flex;align-items:center;gap:5px">
          <span style="width:5px;height:5px;border-radius:50%;background:${th.accent};display:inline-block"></span>
          <span>Hotel Working Partners</span>
        </div>
        <div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px">
          ${hotelBadges}
        </div>
      </div>

      <!-- 2nd Box: Working Partners -->
      <div style="background:${th.card};border:1px solid ${th.line};border-radius:${th.radius};padding:8px 12px;display:flex;flex-direction:column;gap:5px">
        <div style="font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.7px;color:${th.ink};display:flex;align-items:center;gap:5px">
          <span style="width:5px;height:5px;border-radius:50%;background:${th.accent};display:inline-block"></span>
          <span>Working Partners</span>
        </div>
        <div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px">
          ${travelBadges}
        </div>
      </div>
    </div>

    <!-- Advisor Footer pinned at bottom -->
    <div style="margin-top:auto;background:${th.footBg};color:${th.footInk};border-radius:${th.radius};padding:12px 18px;display:flex;justify-content:space-between;align-items:center;gap:14px;flex:none">
      <div>
        <div style="font-size:10px;opacity:.85">Your trip advisor</div>
        <div style="font-family:${th.head};font-size:15px;font-weight:700;margin-top:1px">${e(adv.name)}</div>
        <div style="font-size:10px;opacity:.85">${e(adv.role)}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:600">
        <div style="display:flex;align-items:center;gap:6px">${ico('phone', 13)}${e(adv.phones)}</div>
        <div style="display:flex;align-items:center;gap:6px">${ico('mail', 13)}${e(adv.email)}</div>
      </div>
    </div>
  `,
    thKey
  );
}

/* =====================================================================
   DESIGN 1 — ROYAL GOLD
   ===================================================================== */
const rF = "'Manrope',sans-serif", rH = "'Playfair Display',serif";

export function royalCoverSheet(Q: QuoteDataModel, showInclusions = true): string {
  const tile = (ic: string, l: string, v: string) => `
    <div style="background:#fff;border:1px solid #e8e1cf;border-radius:14px;padding:10px 12px;box-sizing:border-box;box-shadow:0 3px 12px rgba(18,33,63,.08);display:flex;flex-direction:column;justify-content:flex-start">
      <div style="width:26px;height:26px;border-radius:13px;background:#f4ecd2;color:#8a6a1c;display:flex;align-items:center;justify-content:center;flex:none">${ico(ic, 14)}</div>
      <div style="font-size:10.5px;letter-spacing:1px;color:#5f6985;margin-top:5px;font-weight:600;flex:none">${l}</div>
      <div style="font-size:13px;font-weight:800;margin-top:2px;line-height:1.25;word-break:break-word">${e(v)}</div>
    </div>`;

  const allHotels = (Q.hotels && Q.hotels.length > 0) ? Q.hotels : (Q.hotel ? [Q.hotel] : []);
  const hotelCount = allHotels.length;
  const isMulti = hotelCount > 1;

  const incExcHtml = showInclusions ? renderIncExcGrid(Q.included, Q.excluded, Q.note, TH.royal) : '';

  return pg(
    `padding:0;background:#fdfbf6;font-family:${rF};color:#1b2540`,
    `
    <!-- Hero Banner -->
    <div style="position:relative;height:246px;background:#12213f;overflow:hidden;padding:30px 46px 0;box-sizing:border-box;flex:none">
      ${Q.coverImage ? `<img src="${Q.coverImage}" alt="${e(Q.city)}" crossOrigin="anonymous" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;opacity:0.26;mix-blend-mode:luminosity" />` : ''}
      <svg viewBox="0 0 794 110" preserveAspectRatio="none" style="position:absolute;left:0;bottom:0;width:794px;height:110px" aria-hidden="true">
        <path d="M0 110V62L90 20l70 38 80-48 90 56 70-30 100 44 80-36 114 40v64z" fill="#1c3160"/>
        <path d="M0 110V86l110-30 90 34 100-40 120 38 110-30 120 34v24z" fill="#243c70"/>
      </svg>
      <div style="position:relative;display:flex;justify-content:space-between;align-items:flex-start">
        <div style="display:flex;align-items:center;gap:14px">
          ${Q.logoUrl ? `
            <div style="background:#ffffff;padding:6px 14px;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.3);border:1.5px solid rgba(212,175,55,0.6);display:flex;align-items:center;justify-content:center;min-height:52px;max-height:60px;max-width:200px;flex:none;box-sizing:border-box">
              <img src="${Q.logoUrl}" alt="${e(Q.companyName || BRAND)}" crossOrigin="anonymous" style="max-height:48px;max-width:172px;width:auto;height:auto;object-fit:contain;display:block" />
            </div>
          ` : `<div style="width:44px;height:44px;border-radius:22px;border:1.5px solid #d4af37;background:rgba(212,175,55,0.12);display:flex;align-items:center;justify-content:center;color:#d4af37">${ico('mountain', 22)}</div>`}
          <div>
            <div style="font-family:${rH};font-size:26px;font-weight:700;color:#fff;line-height:1.2">${e(Q.companyName || BRAND)}</div>
            <div style="font-size:11px;letter-spacing:1.6px;color:#d4af37;font-weight:600;margin-top:2px">REGISTERED TOUR OPERATOR</div>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11.5px;letter-spacing:3px;color:#d4af37;font-weight:800">TRAVEL QUOTATION</div>
          <div style="font-size:12.5px;color:#cfd6e6;margin-top:3px">Ref. No. ${e(Q.ref)}</div>
        </div>
      </div>
      <div style="position:relative;margin-top:24px">
        <div style="font-family:${rH};font-size:38px;font-weight:700;color:#fff;line-height:1.15">${e(Q.packageName)}</div>
        <div style="font-size:13px;color:#dfe5f2;margin-top:4px;line-height:1.3">${e(Q.longDuration)} · ${e(Q.city)} · ${e(Q.priceNote)}</div>
      </div>
    </div>

    <!-- Content Sections Wrapper: fixed 14px gap, flex:1, natural heights -->
    <div style="padding:14px 46px 20px;display:flex;flex-direction:column;justify-content:flex-start;gap:14px;box-sizing:border-box;flex:1;min-height:0">
      <!-- Info Tiles -->
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px">
        ${tile('user', 'PREPARED FOR', Q.client)}
        ${tile('pin', 'PACKAGE', Q.packageName)}
        ${tile('cal', 'DURATION', Q.duration)}
        ${tile('car', 'SERVICES', Q.services)}
      </div>

      <!-- Greeting -->
      <div style="font-size:12.5px;line-height:1.45;color:#3b455f">${greeting(Q)}</div>

      <!-- Price Box -->
      <div style="display:flex;border-radius:14px;overflow:hidden;border:1.5px solid #12213f">
        <div style="flex:1;padding:12px 18px;background:#fff;display:flex;flex-direction:column;justify-content:center">
          <div style="font-size:10.5px;letter-spacing:2px;color:#8a6a1c;font-weight:800">QUOTED PACKAGE PRICE</div>
          <div style="font-family:${rH};font-size:22px;font-weight:700;margin-top:2px;line-height:1.2">${e(Q.packageName)}</div>
          <div style="font-size:11.5px;color:#5f6985;margin-top:2px;line-height:1.3">${e(Q.travellers)} · ${e(Q.priceNote)}</div>
        </div>
        <div style="width:210px;background:#12213f;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:8px 10px">
          ${(Q.discountPercent && Q.discountPercent > 0) ? `
            <div style="background:#d4af37;color:#12213f;font-size:9.5px;font-weight:800;letter-spacing:1px;padding:2px 8px;border-radius:4px;line-height:1.2;display:inline-flex;align-items:center;justify-content:center">${Q.discountPercent}% OFF</div>
            <div style="font-family:${rH};font-size:28px;font-weight:700;color:#fff;line-height:1.1">${e(Q.price)}</div>
            <div style="font-size:11.5px;color:#cfd6e6;text-decoration:line-through;opacity:0.85;line-height:1">${e(getCutPrice(Q) || '')}</div>
          ` : `
            <div style="background:#d4af37;color:#12213f;font-size:10.5px;font-weight:800;letter-spacing:1px;padding:3px 10px;border-radius:4px;line-height:1.2;display:inline-flex;align-items:center;justify-content:center">ALL-INCLUSIVE QUOTE</div>
            <div style="font-family:${rH};font-size:32px;font-weight:700;color:#fff;line-height:1.15;margin-top:2px">${e(Q.price)}</div>
          `}
        </div>
      </div>

      <!-- Stats Row -->
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid #d9cfae;border-bottom:1px solid #d9cfae;padding:6px 0">
        ${(Q.stats || [['12,000+', 'Trips delivered'], ['4.8/5', '2,140+ reviews'], ['24/7', 'Trip assistance'], ['100%', 'Customised plans']]).map((s, i) => `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;${i ? 'border-left:1px solid #d9cfae' : ''}">
            <div style="font-family:${rH};font-size:19px;font-weight:700">${e(s[0])}</div>
            <div style="font-size:10.5px;letter-spacing:1px;color:#5f6985">${e(s[1].toUpperCase())}</div>
          </div>
        `).join('')}
      </div>

      <!-- Accommodation Schedule -->
      <div style="display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="color:#8a6a1c">${ico('bed', 16)}</div>
          <div style="font-family:${rH};font-size:15px;font-weight:700">Accommodation Schedule (${hotelCount} ${hotelCount > 1 ? 'Hotels' : 'Hotel'})</div>
          <div style="flex:1;height:1px;background:#d9cfae"></div>
        </div>
        ${allHotels.map(h => `
          <div style="background:#fff;border:1px solid #e8e1cf;border-radius:12px;padding:${isMulti ? '6px 12px' : '10px 16px'};display:flex;align-items:center;gap:12px">
            <div style="width:115px;flex-shrink:0">
              <div style="font-size:12px;font-weight:800">${e(h.nights)}</div>
              <div style="font-size:10.5px;color:#5f6985;margin-top:1px">${e(h.city || Q.city)}</div>
            </div>
            <div style="flex:1;min-width:0">
              <div style="margin-top:1px;line-height:1.3">
                <span style="font-size:${isMulti ? '13px' : '14.5px'};font-weight:800;display:inline;margin-right:8px">${e(h.name)}</span>
                <span style="background:#f4ecd2;color:#6b4f10;font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:6px;display:inline-block;vertical-align:middle;white-space:nowrap">${e(h.type)}</span>
              </div>
              ${h.rooms ? `
              <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:#3b455f;margin-top:2px;line-height:1.35">
                <span style="color:#8a6a1c;display:inline-flex;align-items:center;flex:none;width:12px;height:12px">${ico('food', 12)}</span><span style="min-width:0">${e(h.rooms)}</span>
              </div>` : ''}
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:${isMulti ? '12px' : '13px'};font-weight:800">${e(h.room)}</div>
              <div style="font-size:10.5px;color:#5f6985;margin-top:1px">${e(Q.travellers)}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Inclusions / Exclusions (if fits on cover) -->
      ${incExcHtml}

      <!-- Pinned Footer at bottom -->
      <div style="margin-top:auto;padding-top:10px;border-top:1.5px solid #d9cfae;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#8a6a1c;font-weight:600">
        <div>${BRAND} · Registered Luxury Tour Operator · North India &amp; International</div>
        <div style="color:#5f6985">Ref. No. ${e(Q.ref)} · All Inclusions Guaranteed</div>
      </div>
    </div>
  `,
    'royal'
  );
}

export function royalInclusionsSheet(
  Q: QuoteDataModel,
  includedSlice?: string[],
  excludedSlice?: string[],
  pageNum = 1,
  totalPages = 1
): string {
  const inc = includedSlice || Q.included;
  const exc = excludedSlice || Q.excluded;
  const pageLabel = totalPages > 1 ? ` · Page ${pageNum} of ${totalPages}` : '';

  return pg(
    `padding:34px 46px 22px;background:#fdfbf6;font-family:${rF};color:#1b2540`,
    `
    <div style="flex:none">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-family:${rH};font-size:18px;font-weight:700">${BRAND}</div>
        <div style="font-size:12px;color:#5f6985">${e(Q.packageName)} · Ref. No. ${e(Q.ref)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin:10px 0 16px">
        <div style="color:#8a6a1c">${ico('shield', 22)}</div>
        <div style="font-family:${rH};font-size:26px;font-weight:700;line-height:1.1">Trip Inclusions &amp; Exclusions${pageLabel}</div>
        <div style="flex:1;height:2px;background:#d4af37"></div>
      </div>
    </div>

    <div style="margin-top:4px">
      ${renderIncExcGrid(inc, exc, pageNum === totalPages ? Q.note : undefined, TH.royal)}
    </div>

    <!-- Pinned Footer at bottom -->
    <div style="margin-top:auto;padding-top:10px;border-top:1.5px solid #d9cfae;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#8a6a1c;font-weight:600">
      <div>${BRAND} · Registered Luxury Tour Operator · North India &amp; International</div>
      <div style="color:#5f6985">Ref. No. ${e(Q.ref)} · All Inclusions Guaranteed</div>
    </div>
  `,
    'royal'
  );
}

export function royalDaysSheet(
  Q: QuoteDataModel,
  daysSlice: Array<{ title: string; text: string; img?: string }>,
  startIdx: number
): string {
  const n = daysSlice.length;
  return pg(
    `padding:34px 46px 22px;background:#fdfbf6;font-family:${rF};color:#1b2540`,
    `
    <!-- Header -->
    <div style="flex:none">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:10px">
          ${Q.logoUrl ? `<div style="background:#ffffff;padding:3px 8px;border-radius:6px;border:1px solid #e8e1cf;box-shadow:0 2px 4px rgba(18,33,63,0.06);display:flex;align-items:center"><img src="${Q.logoUrl}" alt="${e(Q.companyName || BRAND)}" crossOrigin="anonymous" style="max-height:30px;max-width:120px;width:auto;height:auto;object-fit:contain;display:block" /></div>` : ''}
          <div style="font-family:${rH};font-size:18px;font-weight:700">${e(Q.companyName || BRAND)}</div>
        </div>
        <div style="font-size:12px;color:#5f6985">${e(Q.packageName)} · Ref. No. ${e(Q.ref)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin:10px 0 14px">
        <div style="color:#8a6a1c">${ico('pin', 22)}</div>
        <div style="font-family:${rH};font-size:26px;font-weight:700;line-height:1.1">Day-wise Itinerary</div>
        <div style="flex:1;height:2px;background:#d4af37"></div>
      </div>
    </div>

    <!-- Cards Container: fixed 12px gap, natural heights, leftover space at bottom -->
    <div style="display:flex;flex-direction:column;gap:12px;width:100%">
      ${daysSlice.map((d, i) => {
        const dayNum = startIdx + i + 1;
        const textLen = (d.text || '').length;
        const imgH = textLen > 500 ? 190 : (textLen > 300 ? 210 : 230);
        const isLastOnPage = i === n - 1;

        return `
          <div style="display:flex;gap:14px;align-items:stretch;width:100%">
            <!-- Timeline on Left: runs ONLY the height of each card -->
            <div style="width:42px;flex:none;display:flex;flex-direction:column;align-items:center">
              <div style="width:38px;height:38px;border-radius:19px;background:#12213f;color:#d4af37;font-family:${rH};font-weight:700;font-size:15px;display:flex;align-items:center;justify-content:center;flex:none">
                ${String(dayNum).padStart(2, '0')}
              </div>
              ${!isLastOnPage ? `<div style="width:2px;flex:1;min-height:16px;background:#d4af37;margin-top:4px"></div>` : ''}
            </div>

            <!-- Card Box: Image on TOP, Title & Text BELOW image -->
            <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:10px;background:#fff;border:1px solid #e8e1cf;border-radius:14px;padding:12px 16px;box-shadow:0 3px 10px rgba(18,33,63,.05);box-sizing:border-box">
              <!-- Image BEFORE title -->
              <div style="width:100%;height:${imgH}px;border-radius:10px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.06)">
                ${scene(d, startIdx + i, 'royal')}
              </div>
              <!-- Title BELOW image -->
              <div style="font-family:${rH};font-size:15.5px;font-weight:700;line-height:1.25;color:#1b2540">
                Day ${dayNum}: ${e(d.title)}
              </div>
              <!-- Text BELOW title -->
              <div style="font-size:11.5px;line-height:1.45;color:#3b455f;word-break:break-word;white-space:pre-wrap">
                ${e(d.text)}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <!-- Pinned Footer Note -->
    <div style="margin-top:auto;padding-top:10px;border-top:1.5px solid #d9cfae;display:flex;align-items:center;justify-content:space-between;font-size:11.5px;color:#5f6985">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="color:#8a6a1c">${ico('shield', 14)}</span>${note()}
      </div>
      <div>Kingsland Verified Itinerary</div>
    </div>
  `,
    'royal'
  );
}

/* =====================================================================
   DESIGN 2 — ALPINE TEAL
   ===================================================================== */
const aF = "'DM Sans',sans-serif", aH = "'DM Serif Display',serif";

export function alpineCoverSheet(Q: QuoteDataModel, showInclusions = true): string {
  const row = (ic: string, l: string, v: string) => `
    <div style="display:flex;gap:10px;align-items:center">
      <div style="width:30px;height:30px;border-radius:15px;background:#14605d;display:flex;align-items:center;justify-content:center;flex:none;color:#f2a93b">${ico(ic, 15)}</div>
      <div>
        <div style="font-size:10.5px;color:#a8d5cf">${l}</div>
        <div style="font-size:13px;font-weight:700">${e(v)}</div>
      </div>
    </div>`;

  const allHotels = (Q.hotels && Q.hotels.length > 0) ? Q.hotels : (Q.hotel ? [Q.hotel] : []);
  const hotelCount = allHotels.length;
  const isMulti = hotelCount > 1;

  const incExcHtml = showInclusions ? renderIncExcGrid(Q.included, Q.excluded, Q.note, TH.alpine) : '';

  return pg(
    `display:flex;flex-direction:row;background:#fbfdfc;font-family:${aF};color:#12302f`,
    `
    <!-- Left Sidebar -->
    <div style="width:250px;flex:none;background:#0f4c4a;color:#fff;padding:32px 22px;display:flex;flex-direction:column;justify-content:flex-start;gap:14px;position:relative;overflow:hidden;box-sizing:border-box">
      ${Q.coverImage ? `<img src="${Q.coverImage}" alt="${e(Q.city)}" crossOrigin="anonymous" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;opacity:0.25;mix-blend-mode:luminosity" />` : ''}
      <svg viewBox="0 0 250 200" preserveAspectRatio="none" style="position:absolute;left:0;bottom:0;width:250px;height:200px" aria-hidden="true">
        <path d="M0 200V120L60 60l50 50 50-70 90 100v40z" fill="#14605d"/>
        <path d="M0 200v-50l70-40 60 50 70-40 50 30v50z" fill="#1a7470" opacity=".8"/>
      </svg>
      <div style="position:relative;display:flex;align-items:center;gap:12px">
        ${Q.logoUrl ? `
          <div style="background:#ffffff;padding:6px 12px;border-radius:12px;box-shadow:0 4px 14px rgba(0,0,0,0.25);border:1.5px solid rgba(242,169,59,0.5);display:flex;align-items:center;justify-content:center;min-height:48px;max-height:56px;max-width:190px;flex:none;box-sizing:border-box">
            <img src="${Q.logoUrl}" alt="${e(Q.companyName || BRAND)}" crossOrigin="anonymous" style="max-height:44px;max-width:166px;width:auto;height:auto;object-fit:contain;display:block" />
          </div>
        ` : `<div style="width:38px;height:38px;border-radius:19px;background:#f2a93b;color:#0f4c4a;display:flex;align-items:center;justify-content:center;flex:none">${ico('mountain', 20, 2.2)}</div>`}
        <div>
          <div style="font-family:${aH};font-size:20px;line-height:1.05">${e(Q.companyName || BRAND)}</div>
          <div style="font-size:10.5px;letter-spacing:1px;color:#a8d5cf;margin-top:2px">TOUR OPERATOR</div>
        </div>
      </div>
      <div style="position:relative;margin-top:16px">
        <div style="font-size:11px;letter-spacing:3px;color:#f2a93b;font-weight:700">TRAVEL QUOTATION</div>
        <div style="font-size:12px;color:#d7ece8;margin-top:2px">Ref. No. ${e(Q.ref)}</div>
      </div>
      <div style="position:relative;background:rgba(255,255,255,.12);border-radius:12px;padding:10px 12px">
        <div style="font-size:10.5px;letter-spacing:1px;color:#a8d5cf;font-weight:600">PREPARED FOR</div>
        <div style="font-family:${aH};font-size:18px;margin-top:2px">${e(Q.client)}</div>
      </div>
      <div style="position:relative;display:flex;flex-direction:column;gap:10px">
        ${row('pin', 'Package', Q.packageName)}
        ${row('cal', 'Duration', Q.duration)}
        ${row('car', 'Services', Q.services)}
        ${row('user', 'Travellers', Q.travellers)}
      </div>
      <div style="position:relative;margin-top:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
        ${(Q.stats || [['12k+', 'Delivered'], ['4.8/5', 'Reviews']]).slice(0, 2).map((s) => `
          <div>
            <div style="font-family:${aH};font-size:22px;line-height:1">${e(s[0])}</div>
            <div style="font-size:10.5px;color:#d7ece8;margin-top:2px">${e(s[1])}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Right Content Area: fixed 14px gap, natural heights, footer at bottom -->
    <div style="flex:1;min-width:0;padding:32px 32px 20px;display:flex;flex-direction:column;justify-content:flex-start;gap:14px;box-sizing:border-box;height:1123px">
      <div>
        <div style="font-family:${aH};font-size:38px;line-height:1.05;color:#0f4c4a">${e(Q.packageName)}</div>
        <div style="font-size:12px;line-height:1.5;color:#3f5a58;margin-top:6px">${greeting(Q)}</div>
      </div>

      <!-- Price Banner -->
      <div style="background:#f2a93b;border-radius:16px;padding:14px 18px;color:#2a1c00">
        <div style="font-size:10.5px;letter-spacing:2px;font-weight:700">QUOTED PACKAGE PRICE</div>
        <div style="display:flex;align-items:baseline;gap:10px;margin-top:3px">
          <div style="font-family:${aH};font-size:42px;line-height:1">${e(Q.price)}</div>
          ${(Q.discountPercent && Q.discountPercent > 0) ? `
            <div style="font-size:16px;font-weight:700;text-decoration:line-through;opacity:0.65">${e(getCutPrice(Q) || '')}</div>
          ` : ''}
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:4px;font-size:12px;font-weight:600">
          <span style="background:#2a1c00;color:#f2a93b;font-size:10.5px;font-weight:700;letter-spacing:1px;padding:2px 8px;border-radius:999px">
            ${(Q.discountPercent && Q.discountPercent > 0) ? `${Q.discountPercent}% OFF` : 'ALL-INCLUSIVE'}
          </span>
          ${e(Q.travellers)} · ${e(Q.priceNote)}
        </div>
      </div>

      <!-- Accommodation Cards -->
      <div style="display:flex;flex-direction:column;gap:6px">
        ${allHotels.map(h => `
          <div style="background:#e6f4f1;border-radius:12px;padding:${isMulti ? '6px 12px' : '10px 14px'};display:flex;gap:12px;align-items:center">
            <div style="width:34px;height:34px;border-radius:10px;background:#0f4c4a;color:#fff;display:flex;align-items:center;justify-content:center;flex:none">${ico('bed', 16)}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:9.5px;letter-spacing:1px;color:#3f5a58;font-weight:700">ACCOMMODATION · ${e(h.nights.toUpperCase())} · ${e((h.city || Q.city).toUpperCase())}</div>
              <div style="margin-top:1px;line-height:1.25">
                <span style="font-family:${aH};font-size:${isMulti ? '14px' : '16px'};display:inline;margin-right:8px">${e(h.name)}</span>
                <span style="background:#fff;color:#0f4c4a;font-size:9.5px;font-weight:700;padding:1.5px 7px;border-radius:999px;display:inline-block;vertical-align:middle;white-space:nowrap">${e(h.type)}</span>
              </div>
              <div style="font-size:11px;color:#3f5a58;margin-top:1px">${e(h.room)}${h.rooms ? ` · ${e(h.rooms)}` : ''}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Inclusions / Exclusions (if fits on cover) -->
      ${incExcHtml}

      <!-- Pinned Footer at bottom -->
      <div style="margin-top:auto;padding-top:10px;border-top:1.5px solid #cfe5e1;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#3f5a58">
        <div>${BRAND} · Registered Luxury Tour Operator</div>
        <div>Ref. No. ${e(Q.ref)} · All Inclusions Guaranteed</div>
      </div>
    </div>
  `,
    'alpine'
  );
}

export function alpineInclusionsSheet(
  Q: QuoteDataModel,
  includedSlice?: string[],
  excludedSlice?: string[],
  pageNum = 1,
  totalPages = 1
): string {
  const inc = includedSlice || Q.included;
  const exc = excludedSlice || Q.excluded;
  const pageLabel = totalPages > 1 ? ` · Page ${pageNum} of ${totalPages}` : '';

  return pg(
    `padding:34px 46px 22px;background:#fbfdfc;font-family:${aF};color:#12302f`,
    `
    <div style="flex:none">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:8px;font-family:${aH};font-size:18px;color:#0f4c4a">
          <span style="color:#f2a93b">${ico('mountain', 20, 2.2)}</span>${BRAND}
        </div>
        <div style="font-size:12px;color:#4a6462">${e(Q.packageName)} · Ref. No. ${e(Q.ref)}</div>
      </div>
      <div style="margin:10px 0 16px">
        <div style="font-family:${aH};font-size:28px;line-height:1.1;color:#0f4c4a">Trip Inclusions &amp; Exclusions${pageLabel}</div>
      </div>
    </div>

    <div style="margin-top:4px">
      ${renderIncExcGrid(inc, exc, pageNum === totalPages ? Q.note : undefined, TH.alpine)}
    </div>

    <!-- Pinned Footer at bottom -->
    <div style="margin-top:auto;padding-top:10px;border-top:1.5px solid #cfe5e1;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#4a6462">
      <div>${BRAND} · Registered Tour Operator</div>
      <div>Ref. No. ${e(Q.ref)} · All Inclusions Guaranteed</div>
    </div>
  `,
    'alpine'
  );
}

export function alpineDaysSheet(
  Q: QuoteDataModel,
  daysSlice: Array<{ title: string; text: string; img?: string }>,
  startIdx: number
): string {
  const pill = (i: number) =>
    `<div style="position:absolute;left:8px;top:8px;background:#f2a93b;color:#2a1c00;font-size:10px;font-weight:700;letter-spacing:1px;padding:2px 8px;border-radius:999px">DAY ${startIdx + i + 1}</div>`;

  return pg(
    `padding:34px 46px 22px;background:#fbfdfc;font-family:${aF};color:#12302f`,
    `
    <!-- Header -->
    <div style="flex:none">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:10px">
          ${Q.logoUrl ? `<div style="background:#ffffff;padding:3px 8px;border-radius:6px;border:1px solid #cfe5e1;box-shadow:0 2px 4px rgba(15,76,74,0.06);display:flex;align-items:center"><img src="${Q.logoUrl}" alt="${e(Q.companyName || BRAND)}" crossOrigin="anonymous" style="max-height:30px;max-width:120px;width:auto;height:auto;object-fit:contain;display:block" /></div>` : `<span style="color:#f2a93b">${ico('mountain', 20, 2.2)}</span>`}
          <div style="font-family:${aH};font-size:18px;color:#0f4c4a">${e(Q.companyName || BRAND)}</div>
        </div>
        <div style="font-size:12px;color:#4a6462">${e(Q.packageName)} · Ref. No. ${e(Q.ref)}</div>
      </div>
      <div style="margin:10px 0 14px">
        <div style="font-size:11px;letter-spacing:3px;color:#b36b00;font-weight:700">${e(Q.longDuration.toUpperCase().replace('/', ' · '))}</div>
        <div style="font-family:${aH};font-size:28px;line-height:1.1;color:#0f4c4a;margin-top:2px">Your journey, day by day</div>
      </div>
    </div>

    <!-- Cards Container: Image on TOP, Title & Text BELOW image -->
    <div style="display:flex;flex-direction:column;gap:12px;width:100%">
      ${daysSlice.map((d, i) => {
        const dayNum = startIdx + i + 1;
        const textLen = (d.text || '').length;
        const imgH = textLen > 500 ? 190 : (textLen > 300 ? 210 : 230);

        return `
          <div style="display:flex;flex-direction:column;gap:10px;background:#fff;border:1px solid #cfe5e1;border-radius:16px;padding:12px 16px;box-shadow:0 3px 10px rgba(15,76,74,.06);box-sizing:border-box;width:100%">
            <!-- Image BEFORE title -->
            <div style="width:100%;height:${imgH}px;position:relative;border-radius:12px;overflow:hidden">
              ${scene(d, startIdx + i, 'alpine')}
              ${pill(i)}
            </div>
            <!-- Title BELOW image -->
            <div style="font-family:${aH};font-size:16.5px;line-height:1.2;color:#0f4c4a">
              Day ${dayNum}: ${e(d.title)}
            </div>
            <!-- Text BELOW title -->
            <div style="font-size:11.5px;line-height:1.45;color:#3f5a58;word-break:break-word;white-space:pre-wrap">
              ${e(d.text)}
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <!-- Pinned Footer Note -->
    <div style="margin-top:auto;padding-top:10px;border-top:1.5px solid #cfe5e1;display:flex;align-items:center;justify-content:space-between;font-size:11.5px;color:#4a6462">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="color:#0f4c4a">${ico('shield', 14)}</span>${note()}
      </div>
      <div>Kingsland Verified Itinerary</div>
    </div>
  `,
    'alpine'
  );
}

/* =====================================================================
   DESIGN 3 — SUNSET CORAL
   ===================================================================== */
const sF = "'Nunito Sans',sans-serif", sH = "'Outfit',sans-serif";

export function sunsetCoverSheet(Q: QuoteDataModel, showInclusions = true): string {
  const chips = (Q.services || 'Cab, Hotel, Sightseeing').split(',').map((s) => s.trim()).filter(Boolean).map((s, i) => `
    <div style="display:flex;align-items:center;gap:5px;background:rgba(255,255,255,.24);border-radius:999px;padding:3px 9px;font-size:11px;font-weight:700">
      ${ico(svcIcons[i % 3], 12, 2.2)}${e(s)}
    </div>`).join('');

  const allHotels = (Q.hotels && Q.hotels.length > 0) ? Q.hotels : (Q.hotel ? [Q.hotel] : []);
  const hotelCount = allHotels.length;
  const isMulti = hotelCount > 1;

  const incExcHtml = showInclusions ? renderIncExcGrid(Q.included, Q.excluded, Q.note, TH.sunset) : '';

  return pg(
    `background:#fffaf6;font-family:${sF};color:#231f2b`,
    `
    <!-- Top Banner with Sunset Gradient -->
    <div style="position:relative;height:246px;background:linear-gradient(135deg,#ff5e4d 0%,#ff8a3d 60%,#ffb347 100%);border-bottom-left-radius:48px;overflow:hidden;padding:26px 46px;color:#fff;box-sizing:border-box;flex:none">
      ${Q.coverImage ? `<img src="${Q.coverImage}" alt="${e(Q.city)}" crossOrigin="anonymous" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;opacity:0.25;mix-blend-mode:luminosity" />` : ''}
      <svg viewBox="0 0 794 140" preserveAspectRatio="none" style="position:absolute;left:0;bottom:0;width:794px;height:140px" aria-hidden="true">
        <path d="M0 140V80L110 30l80 50 90-60 100 70 90-40 130 60 80-30 114 50v30z" fill="rgba(255,255,255,.16)"/>
        <path d="M0 140v-30l120-34 90 40 110-46 120 44 120-30 120 36v20z" fill="rgba(255,255,255,.14)"/>
      </svg>
      <div style="position:relative;display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:12px">
          ${Q.logoUrl ? `
            <div style="background:#ffffff;padding:6px 14px;border-radius:12px;box-shadow:0 4px 14px rgba(35,31,43,0.2);display:flex;align-items:center;justify-content:center;min-height:48px;max-height:56px;max-width:190px;flex:none;box-sizing:border-box">
              <img src="${Q.logoUrl}" alt="${e(Q.companyName || BRAND)}" crossOrigin="anonymous" style="max-height:44px;max-width:162px;width:auto;height:auto;object-fit:contain;display:block" />
            </div>
          ` : `<div style="width:36px;height:36px;border-radius:10px;background:#fff;color:#ff5e4d;display:flex;align-items:center;justify-content:center">${ico('mountain', 20, 2.2)}</div>`}
          <div style="font-family:${sH};font-size:20px;font-weight:800">${e(Q.companyName || BRAND)}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;letter-spacing:2.5px;font-weight:800">TRAVEL QUOTATION</div>
          <div style="font-size:11.5px;margin-top:2px;opacity:.9">Ref. No. ${e(Q.ref)}</div>
        </div>
      </div>
      <div style="position:relative;margin-top:16px">
        <div style="font-size:11px;letter-spacing:2px;font-weight:800">${e(Q.longDuration.toUpperCase().replace('/', ' · '))} · ${e(Q.city.toUpperCase())}</div>
        <div style="font-family:${sH};font-size:36px;font-weight:800;line-height:1.06;margin-top:4px">${brk(Q.packageName)}</div>
      </div>
      <div style="position:relative;display:flex;gap:6px;margin-top:8px">${chips}</div>
    </div>

    <!-- Floating Price Stamp -->
    <div style="position:absolute;right:46px;top:175px;width:140px;height:140px;border-radius:70px;background:#fff;border:4px solid #ffe3cf;box-shadow:0 8px 20px rgba(35,31,43,.15);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:10;padding:6px;box-sizing:border-box">
      ${(Q.discountPercent && Q.discountPercent > 0) ? `
        <div style="font-size:9.5px;letter-spacing:1px;font-weight:800;color:#c2410c">${Q.discountPercent}% OFF</div>
        <div style="font-family:${sH};font-size:22px;font-weight:800;line-height:1.1;color:#231f2b;margin:1px 0">${e(Q.price)}</div>
        <div style="font-size:11px;color:#8f2f2a;text-decoration:line-through;font-weight:700;line-height:1">${e(getCutPrice(Q) || '')}</div>
        <div style="font-size:9.5px;color:#5a5262;font-weight:600;margin-top:1px">${e(Q.travellers)}</div>
      ` : `
        <div style="font-size:9.5px;letter-spacing:1px;font-weight:800;color:#c2410c">ALL-INCLUSIVE</div>
        <div style="font-family:${sH};font-size:24px;font-weight:800;line-height:1.1;color:#231f2b;margin:2px 0">${e(Q.price)}</div>
        <div style="font-size:10.5px;color:#5a5262;font-weight:600">${e(Q.travellers)}</div>
      `}
    </div>

    <!-- Content Sections Wrapper: fixed 14px gap, natural heights -->
    <div style="padding:14px 46px 20px;display:flex;flex-direction:column;justify-content:flex-start;gap:14px;box-sizing:border-box;flex:1;min-height:0">
      <!-- Client Greeting Section (limited width so doesn't collide with price stamp) -->
      <div style="width:520px">
        <div style="font-size:10.5px;letter-spacing:1.5px;font-weight:800;color:#c2410c">PREPARED FOR</div>
        <div style="font-family:${sH};font-size:20px;font-weight:700;margin-top:1px">${e(Q.client)}</div>
        <div style="font-size:12px;line-height:1.45;color:#4a4352;margin-top:3px">${greeting(Q)}</div>
      </div>

      <!-- Hotel Accommodations -->
      <div style="display:flex;flex-direction:column;gap:5px">
        ${allHotels.map(h => `
          <div style="background:#ffe9d9;border-radius:14px;padding:${isMulti ? '6px 12px' : '9px 14px'};display:flex;align-items:center;gap:11px">
            <div style="width:${isMulti ? '30px' : '36px'};height:${isMulti ? '30px' : '36px'};border-radius:10px;background:#ff5e4d;color:#fff;display:flex;align-items:center;justify-content:center;flex:none">${ico('bed', isMulti ? 15 : 18)}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:9.5px;letter-spacing:1px;font-weight:800;color:#c2410c">${e(h.nights.toUpperCase())} · ${e((h.city || Q.city).toUpperCase())}</div>
              <div style="margin-top:1px;line-height:1.25">
                <span style="font-family:${sH};font-size:${isMulti ? '14px' : '16px'};font-weight:700;display:inline;margin-right:8px">${e(h.name)}</span>
                <span style="background:#231f2b;color:#fff;font-size:9.5px;font-weight:700;padding:1.5px 7px;border-radius:999px;display:inline-block;vertical-align:middle;white-space:nowrap">${e(h.type)}</span>
              </div>
              <div style="font-size:11px;color:#4a4352;margin-top:1px">${e(h.room)}${h.rooms ? ` · ${e(h.rooms)}` : ''}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Operational Stats Strip -->
      <div style="background:#231f2b;color:#fff;border-radius:14px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));height:50px;flex:none">
        ${(Q.stats || [['12,000+', 'Trips delivered'], ['4.8/5', '2,140+ reviews'], ['24/7', 'Trip assistance'], ['100%', 'Customised plans']]).map((s, i) => `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;${i ? 'border-left:1px solid #4a4352' : ''}">
            <div style="font-family:${sH};font-size:17px;font-weight:700;color:#ffb347;line-height:1">${e(s[0])}</div>
            <div style="font-size:10px;color:#e6e1ee;margin-top:2px">${e(s[1])}</div>
          </div>
        `).join('')}
      </div>

      <!-- Inclusions / Exclusions (if fits on cover) -->
      ${incExcHtml}

      <!-- Pinned Footer at bottom -->
      <div style="margin-top:auto;padding-top:10px;border-top:1.5px solid #f3d9c8;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#ff6a3d;font-weight:600">
        <div>${BRAND} · Registered Luxury Tour Operator</div>
        <div style="color:#5a5262">Ref. No. ${e(Q.ref)} · All Inclusions Guaranteed</div>
      </div>
    </div>
  `,
    'sunset'
  );
}

export function sunsetInclusionsSheet(
  Q: QuoteDataModel,
  includedSlice?: string[],
  excludedSlice?: string[],
  pageNum = 1,
  totalPages = 1
): string {
  const inc = includedSlice || Q.included;
  const exc = excludedSlice || Q.excluded;
  const pageLabel = totalPages > 1 ? ` · Page ${pageNum} of ${totalPages}` : '';

  return pg(
    `padding:34px 46px 22px;background:#fffaf6;font-family:${sF};color:#231f2b`,
    `
    <div style="flex:none">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:8px;font-family:${sH};font-size:18px;font-weight:700">
          <span style="width:28px;height:28px;border-radius:9px;background:#ff5e4d;color:#fff;display:flex;align-items:center;justify-content:center">${ico('mountain', 16, 2.2)}</span>${BRAND}
        </div>
        <div style="font-size:12px;color:#5a5262">${e(Q.packageName)} · Ref. No. ${e(Q.ref)}</div>
      </div>
      <div style="display:flex;align-items:flex-end;gap:14px;margin:10px 0 16px">
        <div style="font-family:${sH};font-size:28px;font-weight:800;line-height:1">Trip Inclusions &amp; Exclusions${pageLabel}</div>
        <div style="flex:1;height:3px;border-radius:2px;background:linear-gradient(90deg,#ff5e4d,#ffb347);margin-bottom:5px"></div>
      </div>
    </div>

    <div style="margin-top:4px">
      ${renderIncExcGrid(inc, exc, pageNum === totalPages ? Q.note : undefined, TH.sunset)}
    </div>

    <!-- Pinned Footer at bottom -->
    <div style="margin-top:auto;padding-top:10px;border-top:1.5px solid #f3d9c8;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#5a5262">
      <div>${BRAND} · Registered Luxury Tour Operator</div>
      <div>Ref. No. ${e(Q.ref)} · All Inclusions Guaranteed</div>
    </div>
  `,
    'sunset'
  );
}

export function sunsetDaysSheet(
  Q: QuoteDataModel,
  daysSlice: Array<{ title: string; text: string; img?: string }>,
  startIdx: number
): string {
  return pg(
    `padding:34px 46px 22px;background:#fffaf6;font-family:${sF};color:#231f2b`,
    `
    <!-- Header -->
    <div style="flex:none">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:10px">
          ${Q.logoUrl ? `<div style="background:#ffffff;padding:3px 8px;border-radius:6px;border:1px solid #f3d9c8;box-shadow:0 2px 4px rgba(255,106,61,0.06);display:flex;align-items:center"><img src="${Q.logoUrl}" alt="${e(Q.companyName || BRAND)}" crossOrigin="anonymous" style="max-height:30px;max-width:120px;width:auto;height:auto;object-fit:contain;display:block" /></div>` : `<span style="width:28px;height:28px;border-radius:9px;background:#ff5e4d;color:#fff;display:flex;align-items:center;justify-content:center">${ico('mountain', 16, 2.2)}</span>`}
          <div style="font-family:${sH};font-size:18px;font-weight:700">${e(Q.companyName || BRAND)}</div>
        </div>
        <div style="font-size:12px;color:#5a5262">${e(Q.packageName)} · Ref. No. ${e(Q.ref)}</div>
      </div>
      <div style="display:flex;align-items:flex-end;gap:14px;margin:10px 0 14px">
        <div style="font-family:${sH};font-size:32px;font-weight:800;line-height:1">Day by day</div>
        <div style="font-size:11.5px;font-weight:700;color:#c2410c;padding-bottom:3px;letter-spacing:2px">${e(Q.longDuration.toUpperCase().replace('/', ' · '))}</div>
        <div style="flex:1;height:3px;border-radius:2px;background:linear-gradient(90deg,#ff5e4d,#ffb347);margin-bottom:5px"></div>
      </div>
    </div>

    <!-- Cards Container: Image on TOP, Title & Text BELOW image -->
    <div style="display:flex;flex-direction:column;gap:12px;width:100%">
      ${daysSlice.map((d, i) => {
        const dayNum = startIdx + i + 1;
        const textLen = (d.text || '').length;
        const imgH = textLen > 500 ? 190 : (textLen > 300 ? 210 : 230);

        return `
          <div style="display:flex;flex-direction:column;gap:10px;background:#fff;border-radius:18px;padding:12px 16px;border:1px solid #f3d9c8;box-shadow:0 3px 8px rgba(255,106,61,.05);box-sizing:border-box;width:100%">
            <!-- Image BEFORE title -->
            <div style="width:100%;height:${imgH}px;border-radius:14px;overflow:hidden;box-shadow:0 2px 6px rgba(255,106,61,.12)">
              ${scene(d, startIdx + i, 'sunset')}
            </div>
            <!-- Title BELOW image -->
            <div style="display:flex;align-items:center;gap:9px">
              <div style="font-family:${sH};font-size:26px;font-weight:800;line-height:1;color:#ff6a3d;flex:none">${String(dayNum).padStart(2, '0')}</div>
              <div style="font-family:${sH};font-size:15.5px;font-weight:700;line-height:1.2;color:#231f2b">Day ${dayNum}: ${e(d.title)}</div>
            </div>
            <!-- Text BELOW title -->
            <div style="font-size:11.5px;line-height:1.45;color:#4a4352;word-break:break-word;white-space:pre-wrap">
              ${e(d.text)}
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <!-- Pinned Footer Note -->
    <div style="margin-top:auto;padding-top:10px;border-top:1.5px solid #f3d9c8;display:flex;align-items:center;justify-content:space-between;font-size:11.5px;color:#5a5262">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="color:#ff5e4d">${ico('shield', 14)}</span>${note()}
      </div>
      <div>Kingsland Verified Itinerary</div>
    </div>
  `,
    'sunset'
  );
}

/* =====================================================================
   DESIGN 4 — EDITORIAL
   ===================================================================== */
const eF = "'Hanken Grotesk',sans-serif", eH = "'Bricolage Grotesque',sans-serif";

function editorialBar(right: string, logoUrl?: string, brandName = BRAND) {
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;border-bottom:3px solid #111"><div style="display:flex;align-items:center;gap:12px;font-family:${eH};font-size:18px;font-weight:800;letter-spacing:1px">${logoUrl ? `<div style="background:#ffffff;padding:4px 10px;border:1.5px solid #111;border-radius:6px;display:flex;align-items:center;justify-content:center;max-height:48px;max-width:190px;box-sizing:border-box"><img src="${logoUrl}" alt="${e(brandName)}" crossOrigin="anonymous" style="max-height:40px;max-width:170px;width:auto;height:auto;object-fit:contain;display:block" /></div>` : `<span style="color:#e5431f">${ico('mountain', 22, 2.4)}</span>`}${brandName.toUpperCase()}</div><div style="font-size:12px;font-weight:700;letter-spacing:2px">${right}</div></div>`;
}

export function editorialCoverSheet(Q: QuoteDataModel, showInclusions = true): string {
  const meta = (ic: string, l: string, v: string) => `
    <div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid #cfcfca">
      <span style="color:#e5431f;margin-top:1px">${ico(ic, 14, 2.2)}</span>
      <div>
        <div style="font-size:10.5px;color:#555550;font-weight:600">${l}</div>
        <div style="font-size:13px;font-weight:700">${e(v)}</div>
      </div>
    </div>`;

  const allHotels = (Q.hotels && Q.hotels.length > 0) ? Q.hotels : (Q.hotel ? [Q.hotel] : []);
  const hotelCount = allHotels.length;

  const incExcHtml = showInclusions ? renderIncExcGrid(Q.included, Q.excluded, Q.note, TH.editorial) : '';

  return pg(
    `padding:30px 44px 20px;display:flex;flex-direction:column;justify-content:flex-start;gap:14px;background:#f7f7f4;font-family:${eF};color:#111`,
    `
    ${editorialBar('TRAVEL QUOTATION · NO. ' + e(Q.ref), Q.logoUrl, Q.companyName || BRAND)}

    <!-- Title & Meta Block -->
    <div style="display:flex;gap:24px;align-items:flex-end">
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;letter-spacing:2px;font-weight:700;color:#c2371a">${e(Q.longDuration.toUpperCase())} · ${e(Q.city.toUpperCase())}</div>
        <div style="font-family:${eH};font-size:56px;font-weight:800;line-height:.96;letter-spacing:-2px;margin-top:6px">${brk(Q.packageName)}</div>
      </div>
      <div style="width:200px;flex:none;display:flex;flex-direction:column;border-top:1px solid #111">
        ${meta('user', 'Prepared for', Q.client)}
        ${meta('cal', 'Duration', Q.duration)}
        ${meta('car', 'Services', Q.services)}
      </div>
    </div>

    <!-- Greeting -->
    <div style="font-size:12.5px;line-height:1.45;color:#33332f;max-width:540px">${greeting(Q)}</div>

    <!-- Package Price Box -->
    <div style="display:flex;align-items:center;gap:20px;border-top:3px solid #111;border-bottom:1px solid #111;padding:8px 0">
      <div>
        <div style="font-size:11px;letter-spacing:2px;font-weight:700">QUOTED PACKAGE PRICE</div>
        <div style="display:flex;align-items:baseline;gap:10px;margin-top:2px">
          <div style="font-family:${eH};font-size:${(Q.discountPercent && Q.discountPercent > 0) ? '52px' : '62px'};font-weight:800;line-height:1;color:#e5431f;letter-spacing:-2px">${e(Q.price)}</div>
          ${(Q.discountPercent && Q.discountPercent > 0) ? `
            <div style="font-family:${eH};font-size:20px;font-weight:700;color:#777;text-decoration:line-through">${e(getCutPrice(Q) || '')}</div>
          ` : ''}
        </div>
      </div>
      <div style="flex:1;border-left:1px solid #111;padding-left:16px">
        <div style="display:inline-block;background:#111;color:#fff;font-size:10.5px;font-weight:700;letter-spacing:1px;padding:3px 9px">
          ${(Q.discountPercent && Q.discountPercent > 0) ? `${Q.discountPercent}% OFF · ALL-INCLUSIVE` : 'ALL-INCLUSIVE QUOTE'}
        </div>
        <div style="font-size:12.5px;font-weight:600;margin-top:4px;line-height:1.35">${e(Q.travellers)}<br>${e(Q.priceNote)}</div>
      </div>
    </div>

    <!-- Stats Row -->
    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-bottom:1px solid #cfcfca;padding:6px 0">
      ${(Q.stats || [['12,000+', 'Trips delivered'], ['4.8/5', 'Reviews'], ['24/7', 'Assistance'], ['100%', 'Customised']]).map((s) => `
        <div>
          <div style="font-family:${eH};font-size:20px;font-weight:800">${e(s[0])}</div>
          <div style="font-size:11px;color:#555550">${e(s[1])}</div>
        </div>
      `).join('')}
    </div>

    <!-- Accommodation Schedule -->
    <div style="display:flex;flex-direction:column;gap:4px">
      <div style="font-family:${eH};font-size:16px;font-weight:800;letter-spacing:.5px">ACCOMMODATION SCHEDULE (${hotelCount} ${hotelCount > 1 ? 'HOTELS' : 'HOTEL'})</div>
      <div style="border-top:2px solid #111">
        <div style="display:grid;grid-template-columns:110px 80px 1fr 110px;gap:8px;font-size:10.5px;font-weight:700;letter-spacing:1px;color:#555550;padding:4px 0;border-bottom:1px solid #111">
          <div>NIGHT</div><div>CITY</div><div>HOTEL</div><div style="text-align:right">ROOM</div>
        </div>
        ${allHotels.map(h => `
          <div style="display:grid;grid-template-columns:110px 80px 1fr 110px;gap:8px;align-items:center;padding:5px 0;border-bottom:1px solid #cfcfca">
            <div style="font-size:12px;font-weight:700">${e(h.nights)}</div>
            <div style="font-size:11.5px">${e(h.city || Q.city)}</div>
            <div>
              <div style="line-height:1.25">
                <span style="font-size:13px;font-weight:700;display:inline;margin-right:8px">${e(h.name)}</span>
                <span style="font-size:9.5px;font-weight:700;color:#e5431f;border:1px solid #e5431f;padding:0 5px;display:inline-block;vertical-align:middle;white-space:nowrap">${e(h.type)}</span>
              </div>
              ${h.rooms ? `<div style="font-size:11px;color:#33332f;margin-top:1px">${e(h.rooms)}</div>` : ''}
            </div>
            <div style="text-align:right">
              <div style="font-size:12px;font-weight:700">${e(h.room)}</div>
              <div style="font-size:10.5px;color:#555550">${e(Q.travellers)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Inclusions / Exclusions (if fits on cover) -->
    ${incExcHtml}

    <!-- Pinned Footer at bottom -->
    <div style="margin-top:auto;padding-top:10px;border-top:2px solid #111;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#555;font-weight:700">
      <div>${BRAND.toUpperCase()} · REGISTERED TOUR OPERATOR</div>
      <div>REF. NO. ${e(Q.ref)} · ALL INCLUSIONS GUARANTEED</div>
    </div>
  `,
    'editorial'
  );
}

export function editorialInclusionsSheet(
  Q: QuoteDataModel,
  includedSlice?: string[],
  excludedSlice?: string[],
  pageNum = 1,
  totalPages = 1
): string {
  const inc = includedSlice || Q.included;
  const exc = excludedSlice || Q.excluded;
  const pageLabel = totalPages > 1 ? ` · PAGE ${pageNum} OF ${totalPages}` : '';

  return pg(
    `padding:30px 44px 20px;display:flex;flex-direction:column;justify-content:flex-start;gap:14px;background:#f7f7f4;font-family:${eF};color:#111`,
    `
    ${editorialBar('INCLUSIONS &amp; EXCLUSIONS' + pageLabel + ' · NO. ' + e(Q.ref))}

    <div style="margin-top:8px">
      ${renderIncExcGrid(inc, exc, pageNum === totalPages ? Q.note : undefined, TH.editorial)}
    </div>

    <!-- Pinned Footer at bottom -->
    <div style="margin-top:auto;padding-top:10px;border-top:2px solid #111;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#555;font-weight:700">
      <div>${BRAND.toUpperCase()} · REGISTERED TOUR OPERATOR</div>
      <div>REF. NO. ${e(Q.ref)} · ALL INCLUSIONS GUARANTEED</div>
    </div>
  `,
    'editorial'
  );
}

export function editorialDaysSheet(
  Q: QuoteDataModel,
  daysSlice: Array<{ title: string; text: string; img?: string }>,
  startIdx: number
): string {
  return pg(
    `padding:30px 44px 20px;display:flex;flex-direction:column;justify-content:flex-start;gap:14px;background:#f7f7f4;font-family:${eF};color:#111`,
    `
    ${editorialBar(e(Q.packageName.toUpperCase()) + ' · NO. ' + e(Q.ref))}

    <div style="display:flex;align-items:flex-end;justify-content:space-between;margin:4px 0 0">
      <div style="font-family:${eH};font-size:40px;font-weight:800;line-height:.95;letter-spacing:-1.5px">The<br>itinerary</div>
      <div style="text-align:right;font-size:11px;letter-spacing:2px;font-weight:700;color:#c2371a;line-height:1.5">
        ${e(Q.longDuration.toUpperCase().replace(' / ', ' · '))}<br>${e(Q.city.toUpperCase())}
      </div>
    </div>

    <!-- Cards Container: Image on LEFT, Title & Text on RIGHT -->
    <div style="border-top:2px solid #111;display:flex;flex-direction:column;gap:10px;width:100%">
      ${daysSlice.map((d, i) => {
        const dayNum = startIdx + i + 1;
        const textLen = (d.text || '').length;
        const imgH = textLen > 500 ? 190 : (textLen > 300 ? 210 : 230);

        return `
          <div style="display:flex;flex-direction:column;gap:10px;padding:12px 0;border-bottom:1px solid #cfcfca;box-sizing:border-box;width:100%">
            <!-- Image on TOP before title -->
            <div style="display:flex;gap:12px;align-items:center">
              <div style="font-family:${eH};font-size:32px;font-weight:800;line-height:1;color:#e5431f;letter-spacing:-1px">
                ${String(dayNum).padStart(2, '0')}
              </div>
              <div style="flex:1;height:${imgH}px;border:1px solid #111;overflow:hidden">
                ${scene(d, startIdx + i, 'editorial')}
              </div>
            </div>
            <!-- Title BELOW image -->
            <div style="font-family:${eH};font-size:15.5px;font-weight:700;line-height:1.2;color:#111">
              Day ${dayNum}: ${e(d.title)}
            </div>
            <!-- Text BELOW title -->
            <div style="font-size:11.5px;line-height:1.45;color:#33332f;word-break:break-word;white-space:pre-wrap">
              ${e(d.text)}
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <!-- Pinned Footer Note -->
    <div style="margin-top:auto;padding-top:10px;border-top:1px solid #cfcfca;display:flex;align-items:center;justify-content:space-between;font-size:11px;color:#555550">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="color:#e5431f">${ico('shield', 13)}</span>${note()}
      </div>
      <div>Kingsland Verified Itinerary</div>
    </div>
  `,
    'editorial'
  );
}

/* =====================================================================
   DESIGN 5 — PLAYFUL VIOLET
   ===================================================================== */
const pF = "'Nunito',sans-serif", pH = "'Baloo 2',sans-serif";

export function playfulCoverSheet(Q: QuoteDataModel, showInclusions = true): string {
  const tile = (bg: string, dot: string, lc: string, ic: string, l: string, v: string, fs: number) => `
    <div style="background:${bg};border-radius:20px;padding:10px 14px;height:74px;display:flex;align-items:center;gap:10px;box-sizing:border-box">
      <div style="width:34px;height:34px;border-radius:17px;background:${dot};color:#fff;display:flex;align-items:center;justify-content:center;flex:none">${ico(ic, 16, 2.2)}</div>
      <div>
        <div style="font-size:10.5px;font-weight:800;letter-spacing:1px;color:${lc}">${l}</div>
        <div style="font-family:${pH};font-size:${fs}px;font-weight:700;line-height:1.2">${e(v)}</div>
      </div>
    </div>`;

  const chip = (ic: string, t: string) => `
    <div style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,.2);border-radius:999px;padding:3px 11px;font-size:12px;font-weight:700">
      ${ico(ic, 13, 2.4)}${e(t)}
    </div>`;

  const allHotels = (Q.hotels && Q.hotels.length > 0) ? Q.hotels : (Q.hotel ? [Q.hotel] : []);
  const hotelCount = allHotels.length;
  const isMulti = hotelCount > 1;

  const incExcHtml = showInclusions ? renderIncExcGrid(Q.included, Q.excluded, Q.note, TH.playful) : '';

  return pg(
    `padding:30px 40px 20px;display:flex;flex-direction:column;justify-content:flex-start;gap:14px;background:#f8f6ff;font-family:${pF};color:#1e1b3a`,
    `
    <!-- Top Banners -->
    <div style="display:flex;gap:12px;height:240px;flex:none">
      <div style="flex:1;min-width:0;position:relative;overflow:hidden;background:#4a2fe0;border-radius:26px;padding:20px 24px;color:#fff;box-sizing:border-box">
        ${Q.coverImage ? `<img src="${Q.coverImage}" alt="${e(Q.city)}" crossOrigin="anonymous" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;opacity:0.22;mix-blend-mode:luminosity" />` : ''}
        <div style="position:absolute;right:-40px;top:-50px;width:170px;height:170px;border-radius:85px;background:rgba(255,255,255,.1)"></div>
        <svg viewBox="0 0 460 90" preserveAspectRatio="none" style="position:absolute;left:0;bottom:0;width:100%;height:90px" aria-hidden="true">
          <path d="M0 90V50L70 14l60 34 70-40 80 46 70-26 110 36v26z" fill="rgba(255,255,255,.14)"/>
        </svg>
        <div style="position:relative;display:flex;align-items:center;gap:12px">
          ${Q.logoUrl ? `
            <div style="background:#ffffff;padding:6px 14px;border-radius:14px;box-shadow:0 4px 14px rgba(74,47,224,0.25);display:flex;align-items:center;justify-content:center;min-height:48px;max-height:56px;max-width:190px;flex:none;box-sizing:border-box">
              <img src="${Q.logoUrl}" alt="${e(Q.companyName || BRAND)}" crossOrigin="anonymous" style="max-height:44px;max-width:162px;width:auto;height:auto;object-fit:contain;display:block" />
            </div>
          ` : `<div style="width:36px;height:36px;border-radius:18px;background:#ffb996;color:#4a2fe0;display:flex;align-items:center;justify-content:center">${ico('mountain', 18, 2.4)}</div>`}
          <div style="font-family:${pH};font-size:19px;font-weight:800">${e(Q.companyName || BRAND)}</div>
        </div>
        <div style="position:relative;margin-top:16px">
          <div style="font-size:10.5px;letter-spacing:2px;font-weight:800;color:#ffd4bd">TRAVEL QUOTATION · REF. NO. ${e(Q.ref)}</div>
          <div style="font-family:${pH};font-size:36px;font-weight:800;line-height:1.05;margin-top:2px">${e(Q.packageName)}</div>
        </div>
        <div style="position:relative;display:flex;gap:7px;margin-top:8px">
          ${chip('cal', Q.duration)}
          ${chip('pin', Q.city)}
          ${chip('user', Q.travellers)}
        </div>
      </div>

      <div style="width:220px;flex:none;background:#ffb996;border-radius:26px;padding:20px 18px;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box">
        <div>
          <div style="font-size:10.5px;letter-spacing:1.5px;font-weight:800;color:#5a2a10">QUOTED PACKAGE PRICE</div>
          <div style="font-family:${pH};font-size:${(Q.discountPercent && Q.discountPercent > 0) ? '34px' : '38px'};font-weight:800;line-height:1.1;margin-top:4px;color:#2a1240">${e(Q.price)}</div>
          ${(Q.discountPercent && Q.discountPercent > 0) ? `
            <div style="font-size:13px;font-weight:700;color:#7a3518;text-decoration:line-through;margin-top:2px;line-height:1.1">${e(getCutPrice(Q) || '')}</div>
          ` : ''}
        </div>
        <div>
          <div style="display:inline-block;background:#2a1240;color:#fff;font-size:10.5px;font-weight:800;letter-spacing:1px;padding:3px 10px;border-radius:999px">
            ${(Q.discountPercent && Q.discountPercent > 0) ? `${Q.discountPercent}% OFF · ALL-INCLUSIVE` : 'ALL-INCLUSIVE QUOTE'}
          </div>
          <div style="font-size:12px;font-weight:700;line-height:1.35;margin-top:4px;color:#3d1f10">${e(Q.priceNote)}</div>
        </div>
      </div>
    </div>

    <!-- Info Tiles -->
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px">
      ${tile('#e5dcff', '#4a2fe0', '#3c2a8a', 'user', 'PREPARED FOR', Q.client, 16)}
      ${tile('#c9f2e3', '#12805c', '#0c5a41', 'pin', 'PACKAGE', Q.packageName, 16)}
      ${tile('#ffe58a', '#8a5a00', '#5e3d00', 'car', 'SERVICES', Q.services, 14)}
    </div>

    <!-- Greeting -->
    <div style="font-size:12.5px;line-height:1.45;color:#3d3a5c">${greeting(Q)}</div>

    <!-- Stats Row -->
    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px">
      ${(Q.stats || [['12,000+', 'Trips delivered'], ['4.8/5', '2,140+ reviews'], ['24/7', 'Trip assistance'], ['100%', 'Customised plans']]).map((s) => `
        <div style="background:#fff;border:2px solid #e5dcff;border-radius:16px;padding:6px 4px;text-align:center">
          <div style="font-family:${pH};font-size:18px;font-weight:800;color:#4a2fe0;line-height:1.1">${e(s[0])}</div>
          <div style="font-size:10.5px;color:#4a4670;font-weight:600">${e(s[1])}</div>
        </div>
      `).join('')}
    </div>

    <!-- Accommodation Schedule -->
    <div style="display:flex;flex-direction:column;gap:5px">
      ${allHotels.map(h => `
        <div style="background:#fff;border:2px solid #e5dcff;border-radius:16px;padding:${isMulti ? '6px 12px' : '9px 14px'};display:flex;align-items:center;gap:12px">
          <div style="width:${isMulti ? '32px' : '38px'};height:${isMulti ? '32px' : '38px'};border-radius:10px;background:#4a2fe0;color:#fff;display:flex;align-items:center;justify-content:center;flex:none">${ico('bed', isMulti ? 16 : 20)}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:9.5px;letter-spacing:1px;font-weight:800;color:#3c2a8a">${e(h.nights.toUpperCase())} · ${e((h.city || Q.city).toUpperCase())}</div>
            <div style="margin-top:1px;line-height:1.25">
              <span style="font-family:${pH};font-size:${isMulti ? '14px' : '16px'};font-weight:700;display:inline;margin-right:8px">${e(h.name)}</span>
              <span style="background:#ffe58a;color:#5e3d00;font-size:9.5px;font-weight:800;padding:1.5px 8px;border-radius:999px;display:inline-block;vertical-align:middle;white-space:nowrap">${e(h.type)}</span>
            </div>
            <div style="font-size:11px;color:#4a4670;margin-top:1px">${e(h.room)}${h.rooms ? ` · ${e(h.rooms)}` : ''}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Inclusions / Exclusions (if fits on cover) -->
    ${incExcHtml}

    <!-- Pinned Footer at bottom -->
    <div style="margin-top:auto;padding-top:10px;border-top:1.5px solid #ddd3ff;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#4a2fe0;font-weight:700">
      <div>${BRAND} · Registered Luxury Tour Operator</div>
      <div style="color:#4a4670">Ref. No. ${e(Q.ref)} · All Inclusions Guaranteed</div>
    </div>
  `,
    'playful'
  );
}

export function playfulInclusionsSheet(
  Q: QuoteDataModel,
  includedSlice?: string[],
  excludedSlice?: string[],
  pageNum = 1,
  totalPages = 1
): string {
  const inc = includedSlice || Q.included;
  const exc = excludedSlice || Q.excluded;
  const pageLabel = totalPages > 1 ? ` · Page ${pageNum} of ${totalPages}` : '';

  return pg(
    `padding:30px 40px 20px;display:flex;flex-direction:column;justify-content:flex-start;gap:14px;background:#f8f6ff;font-family:${pF};color:#1e1b3a`,
    `
    <div style="flex:none">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:8px;font-family:${pH};font-size:18px;font-weight:700">
          <span style="width:28px;height:28px;border-radius:14px;background:#4a2fe0;color:#fff;display:flex;align-items:center;justify-content:center">${ico('mountain', 15, 2.4)}</span>${BRAND}
        </div>
        <div style="font-size:12px;color:#4a4670;font-weight:600">${e(Q.packageName)} · Ref. No. ${e(Q.ref)}</div>
      </div>
      <div style="margin:10px 0 14px">
        <div style="font-family:${pH};font-size:32px;font-weight:800;line-height:1.1;color:#4a2fe0">Package Inclusions &amp; Exclusions${pageLabel}</div>
      </div>
    </div>

    <div style="margin-top:4px">
      ${renderIncExcGrid(inc, exc, pageNum === totalPages ? Q.note : undefined, TH.playful)}
    </div>

    <!-- Pinned Footer at bottom -->
    <div style="margin-top:auto;padding-top:10px;border-top:1.5px solid #ddd3ff;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#4a4670">
      <div>${BRAND} · Registered Luxury Tour Operator</div>
      <div>Ref. No. ${e(Q.ref)} · All Inclusions Guaranteed</div>
    </div>
  `,
    'playful'
  );
}

export function playfulDaysSheet(
  Q: QuoteDataModel,
  daysSlice: Array<{ title: string; text: string; img?: string }>,
  startIdx: number
): string {
  const tints = ['#e5dcff', '#c9f2e3', '#fff1b8', '#ffd9c7', '#d8e8ff'];
  return pg(
    `padding:30px 40px 20px;display:flex;flex-direction:column;justify-content:flex-start;gap:14px;background:#f8f6ff;font-family:${pF};color:#1e1b3a`,
    `
    <!-- Header -->
    <div style="flex:none">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:10px">
          ${Q.logoUrl ? `<div style="background:#ffffff;padding:3px 8px;border-radius:8px;border:1px solid #ddd3ff;box-shadow:0 2px 4px rgba(74,47,224,0.06);display:flex;align-items:center"><img src="${Q.logoUrl}" alt="${e(Q.companyName || BRAND)}" crossOrigin="anonymous" style="max-height:30px;max-width:120px;width:auto;height:auto;object-fit:contain;display:block" /></div>` : `<span style="width:28px;height:28px;border-radius:14px;background:#4a2fe0;color:#fff;display:flex;align-items:center;justify-content:center">${ico('mountain', 15, 2.4)}</span>`}
          <div style="font-family:${pH};font-size:18px;font-weight:700">${e(Q.companyName || BRAND)}</div>
        </div>
        <div style="font-size:12px;color:#4a4670;font-weight:600">${e(Q.packageName)} · Ref. No. ${e(Q.ref)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin:10px 0 12px">
        <div style="font-family:${pH};font-size:32px;font-weight:800;line-height:1.1;color:#4a2fe0">Your adventure</div>
        <div style="background:#ffb996;color:#3d1f10;font-size:11px;font-weight:800;letter-spacing:1px;padding:3px 11px;border-radius:999px">${e(Q.duration)}</div>
      </div>
    </div>

    <!-- Cards Container: Image on TOP, Title & Text BELOW image -->
    <div style="display:flex;flex-direction:column;gap:12px;width:100%">
      ${daysSlice.map((d, i) => {
        const dayNum = startIdx + i + 1;
        const textLen = (d.text || '').length;
        const imgH = textLen > 500 ? 190 : (textLen > 300 ? 210 : 230);

        return `
          <div style="display:flex;flex-direction:column;gap:10px;background:${tints[(startIdx + i) % 5]};border-radius:22px;padding:12px 16px;box-sizing:border-box;width:100%">
            <!-- Image on TOP before title with DAY badge -->
            <div style="width:100%;height:${imgH}px;border-radius:16px;overflow:hidden;position:relative">
              ${scene(d, startIdx + i, 'playful')}
              <div style="position:absolute;left:10px;top:10px;background:#fff;color:#4a2fe0;font-family:${pH};font-size:11px;font-weight:800;padding:2px 9px;border-radius:999px">DAY ${dayNum}</div>
            </div>
            <!-- Title BELOW image -->
            <div style="font-family:${pH};font-size:16px;font-weight:700;line-height:1.2;color:#1e1b3a">
              ${e(d.title)}
            </div>
            <!-- Text BELOW title -->
            <div style="font-size:11.5px;line-height:1.45;color:#2f2b52;font-weight:500;word-break:break-word;white-space:pre-wrap">
              ${e(d.text)}
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <!-- Pinned Footer Note -->
    <div style="margin-top:auto;padding-top:10px;border-top:1px solid #ddd3ff;display:flex;align-items:center;justify-content:space-between;font-size:11.5px;color:#4a4670">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="color:#4a2fe0">${ico('shield', 14)}</span>${note()}
      </div>
      <div>Kingsland Verified Itinerary</div>
    </div>
  `,
    'playful'
  );
}

/* =====================================================================
   DESIGN 6 — DIWALI FESTIVE (Festive Lights, Midnight Plum & Golden Accents)
   ===================================================================== */
const dF = "'Manrope',sans-serif", dH = "'Playfair Display',serif";

export function diwaliCoverSheet(Q: QuoteDataModel, showInclusions = true): string {
  const tile = (ic: string, l: string, v: string) => `
    <div style="background:#fff;border:1.5px solid #ffe0b2;border-radius:14px;padding:10px 12px;box-sizing:border-box;box-shadow:0 4px 14px rgba(255,153,0,.08);display:flex;flex-direction:column;justify-content:flex-start">
      <div style="width:26px;height:26px;border-radius:13px;background:#fff3d6;color:#e65100;display:flex;align-items:center;justify-content:center;flex:none">${ico(ic, 14)}</div>
      <div style="font-size:10px;letter-spacing:1px;color:#7a4100;margin-top:5px;font-weight:700;flex:none">${l}</div>
      <div style="font-size:13px;font-weight:800;color:#1b0b2e;margin-top:2px;line-height:1.25;word-break:break-word">${e(v)}</div>
    </div>`;

  const allHotels = (Q.hotels && Q.hotels.length > 0) ? Q.hotels : (Q.hotel ? [Q.hotel] : []);
  const hotelCount = allHotels.length;
  const isMulti = hotelCount > 1;

  const incExcHtml = showInclusions ? renderIncExcGrid(Q.included, Q.excluded, Q.note, TH.diwali) : '';

  return pg(
    `padding:0;background:#fffbf2;font-family:${dF};color:#1b0b2e`,
    `
    <!-- Hero Banner with Festive Night Plum & Sparkling Gold -->
    <div style="position:relative;height:250px;background:linear-gradient(135deg, #1B0B2E 0%, #2D0F4A 55%, #42125E 100%);overflow:hidden;padding:26px 46px 0;box-sizing:border-box;flex:none;border-bottom:3.5px solid #FF9900">
      ${Q.coverImage ? `<img src="${Q.coverImage}" alt="${e(Q.city)}" crossOrigin="anonymous" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;opacity:0.25;mix-blend-mode:luminosity" />` : ''}
      <svg viewBox="0 0 794 90" preserveAspectRatio="none" style="position:absolute;left:0;bottom:0;width:794px;height:90px" aria-hidden="true">
        <path d="M0 90V45 Q 120 10 240 45 T 480 40 T 720 45 L 794 35 V 90 Z" fill="#240B3B" opacity="0.8"/>
        <path d="M0 90V65 Q 160 30 320 65 T 640 60 L 794 50 V 90 Z" fill="#FF9900" opacity="0.3"/>
      </svg>
      <div style="position:relative;display:flex;justify-content:space-between;align-items:flex-start">
        <div style="display:flex;align-items:center;gap:14px">
          ${Q.logoUrl ? `
            <div style="background:#ffffff;padding:6px 16px;border-radius:14px;border:2.5px solid #FFD700;box-shadow:0 4px 18px rgba(255,153,0,0.45);display:flex;align-items:center;justify-content:center;min-height:52px;max-height:60px;max-width:200px;flex:none;box-sizing:border-box">
              <img src="${Q.logoUrl}" alt="${e(Q.companyName || BRAND)}" crossOrigin="anonymous" style="max-height:48px;max-width:168px;width:auto;height:auto;object-fit:contain;display:block" />
            </div>
          ` : `<div style="width:46px;height:46px;border-radius:23px;border:1.5px solid #FFD700;background:rgba(255,215,0,0.15);display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 0 16px rgba(255,215,0,0.4)">🪔</div>`}
          <div>
            <div style="font-family:${dH};font-size:25px;font-weight:800;color:#FFD700;line-height:1.2;text-shadow:0 2px 8px rgba(0,0,0,0.5)">✨ ${e(Q.companyName || BRAND)}</div>
            <div style="font-size:10.5px;letter-spacing:1.6px;color:#FF9900;font-weight:700;margin-top:2px">FESTIVE EDITION · REGISTERED TOUR OPERATOR</div>
          </div>
        </div>
        <div style="text-align:right">
          <div style="display:inline-block;background:rgba(255,153,0,0.22);border:1px solid #FF9900;padding:3px 12px;border-radius:999px;font-size:10.5px;letter-spacing:1.8px;color:#FFD700;font-weight:800">🪔 DIWALI SPECIAL PROPOSAL</div>
          <div style="font-size:12px;color:#FFD599;margin-top:4px">Ref. No. ${e(Q.ref)}</div>
        </div>
      </div>
      <div style="position:relative;margin-top:20px">
        <div style="font-family:${dH};font-size:36px;font-weight:800;color:#fff;line-height:1.15;text-shadow:0 2px 10px rgba(0,0,0,0.4)">${e(Q.packageName)}</div>
        <div style="font-size:13px;color:#FFD599;margin-top:5px;line-height:1.3;font-weight:600">✨ ${e(Q.longDuration)} · ${e(Q.city)} · ${e(Q.priceNote)}</div>
      </div>
    </div>

    <!-- Content Sections Wrapper -->
    <div style="padding:14px 46px 20px;display:flex;flex-direction:column;justify-content:flex-start;gap:14px;box-sizing:border-box;flex:1;min-height:0">
      <!-- Info Tiles -->
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px">
        ${tile('user', 'PREPARED FOR', Q.client)}
        ${tile('pin', 'PACKAGE', Q.packageName)}
        ${tile('cal', 'DURATION', Q.duration)}
        ${tile('car', 'SERVICES', Q.services)}
      </div>

      <!-- Greeting -->
      <div style="font-size:12.5px;line-height:1.45;color:#4a385a">
        Dear <b>${e(Q.client)}</b>, wishing you and your family a very happy &amp; prosperous Diwali! Thank you for choosing ${BRAND}. Please find below our specially curated festive holiday proposal.
      </div>

      <!-- Price Box: Festive Glow -->
      <div style="display:flex;border-radius:14px;overflow:hidden;border:1.5px solid #FF9900;box-shadow:0 4px 18px rgba(255,153,0,0.15)">
        <div style="flex:1;padding:12px 18px;background:#fff;display:flex;flex-direction:column;justify-content:center">
          <div style="font-size:10.5px;letter-spacing:2px;color:#E65100;font-weight:800">🪔 FESTIVE OFFER PRICE</div>
          <div style="font-family:${dH};font-size:22px;font-weight:700;color:#1B0B2E;margin-top:2px;line-height:1.2">${e(Q.packageName)}</div>
          <div style="font-size:11.5px;color:#7a4100;margin-top:2px;line-height:1.3">${e(Q.travellers)} · Private Vehicle · Handpicked Stays</div>
        </div>
        <div style="width:220px;background:linear-gradient(135deg, #1B0B2E 0%, #2D0F4A 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:8px 10px">
          ${(Q.discountPercent && Q.discountPercent > 0) ? `
            <div style="background:#FF9900;color:#1B0B2E;font-size:9.5px;font-weight:900;letter-spacing:1px;padding:2px 8px;border-radius:4px;line-height:1.2">DIWALI SPECIAL · ${Q.discountPercent}% OFF</div>
            <div style="font-family:${dH};font-size:28px;font-weight:800;color:#FFD700;line-height:1.1">${e(Q.price)}</div>
            <div style="font-size:11.5px;color:#FFD599;text-decoration:line-through;opacity:0.85;line-height:1">${e(getCutPrice(Q) || '')}</div>
          ` : `
            <div style="background:#FF9900;color:#1B0B2E;font-size:10px;font-weight:900;letter-spacing:1px;padding:3px 10px;border-radius:4px;line-height:1.2">ALL-INCLUSIVE LAND PACKAGE</div>
            <div style="font-family:${dH};font-size:32px;font-weight:800;color:#FFD700;line-height:1.15;margin-top:2px">${e(Q.price)}</div>
          `}
        </div>
      </div>

      <!-- Stats Row -->
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid #FFE0B2;border-bottom:1px solid #FFE0B2;padding:6px 0;background:#FFFBF2">
        ${(Q.stats || [['12,000+', 'Trips delivered'], ['4.8/5', '2,140+ reviews'], ['24/7', 'Trip assistance'], ['100%', 'Customised plans']]).map((s, i) => `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;${i ? 'border-left:1px solid #FFE0B2' : ''}">
            <div style="font-family:${dH};font-size:19px;font-weight:800;color:#1B0B2E">${e(s[0])}</div>
            <div style="font-size:10px;letter-spacing:1px;color:#E65100;font-weight:700">${e(s[1].toUpperCase())}</div>
          </div>
        `).join('')}
      </div>

      <!-- Accommodation Schedule -->
      <div style="display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="color:#E65100">🪔</div>
          <div style="font-family:${dH};font-size:15px;font-weight:800;color:#1B0B2E">Handpicked Festive Stays (${hotelCount} ${hotelCount > 1 ? 'Hotels' : 'Hotel'})</div>
          <div style="flex:1;height:1px;background:#FFE0B2"></div>
        </div>
        ${allHotels.map(h => `
          <div style="background:#fff;border:1px solid #FFE0B2;border-radius:12px;padding:${isMulti ? '6px 12px' : '10px 16px'};display:flex;align-items:center;gap:12px;box-shadow:0 2px 8px rgba(255,153,0,0.05)">
            <div style="width:115px;flex-shrink:0">
              <div style="font-size:12px;font-weight:800;color:#1B0B2E">${e(h.nights)}</div>
              <div style="font-size:10.5px;color:#7a4100;margin-top:1px">${e(h.city || Q.city)}</div>
            </div>
            <div style="flex:1;min-width:0">
              <div style="margin-top:1px;line-height:1.3">
                <span style="font-size:${isMulti ? '13px' : '14.5px'};font-weight:800;color:#1B0B2E;display:inline;margin-right:8px">${e(h.name)}</span>
                <span style="background:#FFF3D6;color:#B26A00;font-size:9.5px;font-weight:800;padding:2px 7px;border-radius:6px;display:inline-block;vertical-align:middle;white-space:nowrap">${e(h.type)}</span>
              </div>
              ${h.rooms ? `
              <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:#4a385a;margin-top:2px;line-height:1.35">
                <span style="color:#E65100;display:inline-flex;align-items:center;flex:none;width:12px;height:12px">${ico('food', 12)}</span><span style="min-width:0">${e(h.rooms)}</span>
              </div>` : ''}
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:${isMulti ? '12px' : '13px'};font-weight:800;color:#1B0B2E">${e(h.room)}</div>
              <div style="font-size:10.5px;color:#7a4100;margin-top:1px">${e(Q.travellers)}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Inclusions / Exclusions (if fits on cover) -->
      ${incExcHtml}

      <!-- Pinned Footer at bottom -->
      <div style="margin-top:auto;padding-top:10px;border-top:1.5px solid #FFE0B2;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#7a4100;font-weight:600">
        <div>🪔 Happy Diwali from ${BRAND} · Celebrating the Joy of Travel</div>
        <div style="color:#1B0B2E;font-weight:700">Ref. No. ${e(Q.ref)} · All Inclusions Guaranteed</div>
      </div>
    </div>
  `,
    'diwali'
  );
}

export function diwaliInclusionsSheet(
  Q: QuoteDataModel,
  includedSlice?: string[],
  excludedSlice?: string[],
  pageNum = 1,
  totalPages = 1
): string {
  const inc = includedSlice || Q.included;
  const exc = excludedSlice || Q.excluded;
  const pageLabel = totalPages > 1 ? ` · Page ${pageNum} of ${totalPages}` : '';

  return pg(
    `padding:34px 46px 22px;background:#fffbf2;font-family:${dF};color:#1b0b2e`,
    `
    <div style="flex:none">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-family:${dH};font-size:18px;font-weight:800;color:#FF9900">✨ ${BRAND} · Festive Edition</div>
        <div style="font-size:12px;color:#7a4100">${e(Q.packageName)} · Ref. No. ${e(Q.ref)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin:10px 0 16px">
        <div style="color:#E65100">🪔</div>
        <div style="font-family:${dH};font-size:26px;font-weight:800;line-height:1.1;color:#1B0B2E">Inclusions &amp; Exclusions${pageLabel}</div>
        <div style="flex:1;height:2px;background:#FF9900"></div>
      </div>
    </div>

    <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-start">
      ${renderIncExcGrid(inc, exc, pageNum === totalPages ? Q.note : undefined, TH.diwali)}
    </div>

    <div style="margin-top:auto;padding-top:10px;border-top:1.5px solid #FFE0B2;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#7a4100;font-weight:600">
      <div>🪔 Celebrating the Joy of Travel · Certified Rajasthan Tourism Partner</div>
      <div style="color:#1B0B2E;font-weight:700">Official Festive Quotation · Kingsland Holidays</div>
    </div>
  `,
    'diwali'
  );
}

export function diwaliDaysSheet(
  Q: QuoteDataModel,
  daysSlice: Array<{ title: string; text: string; img?: string }>,
  startIdx: number
): string {
  const n = daysSlice.length;
  return pg(
    `padding:34px 46px 22px;background:#fffbf2;font-family:${dF};color:#1b0b2e`,
    `
    <!-- Header -->
    <div style="flex:none">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:10px">
          ${Q.logoUrl ? `<div style="background:#ffffff;padding:3px 10px;border-radius:8px;border:1.5px solid #FFD700;box-shadow:0 2px 8px rgba(255,153,0,0.2);display:flex;align-items:center"><img src="${Q.logoUrl}" alt="${e(Q.companyName || BRAND)}" crossOrigin="anonymous" style="max-height:30px;max-width:120px;width:auto;height:auto;object-fit:contain;display:block" /></div>` : ''}
          <div style="font-family:${dH};font-size:18px;font-weight:800;color:#FF9900">✨ ${e(Q.companyName || BRAND)} · Festive Edition</div>
        </div>
        <div style="font-size:12px;color:#7a4100">${e(Q.packageName)} · Ref. No. ${e(Q.ref)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin:10px 0 14px">
        <div style="color:#E65100">🪔</div>
        <div style="font-family:${dH};font-size:26px;font-weight:800;line-height:1.1;color:#1B0B2E">Festive Day-wise Itinerary</div>
        <div style="flex:1;height:2px;background:#FF9900"></div>
      </div>
    </div>

    <!-- Cards Container: fixed 12px gap, natural heights -->
    <div style="display:flex;flex-direction:column;gap:12px;width:100%">
      ${daysSlice.map((d, i) => {
        const dayNum = startIdx + i + 1;
        const textLen = (d.text || '').length;
        const imgH = textLen > 500 ? 190 : (textLen > 300 ? 210 : 230);
        const isLastOnPage = i === n - 1;

        return `
          <div style="display:flex;gap:14px;align-items:stretch;width:100%">
            <!-- Timeline on Left -->
            <div style="width:42px;flex:none;display:flex;flex-direction:column;align-items:center">
              <div style="width:38px;height:38px;border-radius:19px;background:#1B0B2E;color:#FFD700;font-family:${dH};font-weight:800;font-size:15px;display:flex;align-items:center;justify-content:center;flex:none;box-shadow:0 0 10px rgba(255,153,0,0.3);border:1px solid #FF9900">
                ${String(dayNum).padStart(2, '0')}
              </div>
              ${!isLastOnPage ? `<div style="width:2px;flex:1;min-height:16px;background:#FF9900;margin-top:4px"></div>` : ''}
            </div>

            <!-- Card Box: Image on TOP, Title & Text BELOW image -->
            <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:10px;background:#fff;border:1px solid #FFE0B2;border-radius:14px;padding:12px 16px;box-shadow:0 4px 12px rgba(255,153,0,.06);box-sizing:border-box">
              <!-- Image BEFORE title -->
              <div style="width:100%;height:${imgH}px;border-radius:10px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.06)">
                ${scene(d, startIdx + i, 'diwali')}
              </div>
              <!-- Title BELOW image -->
              <div style="font-family:${dH};font-size:15.5px;font-weight:800;line-height:1.25;color:#1B0B2E">
                Day ${dayNum}: ${e(d.title)}
              </div>
              <!-- Text BELOW title -->
              <div style="font-size:11.5px;line-height:1.45;color:#3D2E4A;word-break:break-word;white-space:pre-wrap">
                ${e(d.text)}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <!-- Pinned Footer Note -->
    <div style="margin-top:auto;padding-top:10px;border-top:1px solid #FFE0B2;display:flex;align-items:center;justify-content:space-between;font-size:11.5px;color:#7a4100">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="color:#E65100">🪔</span>${note()}
      </div>
      <div style="color:#1B0B2E;font-weight:700">Kingsland Verified Festive Itinerary</div>
    </div>
  `,
    'diwali'
  );
}

/* =====================================================================
   MAIN BUILDER: Renders all pages for a chosen design
   ===================================================================== */
export const AVAILABLE_QUOTE_DESIGNS = [
  { id: 'royal', name: 'Royal Gold', dot: '#d4af37', font: 'Playfair Display + Manrope', desc: 'Classic regal luxury with gold trims and majestic dark navy headers.' },
  { id: 'alpine', name: 'Alpine Teal', dot: '#0f4c4a', font: 'DM Serif Display + DM Sans', desc: 'Mountain green & golden amber, designed for hill excursions & nature trails.' },
  { id: 'sunset', name: 'Sunset Coral', dot: '#ff6a3d', font: 'Outfit + Nunito Sans', desc: 'Warm sunset gradient banner, circular price stamp, energetic leisure layout.' },
  { id: 'editorial', name: 'Editorial', dot: '#111111', font: 'Bricolage Grotesque + Hanken', desc: 'High-contrast monochrome with red accent, bold typography, magazine aesthetic.' },
  { id: 'playful', name: 'Playful Violet', dot: '#4a2fe0', font: 'Baloo 2 + Nunito', desc: 'Vibrant modern purple & peach colors with rounded cards and playful curves.' },
  { id: 'diwali', name: 'Diwali Festive', dot: '#ff9900', font: 'Playfair Display + Manrope', desc: 'Festive golden lights & midnight plum luxury theme with celebratory diya accents.' }
];

/**
 * Main proposal builder.
 * Guarantees:
 * 1. Spacing: NO space-between, fixed 14px gap between sections, natural heights, footer pinned at bottom.
 * 2. Inclusions/Exclusions: NO slice() limits, all items shown.
 *    If estimated content exceeds cover capacity, moves Inclusions/Exclusions to dedicated sheet(s).
 * 3. Itinerary Days: Image on TOP before title, title and text below image in all designs.
 *    Height-aware chunking without slicing or clipping.
 * 4. Terms: Natural heights, fixed gaps, partner boxes directly below content, advisor footer at bottom.
 */
export function renderCompleteProposalHtml(
  Q: QuoteDataModel,
  designId = 'royal',
  customPartners?: PartnerBrand[]
): string {
  const normId = (designId || 'royal').toLowerCase();
  let key = 'royal';
  if (
    normId.includes('diwali') ||
    normId.includes('deepawali') ||
    normId.includes('festival') ||
    normId.includes('f4b4ac06')
  ) {
    key = 'diwali';
  } else if (normId.includes('alpine') || normId.includes('emerald')) {
    key = 'alpine';
  } else if (normId.includes('sunset') || normId.includes('coral')) {
    key = 'sunset';
  } else if (normId.includes('editorial') || normId.includes('dark')) {
    key = 'editorial';
  } else if (normId.includes('playful') || normId.includes('violet')) {
    key = 'playful';
  }

  const pages: string[] = [];

  // 1. Check if Inclusions & Exclusions fit on the Cover page
  const { fitsOnCover } = estimateBlockHeight(Q, key);

  // Render Cover Page (with or without inclusions/exclusions)
  if (key === 'royal') pages.push(royalCoverSheet(Q, fitsOnCover));
  else if (key === 'alpine') pages.push(alpineCoverSheet(Q, fitsOnCover));
  else if (key === 'sunset') pages.push(sunsetCoverSheet(Q, fitsOnCover));
  else if (key === 'editorial') pages.push(editorialCoverSheet(Q, fitsOnCover));
  else if (key === 'playful') pages.push(playfulCoverSheet(Q, fitsOnCover));
  else if (key === 'diwali') pages.push(diwaliCoverSheet(Q, fitsOnCover));

  // If Inclusions & Exclusions did not fit on cover, add Dedicated Inclusions Sheet(s)
  if (!fitsOnCover) {
    const allInc = normalizeListItems(Q.included);
    const allExc = normalizeListItems(Q.excluded);
    const maxItemsPerPage = 18;

    const maxItems = Math.max(allInc.length, allExc.length);
    const totalIncPages = Math.max(1, Math.ceil(maxItems / maxItemsPerPage));
    const itemsPerSlice = Math.ceil(maxItems / totalIncPages);

    for (let p = 0; p < totalIncPages; p++) {
      const incSlice = allInc.slice(p * itemsPerSlice, (p + 1) * itemsPerSlice);
      const excSlice = allExc.slice(p * itemsPerSlice, (p + 1) * itemsPerSlice);

      if (key === 'royal') pages.push(royalInclusionsSheet(Q, incSlice, excSlice, p + 1, totalIncPages));
      else if (key === 'alpine') pages.push(alpineInclusionsSheet(Q, incSlice, excSlice, p + 1, totalIncPages));
      else if (key === 'sunset') pages.push(sunsetInclusionsSheet(Q, incSlice, excSlice, p + 1, totalIncPages));
      else if (key === 'editorial') pages.push(editorialInclusionsSheet(Q, incSlice, excSlice, p + 1, totalIncPages));
      else if (key === 'playful') pages.push(playfulInclusionsSheet(Q, incSlice, excSlice, p + 1, totalIncPages));
      else if (key === 'diwali') pages.push(diwaliInclusionsSheet(Q, incSlice, excSlice, p + 1, totalIncPages));
    }
  }

  // 2. Day-wise Itinerary Pages with Height-Aware Chunking
  const totalDays = (Q.days && Q.days.length > 0) ? Q.days : [
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
    else if (key === 'diwali') pages.push(diwaliDaysSheet(Q, c.slice, c.startIdx));
  }

  // 3. Terms & Cancellation Policy Page
  pages.push(renderTermsSheet(Q, key, customPartners));

  return pages.join('\n');
}
