import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PdfExportOptions {
  filename?: string;
  margin?: number; // margin in mm (default 8mm)
  width?: number;  // container width in px (default 794px = A4 at 96dpi)
  scale?: number;  // canvas resolution multiplier (default 2)
}

/**
 * High-fidelity, gap-free PDF generator.
 *
 * Strategy:
 *  1. Clone the element into an off-screen fixed container (no DOM spacers).
 *  2. Inject a <style> that marks key sections as break-inside:avoid so
 *     html2canvas renders them as complete blocks.
 *  3. Capture one tall canvas at 2× resolution.
 *  4. Slice the canvas into exact A4 page heights.
 *  5. For each page slice, fill a new canvas with white then blit the slice.
 *     This guarantees NO blank white gaps — the white fill is the background,
 *     not an empty spacer void.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  options: PdfExportOptions = {}
): Promise<void> {
  const {
    filename = 'document.pdf',
    margin = 8,
    width = 794,
    scale = 2,
  } = options;

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

  // ── 2. Inject break-inside:avoid + dark-mode neutralizer ─────────────────
  const breakStyle = document.createElement('style');
  breakStyle.textContent = `
    /* Page-break control */
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

    /* ── Dark-mode neutralizer ──────────────────────────────────────────────
       html.dark global rules can still affect elements appended to body.
       Force all document-style content to white background + dark text.     */
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-scheme: light !important;
    }
    /* Reset any dark-mode tailwind overrides that affect bg/text */
    [class*="bg-slate-900"],
    [class*="bg-zinc-900"],
    [class*="bg-zinc-950"],
    [class*="dark:bg-"] {
      background-color: #ffffff !important;
    }
    [class*="text-zinc-100"],
    [class*="text-zinc-200"],
    [class*="text-zinc-300"],
    [class*="dark:text-"] {
      color: #0f172a !important;
    }
    /* Ensure the root document container always renders white */
    div, section, article, header, footer, table, td, th, tr, p, span, li {
      background-color: transparent;
    }
  `;
  container.appendChild(breakStyle);

  document.body.appendChild(container);

  // Short settle time for layout & fonts
  await new Promise(resolve => setTimeout(resolve, 80));

  try {
    // ── 3. Capture full-height canvas ─────────────────────────────────────
    const canvas = await html2canvas(container, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width,
      windowWidth: width,
      scrollX: 0,
      scrollY: 0,
      // Do NOT use foreignObjectRendering — it causes blank areas in some browsers
      allowTaint: false,
    });

    // ── 4. Build A4 PDF, slicing the canvas page by page ─────────────────
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfW  = pdf.internal.pageSize.getWidth();  // 210 mm
    const pdfH  = pdf.internal.pageSize.getHeight(); // 297 mm
    const printW = pdfW - margin * 2;
    const printH = pdfH - margin * 2;

    // How many canvas pixels correspond to one PDF page height?
    // canvas.width corresponds to printW (mm) → 1 mm = canvas.width / printW px
    const canvasPageH = Math.floor((canvas.width * printH) / printW);
    const totalPages  = Math.max(1, Math.ceil(canvas.height / canvasPageH));

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();

      const srcY = page * canvasPageH;
      const srcH = Math.min(canvasPageH, canvas.height - srcY);

      // Create a page-sized canvas and fill it white first
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width  = canvas.width;
      pageCanvas.height = canvasPageH; // always full page height

      const ctx = pageCanvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

      // Blit only the real content rows into this page canvas
      ctx.drawImage(
        canvas,
        0, srcY, canvas.width, srcH,  // source rect
        0, 0,    canvas.width, srcH   // dest rect (same size, top-aligned)
      );
      // Remaining pixels below srcH stay white — no gap, no black bar

      const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', margin, margin, printW, printH, undefined, 'FAST');
    }

    const finalName = filename.toLowerCase().endsWith('.pdf')
      ? filename
      : `${filename}.pdf`;
    await pdf.save(finalName, { returnPromise: true });

  } finally {
    if (container.parentNode) container.parentNode.removeChild(container);
  }
}
