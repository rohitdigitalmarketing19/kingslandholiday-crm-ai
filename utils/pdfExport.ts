import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PdfExportOptions {
  filename?: string;
  margin?: number; // margin in mm (default 0 for sheet designs, 8mm for generic continuous pages)
  width?: number;  // container width in px (default 794px = A4 at 96dpi)
  scale?: number;  // canvas resolution multiplier (default 2)
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

  // Check if this container contains discrete sheet pages
  const directSheets = Array.from(element.querySelectorAll<HTMLElement>('.sheet, .pdf-page'));
  const isSheetBased = directSheets.length > 0;

  // ── 1. Off-screen container ──────────────────────────────────────────────
  const container = document.createElement('div');
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

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.cssText = `
    width: ${width}px;
    min-width: ${width}px;
    max-width: ${width}px;
    box-sizing: border-box;
    background-color: #ffffff;
    margin: 0; padding: 0;
  `;
  container.appendChild(clone);

  // ── 2. Inject break-inside:avoid + style reset ────────────────────────────
  const breakStyle = document.createElement('style');
  breakStyle.textContent = `
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
  container.appendChild(breakStyle);
  document.body.appendChild(container);

  const h2cFix = document.createElement('style');
  h2cFix.setAttribute('data-h2c-fix', '1');
  h2cFix.textContent =
    'body > div[style*="visibility: hidden"] > img { display: inline-block !important; }';
  document.head.appendChild(h2cFix);

  // Wait for layout and web fonts to settle
  await new Promise(resolve => setTimeout(resolve, 120));

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfW = pdf.internal.pageSize.getWidth();  // 210 mm
    const pdfH = pdf.internal.pageSize.getHeight(); // 297 mm

    // ── CASE A: Sheet-based multi-page export ──────────────────────────────
    const foundSheets = Array.from(clone.querySelectorAll<HTMLElement>('.sheet, .pdf-page'));
    if (isSheetBased && foundSheets.length > 0) {
      // Remove stacked container as we will render each sheet in a dedicated isolated frame
      document.body.removeChild(container);

      // Create a single-sheet dedicated capture frame at exact (0, 0)
      const isolatedFrame = document.createElement('div');
      isolatedFrame.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
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
        margin: 0;
        padding: 0;
      `;
      isolatedFrame.appendChild(breakStyle);
      document.body.appendChild(isolatedFrame);

      try {
        for (let i = 0; i < foundSheets.length; i++) {
          const sheetEl = foundSheets[i];
          if (i > 0) pdf.addPage();

          // Clone this single sheet and clean outer styling
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

          // Mount into isolated frame
          isolatedFrame.appendChild(singleSheetClone);

          // Wait for images and fonts in this sheet
          const sheetImgs = Array.from(singleSheetClone.querySelectorAll('img'));
          await Promise.all(
            sheetImgs.map(img => {
              if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
              return new Promise(res => {
                img.onload = () => res(null);
                img.onerror = () => res(null);
                setTimeout(res, 400); // safety fallback timeout
              });
            })
          );
          if (document.fonts) {
            await document.fonts.ready;
          }
          await new Promise(r => setTimeout(r, 60));

          const canvas = await html2canvas(singleSheetClone, {
            scale,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            width,
            height: 1123,
            windowWidth: width,
            windowHeight: 1123,
            x: 0,
            y: 0,
            scrollX: 0,
            scrollY: 0,
            allowTaint: false,
          });

          // Unmount current sheet clone
          isolatedFrame.removeChild(singleSheetClone);

          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH, undefined, 'FAST');
        }
      } finally {
        if (isolatedFrame.parentNode) {
          document.body.removeChild(isolatedFrame);
        }
      }
    } else {
      // ── CASE B: Continuous flow with Smart Section Break detection ─────────
      const effectiveMargin = options.margin !== undefined ? options.margin : 8;
      const printW = pdfW - effectiveMargin * 2;
      const printH = pdfH - effectiveMargin * 2;

      // Capture high-resolution full canvas
      const canvas = await html2canvas(container, {
        scale,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width,
        windowWidth: width,
        scrollX: 0,
        scrollY: 0,
        allowTaint: false,
      });

      // Target page height in canvas pixels
      const standardPageCanvasH = Math.floor((canvas.width * printH) / printW);

      // Collect bounding rects of all section blocks in the cloned DOM
      const containerRect = clone.getBoundingClientRect();
      const breakableElements = Array.from(
        clone.querySelectorAll<HTMLElement>(
          '.avoid-page-break, .day, .hrow, .hstays, .box, .two-col, .quotebox, .meta-strip, .trust-strip, .partners, .signblock, .footer, tr, section'
        )
      );

      // Map to canvas Y-coordinates
      const elementBoxes = breakableElements.map(el => {
        const r = el.getBoundingClientRect();
        const topY = Math.max(0, Math.round((r.top - containerRect.top) * scale));
        const bottomY = Math.round((r.bottom - containerRect.top) * scale);
        return { topY, bottomY, height: bottomY - topY };
      }).filter(b => b.height > 0 && b.topY < canvas.height);

      let currentStartY = 0;
      let pageIndex = 0;

      while (currentStartY < canvas.height) {
        if (pageIndex > 0) pdf.addPage();

        let targetEndY = currentStartY + standardPageCanvasH;

        if (targetEndY < canvas.height) {
          // Check if any element straddles the boundary: top < targetEndY and bottom > targetEndY
          const straddling = elementBoxes.find(b =>
            b.topY < targetEndY &&
            b.bottomY > targetEndY &&
            b.topY > currentStartY && // Started on this page
            (targetEndY - b.topY) > 10 // More than 10px cut off
          );

          if (straddling) {
            // Push the page cutoff up so the entire section goes to the next page
            targetEndY = straddling.topY;
          }
        }

        const sliceH = Math.min(targetEndY - currentStartY, canvas.height - currentStartY);

        // Prepare page-sized canvas filled with white
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = standardPageCanvasH;

        const ctx = pageCanvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

        // Draw the cleanly sliced slice
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

    const finalName = filename.toLowerCase().endsWith('.pdf')
      ? filename
      : `${filename}.pdf`;
    await pdf.save(finalName, { returnPromise: true });

  } finally {
    h2cFix.remove();
    if (container.parentNode) container.parentNode.removeChild(container);
  }
}
