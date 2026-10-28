import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Trash2, X, Upload, Building2, Globe, Sparkles, Check } from 'lucide-react';
import { fetchPartnerBrands, createPartnerBrand, deletePartnerBrand } from '../services/apiService';
import { PartnerBrand, HOTEL_PARTNERS, TRAVEL_PARTNERS, renderPartnerBadgeHtml } from '../utils/partnerLogos';

interface PartnerBrandsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPartnersUpdated?: () => void;
}

export const PartnerBrandsModal: React.FC<PartnerBrandsModalProps> = ({
  isOpen,
  onClose,
  onPartnersUpdated
}) => {
  const [partners, setPartners] = useState<PartnerBrand[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'hotel' | 'travel'>('all');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'hotel' | 'travel'>('hotel');
  const [tagline, setTagline] = useState('');
  const [brandColor, setBrandColor] = useState('#B8860B');
  const [logoUrl, setLogoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPartners();
    }
  }, [isOpen]);

  const loadPartners = async () => {
    setLoading(true);
    try {
      const data = await fetchPartnerBrands();
      // Combine with defaults if DB is initially empty
      if (!data || data.length === 0) {
        setPartners([...HOTEL_PARTNERS, ...TRAVEL_PARTNERS]);
      } else {
        setPartners(data);
      }
    } catch (err) {
      console.error('Failed to load partners:', err);
      setPartners([...HOTEL_PARTNERS, ...TRAVEL_PARTNERS]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, SVG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setLogoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a partner brand name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newPartner = await createPartnerBrand({
        name: name.trim(),
        category,
        tagline: tagline.trim() || (category === 'hotel' ? 'Hotel Partner' : 'Working Partner'),
        brand_color: brandColor,
        logo_url: logoUrl.trim()
      });

      setPartners(prev => [newPartner, ...prev]);
      setShowAddForm(false);
      setName('');
      setTagline('');
      setLogoUrl('');
      if (onPartnersUpdated) onPartnersUpdated();
    } catch (err) {
      console.error('Failed to add partner:', err);
      alert('Failed to add partner.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePartner = async (id: string) => {
    if (!confirm('Are you sure you want to remove this partner brand?')) return;
    try {
      await deletePartnerBrand(id);
      setPartners(prev => prev.filter(p => p.id !== id));
      if (onPartnersUpdated) onPartnersUpdated();
    } catch (err) {
      console.error('Failed to delete partner:', err);
    }
  };

  const filteredPartners = partners.filter(p => {
    if (activeTab === 'all') return true;
    return p.category === activeTab;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[220] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl max-h-[92vh] rounded-xl bg-surface border border-line shadow-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-canvas border-b border-line flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning-soft border border-warning-line flex items-center justify-center text-warning-ink ">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-content dark:text-zinc-100 flex items-center gap-2">
                <span>Working Partners & Hotel Partners</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-warning-soft text-warning-ink ">
                  Proposal Badges
                </span>
              </h3>
              <p className="text-sm text-secondary ">
                Manage partner logos and names shown on Proposal Terms pages and PDFs
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-muted hover:text-content dark:hover:text-zinc-200 bg-surface border border-line cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar & Filters */}
        <div className="px-6 py-3 bg-surface border-b border-line flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {(['all', 'hotel', 'travel'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-1.5 rounded-xl text-sm font-bold transition-all cursor-pointer capitalize ${
                  activeTab === tab
                    ? 'bg-inverse text-white shadow-xs'
                    : 'bg-subtle text-secondary hover:bg-hover '
                }`}
              >
                {tab === 'all' ? 'All Partners' : tab === 'hotel' ? 'Hotel Partners' : 'Working / Travel Partners'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3.5 py-1.5 rounded-xl bg-brand hover:bg-brand text-on-brand text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 stroke-[3]" />}
            <span>{showAddForm ? 'Cancel' : 'Add New Partner'}</span>
          </button>
        </div>

        {/* Add Partner Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddPartner}
            className="p-5 bg-warning-soft/40 border-b border-warning-line space-y-4 shrink-0"
          >
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">
                  Partner Brand Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hyatt, Club Mahindra, MakeMyTrip"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-line text-sm font-medium focus:ring-2 focus:ring-warning-line outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-line text-sm font-semibold focus:ring-2 focus:ring-warning-line outline-none"
                >
                  <option value="hotel">Hotel Partner Network</option>
                  <option value="travel">Working / Travel Partner</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">
                  Tagline / Subtitle
                </label>
                <input
                  type="text"
                  placeholder="e.g. Luxury Stays, Verified Partner"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-line text-sm font-medium focus:ring-2 focus:ring-warning-line outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">
                  Brand Color Accent
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-9 h-9 p-0.5 rounded-lg border border-line cursor-pointer"
                  />
                  <input
                    type="text"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-24 px-2 py-1.5 rounded-lg bg-surface border border-line text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">
                  Brand Logo Image (PNG / SVG / JPG)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste image URL or browse local file"
                    value={logoUrl.startsWith('data:') ? '[Local Logo Loaded]' : logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-surface border border-line text-sm font-medium focus:ring-2 focus:ring-warning-line outline-none truncate"
                  />
                  <label className="px-3 py-2 rounded-xl bg-hover hover:bg-hover text-content dark:text-zinc-200 text-sm font-bold cursor-pointer flex items-center gap-1.5 shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Logo</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="px-3 py-2 rounded-xl bg-danger-soft hover:bg-danger-soft text-danger-ink border border-danger-line text-sm font-bold cursor-pointer flex items-center gap-1"
                      title="Delete / Clear logo image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-xl bg-subtle text-content dark:text-zinc-300 text-sm font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-warning-strong hover:bg-warning-strong text-white text-sm font-semibold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Saving...' : 'Save Partner'}
                </button>
              </div>
            </div>

            {/* Live badge preview */}
            {name && (
              <div className="p-3 bg-surface rounded-xl border border-line flex items-center gap-3">
                <span className="text-sm font-bold text-secondary ">Badge Live Preview:</span>
                <div
                  dangerouslySetInnerHTML={{
                    __html: renderPartnerBadgeHtml({
                      id: 'preview',
                      name,
                      category,
                      tagline: tagline || (category === 'hotel' ? 'Hotel Partner' : 'Working Partner'),
                      brandColor,
                      logoUrl
                    })
                  }}
                />
              </div>
            )}
          </form>
        )}

        {/* Partners Grid */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted">
              <div className="w-8 h-8 border-3 border-warning-line border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold">Loading partner brands...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {filteredPartners.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-surface border border-line shadow-2xs hover:shadow-sm transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Render badge icon */}
                    <div
                      className="shrink-0"
                      dangerouslySetInnerHTML={{
                        __html: renderPartnerBadgeHtml(item)
                      }}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-content dark:text-zinc-200 truncate">{item.name}</span>
                      <span className="text-xs text-muted capitalize">{item.category} partner</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeletePartner(item.id)}
                    className="p-2 rounded-xl text-slate-300 hover:text-danger-ink hover:bg-danger-soft opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    title="Remove partner brand"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-canvas border-t border-line flex items-center justify-between text-sm text-secondary ">
          <span>{filteredPartners.length} partners displayed</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-inverse hover:bg-inverse text-white font-bold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
