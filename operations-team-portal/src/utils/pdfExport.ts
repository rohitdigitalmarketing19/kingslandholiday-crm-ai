// Both portals share pagination, font loading and modern-color support.
export { ensureAllQuoteFontsLoaded } from '../../../utils/pdfExport';
export type { PdfExportOptions } from '../../../utils/pdfExport';
import { exportElementToPdf as exportPdf, PdfExportOptions } from '../../../utils/pdfExport';
export async function exportElementToPdf(element: HTMLElement, options: PdfExportOptions = {}): Promise<void> {
  await exportPdf(element, { ...options, download: true });
}
