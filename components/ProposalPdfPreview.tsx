import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { generateProposalPdf, getCachedProposalPdf, ProposalPdfRequest } from '../services/proposalPdfService';
import { renderCompleteProposalHtml, QuoteDataModel } from '../services/quoteDesignRenderer';
import { prepareProposalPages } from '../utils/proposalPages';
import type { PartnerBrand } from '../utils/partnerLogos';

export interface ProposalPdfPreviewHandle { getPdf: () => Promise<Blob>; }
interface Props { quoteData: QuoteDataModel; designId: string; partnerBrands: PartnerBrand[]; }

const ProposalPdfPreview = forwardRef<ProposalPdfPreviewHandle, Props>(({ quoteData, designId, partnerBrands }, ref) => {
  const sourceRef = useRef<HTMLDivElement>(null);
  const key = useMemo(() => JSON.stringify({ quoteData, designId, partnerBrands, isB2B: false }), [quoteData, designId, partnerBrands]);
  const request = useMemo<ProposalPdfRequest>(() => JSON.parse(key), [key]);
  const html = useMemo(() => renderCompleteProposalHtml(request.quoteData, request.designId, request.partnerBrands), [request]);
  const layoutTask = useRef<{ request: ProposalPdfRequest; promise: Promise<string> } | null>(null);
  const downloadTask = useRef<{ request: ProposalPdfRequest; promise: Promise<Blob> } | null>(null);
  const [layout, setLayout] = useState<{ request: ProposalPdfRequest; html: string } | null>(null);
  const [failure, setFailure] = useState<{ request: ProposalPdfRequest; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);

  const getLayout = useCallback(() => {
    if (layoutTask.current?.request === request) return layoutTask.current.promise;
    if (!sourceRef.current) return Promise.reject(new Error('Proposal is not ready.'));
    const promise = prepareProposalPages(sourceRef.current);
    layoutTask.current = { request, promise };
    promise.catch(() => { if (layoutTask.current?.promise === promise) layoutTask.current = null; });
    return promise;
  }, [request]);

  const getPdf = useCallback(() => {
    if (downloadTask.current?.request === request) return downloadTask.current.promise;
    const cached = getCachedProposalPdf(request);
    if (cached) return Promise.resolve(cached);
    const promise = getLayout().then(async pages => {
      const source = document.createElement('div');
      source.className = 'doc-preview-protected';
      source.style.cssText = 'position:fixed;left:-100000px;top:0;width:794px;background:#fff;pointer-events:none';
      source.setAttribute('aria-hidden', 'true');
      source.innerHTML = pages;
      document.body.appendChild(source);
      try { return await generateProposalPdf(request, source); } finally { source.remove(); }
    });
    downloadTask.current = { request, promise };
    promise.catch(() => { if (downloadTask.current?.promise === promise) downloadTask.current = null; });
    return promise;
  }, [getLayout, request]);
  useImperativeHandle(ref, () => ({ getPdf }), [getPdf]);

  useEffect(() => {
    let active = true;
    getLayout().then(pages => { if (active) setLayout({ request, html: pages }); })
      .catch(() => { if (active) setFailure({ request, message: 'The preview could not be loaded.' }); });
    return () => { active = false; };
  }, [getLayout, request, attempt]);

  const current = layout?.request === request ? layout : null;
  const error = failure?.request === request ? failure.message : null;
  return <div className="w-full">
    <div ref={sourceRef} aria-hidden="true" className="live-proposal-sheets-container doc-preview-protected" style={{ position:'fixed',left:'-100000px',top:0,width:'794px',background:'#fff',pointerEvents:'none' }} dangerouslySetInnerHTML={{__html:html}} />
    {current ? <div aria-label="Proposal PDF preview" role="document" className="proposal-preview-pages doc-preview-protected flex flex-col gap-6" style={{width:'794px',minWidth:'794px',background:'transparent'}} dangerouslySetInnerHTML={{__html:current.html}} />
      : error ? <div role="alert" className="py-16 text-center text-secondary dark:text-slate-300"><p>{error}</p><button type="button" className="mt-3 rounded-lg bg-inverse px-4 py-2 text-white" onClick={()=>{setFailure(null);setAttempt(value=>value+1);}}>Try again</button></div>
      : <div role="status" className="py-8 text-center text-secondary dark:text-slate-300">Preparing preview…</div>}
  </div>;
});
ProposalPdfPreview.displayName = 'ProposalPdfPreview';
export default ProposalPdfPreview;
