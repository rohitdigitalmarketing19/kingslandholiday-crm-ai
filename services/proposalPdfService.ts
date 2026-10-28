import type { QuoteDataModel } from './quoteDesignRenderer';
import type { PartnerBrand } from '../utils/partnerLogos';
import { exportElementToPdf } from '../utils/pdfExport';

export interface ProposalPdfRequest {
  quoteData: QuoteDataModel;
  designId: string;
  partnerBrands: PartnerBrand[];
  isB2B?: boolean;
}

const CACHE_TTL_MS = 3 * 60 * 1000;
const MAX_CACHE_BYTES = 32 * 1024 * 1024;
const SERVER_TIMEOUT_MS = 4000;
const completed = new Map<string, { blob: Blob; expires: number; bytes: number }>();
const pending = new Map<string, Promise<Blob>>();
let epoch = 0;
let scope: string | undefined;
let serverRetryAt = 0;
let cleanupTimer: ReturnType<typeof setTimeout> | undefined;

function currentScope(): string {
  try { return localStorage.getItem('kingsland_active_user_id') || ''; } catch { return ''; }
}

/** Remove cached customer documents on logout/login/user switch. */
export function clearProposalPdfCache(): void {
  completed.clear();
  pending.clear();
  epoch++;
  serverRetryAt = 0;
  scope = currentScope();
  if (cleanupTimer) clearTimeout(cleanupTimer);
  cleanupTimer = undefined;
}

function requestKey(request: ProposalPdfRequest): string {
  if (scope !== currentScope()) clearProposalPdfCache();
  return JSON.stringify(request);
}

function cached(key: string): Blob | undefined {
  const entry = completed.get(key);
  if (!entry) return;
  if (entry.expires <= Date.now()) { completed.delete(key); return; }
  completed.delete(key);
  completed.set(key, entry);
  return entry.blob;
}

export function getCachedProposalPdf(request: ProposalPdfRequest): Blob | undefined {
  return cached(requestKey(request));
}

function scheduleCleanup(): void {
  if (cleanupTimer || !completed.size) return;
  const nextExpiry = Math.min(...Array.from(completed.values()).map(value => value.expires));
  cleanupTimer = setTimeout(() => {
    cleanupTimer = undefined;
    for (const [key, value] of completed) if (value.expires <= Date.now()) completed.delete(key);
    scheduleCleanup();
  }, Math.max(0, nextExpiry - Date.now()));
}

function remember(key: string, blob: Blob): void {
  const bytes = blob.size + key.length * 2;
  if (bytes > MAX_CACHE_BYTES) return;
  completed.set(key, { blob, bytes, expires: Date.now() + CACHE_TTL_MS });
  let total = Array.from(completed.values()).reduce((sum, entry) => sum + entry.bytes, 0);
  while (completed.size > 3 || total > MAX_CACHE_BYTES) {
    const oldest = completed.keys().next().value!;
    total -= completed.get(oldest)!.bytes;
    completed.delete(oldest);
  }
  scheduleCleanup();
}

async function render(request: ProposalPdfRequest, source: HTMLElement, generation: number): Promise<Blob> {
  // The fast preview has already prepared the exact page layout. Export those
  // same pages only when Download is requested; no server wait or second layout.
  if (source.querySelector(':scope > [data-proposal-page]')) {
    return exportElementToPdf(source, { download: false, margin: 0, width: 794, scale: 2 });
  }
  // Freeze this revision while the server request is pending.
  const snapshot = source.cloneNode(true) as HTMLElement;
  if (Date.now() >= serverRetryAt) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SERVER_TIMEOUT_MS);
    try {
      const response = await fetch('/api/pdf-designs/render-pdf', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request), signal: controller.signal,
      });
      if (response.ok && response.headers.get('Content-Type')?.includes('application/pdf')) {
        const blob = await response.blob();
        if (blob.size > 0) return blob;
      }
      if (generation === epoch && (response.status >= 500 || response.ok)) serverRetryAt = Date.now() + 30000;
    } catch {
      if (generation === epoch) serverRetryAt = Date.now() + 30000;
    } finally { clearTimeout(timer); }
  }
  snapshot.style.position = 'fixed';
  snapshot.style.left = '-100000px';
  snapshot.style.top = '0';
  snapshot.setAttribute('aria-hidden', 'true');
  document.body.appendChild(snapshot);
  try {
    return await exportElementToPdf(snapshot, { download: false, margin: 0, width: 794, scale: 2 });
  } finally { snapshot.remove(); }
}

/** Reuse the same PDF for unchanged previews, downloads, and quick reopenings. */
export function generateProposalPdf(request: ProposalPdfRequest, source: HTMLElement): Promise<Blob> {
  const key = requestKey(request);
  const hit = cached(key);
  if (hit) return Promise.resolve(hit);
  const existing = pending.get(key);
  if (existing) return existing;
  const generation = epoch;
  const promise = render(request, source, generation).then(blob => {
    if (generation === epoch) remember(key, blob);
    return blob;
  }).finally(() => {
    if (pending.get(key) === promise) pending.delete(key);
  });
  pending.set(key, promise);
  return promise;
}
