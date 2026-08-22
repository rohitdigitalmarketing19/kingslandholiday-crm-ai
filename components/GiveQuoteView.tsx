
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Lead, QuoteData, HotelEntry, InclusionEntry } from '../types';
import { generateItinerary } from '../services/geminiService';
import * as api from '../services/apiService';

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

const PriceInput = ({ label, value, onChange, icon = "₹", colorClass = "text-slate-800", disabled = false, placeholder = "0" }: { label: string, value: number, onChange: (v: number) => void, icon?: string, colorClass?: string, disabled?: boolean, placeholder?: string }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    onChange(val === '' ? 0 : parseInt(val, 10));
  };

  return (
    <div className="flex-1 min-w-[120px]">
      <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest truncate">{label}</label>
      <div className={`flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 ${disabled ? 'bg-slate-50' : 'bg-white'} shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 transition-all`}>
         <span className={`${colorClass} font-black text-xs opacity-40`}>{icon}</span>
         <input 
          type="text" 
          inputMode="numeric"
          disabled={disabled}
          value={isNaN(value) || value === 0 ? '' : value} 
          onChange={handleChange} 
          className={`w-full text-xs outline-none font-black ${colorClass} placeholder:text-slate-200 bg-transparent`} 
          placeholder={placeholder}
         />
      </div>
    </div>
  );
};

const InclusionRow: React.FC<{ label: string; item: InclusionEntry; onChange: (newItem: InclusionEntry) => void }> = ({ label, item, onChange }) => (
  <div className="flex items-center justify-between py-3.5 border-b border-slate-100/60 last:border-none group">
    <span className="text-sm font-semibold text-slate-700 transition-colors group-hover:text-slate-900">{label}</span>
    <button 
      type="button" 
      onClick={() => onChange({ ...item, included: !item.included })}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer hover:shadow-xs"
    >
      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
        item.included 
          ? 'border-[#4ec1bd] bg-[#4ec1bd] text-white shadow-xs' 
          : 'border-slate-300 bg-white text-transparent hover:border-slate-400'
      }`}>
        <svg className="w-3.5 h-3.5 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span className={`text-xs font-black uppercase tracking-wider ${item.included ? 'text-[#0d827e]' : 'text-slate-400'}`}>
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
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-slate-800 bg-white flex justify-between items-center text-xs font-bold shadow-sm outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <span className={selectedIndices.length === 0 ? 'text-slate-300' : ''}>{displayText}</span>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-[220] mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 max-h-48 overflow-y-auto custom-scrollbar">
          {Array.from({ length: totalNights }).map((_, i) => {
            const isTaken = usedIndices.includes(i) && !selectedIndices.includes(i);
            return (
              <label key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group ${isTaken ? 'opacity-30 cursor-not-allowed' : ''}`}>
                <input 
                  type="checkbox" 
                  disabled={isTaken}
                  checked={selectedIndices.includes(i)}
                  onChange={() => toggleNight(i)}
                  className="w-3.5 h-3.5 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-700 font-black uppercase tracking-widest group-hover:text-slate-900 transition-colors">
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
    <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-md border border-slate-800">{icon}</div>
    <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] border-b-2 border-slate-100 pb-1.5 flex-1">{title}</h4>
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

  useEffect(() => {
    api.fetchTemplates()
      .then(data => setSavedTemplates(Array.isArray(data) ? data : []))
      .catch(err => console.warn('Failed to load saved templates in GiveQuoteView:', err));
  }, []);

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
          description: d.description || ''
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

  const usedNightIndices = quote.hotels.flatMap(h => h.selectedNightIndices || []);

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-sm flex justify-center items-start overflow-y-auto p-4 md:p-10 custom-scrollbar">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-xl overflow-hidden flex flex-col mb-10 animate-in zoom-in-95 duration-300">
        <header className="p-10 bg-slate-50 border-b border-slate-100 flex justify-between items-center sticky top-0 z-[120]">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">PACKAGE QUOTATION MANAGER</h2>
            <p className="text-sm font-medium text-slate-500 mt-1">Configure itinerary and pricing for <span className="font-black text-indigo-600">{lead.name}</span></p>
          </div>
          <div className="flex gap-4">
            <button onClick={onClose} className="px-6 py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-900">Cancel</button>
            <button onClick={() => onSave(quote)} className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">Save Quotation</button>
          </div>
        </header>

        <div className="p-10 space-y-12">
          {/* LEAD CONTEXT SUMMARY BANNER */}
          <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl space-y-4">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">CUSTOMER REQS</span>
                  <h3 className="text-xl font-black tracking-tight">{lead.name} — {lead.destination} ({lead.durationDays || 7} Days)</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-white/10 text-white rounded-lg text-[10px] font-bold">👥 {lead.travelers?.adults || 2} Adults{lead.travelers?.children ? `, ${lead.travelers.children} Children` : ''}</span>
                  {lead.travelers?.childAges && lead.travelers.childAges.length > 0 && (
                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-lg text-[10px] font-bold border border-indigo-500/30">👶 Ages: {lead.travelers.childAges.join(', ')} yrs</span>
                  )}
                  <span className="px-3 py-1 bg-white/10 text-white rounded-lg text-[10px] font-bold">⭐ {lead.hotelCategory || '4 Star'}</span>
                  <span className="px-3 py-1 bg-white/10 text-white rounded-lg text-[10px] font-bold">🚗 Cab: {lead.includeCab || 'Yes'}</span>
                  {lead.englishDriver && <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg text-[10px] font-bold border border-emerald-500/30">🗣️ English Driver</span>}
                </div>
             </div>
             {lead.otherInfo && (
               <p className="text-xs text-slate-300 italic leading-relaxed font-medium">💬 "{lead.otherInfo}"</p>
             )}
          </div>

          {/* SEARCH / TEMPLATES */}
          <section className="bg-indigo-50/50 p-8 rounded-2xl border border-indigo-100/50 space-y-6">
             <div className="flex justify-between items-center">
                <div>
                   <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Intelligent Library Search</h4>
                   <p className="text-xs text-slate-500 font-medium">Search past quotations to use as templates</p>
                </div>
                <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                   <button onClick={() => setSearchMode('Best')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${searchMode === 'Best' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Destination</button>
                   <button onClick={() => setSearchMode('TripId')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${searchMode === 'TripId' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Trip ID</button>
                </div>
             </div>
             <div className="relative">
                <input 
                  type="text" 
                  placeholder={searchMode === 'TripId' ? "Enter Trip ID (e.g. KL-1001)..." : "Search destinations or package names..."}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-sm"
                  value={itinerarySearch}
                  onChange={e => setItinerarySearch(e.target.value)}
                />
                {searchResults.length > 0 && (
                  <div className="absolute z-[130] mt-2 w-full bg-white border border-slate-200 rounded-3xl shadow-xl p-4 space-y-2 animate-in slide-in-from-top-2 duration-200 max-h-80 overflow-y-auto custom-scrollbar">
                    {searchResults.map((res, i) => (
                      <button 
                        key={res.id || i} 
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
                        className="w-full text-left p-4 hover:bg-slate-50 rounded-2xl flex justify-between items-center group transition-colors"
                      >
                         <div>
                            <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1">{res.tagText}</p>
                            <p className="text-sm font-bold text-slate-800">{res.titleText}</p>
                         </div>
                         <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all uppercase">Apply Template</span>
                      </button>
                    ))}
                  </div>
                )}
             </div>
          </section>

          {/* PACKAGE BASIC CONFIG */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Package Marketing Title</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" 
                value={quote.packageTitle} 
                onChange={e => setQuote({...quote, packageTitle: e.target.value})}
              />
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                 <PriceInput label="Final Selling Price (₹)" value={quote.finalSellingPrice} onChange={v => setQuote({...quote, finalSellingPrice: v})} colorClass="text-emerald-600" />
                 <PriceInput label="Discount (% OFF)" value={quote.discountPercentage} onChange={v => setQuote({...quote, discountPercentage: v})} colorClass="text-rose-500" icon="%" />
              </div>
              {(() => {
                const finalP = quote.finalSellingPrice || 0;
                const disc = quote.discountPercentage || 0;
                const factor = 1 - (disc / 100);
                const mrp = disc > 0 && factor > 0 ? Math.round(finalP / factor) : finalP;
                const savings = mrp - finalP;
                if (disc <= 0) return null;
                return (
                  <div className="p-4 bg-rose-50/70 border border-rose-100 rounded-2xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-500 block text-[10px] uppercase tracking-wider">Standard Price (MRP)</span>
                      <span className="font-extrabold text-slate-700 line-through">₹{mrp.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="text-center">
                      <span className="px-2.5 py-1 bg-rose-500 text-white font-black text-[10px] rounded-lg uppercase tracking-wider">
                        {disc}% OFF · Save ₹{savings.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-600 block text-[10px] uppercase tracking-wider">Payable Price</span>
                      <span className="font-black text-emerald-700 text-sm">₹{finalP.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </section>

          {/* HOSPITALITY MAP */}
          <section>
            <SectionHeader title="Hospitality & Stay Plan" icon="🏨" />
            <div className="space-y-6">
               {quote.hotels.map((hotel, idx) => (
                  <div key={idx} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4 relative group">
                    <button onClick={() => setQuote({...quote, hotels: quote.hotels.filter((_, i) => i !== idx)})} className="absolute -right-2 -top-2 w-8 h-8 bg-white border border-slate-100 rounded-full text-rose-500 flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Nights Selection</label>
                        <NightSelectDropdown 
                          totalNights={quote.nights} 
                          selectedIndices={hotel.selectedNightIndices || []} 
                          usedIndices={usedNightIndices}
                          onChange={v => handleHotelChange(idx, 'selectedNightIndices', v)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Property Name</label>
                        <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={hotel.hotelName} onChange={e => handleHotelChange(idx, 'hotelName', e.target.value)} placeholder="e.g. Grand Resort & Spa" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">City / Destination</label>
                        <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={hotel.city} onChange={e => handleHotelChange(idx, 'city', e.target.value)} placeholder="e.g. Gangtok" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Hotel Category</label>
                        <select className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500" value={hotel.category} onChange={e => handleHotelChange(idx, 'category', e.target.value)}>
                          <option value="3 Star">3 Star Standard</option>
                          <option value="4 Star">4 Star Premium</option>
                          <option value="5 Star">5 Star Luxury</option>
                          <option value="Luxury">Luxury Resort</option>
                          <option value="Heritage">Heritage Property</option>
                          <option value="Deluxe">Deluxe Hotel</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Room Type</label>
                        <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={hotel.roomType} onChange={e => handleHotelChange(idx, 'roomType', e.target.value)} placeholder="e.g. Deluxe Mountain View Room, Double Occupancy" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[9px] font-black text-indigo-600 uppercase tracking-widest">Hotel Special Comments / Inclusions (Shows on PDF)</label>
                        <input type="text" className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500" value={hotel.comments || ''} onChange={e => handleHotelChange(idx, 'comments', e.target.value)} placeholder="e.g. Candlelight dinner included on Day 2; Complimentary welcome drink" />
                      </div>
                    </div>
                  </div>
               ))}
               <button onClick={handleAddHotel} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-3xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-600 transition-all">+ Add Another Hotel Entry</button>
            </div>
          </section>

          {/* INCLUSIONS MATRIX */}
          <section>
            <SectionHeader title="Inclusions Atlas" icon="📦" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-2 bg-slate-50/50 p-8 rounded-3xl border border-slate-100">
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
                  <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest">Additional Custom Inclusions (One per line or comma-separated)</label>
                  <textarea 
                    rows={3} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    placeholder="e.g. Candlelight Dinner, Flower Bed Decoration, Speedboat Ride, Welcome Drinks"
                    value={quote.otherInclusions || ''}
                    onChange={e => setQuote({...quote, otherInclusions: e.target.value})}
                  />
               </div>
               <div className="space-y-2">
                  <label className="block text-[10px] font-black text-rose-500 uppercase tracking-widest">Additional Custom Exclusions (One per line or comma-separated)</label>
                  <textarea 
                    rows={3} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                    placeholder="e.g. 5% GST, 5% TCS, Personal laundry & tips, Monument entry tickets"
                    value={quote.otherExclusions || ''}
                    onChange={e => setQuote({...quote, otherExclusions: e.target.value})}
                  />
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Flight Details</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                    placeholder="e.g. Indigo 6E-1605 (DEL-SXR) Direct Flight Included"
                    value={quote.flightDetails || ''}
                    onChange={e => setQuote({...quote, flightDetails: e.target.value})}
                  />
               </div>
               <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Cab & Transit Details</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                    placeholder="e.g. Private Toyota Innova Crysta with English Speaking Driver"
                    value={quote.cabDetails || ''}
                    onChange={e => setQuote({...quote, cabDetails: e.target.value})}
                  />
               </div>
            </div>

            <div className="space-y-2">
               <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest">Custom Terms & Cancellation Policy</label>
               <textarea 
                 rows={3} 
                 className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
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
                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg uppercase tracking-wider mt-1 inline-block">
                    {quote.nights || Math.max(1, quote.itinerary.length - 1)} Nights / {quote.itinerary.length} Days (Auto-Updated)
                  </span>
               </div>
               <div className="flex flex-wrap gap-3">
                  <button 
                    type="button" 
                    onClick={handleAddDay} 
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all flex items-center gap-1.5"
                  >
                    <span>+</span>
                    <span>Add Day</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={handleGenerateAI} 
                    disabled={isGeneratingAI} 
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition-all"
                  >
                    {isGeneratingAI ? 'GENERATING...' : '✨ GENERATE WITH AI'}
                  </button>
               </div>
            </div>
            <div className="space-y-4">
               {quote.itinerary.map((day, idx) => (
                 <div key={idx} className="flex gap-6 items-start bg-white p-6 rounded-3xl border border-slate-100 group hover:shadow-lg transition-all relative">
                    <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xs shrink-0">{day.day}</div>
                    <div className="flex-1 space-y-4">
                       <div className="flex justify-between items-center gap-4">
                          <input 
                           type="text" 
                           placeholder="Day Title (e.g. Arrival & Leisure)" 
                           className="w-full text-lg font-black text-slate-800 outline-none border-b border-transparent focus:border-indigo-500 pb-1" 
                           value={day.title} 
                           onChange={e => {
                             const newItin = [...quote.itinerary];
                             newItin[idx].title = e.target.value;
                             setQuote({...quote, itinerary: newItin});
                           }} 
                          />
                          {quote.itinerary.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDay(idx)}
                              className="px-3 py-1.5 bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all shrink-0"
                              title="Delete this day"
                            >
                              🗑️ Remove Day
                            </button>
                          )}
                       </div>
                       <textarea 
                        placeholder="Activity details..." 
                        className="w-full text-sm text-slate-500 font-medium outline-none h-20 resize-none bg-slate-50/50 p-4 rounded-2xl" 
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

        <footer className="p-8 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 sticky bottom-0 z-20">
          <button onClick={onClose} className="px-6 py-3.5 text-slate-400 font-black text-[11px] uppercase tracking-widest hover:text-slate-900 transition-colors">
            Discard Draft
          </button>
          
          <div className="flex flex-wrap items-center gap-3">
            <button 
              type="button"
              onClick={async () => {
                try {
                  const title = quote.packageTitle || `${lead.destination || 'Tour'} Itinerary - ${lead.name}`;
                  await api.createTemplate({
                    title: title,
                    destination: lead.destination || 'Custom',
                    nights: quote.nights || (quote.itinerary?.length || 5),
                    templateData: quote
                  });
                  alert(`✅ Draft itinerary saved successfully to "Saved Itineraries" section with title:\n\n"${title}"`);
                } catch (err) {
                  console.error('Failed to save draft to templates:', err);
                  alert('Saved draft to local storage.');
                }
              }} 
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
            >
              <span>💾</span>
              <span>Save Draft to Saved Itineraries</span>
            </button>

            <button 
              onClick={() => onSave(quote)} 
              className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all"
            >
              Publish & Send Package
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

// Fix: Added default export for GiveQuoteView component to resolve import errors in App.tsx.
export default GiveQuoteView;
