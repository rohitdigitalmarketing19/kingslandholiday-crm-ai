import React, { useState, useMemo } from 'react';
import { Lead, Agent } from '../types';
import { ClientDocumentsSection } from './ClientDocumentsSection';
import { ClientDetailsSection } from './ClientDetailsSection';
import { 
  FolderLock, 
  UserCheck, 
  Search, 
  MapPin, 
  Calendar, 
  Users, 
  FileText, 
  Share2, 
  CheckCircle2, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Building2
} from 'lucide-react';

interface AdminClientHubViewProps {
  leads: Lead[];
  agents: Agent[];
  defaultTab?: 'documents' | 'client_details';
  onViewProposal?: (lead: Lead) => void;
}

export const AdminClientHubView: React.FC<AdminClientHubViewProps> = ({
  leads,
  agents,
  defaultTab = 'documents',
  onViewProposal
}) => {
  const [activeTab, setActiveTab] = useState<'documents' | 'client_details'>(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter for Converted / Closed Won leads
  const convertedLeads = useMemo(() => {
    return leads.filter(l => l.status === 'Closed Won' || (l.status as any) === 'Converted');
  }, [leads]);

  const [selectedLeadId, setSelectedLeadId] = useState<string>(() => {
    return convertedLeads.length > 0 ? convertedLeads[0].id : '';
  });

  // Keep selected lead valid if leads update
  const selectedLead = useMemo(() => {
    return convertedLeads.find(l => l.id === selectedLeadId) || convertedLeads[0] || null;
  }, [convertedLeads, selectedLeadId]);

  const filteredConvertedLeads = useMemo(() => {
    if (!searchQuery.trim()) return convertedLeads;
    const q = searchQuery.toLowerCase();
    return convertedLeads.filter(l => 
      l.name.toLowerCase().includes(q) ||
      l.tripId.toLowerCase().includes(q) ||
      (l.destination || '').toLowerCase().includes(q) ||
      (l.phone || '').includes(q)
    );
  }, [convertedLeads, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#161713] p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-lime-400/20 text-lime-800 dark:text-lime-300 flex items-center justify-center font-bold">
              {activeTab === 'documents' ? <FolderLock size={20} /> : <UserCheck size={20} />}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                {activeTab === 'documents' ? 'Client Documents Desk' : 'Client Details & Public Intake Links'}
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-lime-100 text-lime-900 dark:bg-lime-400/10 dark:text-lime-400 border border-lime-300 dark:border-lime-500/20">
                  {convertedLeads.length} Converted Leads
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                {activeTab === 'documents' 
                  ? 'Secure client document vault for KYC, Passports, Visas, and Aadhaar cards.'
                  : 'Generate, manage, and share self-service traveller intake forms with clients via WhatsApp.'}
              </p>
            </div>
          </div>
        </div>

        {/* Tab switch pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'documents'
                ? 'bg-white dark:bg-[#161713] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FolderLock size={15} className={activeTab === 'documents' ? 'text-lime-600 dark:text-lime-400' : ''} />
            <span>Client Documents</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('client_details')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'client_details'
                ? 'bg-white dark:bg-[#161713] text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserCheck size={15} className={activeTab === 'client_details' ? 'text-lime-600 dark:text-lime-400' : ''} />
            <span>Client Details</span>
          </button>
        </div>
      </div>

      {convertedLeads.length === 0 ? (
        <div className="bg-white dark:bg-[#161713] p-12 rounded-2xl border border-slate-200 dark:border-zinc-800 text-center max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldCheck size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">No Converted Leads Yet</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
            Client Documents and Client Details are activated once a lead reaches the <strong>Converted</strong> status (Closed Won).
            Convert an active lead from <strong>All Leads</strong> or accept a proposal to start managing client documents.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Converted Leads Selector */}
          <div className="lg:col-span-4 bg-white dark:bg-[#161713] rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wider">
                Select Converted Lead
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                {filteredConvertedLeads.length} of {convertedLeads.length}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search trip ID, client, destination..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-lime-500"
              />
            </div>

            {/* Converted Leads List */}
            <div className="space-y-1.5 max-h-[620px] overflow-y-auto custom-scrollbar pr-1">
              {filteredConvertedLeads.map(lead => {
                const isSelected = selectedLead?.id === lead.id;
                return (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-lime-50 dark:bg-lime-400/10 border-lime-400/60 dark:border-lime-400/40 shadow-xs'
                        : 'bg-white dark:bg-zinc-900/40 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-lime-800 dark:text-lime-300 bg-lime-100 dark:bg-lime-400/20 px-1.5 py-0.5 rounded">
                          #{lead.tripId}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
                          {lead.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                        <span className="flex items-center gap-1">
                          <MapPin size={11} className="text-lime-500 shrink-0" />
                          <span className="truncate">{lead.destination || 'India'}</span>
                        </span>
                        <span>·</span>
                        <span>{lead.travelers?.adults || 2}A{lead.travelers?.children ? `+${lead.travelers.children}C` : ''}</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1">
                      {(lead.documentsCount ?? 0) > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-lime-100 dark:bg-lime-400/20 text-lime-800 dark:text-lime-300">
                          {lead.documentsCount} Docs
                        </span>
                      )}
                      <ChevronRight size={14} className={isSelected ? 'text-lime-600 dark:text-lime-400' : 'text-slate-400'} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Lead Section */}
          <div className="lg:col-span-8 space-y-4">
            {selectedLead && (
              <>
                {/* Active Lead Summary Banner */}
                <div className="bg-white dark:bg-[#161713] p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-zinc-800 text-white font-bold flex items-center justify-center shrink-0">
                      {selectedLead.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">{selectedLead.name}</h3>
                        <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">#{selectedLead.tripId}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-lime-50 text-lime-900 border border-lime-200 dark:bg-lime-400/10 dark:text-lime-400 dark:border-lime-400/20">
                          Converted
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 flex items-center gap-3">
                        <span>📱 {selectedLead.phone || 'No phone'}</span>
                        <span>✉️ {selectedLead.email || 'No email'}</span>
                        <span>📍 {selectedLead.destination || 'Unassigned'}</span>
                      </p>
                    </div>
                  </div>

                  {onViewProposal && (
                    <button
                      type="button"
                      onClick={() => onViewProposal(selectedLead)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileText size={13} />
                      <span>View Proposal</span>
                    </button>
                  )}
                </div>

                {/* Section Content */}
                {activeTab === 'documents' ? (
                  <ClientDocumentsSection
                    leadId={selectedLead.id}
                    leadTripId={selectedLead.tripId}
                    leadName={selectedLead.name}
                    isAdmin={true}
                    onCountChange={newCount => {
                      selectedLead.documentsCount = newCount;
                    }}
                  />
                ) : (
                  <ClientDetailsSection
                    leadId={selectedLead.id}
                    leadTripId={selectedLead.tripId}
                    leadName={selectedLead.name}
                    leadPhone={selectedLead.phone}
                    isAdmin={true}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
