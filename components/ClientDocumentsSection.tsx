import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Download,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileArchive,
  X,
  User,
  ShieldCheck,
  Calendar,
  FileCheck,
  RefreshCw,
  Search,
  Maximize2
} from 'lucide-react';
import {
  ClientDocumentItem,
  fetchClientDocuments,
  uploadClientDocuments,
  deleteClientDocument,
  downloadAllClientDocumentsZip,
  getClientDocumentSignedToken,
  LeadTraveller
} from '../services/apiService';

interface ClientDocumentsSectionProps {
  leadId: string;
  leadTripId?: string;
  leadName?: string;
  isAdmin?: boolean;
  travellers?: LeadTraveller[];
  onCountChange?: (count: number) => void;
}

const DOC_TYPES = [
  'Passport',
  'Aadhaar Card',
  'PAN Card',
  'Visa',
  'Driving Licence',
  'Voter ID',
  'Other'
];

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Item with image thumbnail preview for staged documents
const StagedFileItem: React.FC<{ file: File; onRemove: () => void }> = ({ file, onRemove }) => {
  const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isImage) {
      const url = URL.createObjectURL(file);
      setThumbUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [file, isImage]);

  return (
    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-between text-xs hover:border-slate-300 dark:hover:border-zinc-600 transition-colors shadow-2xs">
      <div className="flex items-center gap-2.5 truncate pr-2">
        {isImage && thumbUrl ? (
          <img
            src={thumbUrl}
            alt={file.name}
            className="w-9 h-9 object-cover rounded-lg border border-slate-300 dark:border-zinc-700 shrink-0 shadow-2xs"
          />
        ) : file.type === 'application/pdf' || /\.pdf$/i.test(file.name) ? (
          <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center shrink-0">
            <FileText size={18} className="text-rose-500" />
          </div>
        ) : (
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 flex items-center justify-center shrink-0">
            <ImageIcon size={18} className="text-indigo-500" />
          </div>
        )}
        <div className="truncate">
          <div className="font-bold text-slate-800 dark:text-zinc-100 truncate" title={file.name}>
            {file.name}
          </div>
          <div className="text-[10px] text-slate-400 font-mono">{formatFileSize(file.size)}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="p-1 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
        title="Remove file"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export const ClientDocumentsSection: React.FC<ClientDocumentsSectionProps> = ({
  leadId,
  leadTripId,
  leadName,
  isAdmin = true,
  travellers = [],
  onCountChange
}) => {
  const [documents, setDocuments] = useState<ClientDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Upload Form State
  const [selectedDocType, setSelectedDocType] = useState<string>('Passport');
  const [selectedTravellerId, setSelectedTravellerId] = useState<string>('');
  const [documentNote, setDocumentNote] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Preview Modal State
  const [previewDoc, setPreviewDoc] = useState<ClientDocumentItem | null>(null);
  const [previewTicket, setPreviewTicket] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Delete Confirmation State
  const [deletingDoc, setDeletingDoc] = useState<ClientDocumentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter State
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load documents
  const loadDocuments = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetchClientDocuments(leadId);
      setDocuments(res.documents || []);
      if (onCountChange) {
        onCountChange(res.totalCount || 0);
      }
    } catch (err: any) {
      console.error('Failed to load client documents:', err);
      setErrorMsg(err.message || 'Failed to load client documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (leadId) {
      loadDocuments();
    }
  }, [leadId]);

  // Client-side file validation (allowed: JPG, PNG, WebP, PDF; max 10MB each)
  const validateFiles = (files: FileList | File[]): File[] => {
    const valid: File[] = [];
    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
    const maxBytes = 10 * 1024 * 1024; // 10 MB

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
      const isAllowedExt = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'].includes(ext);

      if (!isAllowedExt && !allowedMimes.includes(f.type)) {
        alert(`File "${f.name}" is not supported. Only JPG, PNG, WebP, and PDF documents are allowed.`);
        continue;
      }
      if (f.size > maxBytes) {
        alert(`File "${f.name}" (${(f.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 10 MB limit.`);
        continue;
      }
      valid.push(f);
    }
    return valid;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const validated = validateFiles(e.target.files);
      setSelectedFiles(prev => [...prev, ...validated]);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validated = validateFiles(e.dataTransfer.files);
      setSelectedFiles(prev => [...prev, ...validated]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
      const validated = validateFiles(e.clipboardData.files);
      if (validated.length > 0) {
        setSelectedFiles(prev => [...prev, ...validated]);
      }
    }
  };

  const removeFileFromStaging = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, idx) => idx !== index));
  };

  // Upload handler
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      alert('Please select or drag-and-drop at least one document to upload.');
      return;
    }

    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await uploadClientDocuments(
        leadId,
        selectedFiles,
        selectedDocType,
        documentNote,
        selectedTravellerId || null
      );

      setSuccessMsg(res.message || `Successfully uploaded ${selectedFiles.length} document(s).`);
      setSelectedFiles([]);
      setDocumentNote('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadDocuments();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Upload error:', err);
      setErrorMsg(err.message || 'Failed to upload document(s).');
    } finally {
      setUploading(false);
    }
  };

  // Open Preview Modal
  const handleOpenPreview = async (doc: ClientDocumentItem) => {
    setPreviewDoc(doc);
    setPreviewLoading(true);
    try {
      const { ticket } = await getClientDocumentSignedToken(leadId, doc.id);
      setPreviewTicket(ticket);
    } catch (err) {
      console.error('Failed to get preview ticket:', err);
      setPreviewTicket(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Trigger individual download
  const handleDownloadDoc = async (doc: ClientDocumentItem) => {
    try {
      const { ticket } = await getClientDocumentSignedToken(leadId, doc.id);
      const url = `/api/leads/${leadId}/documents/${doc.id}/file?download=1&ticket=${encodeURIComponent(ticket)}`;
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.original_filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Download failed.');
    }
  };

  // Trigger Download All ZIP
  const handleDownloadAllZip = async () => {
    try {
      const blob = await downloadAllClientDocumentsZip(leadId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ClientDocuments_${leadTripId || leadId}_${(leadName || 'Client').replace(/\s+/g, '_')}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Failed to generate documents ZIP.');
    }
  };

  // Confirm and soft-delete
  const handleConfirmDelete = async () => {
    if (!deletingDoc) return;
    setIsDeleting(true);
    try {
      await deleteClientDocument(leadId, deletingDoc.id);
      setDeletingDoc(null);
      await loadDocuments();
      setSuccessMsg('Document successfully deleted.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to delete document.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Format file size
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Filtered documents
  const filteredDocs = documents.filter(doc => {
    const matchesType = typeFilter === 'All' || doc.doc_type === typeFilter;
    const matchesSearch = !searchQuery.trim() || 
      doc.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.doc_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.traveller_name && doc.traveller_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (doc.note && doc.note.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Alert Notices */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3 text-rose-800 dark:text-rose-300 text-xs animate-in fade-in">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div className="flex-1 font-semibold">{errorMsg}</div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700">
            <X size={14} />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-3 text-emerald-800 dark:text-emerald-300 text-xs animate-in fade-in">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          <div className="flex-1 font-semibold">{successMsg}</div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Security Banner */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-lime-400/20 text-lime-400 flex items-center justify-center shrink-0 border border-lime-400/30">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-lime-400">Restricted Admin Storage</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">Encrypted 256-Bit</span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Client identification documents (Passport, Aadhaar, PAN) are stored outside web root with signed access tickets & audit logging.
            </p>
          </div>
        </div>

        {documents.length > 0 && (
          <button
            type="button"
            onClick={handleDownloadAllZip}
            className="px-4 py-2.5 bg-lime-400 hover:bg-lime-300 text-black rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm cursor-pointer"
          >
            <FileArchive size={15} />
            <span>Download All ({documents.length}) as ZIP</span>
          </button>
        )}
      </div>

      {/* Upload Zone (Admin Only) */}
      {isAdmin && (
        <form onSubmit={handleUpload} onPaste={handlePaste} className="bg-white dark:bg-[#161713] p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <UploadCloud size={16} className="text-indigo-600 dark:text-lime-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-zinc-100">
                Upload Client Documents
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-bold">Max 10 MB per file · JPG, PNG, WebP, PDF</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Document Type Dropdown */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                Document Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedDocType}
                onChange={e => setSelectedDocType(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-zinc-100 outline-none focus:border-indigo-500 cursor-pointer"
              >
                {DOC_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Optional Belongs To Traveller */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                Belongs To (Traveller)
              </label>
              <select
                value={selectedTravellerId}
                onChange={e => setSelectedTravellerId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-zinc-100 outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">General / Lead Customer ({leadName || 'Primary'})</option>
                {travellers.map((t, idx) => (
                  <option key={t.id || idx} value={t.id || ''}>
                    {t.name} ({t.type === 'child' ? 'Child' : 'Adult'}{t.is_primary ? ' · Primary' : ''})
                  </option>
                ))}
              </select>
            </div>

            {/* Optional Note */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                Document Note / Description
              </label>
              <input
                type="text"
                placeholder="e.g. Front & Back scan, valid till 2030"
                value={documentNote}
                onChange={e => setDocumentNote(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-zinc-100 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Drag & Drop Area */}
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all select-none ${
              isDragging
                ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 ring-4 ring-indigo-500/20 scale-[1.008]'
                : 'border-slate-300 dark:border-zinc-700 hover:border-indigo-400 dark:hover:border-zinc-500 bg-slate-50/50 dark:bg-zinc-900/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="pointer-events-none">
              <div
                className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3 transition-transform ${
                  isDragging
                    ? 'bg-indigo-600 text-white scale-110 shadow-md animate-bounce'
                    : 'bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-lime-400'
                }`}
              >
                <UploadCloud size={24} />
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                {isDragging ? (
                  <span className="text-indigo-600 dark:text-indigo-400 font-extrabold text-sm">Drop document images here!</span>
                ) : (
                  <>
                    Drag & drop client document images here, or{' '}
                    <span className="text-indigo-600 dark:text-lime-400 underline font-extrabold">browse files</span>
                  </>
                )}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                Supports multiple images or PDFs (Passport front/back, Aadhaar, Visa, PAN) · Paste with Ctrl+V
              </p>
            </div>
          </div>

          {/* Staged Files Preview */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Ready to Upload ({selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {selectedFiles.map((file, idx) => (
                  <StagedFileItem
                    key={`${file.name}-${idx}`}
                    file={file}
                    onRemove={() => removeFileFromStaging(idx)}
                  />
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                >
                  {uploading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Encrypting & Uploading...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck size={14} />
                      <span>Upload {selectedFiles.length} Document{selectedFiles.length > 1 ? 's' : ''}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {/* Documents List & Filters */}
      <div className="bg-white dark:bg-[#161713] p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900 dark:text-zinc-100 tracking-tight">
                Stored Documents
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-lime-400/10 text-indigo-700 dark:text-lime-400 border border-indigo-200 dark:border-lime-400/20 text-xs font-black">
                {documents.length} Total
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Verified identity and travel documents linked to this booking.
            </p>
          </div>

          {/* Type Filter & Search Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-700 text-xs text-slate-800 dark:text-zinc-100 font-medium outline-none focus:border-indigo-400 w-44"
              />
            </div>

            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-zinc-100 outline-none focus:border-indigo-400 cursor-pointer"
            >
              <option value="All">All Types ({documents.length})</option>
              {DOC_TYPES.map(t => {
                const count = documents.filter(d => d.doc_type === t).length;
                return (
                  <option key={t} value={t}>{t} ({count})</option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Thumbnail Grid */}
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 font-bold">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-500" />
            Loading client documents...
          </div>
        ) : filteredDocs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.map(doc => {
              const isPdf = doc.mime_type === 'application/pdf';

              return (
                <div
                  key={doc.id}
                  className="bg-slate-50 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all group flex flex-col justify-between"
                >
                  {/* Top Thumbnail Preview Area */}
                  <div
                    onClick={() => handleOpenPreview(doc)}
                    className="h-36 bg-slate-100 dark:bg-zinc-800 relative flex items-center justify-center cursor-pointer overflow-hidden border-b border-slate-200 dark:border-zinc-800 group-hover:bg-slate-200 dark:group-hover:bg-zinc-700/60 transition-colors"
                  >
                    {isPdf ? (
                      <div className="flex flex-col items-center gap-1.5 text-rose-500">
                        <FileText size={44} className="drop-shadow-sm" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/50">
                          PDF Document
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-indigo-500">
                        <ImageIcon size={44} className="drop-shadow-sm" />
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-900/50">
                          Image Scan
                        </span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-2xs">
                      <div className="px-3 py-1.5 rounded-xl bg-white text-slate-900 text-xs font-black flex items-center gap-1.5 shadow-lg">
                        <Maximize2 size={13} />
                        <span>Preview</span>
                      </div>
                    </div>

                    <div className="absolute top-2.5 left-2.5">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white/90 dark:bg-black/80 text-slate-800 dark:text-zinc-200 shadow-xs border border-slate-200 dark:border-zinc-700">
                        {doc.doc_type}
                      </span>
                    </div>

                    <div className="absolute top-2.5 right-2.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-900/70 text-white backdrop-blur-xs">
                        {formatBytes(doc.size_bytes)}
                      </span>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-zinc-100 truncate" title={doc.original_filename}>
                        {doc.original_filename}
                      </div>

                      {doc.traveller_name ? (
                        <div className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-lime-400 font-bold mt-1">
                          <User size={12} />
                          <span>Belongs to: {doc.traveller_name}</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                          Booking / Primary Lead
                        </div>
                      )}

                      {doc.note && (
                        <p className="text-[11px] text-slate-600 dark:text-zinc-300 italic mt-1.5 line-clamp-2 bg-white dark:bg-zinc-800/50 p-2 rounded-lg border border-slate-100 dark:border-zinc-800">
                          "{doc.note}"
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-[10px] text-slate-400">
                      <div className="flex items-center gap-1">
                        <Calendar size={11} />
                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                      <span>by {doc.uploaded_by}</span>
                    </div>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="p-3 bg-white dark:bg-[#161713] border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenPreview(doc)}
                      className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye size={13} />
                      <span>Preview</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadDoc(doc)}
                      className="p-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-indigo-600 dark:text-lime-400 rounded-xl transition-all cursor-pointer"
                      title="Download document file"
                    >
                      <Download size={14} />
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setDeletingDoc(doc)}
                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                        title="Delete document (Soft Delete)"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl p-8">
            <div className="w-12 h-12 bg-slate-100 dark:bg-zinc-800 text-slate-400 mx-auto rounded-2xl flex items-center justify-center mb-3">
              <FileCheck size={24} />
            </div>
            <h4 className="text-sm font-black text-slate-800 dark:text-zinc-100 mb-1">
              No Client Documents Found
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {typeFilter !== 'All' || searchQuery
                ? 'No documents matched your search or type filter.'
                : 'Upload Passport, Aadhaar, PAN card, or Visa copies above to securely store them.'}
            </p>
          </div>
        )}
      </div>

      {/* PREVIEW MODAL / LIGHTBOX */}
      {previewDoc && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-zinc-700 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-800/50">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-indigo-50 dark:bg-lime-400/10 text-indigo-700 dark:text-lime-400 border border-indigo-200 dark:border-lime-400/20">
                  {previewDoc.doc_type}
                </span>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-zinc-100 truncate max-w-md">
                    {previewDoc.original_filename}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {formatBytes(previewDoc.size_bytes)} · Uploaded by {previewDoc.uploaded_by} on {new Date(previewDoc.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadDoc(previewDoc)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Download size={13} />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setPreviewDoc(null); setPreviewTicket(null); }}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-zinc-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Viewer Content Area */}
            <div className="flex-1 bg-slate-100 dark:bg-black/90 p-4 flex items-center justify-center overflow-auto">
              {previewLoading ? (
                <div className="text-center text-xs text-slate-400 font-bold">
                  <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-500" />
                  Generating secure document view...
                </div>
              ) : previewTicket ? (
                previewDoc.mime_type === 'application/pdf' ? (
                  <iframe
                    src={`/api/leads/${leadId}/documents/${previewDoc.id}/file?ticket=${encodeURIComponent(previewTicket)}#toolbar=1`}
                    className="w-full h-full rounded-xl border border-slate-200 dark:border-zinc-800 shadow-inner bg-white"
                    title={previewDoc.original_filename}
                  />
                ) : (
                  <div className="max-w-full max-h-full flex items-center justify-center overflow-auto p-2">
                    <img
                      src={`/api/leads/${leadId}/documents/${previewDoc.id}/file?ticket=${encodeURIComponent(previewTicket)}`}
                      alt={previewDoc.original_filename}
                      className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg border border-slate-200 dark:border-zinc-800"
                    />
                  </div>
                )
              ) : (
                <div className="text-center text-xs text-rose-500 font-bold">
                  Unable to load secure preview. Please try downloading the document.
                </div>
              )}
            </div>

            {previewDoc.note && (
              <div className="px-6 py-3 bg-slate-50 dark:bg-zinc-800/60 border-t border-slate-200 dark:border-zinc-800 text-xs text-slate-700 dark:text-zinc-300">
                <span className="font-bold text-slate-400 uppercase text-[10px] mr-2">Note:</span>
                {previewDoc.note}
              </div>
            )}
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deletingDoc && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-zinc-700 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-base font-black text-slate-900 dark:text-zinc-100">
                Delete Client Document?
              </h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Are you sure you want to delete <strong className="text-slate-800 dark:text-zinc-200">"{deletingDoc.original_filename}"</strong> ({deletingDoc.doc_type})?
              </p>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold pt-1">
                This document will be soft-deleted. A secure audit log will be preserved.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingDoc(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDocumentsSection;
