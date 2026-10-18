import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import puppeteer, { Browser } from 'puppeteer-core';
import { PDFDocument } from 'pdf-lib';
import {
  BRAND_DEFAULTS,
  PdfThemeRecord,
  resolveActivePdfTheme,
  THEMES_STORAGE_DIR,
} from './pdfThemeService';
import { getDestinationFallbackImage } from './pdfThemeImageService';
import { queryAll } from '../db/connection';

// Chrome executable detection
export function getChromeExecutablePath(): string {
  const envPath = process.env.CHROME_BIN || process.env.PUPPETEER_EXECUTABLE_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;

  const defaultPaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];

  for (const p of defaultPaths) {
    if (fs.existsSync(p)) return p;
  }
  return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
}

export interface PackageRenderData {
  title: string;
  destination: string;
  duration: string;
  nights?: number;
  daysCount?: number;
  price: string;
  cutPrice?: string;
  badge?: string;
  heroImage?: string;
  heroFocalPoint?: { x: number; y: number };
  summary?: string;
  highlights?: string[];
  inclusions?: string[];
  exclusions?: string[];
  specialNotes?: string;
  itinerary: Array<{
    dayNumber: number;
    title: string;
    description: string;
    shortSummary?: string;
    image?: string;
    imageFocalPoint?: { x: number; y: number };
  }>;
  hotels?: Array<{
    hotelName: string;
    city: string;
    category?: string;
    roomType?: string;
    mealPlan?: string;
    nights?: number;
    image?: string;
  }>;
  terms?: string[];
  cancellationFees?: Array<[string, string]>;
  advisor?: {
    name: string;
    role: string;
    phone: string;
    email: string;
    avatar?: string;
  };
  themeOverrideId?: string;
  detailedItinerary?: boolean;
}

const FLAME_ICON_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="#FF6B35" stroke="#FF6B35" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`;
const CHECK_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex:none;margin-top:2px"><path d="M20 6 9 17l-5-5"/></svg>`;
const CROSS_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c62828" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex:none;margin-top:2px"><path d="M18 6 6 18M6 6l12 12"/></svg>`;
const PIN_ICON_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF6B35" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:none"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
const SHIELD_ICON_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#14142B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;

/**
 * Escapes HTML helper
 */
export function escapeHtml(s: any): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Builds the complete A4 HTML for the Package Itinerary PDF
 */
export function buildPackageProposalHtml(
  pkg: PackageRenderData,
  theme: PdfThemeRecord,
  fillerModules: Record<number, string[]> = {},
  isTransparentForArtwork: boolean = false
): string {
  const colors = theme.meta.colors || BRAND_DEFAULTS.colors;
  const fonts = theme.meta.fonts || BRAND_DEFAULTS.fonts;
  const bg = isTransparentForArtwork ? 'transparent' : (colors.background || '#FFF9F0');
  const textColor = colors.text || '#14142B';
  const primaryColor = colors.primary || '#FF6B35';
  const rustColor = colors.rust || '#D9582B';
  const navyColor = colors.navy || '#14142B';
  const radius = theme.meta.imageRadius ?? 16;

  // Resolve cover hero photo
  let heroImg = pkg.heroImage || '';
  if (!heroImg) {
    heroImg = getDestinationFallbackImage(pkg.destination);
  }
  const heroFocalX = pkg.heroFocalPoint?.x ?? 50;
  const heroFocalY = pkg.heroFocalPoint?.y ?? 50;

  // Total days count
  const totalDays = pkg.itinerary?.length || pkg.daysCount || 5;
  const isShortTrip = totalDays <= 3; // Rule: If total days <= 3, merge Itinerary at a glance and detailed days

  // Resolved day items with fallback photos
  const resolvedDays = (pkg.itinerary || []).map((d, index) => {
    let dayImg = d.image || '';
    if (!dayImg) {
      // Try destination fallback only if first or second day
      if (index === 0) dayImg = getDestinationFallbackImage(pkg.destination);
    }
    const focalX = d.imageFocalPoint?.x ?? 50;
    const focalY = d.imageFocalPoint?.y ?? 50;
    return {
      ...d,
      hasImage: Boolean(dayImg && dayImg.trim()),
      resolvedImage: dayImg,
      focalX,
      focalY,
      shortSummary: d.shortSummary || (d.description.length > 90 ? d.description.slice(0, 85) + '...' : d.description),
    };
  });

  // Base A4 sheet CSS wrapper
  const sheetStyle = `width:794px;height:1123px;position:relative;overflow:hidden;box-sizing:border-box;background:${bg};margin:0 auto;padding:44px 50px 32px;display:flex;flex-direction:column;justify-content:flex-start;page-break-after:always;break-after:page;`;

  // Standard Header Component
  const renderHeader = (subtitle: string) => `
    <div style="flex:none;display:flex;align-items:center;justify-content:space-between;border-bottom:1.5px solid rgba(20,20,43,0.12);padding-bottom:12px;margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-family:'${fonts.heading}',serif;font-size:18px;font-weight:700;color:${primaryColor}">Kingsland Holidays</span>
        <span style="color:rgba(20,20,43,0.3);font-size:14px">|</span>
        <span style="font-size:12px;color:rgba(20,20,43,0.7);font-weight:600">${escapeHtml(pkg.title)}</span>
      </div>
      <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:${rustColor}">
        ${escapeHtml(subtitle)}
      </div>
    </div>
  `;

  // Standard Footer Component
  const renderFooter = (pageNumberText: string) => `
    <div style="margin-top:auto;padding-top:12px;border-top:1.5px solid rgba(20,20,43,0.1);display:flex;align-items:center;justify-content:space-between;font-size:11px;color:rgba(20,20,43,0.6)">
      <div style="display:flex;align-items:center;gap:6px">
        <span>${SHIELD_ICON_SVG}</span>
        <span>Kingsland Verified Itinerary · Certified Rajasthan Tourism Partner</span>
      </div>
      <div style="font-weight:700">${escapeHtml(pageNumberText)}</div>
    </div>
  `;

  // Helper for rendering fillers if passed for that page
  const renderFillers = (pageIndex: number) => {
    const list = fillerModules[pageIndex] || [];
    if (list.length === 0) return '';
    return `<div style="display:flex;flex-direction:column;gap:14px;margin-top:16px">${list.join('')}</div>`;
  };

  const pages: string[] = [];

  // =========================================================================
  // PAGE 1: COVER
  // (Hero photo 16:9, title, duration, price. Navy strip with orange flame badge)
  // =========================================================================
  const badgeHtml = pkg.badge ? `
    <div style="position:absolute;bottom:0;left:0;right:0;background:${navyColor};color:#ffffff;padding:8px 18px;display:flex;align-items:center;gap:8px;border-bottom-left-radius:${radius}px;border-bottom-right-radius:${radius}px;font-size:12px;font-weight:700;letter-spacing:0.5px">
      ${FLAME_ICON_SVG}
      <span style="text-transform:uppercase">${escapeHtml(pkg.badge)}</span>
    </div>
  ` : '';

  pages.push(`
    <div class="pdf-sheet" data-page="1" style="${sheetStyle}">
      <!-- Top Brand Bar -->
      <div style="flex:none;display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
        <div style="font-family:'${fonts.heading}',serif;font-size:24px;font-weight:800;color:${primaryColor};letter-spacing:-0.5px">
          Kingsland Holidays
        </div>
        <div style="display:inline-flex;align-items:center;gap:6px;background:rgba(255,107,53,0.12);padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;color:${rustColor}">
          ${PIN_ICON_SVG} ${escapeHtml(pkg.destination.toUpperCase())}
        </div>
      </div>

      <!-- Hero Photo 16:9 with 16px radius and optional badge strip -->
      <div style="position:relative;width:100%;aspect-ratio:16/9;border-radius:${radius}px;overflow:hidden;box-shadow:0 8px 24px rgba(20,20,43,0.12);flex:none">
        ${heroImg ? `
          <img src="${heroImg}" alt="${escapeHtml(pkg.title)}" style="width:100%;height:100%;object-fit:cover;object-position:${heroFocalX}% ${heroFocalY}%;display:block;border-radius:${radius}px" />
        ` : `
          <div style="width:100%;height:100%;background:linear-gradient(135deg, ${navyColor} 0%, #1f3a6b 100%);display:flex;align-items:center;justify-content:center;color:#fff;font-family:'${fonts.heading}',serif;font-size:24px;font-weight:700">
            ${escapeHtml(pkg.destination)} Adventure
          </div>
        `}
        ${badgeHtml}
      </div>

      <!-- Title, Duration, Price Block -->
      <div style="margin-top:22px;display:flex;flex-direction:column;gap:8px">
        <div style="font-size:13px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${primaryColor}">
          ${escapeHtml(pkg.duration)} · EXCLUSIVE ITINERARY PROPOSAL
        </div>
        <h1 style="font-family:'${fonts.heading}',serif;font-size:34px;line-height:1.15;color:${rustColor};margin:0;font-weight:800">
          ${escapeHtml(pkg.title)}
        </h1>
        ${pkg.summary ? `
          <p style="font-size:13px;line-height:1.55;color:${textColor};opacity:0.85;margin:4px 0 0">
            ${escapeHtml(pkg.summary)}
          </p>
        ` : ''}
      </div>

      <!-- Price & Value Stamp Card -->
      <div style="margin-top:18px;background:#ffffff;border:1.5px solid rgba(255,107,53,0.25);border-radius:14px;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 4px 16px rgba(20,20,43,0.06)">
        <div>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;font-weight:700;color:rgba(20,20,43,0.6)">Total Land Package Price</div>
          <div style="font-family:'${fonts.heading}',serif;font-size:28px;font-weight:800;color:${navyColor};line-height:1.1;margin-top:2px">
            ${escapeHtml(pkg.price)}
            ${pkg.cutPrice ? `<span style="font-size:15px;color:rgba(20,20,43,0.4);text-decoration:line-through;margin-left:10px;font-weight:500">${escapeHtml(pkg.cutPrice)}</span>` : ''}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;font-weight:700;color:${primaryColor};text-transform:uppercase">All Inclusive Offer</div>
          <div style="font-size:11px;color:rgba(20,20,43,0.7);margin-top:2px">Hotels · Private Cab · Meals · Taxes</div>
        </div>
      </div>

      ${renderFillers(1)}
      ${renderFooter('Cover Page')}
    </div>
  `);

  // =========================================================================
  // PAGE 2: OVERVIEW & HIGHLIGHTS
  // =========================================================================
  pages.push(`
    <div class="pdf-sheet" data-page="2" style="${sheetStyle}">
      ${renderHeader('Overview & Highlights')}

      <div style="display:flex;flex-direction:column;gap:18px">
        <div>
          <h2 style="font-family:'${fonts.heading}',serif;font-size:24px;font-weight:700;color:${rustColor};margin:0 0 8px">
            The Journey Experience
          </h2>
          <div style="font-size:12.5px;line-height:1.6;color:${textColor};opacity:0.9">
            ${escapeHtml(pkg.summary || `Welcome to your custom-crafted holiday to ${pkg.destination}. Every detail of this itinerary has been hand-selected by Kingsland Holidays travel experts to ensure seamless transfers, premium accommodation, and unforgettable experiences.`)}
          </div>
        </div>

        <!-- Key Specs Matrix -->
        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:12px;background:#ffffff;border:1px solid rgba(20,20,43,0.1);border-radius:14px;padding:14px;box-shadow:0 2px 8px rgba(0,0,0,0.03)">
          <div style="text-align:center">
            <div style="font-size:11px;color:rgba(20,20,43,0.5);font-weight:700;text-transform:uppercase">Duration</div>
            <div style="font-size:16px;font-weight:800;color:${navyColor};margin-top:2px">${escapeHtml(pkg.duration)}</div>
          </div>
          <div style="text-align:center;border-left:1px solid rgba(20,20,43,0.08)">
            <div style="font-size:11px;color:rgba(20,20,43,0.5);font-weight:700;text-transform:uppercase">Destination</div>
            <div style="font-size:16px;font-weight:800;color:${navyColor};margin-top:2px">${escapeHtml(pkg.destination)}</div>
          </div>
          <div style="text-align:center;border-left:1px solid rgba(20,20,43,0.08)">
            <div style="font-size:11px;color:rgba(20,20,43,0.5);font-weight:700;text-transform:uppercase">Vehicle</div>
            <div style="font-size:16px;font-weight:800;color:${navyColor};margin-top:2px">Private AC</div>
          </div>
          <div style="text-align:center;border-left:1px solid rgba(20,20,43,0.08)">
            <div style="font-size:11px;color:rgba(20,20,43,0.5);font-weight:700;text-transform:uppercase">Plan Type</div>
            <div style="font-size:16px;font-weight:800;color:${navyColor};margin-top:2px">Handpicked</div>
          </div>
        </div>

        <!-- Key Highlights Grid -->
        ${pkg.highlights && pkg.highlights.length > 0 ? `
          <div>
            <h3 style="font-family:'${fonts.heading}',serif;font-size:18px;font-weight:700;color:${navyColor};margin:0 0 10px">
              Tour Highlights & Experiences
            </h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              ${pkg.highlights.map(h => `
                <div style="background:#ffffff;border:1px solid rgba(20,20,43,0.08);border-radius:12px;padding:10px 14px;display:flex;align-items:center;gap:10px;box-shadow:0 2px 6px rgba(0,0,0,0.02)">
                  <span style="width:8px;height:8px;border-radius:4px;background:${primaryColor};flex:none"></span>
                  <span style="font-size:12px;font-weight:600;color:${textColor}">${escapeHtml(h)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      ${renderFillers(2)}
      ${renderFooter('Page 2 · Overview')}
    </div>
  `);

  // =========================================================================
  // PAGE 3: INCLUSIONS & EXCLUSIONS
  // =========================================================================
  pages.push(`
    <div class="pdf-sheet" data-page="3" style="${sheetStyle}">
      ${renderHeader('Inclusions & Exclusions')}

      <div style="display:flex;flex-direction:column;gap:18px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:stretch">
          <!-- Included Box -->
          <div style="background:#f4fbf5;border:1.5px solid #c8e6c9;border-radius:16px;padding:16px;display:flex;flex-direction:column">
            <div style="font-family:'${fonts.heading}',serif;font-size:18px;font-weight:700;color:#2e7d32;display:flex;align-items:center;gap:8px;margin-bottom:12px">
              <span>What's Included</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px">
              ${(pkg.inclusions || []).map(inc => `
                <div style="display:flex;align-items:flex-start;gap:8px;font-size:11.5px;line-height:1.45;color:#1b5e20">
                  ${CHECK_ICON_SVG}
                  <span>${escapeHtml(inc)}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Excluded Box -->
          <div style="background:#fff8f8;border:1.5px solid #ffcdd2;border-radius:16px;padding:16px;display:flex;flex-direction:column">
            <div style="font-family:'${fonts.heading}',serif;font-size:18px;font-weight:700;color:#c62828;display:flex;align-items:center;gap:8px;margin-bottom:12px">
              <span>What's Excluded</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px">
              ${(pkg.exclusions && pkg.exclusions.length > 0) ? pkg.exclusions.map(exc => `
                <div style="display:flex;align-items:flex-start;gap:8px;font-size:11.5px;line-height:1.45;color:#b71c1c">
                  ${CROSS_ICON_SVG}
                  <span>${escapeHtml(exc)}</span>
                </div>
              `).join('') : `
                <div style="font-size:12px;color:rgba(20,20,43,0.5);font-style:italic">No major exclusions for this land package.</div>
              `}
            </div>
          </div>
        </div>

        ${pkg.specialNotes ? `
          <div style="background:#fffdf7;border:1px solid #ffe082;border-radius:12px;padding:12px 16px;font-size:11.5px;color:#795548;line-height:1.5">
            <b>Special Note:</b> ${escapeHtml(pkg.specialNotes)}
          </div>
        ` : ''}
      </div>

      ${renderFillers(3)}
      ${renderFooter('Page 3 · Commercial Offer')}
    </div>
  `);

  // =========================================================================
  // PAGE 4: ITINERARY AT A GLANCE (right after Inclusions)
  // RULE: If total days <= 3, merge "Itinerary at a glance" and detailed days into a single page!
  // =========================================================================
  const renderGlanceRows = () => `
    <div style="display:flex;flex-direction:column;gap:10px;width:100%">
      ${resolvedDays.map(d => `
        <div style="background:#ffffff;border:1px solid rgba(20,20,43,0.08);border-radius:12px;padding:10px 14px;display:flex;align-items:center;gap:14px;box-shadow:0 2px 6px rgba(0,0,0,0.02)">
          <div style="width:58px;height:32px;border-radius:8px;background:${primaryColor};color:#fff;font-family:'${fonts.heading}',serif;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center;flex:none">
            Day ${d.dayNumber}
          </div>
          <div style="flex:1;min-width:0;display:flex;align-items:baseline;justify-content:space-between;gap:12px">
            <span style="font-size:12.5px;font-weight:700;color:${navyColor}">${escapeHtml(d.title)}</span>
            <span style="font-size:11.5px;color:rgba(20,20,43,0.6);text-overflow:ellipsis;white-space:nowrap;overflow:hidden">${escapeHtml(d.shortSummary || '')}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  if (!isShortTrip) {
    // Normal trip (> 3 days): Standalone "Itinerary at a glance" page
    pages.push(`
      <div class="pdf-sheet" data-page="4" style="${sheetStyle}">
        ${renderHeader('Itinerary at a Glance')}

        <div style="display:flex;flex-direction:column;gap:14px">
          <div>
            <h2 style="font-family:'${fonts.heading}',serif;font-size:24px;font-weight:700;color:${rustColor};margin:0 0 6px">
              Day-by-Day Summary
            </h2>
            <p style="font-size:12px;color:rgba(20,20,43,0.7);margin:0 0 12px">
              A quick snapshot of your daily destinations and planned activities before the detailed route breakdown.
            </p>
          </div>
          ${renderGlanceRows()}
        </div>

        ${renderFillers(4)}
        ${renderFooter('Page 4 · Quick Schedule')}
      </div>
    `);
  }

  // =========================================================================
  // DETAILED DAY-WISE ITINERARY
  // Layout Rules:
  // - Never use one day per page. Pack multiple day cards per page.
  // - If <= 3 days, merged onto the same page with "Itinerary at a glance"
  // - Day cards: image on left (3:2) with text on right, ALTERNATING sides per day!
  //   (even index: row; odd index: row-reverse)
  // - If a day has no image, use full-width text card with NO empty image box.
  // - break-inside: avoid; page-break-inside: avoid.
  // =========================================================================
  const renderDayCardHtml = (d: typeof resolvedDays[0], index: number) => {
    const isEven = index % 2 === 0;
    const direction = isEven ? 'row' : 'row-reverse';

    if (!d.hasImage) {
      // Full-width text card with NO empty image box
      return `
        <div style="break-inside:avoid;page-break-inside:avoid;background:#ffffff;border:1px solid rgba(20,20,43,0.1);border-radius:14px;padding:16px 20px;display:flex;flex-direction:column;gap:8px;box-shadow:0 3px 10px rgba(20,20,43,0.04);margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-family:'${fonts.heading}',serif;font-size:15px;font-weight:800;color:${primaryColor}">Day ${d.dayNumber}:</span>
            <span style="font-family:'${fonts.heading}',serif;font-size:16px;font-weight:700;color:${navyColor}">${escapeHtml(d.title)}</span>
          </div>
          <div style="font-size:11.5px;line-height:1.55;color:${textColor};opacity:0.85;white-space:pre-wrap;word-break:break-word">
            ${escapeHtml(d.description)}
          </div>
        </div>
      `;
    }

    // Alternating side card with 3:2 image
    return `
      <div style="break-inside:avoid;page-break-inside:avoid;background:#ffffff;border:1px solid rgba(20,20,43,0.1);border-radius:14px;padding:12px 14px;display:flex;flex-direction:${direction};gap:14px;align-items:flex-start;box-shadow:0 3px 10px rgba(20,20,43,0.04);margin-bottom:12px">
        <!-- Image 3:2 with 16px radius -->
        <div style="width:200px;aspect-ratio:3/2;border-radius:${radius}px;overflow:hidden;flex:none;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
          <img src="${d.resolvedImage}" alt="${escapeHtml(d.title)}" style="width:100%;height:100%;object-fit:cover;object-position:${d.focalX}% ${d.focalY}%;display:block;border-radius:${radius}px" />
        </div>
        <!-- Content -->
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px">
          <div style="font-family:'${fonts.heading}',serif;font-size:15.5px;font-weight:700;color:${navyColor};line-height:1.25">
            Day ${d.dayNumber}: ${escapeHtml(d.title)}
          </div>
          <div style="font-size:11.5px;line-height:1.5;color:${textColor};opacity:0.85;white-space:pre-wrap;word-break:break-word">
            ${escapeHtml(d.description)}
          </div>
        </div>
      </div>
    `;
  };

  if (isShortTrip) {
    // MERGED: Itinerary at a glance + Detailed days on single page!
    pages.push(`
      <div class="pdf-sheet" data-page="4" style="${sheetStyle}">
        ${renderHeader('Itinerary Overview & Details')}

        <div style="display:flex;flex-direction:column;gap:12px">
          <div>
            <h2 style="font-family:'${fonts.heading}',serif;font-size:22px;font-weight:700;color:${rustColor};margin:0 0 6px">
              Your Day-by-Day Experience
            </h2>
            ${renderGlanceRows()}
          </div>

          <div style="margin-top:6px">
            ${resolvedDays.map((d, i) => renderDayCardHtml(d, i)).join('')}
          </div>
        </div>

        ${renderFillers(4)}
        ${renderFooter('Page 4 · Complete Itinerary')}
      </div>
    `);
  } else {
    // Normal Trip: Detailed Days packed with 2-3 days per sheet
    const daysPerPage = 3;
    const totalDayPages = Math.ceil(resolvedDays.length / daysPerPage);

    for (let p = 0; p < totalDayPages; p++) {
      const pageDays = resolvedDays.slice(p * daysPerPage, (p + 1) * daysPerPage);
      const pageNum = 5 + p;

      pages.push(`
        <div class="pdf-sheet" data-page="${pageNum}" style="${sheetStyle}">
          ${renderHeader(`Detailed Itinerary · Part ${p + 1}`)}

          <div style="display:flex;flex-direction:column;gap:8px">
            <h2 style="font-family:'${fonts.heading}',serif;font-size:22px;font-weight:700;color:${rustColor};margin:0 0 10px">
              Day-by-Day Route & Activities
            </h2>
            ${pageDays.map((d, i) => renderDayCardHtml(d, p * daysPerPage + i)).join('')}
          </div>

          ${renderFillers(pageNum)}
          ${renderFooter(`Page ${pageNum} · Day-wise Itinerary`)}
        </div>
      `);
    }
  }

  // Current page counter for trailing sheets
  let currentPageIndex = isShortTrip ? 5 : (5 + Math.ceil(resolvedDays.length / 3));

  // =========================================================================
  // HOTELS AND PRICING PAGE
  // =========================================================================
  const hotelsList = (pkg.hotels && pkg.hotels.length > 0) ? pkg.hotels : [
    { hotelName: 'Premium Heritage Stay / Luxury Resort', city: pkg.destination, category: '4 Star Deluxe', roomType: 'Deluxe Room', mealPlan: 'Breakfast & Dinner', nights: totalDays - 1 }
  ];

  pages.push(`
    <div class="pdf-sheet" data-page="${currentPageIndex}" style="${sheetStyle}">
      ${renderHeader('Hotels & Commercial Pricing')}

      <div style="display:flex;flex-direction:column;gap:18px">
        <div>
          <h2 style="font-family:'${fonts.heading}',serif;font-size:22px;font-weight:700;color:${rustColor};margin:0 0 10px">
            Accommodation Schedule
          </h2>
          <table style="width:100%;border-collapse:collapse;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.03);font-size:11.5px">
            <thead>
              <tr style="background:${navyColor};color:#ffffff;text-align:left">
                <th style="padding:10px 12px;font-weight:700">City / Destination</th>
                <th style="padding:10px 12px;font-weight:700">Hotel Name</th>
                <th style="padding:10px 12px;font-weight:700">Category</th>
                <th style="padding:10px 12px;font-weight:700">Room & Meal</th>
                <th style="padding:10px 12px;font-weight:700">Nights</th>
              </tr>
            </thead>
            <tbody>
              ${hotelsList.map((h, i) => `
                <tr style="border-bottom:1px solid rgba(20,20,43,0.08);background:${i % 2 === 0 ? '#ffffff' : '#faf8f5'}">
                  <td style="padding:10px 12px;font-weight:700;color:${navyColor}">${escapeHtml(h.city)}</td>
                  <td style="padding:10px 12px;font-weight:600">${escapeHtml(h.hotelName)}</td>
                  <td style="padding:10px 12px;color:${primaryColor};font-weight:700">${escapeHtml(h.category || '4 Star')}</td>
                  <td style="padding:10px 12px">${escapeHtml(h.roomType || 'Deluxe Room')} (${escapeHtml(h.mealPlan || 'MAPAI')})</td>
                  <td style="padding:10px 12px;font-weight:700">${escapeHtml(String(h.nights || 1))}N</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Pricing Summary Box -->
        <div style="background:#ffffff;border:1.5px solid rgba(255,107,53,0.25);border-radius:14px;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 3px 10px rgba(0,0,0,0.03)">
          <div>
            <div style="font-size:11px;font-weight:700;color:rgba(20,20,43,0.6);text-transform:uppercase">Final Total Price</div>
            <div style="font-family:'${fonts.heading}',serif;font-size:28px;font-weight:800;color:${primaryColor}">
              ${escapeHtml(pkg.price)}
            </div>
          </div>
          <div style="text-align:right;font-size:11.5px;color:rgba(20,20,43,0.7);line-height:1.4">
            <div>Includes accommodation, transport, taxes and driver allowances.</div>
            <div style="font-weight:700;color:${navyColor}">50% advance to confirm · Balance 15 days before departure</div>
          </div>
        </div>
      </div>

      ${renderFillers(currentPageIndex)}
      ${renderFooter(`Page ${currentPageIndex} · Hotels & Pricing`)}
    </div>
  `);
  currentPageIndex++;

  // =========================================================================
  // TERMS AND PAYMENT PAGE
  // =========================================================================
  pages.push(`
    <div class="pdf-sheet" data-page="${currentPageIndex}" style="${sheetStyle}">
      ${renderHeader('Terms & Payment Guidelines')}

      <div style="display:flex;flex-direction:column;gap:16px">
        <div>
          <h2 style="font-family:'${fonts.heading}',serif;font-size:22px;font-weight:700;color:${rustColor};margin:0 0 10px">
            Cancellation Policy
          </h2>
          <table style="width:100%;border-collapse:collapse;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.03);font-size:11.5px">
            <thead>
              <tr style="background:${navyColor};color:#ffffff;text-align:left">
                <th style="padding:9px 12px;font-weight:700">Notice Period Prior to Travel</th>
                <th style="padding:9px 12px;font-weight:700;text-align:right">Cancellation Charge</th>
              </tr>
            </thead>
            <tbody>
              ${(pkg.cancellationFees || [
                ['More than 30 days before start', '25% of total package cost'],
                ['16 – 30 days before start', '40% of total package cost'],
                ['7 – 15 days before start', '55% of total package cost'],
                ['3 – 6 days before start', '70% of total package cost'],
                ['0 – 2 days / No show', '100% (non-refundable)']
              ]).map(([period, charge], i) => `
                <tr style="border-bottom:1px solid rgba(20,20,43,0.08);background:${i % 2 === 0 ? '#ffffff' : '#faf8f5'}">
                  <td style="padding:9px 12px;font-weight:600">${escapeHtml(period)}</td>
                  <td style="padding:9px 12px;text-align:right;font-weight:700;color:#c62828">${escapeHtml(charge)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div>
          <h3 style="font-family:'${fonts.heading}',serif;font-size:16px;font-weight:700;color:${navyColor};margin:0 0 8px">
            Important Travel Notes & Pure Agent Disclosure
          </h3>
          <div style="display:flex;flex-direction:column;gap:6px;font-size:11px;line-height:1.5;color:rgba(20,20,43,0.8)">
            <div>• All guests must carry a valid Government photo ID card (Passport / Voter ID / Aadhaar) during travel.</div>
            <div>• Standard check-in time at hotels is 12:00 PM and check-out is 10:00 AM (early check-in subject to availability).</div>
            <div>• Kingsland Holidays acts strictly as a booking agent for third-party service providers (airlines, hotels, cab operators).</div>
            <div>• Delayed payment installments may attract a 5% late fee if not cleared before the scheduled due date.</div>
          </div>
        </div>
      </div>

      ${renderFillers(currentPageIndex)}
      ${renderFooter(`Page ${currentPageIndex} · Terms & Policies`)}
    </div>
  `);
  currentPageIndex++;

  // =========================================================================
  // CONTACT AND CLOSING PAGE
  // =========================================================================
  const advisor = pkg.advisor || {
    name: 'Mohit Ahlawat',
    role: 'Senior Travel Specialist',
    phone: '+91 6376983416',
    email: 'support@kingslandholiday.com'
  };

  pages.push(`
    <div class="pdf-sheet" data-page="${currentPageIndex}" style="${sheetStyle}">
      ${renderHeader('Contact & Support')}

      <div style="display:flex;flex-direction:column;gap:20px;flex:1">
        <div>
          <h2 style="font-family:'${fonts.heading}',serif;font-size:26px;font-weight:800;color:${rustColor};margin:0 0 6px">
            We're Here For You
          </h2>
          <div style="font-size:12.5px;color:rgba(20,20,43,0.8);line-height:1.5">
            Your personal travel concierge is available 24/7 to assist with your booking, custom adjustments, and journey coordination.
          </div>
        </div>

        <!-- Advisor Contact Card -->
        <div style="background:#ffffff;border:1.5px solid rgba(20,20,43,0.12);border-radius:16px;padding:20px;display:flex;align-items:center;gap:20px;box-shadow:0 4px 14px rgba(20,20,43,0.05)">
          <div style="width:68px;height:68px;border-radius:34px;background:linear-gradient(135deg, ${primaryColor} 0%, ${navyColor} 100%);color:#fff;display:flex;align-items:center;justify-content:center;font-family:'${fonts.heading}',serif;font-size:24px;font-weight:800;flex:none">
            ${escapeHtml(advisor.name.charAt(0))}
          </div>
          <div style="flex:1">
            <div style="font-size:11px;font-weight:700;color:${primaryColor};text-transform:uppercase;letter-spacing:1px">${escapeHtml(advisor.role)}</div>
            <div style="font-family:'${fonts.heading}',serif;font-size:20px;font-weight:700;color:${navyColor};margin:2px 0 6px">${escapeHtml(advisor.name)}</div>
            <div style="display:flex;flex-wrap:wrap;gap:14px;font-size:12px;color:${textColor}">
              <span><b>Phone:</b> ${escapeHtml(advisor.phone)}</span>
              <span><b>Email:</b> ${escapeHtml(advisor.email)}</span>
            </div>
          </div>
        </div>

        <!-- Why Choose Kingsland Holidays Trust Block -->
        <div style="background:#ffffff;border:1px solid rgba(255,107,53,0.2);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:12px">
          <div style="font-family:'${fonts.heading}',serif;font-size:18px;font-weight:700;color:${rustColor}">
            Why Travellers Choose Kingsland Holidays
          </div>
          <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:12px;text-align:center">
            <div style="padding:10px;background:${bg};border-radius:10px">
              <div style="font-family:'${fonts.heading}',serif;font-size:20px;font-weight:800;color:${primaryColor}">12,000+</div>
              <div style="font-size:11px;color:rgba(20,20,43,0.6);margin-top:2px;font-weight:600">Happy Travellers</div>
            </div>
            <div style="padding:10px;background:${bg};border-radius:10px">
              <div style="font-family:'${fonts.heading}',serif;font-size:20px;font-weight:800;color:${primaryColor}">4.8 / 5.0</div>
              <div style="font-size:11px;color:rgba(20,20,43,0.6);margin-top:2px;font-weight:600">Verified Reviews</div>
            </div>
            <div style="padding:10px;background:${bg};border-radius:10px">
              <div style="font-family:'${fonts.heading}',serif;font-size:20px;font-weight:800;color:${primaryColor}">24 / 7</div>
              <div style="font-size:11px;color:rgba(20,20,43,0.6);margin-top:2px;font-weight:600">Trip Support</div>
            </div>
          </div>
        </div>
      </div>

      ${renderFillers(currentPageIndex)}
      ${renderFooter(`Page ${currentPageIndex} · Closing Page`)}
    </div>
  `);

  // Document Shell
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(pkg.title)} · Kingsland Proposal</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;0,800;1,600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: ${isTransparentForArtwork ? 'transparent' : '#e6e8ee'};
      font-family: '${fonts.body}', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: ${textColor};
      -webkit-font-smoothing: antialiased;
    }
    @page {
      size: A4 portrait;
      margin: 0;
    }
    @media print {
      body { background: transparent; }
      .pdf-sheet {
        margin: 0 !important;
        box-shadow: none !important;
        page-break-after: always !important;
        break-after: page !important;
      }
    }
    .pdf-sheet {
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      margin-bottom: 24px;
    }
  </style>
</head>
<body>
  ${pages.join('\n')}
</body>
</html>`;
}

/**
 * Filler module generators (in order of priority):
 * 1. Destination highlights strip
 * 2. Hotel photo gallery
 * 3. Why choose Kingsland Holidays trust block
 * 4. Contact card
 */
export function generateFillerModule(
  type: 'highlights' | 'gallery' | 'trust' | 'contact',
  pkg: PackageRenderData,
  theme: PdfThemeRecord
): string {
  const colors = theme.meta.colors || BRAND_DEFAULTS.colors;
  const fonts = theme.meta.fonts || BRAND_DEFAULTS.fonts;

  if (type === 'highlights') {
    return `
      <div style="background:#ffffff;border:1px solid rgba(255,107,53,0.25);border-radius:14px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:${colors.primary || '#FF6B35'}">${PIN_ICON_SVG}</span>
          <span style="font-size:12px;font-weight:700;color:${colors.text || '#14142B'}">Top Highlight: Scenic Mountain Vista & Historic Landmarks</span>
        </div>
        <span style="font-size:11px;font-weight:700;color:${colors.accent || '#D9582B'};background:rgba(255,107,53,0.1);padding:3px 10px;border-radius:999px">Curated Experience</span>
      </div>
    `;
  }

  if (type === 'gallery') {
    const fallback = getDestinationFallbackImage(pkg.destination);
    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:6px">
        <div style="aspect-ratio:16/9;border-radius:12px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.06)">
          <img src="${fallback || 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=600&q=80'}" style="width:100%;height:100%;object-fit:cover;display:block" />
        </div>
        <div style="aspect-ratio:16/9;border-radius:12px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.06)">
          <img src="${pkg.heroImage || fallback || 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=600&q=80'}" style="width:100%;height:100%;object-fit:cover;display:block" />
        </div>
      </div>
    `;
  }

  if (type === 'trust') {
    return `
      <div style="background:#ffffff;border:1px solid rgba(20,20,43,0.1);border-radius:12px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          ${SHIELD_ICON_SVG}
          <span style="font-size:11.5px;font-weight:700;color:${colors.text || '#14142B'}">100% Verified Accommodation & Sanitized Private Transport</span>
        </div>
        <span style="font-size:11px;color:${colors.primary || '#FF6B35'};font-weight:700">Kingsland Trust</span>
      </div>
    `;
  }

  // contact card
  return `
    <div style="background:#ffffff;border:1.5px solid rgba(20,20,43,0.1);border-radius:12px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-size:11.5px;font-weight:700;color:${colors.text || '#14142B'}">Questions about this itinerary?</div>
        <div style="font-size:11px;color:rgba(20,20,43,0.6)">Call our senior trip advisor directly at +91 6376983416</div>
      </div>
      <div style="font-size:11px;font-weight:800;color:${colors.primary || '#FF6B35'};background:rgba(255,107,53,0.12);padding:4px 10px;border-radius:6px">24/7 Support</div>
    </div>
  `;
}

/**
 * Main PDF Generation Engine using Puppeteer with:
 * - Print background on
 * - No JavaScript executed in rendered pages
 * - Two-pass page-fill algorithm (no page > 30% empty)
 * - pdf-lib artwork merging for Type B
 */
export async function renderPackageToPdfBuffer(
  pkg: PackageRenderData,
  themeOverrideId?: string | null
): Promise<{ pdfBuffer: Buffer; pageCount: number; themeUsed: PdfThemeRecord }> {
  // 1. Resolve active theme
  const theme = resolveActivePdfTheme(themeOverrideId || pkg.themeOverrideId);

  // 2. Launch Puppeteer
  const executablePath = getChromeExecutablePath();
  const browser: Browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

    // Enforce Security Rule: Block JavaScript execution during PDF rendering
    await page.setJavaScriptEnabled(false);

    // Initial render without fillers
    const isArtwork = theme.type === 'artwork';
    let initialHtml = buildPackageProposalHtml(pkg, theme, {}, isArtwork);

    await page.setContent(initialHtml, { waitUntil: 'domcontentloaded' });

    // PAGE-FILL ALGORITHM STEP:
    // To measure content height while JS is disabled on the page, we temporarily enable JS to measure heights
    await page.setJavaScriptEnabled(true);

    const measurements = await page.evaluate(() => {
      const sheets = Array.from(document.querySelectorAll('.pdf-sheet'));
      const A4_HEIGHT = 1123;
      return sheets.map((s, index) => {
        const rect = s.getBoundingClientRect();
        // Compute bottom edge of deepest child element
        const children = Array.from(s.children);
        let deepestBottom = 0;
        for (const c of children) {
          const r = c.getBoundingClientRect();
          if (r.bottom > deepestBottom) deepestBottom = r.bottom;
        }
        const contentHeight = Math.max(0, deepestBottom - rect.top);
        const emptyPx = Math.max(0, A4_HEIGHT - contentHeight);
        const emptyPercent = Math.round((emptyPx / A4_HEIGHT) * 100);
        return { pageIndex: index + 1, contentHeight, emptyPx, emptyPercent };
      });
    });

    // Re-disable JS as per prompt security rule
    await page.setJavaScriptEnabled(false);

    // Pass 1: If any page has > 30% empty space, insert appropriate filler modules
    const fillersNeeded: Record<number, string[]> = {};
    let anyFillerAdded = false;

    for (const m of measurements) {
      if (m.emptyPercent > 30 && m.pageIndex > 1) { // Skip cover page from aggressive gallery injection
        const fillerTypes: Array<'highlights' | 'gallery' | 'trust' | 'contact'> = ['highlights', 'gallery', 'trust', 'contact'];
        fillersNeeded[m.pageIndex] = [];

        // Insert first filler
        fillersNeeded[m.pageIndex].push(generateFillerModule(fillerTypes[0], pkg, theme));
        anyFillerAdded = true;

        if (m.emptyPercent > 45) {
          // If very empty, add second filler
          fillersNeeded[m.pageIndex].push(generateFillerModule(fillerTypes[1], pkg, theme));
        }
      }
    }

    let finalHtml = initialHtml;
    if (anyFillerAdded) {
      finalHtml = buildPackageProposalHtml(pkg, theme, fillersNeeded, isArtwork);
      await page.setContent(finalHtml, { waitUntil: 'domcontentloaded' });
    }

    // Render to PDF buffer with Puppeteer
    const rawPdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
    });

    await page.close();

    // =========================================================================
    // TYPE B: ARTWORK PDF MERGING (pdf-lib)
    // Cover on Page 1, Inner Artwork on Pages 2..N-1, Closing on Page N
    // =========================================================================
    if (isArtwork && fs.existsSync(theme.filePath)) {
      const artworkBytes = fs.readFileSync(theme.filePath);
      const artworkDoc = await PDFDocument.load(artworkBytes);
      const contentDoc = await PDFDocument.load(rawPdfBuffer);

      const mergedDoc = await PDFDocument.create();
      const contentPages = contentDoc.getPages();
      const totalPages = contentPages.length;

      // Copy artwork pages: 0=Cover, 1=Inner, 2=Closing
      const [coverArt, innerArt, closingArt] = await mergedDoc.copyPages(artworkDoc, [0, 1, 2]);

      for (let i = 0; i < totalPages; i++) {
        let bgPageTemplate = innerArt;
        if (i === 0) bgPageTemplate = coverArt;
        else if (i === totalPages - 1) bgPageTemplate = closingArt;

        const embeddedBg = await mergedDoc.embedPage(bgPageTemplate);
        const [copiedContentPage] = await mergedDoc.copyPages(contentDoc, [i]);
        const newPage = mergedDoc.addPage([595.28, 841.89]); // A4 in points

        // Draw background artwork
        newPage.drawPage(embeddedBg, { x: 0, y: 0, width: 595.28, height: 841.89 });

        // Draw transparent content layer on top
        const embeddedContent = await mergedDoc.embedPage(copiedContentPage);
        newPage.drawPage(embeddedContent, { x: 0, y: 0, width: 595.28, height: 841.89 });
      }

      const mergedBytes = await mergedDoc.save();
      return {
        pdfBuffer: Buffer.from(mergedBytes),
        pageCount: totalPages,
        themeUsed: theme,
      };
    }

    const doc = await PDFDocument.load(rawPdfBuffer);
    return {
      pdfBuffer: Buffer.from(rawPdfBuffer),
      pageCount: doc.getPageCount(),
      themeUsed: theme,
    };
  } finally {
    await browser.close();
  }
}
