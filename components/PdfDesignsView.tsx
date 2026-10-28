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
import { PdfThemesView } from "./PdfThemesView";

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
  rawPrice: 52500,
  discountPercent: 5,
  cutPrice: "₹55,125",
  flightDetails: "Indigo 6E 2134 (DEL-IXC) & Return 6E 2135 Included",
  cabDetails: "Private AC Innova Crysta for all transfers and sightseeing",
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
  const [activePdfSection, setActivePdfSection] = useState<'presets' | 'themes'>('presets');
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

  // Agency Profile / Company Logo
  const [agencySettings, setAgencySettings] = useState<any>(null);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [tempLogoUrl, setTempLogoUrl] = useState('');
  const [isSavingLogo, setIsSavingLogo] = useState(false);

  const dynamicSampleQuote = React.useMemo<QuoteDataModel>(() => {
    return {
      ...SAMPLE_QUOTE_DATA,
      logoUrl: agencySettings?.logo_url || '',
      companyName: agencySettings?.company_name || 'Kingsland Holidays',
      coverImage: sampleCoverImage || '',
      days: SAMPLE_QUOTE_DATA.days.map((d, i) => ({
        ...d,
        img: sampleDayImages[i] || d.img || ''
      }))
    };
  }, [sampleCoverImage, sampleDayImages, agencySettings]);

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

  const loadAgencySettings = async () => {
    try {
      const data = await api.fetchAgencySettings();
      if (data) {
        setAgencySettings(data);
      }
    } catch (err) {
      console.error("Error loading agency settings:", err);
    }
  };

  useEffect(() => {
    loadDesigns();
    loadPartners();
    loadPhotos();
    loadAgencySettings();
  }, []);

  const handleLogoFileBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setTempLogoUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCompanyLogo = async () => {
    setIsSavingLogo(true);
    try {
      const updated = {
        ...(agencySettings || {}),
        logo_url: tempLogoUrl.trim()
      };
      await api.updateAgencySettings(updated);
      setAgencySettings(updated);
      setIsLogoModalOpen(false);
      showMsg('✓ Company Logo saved successfully! It will now appear on all PDF proposals.');
    } catch (err) {
      console.error('Failed to update company logo:', err);
      alert('Failed to save company logo.');
    } finally {
      setIsSavingLogo(false);
    }
  };

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
      {/* Top Section Segmented Tabs */}
      <div className="flex items-center gap-2 border-b border-line pb-4">
        <button
          type="button"
          onClick={() => setActivePdfSection('presets')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activePdfSection === 'presets'
              ? 'bg-brand text-on-brand shadow-xs font-semibold'
              : 'bg-subtle text-secondary hover:text-content dark:hover:text-white border border-line '
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Proposal &amp; Quote Presets (5 Layouts)</span>
        </button>

        <button
          type="button"
          onClick={() => setActivePdfSection('themes')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activePdfSection === 'themes'
              ? 'bg-gradient-to-r from-[#FF6B35] to-[#D9582B] text-white shadow-sm shadow-warning-line/20 font-semibold'
              : 'bg-subtle text-secondary hover:text-content dark:hover:text-white border border-line '
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#FF6B35]" />
          <span>PDF Themes &amp; Festival Skins</span>
          <span className="text-xs font-semibold uppercase px-1.5 py-0.2 rounded bg-warning-strong/20 text-warning-ink ml-1">
            New
          </span>
        </button>
      </div>

      {activePdfSection === 'themes' ? (
        <PdfThemesView />
      ) : (
        <>
          {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-line ">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-brand/20 border border-brand-line/30 flex items-center justify-center text-brand-ink shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-content dark:text-zinc-100 flex items-center gap-3">
                Proposal & Quote Designs
                <span className="text-sm px-2.5 py-0.5 rounded-full font-bold bg-brand/20 text-brand-ink border border-brand-line/30">
                  5 Official Layouts
                </span>
              </h1>
              <p className="text-sm text-secondary mt-0.5">
                Click any template card to select it. The selected design will be used automatically when viewing, generating, and downloading proposals.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {activeDesign && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface border border-line shadow-xs">
              <span className="text-sm font-semibold text-secondary ">Current Default:</span>
              <div className="flex items-center gap-2">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/20"
                  style={{ backgroundColor: activeDesign.primary_color || '#d4af37' }}
                />
                <span className="text-sm font-semibold text-content dark:text-zinc-100">
                  {activeDesign.title}
                </span>
                <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded-md bg-success-strong/10 text-success-ink border border-success-line/20">
                  Active
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsAddPhotoOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-brand hover:bg-brand text-white text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Image</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPhotosModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-surface border border-line hover:border-brand-line text-content dark:text-zinc-200 text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <ImageIcon className="w-4 h-4 text-brand-ink" />
            <span>Photo Library</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPartnersModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-surface border border-line hover:border-warning-line text-content dark:text-zinc-200 text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Building2 className="w-4 h-4 text-warning-ink" />
            <span>Hotel & Working Partners</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTempLogoUrl(agencySettings?.logo_url || '');
              setIsLogoModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-surface border border-line hover:border-brand-line text-content dark:text-zinc-200 text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            title="Upload or change the Agency / Company Logo shown on all proposal PDFs"
          >
            <ShieldCheck className="w-4 h-4 text-brand-ink" />
            <span>Company Logo</span>
            {agencySettings?.logo_url ? (
              <span className="w-2 h-2 rounded-full bg-brand" title="Logo Active" />
            ) : (
              <span className="text-xs text-warning-ink font-bold bg-warning-strong/10 px-1.5 py-0.5 rounded">Not Set</span>
            )}
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="flex items-center gap-2.5 text-sm font-bold px-4 py-3 rounded-xl bg-success-strong/10 border border-success-line/30 text-success-ink animate-in fade-in slide-in-from-top-1">
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
              className={`group rounded-xl border transition-all duration-200 overflow-hidden flex flex-col bg-surface shadow-sm hover:shadow-sm cursor-pointer ${
                isActive
                  ? 'border-brand-line ring-2 ring-brand-line/40 shadow-brand-line/10'
                  : 'border-line hover:border-line '
              }`}
            >
              {/* Card visual banner */}
              <div
                className="relative h-44 p-6 flex flex-col justify-between overflow-hidden"
                style={{ background: meta.previewGradient }}
              >
                <div className="flex items-center justify-between z-10">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-white text-sm font-bold">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: def.dot }} />
                    <span>Template 0{idx + 1}</span>
                  </div>

                  {isActive ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand text-on-brand font-semibold text-sm shadow-sm">
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
                      className="px-3.5 py-1 rounded-full bg-white/25 hover:bg-surface text-white hover:text-content backdrop-blur-md text-sm font-bold transition-all cursor-pointer shadow-xs"
                    >
                      {activatingId === def.id ? 'Setting...' : 'Select Design'}
                    </button>
                  )}
                </div>

                <div className="z-10 text-white">
                  <h3 className="text-2xl font-semibold tracking-tight drop-shadow-sm">{def.name}</h3>
                  <p className="text-sm text-white/80 font-medium mt-1 drop-shadow-xs">{def.font}</p>
                </div>

                {/* Decorative subtle pattern */}
                <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
              </div>

              {/* Card body */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                <div>
                  <p className="text-sm text-secondary dark:text-zinc-300 leading-relaxed font-medium">
                    {def.desc}
                  </p>

                  {/* Palette swatch */}
                  <div className="mt-4 pt-4 border-t border-line ">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted block mb-2">
                      Design Color Palette
                    </span>
                    <div className="flex items-center gap-2">
                      {meta.paletteColors.map((col, cIdx) => (
                        <div
                          key={cIdx}
                          className="w-6 h-6 rounded-lg border border-line shadow-2xs"
                          style={{ backgroundColor: col }}
                          title={col}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Highlights list */}
                  <div className="mt-4 space-y-2">
                    {meta.features.map((feat, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2 text-sm text-secondary ">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-ink shrink-0 mt-0.5" />
                        <span className="leading-tight">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card footer buttons */}
                <div className="pt-4 border-t border-line flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewDesignId(def.id);
                      setPreviewPageTab(1);
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-subtle hover:bg-hover text-content dark:text-zinc-200 text-sm font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View 3-Page Sample</span>
                  </button>

                  {isActive ? (
                    <div className="py-2.5 px-4 rounded-xl bg-success-soft text-success-ink text-sm font-bold flex items-center gap-1.5 border border-success-line/20">
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
                      className="py-2.5 px-4 rounded-xl bg-brand hover:bg-brand text-on-brand text-sm font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-50"
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-xl bg-surface border border-line shadow-sm">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-soft text-brand-ink flex items-center justify-center font-semibold">
                <ImageIcon className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-content dark:text-zinc-100 flex items-center gap-2.5">
                <span>Destination Photo Library</span>
                <span className="text-sm px-2.5 py-0.5 rounded-full font-bold bg-brand-soft text-brand-ink ">
                  {savedPhotos.length} Photos
                </span>
              </h2>
            </div>
            <p className="text-sm text-secondary mt-1">
              Add photos with title/landmark. You can search and attach these photos directly to any day in the Proposal Itinerary editor.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddPhotoOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand text-white text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add New Photo</span>
          </button>
        </div>

        {/* Inline Fast Add Photo Card */}
        <div className="p-6 rounded-xl bg-surface border border-line shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-line ">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-content dark:text-zinc-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-brand-ink" />
              <span>Add Photo with Title (2 Steps)</span>
            </h3>
            <span className="text-xs text-muted font-medium">Auto-compressed for fast PDF loading</span>
          </div>

          <form onSubmit={handleAddPhotoSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Title */}
            <div className="md:col-span-5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">
                1. Photo Title / City / Landmark *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Manali Snow Mountains, Dal Lake, Goa Beach"
                value={newPhotoTitle}
                onChange={(e) => setNewPhotoTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-canvas border border-line text-sm font-semibold focus:ring-2 focus:ring-brand-line outline-none"
              />
            </div>

            {/* Image upload / URL */}
            <div className="md:col-span-5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">
                2. Choose Image File or Enter URL *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste URL or click Browse button"
                  value={newPhotoUrl.startsWith('data:') ? '[Local Image Selected]' : newPhotoUrl}
                  onChange={(e) => setNewPhotoUrl(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-canvas border border-line text-sm font-medium focus:ring-2 focus:ring-brand-line outline-none truncate"
                />
                <label className="px-4 py-2.5 rounded-xl bg-inverse hover:bg-inverse text-white text-sm font-semibold cursor-pointer flex items-center gap-1.5 shrink-0 transition-colors shadow-xs">
                  <Upload className="w-3.5 h-3.5 text-brand-ink" />
                  <span>Browse</span>
                  <input type="file" accept="image/*" onChange={handlePhotoFileBrowse} className="hidden" />
                </label>
                {newPhotoUrl && (
                  <button
                    type="button"
                    onClick={() => { setNewPhotoUrl(''); setNewPhotoTitle(''); }}
                    className="px-3.5 py-2.5 rounded-xl bg-danger-soft hover:bg-danger-soft text-danger-ink border border-danger-line text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
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
                className="w-full py-2.5 px-4 rounded-xl bg-brand hover:bg-brand text-white text-sm font-semibold shadow-sm cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
            <div className="p-3 bg-brand-soft/60 rounded-xl border border-brand-line flex items-center gap-3">
              <img
                src={newPhotoUrl}
                alt={newPhotoTitle || 'Preview'}
                className="w-16 h-12 object-cover rounded-xl border border-brand-line shrink-0"
              />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-ink block">
                  Image Ready to Save
                </span>
                <span className="text-sm font-bold text-content dark:text-zinc-200 truncate block">
                  {newPhotoTitle || 'Untitled Photo'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => { setNewPhotoUrl(''); setNewPhotoTitle(''); }}
                className="text-sm text-danger-ink hover:text-danger-ink font-bold px-2 py-1"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Live Saved Photos Gallery */}
        <div className="p-6 rounded-xl bg-surface border border-line shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line ">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-content dark:text-zinc-100 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-brand-ink" />
              <span>Saved Photos in CRM Library</span>
            </h3>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search saved photos by title..."
                value={photoSearchFilter}
                onChange={(e) => setPhotoSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-canvas border border-line text-sm font-medium focus:ring-2 focus:ring-brand-line outline-none"
              />
            </div>
          </div>

          {photosLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted">
              <div className="w-6 h-6 border-2 border-brand-line border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold">Loading photo library...</span>
            </div>
          ) : savedPhotos.length === 0 ? (
            <div className="py-12 text-center text-muted space-y-2">
              <ImageIcon className="w-8 h-8 mx-auto text-slate-300 " />
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
                    className="group relative rounded-xl overflow-hidden border border-line bg-canvas shadow-2xs hover:shadow-sm transition-all flex flex-col"
                  >
                    <div className="aspect-video relative overflow-hidden bg-subtle ">
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
                        className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/60 hover:bg-danger-strong text-white transition-colors cursor-pointer"
                        title="Delete photo from library"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      <div className="absolute bottom-1.5 left-1.5 right-1.5 text-white">
                        <span className="text-xs font-bold truncate block drop-shadow-sm">
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
      <div className="p-6 rounded-xl bg-subtle/70 border border-line grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-brand-soft border border-brand-line flex items-center justify-center text-brand-ink shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-content dark:text-zinc-100 uppercase tracking-wider">A4 Page Protection</h4>
            <p className="text-sm text-secondary mt-1 leading-relaxed">
              Every page is rendered as an isolated 794×1123px sheet. Sections, day cards, and pricing never get sliced in half across pages.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-success-soft border border-success-line flex items-center justify-center text-success-ink shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-content dark:text-zinc-100 uppercase tracking-wider">Partner Brand Badges</h4>
            <p className="text-sm text-secondary mt-1 leading-relaxed">
              Hotel and travel partner networks (Taj, Oberoi, ITC, Marriott, MakeMyTrip, etc.) display authentic vector SVG brand icons instead of plain text names.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-warning-soft border border-warning-line flex items-center justify-center text-warning-ink shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-content dark:text-zinc-100 uppercase tracking-wider">Zero Color Hassle</h4>
            <p className="text-sm text-secondary mt-1 leading-relaxed">
              No manual color grinding or broken hex values. Every layout uses curated, harmonious color palettes tested for crisp printing.
            </p>
          </div>
        </div>
      </div>

      {/* FULL 3-PAGE INTERACTIVE PREVIEW MODAL */}
      {previewDesignId && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="w-full max-w-5xl h-[94vh] rounded-xl bg-subtle border border-line shadow-sm flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal header */}
            <div className="px-6 py-4 bg-surface border-b border-line flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold uppercase tracking-wider px-3 py-1 rounded-lg bg-subtle text-content dark:text-zinc-200">
                  {AVAILABLE_QUOTE_DESIGNS.find(d => d.id === previewDesignId)?.name}
                </span>
                <span className="text-sm text-secondary font-medium hidden sm:inline">
                  Interactive 3-Page Proposal View
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPhotosModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-subtle hover:bg-hover text-content dark:text-zinc-200 text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Add photos to preview"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-brand-ink" />
                  <span>City Photos</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPartnersModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-subtle hover:bg-hover text-content dark:text-zinc-200 text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Add partner logos and names"
                >
                  <Building2 className="w-3.5 h-3.5 text-warning-ink" />
                  <span>Partners</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSamplePdf}
                  disabled={isExportingPdf}
                  className="px-3.5 py-1.5 rounded-xl bg-[#12233D] hover:bg-inverse text-white text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  title="Download this preview as exact multi-page A4 PDF"
                >
                  {isExportingPdf ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-brand-ink" />
                  )}
                  <span>{isExportingPdf ? 'Exporting...' : 'Download PDF'}</span>
                </button>

                {designs.find(d => d.id === previewDesignId)?.is_active === 1 ? (
                  <div className="px-3 py-1.5 rounded-xl bg-success-strong/20 text-success-ink border border-success-line/30 text-sm font-semibold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Active</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleActivate(previewDesignId);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-brand hover:bg-brand text-on-brand text-sm font-semibold transition-all cursor-pointer shadow-xs"
                  >
                    Set as Default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewDesignId(null)}
                  className="p-1.5 rounded-xl text-muted hover:text-content dark:hover:text-zinc-200 bg-subtle cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Attached Images Control & Delete Strip */}
            {(sampleCoverImage || Object.keys(sampleDayImages).length > 0) && (
              <div className="px-6 py-2.5 bg-warning-soft/70 border-b border-warning-line flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold uppercase tracking-wider text-warning-ink ">
                    Attached Custom Images:
                  </span>
                  {sampleCoverImage && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-warning-line text-sm font-bold text-content dark:text-zinc-200 shadow-2xs">
                      <span>Cover Hero Image</span>
                      <button
                        type="button"
                        onClick={() => setSampleCoverImage('')}
                        className="text-danger-ink hover:text-danger-ink p-0.5 rounded cursor-pointer"
                        title="Delete / Remove cover image"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  {Object.entries(sampleDayImages).map(([dayIdxStr, imgUrl]) => {
                    const dayNum = parseInt(dayIdxStr, 10) + 1;
                    return (
                      <div key={dayIdxStr} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-warning-line text-sm font-bold text-content dark:text-zinc-200 shadow-2xs">
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
                          className="text-danger-ink hover:text-danger-ink p-0.5 rounded cursor-pointer"
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
                  className="px-3 py-1 rounded-lg bg-danger-soft hover:bg-danger-soft text-danger-ink text-sm font-bold transition-all flex items-center gap-1 cursor-pointer"
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
                className="w-full max-w-[794px] space-y-8 doc-preview-protected live-proposal-sheets-container"
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
          <div className="w-full max-w-lg rounded-xl bg-surface border border-line shadow-sm overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-5 bg-canvas border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-soft border border-brand-line flex items-center justify-center text-brand-ink ">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-content dark:text-zinc-100">
                    Add Image to Library
                  </h3>
                  <p className="text-sm text-secondary ">
                    Provide an image and title. Searchable by city name or title in the proposal editor.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddPhotoOpen(false)}
                className="p-2 rounded-xl text-muted hover:text-content dark:hover:text-zinc-200 bg-surface border border-line cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPhotoSubmit} className="p-6 space-y-4">
              {/* Photo Title */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">
                  Photo Title / Landmark *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Manali Snow Valley, Dal Lake Shikara, Taj Mahal"
                  value={newPhotoTitle}
                  onChange={(e) => setNewPhotoTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-canvas border border-line text-sm font-semibold focus:ring-2 focus:ring-brand-line outline-none"
                />
              </div>

              {/* Image upload / URL */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-1.5">
                  Upload Image or Enter URL *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://... or click browse button"
                    value={newPhotoUrl.startsWith('data:') ? '[Local Image Loaded]' : newPhotoUrl}
                    onChange={(e) => setNewPhotoUrl(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-canvas border border-line text-sm font-medium focus:ring-2 focus:ring-brand-line outline-none truncate"
                  />
                  <label className="px-4 py-2.5 rounded-xl bg-inverse hover:bg-inverse text-white text-sm font-semibold cursor-pointer flex items-center gap-1.5 shrink-0 transition-colors shadow-xs">
                    <Upload className="w-3.5 h-3.5 text-brand-ink" />
                    <span>Browse</span>
                    <input type="file" accept="image/*" onChange={handlePhotoFileBrowse} className="hidden" />
                  </label>
                  {newPhotoUrl && (
                    <button
                      type="button"
                      onClick={() => { setNewPhotoUrl(''); setNewPhotoTitle(''); }}
                      className="px-3.5 py-2.5 rounded-xl bg-danger-soft hover:bg-danger-soft text-danger-ink border border-danger-line text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
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
                <div className="p-3 bg-brand-soft/60 rounded-xl border border-brand-line flex items-center gap-3">
                  <img
                    src={newPhotoUrl}
                    alt={newPhotoTitle || 'Preview'}
                    className="w-20 h-14 object-cover rounded-xl border border-brand-line shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-brand-ink block">
                      Preview Ready
                    </span>
                    <span className="text-sm font-bold text-content dark:text-zinc-200 truncate block">
                      {newPhotoTitle || 'Untitled Photo'}
                    </span>
                    <span className="text-xs text-muted truncate block">
                      Searchable via "{newPhotoTitle || 'title'}" in Proposal Editor
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-line flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddPhotoOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-subtle text-content dark:text-zinc-300 text-sm font-bold hover:bg-hover cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPhoto}
                  className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand text-white text-sm font-semibold shadow-sm cursor-pointer transition-all disabled:opacity-50 flex items-center gap-2"
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

      {/* Company / Agency Logo Modal */}
      {isLogoModalOpen && (
        <div className="fixed inset-0 z-[230] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-xl bg-surface border border-line shadow-sm overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-5 bg-canvas border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand/20 border border-brand-line/30 flex items-center justify-center text-brand-ink ">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-content dark:text-zinc-100">
                    Company Logo for Proposals &amp; PDFs
                  </h3>
                  <p className="text-sm text-secondary ">
                    Displayed in the header banner of all 6 proposal themes &amp; exports
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLogoModalOpen(false)}
                className="p-1.5 rounded-xl text-muted hover:text-content dark:hover:text-zinc-200 bg-surface border border-line cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Logo Preview Box */}
              <div className="p-4 rounded-xl bg-canvas border border-line flex flex-col items-center justify-center gap-3 text-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Header Logo Preview
                </span>
                {tempLogoUrl ? (
                  <div className="relative group p-3 bg-surface rounded-xl border border-line shadow-xs flex items-center justify-center max-w-full">
                    <img
                      src={tempLogoUrl}
                      alt="Company Logo Preview"
                      className="max-h-16 max-w-[200px] object-contain rounded"
                    />
                    <button
                      type="button"
                      onClick={() => setTempLogoUrl('')}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-danger-strong text-white flex items-center justify-center shadow-sm hover:bg-danger-strong cursor-pointer"
                      title="Remove Logo"
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                ) : (
                  <div className="py-6 px-8 rounded-xl border border-dashed border-line text-muted text-sm flex flex-col items-center gap-2">
                    <Building2 className="w-8 h-8 opacity-40 text-muted" />
                    <span>No custom logo selected. Default Kingsland vector emblem is used.</span>
                  </div>
                )}
              </div>

              {/* Upload controls */}
              <div className="space-y-3">
                <label className="block text-sm font-bold text-content dark:text-zinc-300">
                  Upload Logo File (PNG, JPG, SVG, WebP)
                </label>
                <label className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand hover:bg-brand text-on-brand font-semibold text-sm rounded-xl cursor-pointer shadow-sm transition-all">
                  <Upload className="w-4 h-4 stroke-[2.5]" />
                  <span>Choose Image File from Computer</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileBrowse}
                    className="hidden"
                  />
                </label>

                <div className="pt-2">
                  <label className="block text-sm font-bold text-content dark:text-zinc-300 mb-1.5">
                    Or Paste Image URL:
                  </label>
                  <input
                    type="url"
                    value={tempLogoUrl.startsWith('data:') ? '' : tempLogoUrl}
                    onChange={(e) => setTempLogoUrl(e.target.value)}
                    placeholder={tempLogoUrl.startsWith('data:') ? 'Image uploaded from file (data URI)' : 'https://example.com/logo.png'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-surface text-sm text-content dark:text-zinc-100 outline-none focus:border-brand-line"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-line flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsLogoModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-subtle text-content dark:text-zinc-300 text-sm font-bold hover:bg-hover cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCompanyLogo}
                  disabled={isSavingLogo}
                  className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand text-on-brand text-sm font-semibold shadow-sm cursor-pointer transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingLogo ? (
                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  )}
                  <span>{isSavingLogo ? 'Saving...' : 'Save & Apply Logo'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default PdfDesignsView;
