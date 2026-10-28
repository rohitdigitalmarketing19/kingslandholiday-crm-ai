
import React, { useState, useEffect } from 'react';
import { Trash2, X, FileText, Users, Sparkles, Layout } from 'lucide-react';
import { Lead, Itinerary } from '../types';
import { generateItinerary, draftFollowUpEmail } from '../services/geminiService';
import { updateLeadTravelers, fetchClientDocuments, LeadTraveller } from '../services/apiService';
import { ClientDocumentsSection } from './ClientDocumentsSection';
import { ClientDetailsSection } from './ClientDetailsSection';

interface LeadDetailsProps {
  lead: Lead;
  agentName: string;
  onClose: () => void;
  onUpdateStatus: (leadId: string, status: Lead['status']) => void;
  onDeleteLead?: (leadId: string) => void;
  onUpdateLead?: (updatedLead: Lead) => void;
  initialTab?: 'overview' | 'documents' | 'client_details';
}

const LeadDetails: React.FC<LeadDetailsProps> = ({ lead, agentName, onClose, onUpdateStatus, onDeleteLead, onUpdateLead, initialTab = 'overview' }) => {
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [emailDraft, setEmailDraft] = useState<string>('');

  const isConverted = lead.status === 'Closed Won' || (lead.status as any) === 'Converted';
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'client_details'>(initialTab);
  const [docsCount, setDocsCount] = useState<number>(0);
  const [leadTravellers, setLeadTravellers] = useState<LeadTraveller[]>([]);

  useEffect(() => {
    if (isConverted && lead?.id) {
      fetchClientDocuments(lead.id)
        .then(res => setDocsCount(res.totalCount || 0))
        .catch(() => {});
    }
  }, [lead?.id, isConverted]);

  const [isEditingTravelers, setIsEditingTravelers] = useState(false);
  const [tempAdults, setTempAdults] = useState(lead.travelers?.adults || 0);
  const [tempChildren, setTempChildren] = useState(lead.travelers?.children || 0);

  const handleStartEditTravelers = () => {
    setTempAdults(lead.travelers?.adults || 0);
    setTempChildren(lead.travelers?.children || 0);
    setIsEditingTravelers(true);
  };

  const handleSaveTravelers = async () => {
    setLoading(true);
    try {
      const updated = await updateLeadTravelers(lead.id, tempAdults, tempChildren, lead.travelers?.childAges || []);
      if (onUpdateLead) {
        onUpdateLead(updated);
      }
      setIsEditingTravelers(false);
    } catch (e) {
      console.error('Failed to save travelers count:', e);
      alert('Failed to update travelers count');
    } finally {
      setLoading(false);
    }
  };

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
    <div className="fixed inset-0 bg-inverse/50 backdrop-blur-sm z-50 flex justify-end">
      <div className={`w-full ${isConverted ? 'max-w-4xl' : 'max-w-2xl'} bg-surface h-full shadow-sm overflow-y-auto flex flex-col transition-all duration-300`}>
        <div className="p-6 border-b border-line flex justify-between items-center bg-canvas sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-brand-ink tracking-widest uppercase">Inquiry #{lead.tripId}</span>
              {isConverted && (
                <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full bg-success-soft text-success-ink border border-success-line">
                  Converted Booking ✓
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-content">{lead.name}</h2>
            <p className="text-secondary text-sm">{lead.phone || 'No phone'} • {lead.email}</p>
          </div>
          <div className="flex items-center gap-3">
            {onDeleteLead && (
              <button 
                type="button"
                onClick={() => {
                  onDeleteLead(lead.id);
                }}
                className="px-3 py-1.5 bg-danger-soft hover:bg-danger-soft text-danger-ink border border-danger-line rounded-lg text-sm font-medium transition-all flex items-center gap-1.5"
              >
                <Trash2 size={13} />
                <span>Delete Lead</span>
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-hover rounded-lg transition-colors text-muted"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation for Converted Leads */}
        {isConverted && (
          <div className="flex items-center gap-2 px-6 pt-4 border-b border-line bg-canvas/50">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`pb-3 px-3 text-sm font-semibold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-brand-line text-brand-ink'
                  : 'border-transparent text-muted hover:text-secondary'
              }`}
            >
              <Layout size={14} />
              <span>Overview & AI</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('documents')}
              className={`pb-3 px-3 text-sm font-semibold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                activeTab === 'documents'
                  ? 'border-brand-line text-brand-ink'
                  : 'border-transparent text-muted hover:text-secondary'
              }`}
            >
              <FileText size={14} />
              <span>Client Documents</span>
              <span className={`text-xs px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'documents' ? 'bg-brand-soft text-brand-ink' : 'bg-hover text-secondary'
              }`}>
                {docsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('client_details')}
              className={`pb-3 px-3 text-sm font-semibold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                activeTab === 'client_details'
                  ? 'border-brand-line text-brand-ink'
                  : 'border-transparent text-muted hover:text-secondary'
              }`}
            >
              <Users size={14} />
              <span>Client Details</span>
            </button>
          </div>
        )}

        {isConverted && activeTab === 'documents' ? (
          <div className="p-6">
            <ClientDocumentsSection
              leadId={lead.id}
              leadTripId={lead.tripId}
              leadName={lead.name}
              travellers={leadTravellers}
              onCountChange={setDocsCount}
            />
          </div>
        ) : isConverted && activeTab === 'client_details' ? (
          <div className="p-6">
            <ClientDetailsSection
              leadId={lead.id}
              leadTripId={lead.tripId}
              leadName={lead.name}
              leadPhone={lead.phone}
              onTravellersUpdated={setLeadTravellers}
            />
          </div>
        ) : (
        <div className="p-6 space-y-8">
          {/* Analysis Section */}
          <section>
            <h3 className="text-sm font-bold text-muted uppercase tracking-widest mb-4">Travel Requirements</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
               <div className="bg-canvas p-4 rounded-xl border border-line">
                  <span className="block text-sm text-muted font-bold mb-1">Trip Duration</span>
                  <span className="text-lg font-bold text-content">{lead.durationDays || 'N/A'} Days</span>
               </div>
               <div className="bg-canvas p-4 rounded-xl border border-line">
                  <span className="block text-sm text-muted font-bold mb-1">Travel Date</span>
                  <span className="text-lg font-bold text-content">{lead.travelDate || 'N/A'}</span>
               </div>
               <div className="bg-canvas p-4 rounded-xl border border-line">
                  <span className="block text-sm text-muted font-bold mb-1">Travelers</span>
                  {isEditingTravelers ? (
                    <div className="space-y-2 mt-1">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-secondary font-bold w-12">Adults:</label>
                        <input
                          type="number"
                          min="1"
                          value={tempAdults}
                          onChange={(e) => setTempAdults(Number(e.target.value))}
                          className="w-16 px-1.5 py-0.5 rounded border border-line text-sm font-bold bg-surface outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-secondary font-bold w-12">Kids:</label>
                        <input
                          type="number"
                          min="0"
                          value={tempChildren}
                          onChange={(e) => setTempChildren(Number(e.target.value))}
                          className="w-16 px-1.5 py-0.5 rounded border border-line text-sm font-bold bg-surface outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={handleSaveTravelers}
                          className="px-2 py-0.5 bg-brand text-white rounded text-xs font-bold hover:bg-brand"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingTravelers(false)}
                          className="px-2 py-0.5 bg-hover text-secondary rounded text-xs font-bold hover:bg-hover"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-lg font-bold text-content">
                        {lead.travelers?.adults || 0} Adults
                        {lead.travelers?.children ? `, ${lead.travelers.children} Children` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={handleStartEditTravelers}
                        className="text-xs text-brand-ink hover:text-brand-ink font-bold bg-surface px-2 py-0.5 rounded border border-line shadow-2xs"
                      >
                        Edit
                      </button>
                    </div>
                  )}
               </div>
               <div className="bg-canvas p-4 rounded-xl border border-line">
                  <span className="block text-sm text-muted font-bold mb-1">Destination</span>
                  <span className="text-lg font-bold text-content">{lead.destination}</span>
               </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-brand-soft p-4 rounded-xl border border-brand-line">
                <span className="block text-sm text-brand-ink font-bold mb-1">AI Score</span>
                <span className="text-2xl font-bold text-brand-ink">{lead.score}</span>
              </div>
              <div className="bg-success-soft p-4 rounded-xl border border-success-line">
                <span className="block text-sm text-success-ink font-bold mb-1">Tier</span>
                <span className="text-2xl font-bold text-success-ink">{lead.budgetTier}</span>
              </div>
              <div className="bg-warning-soft p-4 rounded-xl border border-warning-line">
                <span className="block text-sm text-warning-ink font-bold mb-1">Intent</span>
                <span className="text-lg font-bold text-warning-ink leading-none">{lead.intent}</span>
              </div>
            </div>

            <div className="mt-4 p-4 bg-canvas rounded-xl border border-line">
              <h4 className="text-sm font-semibold text-content mb-2">Other Information</h4>
              <p className="text-sm text-secondary italic">"{lead.otherInfo || lead.rawInquiry}"</p>
            </div>
          </section>

          {/* Actions Section */}
          <section className="flex gap-4">
            <button 
              onClick={handleGenerateItinerary}
              disabled={loading}
              className="flex-1 bg-brand text-white py-3 rounded-xl font-semibold hover:bg-brand disabled:opacity-50 transition-all flex items-center justify-center gap-2"
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
              className="flex-1 bg-surface text-content border border-line py-3 rounded-xl font-semibold hover:bg-canvas disabled:opacity-50 transition-all flex items-center justify-center gap-2"
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
            <section className="bg-brand-soft/50 p-6 rounded-xl border border-brand-line animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-brand-ink">{itinerary.title}</h3>
                <span className="text-sm font-bold text-brand-ink bg-surface px-3 py-1 rounded-full border border-brand-line">
                  Est. ${itinerary.totalPrice.toLocaleString()}
                </span>
              </div>
              <div className="space-y-4">
                {itinerary.days.map(day => (
                  <div key={day.day} className="bg-surface p-4 rounded-xl border border-brand-line shadow-sm">
                    <span className="text-xs font-bold text-brand-ink uppercase tracking-tighter block mb-1">Day {day.day}</span>
                    <h4 className="font-semibold text-content mb-2">{day.title}</h4>
                    <p className="text-sm text-secondary mb-2 leading-relaxed">{day.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {day.activities.map((act, i) => (
                        <span key={i} className="text-xs bg-subtle text-secondary px-2 py-0.5 rounded-md">
                          {act}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-brand text-white rounded-xl text-center">
                <p className="text-xs font-medium opacity-90 mb-1">Dynamic Pricing Insight</p>
                <p className="text-sm font-bold">{itinerary.bestValueWindow}</p>
              </div>
            </section>
          )}

          {emailDraft && (
            <section className="bg-canvas p-6 rounded-xl border border-line">
              <h3 className="text-sm font-bold text-content mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                Email Writing Assistant (Kingsland Voice)
              </h3>
              <div className="bg-surface p-4 rounded-xl border border-line text-sm text-content whitespace-pre-wrap leading-relaxed shadow-inner">
                {emailDraft}
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(emailDraft);
                  alert('Email copied to clipboard!');
                }}
                className="mt-4 w-full py-2 text-sm font-bold text-brand-ink border border-brand-line rounded-lg hover:bg-brand-soft transition-colors"
              >
                Copy to Clipboard
              </button>
            </section>
          )}
        </div>
        )}
      </div>
    </div>
  );
};

export default LeadDetails;
