import React, { useState, useEffect } from 'react';
import * as api from '../services/apiService';
import { generateItinerary } from '../services/geminiService';
import { Lead, LeadIntent } from '../types';

interface DayPlan {
  day: number;
  title: string;
  description: string;
}

const ItineraryLibrary: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showManualModal, setShowManualModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);

  // Manual Form State
  const [manualTitle, setManualTitle] = useState('');
  const [manualDestination, setManualDestination] = useState('');
  const [manualNights, setManualNights] = useState(5);
  const [manualDays, setManualDays] = useState<DayPlan[]>([
    { day: 1, title: 'Arrival & Welcome Dinner', description: 'Arrive at destination, airport pickup, transfer to hotel, and welcome briefing.' },
    { day: 2, title: 'City Tour & Local Culture', description: 'Full day guided tour exploring key attractions, historical monuments, and local markets.' },
    { day: 3, title: 'Leisure & Adventure Activity', description: 'Free morning followed by afternoon excursion and scenic sunset point visit.' },
    { day: 4, title: 'Departure', description: 'Breakfast at hotel, souvenir shopping, check-out, and private transfer to airport.' },
  ]);

  // AI Form State
  const [aiDestination, setAiDestination] = useState('Switzerland');
  const [aiDaysCount, setAiDaysCount] = useState(7);
  const [aiVibe, setAiVibe] = useState('Luxury & Scenic');
  const [aiNotes, setAiNotes] = useState('');

  // API Key State
  const [apiKey, setApiKey] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') || '' : '';
  });

  // Load templates from API
  const loadTemplates = async () => {
    try {
      const data = await api.fetchTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('gemini_api_key', apiKey.trim());
      alert('Gemini API Key saved successfully! All AI operations will now use your key.');
    } else {
      localStorage.removeItem('gemini_api_key');
      alert('Custom API key removed. Falling back to server default.');
    }
    setShowApiKeyModal(false);
  };

  const handleAddManualDay = () => {
    const nextDayNum = manualDays.length + 1;
    setManualDays([
      ...manualDays,
      { day: nextDayNum, title: `Day ${nextDayNum} Exploration`, description: `Custom activities and sightseeing for day ${nextDayNum}.` }
    ]);
  };

  const handleRemoveManualDay = (index: number) => {
    if (manualDays.length <= 1) return;
    const updated = manualDays.filter((_, i) => i !== index).map((d, i) => ({ ...d, day: i + 1 }));
    setManualDays(updated);
  };

  const handleSaveManualTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim() || !manualDestination.trim()) {
      alert('Please fill in title and destination.');
      return;
    }

    try {
      const templateData = {
        title: manualTitle.trim(),
        days: manualDays,
        totalPrice: 50000,
        bestValueWindow: 'Year-Round'
      };

      const newTemplate = await api.createTemplate({
        title: manualTitle.trim(),
        destination: manualDestination.trim(),
        nights: Math.max(1, manualDays.length - 1),
        templateData
      });

      setTemplates([newTemplate, ...templates]);
      setShowManualModal(false);
      setManualTitle('');
      setManualDestination('');
      alert('Manual itinerary template saved successfully!');
    } catch (err) {
      console.error('Failed to save manual template:', err);
      alert('Failed to save itinerary template.');
    }
  };

  const handleGenerateAITemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiDestination.trim()) return;

    setIsGeneratingAI(true);
    try {
      const mockLead: Lead = {
        id: 'mock',
        tripId: 'MASTER-TEMPLATE',
        name: 'Master Package',
        email: '',
        destination: aiDestination.trim(),
        rawInquiry: `Master Template Generation for ${aiDestination.trim()}. Vibe: ${aiVibe}. Notes: ${aiNotes}`,
        durationDays: aiDaysCount,
        travelDate: '2026-03-01',
        summary: `${aiVibe} master template for ${aiDestination.trim()}`,
        budgetTier: 'Luxury',
        intent: LeadIntent.HIGH,
        score: 95,
        assignedTo: '',
        source: 'AI Template Generator',
        status: 'New',
        createdAt: '',
        lastFollowUp: '',
        travelers: { adults: 2, children: 0, childAges: [] }
      };

      const itin = await generateItinerary(mockLead);

      const newTemplate = await api.createTemplate({
        title: itin.title || `${aiDestination.trim()} Master Experience`,
        destination: aiDestination.trim(),
        nights: Math.max(1, aiDaysCount - 1),
        templateData: itin
      });

      setTemplates([newTemplate, ...templates]);
      setShowAIModal(false);
      alert(`Success! AI crafted a master template for ${aiDestination.trim()}. Saved to library.`);
    } catch (err) {
      console.error('AI Generation Error:', err);
      alert('AI Generation failed. Check network or API key configuration.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await api.deleteTemplate(id);
      setTemplates(templates.filter(t => t.id !== id));
    } catch (err) {
      console.error('Failed to delete template:', err);
      alert('Failed to delete template.');
    }
  };

  const filteredTemplates = templates.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.destination.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Banner & Actions Header */}
      <div className="bg-slate-900 rounded-2xl p-8 md:p-10 text-white shadow-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 border border-slate-800">
        <div className="max-w-xl space-y-2">
           <div className="flex items-center gap-3">
             <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/20 px-3 py-1 rounded-lg border border-indigo-500/30">
                ITINERARY MASTER LIBRARY
             </span>
             {apiKey ? (
               <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/20 px-3 py-1 rounded-lg border border-emerald-500/30">
                  🔑 Custom API Key Active
               </span>
             ) : (
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-800 px-3 py-1 rounded-lg">
                  ⚡ Default API Proxy
               </span>
             )}
           </div>
           <h3 className="text-3xl font-black tracking-tight">Saved Package Templates</h3>
           <p className="text-slate-400 text-sm font-medium leading-relaxed">
             Create master itineraries manually or generate them using AI with your custom Gemini API key.
           </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button 
            onClick={() => setShowApiKeyModal(true)}
            className="px-5 py-3.5 bg-slate-800 text-slate-200 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-700 transition-all border border-slate-700 flex items-center gap-2"
          >
            🔑 API Key Settings
          </button>
          
          <button 
            onClick={() => setShowManualModal(true)}
            className="px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-2"
          >
            + Add Manual Itinerary
          </button>

          <button 
            onClick={() => setShowAIModal(true)}
            disabled={isGeneratingAI}
            className="px-6 py-3.5 bg-emerald-500 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2 disabled:opacity-50"
          >
            ✨ Generate with AI
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative group max-w-2xl">
         <input 
           type="text" 
           placeholder="Search saved packages by destination or title..." 
           className="w-full pl-14 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all group-focus-within:shadow-md"
           value={searchQuery}
           onChange={(e) => setSearchQuery(e.target.value)}
         />
         <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
           </svg>
         </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredTemplates.map((item) => (
          <div key={item.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden hover:shadow-xl hover:-translate-y-1.5 transition-all group flex flex-col h-full">
            <div className="h-40 bg-slate-100 relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 group-hover:from-indigo-500/20 transition-all duration-500"></div>
               <div className="absolute top-4 right-4 bg-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-md">
                  {item.nights} Nights
               </div>
               <div className="absolute bottom-4 left-4">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Destination</span>
                  <span className="text-base font-bold text-slate-800 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-lg border border-white/50">{item.destination}</span>
               </div>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <h4 className="text-base font-bold text-slate-800 mb-6 line-clamp-2 min-h-[48px] group-hover:text-indigo-600 transition-colors leading-tight">
                {item.title}
              </h4>
              <div className="mt-auto pt-6 border-t border-slate-50 flex justify-between items-center">
                 <button 
                   onClick={() => setPreviewTemplate(item)}
                   className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-all"
                 >
                   👁️ View Itinerary
                 </button>
                 <button 
                   onClick={() => handleDeleteTemplate(item.id)}
                   className="p-2.5 bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all" 
                   title="Delete"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                   </svg>
                 </button>
              </div>
            </div>
          </div>
        ))}
        {filteredTemplates.length === 0 && (
          <div className="col-span-full py-24 bg-white border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <span className="text-4xl opacity-40">📂</span>
             </div>
             <p className="font-bold text-base text-slate-600 uppercase tracking-widest mb-1">No matching itineraries found</p>
             <p className="text-sm text-slate-400 mb-6">Create a manual itinerary or generate a new AI template above.</p>
             <div className="flex gap-4">
                <button onClick={() => setShowManualModal(true)} className="px-6 py-3 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-md">Add Manual Itinerary</button>
                <button onClick={() => setShowAIModal(true)} className="px-6 py-3 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md">Generate with AI</button>
             </div>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD MANUAL ITINERARY */}
      {showManualModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto custom-scrollbar">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-10 my-10 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center pb-6 border-b border-slate-100 mb-8">
              <div>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block mb-1">MANUAL CREATOR</span>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Create Manual Itinerary Package</h3>
              </div>
              <button onClick={() => setShowManualModal(false)} className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:text-slate-800">✕</button>
            </div>

            <form onSubmit={handleSaveManualTemplate} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Package Title *</label>
                  <input 
                    type="text" 
                    required 
                    value={manualTitle}
                    onChange={e => setManualTitle(e.target.value)}
                    placeholder="e.g. Kashmir 6N/7D Premium Paradise"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Destination *</label>
                  <input 
                    type="text" 
                    required 
                    value={manualDestination}
                    onChange={e => setManualDestination(e.target.value)}
                    placeholder="e.g. Kashmir"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Day-Wise Plan Editor */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Day-Wise Plan ({manualDays.length} Days)</h4>
                  <button 
                    type="button" 
                    onClick={handleAddManualDay}
                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-all"
                  >
                    + Add Day
                  </button>
                </div>

                <div className="space-y-4 max-h-80 overflow-y-auto p-2 custom-scrollbar border border-slate-100 rounded-2xl">
                  {manualDays.map((d, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-indigo-600 uppercase">Day {d.day}</span>
                        {manualDays.length > 1 && (
                          <button type="button" onClick={() => handleRemoveManualDay(idx)} className="text-xs text-rose-500 font-bold hover:underline">Remove</button>
                        )}
                      </div>
                      <input 
                        type="text" 
                        value={d.title}
                        onChange={e => {
                          const updated = [...manualDays];
                          updated[idx].title = e.target.value;
                          setManualDays(updated);
                        }}
                        placeholder="Day Title"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                      />
                      <textarea 
                        rows={2}
                        value={d.description}
                        onChange={e => {
                          const updated = [...manualDays];
                          updated[idx].description = e.target.value;
                          setManualDays(updated);
                        }}
                        placeholder="Day Activities / Description"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none resize-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowManualModal(false)} className="px-6 py-3 text-slate-400 font-bold text-xs">Cancel</button>
                <button type="submit" className="px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl">Save Master Template</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: GENERATE ITINERARY WITH AI */}
      {showAIModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-10 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center pb-6 border-b border-slate-100 mb-8">
              <div>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">AI GENERATOR ENGINE</span>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Generate AI Master Itinerary</h3>
              </div>
              <button onClick={() => setShowAIModal(false)} className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:text-slate-800">✕</button>
            </div>

            <form onSubmit={handleGenerateAITemplate} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Destination *</label>
                <input 
                  type="text" 
                  required 
                  value={aiDestination}
                  onChange={e => setAiDestination(e.target.value)}
                  placeholder="e.g. Switzerland / Bali / Kashmir"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Duration (Days)</label>
                  <input 
                    type="number" 
                    min={1} max={30}
                    value={aiDaysCount}
                    onChange={e => setAiDaysCount(parseInt(e.target.value) || 5)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Package Vibe</label>
                  <select 
                    value={aiVibe}
                    onChange={e => setAiVibe(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                  >
                    <option value="Luxury & Scenic">Luxury & Scenic</option>
                    <option value="Honeymoon & Romantic">Honeymoon & Romantic</option>
                    <option value="Family Friendly">Family Friendly</option>
                    <option value="Budget Explorer">Budget Explorer</option>
                    <option value="Adventure & Culture">Adventure & Culture</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Special Requirements / Notes</label>
                <textarea 
                  rows={3}
                  value={aiNotes}
                  onChange={e => setAiNotes(e.target.value)}
                  placeholder="e.g. Include private cab, 4-star mountain view resorts, gondola tickets..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowAIModal(false)} className="px-6 py-3 text-slate-400 font-bold text-xs">Cancel</button>
                <button 
                  type="submit" 
                  disabled={isGeneratingAI}
                  className="px-8 py-3.5 bg-emerald-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl disabled:opacity-50 flex items-center gap-2"
                >
                  {isGeneratingAI ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      AI THINKING...
                    </>
                  ) : 'Generate Package with AI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIGURE GEMINI API KEY */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-10 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center pb-6 border-b border-slate-100 mb-6">
              <div>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block mb-1">GEMINI AI INTEGRATION</span>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Configure Gemini API Key</h3>
              </div>
              <button onClick={() => setShowApiKeyModal(false)} className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:text-slate-800">✕</button>
            </div>

            <div className="space-y-6">
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Provide your custom Google Gemini API Key. When set, all lead analysis and itinerary generation will run directly using your API quota.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Gemini API Key</label>
                <input 
                  type="password" 
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="AIZA..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button onClick={() => { setApiKey(''); localStorage.removeItem('gemini_api_key'); setShowApiKeyModal(false); }} className="px-4 py-2.5 text-rose-500 font-bold text-xs hover:bg-rose-50 rounded-xl">Clear Key</button>
                <button onClick={handleSaveApiKey} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-md">Save Settings</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PREVIEW ITINERARY TEMPLATE */}
      {previewTemplate && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto custom-scrollbar">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-10 my-10 animate-in zoom-in-95 duration-300 space-y-6">
            <div className="flex justify-between items-start pb-6 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block mb-1">MASTER TEMPLATE PREVIEW</span>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">{previewTemplate.title}</h3>
                <span className="text-xs font-bold text-slate-400 mt-1 block">{previewTemplate.destination} · {previewTemplate.nights} Nights</span>
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:text-slate-800">✕</button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
              {previewTemplate.templateData?.days ? (
                previewTemplate.templateData.days.map((d: any, idx: number) => (
                  <div key={idx} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">Day 0{d.day}</span>
                    <h5 className="text-base font-bold text-slate-800">{d.title}</h5>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{d.description}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 font-medium italic">No detailed day breakdown saved for this template.</p>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button onClick={() => setPreviewTemplate(null)} className="px-8 py-3 bg-slate-900 text-white font-bold text-xs rounded-xl">Close Preview</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItineraryLibrary;
