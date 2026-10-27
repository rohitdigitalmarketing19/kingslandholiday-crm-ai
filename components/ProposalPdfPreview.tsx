import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { generateProposalPdf, ProposalPdfRequest } from '../services/proposalPdfService';
import { renderCompleteProposalHtml, QuoteDataModel } from '../services/quoteDesignRenderer';
import type { PartnerBrand } from '../utils/partnerLogos';

export interface ProposalPdfPreviewHandle {
  getPdf: () => Promise<Blob>;
}

interface Props {
  quoteData: QuoteDataModel;
  designId: string;
  partnerBrands: PartnerBrand[];
}

const ProposalPdfPreview = forwardRef<ProposalPdfPreviewHandle, Props>(({ quoteData, designId, partnerBrands }, ref) => {
  const sourceRef = useRef<HTMLDivElement>(null);
  const request = useMemo<ProposalPdfRequest>(() => ({ quoteData, designId, partnerBrands, isB2B: false }), [quoteData, designId, partnerBrands]);
  const html = useMemo(() => renderCompleteProposalHtml(quoteData, designId, partnerBrands), [quoteData, designId, partnerBrands]);
  const taskRef = useRef<{ request: ProposalPdfRequest; promise: Promise<Blob> } | null>(null);
  const [preview, setPreview] = useState<{ request: ProposalPdfRequest; url: string } | null>(null);
  const [failure, setFailure] = useState<{ request: ProposalPdfRequest; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);

  const getPdf = useCallback(() => {
    if (taskRef.current?.request === request) return taskRef.current.promise;
    if (!sourceRef.current) return Promise.reject(new Error('Proposal is not ready.'));
    const promise = generateProposalPdf(request, sourceRef.current);
    taskRef.current = { request, promise };
    promise.catch(() => {
      if (taskRef.current?.promise === promise) taskRef.current = null;
    });
    return promise;
  }, [request]);

  useImperativeHandle(ref, () => ({ getPdf }), [getPdf]);

  useEffect(() => {
    let active = true;
    let url: string | null = null;
    // Avoid generating several PDFs while the user quickly switches themes.
    const timer = window.setTimeout(() => {
      getPdf().then(blob => {
        if (!active) return;
        url = URL.createObjectURL(blob);
        setPreview({ request, url });
      }).catch(() => {
        if (active) setFailure({ request, message: 'The PDF preview could not be loaded.' });
      });
    }, 150);
    return () => {
      active = false;
      window.clearTimeout(timer);
      if (url) URL.revokeObjectURL(url);
    };
  }, [getPdf, request, attempt]);

  const currentPreview = preview?.request === request ? preview : null;
  const error = failure?.request === request ? failure.message : null;

  return (
    <div className="w-full" style={{ minWidth: '320px' }}>
      <div ref={sourceRef} aria-hidden="true" className="live-proposal-sheets-container doc-preview-protected"
        style={{ position: 'fixed', left: '-100000px', top: 0, width: '794px', background: '#ffffff', pointerEvents: 'none' }}
        dangerouslySetInnerHTML={{ __html: html }} />
      {currentPreview ? (
        <iframe title="Proposal PDF preview" src={`${currentPreview.url}#toolbar=0&navpanes=0&view=FitH`}
          className="w-full rounded-xl border-0" style={{ height: '80vh', minHeight: '600px', background: '#525659' }} />
      ) : error ? (
        <div role="alert" className="py-16 text-center text-slate-600 dark:text-slate-300">
          <p>{error}</p>
          <button type="button" className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-white" onClick={() => {
            setFailure(null);
            setAttempt(value => value + 1);
          }}>Try again</button>
        </div>
      ) : (
        <div role="status" className="py-16 text-center text-slate-600 dark:text-slate-300">Preparing PDF preview…</div>
      )}
    </div>
  );
});

ProposalPdfPreview.displayName = 'ProposalPdfPreview';
export default ProposalPdfPreview;
