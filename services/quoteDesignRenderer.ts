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
 *  - Page 1: Cover / Overview (with stretch to footer, content-aware continuation)
 *  - Page 2+: Day-wise Itinerary (measured pagination, no clipping, text-only when no img)
 *  - Page Last: Terms & Cancellation Policy (CSS multi-column, table+notes unified, partners on last page)
 */

import {
  HOTEL_PARTNERS,
  TRAVEL_PARTNERS,
  PartnerBrand,
  renderPartnerBadgeHtml,
  deduplicatePartners,
  resolvePartner,
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
  termsText?: string;
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

const svcIcons = ['car', 'bed', 'pin'];
const note = () => `Itinerary is indicative and may change with weather, road conditions or local permits.`;

const pg = (style: string, inner: string) =>
  `<div class="sheet" style="width:794px;height:1123px;min-height:1123px;max-height:1123px;position:relative;overflow:hidden;box-sizing:border-box;background:#ffffff;margin:0 auto;box-shadow:0 6px 24px rgba(20,24,50,.14);display:flex;flex-direction:column;justify-content:space-between;${style}">${inner}</div>`;

/* Theme settings for Terms and Shared styling */
export const TH: Record<string, any> = {
  royal: {
    bg: '#fdfbf6', ink: '#1b2540', muted: '#3b455f', accent: '#d4af37', onAccent: '#12213f',
    line: '#e3dac0', card: '#ffffff', footBg: '#12213f', footInk: '#ffffff',
    head: "'Playfair Display',serif", body: "'Manrope',sans-serif", radius: '14px', sec: 'rule'
  },
  alpine: {
    bg: '#fbfdfc', ink: '#12302f', muted: '#3f5a58', accent: '#f2a93b', onAccent: '#2a1c00',
    line: '#cfe5e1', card: '#e6f4f1', footBg: '#0f4c4a', footInk: '#ffffff',
    head: "'DM Serif Display',serif", body: "'DM Sans',sans-serif", radius: '16px', sec: 'pill'
  },
  sunset: {
    bg: '#fffaf6', ink: '#231f2b', muted: '#4a4352', accent: '#ff6a3d', onAccent: '#ffffff',
    line: '#f3d9c8', card: '#fff1e6', footBg: '#231f2b', footInk: '#ffffff',
    head: "'Outfit',sans-serif", body: "'Nunito Sans',sans-serif", radius: '20px', sec: 'bar'
  },
  editorial: {
    bg: '#f7f7f4', ink: '#111111', muted: '#33332f', accent: '#e5431f', onAccent: '#ffffff',
    line: '#cfcfca', card: '#ffffff', footBg: '#111111', footInk: '#ffffff',
    head: "'Bricolage Grotesque',sans-serif", body: "'Hanken Grotesk',sans-serif", radius: '0px', sec: 'rule'
  },
  playful: {
    bg: '#f8f6ff', ink: '#1e1b3a', muted: '#3d3a5c', accent: '#4a2fe0', onAccent: '#ffffff',
    line: '#ddd3ff', card: '#ffffff', footBg: '#4a2fe0', footInk: '#ffffff',
    head: "'Baloo 2',sans-serif", body: "'Nunito',sans-serif", radius: '24px', sec: 'pill'
  }
};

/* =====================================================================
   NORMALIZATION & UTILITY FUNCTIONS
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
 * Heuristic block height estimator used for server-side / headless runs
 * when browser DOM measurement is not available.
 */
function estimateHtmlBlockHeight(html: string, width = 702): number {
  const plainText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const charsPerLine = Math.max(30, Math.floor(width / 8.5));
  const lines = Math.ceil(plainText.length / charsPerLine) || 1;
  const hasImage = html.includes('<img');
  const basePadding = 32;
  const lineHeight = 18;
  const imgHeight = hasImage ? 170 : 0;
  return basePadding + (lines * lineHeight) + imgHeight;
}

/* =====================================================================
   UNIFIED MEASURED PAGINATION ENGINE
   ===================================================================== */

/**
 * Single reusable function for content-aware block pagination.
 * Operates on HTML elements or rendered blocks and greedy-packs them
 * into pages according to available pageContentHeight.
 */
export function paginateBlocks<T extends HTMLElement>(
  blocks: T[],
  pageContentHeight: number,
  gapBetweenBlocks = 12
): T[][] {
  const pages: T[][] = [];
  let currentPage: T[] = [];
  let currentUsedHeight = 0;

  for (const block of blocks) {
    const blockHeight = block.offsetHeight || parseFloat(block.style.height) || 0;
    const additionalGap = currentPage.length > 0 ? gapBetweenBlocks : 0;

    if (currentPage.length > 0 && (currentUsedHeight + additionalGap + blockHeight) > pageContentHeight) {
      pages.push(currentPage);
      currentPage = [block];
      currentUsedHeight = blockHeight;
    } else {
      currentPage.push(block);
      currentUsedHeight += additionalGap + blockHeight;
    }
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

/**
 * Measures an array of HTML block strings in a real off-screen container (using authentic fonts and width),
 * then packs them into pages using paginateBlocks logic, and computes leftover space per page.
 */
export function measureAndPaginateHtml(
  htmlBlocks: string[],
  pageContentHeight: number,
  containerWidth = 702,
  fontFamily = "'Manrope', sans-serif",
  defaultGap = 12
): { pages: string[][]; leftoverHeights: number[]; heights: number[] } {
  if (htmlBlocks.length === 0) return { pages: [], leftoverHeights: [], heights: [] };

  let blockHeights: number[] = [];

  if (typeof document !== 'undefined' && document.body) {
    const measureContainer = document.createElement('div');
    measureContainer.setAttribute('data-quote-measure', '1');
    measureContainer.style.cssText = `
      position: absolute !important;
      top: -99999px !important;
      left: -99999px !important;
      width: ${containerWidth}px !important;
      min-width: ${containerWidth}px !important;
      max-width: ${containerWidth}px !important;
      visibility: hidden !important;
      pointer-events: none !important;
      box-sizing: border-box !important;
      font-family: ${fontFamily} !important;
      margin: 0 !important;
      padding: 0 !important;
    `;

    htmlBlocks.forEach((html, i) => {
      const wrap = document.createElement('div');
      wrap.setAttribute('data-idx', String(i));
      wrap.style.cssText = 'width: 100% !important; box-sizing: border-box !important; margin: 0 !important; padding: 0 !important;';
      wrap.innerHTML = html;
      measureContainer.appendChild(wrap);
    });

    document.body.appendChild(measureContainer);

    blockHeights = Array.from(measureContainer.children).map(child => {
      const el = child as HTMLElement;
      return Math.ceil(el.offsetHeight || el.getBoundingClientRect().height || 0);
    });

    document.body.removeChild(measureContainer);
  } else {
    blockHeights = htmlBlocks.map(html => estimateHtmlBlockHeight(html, containerWidth));
  }

  const pages: string[][] = [];
  const leftoverHeights: number[] = [];

  let currentPage: string[] = [];
  let currentHeight = 0;

  for (let i = 0; i < htmlBlocks.length; i++) {
    const h = blockHeights[i];
    const html = htmlBlocks[i];
    const gap = currentPage.length > 0 ? defaultGap : 0;

    if (currentPage.length > 0 && (currentHeight + gap + h) > pageContentHeight) {
      pages.push(currentPage);
      leftoverHeights.push(Math.max(0, pageContentHeight - currentHeight));
      currentPage = [html];
      currentHeight = h;
    } else {
      currentPage.push(html);
      currentHeight += gap + h;
    }
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
    leftoverHeights.push(Math.max(0, pageContentHeight - currentHeight));
  }

  return { pages, leftoverHeights, heights: blockHeights };
}

/* =====================================================================
   DAY-WISE ITINERARY ENGINE (BUG 1, 4, 5)
   ===================================================================== */

export interface RenderedDayItem {
  dayNum: number;
  title: string;
  text: string;
  img?: string;
  isContinued?: boolean;
}

/**
 * Splits a single day card if its description alone is taller than available page height.
 * Segment boundaries: "➜" or "->" or sentence boundaries.
 * Adds "Day N (continued)" to continuation cards. No text is dropped.
 */
function splitDayCardIfOversized(
  item: RenderedDayItem,
  maxAvailableHeight: number,
  themeKey = 'royal'
): RenderedDayItem[] {
  const rawText = item.text || '';
  const wordCount = rawText.trim().split(/\s+/).filter(Boolean).length;
  const dummyHtml = buildDayCardHtml(item, themeKey, false);
  const heights = measureAndPaginateHtml([dummyHtml], maxAvailableHeight);
  const measuredHeight = heights.heights[0] || estimateHtmlBlockHeight(dummyHtml);

  // If card is reasonably sized (under 280 words and measured under maxAvailableHeight), don't split
  if (measuredHeight <= maxAvailableHeight && wordCount < 280 && rawText.length < 1600) {
    return [item];
  }

  // Card alone is taller than the available height. Split description!
  let segments: string[] = [];

  if (rawText.includes('➜')) {
    segments = rawText.split(/(?=➜)/g).map(s => s.trim()).filter(Boolean);
  } else if (rawText.includes('->')) {
    segments = rawText.split(/(?=->)/g).map(s => s.trim()).filter(Boolean);
  } else {
    // Split by sentences
    segments = rawText.split(/(?<=[.?!])\s+/g).map(s => s.trim()).filter(Boolean);
  }

  if (segments.length <= 1) {
    // Fallback: split by words
    const words = rawText.split(/\s+/);
    const mid = Math.ceil(words.length / 2);
    segments = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
  }

  const results: RenderedDayItem[] = [];
  let currentCardSegments: string[] = [];
  let isCont = false;
  const targetWordsPerCard = 220; // Safe capacity per page card

  for (let s = 0; s < segments.length; s++) {
    const testSegments = [...currentCardSegments, segments[s]];
    const currentWords = testSegments.join(' ').split(/\s+/).length;
    const candidateItem: RenderedDayItem = {
      dayNum: item.dayNum,
      title: item.title,
      text: testSegments.join(' '),
      img: results.length === 0 ? item.img : undefined,
      isContinued: isCont,
    };
    const candHtml = buildDayCardHtml(candidateItem, themeKey, false);
    const candH = measureAndPaginateHtml([candHtml], maxAvailableHeight).heights[0] || estimateHtmlBlockHeight(candHtml);

    if (currentCardSegments.length > 0 && (candH > maxAvailableHeight || currentWords > targetWordsPerCard)) {
      // Current card is full. Push it.
      results.push({
        dayNum: item.dayNum,
        title: item.title,
        text: currentCardSegments.join(' '),
        img: results.length === 0 ? item.img : undefined,
        isContinued: isCont,
      });
      currentCardSegments = [segments[s]];
      isCont = true;
    } else {
      currentCardSegments.push(segments[s]);
    }
  }

  if (currentCardSegments.length > 0) {
    results.push({
      dayNum: item.dayNum,
      title: item.title,
      text: currentCardSegments.join(' '),
      img: results.length === 0 ? item.img : undefined,
      isContinued: isCont,
    });
  }

  return results.length > 0 ? results : [item];
}

/**
 * Builds the HTML string for a single Day Card according to the chosen theme.
 * Guarantees:
 * - NO fixed/max height on day card or text column.
 * - align-items: flex-start, NEVER center.
 * - Text column grows to fit all text (min-height only).
 * - Day image is a fixed box (220x160px) and never stretches the card.
 * - If NO image, renders full-width text-only card (no SVG landscape illustration!).
 */
function buildDayCardHtml(item: RenderedDayItem, themeKey: string, isLastOnPage: boolean): string {
  const th = TH[themeKey] || TH.royal;
  const hasImage = Boolean(item.img && item.img.trim());
  const titlePrefix = `Day ${item.dayNum}${item.isContinued ? ' (continued)' : ''}: `;

  const imgBox = hasImage
    ? `<div style="width:220px;height:160px;min-height:160px;max-height:160px;flex:none;border-radius:10px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.06);background:${th.card}">
         <img src="${e(item.img)}" crossOrigin="anonymous" alt="" style="width:100%;height:100%;object-fit:cover;display:block" />
       </div>`
    : '';

  return `
    <div style="display:flex;gap:14px;align-items:stretch;width:100%">
      <div style="width:42px;flex:none;display:flex;flex-direction:column;align-items:center">
        <div style="width:38px;height:38px;border-radius:19px;background:${th.onAccent};color:${th.accent};font-family:${th.head};font-weight:700;font-size:15px;display:flex;align-items:center;justify-content:center;flex:none">
          ${String(item.dayNum).padStart(2, '0')}
        </div>
        ${!isLastOnPage ? `<div style="width:2px;flex:1;min-height:16px;background:${th.accent};margin-top:4px"></div>` : ''}
      </div>
      <div style="flex:1;min-width:0;display:flex;gap:16px;background:#ffffff;border:1px solid ${th.line};border-radius:${th.radius};padding:14px 18px;box-shadow:0 3px 10px rgba(18,33,63,.05);align-items:flex-start;justify-content:space-between;box-sizing:border-box">
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:flex-start;align-items:stretch">
          <div style="font-family:${th.head};font-size:15.5px;font-weight:700;line-height:1.25;color:${th.ink}">
            ${titlePrefix}${e(item.title)}
          </div>
          <div style="font-size:11.5px;line-height:1.45;color:${th.muted};margin-top:6px;word-break:break-word;white-space:pre-wrap">
            ${e(item.text)}
          </div>
        </div>
        ${imgBox}
      </div>
    </div>
  `;
}

/**
 * Content-aware dynamic pagination for itinerary days.
 * Returns pagination groups with their exact card items.
 */
export function chunkItineraryDays(
  days: Array<{ title: string; text: string; img?: string }>,
  key = 'royal'
): Array<{ slice: Array<{ title: string; text: string; img?: string }>; startIdx: number }> {
  if (!days || days.length === 0) return [];

  // Available content height for day cards in A4 sheet = 1123 - padding(56) - header(86) - footer(36) - margins(24) = 921px
  const maxContentH = 920;

  // Flatten & split any day cards that alone are taller than a page
  const preparedDays: RenderedDayItem[] = [];
  for (let i = 0; i < days.length; i++) {
    const raw = days[i];
    const initialItem: RenderedDayItem = {
      dayNum: i + 1,
      title: raw.title,
      text: raw.text,
      img: raw.img,
    };
    const splitItems = splitDayCardIfOversized(initialItem, maxContentH, key);
    preparedDays.push(...splitItems);
  }

  // Pre-render blocks for measurement
  const htmlBlocks = preparedDays.map((d, idx) => buildDayCardHtml(d, key, false));
  const { pages } = measureAndPaginateHtml(htmlBlocks, maxContentH, 702, "'Manrope',sans-serif", 12);

  // Map back to slice chunks
  const result: Array<{ slice: Array<{ title: string; text: string; img?: string }>; startIdx: number }> = [];
  let currIdx = 0;

  for (const pageBlockList of pages) {
    const count = pageBlockList.length;
    const pageItems = preparedDays.slice(currIdx, currIdx + count);
    result.push({
      slice: pageItems.map(p => ({
        title: p.isContinued ? `${p.title} (continued)` : p.title,
        text: p.text,
        img: p.img,
      })),
      startIdx: currIdx,
    });
    currIdx += count;
  }

  return result.length > 0 ? result : [{ slice: days, startIdx: 0 }];
}

/**
 * Renders a single Day-wise Itinerary Sheet with fit-to-page gap distribution
 * and clean timeline badges that restart per page.
 */
function renderPaginatedDaysSheet(
  Q: QuoteDataModel,
  pageItems: RenderedDayItem[],
  themeKey: string,
  leftoverH = 0
): string {
  const th = TH[themeKey] || TH.royal;
  const n = pageItems.length;

  // Fit-to-page: distribute leftover space as extra gap between cards (capped at 28px)
  let cardGap = 12;
  if (n > 1 && leftoverH > 0) {
    const extra = Math.floor(leftoverH / (n - 1));
    cardGap = Math.min(28, 12 + extra);
  }

  const cardsHtml = pageItems
    .map((item, i) => buildDayCardHtml(item, themeKey, i === n - 1))
    .join('');

  return pg(
    `padding:34px 46px 22px;background:${th.bg};font-family:${th.body};color:${th.ink};display:flex;flex-direction:column;height:1123px;box-sizing:border-box;justify-content:space-between;overflow:hidden`,
    `
    <div style="flex:none">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-family:${th.head};font-size:18px;font-weight:700">${BRAND}</div>
        <div style="font-size:12px;color:${th.muted}">${e(Q.packageName)} · Ref. No. ${e(Q.ref)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin:10px 0 14px">
        <div style="color:${th.accent}">${ico('pin', 22)}</div>
        <div style="font-family:${th.head};font-size:26px;font-weight:700;line-height:1.1">Day-wise Itinerary</div>
        <div style="flex:1;height:2px;background:${th.accent}"></div>
      </div>
    </div>

    <!-- Cards Container: fills available area with computed gap -->
    <div style="flex:1;min-height:0;display:flex;flex-direction:column;justify-content:flex-start;gap:${cardGap}px;margin-bottom:12px">
      ${cardsHtml}
    </div>

    <!-- Pinned Footer Note -->
    <div style="flex:none;padding-top:10px;border-top:1.5px solid ${th.line};display:flex;align-items:center;justify-content:space-between;font-size:11.5px;color:${th.muted}">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="color:${th.accent}">${ico('shield', 14)}</span>${note()}
      </div>
      <div>Kingsland Verified Itinerary</div>
    </div>
  `
  );
}

/* =====================================================================
   INCLUSIONS / EXCLUSIONS & ACCOMMODATION CONTINUATION (BUG 2)
   ===================================================================== */

/**
 * Renders an overflow continuation sheet for Accommodation and/or Inclusions & Exclusions.
 */
export function renderInclusionsContinuationSheet(
  Q: QuoteDataModel,
  overflowHotels: HotelItemModel[],
  overflowIncluded: string[],
  overflowExcluded: string[],
  themeKey = 'royal'
): string {
  const th = TH[themeKey] || TH.royal;

  const item = (t: string, c: string, ic: string) => `
    <div style="display:flex;gap:8px;align-items:flex-start;font-size:11.5px;line-height:1.35;color:${th.ink}">
      <span style="color:${c};margin-top:1px">${ico(ic, 13, 3)}</span><span>${e(t)}</span>
    </div>`;

  const hotelsBlock = overflowHotels.length > 0 ? `
    <div style="margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="color:${th.accent}">${ico('bed', 17)}</div>
        <div style="font-family:${th.head};font-size:16px;font-weight:700">Accommodation Schedule (continued)</div>
        <div style="flex:1;height:1px;background:${th.line}"></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${overflowHotels.map(h => `
          <div style="background:#fff;border:1px solid ${th.line};border-radius:12px;padding:8px 14px;display:flex;align-items:center;gap:14px">
            <div style="width:115px;flex-shrink:0">
              <div style="font-size:12px;font-weight:800">${e(h.nights)}</div>
              <div style="font-size:10.5px;color:${th.muted};margin-top:1px">${e(h.city || Q.city)}</div>
            </div>
            <div style="flex:1;min-width:0">
              <div style="margin-top:1px;line-height:1.3">
                <span style="font-size:13.5px;font-weight:800;display:inline;margin-right:8px">${e(h.name)}</span>
                <span style="background:${th.card};color:${th.ink};border:1px solid ${th.line};font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:6px;display:inline-block">${e(h.type)}</span>
              </div>
              ${h.rooms ? `<div style="font-size:11px;color:${th.muted};margin-top:2px">${ico('food', 12)} ${e(h.rooms)}</div>` : ''}
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:12.5px;font-weight:800">${e(h.room)}</div>
              <div style="font-size:10.5px;color:${th.muted};margin-top:1px">${e(Q.travellers)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  return pg(
    `padding:34px 46px 22px;background:${th.bg};font-family:${th.body};color:${th.ink};display:flex;flex-direction:column;height:1123px;box-sizing:border-box;justify-content:space-between;overflow:hidden`,
    `
    <div style="flex:none">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-family:${th.head};font-size:18px;font-weight:700">${BRAND}</div>
        <div style="font-size:12px;color:${th.muted}">${e(Q.packageName)} · Ref. No. ${e(Q.ref)}</div>
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin:10px 0 14px">
        <div style="color:${th.accent}">${ico('shield', 22)}</div>
        <div style="font-family:${th.head};font-size:26px;font-weight:700;line-height:1.1">Inclusions &amp; Exclusions (continued)</div>
        <div style="flex:1;height:2px;background:${th.accent}"></div>
      </div>
    </div>

    <div style="flex:1;min-height:0;display:flex;flex-direction:column;justify-content:flex-start;margin-bottom:12px">
      ${hotelsBlock}

      <div style="flex:1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px">
        <div style="background:#eef7f1;border:1px solid #bfe0cc;border-radius:14px;padding:14px 18px;display:flex;flex-direction:column;justify-content:flex-start">
          <div style="display:flex;align-items:center;gap:8px;font-family:${th.head};font-size:16px;font-weight:700;color:#14573a;margin-bottom:8px">
            ${ico('check', 16, 2.4)} Included (continued)
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${overflowIncluded.map(t => item(t, '#1f8a5b', 'check')).join('')}
          </div>
        </div>

        <div style="background:#fdf1f0;border:1px solid #efc4c0;border-radius:14px;padding:14px 18px;display:flex;flex-direction:column;justify-content:flex-start">
          <div style="display:flex;align-items:center;gap:8px;font-family:${th.head};font-size:16px;font-weight:700;color:#9c2b22;margin-bottom:8px">
            ${ico('x', 16, 2.4)} Excluded (continued)
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${overflowExcluded.map(t => item(t, '#c0392b', 'x')).join('')}
          </div>
          ${Q.note ? `<div style="margin-top:10px;font-size:11px;line-height:1.4;color:#6b4f10;background:#fbf1d6;border-radius:8px;padding:8px 10px">${e(Q.note)}</div>` : ''}
        </div>
      </div>
    </div>

    <!-- Pinned Footer Note -->
    <div style="flex:none;padding-top:10px;border-top:1.5px solid ${th.line};display:flex;align-items:center;justify-content:space-between;font-size:11.5px;color:${th.muted}">
      <div>${BRAND} · Registered Luxury Tour Operator · North India &amp; International</div>
      <div>Ref. No. ${e(Q.ref)} · All Inclusions Guaranteed</div>
    </div>
  `
  );
}

/* =====================================================================
   TERMS & CONDITIONS ENGINE (BUG 3, 5)
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

  // Parse admin-edited dynamic terms text
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

/**
 * Builds HTML for a single Terms Section.
 * CRITICAL FIX: The cancellation fee table AND its notes live in the SAME block directly under each other.
 */
function buildTermsSectionBlock(
  secObj: { title: string; bullets?: string[]; isFees?: boolean },
  th: any
): string {
  const base = `font-family:${th.head};font-size:12px;font-weight:700;margin-bottom:6px;`;
  let secHeading = base + `color:${th.ink};text-transform:uppercase;letter-spacing:0.8px;border-bottom:2px solid ${th.accent};padding-bottom:3px;`;
  if (th.sec === 'pill') secHeading = base + `display:inline-block;background:${th.accent};color:${th.onAccent};padding:2px 9px;border-radius:999px;`;
  if (th.sec === 'bar') secHeading = base + `color:${th.ink};border-left:3px solid ${th.accent};padding-left:7px;`;

  const bl = (arr: string[]) => arr.map(t => `<div style="display:flex;gap:5px"><span style="color:${th.accent};flex:none">●</span><span>${e(t)}</span></div>`).join('');
  const col = (arr: string[]) => `<div style="display:flex;flex-direction:column;gap:3.5px;font-size:10px;line-height:1.32;color:${th.muted}">${bl(arr)}</div>`;

  if (secObj.isFees) {
    const fees = DEFAULT_TERMS.fees
      .map(f => `<div style="display:flex;justify-content:space-between;gap:6px;font-size:10.5px;padding:2.5px 0;border-bottom:1px solid ${th.line}"><span>${e(f[0])}</span><b>${e(f[1])}</b></div>`)
      .join('');

    return `
      <div style="break-inside:avoid;page-break-inside:avoid;-webkit-column-break-inside:avoid;margin-bottom:14px">
        <div style="${secHeading}">Cancellation policy · land package</div>
        <div style="background:${th.card};border:1px solid ${th.line};border-radius:${th.radius};padding:4px 10px">${fees}</div>
        <div style="margin-top:6px">${col(DEFAULT_TERMS.feeNotes)}</div>
      </div>
    `;
  }

  return `
    <div style="break-inside:avoid;page-break-inside:avoid;-webkit-column-break-inside:avoid;margin-bottom:14px">
      <div style="${secHeading}">${e(secObj.title)}</div>
      ${col(secObj.bullets || [])}
    </div>
  `;
}

/**
 * Builds the Partners (Hotel Working Partners + Working Partners) and Advisor Footer block.
 * Rendered ONLY on the last Terms page, directly following the last section.
 */
function buildPartnersAndAdvisorBlock(
  Q: QuoteDataModel,
  th: any,
  customPartners?: PartnerBrand[]
): string {
  // Support custom manually added partners or fallback to curated partner network
  const hotelsToRender = (customPartners && customPartners.filter(p => p.category === 'hotel').length > 0)
    ? customPartners.filter(p => p.category === 'hotel')
    : HOTEL_PARTNERS;

  const travelsToRender = (customPartners && customPartners.filter(p => p.category === 'travel').length > 0)
    ? customPartners.filter(p => p.category === 'travel')
    : TRAVEL_PARTNERS;

  // De-duplicate partners and resolve SVG badges
  const dedupedHotels = deduplicatePartners(hotelsToRender);
  const dedupedTravels = deduplicatePartners(travelsToRender);

  const hotelBadges = dedupedHotels
    .map(b => renderPartnerBadgeHtml(b, { line: th.line, card: th.card, ink: th.ink, showTag: false, showName: false }))
    .join('');

  const travelBadges = dedupedTravels
    .map(b => renderPartnerBadgeHtml(b, { line: th.line, card: th.card, ink: th.ink, showTag: false, showName: false }))
    .join('');

  return `
    <div style="flex:none;margin-top:20px;display:flex;flex-direction:column;gap:10px">
      <!-- 1st Box: Hotel Working Partners -->
      <div style="background:${th.card};border:1px solid ${th.line};border-radius:${th.radius};padding:8px 14px;display:flex;flex-direction:column;gap:6px">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:${th.ink};display:flex;align-items:center;gap:6px">
          <span style="width:6px;height:6px;border-radius:50%;background:${th.accent};display:inline-block"></span>
          <span>Hotel Working Partners</span>
        </div>
        <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px">
          ${hotelBadges}
        </div>
      </div>

      <!-- 2nd Box: Working Partners -->
      <div style="background:${th.card};border:1px solid ${th.line};border-radius:${th.radius};padding:8px 14px;display:flex;flex-direction:column;gap:6px">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px;color:${th.ink};display:flex;align-items:center;gap:6px">
          <span style="width:6px;height:6px;border-radius:50%;background:${th.accent};display:inline-block"></span>
          <span>Working Partners</span>
        </div>
        <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px">
          ${travelBadges}
        </div>
      </div>

      <!-- Advisor Footer -->
      <div style="background:${th.footBg};color:${th.footInk};border-radius:${th.radius};padding:12px 18px;display:flex;justify-content:space-between;align-items:center;gap:14px">
        <div>
          <div style="font-size:10px;opacity:.85">Your trip advisor</div>
          <div style="font-family:${th.head};font-size:15px;font-weight:700;margin-top:1px">${e(Q.advisor.name)}</div>
          <div style="font-size:10.5px;opacity:.85">${e(Q.advisor.role)}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;font-size:11.5px;font-weight:600">
          <div style="display:flex;align-items:center;gap:6px">${ico('phone', 13)}${e(Q.advisor.phones)}</div>
          <div style="display:flex;align-items:center;gap:6px">${ico('mail', 13)}${e(Q.advisor.email)}</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Renders the Terms & Cancellation Policy page(s).
 * Uses CSS multi-column (column-count: 2; column-gap: 24px) without equal row-height gaps.
 * Paginates dynamic terms if they exceed 1 page.
 * Places Partners + Advisor ONLY on the last Terms page directly following sections.
 */
export function renderTermsSheet(Q: QuoteDataModel, thKey: string, customPartners?: PartnerBrand[]): string {
  const th = TH[thKey] || TH.royal;
  const sections = parseTermsSections(Q.termsText);

  // Available height in 2-column layout:
  // Sheet: 1123px - paddings(46px) - header(65px) = 1012px.
  // Partners + Advisor block ≈ 240px.
  // In 2 columns, capacity on Page 1 is approx ~750px of content per column (1500px total).
  const page1MaxColumnHeight = 740;
  const continuationPageMaxColumnHeight = 980;

  const sectionBlocks = sections.map(s => buildTermsSectionBlock(s, th));

  // Determine pagination: measure section blocks
  // In 2 columns, total section height must not exceed 2 * page1MaxColumnHeight - partnersSpace
  const measured = measureAndPaginateHtml(sectionBlocks, page1MaxColumnHeight * 2, 702);
  const totalSectionsHeight = measured.heights.reduce((a, b) => a + b, 0);
  // Single page fits if sections total height fits comfortably alongside partners (<= 4 sections and height fits)
  const fitsSinglePage = sections.length <= 4 && totalSectionsHeight <= 850;

  if (fitsSinglePage) {
    const sectionsHtml = sectionBlocks.join('');
    const partnersAndAdvisor = buildPartnersAndAdvisorBlock(Q, th, customPartners);

    return pg(
      `padding:26px 40px 20px;background:${th.bg};color:${th.ink};font-family:${th.body};display:flex;flex-direction:column;justify-content:flex-start;height:1123px;box-sizing:border-box;overflow:hidden`,
      `
      <div style="flex:none">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-family:${th.head};font-size:18px;font-weight:700">${BRAND}</div>
          <div style="font-size:11px;color:${th.muted}">${e(Q.packageName)} · Ref. No. ${e(Q.ref)}</div>
        </div>
        <div style="font-family:${th.head};font-size:21px;font-weight:700;margin:6px 0 14px;line-height:1.15">Terms &amp; Cancellation Policy</div>
      </div>

      <!-- CSS Multi-Column Sections -->
      <div style="flex:none;column-count:2;column-gap:24px;-webkit-column-count:2;-webkit-column-gap:24px;width:100%">
        ${sectionsHtml}
      </div>

      <!-- Partners + Advisor directly follows last section (normal 20px gap, no big empty middle) -->
      ${partnersAndAdvisor}
    `
    );
  }

  // Dynamic / long terms: split across 2 pages
  // Page 1 gets half the sections (or what fits), Page 2 gets remaining + partners + advisor
  const midPoint = Math.max(2, Math.floor(sections.length / 2));
  const p1Sections = sectionBlocks.slice(0, midPoint).join('');
  const p2Sections = sectionBlocks.slice(midPoint).join('');
  const partnersAndAdvisor = buildPartnersAndAdvisorBlock(Q, th, customPartners);

  const page1 = pg(
    `padding:26px 40px 20px;background:${th.bg};color:${th.ink};font-family:${th.body};display:flex;flex-direction:column;justify-content:space-between;height:1123px;box-sizing:border-box;overflow:hidden`,
    `
    <div style="flex:none">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-family:${th.head};font-size:18px;font-weight:700">${BRAND}</div>
        <div style="font-size:11px;color:${th.muted}">${e(Q.packageName)} · Ref. No. ${e(Q.ref)}</div>
      </div>
      <div style="font-family:${th.head};font-size:21px;font-weight:700;margin:6px 0 14px;line-height:1.15">Terms &amp; Cancellation Policy</div>
    </div>

    <div style="flex:1;column-count:2;column-gap:24px;-webkit-column-count:2;-webkit-column-gap:24px;width:100%">
      ${p1Sections}
    </div>

    <div style="flex:none;padding-top:10px;border-top:1px solid ${th.line};display:flex;justify-content:space-between;font-size:10.5px;color:${th.muted}">
      <div>${BRAND} · Terms &amp; Policies Continued On Next Page</div>
      <div>Page 1 of 2</div>
    </div>
  `
  );

  const page2 = pg(
    `padding:26px 40px 20px;background:${th.bg};color:${th.ink};font-family:${th.body};display:flex;flex-direction:column;justify-content:flex-start;height:1123px;box-sizing:border-box;overflow:hidden`,
    `
    <div style="flex:none">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-family:${th.head};font-size:18px;font-weight:700">${BRAND}</div>
        <div style="font-size:11px;color:${th.muted}">${e(Q.packageName)} · Ref. No. ${e(Q.ref)}</div>
      </div>
      <div style="font-family:${th.head};font-size:21px;font-weight:700;margin:6px 0 14px;line-height:1.15">Terms &amp; Cancellation Policy (continued)</div>
    </div>

    <div style="flex:none;column-count:2;column-gap:24px;-webkit-column-count:2;-webkit-column-gap:24px;width:100%">
      ${p2Sections}
    </div>

    <!-- Partners and Advisor ONLY on the last Terms page -->
    ${partnersAndAdvisor}
  `
  );

  return `${page1}\n${page2}`;
}

/* =====================================================================
   DESIGN 1 — ROYAL GOLD (COVER & DAYS)
   ===================================================================== */
const rF = "'Manrope',sans-serif", rH = "'Playfair Display',serif";

export function royalCoverSheet(
  Q: QuoteDataModel,
  opts: {
    hotelsOverride?: HotelItemModel[];
    includedOverride?: string[];
    excludedOverride?: string[];
    fontSize?: number;
  } = {}
): string {
  const tile = (ic: string, l: string, v: string) => `
    <div style="background:#fff;border:1px solid #e8e1cf;border-radius:14px;padding:12px 14px;min-height:96px;box-sizing:border-box;box-shadow:0 4px 16px rgba(18,33,63,.1);display:flex;flex-direction:column;justify-content:flex-start">
      <div style="width:28px;height:28px;border-radius:14px;background:#f4ecd2;color:#8a6a1c;display:flex;align-items:center;justify-content:center;flex:none">${ico(ic, 15)}</div>
      <div style="font-size:11px;letter-spacing:1px;color:#5f6985;margin-top:6px;font-weight:600;flex:none">${l}</div>
      <div style="font-size:13.5px;font-weight:800;margin-top:2px;line-height:1.25;word-break:break-word">${e(v)}</div>
    </div>`;

  const itemFontSize = opts.fontSize || 12;
  const item = (t: string, c: string, ic: string) => `
    <div style="display:flex;gap:7px;align-items:flex-start;font-size:${itemFontSize}px;line-height:1.3;color:#1b2540">
      <span style="color:${c};margin-top:1px">${ico(ic, itemFontSize, 3)}</span><span>${e(t)}</span>
    </div>`;

  const allHotels = opts.hotelsOverride || ((Q.hotels && Q.hotels.length > 0) ? Q.hotels : [Q.hotel]);
  const includedList = opts.includedOverride || normalizeListItems(Q.included);
  const excludedList = opts.excludedOverride || normalizeListItems(Q.excluded);

  return pg(
    `padding:0;background:#fdfbf6;font-family:${rF};color:#1b2540;display:flex;flex-direction:column;height:1123px;box-sizing:border-box;justify-content:space-between;overflow:hidden`,
    `
    <div style="flex:none;position:relative;height:246px;background:#12213f;overflow:hidden;padding:32px 46px 0">
      ${Q.coverImage ? `<img src="${Q.coverImage}" crossOrigin="anonymous" alt="${e(Q.city)}" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;opacity:0.26;mix-blend-mode:luminosity" />` : ''}
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
      <div style="position:relative;margin-top:24px">
        <div style="font-family:${rH};font-size:38px;font-weight:700;color:#fff;line-height:1.15">${e(Q.packageName)}</div>
        <div style="font-size:13px;color:#dfe5f2;margin-top:4px;line-height:1.3">${e(Q.longDuration)} · ${e(Q.city)} · ${e(Q.priceNote)}</div>
      </div>
    </div>

    <div style="flex:1;min-height:0;padding:14px 46px 20px;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box">
      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px">
        ${tile('user', 'PREPARED FOR', Q.client)}
        ${tile('pin', 'PACKAGE', Q.packageName)}
        ${tile('cal', 'DURATION', Q.duration)}
        ${tile('car', 'SERVICES', Q.services)}
      </div>

      <div style="font-size:12.5px;line-height:1.45;color:#3b455f;margin:4px 0">${greeting(Q)}</div>

      <div style="display:flex;min-height:94px;border-radius:14px;overflow:hidden;border:1.5px solid #12213f">
        <div style="flex:1;padding:14px 20px;background:#fff;display:flex;flex-direction:column;justify-content:center">
          <div style="font-size:11px;letter-spacing:2px;color:#8a6a1c;font-weight:800">QUOTED PACKAGE PRICE</div>
          <div style="font-family:${rH};font-size:23px;font-weight:700;margin-top:2px;line-height:1.2">${e(Q.packageName)}</div>
          <div style="font-size:12px;color:#5f6985;margin-top:2px;line-height:1.3">${e(Q.travellers)} · ${e(Q.priceNote)}</div>
        </div>
        <div style="width:220px;background:#12213f;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:8px 10px">
          ${(Q.discountPercent && Q.discountPercent > 0) ? `
            <div style="background:#d4af37;color:#12213f;font-size:10px;font-weight:800;letter-spacing:1px;padding:2px 8px;border-radius:4px;line-height:1.2;display:inline-flex;align-items:center;justify-content:center">${Q.discountPercent}% OFF</div>
            <div style="font-family:${rH};font-size:30px;font-weight:700;color:#fff;line-height:1.1">${e(Q.price)}</div>
            <div style="font-size:12px;color:#cfd6e6;text-decoration:line-through;opacity:0.85;line-height:1">${e(getCutPrice(Q) || '')}</div>
          ` : `
            <div style="background:#d4af37;color:#12213f;font-size:11px;font-weight:800;letter-spacing:1px;padding:3px 10px;border-radius:4px;line-height:1.2;display:inline-flex;align-items:center;justify-content:center">ALL-INCLUSIVE QUOTE</div>
            <div style="font-family:${rH};font-size:34px;font-weight:700;color:#fff;line-height:1.15;margin-top:2px">${e(Q.price)}</div>
          `}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid #d9cfae;border-bottom:1px solid #d9cfae;height:54px">
        ${Q.stats.map((s, i) => `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;${i ? 'border-left:1px solid #d9cfae' : ''}">
            <div style="font-family:${rH};font-size:19px;font-weight:700">${e(s[0])}</div>
            <div style="font-size:10.5px;letter-spacing:1px;color:#5f6985">${e(s[1].toUpperCase())}</div>
          </div>
        `).join('')}
      </div>

      <div style="display:flex;flex-direction:column;gap:6px">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="color:#8a6a1c">${ico('bed', 17)}</div>
          <div style="font-family:${rH};font-size:16px;font-weight:700">Accommodation Schedule (${allHotels.length} ${allHotels.length > 1 ? 'Hotels' : 'Hotel'})</div>
          <div style="flex:1;height:1px;background:#d9cfae"></div>
        </div>
        ${allHotels.map(h => `
          <div style="background:#fff;border:1px solid #e8e1cf;border-radius:12px;padding:${allHotels.length > 1 ? '6px 12px' : '10px 16px'};display:flex;align-items:center;gap:14px">
            <div style="width:115px;flex-shrink:0">
              <div style="font-size:12px;font-weight:800">${e(h.nights)}</div>
              <div style="font-size:10.5px;color:#5f6985;margin-top:1px">${e(h.city || Q.city)}</div>
            </div>
            <div style="flex:1;min-width:0">
              <div style="margin-top:1px;line-height:1.3">
                <span style="font-size:${allHotels.length > 1 ? '13px' : '14.5px'};font-weight:800;display:inline;margin-right:8px">${e(h.name)}</span>
                <span style="background:#f4ecd2;color:#6b4f10;font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:6px;display:inline-block;vertical-align:middle;white-space:nowrap">${e(h.type)}</span>
              </div>
              ${h.rooms ? `
              <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:#3b455f;margin-top:2px;line-height:1.35">
                <span style="color:#8a6a1c;display:inline-flex;align-items:center;flex:none;width:12px;height:12px">${ico('food', 12)}</span><span style="min-width:0">${e(h.rooms)}</span>
              </div>` : ''}
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:${allHotels.length > 1 ? '12px' : '13px'};font-weight:800">${e(h.room)}</div>
              <div style="font-size:10.5px;color:#5f6985;margin-top:1px">${e(Q.travellers)}</div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Included & Excluded Boxes: flex:1 stretch to footer, NO big blank gap below -->
      <div style="flex:1;min-height:140px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:4px">
        <div style="background:#eef7f1;border:1px solid #bfe0cc;border-radius:14px;padding:12px 16px;display:flex;flex-direction:column;justify-content:flex-start">
          <div style="display:flex;align-items:center;gap:8px;font-family:${rH};font-size:16px;font-weight:700;color:#14573a;margin-bottom:6px">${ico('check', 16, 2.4)}Included</div>
          <div style="display:flex;flex-direction:column;gap:5px">${includedList.map(t => item(t, '#1f8a5b', 'check')).join('')}</div>
        </div>
        <div style="background:#fdf1f0;border:1px solid #efc4c0;border-radius:14px;padding:12px 16px;display:flex;flex-direction:column;justify-content:flex-start">
          <div style="display:flex;align-items:center;gap:8px;font-family:${rH};font-size:16px;font-weight:700;color:#9c2b22;margin-bottom:6px">${ico('x', 16, 2.4)}Excluded</div>
          <div style="display:flex;flex-direction:column;gap:5px">${excludedList.map(t => item(t, '#c0392b', 'x')).join('')}</div>
          ${Q.note ? `<div style="margin-top:6px;font-size:11px;line-height:1.4;color:#6b4f10;background:#fbf1d6;border-radius:8px;padding:6px 8px">${e(Q.note)}</div>` : ''}
        </div>
      </div>

      <div style="flex:none;margin-top:8px;padding-top:10px;border-top:1.5px solid #d9cfae;display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#8a6a1c;font-weight:600">
        <div>${BRAND} · Registered Luxury Tour Operator · North India &amp; International</div>
        <div style="color:#5f6985">Ref. No. ${e(Q.ref)} · All Inclusions Guaranteed</div>
      </div>
    </div>
  `
  );
}

export function royalDaysSheet(
  Q: QuoteDataModel,
  daysSlice: Array<{ title: string; text: string; img?: string }>,
  startIdx: number
): string {
  const items: RenderedDayItem[] = daysSlice.map((d, i) => ({
    dayNum: startIdx + i + 1,
    title: d.title,
    text: d.text,
    img: d.img,
    isContinued: d.title.includes('(continued)'),
  }));
  return renderPaginatedDaysSheet(Q, items, 'royal');
}

/* =====================================================================
   DESIGN 2 — ALPINE TEAL
   ===================================================================== */
const aF = "'DM Sans',sans-serif", aH = "'DM Serif Display',serif";

export function alpineCoverSheet(Q: QuoteDataModel): string {
  return royalCoverSheet(Q); // Uses shared unified layout with theme styles
}

export function alpineDaysSheet(
  Q: QuoteDataModel,
  daysSlice: Array<{ title: string; text: string; img?: string }>,
  startIdx: number
): string {
  const items: RenderedDayItem[] = daysSlice.map((d, i) => ({
    dayNum: startIdx + i + 1,
    title: d.title,
    text: d.text,
    img: d.img,
    isContinued: d.title.includes('(continued)'),
  }));
  return renderPaginatedDaysSheet(Q, items, 'alpine');
}

/* =====================================================================
   DESIGN 3 — SUNSET CORAL
   ===================================================================== */
export function sunsetCoverSheet(Q: QuoteDataModel): string {
  return royalCoverSheet(Q);
}

export function sunsetDaysSheet(
  Q: QuoteDataModel,
  daysSlice: Array<{ title: string; text: string; img?: string }>,
  startIdx: number
): string {
  const items: RenderedDayItem[] = daysSlice.map((d, i) => ({
    dayNum: startIdx + i + 1,
    title: d.title,
    text: d.text,
    img: d.img,
    isContinued: d.title.includes('(continued)'),
  }));
  return renderPaginatedDaysSheet(Q, items, 'sunset');
}

/* =====================================================================
   DESIGN 4 — EDITORIAL
   ===================================================================== */
export function editorialCoverSheet(Q: QuoteDataModel): string {
  return royalCoverSheet(Q);
}

export function editorialDaysSheet(
  Q: QuoteDataModel,
  daysSlice: Array<{ title: string; text: string; img?: string }>,
  startIdx: number
): string {
  const items: RenderedDayItem[] = daysSlice.map((d, i) => ({
    dayNum: startIdx + i + 1,
    title: d.title,
    text: d.text,
    img: d.img,
    isContinued: d.title.includes('(continued)'),
  }));
  return renderPaginatedDaysSheet(Q, items, 'editorial');
}

/* =====================================================================
   DESIGN 5 — PLAYFUL VIOLET
   ===================================================================== */
export function playfulCoverSheet(Q: QuoteDataModel): string {
  return royalCoverSheet(Q);
}

export function playfulDaysSheet(
  Q: QuoteDataModel,
  daysSlice: Array<{ title: string; text: string; img?: string }>,
  startIdx: number
): string {
  const items: RenderedDayItem[] = daysSlice.map((d, i) => ({
    dayNum: startIdx + i + 1,
    title: d.title,
    text: d.text,
    img: d.img,
    isContinued: d.title.includes('(continued)'),
  }));
  return renderPaginatedDaysSheet(Q, items, 'playful');
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
 * Main proposal builder. Content-aware, measured pagination for:
 * 1. Cover Sheet & Inclusions / Hotels (stretches flex:1 to footer, paginates if overflowing)
 * 2. Day-wise Itinerary (measured greedy packing, description splitting, text-only when no img)
 * 3. Terms & Cancellation Policy (CSS multi-column, table+notes unified, partners on last page only)
 */
export function renderCompleteProposalHtml(
  Q: QuoteDataModel,
  designId = 'royal',
  customPartners?: PartnerBrand[]
): string {
  const normId = (designId || 'royal').toLowerCase();
  let key = 'royal';
  if (normId.includes('alpine') || normId.includes('emerald')) key = 'alpine';
  else if (normId.includes('sunset') || normId.includes('coral')) key = 'sunset';
  else if (normId.includes('editorial') || normId.includes('dark')) key = 'editorial';
  else if (normId.includes('playful') || normId.includes('violet')) key = 'playful';

  const pages: string[] = [];

  // 1. Process Inclusions / Exclusions & Accommodation Schedule for Page 1
  const allHotels = (Q.hotels && Q.hotels.length > 0) ? Q.hotels : [Q.hotel];
  const allIncluded = normalizeListItems(Q.included);
  const allExcluded = normalizeListItems(Q.excluded);

  // Measure if all items fit on Page 1:
  // In Royal Cover, max items that fit cleanly at 12px font is ~7 included, ~5 excluded with 1-2 hotels.
  const hotelsToFitOnCover = allHotels.length > 3 ? allHotels.slice(0, 2) : allHotels;
  const overflowHotels = allHotels.length > 3 ? allHotels.slice(2) : [];

  let coverIncluded = allIncluded;
  let coverExcluded = allExcluded;
  let overflowIncluded: string[] = [];
  let overflowExcluded: string[] = [];
  let coverFontSize = 12;

  const totalIncExc = allIncluded.length + allExcluded.length;

  if (totalIncExc > 12 || overflowHotels.length > 0) {
    // Check if slight font reduction (11px) allows fitting
    if (totalIncExc <= 14 && overflowHotels.length === 0) {
      coverFontSize = 11;
    } else {
      // Split overflow items to continuation page
      const incCoverCount = Math.min(allIncluded.length, 7);
      const excCoverCount = Math.min(allExcluded.length, 5);

      coverIncluded = allIncluded.slice(0, incCoverCount);
      coverExcluded = allExcluded.slice(0, excCoverCount);

      overflowIncluded = allIncluded.slice(incCoverCount);
      overflowExcluded = allExcluded.slice(excCoverCount);
    }
  }

  // Add Page 1 Cover Sheet
  pages.push(royalCoverSheet(Q, {
    hotelsOverride: hotelsToFitOnCover,
    includedOverride: coverIncluded,
    excludedOverride: coverExcluded,
    fontSize: coverFontSize,
  }));

  // If there are overflow hotels or inclusions/exclusions, add Continuation Sheet
  if (overflowHotels.length > 0 || overflowIncluded.length > 0 || overflowExcluded.length > 0) {
    pages.push(
      renderInclusionsContinuationSheet(
        Q,
        overflowHotels,
        overflowIncluded,
        overflowExcluded,
        key
      )
    );
  }

  // 2. Day-wise Itinerary Pages with Measured Greedy Pagination
  const totalDays = Q.days.length > 0 ? Q.days : [
    { title: 'Arrival & Hotel Check-in', text: 'Arrive at destination, private transfer to hotel and evening leisure.' },
    { title: 'Local Sightseeing & Experiences', text: 'Full day sightseeing tour exploring key heritage landmarks and markets.' },
    { title: 'Departure with Cherished Memories', text: 'Breakfast at hotel and seamless transfer to airport / railway station.' }
  ];

  // Available height in A4 sheet for day cards = 920px
  const maxContentH = 920;

  // Flatten and split any day cards where description alone is taller than a page
  const preparedDays: RenderedDayItem[] = [];
  for (let i = 0; i < totalDays.length; i++) {
    const raw = totalDays[i];
    const initialItem: RenderedDayItem = {
      dayNum: i + 1,
      title: raw.title,
      text: raw.text,
      img: raw.img,
    };
    const splitItems = splitDayCardIfOversized(initialItem, maxContentH, key);
    preparedDays.push(...splitItems);
  }

  // Pre-render day cards for exact measurement
  const dayHtmlBlocks = preparedDays.map((d) => buildDayCardHtml(d, key, false));
  const { pages: paginatedDayBlocks, leftoverHeights } = measureAndPaginateHtml(
    dayHtmlBlocks,
    maxContentH,
    702,
    "'Manrope',sans-serif",
    12
  );

  let currentDayOffset = 0;
  for (let p = 0; p < paginatedDayBlocks.length; p++) {
    const count = paginatedDayBlocks[p].length;
    const pageItems = preparedDays.slice(currentDayOffset, currentDayOffset + count);
    const leftover = leftoverHeights[p] || 0;
    pages.push(renderPaginatedDaysSheet(Q, pageItems, key, leftover));
    currentDayOffset += count;
  }

  // 3. Terms & Cancellation Policy Page(s)
  pages.push(renderTermsSheet(Q, key, customPartners));

  return pages.join('\n');
}
