import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Upload,
  Calendar,
  Check,
  CheckCircle2,
  Trash2,
  Archive,
  Eye,
  Download,
  Layers,
  AlertCircle,
  X,
  HelpCircle,
  RefreshCw,
  FileText,
  FileArchive,
  Image as ImageIcon,
  Star,
  Palette,
  Clock,
  ArrowRight,
  ExternalLink,
  Info
} from 'lucide-react';
import * as api from '../services/apiService';
import { PdfThemeRecord } from '../services/apiService';

interface PdfThemesViewProps {
  onBack?: () => void;
}

export const PdfThemesView: React.FC<PdfThemesViewProps> = ({ onBack }) => {
  const [themes, setThemes] = useState<PdfThemeRecord[]>([]);
  const [activeResolvedTheme, setActiveResolvedTheme] = useState<PdfThemeRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Help panel
  const [showHelp, setShowHelp] = useState(false);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<'pack' | 'artwork' | 'image'>('pack');
  const [themeName, setThemeName] = useState('');
  const [festival, setFestival] = useState('Diwali');
  const [customFestival, setCustomFestival] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live preview modal state
  const [previewTheme, setPreviewTheme] = useState<PdfThemeRecord | null>(null);
  const [previewDays, setPreviewDays] = useState<1 | 3 | 7 | 15>(7);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const FESTIVAL_PRESETS = [
    'Diwali',
    'Holi',
    'Eid',
    'Christmas',
    'New Year',
    'Independence Day',
    'Navratri',
    'Summer Special',
    'Monsoon Escapes',
    'Winter Wonderland',
    'Other'
  ];

  const loadData = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const [allThemes, activeTheme] = await Promise.all([
        api.fetchPdfThemes(),
        api.fetchActivePdfTheme()
      ]);
      setThemes(allThemes);
      setActiveResolvedTheme(activeTheme);
    } catch (err: any) {
      console.error('Failed to load PDF themes:', err);
      setErrorMsg(err.message || 'Failed to load themes from server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update preview HTML when preview modal is open and days or theme change
  useEffect(() => {
    if (previewTheme) {
      fetchPreviewContent(previewTheme.id, previewDays);
    }
  }, [previewTheme, previewDays]);

  const fetchPreviewContent = async (themeId: string, days: number) => {
    try {
      setIsLoadingPreview(true);
      const html = await api.previewPdfThemeHtml(themeId, days);
      setPreviewHtml(html);
    } catch (err: any) {
      console.error('Failed to fetch preview HTML:', err);
      setPreviewHtml(`<div style="padding: 40px; font-family: sans-serif; text-align: center; color: #e11d48;">
        <h3>Preview Rendering Error</h3>
        <p>${err.message || 'Unable to render sample preview'}</p>
      </div>`);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    if (!selectedFile) {
      setUploadError('Please select a file to upload.');
      return;
    }
    const finalFestival = festival === 'Other' ? customFestival.trim() : festival;
    if (!themeName.trim()) {
      setUploadError('Please enter a theme name.');
      return;
    }
    if (!finalFestival) {
      setUploadError('Please enter or select a festival.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(25);
      const timer = setInterval(() => {
        setUploadProgress(p => (p < 85 ? p + 15 : p));
      }, 300);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', uploadType);
      formData.append('name', themeName.trim());
      formData.append('festival', finalFestival);
      if (startDate) formData.append('startDate', startDate);
      if (endDate) formData.append('endDate', endDate);
      formData.append('isDefault', isDefault ? 'true' : 'false');

      await api.uploadPdfTheme(formData);
      clearInterval(timer);
      setUploadProgress(100);

      setSuccessMsg(`Theme "${themeName}" uploaded successfully!`);
      setShowUploadModal(false);
      resetUploadForm();
      await loadData();
    } catch (err: any) {
      console.error('Upload failed:', err);
      setUploadError(err.message || 'Failed to upload theme.');
    } finally {
      setIsUploading(false);
    }
  };

  const resetUploadForm = () => {
    setSelectedFile(null);
    setThemeName('');
    setFestival('Diwali');
    setCustomFestival('');
    setStartDate('');
    setEndDate('');
    setIsDefault(false);
    setUploadProgress(0);
    setUploadError(null);
  };

  const handleActivate = async (theme: PdfThemeRecord) => {
    try {
      await api.activatePdfTheme(theme.id);
      setSuccessMsg(`Theme "${theme.name}" is now active!`);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to activate theme.');
    }
  };

  const handleSetDefault = async (theme: PdfThemeRecord) => {
    try {
      await api.setDefaultPdfTheme(theme.id);
      setSuccessMsg(`Theme "${theme.name}" set as system default.`);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to set default.');
    }
  };

  const handleArchive = async (theme: PdfThemeRecord) => {
    if (!confirm(`Are you sure you want to archive theme "${theme.name}"?`)) return;
    try {
      await api.archivePdfTheme(theme.id);
      setSuccessMsg(`Theme "${theme.name}" archived.`);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to archive theme.');
    }
  };

  const handleDelete = async (theme: PdfThemeRecord) => {
    if (theme.isDefault || theme.is_default) {
      alert('Cannot delete the default theme. Set another theme as default first.');
      return;
    }
    if (!confirm(`Are you sure you want to permanently delete theme "${theme.name}"? This cannot be undone.`)) return;
    try {
      await api.deletePdfTheme(theme.id);
      setSuccessMsg(`Theme "${theme.name}" deleted.`);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete theme.');
    }
  };

  const handleDownloadSamplePdf = async () => {
    if (!previewTheme) return;
    try {
      setIsDownloadingPdf(true);
      const blob = await api.generatePackagePdfBlob({
        themeId: previewTheme.id,
        days: previewDays,
        showDetailedItinerary: true
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${previewTheme.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${previewDays}days.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Download failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200 text-slate-100">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-2 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#D9582B] text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2" style={{ fontFamily: 'Playfair Display, Georgia, serif' }}>
                PDF Themes & Festival Skins
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Automated seasonal skins (Diwali, Holi, Eid, Christmas), continuous multi-day packing, and 30% page-fill logic.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-700/60"
          >
            <HelpCircle size={14} className="text-[#FF6B35]" />
            <span>{showHelp ? 'Hide Guide' : 'Theme Spec & Guide'}</span>
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#D9582B] hover:opacity-95 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
          >
            <Upload size={14} />
            <span>Upload New Theme</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="p-1 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="p-1 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Help Panel */}
      {showHelp && (
        <div className="bg-[#14142B] border border-orange-500/30 rounded-2xl p-6 space-y-4 animate-in slide-in-from-top duration-200">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2 text-[#FF6B35]">
              <Palette size={18} />
              <h3 className="text-sm font-bold tracking-wide uppercase text-white">Theme Developer Specification</h3>
            </div>
            <button onClick={() => setShowHelp(false)} className="text-zinc-400 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-zinc-300">
            <div className="space-y-2 bg-black/40 p-4 rounded-xl border border-zinc-800">
              <span className="font-bold text-[#FF6B35] flex items-center gap-1.5">
                <FileArchive size={14} /> A) Theme Pack (.zip)
              </span>
              <p className="text-[11px] text-zinc-400">
                A zip archive containing custom HTML templates, CSS, and brand assets:
              </p>
              <pre className="p-2.5 bg-zinc-950 rounded-lg font-mono text-[10px] text-orange-200/90 overflow-x-auto">
{`theme.json
cover.html
page.html
styles.css
assets/
  diya.svg, banner.png, etc.`}
              </pre>
              <p className="text-[11px] text-zinc-400">
                SafeHandlebars placeholders: <code className="text-orange-300">{'{{package.title}}'}</code>, <code className="text-orange-300">{'{{package.price}}'}</code>, <code className="text-orange-300">{'{{#each itinerary}}'}</code>.
              </p>
            </div>

            <div className="space-y-2 bg-black/40 p-4 rounded-xl border border-zinc-800">
              <span className="font-bold text-[#FF6B35] flex items-center gap-1.5">
                <FileText size={14} /> B) Artwork PDF (3-Page A4)
              </span>
              <p className="text-[11px] text-zinc-400">
                A designed A4 portrait PDF with <strong>strictly 3 pages</strong>:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-zinc-400">
                <li><strong>Page 1:</strong> Cover page artwork backdrop</li>
                <li><strong>Page 2:</strong> Inner page header/footer template (repeats)</li>
                <li><strong>Page 3:</strong> Final back cover/closing artwork</li>
              </ul>
              <p className="text-[11px] text-zinc-400">
                Content is dynamically overlaid using transparent layer compositing (<code className="text-orange-300">pdf-lib</code>).
              </p>
            </div>

            <div className="space-y-2 bg-black/40 p-4 rounded-xl border border-zinc-800">
              <span className="font-bold text-[#FF6B35] flex items-center gap-1.5">
                <ImageIcon size={14} /> C) Single Background Image
              </span>
              <p className="text-[11px] text-zinc-400">
                PNG, JPG, WebP, or SVG (minimum 1600px wide, max 5 MB).
              </p>
              <div className="p-2.5 bg-zinc-950 rounded-lg text-[11px] space-y-1">
                <div className="text-zinc-300 font-semibold">Smart Layout Rules:</div>
                <div className="text-zinc-400">• Day cards alternate 3:2 photos left/right</div>
                <div className="text-zinc-400">• 1-3 day packages merge to single page</div>
                <div className="text-zinc-400">• Dynamic 30% page-fill injects trust blocks</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Theme Status Bar */}
      <div className="bg-gradient-to-r from-[#14142B] to-[#1c1d38] border border-orange-500/20 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-[#FF6B35]">
            <Star size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                Live Active Theme Today
              </span>
              {activeResolvedTheme?.isDefault || activeResolvedTheme?.is_default ? (
                <span className="text-[10px] font-bold text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">
                  System Default
                </span>
              ) : null}
            </div>
            <h2 className="text-lg font-bold text-white mt-0.5">
              {activeResolvedTheme?.name || 'Kingsland Brand Default'}
            </h2>
            <p className="text-xs text-zinc-400">
              Festival: <strong className="text-zinc-200">{activeResolvedTheme?.festival || 'Standard'}</strong> ·{' '}
              {(activeResolvedTheme?.startDate || activeResolvedTheme?.start_date) && (activeResolvedTheme?.endDate || activeResolvedTheme?.end_date)
                ? `Active window: ${activeResolvedTheme?.startDate || activeResolvedTheme?.start_date} to ${activeResolvedTheme?.endDate || activeResolvedTheme?.end_date}`
                : 'Active year-round'}
            </p>
          </div>
        </div>

        {activeResolvedTheme && (
          <button
            onClick={() => setPreviewTheme(activeResolvedTheme)}
            className="px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-[#FF6B35] hover:text-white border border-orange-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Eye size={14} />
            <span>Test Live Preview</span>
          </button>
        )}
      </div>

      {/* Themes Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Configured Themes</span>
            <span className="text-xs font-normal text-zinc-500">({themes.length})</span>
          </h2>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {isLoading ? (
          <div className="p-16 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-[#FF6B35]" /> Loading PDF themes...
          </div>
        ) : themes.length === 0 ? (
          <div className="p-16 bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl text-center space-y-3">
            <FileArchive className="w-12 h-12 text-zinc-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">No Themes Configured Yet</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Upload your first festival theme pack (e.g. Diwali, Holi) or artwork template to customize your PDF proposals.
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-[#FF6B35] text-white rounded-xl text-xs font-bold"
            >
              Upload Theme
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {themes.map(t => {
              const isDefaultTheme = Boolean(t.isDefault || t.is_default);
              const isActive = t.status === 'active';
              const isArchived = t.status === 'archived';
              const coverImg = t.coverPreviewUrl || t.cover_preview_url;

              return (
                <div
                  key={t.id}
                  className={`bg-zinc-900/70 border ${
                    isDefaultTheme
                      ? 'border-[#FF6B35]/50 ring-1 ring-[#FF6B35]/20'
                      : 'border-zinc-800'
                  } rounded-2xl overflow-hidden flex flex-col justify-between hover:border-zinc-700 transition-all`}
                >
                  {/* Card Thumbnail / Header */}
                  <div className="relative h-44 bg-gradient-to-br from-[#14142B] to-[#252545] flex items-center justify-center overflow-hidden border-b border-zinc-800/80">
                    {coverImg ? (
                      <img
                        src={coverImg}
                        alt={t.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-6 space-y-2">
                        <div className="w-12 h-12 mx-auto rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#FF6B35]">
                          {t.type === 'pack' ? (
                            <FileArchive size={22} />
                          ) : t.type === 'artwork' ? (
                            <FileText size={22} />
                          ) : (
                            <ImageIcon size={22} />
                          )}
                        </div>
                        <span className="text-xs font-semibold text-zinc-300 block">
                          {t.festival || 'Theme Template'}
                        </span>
                      </div>
                    )}

                    {/* Status & Type Badges */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-xs text-orange-300 border border-orange-500/30 uppercase tracking-wide">
                        {t.type.toUpperCase()}
                      </span>
                      {isDefaultTheme && (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FF6B35] text-white shadow-sm flex items-center gap-1">
                          <Star size={10} /> Default
                        </span>
                      )}
                    </div>

                    <div className="absolute top-3 right-3">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-emerald-500/90 text-white'
                            : isArchived
                            ? 'bg-zinc-700 text-zinc-300'
                            : 'bg-amber-500/90 text-black'
                        }`}
                      >
                        {t.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Festival pill at bottom */}
                    <div className="absolute bottom-2 left-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-zinc-200 border border-zinc-700/60">
                        {t.festival}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white line-clamp-1">{t.name}</h3>
                      <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
                        <Calendar size={12} className="text-[#FF6B35]" />
                        <span>
                          {(t.startDate || t.start_date) && (t.endDate || t.end_date)
                            ? `${t.startDate || t.start_date} → ${t.endDate || t.end_date}`
                            : 'Permanent / Year-Round'}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-1.5">
                      <button
                        onClick={() => setPreviewTheme(t)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Live Sample Preview"
                      >
                        <Eye size={13} />
                        <span>Preview</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {!isDefaultTheme && (
                          <button
                            onClick={() => handleSetDefault(t)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-amber-400/10 transition-colors cursor-pointer"
                            title="Set as Default Theme"
                          >
                            <Star size={14} />
                          </button>
                        )}

                        {isActive ? (
                          <button
                            onClick={() => handleArchive(t)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                            title="Archive Theme"
                          >
                            <Archive size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(t)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors cursor-pointer"
                            title="Activate Theme"
                          >
                            <Check size={14} />
                          </button>
                        )}

                        {!isDefaultTheme && (
                          <button
                            onClick={() => handleDelete(t)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-400/10 transition-colors cursor-pointer"
                            title="Delete Theme"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[#14142B] border border-orange-500/30 rounded-2xl shadow-2xl w-full max-w-xl p-6 my-8 animate-in zoom-in-95 duration-200 space-y-5 text-zinc-200">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FF6B35]/20 text-[#FF6B35] flex items-center justify-center">
                  <Upload size={16} />
                </div>
                <h3 className="text-base font-bold text-white">Upload New PDF Theme</h3>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  resetUploadForm();
                }}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0 text-rose-400" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Theme Type Selector */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Theme Format Type *
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setUploadType('pack')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      uploadType === 'pack'
                        ? 'border-[#FF6B35] bg-orange-500/10 text-white'
                        : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <FileArchive size={16} className="text-[#FF6B35] mb-1" />
                    <div className="font-bold text-xs">Theme Pack</div>
                    <div className="text-[10px] text-zinc-500">.zip archive (max 20MB)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUploadType('artwork')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      uploadType === 'artwork'
                        ? 'border-[#FF6B35] bg-orange-500/10 text-white'
                        : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <FileText size={16} className="text-[#FF6B35] mb-1" />
                    <div className="font-bold text-xs">Artwork PDF</div>
                    <div className="text-[10px] text-zinc-500">Strictly 3 pages A4</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUploadType('image')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      uploadType === 'image'
                        ? 'border-[#FF6B35] bg-orange-500/10 text-white'
                        : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <ImageIcon size={16} className="text-[#FF6B35] mb-1" />
                    <div className="font-bold text-xs">Single Image</div>
                    <div className="text-[10px] text-zinc-500">Cover backdrop (5MB)</div>
                  </button>
                </div>
              </div>

              {/* Theme Name */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  Theme Name *
                </label>
                <input
                  type="text"
                  required
                  value={themeName}
                  onChange={e => setThemeName(e.target.value)}
                  placeholder="e.g. Diwali Dhamaka 2026 / Winter Snow Elegance"
                  className="w-full bg-zinc-950 border border-zinc-700 focus:border-[#FF6B35] rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                />
              </div>

              {/* Festival / Occasion */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Festival / Occasion *
                  </label>
                  <select
                    value={festival}
                    onChange={e => setFestival(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 focus:border-[#FF6B35] rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                  >
                    {FESTIVAL_PRESETS.map(f => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                {festival === 'Other' && (
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1">
                      Custom Festival Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={customFestival}
                      onChange={e => setCustomFestival(e.target.value)}
                      placeholder="e.g. Valentine Escapes"
                      className="w-full bg-zinc-950 border border-zinc-700 focus:border-[#FF6B35] rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Active Date Window */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Active Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 focus:border-[#FF6B35] rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1">
                    Active End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 focus:border-[#FF6B35] rounded-xl px-3.5 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>

              {/* Set as Default Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isDefaultCheckbox"
                  checked={isDefault}
                  onChange={e => setIsDefault(e.target.checked)}
                  className="rounded border-zinc-700 text-[#FF6B35] focus:ring-[#FF6B35] cursor-pointer"
                />
                <label htmlFor="isDefaultCheckbox" className="text-xs text-zinc-300 cursor-pointer">
                  Set as default fallback theme when no active festival window applies
                </label>
              </div>

              {/* Drag and Drop File Picker */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">
                  File Upload *
                </label>
                <div
                  onDragOver={e => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-[#FF6B35] bg-orange-500/10'
                      : selectedFile
                      ? 'border-emerald-500/50 bg-emerald-500/5'
                      : 'border-zinc-700 bg-zinc-950/60 hover:border-zinc-500'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept={
                      uploadType === 'pack'
                        ? '.zip'
                        : uploadType === 'artwork'
                        ? '.pdf'
                        : '.png,.jpg,.jpeg,.webp,.svg'
                    }
                    onChange={handleFileSelect}
                  />

                  {selectedFile ? (
                    <div className="space-y-1">
                      <CheckCircle2 size={28} className="text-emerald-400 mx-auto" />
                      <div className="text-xs font-bold text-white">{selectedFile.name}</div>
                      <div className="text-[10px] text-zinc-400">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Click to choose different file
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Upload size={28} className="text-[#FF6B35] mx-auto" />
                      <div className="text-xs font-bold text-white">
                        Drag and drop your file here, or browse
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {uploadType === 'pack'
                          ? 'Accepts .zip (containing theme.json, cover.html, page.html, styles.css)'
                          : uploadType === 'artwork'
                          ? 'Accepts portrait A4 PDF (strictly 3 pages: cover, inner, closing)'
                          : 'Accepts JPG, PNG, WebP, SVG (min 1600px width)'}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {isUploading && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>Validating & processing theme...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#FF6B35] to-[#D9582B] transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Footer actions */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => {
                    setShowUploadModal(false);
                    resetUploadForm();
                  }}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="px-5 py-2 bg-gradient-to-r from-[#FF6B35] to-[#D9582B] hover:opacity-95 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-500/20 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isUploading ? <RefreshCw size={13} className="animate-spin" /> : <Upload size={13} />}
                  <span>{isUploading ? 'Uploading...' : 'Save & Upload Theme'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIVE PREVIEW MODAL */}
      {previewTheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#14142B] border border-orange-500/30 rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden text-zinc-200 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4 bg-black/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-[#FF6B35] flex items-center justify-center font-bold">
                  <Eye size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{previewTheme.name}</span>
                    <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      {previewTheme.festival}
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Live HTML preview rendered with 30% page-fill logic and alternating day cards.
                  </p>
                </div>
              </div>

              {/* Sample Package Duration Switcher */}
              <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-500 uppercase px-2">Sample Days:</span>
                {([1, 3, 7, 15] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setPreviewDays(d)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      previewDays === d
                        ? 'bg-[#FF6B35] text-white shadow-xs'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    {d} {d === 1 ? 'Day' : 'Days'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadSamplePdf}
                  disabled={isDownloadingPdf}
                  className="px-4 py-2 bg-gradient-to-r from-[#FF6B35] to-[#D9582B] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-orange-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isDownloadingPdf ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <Download size={13} />
                  )}
                  <span>{isDownloadingPdf ? 'Rendering PDF...' : 'Download Sample PDF'}</span>
                </button>
                <button
                  onClick={() => setPreviewTheme(null)}
                  className="p-2 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body / Iframe */}
            <div className="flex-1 bg-zinc-950/90 relative overflow-hidden flex items-center justify-center p-4">
              {isLoadingPreview ? (
                <div className="text-center space-y-2">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#FF6B35] mx-auto" />
                  <p className="text-xs text-zinc-400">Rendering preview for {previewDays}-day itinerary...</p>
                </div>
              ) : (
                <iframe
                  title="PDF Preview"
                  srcDoc={previewHtml}
                  className="w-full h-full rounded-xl bg-white shadow-2xl border border-zinc-800"
                  sandbox="allow-same-origin"
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-2.5 bg-black/60 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
              <div className="flex items-center gap-4">
                <span>
                  ✓ Page-fill logic: empty spaces &gt; 30% filled with trust/highlights blocks
                </span>
                <span>✓ Short trips (≤3 days): merged overview &amp; day cards</span>
              </div>
              <button
                onClick={() => setPreviewTheme(null)}
                className="text-zinc-300 hover:text-white underline cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfThemesView;
