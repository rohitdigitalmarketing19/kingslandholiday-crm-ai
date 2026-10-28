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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-5 rounded-xl border border-line shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-brand/20 text-brand-ink flex items-center justify-center font-bold">
              {activeTab === 'documents' ? <FolderLock size={20} /> : <UserCheck size={20} />}
            </div>
            <div>
              <h1 className="text-xl font-bold text-content dark:text-zinc-100 flex items-center gap-2">
                {activeTab === 'documents' ? 'Client Documents Desk' : 'Client Details & Public Intake Links'}
                <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-brand-soft text-brand-ink border border-brand-line ">
                  {convertedLeads.length} Converted Leads
                </span>
              </h1>
              <p className="text-sm text-secondary mt-0.5">
                {activeTab === 'documents' 
                  ? 'Secure client document vault for KYC, Passports, Visas, and Aadhaar cards.'
                  : 'Generate, manage, and share self-service traveller intake forms with clients via WhatsApp.'}
              </p>
            </div>
          </div>
        </div>

        {/* Tab switch pills */}
        <div className="flex items-center gap-1.5 p-1 bg-subtle rounded-xl border border-line self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'documents'
                ? 'bg-surface text-content dark:text-white shadow-xs'
                : 'text-secondary hover:text-content dark:hover:text-white'
            }`}
          >
            <FolderLock size={15} className={activeTab === 'documents' ? 'text-brand-ink ' : ''} />
            <span>Client Documents</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('client_details')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'client_details'
                ? 'bg-surface text-content dark:text-white shadow-xs'
                : 'text-secondary hover:text-content dark:hover:text-white'
            }`}
          >
            <UserCheck size={15} className={activeTab === 'client_details' ? 'text-brand-ink ' : ''} />
            <span>Client Details</span>
          </button>
        </div>
      </div>

      {convertedLeads.length === 0 ? (
        <div className="bg-surface p-12 rounded-xl border border-line text-center max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 bg-warning-soft text-warning-ink rounded-xl flex items-center justify-center mx-auto">
            <ShieldCheck size={28} />
          </div>
          <h3 className="text-base font-bold text-content dark:text-zinc-100">No Converted Leads Yet</h3>
          <p className="text-sm text-secondary leading-relaxed">
            Client Documents and Client Details are activated once a lead reaches the <strong>Converted</strong> status (Closed Won).
            Convert an active lead from <strong>All Leads</strong> or accept a proposal to start managing client documents.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Converted Leads Selector */}
          <div className="lg:col-span-4 bg-surface rounded-xl border border-line p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-content dark:text-zinc-100 uppercase tracking-wider">
                Select Converted Lead
              </h2>
              <span className="text-xs font-mono text-muted">
                {filteredConvertedLeads.length} of {convertedLeads.length}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search trip ID, client, destination..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-canvas border border-line rounded-xl text-sm text-content dark:text-zinc-100 outline-none focus:border-brand-line"
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
                        ? 'bg-brand-soft border-brand-line/60 shadow-xs'
                        : 'bg-surface border-line hover:border-line '
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-brand-ink bg-brand-soft px-1.5 py-0.5 rounded">
                          #{lead.tripId}
                        </span>
                        <span className="text-sm font-bold text-content dark:text-zinc-100 truncate">
                          {lead.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-secondary truncate">
                        <span className="flex items-center gap-1">
                          <MapPin size={11} className="text-brand-ink shrink-0" />
                          <span className="truncate">{lead.destination || 'India'}</span>
                        </span>
                        <span>·</span>
                        <span>{lead.travelers?.adults || 2}A{lead.travelers?.children ? `+${lead.travelers.children}C` : ''}</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1">
                      {(lead.documentsCount ?? 0) > 0 && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-brand-soft text-brand-ink ">
                          {lead.documentsCount} Docs
                        </span>
                      )}
                      <ChevronRight size={14} className={isSelected ? 'text-brand-ink ' : 'text-muted'} />
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
                <div className="bg-surface p-4 rounded-xl border border-line shadow-xs flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-inverse text-white font-bold flex items-center justify-center shrink-0">
                      {selectedLead.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-content dark:text-zinc-100">{selectedLead.name}</h3>
                        <span className="text-xs font-mono text-secondary ">#{selectedLead.tripId}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand-soft text-brand-ink border border-brand-line ">
                          Converted
                        </span>
                      </div>
                      <p className="text-sm text-secondary mt-0.5 flex items-center gap-3">
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
                      className="px-3 py-1.5 bg-subtle hover:bg-hover text-content dark:text-zinc-200 text-sm font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
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
