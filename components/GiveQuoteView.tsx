import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Image as ImageIcon, X, Upload, Search, Trash2 } from 'lucide-react';
import { Lead, QuoteData, HotelEntry, InclusionEntry } from '../types';
import { generateItinerary } from '../services/geminiService';
import * as api from '../services/apiService';
import { DestinationPhotoItem } from '../services/apiService';
import { compressImageFile } from '../utils/imageCompressor';
import HotelAlternativeEditor from './HotelAlternativeEditor';
import { normalizeHotelAlternative, quoteMealPlan } from '../utils/hotelOptions';

interface GiveQuoteViewProps {
  lead: Lead;
  allLeads: Lead[];
  editQuoteId: string | null;
  onClose: () => void;
  onSave: (quote: QuoteData) => void;
}

const DEFAULT_TERMS = `Terms & Conditions

Cancellation Policy (for the land package):
• More than 30 days before the starting date: 25% of the total land package cost will be cancellation fees.
• Between 16-30 days before the starting date: 40% of the total land package cost will be cancellation fees.
• Between 7-15 days before the starting date: 55% of the total land package cost will be cancellation fees.
• Between 3-6 days before the starting date: 70% of the total land package cost will be cancellation fees.
• Within 0-2 days before the starting date: 85% of the total land package cost will be cancellation fees.
• In case of No Show: 100% of the total land package cost will be cancellation fees.
• Peak Periods: No Refund & No Amendment allowed during the Diwali period, Christmas, New Year period, and Long weekends.
• Note: Number of days for cancellation will be counted by first contact and check-in time and date. First contact is considered when you first email / WhatsApp our salesperson cancellation request.

Cancellation Policy (for flights/trains):
• For flights and trains, cancellation charges vary as per airlines / Railways / booking source policies. Cancellation charges will be according to that.

Hotels & Accommodation Guidelines:
• Most of the time hotels mentioned in this quote will be provided. In some cases, if the mentioned hotels are not available due to unforeseen reasons, similar hotels will be provided.
• On 24th Dec - 31st Dec: Gala Dinner may be compulsory in some hotels (ranging from Rs. 1500 per person to Rs. 5000 per person or sometimes higher), payable directly to the hotel.
• Standard Check-in time is 12:00 PM and Check-out time is 10:00 AM (varies as per hotel). Early check-in and/or late check-out is subject to availability and may be chargeable directly to the hotel.
• Itinerary provided in this quote is indicative. It may change before or during the trip if required. No refund will be given in case of a missed itinerary.
• Room Heater: Certain Hotels in Low Budget, Standard, Deluxe categories provide room heaters on request at extra charge. We do not include this cost; travelers settle directly before checkout (INR 250.00 to INR 500.00 per heater per room per night).

Important Information & Permits:
• All guests must carry valid Government Photo IDs (Passport / Driving License / Voter ID). PAN Card is NOT accepted as a valid photo/address ID.
• Guests must carry 4 passport size photographs along with Photo-ID proof (Passport / DL / Voter ID & School ID for children) for Gangtok (Changu Lake / Baba Mandir) and North Sikkim (Lachung) permits.
• Tsomgo Lake, Baba Mandir, Nathula Pass, Gurudongmar, Yumthang & Yumesamdong (Zero Point) depend heavily on weather conditions. In hilly areas, roads may be out of operation at the time of travel. Operational status will be updated during the pre-arrival briefing call.
• Nathula Permit Formalities: Nathula Pass is an optional tour with supplement cost, applied 24 hours prior. Only 5% of vehicles get permits via government lottery. Once a permit is issued, there is no refund if Nathula Pass cannot be visited for any reason.
• Himalayan Mountaineering Institute and Padmaja Naidu Himalayan Zoological Park remain closed on Thursday.
• Toy Train Ride: A 2-hour journey starting from Darjeeling up to Ghoom Station and back, covering Batasia Loop, War Memorial & Ghoom Railway Museum. Cost of tickets and pickup-drop will be borne by the traveler.
• The Tibetan Refugee Centre remains closed on Sunday.
• Vehicle Capacity: Maximum capacity is 6 people (including children) as per Motor Vehicle Act.
• Sector Allotment: In Sikkim and Darjeeling, vehicles are allotted per sector as per syndicate rules; a single vehicle cannot be used for the entire trip. Good vehicles and drivers are assured for each sector.
• Point-to-Point Transfers: All vehicles assigned are on a point-to-point basis and not disposable. Air conditioning will not operate on uphill drives.
• Parking & Entry: Due to parking scarcity, entry restrictions and specific timings apply in many areas.
• Natural Diversions: Landslides are common in hilly areas. Guests must bear additional costs for any diversion/changes due to road blockage, landslide, or political unrest.
• Local Syndicate Excursions: Excursions like Tshangu Lake, Nathula, and North Sikkim are controlled by local transport syndicates. Vehicles and drivers may change for transfers and sightseeing.
• Restricted Area Security: Nathula is a restricted area and can be sealed without notice for security reasons. In such cases, tours operate only up to Tshangu Lake with no refund for unutilized services.
• Payment Schedule: Payments must be cleared as per the payment schedule. Delayed installments attract late payment charges (5% of installment amount).

Pure Agent Declaration (Terms & Conditions):
• We provide our services strictly as a pure agent, and charge a service fee solely for planning, coordinating, and arranging the tour on behalf of the client.
• All other travel-related services (transport, hotel booking, entry tickets, etc.) are arranged on behalf of the customer and recovered at actual cost.
• As a pure agent: We do not intend to hold nor hold any title to the goods or services procured on behalf of the client.
• We do not use such goods or services for our own interest or benefit.
• We recover only the actual amount incurred for third-party services, in addition to our separately charged service fee.
• All legal obligations are subject to Jaipur jurisdiction only.`;

const PriceInput = ({ label, value, onChange, icon = "₹", colorClass = "text-content", disabled = false, placeholder = "0" }: { label: string, value: number, onChange: (v: number) => void, icon?: string, colorClass?: string, disabled?: boolean, placeholder?: string }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    onChange(val === '' ? 0 : parseInt(val, 10));
  };

  return (
    <div className="flex-1 min-w-[120px]">
      <label className="block text-xs font-semibold text-muted uppercase mb-1.5 tracking-widest truncate">{label}</label>
      <div className={`flex items-center gap-2 border border-line rounded-xl px-3 py-2 ${disabled ? 'bg-canvas' : 'bg-surface'} shadow-sm focus-within:ring-2 focus-within:ring-brand-line transition-all`}>
         <span className={`${colorClass} font-semibold text-sm opacity-40`}>{icon}</span>
         <input 
          aria-label={label}
          type="text" 
          inputMode="numeric"
          disabled={disabled}
          value={isNaN(value) || value === 0 ? '' : value} 
          onChange={handleChange} 
          className={`w-full text-sm outline-none font-semibold ${colorClass} placeholder:text-slate-200 bg-transparent`} 
          placeholder={placeholder}
         />
      </div>
    </div>
  );
};

const InclusionRow: React.FC<{ label: string; item: InclusionEntry; onChange: (newItem: InclusionEntry) => void }> = ({ label, item, onChange }) => (
  <div className="flex items-center justify-between py-3.5 border-b border-line/60 last:border-none group">
    <span className="text-sm font-semibold text-content transition-colors group-hover:text-content">{label}</span>
    <button 
      type="button" 
      onClick={() => onChange({ ...item, included: !item.included })}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer hover:shadow-xs"
    >
      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
        item.included 
          ? 'border-[#4ec1bd] bg-[#4ec1bd] text-white shadow-xs' 
          : 'border-line bg-surface text-transparent hover:border-line'
      }`}>
        <svg className="w-3.5 h-3.5 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span className={`text-sm font-semibold uppercase tracking-wider ${item.included ? 'text-[#0d827e]' : 'text-muted'}`}>
        {item.included ? 'Included' : 'Excluded'}
      </span>
    </button>
  </div>
);

const NightSelectDropdown = ({ totalNights, selectedIndices = [], usedIndices = [], onChange }: { totalNights: number, selectedIndices: number[], usedIndices: number[], onChange: (indices: number[]) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleNight = (index: number) => {
    const newIndices = selectedIndices.includes(index)
      ? selectedIndices.filter(i => i !== index)
      : [...selectedIndices, index].sort((a, b) => a - b);
    onChange(newIndices);
  };

  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const displayText = selectedIndices.length === 0 ? "Select Nights" : selectedIndices.length === 1 ? `${getOrdinal(selectedIndices[0] + 1)} Night` : `${selectedIndices.length} Nights`;

  return (
    <div className="relative" ref={containerRef}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-line rounded-xl px-3 py-2 text-content bg-surface flex justify-between items-center text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-brand-line"
      >
        <span className={selectedIndices.length === 0 ? 'text-slate-300' : ''}>{displayText}</span>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-[220] mt-1 w-full bg-surface border border-line rounded-xl shadow-sm p-1.5 max-h-48 overflow-y-auto custom-scrollbar">
          {Array.from({ length: totalNights }).map((_, i) => {
            const isTaken = usedIndices.includes(i) && !selectedIndices.includes(i);
            return (
              <label key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-canvas cursor-pointer transition-colors group ${isTaken ? 'opacity-30 cursor-not-allowed' : ''}`}>
                <input 
                  type="checkbox" 
                  disabled={isTaken}
                  checked={selectedIndices.includes(i)}
                  onChange={() => toggleNight(i)}
                  className="w-3.5 h-3.5 rounded-md border-line text-brand-ink focus:ring-brand-line cursor-pointer"
                />
                <span className="text-xs text-content font-semibold uppercase tracking-widest group-hover:text-content transition-colors">
                  {getOrdinal(i + 1)} Night {isTaken && '(Assigned)'}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

const SectionHeader = ({ title, icon }: { title: string; icon: React.ReactNode }) => (
  <div className="mt-8 mb-4 flex items-center gap-3">
    <div className="w-8 h-8 bg-inverse rounded-xl flex items-center justify-center text-white shadow-sm border border-line">{icon}</div>
    <h4 className="text-xs font-semibold text-content uppercase tracking-[0.2em] border-b-2 border-line pb-1.5 flex-1">{title}</h4>
  </div>
);

// Fix: Completed GiveQuoteView component logic and returned valid JSX to resolve the FC type mismatch.
const GiveQuoteView: React.FC<GiveQuoteViewProps> = ({ lead, allLeads, editQuoteId, onClose, onSave }) => {
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [searchMode, setSearchMode] = useState<'Best' | 'TripId'>('Best');
  const [itinerarySearch, setItinerarySearch] = useState('');

  const [quote, setQuote] = useState<QuoteData>(() => {
    const existingQuote = lead.quotes?.find(q => q.id === editQuoteId);
    if (existingQuote) {
      const fixedHotels = existingQuote.hotels.map(h => {
        if (!h.selectedNightIndices || h.selectedNightIndices.length === 0) {
          return { ...h, selectedNightIndices: Array.from({length: h.nights}, (_, i) => i) };
        }
        return h;
      });
      return { ...existingQuote, hotels: fixedHotels };
    }

    const quoteCount = (lead.quotes?.length || 0) + 1;
    return {
      id: `quote-${Date.now()}`,
      packageTitle: `${lead.destination} Option ${quoteCount}`,
      finalSellingPrice: 0,
      hotelAlternative: null,
      visaCost: 0,
      flightCost: 0,
      landPackageCost: 0,
      marketingFees: 0,
      discountPercentage: 0,
      nights: lead.durationDays ? Math.max(0, lead.durationDays - 1) : 6,
      hotelsNotIncluded: lead.includeStay === 'No',
      flightsNotIncluded: lead.includeFlight === 'No',
      cabsNotIncluded: lead.includeCab === 'No',
      flightDetails: '',
      cabDetails: '',
      hotels: [{ nights: 1, selectedNightIndices: [0], hotelName: '', city: lead.destination || '', category: lead.hotelCategory || '4 Star', roomType: 'Standard Room', comments: '' }],
      inclusions: {
        accommodation: { single: { included: false, comments: '' }, double: { included: true, comments: '' }, triple: { included: false, comments: '' } },
        mealPlan: { breakfast: { included: true, comments: '' }, lunch: { included: false, comments: '' }, dinner: { included: false, comments: '' } },
        transfer: { arrival: { included: true, comments: '' }, departure: { included: true, comments: '' } },
        sightseeing: { included: true, comments: '' },
        taxes: { included: true, comments: '' },
        tollParking: { included: true, comments: '' },
        tripSupplements: { included: false, comments: '' },
      },
      otherInclusions: 'Daily Water Bottle, Welcome Drink on Arrival',
      otherExclusions: 'Personal Expenses, Laundry, Telephone Calls, Tips to Driver',
      itinerary: Array.from({ length: (lead.durationDays || 7) }).map((_, i) => ({ day: i + 1, title: '', description: '' })),
      termsAndConditions: DEFAULT_TERMS,
      useDefaultTC: true,
      otherInformation: '',
      workingAgentId: lead.assignedTo || '',
      createdAt: new Date().toISOString()
    };
  });

  const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
  const [photoPickerDayIndex, setPhotoPickerDayIndex] = useState<number | null>(null);
  const [libraryPhotos, setLibraryPhotos] = useState<DestinationPhotoItem[]>([]);
  const [photoSearchQuery, setPhotoSearchQuery] = useState('');
  const [customCategoryIndices, setCustomCategoryIndices] = useState<Record<number, boolean>>({});

  const STANDARD_HOTEL_CATEGORIES = [
    '3 Star',
    '4 Star',
    '5 Star',
    'Luxury',
    'Heritage',
    'Deluxe',
    'Boutique Heritage',
    'Luxury Villa',
    'Premium Houseboat',
    'Swiss Luxury Tent',
    'Eco Resort & Camp',
    'Budget Stay',
    'Homestay',
  ];

  useEffect(() => {
    api.fetchTemplates()
      .then(data => setSavedTemplates(Array.isArray(data) ? data : []))
      .catch(err => console.warn('Failed to load saved templates in GiveQuoteView:', err));

    api.fetchDestinationPhotos('')
      .then(data => {
        if (Array.isArray(data)) setLibraryPhotos(data);
      })
      .catch(err => console.warn('Failed to load destination photos in GiveQuoteView:', err));
  }, []);

  const displayedInlinePhotos = useMemo(() => {
    if (!photoSearchQuery.trim()) return libraryPhotos;
    const q = photoSearchQuery.toLowerCase().trim();
    return libraryPhotos.filter(p =>
      (p.city && p.city.toLowerCase().includes(q)) ||
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.tags && p.tags.toLowerCase().includes(q))
    );
  }, [libraryPhotos, photoSearchQuery]);

  const searchResults = useMemo(() => {
    if (!itinerarySearch.trim()) return [];
    const query = itinerarySearch.toLowerCase().trim();

    // 1. Templates from Saved Itineraries Library
    const templateMatches = savedTemplates
      .filter(t => {
        const titleMatch = (t.title || '').toLowerCase().includes(query);
        const destMatch = (t.destination || '').toLowerCase().includes(query);
        return titleMatch || destMatch;
      })
      .map(t => {
        let data = t.templateData || {};
        if (typeof data === 'string') {
          try { data = JSON.parse(data); } catch (_e) { data = {}; }
        }
        const rawDays = data.days || data.itinerary || [];
        const formattedDays = Array.isArray(rawDays) ? rawDays.map((d: any, idx: number) => ({
          day: d.day || idx + 1,
          title: d.title || `Day ${idx + 1}`,
          description: d.description || '',
          imageUrl: d.imageUrl || d.img || d.image || '',
          img: d.img || d.imageUrl || d.image || ''
        })) : [];

        return {
          id: `saved-tmpl-${t.id}`,
          isSavedTemplate: true,
          tagText: `SAVED ITINERARY • ${t.destination}`,
          titleText: t.title || t.destination,
          nights: t.nights || (formattedDays.length ? Math.max(1, formattedDays.length - 1) : 6),
          quoteData: {
            packageTitle: t.title || `${t.destination} Package`,
            nights: t.nights || (formattedDays.length ? Math.max(1, formattedDays.length - 1) : 6),
            itinerary: formattedDays,
            hotels: Array.isArray(data.hotels) ? data.hotels : [],
            inclusions: data.inclusions || null,
            otherInclusions: data.otherInclusions || '',
            otherExclusions: data.otherExclusions || '',
            flightDetails: data.flightDetails || '',
            cabDetails: data.cabDetails || '',
            finalSellingPrice: data.finalSellingPrice || data.totalPrice || 0,
            visaCost: data.visaCost || 0,
            flightCost: data.flightCost || 0,
            landPackageCost: data.landPackageCost || 0,
            marketingFees: data.marketingFees || 0,
            discountPercentage: data.discountPercentage || 0,
          }
        };
      });

    // 2. Past Lead Quotes
    const leadMatches = allLeads.flatMap(l => (l.quotes || []).map(q => ({
      id: `lead-quote-${q.id}`,
      isSavedTemplate: false,
      tagText: `PAST QUOTE • ${l.tripId} (${l.name})`,
      titleText: q.packageTitle || l.destination,
      nights: q.nights,
      quoteData: q
    }))).filter(item => {
      if (searchMode === 'TripId') {
        return (item.tagText || '').toLowerCase().includes(query);
      }
      return (item.titleText || '').toLowerCase().includes(query) || (item.tagText || '').toLowerCase().includes(query);
    });

    return [...templateMatches, ...leadMatches].slice(0, 8);
  }, [allLeads, savedTemplates, itinerarySearch, searchMode]);

  const handleUpdateInclusion = (category: keyof QuoteData['inclusions'], sub: string | null, val: boolean) => {
    setQuote(prev => {
      const newInc = { ...prev.inclusions };
      if (sub && (category === 'accommodation' || category === 'mealPlan' || category === 'transfer')) {
        (newInc[category] as any)[sub].included = val;
      } else if (!sub && (category === 'sightseeing' || category === 'taxes' || category === 'tollParking' || category === 'tripSupplements')) {
        (newInc[category] as any).included = val;
      }
      return { ...prev, inclusions: newInc };
    });
  };

  const handleHotelChange = (index: number, field: keyof HotelEntry, value: any) => {
    const newHotels = [...quote.hotels];
    newHotels[index] = { ...newHotels[index], [field]: value };
    setQuote({ ...quote, hotels: newHotels });
  };

  const handleAddHotel = () => {
    setQuote({
      ...quote,
      hotels: [...quote.hotels, { nights: 1, selectedNightIndices: [], hotelName: '', city: lead.destination || '', category: '4 Star', roomType: 'Standard Room', comments: '' }]
    });
  };

  const handleAddDay = () => {
    setQuote(prev => {
      const newItin = [
        ...prev.itinerary,
        { day: prev.itinerary.length + 1, title: `Day ${prev.itinerary.length + 1}`, description: '' }
      ];
      const newNights = Math.max(1, newItin.length - 1);
      
      const newHotels = prev.hotels.map((h, idx) => {
        if (idx === 0 && h.nights) {
          return { ...h, nights: newNights };
        }
        return h;
      });

      return {
        ...prev,
        nights: newNights,
        itinerary: newItin,
        hotels: newHotels
      };
    });
  };

  const handleRemoveDay = (indexToRemove: number) => {
    if (quote.itinerary.length <= 1) {
      alert('Itinerary must have at least 1 day.');
      return;
    }
    setQuote(prev => {
      const filtered = prev.itinerary.filter((_, i) => i !== indexToRemove);
      const renumbered = filtered.map((d, i) => ({ ...d, day: i + 1 }));
      const newNights = Math.max(1, renumbered.length - 1);

      const newHotels = prev.hotels.map((h, idx) => {
        if (idx === 0 && h.nights) {
          return { ...h, nights: newNights };
        }
        return h;
      });

      return {
        ...prev,
        nights: newNights,
        itinerary: renumbered,
        hotels: newHotels
      };
    });
  };

  const handleGenerateAI = async () => {
    setIsGeneratingAI(true);
    try {
      const itin = await generateItinerary(lead);
      const newItin = itin.days.map(d => ({ day: d.day, title: d.title, description: d.description }));
      const newNights = Math.max(1, newItin.length - 1);
      setQuote(prev => ({
        ...prev,
        nights: newNights,
        itinerary: newItin
      }));
    } catch (e) {
      console.error(e);
      alert("AI Generation failed.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleDirectDayUpload = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WebP).');
      return;
    }
    try {
      const compressed = await compressImageFile(file, { maxWidth: 1200, maxHeight: 900, quality: 0.85 });
      setQuote(prev => {
        const newItin = prev.itinerary.map((d, i) =>
          i === idx ? { ...d, imageUrl: compressed, img: compressed } : d
        );
        return { ...prev, itinerary: newItin };
      });
      setPhotoPickerDayIndex(null);
      const title = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || `Day ${idx + 1} Photo`;
      api.createDestinationPhoto({
        title,
        city: lead.destination || title,
        image_url: compressed,
        tags: `${lead.destination || ''} ${title}`
      }).then(created => {
        if (created) setLibraryPhotos(prev => [created, ...prev]);
      }).catch(err => console.warn('Saved day photo to library:', err));
    } catch (err) {
      console.error('Failed to compress/attach day image:', err);
    }
  };

  const usedNightIndices = quote.hotels.flatMap(h => h.selectedNightIndices || []);
  const [saveError, setSaveError] = useState('');
  const handleSaveQuote = () => {
    try {
      const hotelAlternative = normalizeHotelAlternative(quote.hotelAlternative);
      if (hotelAlternative && (!Number.isFinite(quote.finalSellingPrice) || quote.finalSellingPrice <= 0)) throw new Error('Enter a valid price for Hotel Option 1.');
      setSaveError('');
      onSave({ ...quote, hotelAlternative });
    } catch (error) { setSaveError(error instanceof Error ? error.message : 'Please check the hotel options.'); }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Quotation editor" className="fixed inset-0 z-[110] bg-inverse/60 backdrop-blur-sm flex justify-center items-center p-2 md:p-6 custom-scrollbar">
      <div className="bg-surface w-full max-w-5xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[94dvh] animate-in zoom-in-95 duration-300">
        <header className="px-5 py-4 md:px-8 bg-surface border-b border-line flex flex-wrap gap-4 justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl font-semibold text-content tracking-tight">{editQuoteId ? 'Edit quotation' : 'Create quotation'}</h2>
            <p className="text-sm font-medium text-secondary mt-1">Configure itinerary and pricing for <span className="font-semibold text-brand-ink">{lead.name}</span></p>
          </div>
          <div className="flex gap-4">
            <button onClick={onClose} className="px-6 py-3 text-muted font-semibold text-xs uppercase tracking-widest hover:text-content">Cancel</button>
            <button onClick={handleSaveQuote} className="px-10 py-3 bg-brand text-white rounded-xl font-semibold text-xs uppercase tracking-widest shadow-sm shadow-brand-line hover:bg-brand transition-all">Save Quotation</button>
          </div>
        </header>

        <div className="p-4 md:p-8 space-y-8 overflow-y-auto custom-scrollbar">
          {/* LEAD CONTEXT SUMMARY BANNER */}
          <div className="bg-inverse text-white p-5 rounded-xl shadow-sm space-y-4">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-line pb-4">
                <div>
                  <span className="text-xs font-semibold text-brand-ink uppercase tracking-widest block mb-1">CUSTOMER REQS</span>
                  <h3 className="text-xl font-semibold tracking-tight">{lead.name} — {lead.destination} ({lead.durationDays || 7} Days)</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-white/10 text-white rounded-lg text-xs font-bold">👥 {lead.travelers?.adults || 2} Adults{lead.travelers?.children ? `, ${lead.travelers.children} Children` : ''}</span>
                  {lead.travelers?.childAges && lead.travelers.childAges.length > 0 && (
                    <span className="px-3 py-1 bg-brand/20 text-brand-ink rounded-lg text-xs font-bold border border-brand-line/30">👶 Ages: {lead.travelers.childAges.join(', ')} yrs</span>
                  )}
                  <span className="px-3 py-1 bg-white/10 text-white rounded-lg text-xs font-bold">⭐ {lead.hotelCategory || '4 Star'}</span>
                  <span className="px-3 py-1 bg-white/10 text-white rounded-lg text-xs font-bold">🚗 Cab: {lead.includeCab || 'Yes'}</span>
                  {lead.englishDriver && <span className="px-3 py-1 bg-success-strong/20 text-success-ink rounded-lg text-xs font-bold border border-success-line/30">🗣️ English Driver</span>}
                </div>
             </div>
             {lead.otherInfo && (
               <p className="text-sm text-slate-300 italic leading-relaxed font-medium">💬 "{lead.otherInfo}"</p>
             )}
          </div>

          {/* SEARCH / TEMPLATES */}
          <section className="bg-brand-soft/50 p-5 rounded-xl border border-brand-line/50 space-y-6">
             <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                <div>
                   <h4 className="text-xs font-semibold text-brand-ink uppercase tracking-widest">Intelligent Library Search</h4>
                   <p className="text-sm text-secondary font-medium">Search past quotations to use as templates</p>
                </div>
                <div className="flex bg-surface p-1 rounded-xl border border-line">
                   <button onClick={() => setSearchMode('Best')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-widest transition-all ${searchMode === 'Best' ? 'bg-brand text-white shadow-sm' : 'text-muted hover:text-secondary'}`}>Destination</button>
                   <button onClick={() => setSearchMode('TripId')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-widest transition-all ${searchMode === 'TripId' ? 'bg-brand text-white shadow-sm' : 'text-muted hover:text-secondary'}`}>Trip ID</button>
                </div>
             </div>
             <div className="relative">
                <input 
                  type="text" 
                  placeholder={searchMode === 'TripId' ? "Enter Trip ID (e.g. KL-1001)..." : "Search destinations or package names..."}
                  className="w-full bg-surface border border-line rounded-xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-brand-line/10 shadow-sm"
                  value={itinerarySearch}
                  onChange={e => setItinerarySearch(e.target.value)}
                />
                {searchResults.length > 0 && (
                  <div className="absolute z-[130] mt-2 w-full bg-surface border border-line rounded-xl shadow-sm p-4 space-y-2 animate-in slide-in-from-top-2 duration-200 max-h-80 overflow-y-auto custom-scrollbar">
                    {searchResults.map((res, i) => (
                      <div 
                        key={res.id || i}
                        className="flex items-center justify-between p-3 hover:bg-canvas rounded-xl group transition-colors border border-transparent hover:border-line"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            const tData = res.quoteData;
                            setQuote(prev => ({
                              ...prev,
                              packageTitle: tData.packageTitle || prev.packageTitle,
                              nights: tData.nights || prev.nights,
                              itinerary: (tData.itinerary && tData.itinerary.length > 0) ? tData.itinerary : prev.itinerary,
                              hotels: (tData.hotels && tData.hotels.length > 0) ? tData.hotels : prev.hotels,
                              inclusions: tData.inclusions || prev.inclusions,
                              otherInclusions: tData.otherInclusions ?? prev.otherInclusions,
                              otherExclusions: tData.otherExclusions ?? prev.otherExclusions,
                              flightDetails: tData.flightDetails ?? prev.flightDetails,
                              cabDetails: tData.cabDetails ?? prev.cabDetails,
                              finalSellingPrice: tData.finalSellingPrice || prev.finalSellingPrice,
                              visaCost: tData.visaCost || prev.visaCost,
                              flightCost: tData.flightCost || prev.flightCost,
                              landPackageCost: tData.landPackageCost || prev.landPackageCost,
                              marketingFees: tData.marketingFees || prev.marketingFees,
                              discountPercentage: tData.discountPercentage ?? prev.discountPercentage,
                            }));
                            setItinerarySearch('');
                          }}
                          className="flex-1 text-left cursor-pointer"
                        >
                          <p className="text-xs font-semibold text-brand-ink uppercase tracking-widest mb-0.5">{res.tagText}</p>
                          <p className="text-sm font-bold text-content">{res.titleText}</p>
                        </button>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const tData = res.quoteData;
                              setQuote(prev => ({
                                ...prev,
                                packageTitle: tData.packageTitle || prev.packageTitle,
                                nights: tData.nights || prev.nights,
                                itinerary: (tData.itinerary && tData.itinerary.length > 0) ? tData.itinerary : prev.itinerary,
                                hotels: (tData.hotels && tData.hotels.length > 0) ? tData.hotels : prev.hotels,
                                inclusions: tData.inclusions || prev.inclusions,
                                otherInclusions: tData.otherInclusions ?? prev.otherInclusions,
                                otherExclusions: tData.otherExclusions ?? prev.otherExclusions,
                                flightDetails: tData.flightDetails ?? prev.flightDetails,
                                cabDetails: tData.cabDetails ?? prev.cabDetails,
                                finalSellingPrice: tData.finalSellingPrice || prev.finalSellingPrice,
                                visaCost: tData.visaCost || prev.visaCost,
                                flightCost: tData.flightCost || prev.flightCost,
                                landPackageCost: tData.landPackageCost || prev.landPackageCost,
                                marketingFees: tData.marketingFees || prev.marketingFees,
                                discountPercentage: tData.discountPercentage ?? prev.discountPercentage,
                              }));
                              setItinerarySearch('');
                            }}
                            className="text-xs font-semibold bg-subtle text-secondary px-3 py-1.5 rounded-lg group-hover:bg-brand group-hover:text-white transition-all uppercase cursor-pointer"
                          >
                            Apply Template
                          </button>

                          {res.isSavedTemplate && (
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const tmplId = res.id.replace('saved-tmpl-', '');
                                if (!confirm(`Are you sure you want to delete template "${res.titleText}"?`)) return;
                                try {
                                  await api.deleteTemplate(tmplId);
                                  setSavedTemplates(prev => prev.filter(t => String(t.id) !== tmplId));
                                } catch (err) {
                                  console.error('Failed to delete template:', err);
                                  alert('Failed to delete template.');
                                }
                              }}
                              className="p-1.5 text-muted hover:text-danger-ink hover:bg-danger-soft rounded-lg transition-colors cursor-pointer"
                              title="Delete this template from library"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          </section>

          {/* PACKAGE BASIC CONFIG */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <label htmlFor="quote-package-title" className="block text-xs font-semibold text-muted uppercase tracking-widest ml-2">Package title</label>
              <input 
                type="text" 
                className="w-full bg-canvas border border-line rounded-xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-brand-line/10" 
                id="quote-package-title" value={quote.packageTitle} 
                onChange={e => setQuote({...quote, packageTitle: e.target.value})}
              />
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <PriceInput label="Final Selling Price (₹)" value={quote.finalSellingPrice} onChange={v => setQuote({...quote, finalSellingPrice: v})} colorClass="text-success-ink" />
                 <PriceInput label="Crossed-out price uplift (%)" value={quote.discountPercentage} onChange={v => setQuote({...quote, discountPercentage: v})} colorClass="text-danger-ink" icon="%" />
              </div>
              {(() => {
                const finalP = quote.finalSellingPrice || 0;
                const disc = quote.discountPercentage || 0;
                const mrp = disc > 0 ? Math.round(finalP + (finalP * (disc / 100))) : finalP;
                const savings = mrp - finalP;
                if (disc <= 0) return null;
                return (
                  <div className="p-4 bg-danger-soft/70 border border-danger-line rounded-xl flex items-center justify-between text-sm">
                    <div>
                      <span className="font-bold text-secondary block text-xs uppercase tracking-wider">Crossed-out price</span>
                      <span className="font-semibold text-content line-through">₹{mrp.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="text-center">
                      <span className="px-2.5 py-1 bg-danger-strong text-white font-semibold text-xs rounded-lg uppercase tracking-wider">
                        Save ₹{savings.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-success-ink block text-xs uppercase tracking-wider">Actual package price</span>
                      <span className="font-semibold text-success-ink text-sm">₹{finalP.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </section>

          <p className="text-sm text-secondary">The uplift adds to the crossed-out price only. The actual package price stays the same for both hotel options.</p>
          {saveError && <p role="alert" className="rounded-xl bg-danger-soft p-4 font-semibold text-danger-ink">{saveError}</p>}
          {/* HOSPITALITY MAP */}
          <section>
            <SectionHeader title="Hospitality & Stay Plan" icon="🏨" />
            <div className="space-y-6">
               {quote.hotels.map((hotel, idx) => (
                  <div key={idx} className="bg-canvas p-6 rounded-xl border border-line space-y-4 relative group">
                    <button onClick={() => setQuote({...quote, hotels: quote.hotels.filter((_, i) => i !== idx)})} className="absolute -right-2 -top-2 w-8 h-8 bg-surface border border-line rounded-full text-danger-ink flex items-center justify-center shadow-sm opacity-100 transition-opacity">✕</button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-muted uppercase tracking-widest">Nights Selection</label>
                        <NightSelectDropdown 
                          totalNights={quote.nights} 
                          selectedIndices={hotel.selectedNightIndices || []} 
                          usedIndices={usedNightIndices}
                          onChange={v => handleHotelChange(idx, 'selectedNightIndices', v)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-muted uppercase tracking-widest">Property Name</label>
                        <input type="text" className="w-full bg-surface border border-line rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-line" value={hotel.hotelName} onChange={e => handleHotelChange(idx, 'hotelName', e.target.value)} placeholder="e.g. Grand Resort & Spa" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-muted uppercase tracking-widest">City / Destination</label>
                        <input type="text" className="w-full bg-surface border border-line rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-line" value={hotel.city} onChange={e => handleHotelChange(idx, 'city', e.target.value)} placeholder="e.g. Gangtok" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-semibold text-muted uppercase tracking-widest">Hotel Category</label>
                          <button
                            type="button"
                            onClick={() => {
                              const cur = Boolean(customCategoryIndices[idx] || (hotel.category && !STANDARD_HOTEL_CATEGORIES.includes(hotel.category)));
                              setCustomCategoryIndices(prev => ({ ...prev, [idx]: !cur }));
                            }}
                            className="text-xs font-bold text-brand-ink hover:text-brand-ink underline cursor-pointer"
                          >
                            {(customCategoryIndices[idx] || (hotel.category && !STANDARD_HOTEL_CATEGORIES.includes(hotel.category)))
                              ? 'Select list'
                              : '+ Type custom'}
                          </button>
                        </div>
                        {(customCategoryIndices[idx] || (hotel.category && !STANDARD_HOTEL_CATEGORIES.includes(hotel.category))) ? (
                          <input
                            type="text"
                            autoFocus
                            className="w-full bg-surface border border-brand-line rounded-xl px-4 py-2.5 text-sm font-bold text-content outline-none focus:ring-2 focus:ring-brand-line placeholder:font-normal placeholder:text-muted"
                            value={hotel.category}
                            onChange={e => handleHotelChange(idx, 'category', e.target.value)}
                            placeholder="e.g. 5 Star Luxury, Boutique Heritage, Swiss Tent"
                          />
                        ) : (
                          <select
                            className="w-full bg-surface border border-line rounded-xl px-3 py-2.5 text-sm font-bold text-content outline-none focus:ring-2 focus:ring-brand-line"
                            value={STANDARD_HOTEL_CATEGORIES.includes(hotel.category) ? hotel.category : '__custom__'}
                            onChange={e => {
                              if (e.target.value === '__custom__') {
                                setCustomCategoryIndices(prev => ({ ...prev, [idx]: true }));
                              } else {
                                handleHotelChange(idx, 'category', e.target.value);
                              }
                            }}
                          >
                            <option value="3 Star">3 Star Standard</option>
                            <option value="4 Star">4 Star Premium</option>
                            <option value="5 Star">5 Star Luxury</option>
                            <option value="Luxury">Luxury Resort</option>
                            <option value="Heritage">Heritage Property</option>
                            <option value="Deluxe">Deluxe Hotel</option>
                            <option value="Boutique Heritage">Boutique Heritage</option>
                            <option value="Luxury Villa">Luxury Villa</option>
                            <option value="Premium Houseboat">Premium Houseboat</option>
                            <option value="Swiss Luxury Tent">Swiss Luxury Tent</option>
                            <option value="Eco Resort & Camp">Eco Resort & Camp</option>
                            <option value="Budget Stay">Budget Stay</option>
                            <option value="Homestay">Homestay</option>
                            <option value="__custom__">✏️ + Custom (Type manually)...</option>
                          </select>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-muted uppercase tracking-widest">Room Type</label>
                        <input type="text" className="w-full bg-surface border border-line rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-line" value={hotel.roomType} onChange={e => handleHotelChange(idx, 'roomType', e.target.value)} placeholder="e.g. Deluxe Mountain View Room, Double Occupancy" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-brand-ink uppercase tracking-widest">Hotel Special Comments / Inclusions (Shows on PDF)</label>
                        <input type="text" className="w-full bg-surface border border-brand-line rounded-xl px-4 py-2.5 text-sm font-medium text-content outline-none focus:ring-2 focus:ring-brand-line" value={hotel.comments || ''} onChange={e => handleHotelChange(idx, 'comments', e.target.value)} placeholder="e.g. Candlelight dinner included on Day 2; Complimentary welcome drink" />
                      </div>
                      <label className="block space-y-1.5 text-sm font-bold text-secondary">Meal Type
                        <input aria-label={`Hotel ${idx + 1} Meal Type`} type="text" className="w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm" value={hotel.mealPlan || ''} placeholder={quoteMealPlan(quote)} onChange={event => handleHotelChange(idx, 'mealPlan', event.target.value)} />
                      </label>
                    </div>
                  </div>
               ))}
               <button onClick={handleAddHotel} className="w-full py-4 border-2 border-dashed border-line rounded-xl text-xs font-semibold text-muted uppercase tracking-widest hover:bg-canvas hover:border-brand-line hover:text-brand-ink transition-all">+ Add Another Hotel Entry</button>
            </div>
          </section>

          <HotelAlternativeEditor value={quote.hotelAlternative} onChange={hotelAlternative => setQuote({ ...quote, hotelAlternative })} price={quote.finalSellingPrice} onPriceChange={finalSellingPrice => setQuote({ ...quote, finalSellingPrice })} city={lead.destination || ''} mealPlan={quoteMealPlan(quote)} />

          {/* INCLUSIONS MATRIX */}
          <section>
            <SectionHeader title="Inclusions Atlas" icon="📦" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-2 bg-canvas/50 p-8 rounded-xl border border-line">
                <InclusionRow label="Accommodation (Single)" item={quote.inclusions.accommodation.single} onChange={v => handleUpdateInclusion('accommodation', 'single', v.included)} />
                <InclusionRow label="Accommodation (Double)" item={quote.inclusions.accommodation.double} onChange={v => handleUpdateInclusion('accommodation', 'double', v.included)} />
                <InclusionRow label="Accommodation (Triple)" item={quote.inclusions.accommodation.triple} onChange={v => handleUpdateInclusion('accommodation', 'triple', v.included)} />
                <InclusionRow label="Meal Plan: Breakfast" item={quote.inclusions.mealPlan.breakfast} onChange={v => handleUpdateInclusion('mealPlan', 'breakfast', v.included)} />
                <InclusionRow label="Meal Plan: Lunch" item={quote.inclusions.mealPlan.lunch} onChange={v => handleUpdateInclusion('mealPlan', 'lunch', v.included)} />
                <InclusionRow label="Meal Plan: Dinner" item={quote.inclusions.mealPlan.dinner} onChange={v => handleUpdateInclusion('mealPlan', 'dinner', v.included)} />
                <InclusionRow label="Arrival Transfer" item={quote.inclusions.transfer.arrival} onChange={v => handleUpdateInclusion('transfer', 'arrival', v.included)} />
                <InclusionRow label="Departure Transfer" item={quote.inclusions.transfer.departure} onChange={v => handleUpdateInclusion('transfer', 'departure', v.included)} />
                <InclusionRow label="Local Sightseeing" item={quote.inclusions.sightseeing} onChange={v => handleUpdateInclusion('sightseeing', null, v.included)} />
                <InclusionRow label="Government Taxes" item={quote.inclusions.taxes} onChange={v => handleUpdateInclusion('taxes', null, v.included)} />
             </div>
          </section>

          {/* CUSTOM INCLUSIONS & EXCLUSIONS & TERMS */}
          <section className="space-y-6">
            <SectionHeader title="Custom Inclusions, Exclusions & Terms" icon="✏️" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="block text-xs font-semibold text-success-ink uppercase tracking-widest">Additional Custom Inclusions (One per line or comma-separated)</label>
                  <textarea 
                    rows={3} 
                    className="w-full bg-canvas border border-line rounded-xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-success-line resize-none"
                    placeholder="e.g. Candlelight Dinner, Flower Bed Decoration, Speedboat Ride, Welcome Drinks"
                    value={quote.otherInclusions || ''}
                    onChange={e => setQuote({...quote, otherInclusions: e.target.value})}
                  />
               </div>
               <div className="space-y-2">
                  <label className="block text-xs font-semibold text-danger-ink uppercase tracking-widest">Additional Custom Exclusions (One per line or comma-separated)</label>
                  <textarea 
                    rows={3} 
                    className="w-full bg-canvas border border-line rounded-xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-danger-line resize-none"
                    placeholder="e.g. 5% GST, 5% TCS, Personal laundry & tips, Monument entry tickets"
                    value={quote.otherExclusions || ''}
                    onChange={e => setQuote({...quote, otherExclusions: e.target.value})}
                  />
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="block text-xs font-semibold text-muted uppercase tracking-widest">Flight Details</label>
                  <input 
                    type="text" 
                    className="w-full bg-canvas border border-line rounded-xl px-4 py-3 text-sm font-bold outline-none"
                    placeholder="e.g. Indigo 6E-1605 (DEL-SXR) Direct Flight Included"
                    value={quote.flightDetails || ''}
                    onChange={e => setQuote({...quote, flightDetails: e.target.value})}
                  />
               </div>
               <div className="space-y-2">
                  <label className="block text-xs font-semibold text-muted uppercase tracking-widest">Cab & Transit Details</label>
                  <input 
                    type="text" 
                    className="w-full bg-canvas border border-line rounded-xl px-4 py-3 text-sm font-bold outline-none"
                    placeholder="e.g. Private Toyota Innova Crysta with English Speaking Driver"
                    value={quote.cabDetails || ''}
                    onChange={e => setQuote({...quote, cabDetails: e.target.value})}
                  />
               </div>
            </div>

            <div className="space-y-2">
               <label className="block text-xs font-semibold text-brand-ink uppercase tracking-widest">Custom Terms & Cancellation Policy</label>
               <textarea 
                 rows={3} 
                 className="w-full bg-canvas border border-line rounded-xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-line resize-none"
                 placeholder="Custom terms or cancellation policy lines..."
                 value={quote.termsAndConditions || ''}
                 onChange={e => setQuote({...quote, termsAndConditions: e.target.value})}
               />
            </div>
          </section>

          {/* ITINERARY MANAGER */}
          <section>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
               <div>
                  <SectionHeader title="Day-wise Itinerary" icon="🗺️" />
                  <span className="text-xs font-semibold text-brand-ink bg-brand-soft px-3 py-1 rounded-lg uppercase tracking-wider mt-1 inline-block">
                    {quote.nights || Math.max(1, quote.itinerary.length - 1)} Nights / {quote.itinerary.length} Days (Auto-Updated)
                  </span>
               </div>
               <div className="flex flex-wrap gap-3">
                  <button 
                    type="button" 
                    onClick={handleAddDay} 
                    className="px-5 py-2.5 bg-success-strong hover:bg-success-strong text-white rounded-xl text-xs font-semibold uppercase tracking-widest shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <span>+</span>
                    <span>Add Day</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={handleGenerateAI} 
                    disabled={isGeneratingAI} 
                    className="px-5 py-2.5 bg-brand text-white rounded-xl text-xs font-semibold uppercase tracking-widest shadow-sm flex items-center gap-2 hover:bg-brand disabled:opacity-50 transition-all"
                  >
                    {isGeneratingAI ? 'GENERATING...' : '✨ GENERATE WITH AI'}
                  </button>
               </div>
            </div>
            <div className="space-y-4">
               {quote.itinerary.map((day, idx) => (
                 <div key={idx} className="flex gap-6 items-start bg-surface p-6 rounded-xl border border-line group hover:shadow-sm transition-all relative">
                    <div className="w-10 h-10 bg-inverse text-white rounded-xl flex items-center justify-center font-semibold text-sm shrink-0">{day.day}</div>
                    <div className="flex-1 space-y-4">
                       <div className="flex justify-between items-center gap-4">
                          <input 
                           type="text" 
                           placeholder="Day Title (e.g. Arrival & Leisure)" 
                           className="w-full text-lg font-semibold text-content outline-none border-b border-transparent focus:border-brand-line pb-1" 
                           value={day.title} 
                           onChange={e => {
                             const newItin = [...quote.itinerary];
                             newItin[idx].title = e.target.value;
                             setQuote({...quote, itinerary: newItin});
                           }} 
                          />
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setPhotoPickerDayIndex(idx);
                              }}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                                (day as any).imageUrl || (day as any).img
                                  ? 'bg-brand-soft hover:bg-brand-soft text-brand-ink border border-brand-line'
                                  : 'bg-brand hover:bg-brand text-white shadow-brand-line/20'
                              }`}
                              title="Search saved images by city name and attach to Day"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span>{(day as any).imageUrl || (day as any).img ? 'Change Image' : '+ Add Image'}</span>
                            </button>

                            <label
                              className="p-1.5 rounded-xl bg-subtle hover:bg-hover text-content dark:text-zinc-300 transition-colors cursor-pointer flex items-center justify-center shrink-0 border border-line "
                              title="Upload image directly from device for this day"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleDirectDayUpload(idx, e)}
                                className="hidden"
                              />
                            </label>

                            {quote.itinerary.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleRemoveDay(idx);
                                }}
                                className="px-3 py-1.5 bg-danger-soft text-danger-ink hover:bg-danger-strong hover:text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-all shrink-0 cursor-pointer"
                                title="Delete this day"
                              >
                                🗑️ Remove Day
                              </button>
                            )}
                          </div>
                       </div>

                       {/* INLINE PHOTO PICKER (Opens right inside this day card where Add Image button is) */}
                       {photoPickerDayIndex === idx && (
                         <div className="p-4 rounded-xl bg-inverse text-white border border-line shadow-sm space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                           {/* Inline Header */}
                           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-line">
                             <div className="flex items-center gap-2">
                               <span className="w-2 h-2 rounded-full bg-brand"></span>
                               <span className="text-sm font-semibold uppercase tracking-wider text-white">
                                 Select Photo for Day {day.day}
                                </span>
                               <span className="text-xs px-2 py-0.5 rounded-full bg-brand/20 text-brand-ink font-bold border border-brand-line/30">
                                 Click Photo to Attach
                               </span>
                             </div>

                             <div className="flex items-center gap-2">
                               <label className="px-3 py-1 rounded-xl bg-brand hover:bg-brand text-on-brand text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors shadow-xs">
                                 <Upload className="w-3.5 h-3.5" />
                                 <span>Upload New</span>
                                 <input type="file" accept="image/*" onChange={(e) => handleDirectDayUpload(idx, e)} className="hidden" />
                               </label>
                               <button
                                 type="button"
                                 onClick={(e) => {
                                   e.preventDefault();
                                   e.stopPropagation();
                                   setPhotoPickerDayIndex(null);
                                 }}
                                 className="p-1 rounded-lg text-muted hover:text-white hover:bg-inverse transition-colors cursor-pointer"
                                 title="Close picker"
                               >
                                 <X className="w-4 h-4" />
                               </button>
                             </div>
                           </div>

                           {/* Search & Quick Pills */}
                           <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                             <div className="relative flex-1">
                               <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                               <input
                                 type="text"
                                 placeholder="Search by city or title (e.g. Manali, Kashmir, Goa, Taj Mahal)..."
                                 value={photoSearchQuery}
                                 onChange={(e) => setPhotoSearchQuery(e.target.value)}
                                 className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-inverse border border-line text-sm text-white placeholder-muted outline-none focus:ring-2 focus:ring-brand-line"
                                 autoFocus
                               />
                               {photoSearchQuery && (
                                 <button
                                   type="button"
                                   onClick={() => setPhotoSearchQuery('')}
                                   className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-white"
                                 >
                                   <X className="w-3 h-3" />
                                 </button>
                               )}
                             </div>

                             <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                               {['All', lead.destination, 'Kashmir', 'Manali', 'Goa', 'Jaipur', 'Kerala', 'Ladakh']
                                 .filter(Boolean)
                                 .filter((c, i, a) => a.indexOf(c) === i)
                                 .map((c) => (
                                   <button
                                     key={c}
                                     type="button"
                                     onClick={() => setPhotoSearchQuery(c === 'All' ? '' : c!)}
                                     className={`px-2 py-0.5 rounded-lg text-xs font-bold shrink-0 transition-colors ${
                                       (c === 'All' && !photoSearchQuery) || photoSearchQuery.toLowerCase() === c!.toLowerCase()
                                         ? 'bg-brand text-on-brand'
                                         : 'bg-inverse text-slate-300 hover:bg-inverse'
                                     }`}
                                   >
                                     {c}
                                   </button>
                                 ))}
                             </div>
                           </div>

                           {/* Inline Photos Grid */}
                           <div className="max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                             {displayedInlinePhotos.length === 0 ? (
                               <div className="py-6 text-center text-muted text-sm space-y-1">
                                 <p>No photos found matching "{photoSearchQuery}".</p>
                                 <button
                                   type="button"
                                   onClick={() => setPhotoSearchQuery('')}
                                   className="text-brand-ink underline font-bold"
                                 >
                                   Show all saved photos ({libraryPhotos.length})
                                 </button>
                               </div>
                             ) : (
                               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                 {displayedInlinePhotos.map((item) => (
                                   <div
                                     key={item.id}
                                     onClick={(e) => {
                                       e.preventDefault();
                                       e.stopPropagation();
                                       const newItin = quote.itinerary.map((d, i) =>
                                         i === idx ? { ...d, imageUrl: item.image_url, img: item.image_url } : d
                                       );
                                       setQuote({ ...quote, itinerary: newItin });
                                       setPhotoPickerDayIndex(null);
                                     }}
                                     className="group relative rounded-xl overflow-hidden border border-line hover:border-brand-line bg-inverse/80 cursor-pointer transition-all hover:scale-[1.02] shadow-sm flex flex-col"
                                   >
                                     <div className="aspect-video relative overflow-hidden bg-inverse">
                                       <img
                                         src={item.image_url}
                                         alt={item.title || item.city}
                                         className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                         loading="lazy"
                                       />
                                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />
                                       <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/60 text-xs font-bold text-brand-ink">
                                         {item.city}
                                       </span>
                                       <span className="absolute bottom-1 left-1.5 right-1.5 text-xs font-bold text-white truncate drop-shadow-sm">
                                         {item.title || item.city}
                                       </span>
                                     </div>
                                     <div className="p-1 bg-inverse/95 text-center">
                                       <span className="text-xs font-semibold text-brand-ink group-hover:underline">
                                         ✓ Add to Day {day.day}
                                       </span>
                                     </div>
                                   </div>
                                 ))}
                               </div>
                             )}
                           </div>
                         </div>
                       )}

                       {Boolean((day as any).imageUrl || (day as any).img) && (
                         <div className="flex items-center gap-3 p-3 bg-brand-soft/70 rounded-xl border border-brand-line animate-in fade-in">
                           <img
                             src={(day as any).imageUrl || (day as any).img}
                             alt={day.title || `Day ${day.day}`}
                             className="w-16 h-12 object-cover rounded-xl border border-brand-line shrink-0 shadow-2xs"
                           />
                           <div className="flex-1 min-w-0">
                             <span className="text-xs font-semibold uppercase tracking-wider text-brand-ink block">Photo Attached</span>
                             <span className="text-xs text-secondary truncate block">Will be displayed on Day {day.day} in PDF proposal</span>
                           </div>
                           <button
                             type="button"
                             onClick={(e) => {
                               e.preventDefault();
                               e.stopPropagation();
                               setQuote(prev => ({
                                 ...prev,
                                 itinerary: prev.itinerary.map((d, i) =>
                                   i === idx ? { ...d, imageUrl: '', img: '' } : d
                                 )
                               }));
                             }}
                             className="p-1.5 rounded-lg text-muted hover:text-danger-ink hover:bg-danger-soft transition-colors cursor-pointer"
                             title="Remove photo from this day"
                           >
                             <X className="w-4 h-4" />
                           </button>
                         </div>
                       )}
                       <textarea 
                        placeholder="Activity details..." 
                        className="w-full text-sm text-secondary font-medium outline-none h-20 resize-none bg-canvas/50 p-4 rounded-xl" 
                        value={day.description}
                        onChange={e => {
                          const newItin = [...quote.itinerary];
                          newItin[idx].description = e.target.value;
                          setQuote({...quote, itinerary: newItin});
                        }}
                       />
                    </div>
                 </div>
               ))}
            </div>
          </section>
        </div>

        <footer className="px-4 py-3 md:px-8 bg-canvas border-t border-line flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button onClick={onClose} className="px-6 py-3.5 text-muted font-semibold text-xs uppercase tracking-widest hover:text-content transition-colors">
            Discard Draft
          </button>
          
          <div className="flex flex-wrap items-center gap-3">
            <button 
              type="button"
              onClick={async () => {
                try {
                  const title = quote.packageTitle || `${lead.destination || 'Tour'} Itinerary - ${lead.name}`;
                  const daysWithImages = (quote.itinerary || []).map((d: any, idx: number) => ({
                    day: d.day || idx + 1,
                    title: d.title || `Day ${idx + 1}`,
                    description: d.description || '',
                    imageUrl: (d as any).imageUrl || (d as any).img || (d as any).image || '',
                    img: (d as any).img || (d as any).imageUrl || (d as any).image || ''
                  }));
                  await api.createTemplate({
                    title: title,
                    destination: lead.destination || 'Custom',
                    nights: quote.nights || (quote.itinerary?.length || 5),
                    templateData: {
                      ...quote,
                      days: daysWithImages,
                      itinerary: daysWithImages
                    }
                  });
                  alert(`✅ Draft itinerary saved successfully with attached photos to "Saved Itineraries" section with title:\n\n"${title}"`);
                } catch (err) {
                  console.error('Failed to save draft to templates:', err);
                  alert('Failed to save itinerary template.');
                }
              }} 
              className="px-8 py-4 bg-success-strong hover:bg-success-strong text-white rounded-xl font-semibold text-xs uppercase tracking-widest shadow-sm shadow-success-line/20 transition-all flex items-center gap-2"
            >
              <span>💾</span>
              <span>Save Draft to Saved Itineraries</span>
            </button>

            <button 
              onClick={handleSaveQuote}
              className="px-10 py-4 bg-inverse text-white rounded-xl font-semibold text-xs uppercase tracking-widest shadow-sm shadow-line hover:bg-inverse transition-all"
            >
              Save changes
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

// Fix: Added default export for GiveQuoteView component to resolve import errors in App.tsx.
export default GiveQuoteView;
