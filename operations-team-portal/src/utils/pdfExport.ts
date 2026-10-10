import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PdfExportOptions {
  filename?: string;
  margin?: number; // margin in mm
  width?: number;  // container width in px (default 794px = A4 at 96dpi)
  scale?: number;  // canvas resolution multiplier (default 2)
}

/**
 * Intelligent, gap-free, section-aware PDF generator for Operations Portal.
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

  const directSheets = Array.from(element.querySelectorAll<HTMLElement>('.sheet, .pdf-page'));
  const isSheetBased = directSheets.length > 0;

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

  const breakStyle = document.createElement('style');
  breakStyle.textContent = `
    .avoid-page-break, .invoice-avoid-break, .invoice-header, .invoice-meta-bar,
    .invoice-guest-pkg-cards, .invoice-milestones-section,
    .invoice-milestone-card, .invoice-receipts-section,
    .invoice-summary-cards, .invoice-notice-box, .invoice-terms-box,
    .invoice-signatures-footer, tr, section {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-scheme: light !important;
    }
  `;
  container.appendChild(breakStyle);
  document.body.appendChild(container);

  await new Promise(resolve => setTimeout(resolve, 100));

  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();

    const clonedSheets = Array.from(clone.querySelectorAll<HTMLElement>('.sheet, .pdf-page'));
    if (isSheetBased && clonedSheets.length > 0) {
      for (let i = 0; i < clonedSheets.length; i++) {
        const sheetEl = clonedSheets[i];
        if (i > 0) pdf.addPage();

        const canvas = await html2canvas(sheetEl, {
          scale,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: sheetEl.offsetWidth || width,
          height: sheetEl.offsetHeight || 1123,
          scrollX: 0,
          scrollY: 0,
          allowTaint: false,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, pdfH, undefined, 'FAST');
      }
    } else {
      const effectiveMargin = options.margin !== undefined ? options.margin : 8;
      const printW = pdfW - effectiveMargin * 2;
      const printH = pdfH - effectiveMargin * 2;

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

      const standardPageCanvasH = Math.floor((canvas.width * printH) / printW);

      const containerRect = clone.getBoundingClientRect();
      const breakableElements = Array.from(
        clone.querySelectorAll<HTMLElement>(
          '.avoid-page-break, .invoice-avoid-break, .invoice-header, .invoice-milestone-card, tr, section'
        )
      );

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
          const straddling = elementBoxes.find(b =>
            b.topY < targetEndY &&
            b.bottomY > targetEndY &&
            b.topY > currentStartY &&
            (targetEndY - b.topY) > 10
          );

          if (straddling) {
            targetEndY = straddling.topY;
          }
        }

        const sliceH = Math.min(targetEndY - currentStartY, canvas.height - currentStartY);

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

    const finalName = filename.toLowerCase().endsWith('.pdf')
      ? filename
      : `${filename}.pdf`;
    await pdf.save(finalName, { returnPromise: true });

  } finally {
    if (container.parentNode) container.parentNode.removeChild(container);
  }
}
