import React, { useState, useEffect } from "react";
import {
  FileText,
  CheckCircle2,
  Sparkles,
  Eye,
  Check,
  Calendar,
  Layers,
  ShieldCheck,
  X,
  Compass,
  ArrowRight,
  ExternalLink,
  Image as ImageIcon,
  Download,
  Building2,
  Plus,
  Upload,
  Search,
  Trash2,
  MapPin
} from "lucide-react";
import * as api from "../services/apiService";
import { DestinationPhotoItem } from "../services/apiService";
import {
  QuoteDataModel,
  AVAILABLE_QUOTE_DESIGNS,
  renderCompleteProposalHtml
} from "../services/quoteDesignRenderer";
import { CityPhotosModal } from "./CityPhotosModal";
import { PartnerBrandsModal } from "./PartnerBrandsModal";
import { exportElementToPdf } from "../utils/pdfExport";
import { PartnerBrand } from "../utils/partnerLogos";
import { compressImageFile } from "../utils/imageCompressor";

export interface PdfDesign {
  id: string;
  title: string;
  page_count: number;
  field_mappings: string;
  theme_preset?: string;
  primary_color?: string;
  secondary_color?: string;
  font_family?: string;
  cover_style?: string;
  is_active: number;
  created_at: string;
}

// Sample rich demonstration data matching Kingsland-Quote-Designs.html
const SAMPLE_QUOTE_DATA: QuoteDataModel = {
  client: "Mrs. Insha Ali",
  ref: "KL-1001",
  packageName: "Himachal Royal Odyssey",
  longDuration: "4 Nights / 5 Days",
  duration: "4N / 5D",
  city: "Manali",
  services: "Cab, Hotel, Sightseeing",
  travellers: "6 Adults",
  priceNote: "Private Vehicle & Handpicked Stays",
  price: "₹52,500",
  hotel: {
    nights: "Night 1 & 2",
    name: "Hotel Katson Blue",
    type: "Premium Resort",
    room: "Deluxe Himalayan View",
    rooms: "3 Rooms for 6 Adults with breakfast & dinner",
    city: "Manali"
  },
  hotels: [
    {
      nights: "Night 1 & 2",
      name: "Hotel Katson Blue",
      type: "Premium Resort",
      room: "Deluxe Himalayan View",
      rooms: "3 Rooms for 6 Adults with breakfast & dinner",
      city: "Manali"
    },
    {
      nights: "Night 3 & 4",
      name: "Radisson Shimla Valley",
      type: "5 Star Luxury",
      room: "Superior Cedar Valley Suite",
      rooms: "3 Rooms for 6 Adults with breakfast & dinner",
      city: "Shimla"
    }
  ],
  advisor: {
    name: "MOHIT AHLAWAT",
    role: "Senior Trip Advisor",
    phones: "+91 6376983416 · +91 7014939068",
    email: "official.kingslandholidays@gmail.com"
  },
  stats: [
    ["12,000+", "Trips delivered"],
    ["4.8/5", "2,140+ reviews"],
    ["98%", "Super reviews"],
    ["11 Yrs", "In operation"]
  ],
  included: [
    "Accommodation on double sharing",
    "Breakfast & dinner at all hotels",
    "Airport / station pickup & drop",
    "All sightseeing by private Innova Crysta",
    "All taxes, VAT & service charges",
    "All toll taxes and state permits",
    "Dedicated 24/7 trip coordinator",
    "Driver allowance and parking fees"
  ],
  excluded: [
    "Personal expenses (laundry, beverages)",
    "Optional adventure tours & activities",
    "Airfare / train tickets",
    "GST as applicable",
    "Tips to driver & guides"
  ],
  note: "Rohtang Pass (if open) can replace Sissu: the Sissu visit is removed and an additional ₹2,000 applies.",
  days: [
    {
      title: "Arrival in Delhi – Transfer to Manali",
      text: "Arrive in Delhi as per scheduled arrival time. Meet our representative and proceed towards Manali by private vehicle, enjoying the scenic journey through the Himalayan mountains. Check in to hotel and relax. Evening at leisure.",
      img: ""
    },
    {
      title: "Manali Local Sightseeing & Springs",
      text: "After breakfast, proceed for a full-day local tour of Manali. Visit Hadimba Devi Temple, Vashisht Hot Water Springs, Van Vihar, Tibetan Monastery and Mall Road for shopping.",
      img: ""
    },
    {
      title: "Kullu & Naggar Castle Excursion",
      text: "Excursion to Kullu and historic Naggar Castle. Enjoy scenic views of the Beas River valley and explore world-famous Kullu shawls and woollens. Return to Manali for dinner.",
      img: ""
    },
    {
      title: "Solang Valley & Sissu Snow Tour",
      text: "Proceed towards Solang Valley for alpine mountain views and snow adventures. Continue through the Atal Tunnel to Sissu in Lahaul Valley. Evening return to hotel.",
      img: ""
    },
    {
      title: "Manali – Delhi Departure",
      text: "Breakfast and check-out from hotel. Scenic return drive to Delhi with drop-off at Airport / Railway Station for onward journey with cherished memories.",
      img: ""
    }
  ]
};

const DESIGN_METADATA: Record<string, {
  previewGradient: string;
  textColor: string;
  accentBadge: string;
  paletteColors: string[];
  features: string[];
}> = {
  royal: {
    previewGradient: "linear-gradient(135deg, #12213f 0%, #1f3a6b 60%, #d4af37 100%)",
    textColor: "#ffffff",
    accentBadge: "#d4af37",
    paletteColors: ["#12213f", "#d4af37", "#fdfbf6", "#3b455f"],
    features: [
      "Regal dark navy mountain cover with gold foil accents",
      "Serif Playfair Display luxury typography",
      "Numbered golden circular timeline for day itinerary",
      "Official partner brand network with verified SVG badges"
    ]
  },
  alpine: {
    previewGradient: "linear-gradient(135deg, #0f4c4a 0%, #1a7470 50%, #f2a93b 100%)",
    textColor: "#ffffff",
    accentBadge: "#f2a93b",
    paletteColors: ["#0f4c4a", "#f2a93b", "#fbfdfc", "#a8d5cf"],
    features: [
      "Split two-tone mountain green sidebar layout",
      "Modern DM Serif Display with warm amber price stamp",
      "Two-column card grid with day badge tags",
      "Wide highlight departure banner and clean partner chips"
    ]
  },
  sunset: {
    previewGradient: "linear-gradient(135deg, #ff5e4d 0%, #ff8a3d 50%, #ffb347 100%)",
    textColor: "#ffffff",
    accentBadge: "#231f2b",
    paletteColors: ["#ff5e4d", "#ff8a3d", "#231f2b", "#fffaf6"],
    features: [
      "Vibrant sunset coral gradient with curved wave cover",
      "Circular all-inclusive price seal with floating shadow",
      "Alternating left-right image storytelling layout",
      "Modern Outfit display fonts and vivid inclusion checks"
    ]
  },
  editorial: {
    previewGradient: "linear-gradient(135deg, #111111 0%, #2a2825 70%, #e5431f 100%)",
    textColor: "#ffffff",
    accentBadge: "#e5431f",
    paletteColors: ["#111111", "#e5431f", "#f7f7f4", "#cfcfca"],
    features: [
      "High-contrast editorial newspaper / magazine layout",
      "Ultra-bold Bricolage Grotesque typography",
      "Geometric tabular accommodation matrix",
      "Minimalist black rules and architectural red accents"
    ]
  },
  playful: {
    previewGradient: "linear-gradient(135deg, #4a2fe0 0%, #7b5cf5 60%, #ffb996 100%)",
    textColor: "#ffffff",
    accentBadge: "#ffb996",
    paletteColors: ["#4a2fe0", "#ffb996", "#f8f6ff", "#3c2a8a"],
    features: [
      "Energetic violet & peach rounded modern design",
      "Playful Baloo 2 header typography with soft curves",
      "Tinted pastel day adventure cards with day chips",
      "Friendly bubble layout popular for leisure & family tours"
    ]
  }
};

export const PdfDesignsView: React.FC = () => {
  const [designs, setDesigns] = useState<PdfDesign[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");
  const [activatingId, setActivatingId] = useState<string | null>(null);

  // Full interactive preview modal
  const [previewDesignId, setPreviewDesignId] = useState<string | null>(null);
  const [previewPageTab, setPreviewPageTab] = useState<number>(1);

  // Photo & Partner modals
  const [isPhotosModalOpen, setIsPhotosModalOpen] = useState(false);
  const [isPartnersModalOpen, setIsPartnersModalOpen] = useState(false);
  const [isAddPhotoOpen, setIsAddPhotoOpen] = useState(false);
  const [newPhotoTitle, setNewPhotoTitle] = useState('');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [savedPhotos, setSavedPhotos] = useState<DestinationPhotoItem[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photoSearchFilter, setPhotoSearchFilter] = useState('');
  const [sampleCoverImage, setSampleCoverImage] = useState<string>('');
  const [sampleDayImages, setSampleDayImages] = useState<Record<number, string>>({});
  const [partnerBrandsList, setPartnerBrandsList] = useState<PartnerBrand[]>([]);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const modalPrintRef = React.useRef<HTMLDivElement>(null);

  const dynamicSampleQuote = React.useMemo<QuoteDataModel>(() => {
    return {
      ...SAMPLE_QUOTE_DATA,
      coverImage: sampleCoverImage || '',
      days: SAMPLE_QUOTE_DATA.days.map((d, i) => ({
        ...d,
        img: sampleDayImages[i] || d.img || ''
      }))
    };
  }, [sampleCoverImage, sampleDayImages]);

  const showMsg = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(""), 4000);
  };

  const loadDesigns = async () => {
    setLoading(true);
    try {
      const all = await api.fetchPdfDesigns();
      if (Array.isArray(all) && all.length > 0) {
        setDesigns(all);
      }
    } catch (err) {
      console.error("Error fetching PDF designs:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadPartners = async () => {
    try {
      const data = await api.fetchPartnerBrands();
      if (Array.isArray(data) && data.length > 0) {
        setPartnerBrandsList(data);
      }
    } catch (err) {
      console.error("Error fetching partner brands:", err);
    }
  };

  const loadPhotos = async () => {
    setPhotosLoading(true);
    try {
      const list = await api.fetchDestinationPhotos('');
      if (Array.isArray(list)) {
        setSavedPhotos(list);
      }
    } catch (err) {
      console.error("Error loading destination photos:", err);
    } finally {
      setPhotosLoading(false);
    }
  };

  useEffect(() => {
    loadDesigns();
    loadPartners();
    loadPhotos();
  }, []);

  const handleSelectPhoto = (target: 'cover' | number, imageUrl: string) => {
    if (target === 'cover') {
      setSampleCoverImage(imageUrl);
    } else {
      setSampleDayImages(prev => ({ ...prev, [target - 1]: imageUrl }));
    }
  };

  const handlePhotoFileBrowse = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WebP).');
      return;
    }
    try {
      // Auto-compress high-res camera photos to web-ready ~100KB images
      const compressed = await compressImageFile(file, { maxWidth: 1280, maxHeight: 960, quality: 0.85 });
      setNewPhotoUrl(compressed);
      if (!newPhotoTitle.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setNewPhotoTitle(cleanName);
      }
    } catch (err) {
      console.error('Error compressing image, using raw data URL:', err);
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setNewPhotoUrl(reader.result);
          if (!newPhotoTitle.trim()) {
            const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
            setNewPhotoTitle(cleanName);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPhotoSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newPhotoUrl.trim()) {
      alert('Please choose a photo file or enter an image URL.');
      return;
    }
    if (!newPhotoTitle.trim()) {
      alert('Please enter a Title for this photo.');
      return;
    }

    setIsSavingPhoto(true);
    try {
      const title = newPhotoTitle.trim();
      const created = await api.createDestinationPhoto({
        title,
        city: title,
        image_url: newPhotoUrl.trim(),
        tags: title
      });
      setSavedPhotos(prev => [created, ...prev]);
      showMsg(`✓ Photo "${title}" saved to library! It is now searchable in Day-wise itinerary.`);
      setIsAddPhotoOpen(false);
      setNewPhotoTitle('');
      setNewPhotoUrl('');
    } catch (err) {
      console.error('Failed to save photo:', err);
      alert('Failed to save photo. Please try again.');
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const handleDeletePhoto = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this photo from library?')) return;
    try {
      await api.deleteDestinationPhoto(id);
      setSavedPhotos(prev => prev.filter(p => p.id !== id));
      showMsg('✓ Photo removed from library.');
    } catch (err) {
      console.error('Error deleting photo:', err);
      alert('Failed to delete photo.');
    }
  };

  const handleDownloadSamplePdf = async () => {
    if (!modalPrintRef.current) return;
    setIsExportingPdf(true);
    try {
      const designName = AVAILABLE_QUOTE_DESIGNS.find(d => d.id === previewDesignId)?.name || 'Proposal';
      await exportElementToPdf(modalPrintRef.current, {
        filename: `Kingsland-${designName.replace(/\s+/g, '-')}-Sample.pdf`,
        margin: 0,
        width: 794,
        scale: 2
      });
      showMsg(`✓ Downloaded ${designName} PDF successfully!`);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("Failed to export PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleActivate = async (id: string) => {
    setActivatingId(id);
    // Instant optimistic update so user sees active state in 0ms
    setDesigns(prev => prev.map(d => ({
      ...d,
      is_active: d.id === id ? 1 : 0
    })));
    if (typeof window !== 'undefined') {
      localStorage.setItem('active_pdf_design', id);
      window.dispatchEvent(new CustomEvent('pdf-design-changed', { detail: id }));
    }
    try {
      await api.setActivePdfDesign(id);
      const name = AVAILABLE_QUOTE_DESIGNS.find(d => d.id === id)?.name || id;
      showMsg(`✓ Template "${name}" is now active and selected for all proposals!`);
      await loadDesigns();
    } catch (err) {
      console.error("Failed to persist active design:", err);
      showMsg("Template selected locally. (Server sync failed)");
    } finally {
      setActivatingId(null);
    }
  };

  const activeDesign = designs.find(d => d.is_active === 1) || designs[0];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-lime-400/20 border border-lime-400/30 flex items-center justify-center text-lime-500 dark:text-lime-400 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-3">
                Proposal & Quote Designs
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-lime-400/20 text-lime-600 dark:text-lime-400 border border-lime-400/30">
                  5 Official Layouts
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Click any template card to select it. The selected design will be used automatically when viewing, generating, and downloading proposals.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {activeDesign && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 shadow-xs">
              <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Current Default:</span>
              <div className="flex items-center gap-2">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/20"
                  style={{ backgroundColor: activeDesign.primary_color || '#d4af37' }}
                />
                <span className="text-xs font-black text-slate-900 dark:text-zinc-100">
                  {activeDesign.title}
                </span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsAddPhotoOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md hover:shadow-lg"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Image</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPhotosModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-indigo-400 text-slate-800 dark:text-zinc-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <ImageIcon className="w-4 h-4 text-indigo-500" />
            <span>Photo Library</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPartnersModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-amber-400 text-slate-800 dark:text-zinc-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Building2 className="w-4 h-4 text-amber-500" />
            <span>Hotel & Working Partners</span>
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="flex items-center gap-2.5 text-xs font-bold px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 animate-in fade-in slide-in-from-top-1">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Grid of the 5 official designs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {AVAILABLE_QUOTE_DESIGNS.map((def, idx) => {
          const dbDesign = designs.find(d => d.id === def.id);
          const isActive = dbDesign ? dbDesign.is_active === 1 : (idx === 0);
          const meta = DESIGN_METADATA[def.id] || DESIGN_METADATA.royal;

          return (
            <div
              key={def.id}
              onClick={() => handleActivate(def.id)}
              className={`group rounded-3xl border transition-all duration-200 overflow-hidden flex flex-col bg-white dark:bg-zinc-900/70 shadow-md hover:shadow-xl cursor-pointer ${
                isActive
                  ? 'border-lime-500 dark:border-lime-400 ring-2 ring-lime-400/40 shadow-lime-500/10'
                  : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
              }`}
            >
              {/* Card visual banner */}
              <div
                className="relative h-44 p-6 flex flex-col justify-between overflow-hidden"
                style={{ background: meta.previewGradient }}
              >
                <div className="flex items-center justify-between z-10">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-white text-xs font-bold">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: def.dot }} />
                    <span>Template 0{idx + 1}</span>
                  </div>

                  {isActive ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-lime-400 text-black font-black text-xs shadow-md">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>SELECTED ACTIVE</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleActivate(def.id);
                      }}
                      disabled={activatingId === def.id}
                      className="px-3.5 py-1 rounded-full bg-white/25 hover:bg-white text-white hover:text-slate-900 backdrop-blur-md text-xs font-bold transition-all cursor-pointer shadow-xs"
                    >
                      {activatingId === def.id ? 'Setting...' : 'Select Design'}
                    </button>
                  )}
                </div>

                <div className="z-10 text-white">
                  <h3 className="text-2xl font-black tracking-tight drop-shadow-sm">{def.name}</h3>
                  <p className="text-xs text-white/80 font-medium mt-1 drop-shadow-xs">{def.font}</p>
                </div>

                {/* Decorative subtle pattern */}
                <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
              </div>

              {/* Card body */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                <div>
                  <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed font-medium">
                    {def.desc}
                  </p>

                  {/* Palette swatch */}
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 block mb-2">
                      Design Color Palette
                    </span>
                    <div className="flex items-center gap-2">
                      {meta.paletteColors.map((col, cIdx) => (
                        <div
                          key={cIdx}
                          className="w-6 h-6 rounded-lg border border-slate-200 dark:border-zinc-700 shadow-2xs"
                          style={{ backgroundColor: col }}
                          title={col}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Highlights list */}
                  <div className="mt-4 space-y-2">
                    {meta.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-zinc-400">
                        <CheckCircle2 className="w-3.5 h-3.5 text-lime-500 dark:text-lime-400 shrink-0 mt-0.5" />
                        <span className="leading-tight">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card footer buttons */}
                <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewDesignId(def.id);
                      setPreviewPageTab(1);
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View 3-Page Sample</span>
                  </button>

                  {isActive ? (
                    <div className="py-2.5 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 border border-emerald-500/20">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Active</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleActivate(def.id);
                      }}
                      disabled={activatingId === def.id}
                      className="py-2.5 px-4 rounded-xl bg-lime-400 hover:bg-lime-300 text-black text-xs font-black transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {activatingId === def.id ? 'Saving...' : 'Select & Activate'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* PHOTO LIBRARY & ADD PHOTO SECTION (Searchable in Proposal Day-wise Editor) */}
      <div id="photo-library-section" className="space-y-6 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
                <ImageIcon className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-zinc-100 flex items-center gap-2.5">
                <span>Destination Photo Library</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  {savedPhotos.length} Photos
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
              Add photos with title/landmark. You can search and attach these photos directly to any day in the Proposal Itinerary editor.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddPhotoOpen(true)}
            className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add New Photo</span>
          </button>
        </div>

        {/* Inline Fast Add Photo Card */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>Add Photo with Title (2 Steps)</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Auto-compressed for fast PDF loading</span>
          </div>

          <form onSubmit={handleAddPhotoSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Title */}
            <div className="md:col-span-5">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
                1. Photo Title / City / Landmark *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Manali Snow Mountains, Dal Lake, Goa Beach"
                value={newPhotoTitle}
                onChange={(e) => setNewPhotoTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Image upload / URL */}
            <div className="md:col-span-5">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
                2. Choose Image File or Enter URL *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste URL or click Browse button"
                  value={newPhotoUrl.startsWith('data:') ? '[Local Image Selected]' : newPhotoUrl}
                  onChange={(e) => setNewPhotoUrl(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none truncate"
                />
                <label className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black cursor-pointer flex items-center gap-1.5 shrink-0 transition-colors shadow-xs">
                  <Upload className="w-3.5 h-3.5 text-lime-400" />
                  <span>Browse</span>
                  <input type="file" accept="image/*" onChange={handlePhotoFileBrowse} className="hidden" />
                </label>
                {newPhotoUrl && (
                  <button
                    type="button"
                    onClick={() => { setNewPhotoUrl(''); setNewPhotoTitle(''); }}
                    className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                    title="Delete / Clear chosen image"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Image</span>
                  </button>
                )}
              </div>
            </div>

            {/* Save Button */}
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={isSavingPhoto}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSavingPhoto ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                )}
                <span>{isSavingPhoto ? 'Saving...' : 'Save Image'}</span>
              </button>
            </div>
          </form>

          {/* Thumbnail preview when loaded */}
          {newPhotoUrl && (
            <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 flex items-center gap-3">
              <img
                src={newPhotoUrl}
                alt={newPhotoTitle || 'Preview'}
                className="w-16 h-12 object-cover rounded-xl border border-indigo-200 dark:border-indigo-800 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block">
                  Image Ready to Save
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate block">
                  {newPhotoTitle || 'Untitled Photo'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => { setNewPhotoUrl(''); setNewPhotoTitle(''); }}
                className="text-xs text-rose-500 hover:text-rose-700 font-bold px-2 py-1"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Live Saved Photos Gallery */}
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-indigo-600" />
              <span>Saved Photos in CRM Library</span>
            </h3>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search saved photos by title..."
                value={photoSearchFilter}
                onChange={(e) => setPhotoSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {photosLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold">Loading photo library...</span>
            </div>
          ) : savedPhotos.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <ImageIcon className="w-8 h-8 mx-auto text-slate-300 dark:text-zinc-600" />
              <p className="text-xs font-semibold">No photos saved yet. Upload your first photo above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {savedPhotos
                .filter(p => !photoSearchFilter.trim() ||
                  (p.title && p.title.toLowerCase().includes(photoSearchFilter.toLowerCase())) ||
                  (p.city && p.city.toLowerCase().includes(photoSearchFilter.toLowerCase()))
                )
                .map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/50 shadow-2xs hover:shadow-md transition-all flex flex-col"
                  >
                    <div className="aspect-video relative overflow-hidden bg-slate-100 dark:bg-zinc-800">
                      <img
                        src={photo.image_url}
                        alt={photo.title || photo.city}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80" />

                      <button
                        type="button"
                        onClick={(e) => handleDeletePhoto(photo.id, e)}
                        className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                        title="Delete photo from library"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      <div className="absolute bottom-1.5 left-1.5 right-1.5 text-white">
                        <span className="text-[10px] font-bold truncate block drop-shadow-sm">
                          {photo.title || photo.city}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Trust & Structure callout */}
      <div className="p-6 rounded-3xl bg-slate-100/70 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider">A4 Page Protection</h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Every page is rendered as an isolated 794×1123px sheet. Sections, day cards, and pricing never get sliced in half across pages.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider">Partner Brand Badges</h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Hotel and travel partner networks (Taj, Oberoi, ITC, Marriott, MakeMyTrip, etc.) display authentic vector SVG brand icons instead of plain text names.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider">Zero Color Hassle</h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
              No manual color grinding or broken hex values. Every layout uses curated, harmonious color palettes tested for crisp printing.
            </p>
          </div>
        </div>
      </div>

      {/* FULL 3-PAGE INTERACTIVE PREVIEW MODAL */}
      {previewDesignId && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="w-full max-w-5xl h-[94vh] rounded-3xl bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal header */}
            <div className="px-6 py-4 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200">
                  {AVAILABLE_QUOTE_DESIGNS.find(d => d.id === previewDesignId)?.name}
                </span>
                <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium hidden sm:inline">
                  Interactive 3-Page Proposal View
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPhotosModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Add photos to preview"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                  <span>City Photos</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPartnersModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Add partner logos and names"
                >
                  <Building2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>Partners</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSamplePdf}
                  disabled={isExportingPdf}
                  className="px-3.5 py-1.5 rounded-xl bg-[#12233D] hover:bg-slate-800 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  title="Download this preview as exact multi-page A4 PDF"
                >
                  {isExportingPdf ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-lime-400" />
                  )}
                  <span>{isExportingPdf ? 'Exporting...' : 'Download PDF'}</span>
                </button>

                {designs.find(d => d.id === previewDesignId)?.is_active === 1 ? (
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-black flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Active</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleActivate(previewDesignId);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black text-xs font-black transition-all cursor-pointer shadow-xs"
                  >
                    Set as Default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewDesignId(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 bg-slate-100 dark:bg-zinc-800 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Attached Images Control & Delete Strip */}
            {(sampleCoverImage || Object.keys(sampleDayImages).length > 0) && (
              <div className="px-6 py-2.5 bg-amber-50/70 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900/30 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Attached Custom Images:
                  </span>
                  {sampleCoverImage && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-800 text-xs font-bold text-slate-800 dark:text-zinc-200 shadow-2xs">
                      <span>Cover Hero Image</span>
                      <button
                        type="button"
                        onClick={() => setSampleCoverImage('')}
                        className="text-rose-500 hover:text-rose-700 p-0.5 rounded cursor-pointer"
                        title="Delete / Remove cover image"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  {Object.entries(sampleDayImages).map(([dayIdxStr, imgUrl]) => {
                    const dayNum = parseInt(dayIdxStr, 10) + 1;
                    return (
                      <div key={dayIdxStr} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-800 text-xs font-bold text-slate-800 dark:text-zinc-200 shadow-2xs">
                        <span>Day {dayNum} Photo</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSampleDayImages(prev => {
                              const next = { ...prev };
                              delete next[parseInt(dayIdxStr, 10)];
                              return next;
                            });
                          }}
                          className="text-rose-500 hover:text-rose-700 p-0.5 rounded cursor-pointer"
                          title={`Delete / Remove Day ${dayNum} photo`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSampleCoverImage('');
                    setSampleDayImages({});
                    showMsg('✓ All custom images removed from preview.');
                  }}
                  className="px-3 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove All Images</span>
                </button>
              </div>
            )}

            {/* Modal page preview body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center custom-scrollbar">
              <div
                ref={modalPrintRef}
                className="w-full max-w-[794px] space-y-8"
                dangerouslySetInnerHTML={{
                  __html: renderCompleteProposalHtml(dynamicSampleQuote, previewDesignId, partnerBrandsList)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Add Photo Modal (Add Images & Title) */}
      {isAddPhotoOpen && (
        <div className="fixed inset-0 z-[230] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-5 bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-zinc-100">
                    Add Image to Library
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Provide an image and title. Searchable by city name or title in the proposal editor.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddPhotoOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPhotoSubmit} className="p-6 space-y-4">
              {/* Photo Title */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
                  Photo Title / Landmark *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Manali Snow Valley, Dal Lake Shikara, Taj Mahal"
                  value={newPhotoTitle}
                  onChange={(e) => setNewPhotoTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Image upload / URL */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
                  Upload Image or Enter URL *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://... or click browse button"
                    value={newPhotoUrl.startsWith('data:') ? '[Local Image Loaded]' : newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none truncate"
                  />
                  <label className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black cursor-pointer flex items-center gap-1.5 shrink-0 transition-colors shadow-xs">
                    <Upload className="w-3.5 h-3.5 text-lime-400" />
                    <span>Browse</span>
                    <input type="file" accept="image/*" onChange={handlePhotoFileBrowse} className="hidden" />
                  </label>
                  {newPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => { setNewPhotoUrl(''); setNewPhotoTitle(''); }}
                      className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                      title="Delete / Clear chosen image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Image Preview thumbnail */}
              {newPhotoUrl && (
                <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 flex items-center gap-3">
                  <img
                    src={newPhotoUrl}
                    alt={newPhotoTitle || 'Preview'}
                    className="w-20 h-14 object-cover rounded-xl border border-indigo-200 dark:border-indigo-800 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block">
                      Preview Ready
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate block">
                      {newPhotoTitle || 'Untitled Photo'}
                    </span>
                    <span className="text-[11px] text-slate-400 truncate block">
                      Searchable via "{newPhotoTitle || 'title'}" in Proposal Editor
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddPhotoOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPhoto}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md cursor-pointer transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingPhoto ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  )}
                  <span>{isSavingPhoto ? 'Saving...' : 'Save Photo to Library'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Destination & City Photos Modal */}
      <CityPhotosModal
        isOpen={isPhotosModalOpen}
        onClose={() => setIsPhotosModalOpen(false)}
        destinationCity="Manali"
        totalDays={5}
        onSelectPhotoWithTarget={handleSelectPhoto}
      />

      {/* Partner Brands Modal */}
      <PartnerBrandsModal
        isOpen={isPartnersModalOpen}
        onClose={() => setIsPartnersModalOpen(false)}
        onPartnersUpdated={loadPartners}
      />
    </div>
  );
};

export default PdfDesignsView;
