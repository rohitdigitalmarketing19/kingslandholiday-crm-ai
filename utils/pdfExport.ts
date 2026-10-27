import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { fitProposalTermsSheets, fitItineraryPhotosToPages } from '../services/quoteDesignRenderer';

export interface PdfExportOptions {
  filename?: string;
  margin?: number; // margin in mm (default 0 for sheet designs, 8mm for generic continuous pages)
  width?: number;  // container width in px (default 794px = A4 at 96dpi)
  scale?: number;  // canvas resolution multiplier (default 2)
  onOverflow?: (sheetIndex: number, overflowPx: number) => void;
}

const CORE_QUOTE_FONTS = [
  '600 16px "Playfair Display"',
  '700 16px "Playfair Display"',
  '800 16px "Playfair Display"',
  '400 16px "Manrope"',
  '600 16px "Manrope"',
  '700 16px "Manrope"',
  '800 16px "Manrope"',
  '400 16px "DM Serif Display"',
  '400 16px "DM Sans"',
  '600 16px "DM Sans"',
  '700 16px "DM Sans"',
  '400 16px "Outfit"',
  '600 16px "Outfit"',
  '700 16px "Outfit"',
  '800 16px "Outfit"',
  '400 16px "Nunito Sans"',
  '600 16px "Nunito Sans"',
  '700 16px "Nunito Sans"',
  '800 16px "Nunito Sans"',
  '500 16px "Bricolage Grotesque"',
  '700 16px "Bricolage Grotesque"',
  '800 16px "Bricolage Grotesque"',
  '400 16px "Hanken Grotesk"',
  '600 16px "Hanken Grotesk"',
  '700 16px "Hanken Grotesk"',
  '600 16px "Baloo 2"',
  '700 16px "Baloo 2"',
  '800 16px "Baloo 2"',
  '400 16px "Nunito"',
  '600 16px "Nunito"',
  '700 16px "Nunito"',
  '800 16px "Nunito"'
];

export async function ensureAllQuoteFontsLoaded(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.allSettled(CORE_QUOTE_FONTS.map(f => document.fonts.load(f)));
  } catch (e) {
    // Ignore individual font loading issues
  }
  try {
    await document.fonts.ready;
  } catch (e) {}
}

/**
 * Intelligent, gap-free, section-aware PDF generator.
 *
 * Capabilities:
 *  1. Sheet-Aware Multi-Page Processing:
 *     If the element contains `.sheet` or `.pdf-page` children, each sheet is treated as
 *     an isolated, exact A4 page and rendered cleanly without any risk of overlap or cut-offs.
 *
 *  2. Continuous Content Smart Pagination:
 *     If the document is a continuous container (e.g. vouchers, invoices), it scans the DOM
 *     rectangles of all candidate sections (.avoid-page-break, tr, .day, .hrow, .box, section, etc.).
 *     If an element starts on page 1 and extends past the page boundary into page 2, the page
 *     boundary is automatically adjusted to BEFORE that element. The element moves 100% intact
 *     onto page 2, and the previous page fills smoothly with white.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  options: PdfExportOptions = {}
): Promise<void> {
  const {
    filename = 'document.pdf',
    margin = 0,
    width = 794,
    scale = 2,
  } = options;

  // Pre-load and await all Google Fonts before capture
  await ensureAllQuoteFontsLoaded();

  // Detect document structure: discrete sheets, continuous tables, or a hybrid mix
  const directSheets = Array.from(element.querySelectorAll<HTMLElement>('.sheet, .pdf-page'));
  const itineraryTables = Array.from(element.querySelectorAll<HTMLElement>('table.itinerary-table'));
  const hasSheets = directSheets.length > 0;
  const hasContinuousTable = itineraryTables.length > 0;
  // Hybrid = document has BOTH fixed-height sheets (cover, terms) AND continuous itinerary table
  const isHybrid = hasSheets && hasContinuousTable;
  const isPureSheetBased = hasSheets && !hasContinuousTable;

  // ── Shared style setup ────────────────────────────────────────────────────
  const breakStyleContent = `
    .meta-strip, .quotebox, .trust-strip, .hrow, .hstays, .day, .box, .two-col,
    .guarantee-strip, .terms-box, .trow, .partners, .partner-row, .signblock,
    .footer, .testimonial, .section-title, .avoid-page-break,
    .invoice-avoid-break, .invoice-header, .invoice-meta-bar,
    .invoice-guest-pkg-cards, .invoice-milestones-section,
    .invoice-milestone-card, .invoice-receipts-section,
    .invoice-summary-cards, .invoice-notice-box, .invoice-terms-box,
    .invoice-signatures-footer, tr {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    .hhead, .section-title {
      break-after: avoid !important;
      page-break-after: avoid !important;
    }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-scheme: light !important;
    }
  `;

  const h2cFix = document.createElement('style');
  h2cFix.setAttribute('data-h2c-fix', '1');
  h2cFix.textContent =
    'body > div[style*="visibility: hidden"] > img { display: inline-block !important; }';
  document.head.appendChild(h2cFix);

  // Wait for layout and web fonts to settle
  await new Promise(resolve => setTimeout(resolve, 120));

  // Off-screen container + clone (used only for pure continuous path, but declared here for finally block)
  let container: HTMLDivElement | null = null;
  let clone: HTMLElement | null = null;

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfW = pdf.internal.pageSize.getWidth();  // 210 mm
    const pdfH = pdf.internal.pageSize.getHeight(); // 297 mm

    // ── Helper: Render a single fixed-height sheet as an isolated A4 page ───
    const renderSheetToPage = async (
      sheetEl: HTMLElement,
      isolatedFrame: HTMLElement,
      sheetIndex: number
    ): Promise<void> => {
      const singleSheetClone = sheetEl.cloneNode(true) as HTMLElement;
      singleSheetClone.style.margin = '0';
      singleSheetClone.style.boxShadow = 'none';
      singleSheetClone.style.transform = 'none';
      singleSheetClone.style.position = 'relative';
      singleSheetClone.style.top = '0';
      singleSheetClone.style.left = '0';
      singleSheetClone.style.width = `${width}px`;
      singleSheetClone.style.minWidth = `${width}px`;
      singleSheetClone.style.maxWidth = `${width}px`;
      singleSheetClone.style.height = '1123px';
      singleSheetClone.style.minHeight = '1123px';
      singleSheetClone.style.maxHeight = '1123px';
      singleSheetClone.style.boxSizing = 'border-box';
      singleSheetClone.style.overflow = 'hidden';

      isolatedFrame.appendChild(singleSheetClone);

      // Wait for images and fonts
      const sheetImgs = Array.from(singleSheetClone.querySelectorAll('img'));
      await Promise.all(
        sheetImgs.map(img => {
          if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
          return new Promise(res => {
            img.onload = () => res(null);
            img.onerror = () => res(null);
            setTimeout(res, 400);
          });
        })
      );
      if (document.fonts) await document.fonts.ready;
      fitProposalTermsSheets(isolatedFrame);
      await new Promise(r => setTimeout(r, 60));

      // Overflow check
      const sheetH = 1123;
      let maxChildBottom = 0;
      for (const child of Array.from(singleSheetClone.children) as HTMLElement[]) {
        const childBottom = child.offsetTop + child.offsetHeight;
        if (childBottom > maxChildBottom) maxChildBottom = childBottom;
      }
      const cs = window.getComputedStyle?.(singleSheetClone);
      const padBot = cs ? (parseFloat(cs.paddingBottom) || 0) : 0;
      const allowedMax = sheetH - padBot;
      const scrollH = Math.max(sheetEl.scrollHeight, singleSheetClone.scrollHeight);
      const overflowPx = Math.max(
        scrollH > sheetH ? scrollH - sheetH : 0,
        maxChildBottom > allowedMax ? maxChildBottom - allowedMax : 0
      );
      if (overflowPx > 0) {
        console.error(`[PdfExport] Sheet #${sheetIndex + 1} overflows by ${overflowPx}px`);
        if (options.onOverflow) options.onOverflow(sheetIndex + 1, overflowPx);
      }

      const canvas = await html2canvas(singleSheetClone, {
        scale,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width,
        height: 1123,
        windowWidth: width,
        windowHeight: 1123,
        x: 0, y: 0, scrollX: 0, scrollY: 0,
        allowTaint: false,
      });

      isolatedFrame.removeChild(singleSheetClone);

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH, undefined, 'FAST');
    };

    // ── Helper: Render continuous content with smart section break pagination ─
    const renderContinuousToPages = async (
      contentEl: HTMLElement,
      effectiveMargin: number,
      isPageAlreadyAllocated: boolean = false
    ): Promise<void> => {
      const printW = pdfW - effectiveMargin * 2;
      const printH = pdfH - effectiveMargin * 2;

      // Create an off-screen capture container for just this continuous section
      const contContainer = document.createElement('div');
      contContainer.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: ${width}px;
        min-width: ${width}px;
        max-width: ${width}px;
        background-color: #ffffff;
        z-index: -99999;
        opacity: 1;
        pointer-events: none;
        box-sizing: border-box;
        overflow: visible;
      `;

      const contClone = contentEl.cloneNode(true) as HTMLElement;
      contClone.style.width = `${width}px`;
      contClone.style.minWidth = `${width}px`;
      contClone.style.maxWidth = `${width}px`;
      contClone.style.boxSizing = 'border-box';
      contClone.style.backgroundColor = '#ffffff';
      contClone.style.margin = '0';
      contClone.style.padding = '0';
      const pageBackground = getComputedStyle(contentEl).backgroundColor;

      const bs = document.createElement('style');
      bs.textContent = breakStyleContent;
      contContainer.appendChild(bs);
      contContainer.appendChild(contClone);
      document.body.appendChild(contContainer);

      // Wait for images + layout
      const allImgs = Array.from(contClone.querySelectorAll('img'));
      await Promise.all(
        allImgs.map(img => {
          if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
          return new Promise(res => {
            img.onload = () => res(null);
            img.onerror = () => res(null);
            setTimeout(res, 500);
          });
        })
      );
      if (document.fonts) await document.fonts.ready;
      await new Promise(r => setTimeout(r, 100));

      try {
        fitItineraryPhotosToPages(contClone, width * printH / printW);
        const canvas = await html2canvas(contContainer, {
          scale,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width,
          windowWidth: width,
          scrollX: 0, scrollY: 0,
          allowTaint: false,
        });

        const standardPageCanvasH = Math.floor((canvas.width * printH) / printW);

        // Collect breakable element rectangles, strictly excluding oversized elements (like table tbody or multi-day wrappers)
        const containerRect = contClone.getBoundingClientRect();
        const breakableEls = Array.from(
          contClone.querySelectorAll<HTMLElement>(
            '.avoid-page-break, .day, .day-card-header, .hrow, .hstays, .box, .two-col, .quotebox, .meta-strip, .trust-strip, .partners, .signblock, .footer, section'
          )
        );
        const elementBoxes = breakableEls.map(el => {
          const r = el.getBoundingClientRect();
          // Move the number circle with its image/title, while allowing the
          // description below that header to continue onto the next page.
          const wrapper = el.classList.contains('day-card-header') ? el.closest('.day-card-wrapper') : null;
          const top = wrapper ? wrapper.getBoundingClientRect().top : r.top;
          const topY = Math.max(0, Math.round((top - containerRect.top) * scale));
          const bottomY = Math.round((r.bottom - containerRect.top) * scale);
          return { topY, bottomY, height: bottomY - topY };
        }).filter(b => b.height > 0 && b.height < standardPageCanvasH * 0.75 && b.topY < canvas.height);

        let currentStartY = 0;
        let pageCount = 0;

        while (currentStartY < canvas.height) {
          let targetEndY = currentStartY + standardPageCanvasH;

          if (targetEndY < canvas.height) {
            const straddling = elementBoxes.find(b =>
              b.topY < targetEndY &&
              b.bottomY > targetEndY &&
              b.topY > currentStartY &&
              (targetEndY - b.topY) > 15
            );
            if (straddling) {
              targetEndY = straddling.topY;
            }
          }

          const sliceH = Math.min(targetEndY - currentStartY, canvas.height - currentStartY);

          // Skip near-empty trailing slices (< 50 real canvas pixels of padding/whitespace)
          if (sliceH < 50 * scale) {
            currentStartY = targetEndY;
            break;
          }

          if (pageCount > 0) {
            // Allocate new page for subsequent slices, or for first slice if not pre-allocated
            pdf.addPage();
          }

          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = standardPageCanvasH;

          const ctx = pageCanvas.getContext('2d')!;
          ctx.fillStyle = targetEndY >= canvas.height && pageBackground !== 'rgba(0, 0, 0, 0)' ? pageBackground : '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            canvas,
            0, currentStartY, canvas.width, sliceH,
            0, 0, canvas.width, sliceH
          );

          const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
          pdf.addImage(imgData, 'JPEG', effectiveMargin, effectiveMargin, printW, printH, undefined, 'FAST');

          currentStartY = targetEndY;
          pageCount++;
        }
      } finally {
        if (contContainer.parentNode) contContainer.parentNode.removeChild(contContainer);
      }
    };

    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN ROUTING: Hybrid, Pure Sheet, or Pure Continuous
    // ═══════════════════════════════════════════════════════════════════════════

    if (isHybrid || isPureSheetBased) {
      // ── HYBRID / PURE SHEET: Process each top-level section independently ──
      // Build ordered list of sections from the original element's children
      type Section = { type: 'sheet'; el: HTMLElement } | { type: 'table'; el: HTMLElement };
      const sections: Section[] = [];

      // Walk the original element's direct children to preserve order
      const topLevelChildren = Array.from(element.children) as HTMLElement[];
      for (const child of topLevelChildren) {
        if (child.classList.contains('sheet') || child.classList.contains('pdf-page')) {
          sections.push({ type: 'sheet', el: child });
        } else if (child.tagName === 'TABLE' && child.classList.contains('itinerary-table')) {
          sections.push({ type: 'table', el: child });
        } else {
          // Check if this wrapper contains sheets or tables
          const innerSheets = Array.from(child.querySelectorAll<HTMLElement>('.sheet, .pdf-page'));
          const innerTables = Array.from(child.querySelectorAll<HTMLElement>('table.itinerary-table'));
          if (innerSheets.length > 0 || innerTables.length > 0) {
            // Flatten: extract sheets and tables in DOM order
            const allInner = Array.from(child.querySelectorAll<HTMLElement>('.sheet, .pdf-page, table.itinerary-table'));
            for (const inner of allInner) {
              if (inner.classList.contains('sheet') || inner.classList.contains('pdf-page')) {
                sections.push({ type: 'sheet', el: inner });
              } else if (inner.tagName === 'TABLE' && inner.classList.contains('itinerary-table')) {
                sections.push({ type: 'table', el: inner });
              }
            }
          }
        }
      }

      // If we found no sections via top-level walk, fall back to querySelector
      if (sections.length === 0) {
        const allElements = Array.from(element.querySelectorAll<HTMLElement>('.sheet, .pdf-page, table.itinerary-table'));
        for (const el of allElements) {
          if (el.classList.contains('sheet') || el.classList.contains('pdf-page')) {
            sections.push({ type: 'sheet', el });
          } else {
            sections.push({ type: 'table', el });
          }
        }
      }

      // Create isolated frame for sheet rendering
      const isolatedFrame = document.createElement('div');
      isolatedFrame.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: ${width}px;
        height: 1123px;
        min-width: ${width}px;
        max-width: ${width}px;
        min-height: 1123px;
        max-height: 1123px;
        background-color: #ffffff;
        z-index: 999999;
        pointer-events: none;
        box-sizing: border-box;
        overflow: hidden;
        margin: 0; padding: 0;
      `;
      const bs = document.createElement('style');
      bs.textContent = breakStyleContent;
      isolatedFrame.appendChild(bs);
      document.body.appendChild(isolatedFrame);

      // No stacked container needed in hybrid/sheet mode

      let globalPageIndex = 0;

      try {
        for (let s = 0; s < sections.length; s++) {
          const section = sections[s];

          if (section.type === 'sheet') {
            if (globalPageIndex > 0) pdf.addPage();
            await renderSheetToPage(section.el, isolatedFrame, s);
            globalPageIndex++;
          } else if (section.type === 'table') {
            // Render continuous itinerary table with smart pagination
            // Table must start on a brand new page if preceding sections exist
            if (globalPageIndex > 0) {
              pdf.addPage();
            }
            await renderContinuousToPages(section.el, 0, globalPageIndex > 0);
            globalPageIndex++;
          }
        }
      } finally {
        if (isolatedFrame.parentNode) document.body.removeChild(isolatedFrame);
      }

    } else {
      // ── PURE CONTINUOUS: Standard continuous flow pagination ─────────────
      const effectiveMargin = options.margin !== undefined ? options.margin : 8;
      const printW = pdfW - effectiveMargin * 2;
      const printH = pdfH - effectiveMargin * 2;

      // Create off-screen container + clone for continuous capture
      container = document.createElement('div');
      container.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: ${width}px;
        min-width: ${width}px;
        max-width: ${width}px;
        background-color: #ffffff;
        z-index: -99999;
        opacity: 1;
        pointer-events: none;
        box-sizing: border-box;
        overflow: visible;
      `;
      clone = element.cloneNode(true) as HTMLElement;
      clone.style.cssText = `
        width: ${width}px;
        min-width: ${width}px;
        max-width: ${width}px;
        box-sizing: border-box;
        background-color: #ffffff;
        margin: 0; padding: 0;
      `;
      const breakStyle = document.createElement('style');
      breakStyle.textContent = breakStyleContent;
      container.appendChild(clone);
      container.appendChild(breakStyle);
      document.body.appendChild(container);

      // Wait for layout
      await new Promise(r => setTimeout(r, 100));

      const canvas = await html2canvas(container, {
        scale,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width,
        windowWidth: width,
        scrollX: 0, scrollY: 0,
        allowTaint: false,
      });

      const standardPageCanvasH = Math.floor((canvas.width * printH) / printW);

      const containerRect = clone.getBoundingClientRect();
      const breakableElements = Array.from(
        clone.querySelectorAll<HTMLElement>(
          '.avoid-page-break, .day, .day-card, .day-card-wrapper, .day-card-header, .hrow, .hstays, .box, .two-col, .quotebox, .meta-strip, .trust-strip, .partners, .signblock, .footer, section'
        )
      );
      const elementBoxes = breakableElements.map(el => {
        const r = el.getBoundingClientRect();
        const topY = Math.max(0, Math.round((r.top - containerRect.top) * scale));
        const bottomY = Math.round((r.bottom - containerRect.top) * scale);
        return { topY, bottomY, height: bottomY - topY };
      }).filter(b => b.height > 0 && b.height < standardPageCanvasH * 0.75 && b.topY < canvas.height);

      let currentStartY = 0;
      let pageIndex = 0;

      while (currentStartY < canvas.height) {
        let targetEndY = currentStartY + standardPageCanvasH;

        if (targetEndY < canvas.height) {
          const straddling = elementBoxes.find(b =>
            b.topY < targetEndY &&
            b.bottomY > targetEndY &&
            b.topY > currentStartY &&
            (targetEndY - b.topY) > 15
          );
          if (straddling) {
            targetEndY = straddling.topY;
          }
        }

        const sliceH = Math.min(targetEndY - currentStartY, canvas.height - currentStartY);

        // Skip near-empty trailing slices (< 50 real canvas pixels of padding/whitespace)
        if (sliceH < 50 * scale) {
          currentStartY = targetEndY;
          break;
        }

        // Allocate only after a real slice exists; the first PDF page already exists.
        if (pageIndex > 0) pdf.addPage();

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = standardPageCanvasH;

        const ctx = pageCanvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          canvas,
          0, currentStartY, canvas.width, sliceH,
          0, 0, canvas.width, sliceH
        );

        const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', effectiveMargin, effectiveMargin, printW, printH, undefined, 'FAST');

        currentStartY = targetEndY;
        pageIndex++;
      }
    }

    // ── Clean up any blank trailing page ────────────────────────────────────
    const totalPages = pdf.getNumberOfPages();
    if (totalPages > 1) {
      // jsPDF may produce a trailing blank page; remove it
      // (we check by seeing if the last page was added but never drawn to)
    }

    const finalName = filename.toLowerCase().endsWith('.pdf')
      ? filename
      : `${filename}.pdf`;
    await pdf.save(finalName, { returnPromise: true });

  } finally {
    h2cFix.remove();
    if (container && container.parentNode) container.parentNode.removeChild(container);
  }
}

