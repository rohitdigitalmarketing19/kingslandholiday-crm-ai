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
  ChevronRight,
  Download,
  RefreshCw,
  Image as ImageIcon,
  Upload,
  Edit2
} from 'lucide-react';
import { CityPhotosModal } from './CityPhotosModal';
import { compressImageFile } from '../utils/imageCompressor';

interface DayPlan {
  day: number;
  title: string;
  description: string;
  imageUrl?: string;
  img?: string;
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

  // Edit Template State
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDestination, setEditDestination] = useState('');
  const [editDays, setEditDays] = useState<DayPlan[]>([]);

  // City Photo Picker State
  const [photoPickerDayIndex, setPhotoPickerDayIndex] = useState<number | null>(null);
  const [photoPickerTargetForm, setPhotoPickerTargetForm] = useState<'manual' | 'edit'>('manual');

  // PDF Generation State
  const [pdfModalTemplate, setPdfModalTemplate] = useState<any | null>(null);
  const [pdfThemes, setPdfThemes] = useState<any[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<string>('auto');
  const [detailedItinerary, setDetailedItinerary] = useState<boolean>(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

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
    api.fetchPdfThemes().then(themes => setPdfThemes(themes)).catch(console.error);
  }, []);

  const handleOpenPdfModal = (template: any) => {
    setPdfModalTemplate(template);
    setSelectedThemeId('auto');
    setDetailedItinerary(true);
  };

  const handleGeneratePackagePdf = async () => {
    if (!pdfModalTemplate) return;
    try {
      setIsGeneratingPdf(true);
      const themeIdParam = selectedThemeId === 'auto' ? undefined : selectedThemeId;
      const daysCount = (pdfModalTemplate.nights || 1) + 1;
      const rawDays = pdfModalTemplate.templateData?.days || pdfModalTemplate.templateData?.itinerary || [];
      const mappedItinerary = Array.isArray(rawDays) && rawDays.length > 0
        ? rawDays.map((d: any, idx: number) => ({
            dayNumber: d.day || idx + 1,
            title: d.title || `Day ${idx + 1}`,
            description: d.description || '',
            shortSummary: (d.description || '').slice(0, 80) + '...',
            image: d.imageUrl || d.img || d.image || ''
          }))
        : undefined;

      const pkgPayload = {
        title: pdfModalTemplate.title || 'Package-Itinerary',
        destination: pdfModalTemplate.destination || 'Custom Destination',
        duration: `${pdfModalTemplate.nights || 1}N / ${daysCount}D`,
        nights: pdfModalTemplate.nights || 1,
        daysCount: daysCount,
        showDetailedItinerary: detailedItinerary,
        packageId: pdfModalTemplate.id,
        itinerary: mappedItinerary,
        price: pdfModalTemplate.templateData?.finalSellingPrice
          ? `₹${Number(pdfModalTemplate.templateData.finalSellingPrice).toLocaleString('en-IN')}`
          : undefined
      };

      const blob = await api.generatePackagePdfBlob(pkgPayload, themeIdParam);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanTitle = (pdfModalTemplate.title || 'Package-Itinerary').replace(/[^a-zA-Z0-9_-]/g, '_');
      a.download = `${cleanTitle}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setPdfModalTemplate(null);
    } catch (err: any) {
      alert(`PDF Generation failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

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

  // Direct upload from local disk for a specific day
  const handleDirectDayUpload = async (targetForm: 'manual' | 'edit', dayIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WebP).');
      return;
    }
    try {
      const compressed = await compressImageFile(file, { maxWidth: 1200, maxHeight: 900, quality: 0.85 });
      if (targetForm === 'manual') {
        const updated = [...manualDays];
        updated[dayIdx] = { ...updated[dayIdx], imageUrl: compressed, img: compressed };
        setManualDays(updated);
      } else {
        const updated = [...editDays];
        updated[dayIdx] = { ...updated[dayIdx], imageUrl: compressed, img: compressed };
        setEditDays(updated);
      }
    } catch (err) {
      console.error('Failed to upload day image:', err);
      alert('Failed to process image.');
    }
  };

  // Select photo picked from CityPhotosModal
  const handleSelectCityPhoto = (imageUrl: string) => {
    if (photoPickerDayIndex === null) return;
    if (photoPickerTargetForm === 'manual') {
      const updated = [...manualDays];
      if (updated[photoPickerDayIndex]) {
        updated[photoPickerDayIndex] = { ...updated[photoPickerDayIndex], imageUrl, img: imageUrl };
        setManualDays(updated);
      }
    } else {
      const updated = [...editDays];
      if (updated[photoPickerDayIndex]) {
        updated[photoPickerDayIndex] = { ...updated[photoPickerDayIndex], imageUrl, img: imageUrl };
        setEditDays(updated);
      }
    }
    setPhotoPickerDayIndex(null);
  };

  // Remove photo from a day
  const handleRemoveDayPhoto = (targetForm: 'manual' | 'edit', dayIdx: number) => {
    if (targetForm === 'manual') {
      const updated = [...manualDays];
      delete updated[dayIdx].imageUrl;
      delete updated[dayIdx].img;
      setManualDays(updated);
    } else {
      const updated = [...editDays];
      delete updated[dayIdx].imageUrl;
      delete updated[dayIdx].img;
      setEditDays(updated);
    }
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
        destination: manualDestination.trim(),
        days: manualDays,
        itinerary: manualDays,
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
      setManualDays([
        { day: 1, title: 'Arrival & Welcome Briefing', description: 'Arrive at destination, airport pickup, transfer to hotel, and welcome briefing.' },
        { day: 2, title: 'City Tour & Key Landmarks', description: 'Full day guided tour exploring key attractions, historical monuments, and local markets.' },
        { day: 3, title: 'Leisure & Adventure Activity', description: 'Free morning followed by afternoon excursion and scenic sunset point visit.' },
        { day: 4, title: 'Departure', description: 'Breakfast at hotel, souvenir shopping, check-out, and private transfer to airport.' },
      ]);
      alert('Manual itinerary template saved successfully with images!');
    } catch (err) {
      console.error('Failed to save manual template:', err);
      alert('Failed to save itinerary template.');
    }
  };

  const handleStartEditTemplate = (tmpl: any) => {
    setEditingTemplate(tmpl);
    setEditTitle(tmpl.title || '');
    setEditDestination(tmpl.destination || '');
    const rawDays = tmpl.templateData?.days || tmpl.templateData?.itinerary || [];
    const formatted = Array.isArray(rawDays) && rawDays.length > 0
      ? rawDays.map((d: any, i: number) => ({
          day: d.day || i + 1,
          title: d.title || `Day ${i + 1}`,
          description: d.description || '',
          imageUrl: d.imageUrl || d.img || d.image || '',
          img: d.img || d.imageUrl || d.image || ''
        }))
      : [
          { day: 1, title: 'Arrival & Welcome Briefing', description: 'Arrive at destination, airport pickup, transfer to hotel.' }
        ];
    setEditDays(formatted);
    setPreviewTemplate(null);
  };

  const handleAddEditDay = () => {
    const nextDayNum = editDays.length + 1;
    setEditDays([
      ...editDays,
      { day: nextDayNum, title: `Day ${nextDayNum} Exploration`, description: `Custom activities and sightseeing for day ${nextDayNum}.` }
    ]);
  };

  const handleRemoveEditDay = (index: number) => {
    if (editDays.length <= 1) return;
    const updated = editDays.filter((_, i) => i !== index).map((d, i) => ({ ...d, day: i + 1 }));
    setEditDays(updated);
  };

  const handleSaveEditTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate || !editTitle.trim() || !editDestination.trim()) {
      alert('Please fill in title and destination.');
      return;
    }

    try {
      const templateData = {
        ...(editingTemplate.templateData || {}),
        title: editTitle.trim(),
        destination: editDestination.trim(),
        days: editDays,
        itinerary: editDays
      };

      const updated = await api.updateTemplate(editingTemplate.id, {
        title: editTitle.trim(),
        destination: editDestination.trim(),
        nights: Math.max(1, editDays.length - 1),
        templateData
      });

      setTemplates(templates.map(t => t.id === editingTemplate.id ? updated : t));
      setEditingTemplate(null);
      alert('Itinerary template updated successfully with images!');
    } catch (err) {
      console.error('Failed to update template:', err);
      alert('Failed to update itinerary template.');
    }
  };

  // Delete single day directly from preview template modal
  const handleDeletePreviewDay = async (dayIdx: number) => {
    if (!previewTemplate) return;
    const rawDays = previewTemplate.templateData?.days || previewTemplate.templateData?.itinerary || [];
    if (rawDays.length <= 1) {
      alert('Itinerary template must have at least 1 day.');
      return;
    }
    if (!confirm(`Are you sure you want to delete Day ${dayIdx + 1} from this itinerary template?`)) return;

    try {
      const updatedDays = rawDays
        .filter((_: any, i: number) => i !== dayIdx)
        .map((d: any, i: number) => ({ ...d, day: i + 1 }));

      const updatedTemplateData = {
        ...(previewTemplate.templateData || {}),
        days: updatedDays,
        itinerary: updatedDays
      };

      const updated = await api.updateTemplate(previewTemplate.id, {
        nights: Math.max(1, updatedDays.length - 1),
        templateData: updatedTemplateData
      });

      setPreviewTemplate(updated);
      setTemplates(templates.map(t => t.id === previewTemplate.id ? updated : t));
    } catch (err) {
      console.error('Failed to delete day from template:', err);
      alert('Failed to delete day from template.');
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

  const handleDeleteTemplate = async (id: string, title?: string) => {
    const label = title ? `"${title}"` : 'this itinerary template';
    if (!confirm(`Are you sure you want to delete ${label}? This cannot be undone.`)) return;
    try {
      await api.deleteTemplate(id);
      setTemplates(templates.filter(t => t.id !== id));
      if (previewTemplate?.id === id) setPreviewTemplate(null);
      if (editingTemplate?.id === id) setEditingTemplate(null);
      if (pdfModalTemplate?.id === id) setPdfModalTemplate(null);
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
      <div className="bg-surface rounded-xl p-5 border border-line shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Map className="w-5 h-5 text-brand-ink" />
            <h2 className="text-xl font-semibold text-content">Itinerary Library & Templates</h2>
          </div>
          <p className="text-sm text-secondary mt-0.5">
            Pre-built day-wise packages, manual itinerary builders, and AI-powered custom itineraries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setShowApiKeyModal(true)}
            className="px-3 py-2 bg-canvas hover:bg-subtle text-content rounded-lg text-sm font-medium border border-line transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Key size={13} className="text-secondary" />
            <span>API Settings</span>
          </button>
          
          <button 
            onClick={() => setShowManualModal(true)}
            className="px-3.5 py-2 bg-brand hover:bg-brand text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Template</span>
          </button>

          <button 
            onClick={() => setShowAIModal(true)}
            disabled={isGeneratingAI}
            className="px-3.5 py-2 bg-success-strong hover:bg-success-strong text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Sparkles size={14} className="text-success-ink" />
            <span>Generate with AI</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
         <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
         <input 
           type="text" 
           placeholder="Search templates by destination or package name..." 
           className="w-full pl-9 pr-4 py-2 bg-surface border border-line rounded-lg text-sm font-medium text-content outline-none focus:border-brand-line shadow-2xs transition-all"
           value={searchQuery}
           onChange={(e) => setSearchQuery(e.target.value)}
         />
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTemplates.map((item) => {
          const days = item.templateData?.days || item.templateData?.itinerary || [];
          const photoCount = Array.isArray(days) ? days.filter((d: any) => d.imageUrl || d.img || d.image).length : 0;
          return (
            <div key={item.id} className="bg-surface border border-line rounded-xl overflow-hidden hover:shadow-sm transition-all flex flex-col justify-between">
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="text-xs font-semibold text-brand-ink bg-brand-soft px-2 py-0.5 rounded border border-brand-line">
                    {item.destination}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {photoCount > 0 && (
                      <span className="text-xs font-semibold text-success-ink bg-success-soft px-1.5 py-0.5 rounded border border-success-line">
                        📷 {photoCount} {photoCount === 1 ? 'photo' : 'photos'}
                      </span>
                    )}
                    <span className="text-xs font-medium text-secondary">
                      {item.nights}N / {item.nights + 1}D
                    </span>
                  </div>
                </div>

                <h4 className="text-sm font-semibold text-content line-clamp-2 leading-snug">
                  {item.title}
                </h4>
              </div>

              <div className="px-3.5 py-2.5 bg-canvas/70 border-t border-line flex flex-wrap items-center justify-between gap-1.5">
                 <div className="flex flex-wrap items-center gap-1">
                   <button 
                     onClick={() => setPreviewTemplate(item)}
                     className="px-2 py-1 bg-surface hover:bg-brand-soft text-brand-ink border border-line hover:border-brand-line rounded-lg text-sm font-medium transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                     title="View Itinerary Details"
                   >
                     <Eye size={12} />
                     <span>View</span>
                   </button>
                   <button 
                     onClick={() => handleStartEditTemplate(item)}
                     className="px-2 py-1 bg-surface hover:bg-warning-soft text-warning-ink border border-line hover:border-warning-line rounded-lg text-sm font-medium transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                     title="Edit Template & Photos"
                   >
                     <Edit2 size={12} />
                     <span>Edit</span>
                   </button>
                   <button 
                     onClick={() => handleOpenPdfModal(item)}
                     className="px-2 py-1 bg-gradient-to-r from-[#FF6B35] to-[#D9582B] hover:opacity-95 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                     title="Generate Themed PDF"
                   >
                     <FileText size={12} />
                     <span>PDF</span>
                   </button>
                 </div>

                 <button 
                   onClick={() => handleDeleteTemplate(item.id, item.title)}
                   className="px-2 py-1 text-danger-ink bg-surface hover:bg-danger-soft border border-line hover:border-danger-line rounded-lg text-sm font-medium transition-colors flex items-center gap-1 cursor-pointer" 
                   title="Delete Itinerary Template"
                 >
                   <Trash2 size={12} />
                   <span>Delete</span>
                 </button>
              </div>
            </div>
          );
        })}

        {filteredTemplates.length === 0 && (
          <div className="col-span-full py-16 bg-surface border border-dashed border-line rounded-xl flex flex-col items-center justify-center text-center p-6 space-y-2">
             <div className="w-10 h-10 bg-canvas rounded-lg flex items-center justify-center text-muted">
                <Map size={20} />
             </div>
             <h4 className="text-sm font-semibold text-content">No Templates Found</h4>
             <p className="text-sm text-muted max-w-sm">Create a manual package or generate a master template using AI above.</p>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD MANUAL ITINERARY */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-surface rounded-xl shadow-sm w-full max-w-2xl p-6 my-8 border border-line animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-line">
              <div>
                <h3 className="text-sm font-semibold text-content">Create Itinerary Template</h3>
                <p className="text-xs text-secondary">Configure day-by-day plan and attach destination photos.</p>
              </div>
              <button onClick={() => setShowManualModal(false)} className="p-1 text-muted hover:text-secondary rounded cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveManualTemplate} className="space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Package Title *</label>
                  <input 
                    type="text" 
                    required 
                    value={manualTitle}
                    onChange={e => setManualTitle(e.target.value)}
                    placeholder="e.g. Kashmir 6N/7D Premium Paradise"
                    className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-brand-line focus:bg-surface"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Destination *</label>
                  <input 
                    type="text" 
                    required 
                    value={manualDestination}
                    onChange={e => setManualDestination(e.target.value)}
                    placeholder="e.g. Kashmir"
                    className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-brand-line focus:bg-surface"
                  />
                </div>
              </div>

              {/* Day-Wise Plan Editor */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-semibold text-content">Day-Wise Plan ({manualDays.length} Days)</h4>
                  <button 
                    type="button" 
                    onClick={handleAddManualDay}
                    className="px-2.5 py-1 bg-brand-soft text-brand-ink hover:bg-brand-soft rounded text-sm font-medium transition-colors cursor-pointer"
                  >
                    + Add Day
                  </button>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto p-2 border border-line rounded-lg bg-canvas/50 custom-scrollbar">
                  {manualDays.map((d, idx) => (
                    <div key={idx} className="p-3 bg-surface rounded-xl border border-line space-y-2.5 shadow-2xs">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-brand-ink">Day {d.day}</span>
                        {manualDays.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveManualDay(idx)} 
                            className="px-2 py-0.5 text-xs font-medium text-danger-ink hover:bg-danger-soft rounded transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 size={11} />
                            <span>Remove Day</span>
                          </button>
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
                        placeholder="Day Title (e.g. Arrival in Srinagar & Shikara Ride)"
                        className="w-full bg-canvas border border-line rounded px-2.5 py-1.5 text-sm font-medium outline-none focus:border-brand-line focus:bg-surface"
                      />
                      <textarea 
                        rows={2}
                        value={d.description}
                        onChange={e => {
                          const updated = [...manualDays];
                          updated[idx].description = e.target.value;
                          setManualDays(updated);
                        }}
                        placeholder="Day Activities / Description..."
                        className="w-full bg-canvas border border-line rounded p-2 text-sm font-medium outline-none focus:border-brand-line focus:bg-surface resize-none"
                      />

                      {/* Photo Attachment Bar */}
                      <div className="pt-2 border-t border-line flex flex-wrap items-center justify-between gap-2">
                        {(d.imageUrl || d.img) ? (
                          <div className="flex items-center gap-2.5">
                            <img 
                              src={d.imageUrl || d.img} 
                              alt={`Day ${d.day}`} 
                              className="w-16 h-11 rounded-lg object-cover border border-line shadow-2xs" 
                            />
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-success-ink bg-success-soft px-2 py-0.5 rounded border border-success-line">
                                ✓ Photo Attached
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveDayPhoto('manual', idx)}
                                className="text-xs text-danger-ink hover:text-danger-ink hover:underline font-medium cursor-pointer"
                              >
                                Remove Photo
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setPhotoPickerTargetForm('manual');
                                setPhotoPickerDayIndex(idx);
                              }}
                              className="px-2.5 py-1 bg-brand-soft hover:bg-brand-soft text-brand-ink rounded-lg text-xs font-medium border border-brand-line flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <ImageIcon size={12} />
                              <span>+ Add Photo from Library</span>
                            </button>
                            <label className="px-2.5 py-1 bg-subtle hover:bg-hover text-content rounded-lg text-xs font-medium border border-line flex items-center gap-1.5 transition-colors cursor-pointer">
                              <Upload size={12} />
                              <span>Upload Photo</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={e => handleDirectDayUpload('manual', idx, e)} 
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-line">
                <button type="button" onClick={() => setShowManualModal(false)} className="px-4 py-2 bg-subtle hover:bg-hover text-content text-sm font-medium rounded-lg transition-colors cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-brand hover:bg-brand text-white rounded-lg text-sm font-medium transition-colors shadow-xs cursor-pointer">
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: GENERATE ITINERARY WITH AI */}
      {showAIModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse/60 backdrop-blur-xs">
          <div className="bg-surface rounded-xl shadow-sm w-full max-w-md p-6 border border-line animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-line">
              <h3 className="text-sm font-semibold text-content flex items-center gap-1.5">
                <Sparkles size={15} className="text-success-ink" />
                <span>AI Itinerary Generator</span>
              </h3>
              <button onClick={() => setShowAIModal(false)} className="p-1 text-muted hover:text-secondary rounded">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleGenerateAITemplate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1">Destination *</label>
                <input 
                  type="text" 
                  required 
                  value={aiDestination}
                  onChange={e => setAiDestination(e.target.value)}
                  placeholder="e.g. Dubai / Bali / Switzerland"
                  className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-brand-line focus:bg-surface"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Duration (Days)</label>
                  <input 
                    type="number" 
                    min="2"
                    max="30"
                    value={aiDaysCount}
                    onChange={e => setAiDaysCount(parseInt(e.target.value) || 5)}
                    className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-brand-line focus:bg-surface"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Travel Style</label>
                  <select 
                    value={aiVibe} 
                    onChange={e => setAiVibe(e.target.value)}
                    className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-brand-line focus:bg-surface"
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
                <label className="block text-xs font-medium text-secondary mb-1">Custom Inclusions / Requests</label>
                <textarea 
                  rows={2}
                  value={aiNotes}
                  onChange={e => setAiNotes(e.target.value)}
                  placeholder="e.g. Include Burj Khalifa, Desert Safari with BBQ, Dhow Cruise..."
                  className="w-full bg-canvas border border-line rounded-lg p-2 text-sm font-medium outline-none focus:border-brand-line focus:bg-surface resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-line">
                <button type="button" onClick={() => setShowAIModal(false)} className="px-4 py-2 bg-subtle hover:bg-hover text-content text-sm font-medium rounded-lg transition-colors">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isGeneratingAI}
                  className="px-4 py-2 bg-success-strong hover:bg-success-strong text-white rounded-lg text-sm font-medium transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse/60 backdrop-blur-xs">
          <div className="bg-surface rounded-xl shadow-sm w-full max-w-sm p-6 border border-line animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-line">
              <h3 className="text-sm font-semibold text-content flex items-center gap-1.5">
                <Key size={14} className="text-brand-ink" />
                <span>Gemini API Key Settings</span>
              </h3>
              <button onClick={() => setShowApiKeyModal(false)} className="p-1 text-muted hover:text-secondary rounded">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-secondary">
                Provide a personal Google Gemini API Key for AI itinerary generation.
              </p>

              <div>
                <label className="block text-xs font-medium text-secondary mb-1">API Key</label>
                <input 
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm font-mono font-medium outline-none focus:border-brand-line focus:bg-surface"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-line">
                <button type="button" onClick={() => setShowApiKeyModal(false)} className="px-4 py-2 bg-subtle hover:bg-hover text-content text-sm font-medium rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={handleSaveApiKey} className="px-4 py-2 bg-brand hover:bg-brand text-white rounded-lg text-sm font-medium transition-colors shadow-xs">
                  Save Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: VIEW PREVIEW TEMPLATE */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-surface rounded-xl shadow-sm w-full max-w-2xl p-6 my-8 border border-line animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-line">
              <div>
                <span className="text-xs font-semibold text-brand-ink bg-brand-soft px-2 py-0.5 rounded border border-brand-line">
                  {previewTemplate.destination} · {previewTemplate.nights} Nights / {(previewTemplate.nights || 1) + 1} Days
                </span>
                <h3 className="text-base font-semibold text-content mt-1">{previewTemplate.title}</h3>
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="p-1 text-muted hover:text-secondary rounded cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto p-1 custom-scrollbar">
              {(previewTemplate.templateData?.days || previewTemplate.templateData?.itinerary || []).map((day: any, idx: number, arr: any[]) => {
                const dayImg = day.imageUrl || day.img || day.image;
                return (
                  <div key={idx} className="p-3.5 bg-canvas/80 rounded-xl border border-line space-y-2 relative group">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-bold text-brand-ink">
                        Day {String(day.day || idx + 1).padStart(2, '0')} — {day.title || (idx === 0 ? `Arrival in ${previewTemplate.destination}` : idx === arr.length - 1 ? `Departure` : `Sightseeing Tour`)}
                      </span>
                      {arr.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeletePreviewDay(idx)}
                          className="px-2 py-0.5 text-xs font-semibold text-danger-ink hover:text-white bg-danger-soft hover:bg-danger-strong border border-danger-line rounded transition-all cursor-pointer flex items-center gap-1"
                          title="Delete this day from itinerary template"
                        >
                          <Trash2 size={11} />
                          <span>Delete Day</span>
                        </button>
                      )}
                    </div>

                    {dayImg && (
                      <div className="w-full h-36 rounded-lg overflow-hidden border border-line shadow-2xs">
                        <img 
                          src={dayImg} 
                          alt={day.title || `Day ${idx + 1}`} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                    )}

                    <p className="text-sm text-secondary leading-relaxed font-normal">{day.description}</p>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-line">
              <button 
                type="button" 
                onClick={() => handleDeleteTemplate(previewTemplate.id, previewTemplate.title)}
                className="px-3 py-2 bg-danger-soft hover:bg-danger-soft text-danger-ink border border-danger-line rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Permanently delete this itinerary template"
              >
                <Trash2 size={13} />
                <span>Delete Itinerary</span>
              </button>

              <div className="flex items-center gap-2">
                <button 
                  type="button" 
                  onClick={() => handleStartEditTemplate(previewTemplate)}
                  className="px-3.5 py-2 bg-surface hover:bg-warning-soft text-warning-ink border border-line hover:border-warning-line text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Edit2 size={13} />
                  <span>Edit Itinerary</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    const curr = previewTemplate;
                    setPreviewTemplate(null);
                    handleOpenPdfModal(curr);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-[#FF6B35] to-[#D9582B] text-white text-sm font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer hover:opacity-95"
                >
                  <FileText size={13} />
                  <span>Generate PDF</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => setPreviewTemplate(null)} 
                  className="px-4 py-2 bg-subtle hover:bg-hover text-content text-sm font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: EDIT ITINERARY TEMPLATE */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-surface rounded-xl shadow-sm w-full max-w-2xl p-6 my-8 border border-line animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-line">
              <div>
                <h3 className="text-sm font-semibold text-content">Edit Itinerary Template</h3>
                <p className="text-xs text-secondary">Update package details, day-by-day plan, and attach destination photos.</p>
              </div>
              <button onClick={() => setEditingTemplate(null)} className="p-1 text-muted hover:text-secondary rounded cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEditTemplate} className="space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Package Title *</label>
                  <input 
                    type="text" 
                    required 
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    placeholder="e.g. Kashmir 6N/7D Premium Paradise"
                    className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-brand-line focus:bg-surface"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1">Destination *</label>
                  <input 
                    type="text" 
                    required 
                    value={editDestination}
                    onChange={e => setEditDestination(e.target.value)}
                    placeholder="e.g. Kashmir"
                    className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-brand-line focus:bg-surface"
                  />
                </div>
              </div>

              {/* Day-Wise Plan Editor */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-semibold text-content">Day-Wise Plan ({editDays.length} Days)</h4>
                  <button 
                    type="button" 
                    onClick={handleAddEditDay}
                    className="px-2.5 py-1 bg-brand-soft text-brand-ink hover:bg-brand-soft rounded text-sm font-medium transition-colors cursor-pointer"
                  >
                    + Add Day
                  </button>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto p-2 border border-line rounded-lg bg-canvas/50 custom-scrollbar">
                  {editDays.map((d, idx) => (
                    <div key={idx} className="p-3 bg-surface rounded-xl border border-line space-y-2.5 shadow-2xs">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-brand-ink">Day {d.day}</span>
                        {editDays.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => handleRemoveEditDay(idx)} 
                            className="px-2 py-0.5 text-xs font-medium text-danger-ink hover:bg-danger-soft rounded transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 size={11} />
                            <span>Remove Day</span>
                          </button>
                        )}
                      </div>
                      <input 
                        type="text" 
                        value={d.title}
                        onChange={e => {
                          const updated = [...editDays];
                          updated[idx].title = e.target.value;
                          setEditDays(updated);
                        }}
                        placeholder="Day Title (e.g. Arrival in Srinagar & Shikara Ride)"
                        className="w-full bg-canvas border border-line rounded px-2.5 py-1.5 text-sm font-medium outline-none focus:border-brand-line focus:bg-surface"
                      />
                      <textarea 
                        rows={2}
                        value={d.description}
                        onChange={e => {
                          const updated = [...editDays];
                          updated[idx].description = e.target.value;
                          setEditDays(updated);
                        }}
                        placeholder="Day Activities / Description..."
                        className="w-full bg-canvas border border-line rounded p-2 text-sm font-medium outline-none focus:border-brand-line focus:bg-surface resize-none"
                      />

                      {/* Photo Attachment Bar */}
                      <div className="pt-2 border-t border-line flex flex-wrap items-center justify-between gap-2">
                        {(d.imageUrl || d.img) ? (
                          <div className="flex items-center gap-2.5">
                            <img 
                              src={d.imageUrl || d.img} 
                              alt={`Day ${d.day}`} 
                              className="w-16 h-11 rounded-lg object-cover border border-line shadow-2xs" 
                            />
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-success-ink bg-success-soft px-2 py-0.5 rounded border border-success-line">
                                ✓ Photo Attached
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveDayPhoto('edit', idx)}
                                className="text-xs text-danger-ink hover:text-danger-ink hover:underline font-medium cursor-pointer"
                              >
                                Remove Photo
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setPhotoPickerTargetForm('edit');
                                setPhotoPickerDayIndex(idx);
                              }}
                              className="px-2.5 py-1 bg-brand-soft hover:bg-brand-soft text-brand-ink rounded-lg text-xs font-medium border border-brand-line flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <ImageIcon size={12} />
                              <span>+ Add Photo from Library</span>
                            </button>
                            <label className="px-2.5 py-1 bg-subtle hover:bg-hover text-content rounded-lg text-xs font-medium border border-line flex items-center gap-1.5 transition-colors cursor-pointer">
                              <Upload size={12} />
                              <span>Upload Photo</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={e => handleDirectDayUpload('edit', idx, e)} 
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-line">
                <button 
                  type="button" 
                  onClick={() => handleDeleteTemplate(editingTemplate.id, editingTemplate.title)}
                  className="px-3 py-2 bg-danger-soft hover:bg-danger-soft text-danger-ink border border-danger-line rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Permanently delete this itinerary template"
                >
                  <Trash2 size={13} />
                  <span>Delete Template</span>
                </button>

                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setEditingTemplate(null)} className="px-4 py-2 bg-subtle hover:bg-hover text-content text-sm font-medium rounded-lg transition-colors cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-brand hover:bg-brand text-white rounded-lg text-sm font-medium transition-colors shadow-xs cursor-pointer">
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CITY PHOTOS PICKER MODAL */}
      <CityPhotosModal
        isOpen={photoPickerDayIndex !== null}
        onClose={() => setPhotoPickerDayIndex(null)}
        destinationCity={
          photoPickerTargetForm === 'manual'
            ? manualDestination
            : editDestination
        }
        mode="pick"
        targetDay={photoPickerDayIndex !== null ? photoPickerDayIndex + 1 : undefined}
        onSelectPhoto={handleSelectCityPhoto}
      />

      {/* MODAL 5: GENERATE PDF WITH THEME DROPDOWN */}
      {pdfModalTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse/60 backdrop-blur-xs">
          <div className="bg-surface rounded-xl shadow-sm w-full max-w-md p-6 border border-line animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-line">
              <div>
                <span className="text-xs font-bold text-warning-ink bg-warning-soft px-2 py-0.5 rounded-full border border-warning-line uppercase tracking-wider">
                  PDF Theme Engine
                </span>
                <h3 className="text-base font-bold text-content mt-1">Generate Package PDF</h3>
                <p className="text-sm text-secondary">{pdfModalTemplate.title}</p>
              </div>
              <button onClick={() => setPdfModalTemplate(null)} className="p-1 text-muted hover:text-secondary rounded cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Theme Selector */}
              <div>
                <label className="block text-sm font-bold text-content mb-1">
                  Select PDF Theme / Skin
                </label>
                <select
                  value={selectedThemeId}
                  onChange={e => setSelectedThemeId(e.target.value)}
                  className="w-full bg-canvas border border-line rounded-xl px-3.5 py-2.5 text-sm font-medium text-content outline-none focus:border-[#FF6B35]"
                >
                  <option value="auto">🌟 Auto (Active Festival / Seasonal Window)</option>
                  <option value="brand-default">🏛️ Kingsland Brand Default</option>
                  {pdfThemes
                    .filter(t => t.id !== 'brand-default')
                    .map(t => (
                      <option key={t.id} value={t.id}>
                        🎨 {t.name} ({t.festival}) {t.status === 'active' ? '• Active' : ''}
                      </option>
                    ))}
                </select>
                <span className="text-xs text-secondary mt-1 block">
                  Auto matches active seasonal festival skins (Diwali, Holi, Christmas) based on current date.
                </span>
              </div>

              {/* Detailed Itinerary Toggle */}
              <div className="p-3.5 bg-canvas rounded-xl border border-line flex items-center justify-between">
                <div>
                  <div className="font-bold text-content text-sm">Detailed Itinerary</div>
                  <div className="text-xs text-secondary">
                    Include full day-by-day sightseeing cards with alternating 3:2 photos.
                  </div>
                </div>
                <input
                  type="checkbox"
                  id="detailedItineraryToggle"
                  checked={detailedItinerary}
                  onChange={e => setDetailedItinerary(e.target.checked)}
                  className="w-4 h-4 rounded text-[#FF6B35] focus:ring-[#FF6B35] cursor-pointer"
                />
              </div>

              {/* Package Specs Summary */}
              <div className="p-3 bg-warning-soft/50 rounded-xl border border-warning-line space-y-1 text-xs text-warning-ink">
                <div className="flex justify-between">
                  <span className="text-warning-ink font-semibold">Destination:</span>
                  <span className="font-bold">{pdfModalTemplate.destination}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-warning-ink font-semibold">Duration:</span>
                  <span className="font-bold">{pdfModalTemplate.nights} Nights / {pdfModalTemplate.nights + 1} Days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-warning-ink font-semibold">Smart Packing:</span>
                  <span className="font-bold">Continuous flow &amp; ≤30% empty space filler</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-line">
              <button
                type="button"
                disabled={isGeneratingPdf}
                onClick={() => setPdfModalTemplate(null)}
                className="px-4 py-2 bg-subtle hover:bg-hover text-content text-sm font-semibold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isGeneratingPdf}
                onClick={handleGeneratePackagePdf}
                className="px-5 py-2 bg-gradient-to-r from-[#FF6B35] to-[#D9582B] hover:opacity-95 text-white text-sm font-bold rounded-xl shadow-sm shadow-warning-line/20 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {isGeneratingPdf ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
                <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItineraryLibrary;
