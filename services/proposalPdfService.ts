import type { QuoteDataModel } from './quoteDesignRenderer';
import type { PartnerBrand } from '../utils/partnerLogos';
import { exportElementToPdf } from '../utils/pdfExport';

export interface ProposalPdfRequest {
  quoteData: QuoteDataModel;
  designId: string;
  partnerBrands: PartnerBrand[];
  isB2B?: boolean;
}

/** One generation path for both the displayed preview and its download. */
export async function generateProposalPdf(request: ProposalPdfRequest, source: HTMLElement): Promise<Blob> {
  // Freeze this revision while the server request is pending; switching tabs
  // or themes must not change the content of an in-progress download.
  const snapshot = source.cloneNode(true) as HTMLElement;
  try {
    const response = await fetch('/api/pdf-designs/render-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (response.ok && response.headers.get('Content-Type')?.includes('application/pdf')) {
      const blob = await response.blob();
      if (blob.size > 0) return blob;
    }
  } catch (error) {
    console.warn('Server PDF unavailable; generating the proposal in the browser.', error);
  }
  snapshot.style.position = 'fixed';
  snapshot.style.left = '-100000px';
  snapshot.style.top = '0';
  snapshot.setAttribute('aria-hidden', 'true');
  document.body.appendChild(snapshot);
  try {
    return await exportElementToPdf(snapshot, { download: false, margin: 0, width: 794, scale: 2 });
  } finally {
    snapshot.remove();
  }
}
