
import React, { useState } from 'react';
import { Lead, Itinerary } from '../types';
import { generateItinerary, draftFollowUpEmail } from '../services/geminiService';

interface LeadDetailsProps {
  lead: Lead;
  agentName: string;
  onClose: () => void;
  onUpdateStatus: (leadId: string, status: Lead['status']) => void;
  onDeleteLead?: (leadId: string) => void;
}

const LeadDetails: React.FC<LeadDetailsProps> = ({ lead, agentName, onClose, onUpdateStatus, onDeleteLead }) => {
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [emailDraft, setEmailDraft] = useState<string>('');

  const handleGenerateItinerary = async () => {
    setLoading(true);
    try {
      const itin = await generateItinerary(lead);
      setItinerary(itin);
      onUpdateStatus(lead.id, 'Qualified');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDraftEmail = async () => {
    setLoading(true);
    try {
      const draft = await draftFollowUpEmail(lead, agentName);
      setEmailDraft(draft);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full shadow-xl overflow-y-auto flex flex-col">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
          <div>
            <span className="text-[10px] font-bold text-indigo-600 tracking-widest uppercase block mb-1">Inquiry #{lead.tripId}</span>
            <h2 className="text-2xl font-bold text-slate-800">{lead.name}</h2>
            <p className="text-slate-500 text-sm">{lead.phone || 'No phone'} • {lead.email}</p>
          </div>
          <div className="flex items-center gap-3">
            {onDeleteLead && (
              <button 
                onClick={() => {
                  if (confirm(`Delete Lead inquiry #${lead.tripId} (${lead.name})?`)) {
                    onDeleteLead(lead.id);
                  }
                }}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-1.5"
              >
                🗑️ Delete Lead
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Analysis Section */}
          <section>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Travel Requirements</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="block text-xs text-slate-400 font-bold mb-1">Trip Duration</span>
                  <span className="text-lg font-bold text-slate-700">{lead.durationDays || 'N/A'} Days</span>
               </div>
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="block text-xs text-slate-400 font-bold mb-1">Travel Date</span>
                  <span className="text-lg font-bold text-slate-700">{lead.travelDate || 'N/A'}</span>
               </div>
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="block text-xs text-slate-400 font-bold mb-1">Travelers</span>
                  <span className="text-lg font-bold text-slate-700">
                    {lead.travelers?.adults || 0} Adults
                    {lead.travelers?.children ? `, ${lead.travelers.children} Children` : ''}
                  </span>
               </div>
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <span className="block text-xs text-slate-400 font-bold mb-1">Destination</span>
                  <span className="text-lg font-bold text-slate-700">{lead.destination}</span>
               </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <span className="block text-xs text-indigo-400 font-bold mb-1">AI Score</span>
                <span className="text-2xl font-bold text-indigo-700">{lead.score}</span>
              </div>
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <span className="block text-xs text-emerald-400 font-bold mb-1">Tier</span>
                <span className="text-2xl font-bold text-emerald-700">{lead.budgetTier}</span>
              </div>
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                <span className="block text-xs text-amber-400 font-bold mb-1">Intent</span>
                <span className="text-lg font-bold text-amber-700 leading-none">{lead.intent}</span>
              </div>
            </div>

            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Other Information</h4>
              <p className="text-sm text-slate-600 italic">"{lead.otherInfo || lead.rawInquiry}"</p>
            </div>
          </section>

          {/* Actions Section */}
          <section className="flex gap-4">
            <button 
              onClick={handleGenerateItinerary}
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'AI Thinking...' : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Generate Itinerary
                </>
              )}
            </button>
            <button 
              onClick={handleDraftEmail}
              disabled={loading}
              className="flex-1 bg-white text-slate-700 border border-slate-200 py-3 rounded-xl font-semibold hover:bg-slate-50 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Drafting...' : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Draft Follow-up
                </>
              )}
            </button>
          </section>

          {/* Result Display */}
          {itinerary && (
            <section className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-indigo-900">{itinerary.title}</h3>
                <span className="text-sm font-bold text-indigo-600 bg-white px-3 py-1 rounded-full border border-indigo-200">
                  Est. ${itinerary.totalPrice.toLocaleString()}
                </span>
              </div>
              <div className="space-y-4">
                {itinerary.days.map(day => (
                  <div key={day.day} className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter block mb-1">Day {day.day}</span>
                    <h4 className="font-semibold text-slate-800 mb-2">{day.title}</h4>
                    <p className="text-xs text-slate-600 mb-2 leading-relaxed">{day.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {day.activities.map((act, i) => (
                        <span key={i} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                          {act}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-indigo-600 text-white rounded-xl text-center">
                <p className="text-xs font-medium opacity-90 mb-1">Dynamic Pricing Insight</p>
                <p className="text-sm font-bold">{itinerary.bestValueWindow}</p>
              </div>
            </section>
          )}

          {emailDraft && (
            <section className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                Email Writing Assistant (Kingsland Voice)
              </h3>
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed shadow-inner">
                {emailDraft}
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(emailDraft);
                  alert('Email copied to clipboard!');
                }}
                className="mt-4 w-full py-2 text-xs font-bold text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                Copy to Clipboard
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default LeadDetails;
