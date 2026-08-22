import React, { useState, useEffect } from 'react';
import * as api from '../services/apiService';
import { generateItinerary } from '../services/geminiService';
import { Lead, LeadIntent } from '../types';
import { 
  Map, 
  Plus, 
  Sparkles, 
  Key, 
  Search, 
  Eye, 
  Trash2, 
  X, 
  Calendar, 
  Compass, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Clock,
  Layers,
  ChevronRight
} from 'lucide-react';

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
    { day: 1, title: 'Arrival & Welcome Briefing', description: 'Arrive at destination, airport pickup, transfer to hotel, and welcome briefing.' },
    { day: 2, title: 'City Tour & Key Landmarks', description: 'Full day guided tour exploring key attractions, historical monuments, and local markets.' },
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
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Actions Header */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Map className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-semibold text-slate-800">Itinerary Library & Templates</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pre-built day-wise packages, manual itinerary builders, and AI-powered custom itineraries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setShowApiKeyModal(true)}
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Key size={13} className="text-slate-500" />
            <span>API Settings</span>
          </button>
          
          <button 
            onClick={() => setShowManualModal(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Template</span>
          </button>

          <button 
            onClick={() => setShowAIModal(true)}
            disabled={isGeneratingAI}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Sparkles size={14} className="text-emerald-200" />
            <span>Generate with AI</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
         <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
         <input 
           type="text" 
           placeholder="Search templates by destination or package name..." 
           className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-indigo-400 shadow-2xs transition-all"
           value={searchQuery}
           onChange={(e) => setSearchQuery(e.target.value)}
         />
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTemplates.map((item) => (
          <div key={item.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-sm transition-all flex flex-col justify-between">
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {item.destination}
                </span>
                <span className="text-[11px] font-medium text-slate-500">
                  {item.nights} Nights / {item.nights + 1} Days
                </span>
              </div>

              <h4 className="text-sm font-semibold text-slate-800 line-clamp-2 leading-snug">
                {item.title}
              </h4>
            </div>

            <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
               <button 
                 onClick={() => setPreviewTemplate(item)}
                 className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
               >
                 <Eye size={12} />
                 <span>View Details</span>
               </button>

               <button 
                 onClick={() => handleDeleteTemplate(item.id)}
                 className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" 
                 title="Delete Template"
               >
                 <Trash2 size={13} />
               </button>
            </div>
          </div>
        ))}

        {filteredTemplates.length === 0 && (
          <div className="col-span-full py-16 bg-white border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center p-6 space-y-2">
             <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                <Map size={20} />
             </div>
             <h4 className="text-sm font-semibold text-slate-800">No Templates Found</h4>
             <p className="text-xs text-slate-400 max-w-sm">Create a manual package or generate a master template using AI above.</p>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD MANUAL ITINERARY */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 my-8 border border-slate-200 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Create Itinerary Template</h3>
              <button onClick={() => setShowManualModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveManualTemplate} className="space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Package Title *</label>
                  <input 
                    type="text" 
                    required 
                    value={manualTitle}
                    onChange={e => setManualTitle(e.target.value)}
                    placeholder="e.g. Kashmir 6N/7D Premium Paradise"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:border-indigo-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Destination *</label>
                  <input 
                    type="text" 
                    required 
                    value={manualDestination}
                    onChange={e => setManualDestination(e.target.value)}
                    placeholder="e.g. Kashmir"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:border-indigo-400 focus:bg-white"
                  />
                </div>
              </div>

              {/* Day-Wise Plan Editor */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-semibold text-slate-800">Day-Wise Plan ({manualDays.length} Days)</h4>
                  <button 
                    type="button" 
                    onClick={handleAddManualDay}
                    className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded text-xs font-medium transition-colors"
                  >
                    + Add Day
                  </button>
                </div>

                <div className="space-y-2.5 max-h-64 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-slate-50/50 custom-scrollbar">
                  {manualDays.map((d, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-semibold text-indigo-700">Day {d.day}</span>
                        {manualDays.length > 1 && (
                          <button type="button" onClick={() => handleRemoveManualDay(idx)} className="text-[11px] text-rose-600 hover:underline">Remove</button>
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
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs font-medium outline-none focus:border-indigo-400 focus:bg-white"
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
                        className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs font-medium outline-none focus:border-indigo-400 focus:bg-white resize-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowManualModal(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors shadow-xs">
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: GENERATE ITINERARY WITH AI */}
      {showAIModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-slate-200 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <Sparkles size={15} className="text-emerald-600" />
                <span>AI Itinerary Generator</span>
              </h3>
              <button onClick={() => setShowAIModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleGenerateAITemplate} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Destination *</label>
                <input 
                  type="text" 
                  required 
                  value={aiDestination}
                  onChange={e => setAiDestination(e.target.value)}
                  placeholder="e.g. Dubai / Bali / Switzerland"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:border-indigo-400 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Duration (Days)</label>
                  <input 
                    type="number" 
                    min="2"
                    max="30"
                    value={aiDaysCount}
                    onChange={e => setAiDaysCount(parseInt(e.target.value) || 5)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:border-indigo-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Travel Style</label>
                  <select 
                    value={aiVibe} 
                    onChange={e => setAiVibe(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:border-indigo-400 focus:bg-white"
                  >
                    <option value="Luxury & Scenic">Luxury & Scenic</option>
                    <option value="Family Friendly">Family Friendly</option>
                    <option value="Honeymoon & Romantic">Honeymoon & Romantic</option>
                    <option value="Adventure & Culture">Adventure & Culture</option>
                    <option value="Budget Comfort">Budget Comfort</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Custom Inclusions / Requests</label>
                <textarea 
                  rows={2}
                  value={aiNotes}
                  onChange={e => setAiNotes(e.target.value)}
                  placeholder="e.g. Include Burj Khalifa, Desert Safari with BBQ, Dhow Cruise..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium outline-none focus:border-indigo-400 focus:bg-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowAIModal(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isGeneratingAI}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Sparkles size={13} />
                  <span>{isGeneratingAI ? 'Generating...' : 'Craft Master Itinerary'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: API KEY SETTINGS */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 border border-slate-200 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <Key size={14} className="text-indigo-600" />
                <span>Gemini API Key Settings</span>
              </h3>
              <button onClick={() => setShowApiKeyModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Provide a personal Google Gemini API Key for AI itinerary generation.
              </p>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">API Key</label>
                <input 
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-medium outline-none focus:border-indigo-400 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowApiKeyModal(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={handleSaveApiKey} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors shadow-xs">
                  Save Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: VIEW PREVIEW TEMPLATE */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 my-8 border border-slate-200 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {previewTemplate.destination} · {previewTemplate.nights} Nights
                </span>
                <h3 className="text-base font-semibold text-slate-900 mt-1">{previewTemplate.title}</h3>
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto p-1 custom-scrollbar">
              {(previewTemplate.templateData?.days || []).map((day: any, idx: number) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <span className="text-[11px] font-bold text-indigo-700 block">
                    Day {String(day.day || idx + 1).padStart(2, '0')} — {day.title || (idx === 0 ? `Arrival in ${previewTemplate.destination}` : idx === (previewTemplate.templateData?.days?.length || 1) - 1 ? `Departure` : `Sightseeing Tour`)}
                  </span>
                  <p className="text-xs text-slate-600 leading-relaxed">{day.description}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => setPreviewTemplate(null)} 
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
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

export default ItineraryLibrary;
