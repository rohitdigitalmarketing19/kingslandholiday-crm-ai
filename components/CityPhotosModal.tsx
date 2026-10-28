import React, { useState, useEffect, useMemo } from 'react';
import { Search, Upload, Image as ImageIcon, Check, X, Trash2, MapPin, Plus } from 'lucide-react';
import {
  fetchDestinationPhotos,
  createDestinationPhoto,
  deleteDestinationPhoto,
  DestinationPhotoItem
} from '../services/apiService';
import { compressImageFile } from '../utils/imageCompressor';

export interface CityPhotosModalProps {
  isOpen: boolean;
  onClose: () => void;
  destinationCity?: string;
  totalDays?: number;
  targetDay?: number | null; // e.g. 1, 2, 3... for Day-wise pick mode
  mode?: 'manage' | 'pick';  // 'pick' when choosing for itinerary day, 'manage' in PDF Design library
  onSelectPhoto?: (imageUrl: string) => void;
  onSelectPhotoWithTarget?: (target: 'cover' | number, imageUrl: string) => void;
}

export const CityPhotosModal: React.FC<CityPhotosModalProps> = ({
  isOpen,
  onClose,
  destinationCity = '',
  totalDays = 5,
  targetDay = null,
  mode = 'manage',
  onSelectPhoto,
  onSelectPhotoWithTarget
}) => {
  const [photos, setPhotos] = useState<DestinationPhotoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<'cover' | number>(targetDay || 'cover');
  const [showUploadForm, setShowUploadForm] = useState(false);

  // New photo form state
  const [newCity, setNewCity] = useState(destinationCity || '');
  const [newTitle, setNewTitle] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newTags, setNewTags] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      loadPhotos(''); // Always load ALL saved photos immediately on open
      if (targetDay !== null && targetDay !== undefined) {
        setSelectedTarget(targetDay);
      }
    }
  }, [isOpen, targetDay]);

  const loadPhotos = async (cityQuery: string = '') => {
    setLoading(true);
    try {
      const data = await fetchDestinationPhotos(cityQuery.trim());
      setPhotos(data || []);
    } catch (err) {
      console.error('Failed to load destination photos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time instant filtering as user types or picks a city
  const displayedPhotos = useMemo(() => {
    if (!searchQuery.trim()) return photos;
    const q = searchQuery.toLowerCase().trim();
    return photos.filter(p =>
      (p.city && p.city.toLowerCase().includes(q)) ||
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.tags && p.tags.toLowerCase().includes(q))
    );
  }, [photos, searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      loadPhotos(searchQuery);
    } else {
      loadPhotos('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WebP).');
      return;
    }

    try {
      const compressed = await compressImageFile(file, { maxWidth: 1200, maxHeight: 900, quality: 0.85 });
      setNewImageUrl(compressed);
      if (!newTitle.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setNewTitle(cleanName);
      }
    } catch (err) {
      console.error('Error compressing image:', err);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setNewImageUrl(reader.result);
          if (!newTitle.trim()) {
            const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
            setNewTitle(cleanName);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCustomPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImageUrl.trim()) {
      alert('Please upload an image file or enter an image URL.');
      return;
    }

    setIsUploading(true);
    try {
      const cityVal = newCity.trim() || destinationCity.trim() || 'Custom Destination';
      const titleVal = newTitle.trim() || `${cityVal} Photo`;

      const created = await createDestinationPhoto({
        city: cityVal,
        title: titleVal,
        image_url: newImageUrl.trim(),
        tags: newTags.trim() || cityVal
      });

      setPhotos(prev => [created, ...prev]);
      setShowUploadForm(false);
      setNewImageUrl('');
      setNewTitle('');
      setNewTags('');

      // If in pick mode, automatically select newly uploaded photo
      if (mode === 'pick' && onSelectPhoto) {
        onSelectPhoto(created.image_url);
        onClose();
        return;
      }
    } catch (err) {
      console.error('Error saving photo:', err);
      alert('Failed to save photo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this photo?')) return;
    try {
      await deleteDestinationPhoto(id);
      setPhotos(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error deleting photo:', err);
    }
  };

  const handleApplyPhoto = (photoUrl: string) => {
    if (mode === 'pick' && onSelectPhoto) {
      onSelectPhoto(photoUrl);
      onClose();
      return;
    }

    if (onSelectPhotoWithTarget) {
      onSelectPhotoWithTarget(selectedTarget, photoUrl);
      alert(
        selectedTarget === 'cover'
          ? 'Cover hero photo updated!'
          : `Day ${selectedTarget} itinerary photo updated!`
      );
    } else if (onSelectPhoto) {
      onSelectPhoto(photoUrl);
      onClose();
    }
  };

  if (!isOpen) return null;

  const isPickMode = mode === 'pick';

  return (
    <div className="fixed inset-0 z-[220] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl max-h-[92vh] rounded-xl bg-surface border border-line shadow-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-canvas border-b border-line flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-soft border border-brand-line flex items-center justify-center text-brand-ink ">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-content dark:text-zinc-100 flex items-center gap-2">
                <span>{isPickMode ? `Select Photo for Day ${targetDay || 1}` : 'Destination & City Photo Library'}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-soft text-brand-ink ">
                  {isPickMode ? 'Click to Attach' : 'Saved Photos & Upload'}
                </span>
              </h3>
              <p className="text-sm text-secondary ">
                {isPickMode
                  ? 'Search by city name or title and click to attach this photo to Day ' + (targetDay || 1)
                  : 'Add and organize destination photos used in day-wise proposal PDFs'}
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

        {/* Target Selector Toolbar (shown in manage mode) */}
        {!isPickMode && (
          <div className="px-6 py-3 bg-surface border-b border-line flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold uppercase tracking-wider text-secondary ">
                Preview Target:
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                <button
                  type="button"
                  onClick={() => setSelectedTarget('cover')}
                  className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                    selectedTarget === 'cover'
                      ? 'bg-brand text-white shadow-xs'
                      : 'bg-subtle text-content dark:text-zinc-300 hover:bg-hover '
                  }`}
                >
                  Cover Hero
                </button>
                {Array.from({ length: totalDays }).map((_, idx) => {
                  const dayNum = idx + 1;
                  return (
                    <button
                      key={dayNum}
                      type="button"
                      onClick={() => setSelectedTarget(dayNum)}
                      className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                        selectedTarget === dayNum
                          ? 'bg-brand text-white shadow-xs'
                          : 'bg-subtle text-content dark:text-zinc-300 hover:bg-hover '
                      }`}
                    >
                      Day {dayNum}
                    </button>
                  );
                })}
              </div>

              {/* Delete / Remove Image from Target button */}
              <button
                type="button"
                onClick={() => {
                  if (onSelectPhotoWithTarget) {
                    onSelectPhotoWithTarget(selectedTarget, '');
                  } else if (onSelectPhoto) {
                    onSelectPhoto('');
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-danger-soft hover:bg-danger-soft text-danger-ink border border-danger-line text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ml-1"
                title={`Remove attached image from ${selectedTarget === 'cover' ? 'Cover Hero' : `Day ${selectedTarget}`}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Image from {selectedTarget === 'cover' ? 'Cover' : `Day ${selectedTarget}`}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="px-3.5 py-1.5 rounded-xl bg-brand hover:bg-brand text-on-brand text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              {showUploadForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 stroke-[3]" />}
              <span>{showUploadForm ? 'Cancel' : 'Add New Photo'}</span>
            </button>
          </div>
        )}

        {/* When in pick mode, allow uploading as well as removing current image */}
        {isPickMode && (
          <div className="px-6 py-2.5 bg-brand-soft/50 border-b border-brand-line flex items-center justify-between gap-3">
            <span className="text-sm text-brand-ink font-bold">
              Tip: Click any photo below to attach to Day {targetDay || 1}, or click Remove Image to use default artwork.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (onSelectPhoto) onSelectPhoto('');
                  onClose();
                }}
                className="px-3 py-1 rounded-xl bg-danger-soft hover:bg-danger-soft text-danger-ink text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Remove attached image and use default scenic artwork"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Image</span>
              </button>
              <button
                type="button"
                onClick={() => setShowUploadForm(!showUploadForm)}
                className="px-3 py-1 rounded-xl bg-brand hover:bg-brand text-white text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {showUploadForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 stroke-[3]" />}
                <span>{showUploadForm ? 'Cancel Upload' : 'Upload New Photo'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Upload Form Accordion */}
        {showUploadForm && (
          <form
            onSubmit={handleSaveCustomPhoto}
            className="p-5 bg-brand-soft/50 border-b border-brand-line space-y-4 shrink-0"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">
                  City / Destination Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Manali, Kashmir, Goa, Jaipur"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-line text-sm font-medium focus:ring-2 focus:ring-brand-line outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">
                  Photo Title / Landmark *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hadimba Temple, Solang Snow Peaks, Dal Lake"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-line text-sm font-medium focus:ring-2 focus:ring-brand-line outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1">
                  Choose Photo File or Paste Image URL *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://... or click browse"
                    value={newImageUrl.startsWith('data:') ? '[Local Image Loaded]' : newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-surface border border-line text-sm font-medium focus:ring-2 focus:ring-brand-line outline-none truncate"
                  />
                  <label className="px-3.5 py-2 rounded-xl bg-hover hover:bg-hover text-content dark:text-zinc-200 text-sm font-bold cursor-pointer flex items-center gap-1.5 shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Browse</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                  {newImageUrl && (
                    <button
                      type="button"
                      onClick={() => setNewImageUrl('')}
                      className="px-3 py-2 rounded-xl bg-danger-soft hover:bg-danger-soft text-danger-ink border border-danger-line text-sm font-bold cursor-pointer flex items-center gap-1"
                      title="Delete / Clear chosen image"
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
                  onClick={() => setShowUploadForm(false)}
                  className="px-4 py-2 rounded-xl bg-subtle text-content dark:text-zinc-300 text-sm font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 rounded-xl bg-brand hover:bg-brand text-white text-sm font-semibold shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isUploading ? 'Saving...' : 'Save Photo to Library'}
                </button>
              </div>
            </div>

            {newImageUrl && (
              <div className="flex items-center justify-between gap-3 p-2.5 bg-surface rounded-xl border border-line ">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={newImageUrl}
                    alt="Preview"
                    className="w-16 h-12 object-cover rounded-lg border border-line shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-content dark:text-zinc-200 truncate block">
                      {newTitle || 'Ready to save'}
                    </span>
                    <span className="text-xs text-muted truncate block">
                      Destination: {newCity || 'Default'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNewImageUrl('')}
                  className="px-2.5 py-1.5 rounded-lg bg-danger-soft hover:bg-danger-soft text-danger-ink text-sm font-bold flex items-center gap-1 cursor-pointer shrink-0"
                  title="Remove image"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Image</span>
                </button>
              </div>
            )}
          </form>
        )}

        {/* Search Bar */}
        <div className="px-6 py-3 bg-canvas/70 border-b border-line flex items-center gap-3 shrink-0">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search via city name or title (e.g. Manali, Kashmir, Goa, Kerala, Jaipur)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-surface border border-line text-sm font-medium focus:ring-2 focus:ring-brand-line outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-secondary rounded-md cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-brand hover:bg-brand text-white text-sm font-bold cursor-pointer transition-colors"
            >
              Search
            </button>
          </form>

          {/* Quick city filter pills */}
          <div className="hidden lg:flex items-center gap-1.5">
            {['All', destinationCity, 'Kashmir', 'Manali', 'Goa', 'Kerala', 'Jaipur', 'Ladakh']
              .filter(Boolean)
              .filter((c, idx, arr) => arr.indexOf(c) === idx)
              .map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    const q = c === 'All' ? '' : c;
                    setSearchQuery(q);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    (c === 'All' && !searchQuery) || searchQuery.toLowerCase() === c.toLowerCase()
                      ? 'bg-inverse text-white shadow-xs'
                      : 'bg-surface text-secondary hover:bg-subtle '
                  }`}
                >
                  {c}
                </button>
              ))}
          </div>
        </div>

        {/* Photos Grid */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted">
              <div className="w-8 h-8 border-3 border-brand-line border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold">Loading destination photos...</span>
            </div>
          ) : displayedPhotos.length === 0 ? (
            <div className="py-16 text-center text-muted space-y-3">
              <MapPin className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
              <p className="text-sm font-bold text-content dark:text-zinc-300">
                No photos found matching "{searchQuery}"
              </p>
              <p className="text-sm text-secondary max-w-sm mx-auto">
                Clear the search query to see all saved photos or upload a new photo above.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  loadPhotos('');
                }}
                className="px-4 py-2 rounded-xl bg-brand-soft hover:bg-brand-soft text-brand-ink text-sm font-bold cursor-pointer transition-colors"
              >
                Show All Saved Photos ({photos.length})
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {displayedPhotos.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleApplyPhoto(item.image_url)}
                  className="group relative rounded-xl overflow-hidden border border-line bg-surface shadow-2xs hover:shadow-sm transition-all flex flex-col cursor-pointer"
                >
                  <div className="relative aspect-video overflow-hidden bg-subtle ">
                    <img
                      src={item.image_url}
                      alt={item.title || item.city}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent opacity-80" />

                    <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-xs font-bold flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-brand-ink" />
                      <span>{item.city}</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDelete(item.id, e)}
                      className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 hover:bg-danger-strong text-white transition-colors cursor-pointer opacity-80 group-hover:opacity-100"
                      title="Delete photo from library"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
                      <p className="text-xs font-bold truncate drop-shadow-sm">{item.title || item.city}</p>
                    </div>
                  </div>

                  <div className="p-3 bg-surface flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-muted truncate">
                      {item.city}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplyPhoto(item.image_url);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-brand-soft hover:bg-brand text-brand-ink hover:text-white dark:hover:text-white text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>
                        {isPickMode ? `Add to Day ${targetDay || 1}` : 'Apply'}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-canvas border-t border-line flex items-center justify-between text-sm text-secondary ">
          <span>{photos.length} destination photos in library</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-inverse hover:bg-inverse text-white font-bold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
