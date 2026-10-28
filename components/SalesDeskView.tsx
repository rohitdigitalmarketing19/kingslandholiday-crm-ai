import React, { useState, useMemo } from 'react';
import { Agent, Lead, UserAccount } from '../types';
import { 
  Users2, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  Calendar, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  Flame, 
  FileText, 
  ArrowRight, 
  UserCheck, 
  Filter, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  UserPlus
} from 'lucide-react';

interface SalesDeskViewProps {
  agents: Agent[];
  leads: Lead[];
  currentUser: UserAccount;
  onSelectLead: (lead: Lead) => void;
  onViewProposal: (lead: Lead) => void;
  onNewQuote: (lead: Lead) => void;
  onUpdateLeadStatus: (leadId: string, status: Lead['status'], extraFields?: any) => Promise<void>;
  onReassignLead?: (leadId: string, agentId: string) => Promise<void>;
  onOpenAddAgent?: () => void;
  onOpenNewInquiry?: () => void;
  isReadOnly?: boolean;
}

export const SalesDeskView: React.FC<SalesDeskViewProps> = ({
  agents,
  leads,
  currentUser,
  onSelectLead,
  onViewProposal,
  onNewQuote,
  onUpdateLeadStatus,
  onReassignLead,
  onOpenAddAgent,
  onOpenNewInquiry,
  isReadOnly = false
}) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [reassigningLeadId, setReassigningLeadId] = useState<string | null>(null);

  const isAdmin = currentUser.role === 'Admin' && currentUser.accessLevel !== 'ViewOnly';

  // Metrics across the entire team
  const teamMetrics = useMemo(() => {
    const totalLeads = leads.length;
    const activeLeads = leads.filter(l => ['New', 'Qualified', 'Hot', 'Updated', 'Itinerary Sent', 'Payment Pending', 'Follow-up'].includes(l.status)).length;
    const wonLeads = leads.filter(l => l.status === 'Closed Won').length;
    const hotLeads = leads.filter(l => l.status === 'Hot' || l.intent === 'High Intent').length;
    const followUpsDue = leads.filter(l => (l.status === 'Follow-up' || Boolean(l.followUpDate)) && !l.followUpCompleted).length;
    const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

    return { totalLeads, activeLeads, wonLeads, hotLeads, followUpsDue, conversionRate };
  }, [leads]);

  // Selected agent object
  const activeAgent = useMemo(() => {
    if (selectedAgentId === 'ALL') return null;
    return agents.find(a => a.id === selectedAgentId) || null;
  }, [agents, selectedAgentId]);

  // Leads for the selected agent (or all)
  const agentLeads = useMemo(() => {
    if (selectedAgentId === 'ALL') return leads;
    return leads.filter(l => l.assignedTo === selectedAgentId);
  }, [leads, selectedAgentId]);

  // Filtered leads based on search and status
  const filteredLeads = useMemo(() => {
    return agentLeads.filter(l => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        l.name.toLowerCase().includes(q) ||
        l.tripId.toLowerCase().includes(q) ||
        (l.destination && l.destination.toLowerCase().includes(q)) ||
        (l.phone && l.phone.includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (statusFilter === 'All') return true;
      if (statusFilter === 'Active') return ['New', 'Qualified', 'Hot', 'Updated', 'Itinerary Sent', 'Payment Pending'].includes(l.status);
      if (statusFilter === 'Hot') return l.status === 'Hot' || l.intent === 'High Intent';
      if (statusFilter === 'Follow-up') return l.status === 'Follow-up' || Boolean(l.followUpDate);
      if (statusFilter === 'Won') return l.status === 'Closed Won';
      if (statusFilter === 'Lost') return l.status === 'Closed Lost';
      return l.status === statusFilter;
    });
  }, [agentLeads, searchQuery, statusFilter]);

  // Helper to get agent name and avatar
  const getAgentInfo = (agentId: string) => {
    const found = agents.find(a => a.id === agentId);
    return found || { name: 'Unassigned', avatar: '', specialty: [] };
  };

  const handleReassign = async (leadId: string, newAgentId: string) => {
    if (!onReassignLead) return;
    try {
      setReassigningLeadId(leadId);
      await onReassignLead(leadId, newAgentId);
    } catch (err) {
      console.error('Failed to reassign lead:', err);
    } finally {
      setReassigningLeadId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-line ">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand text-white rounded-xl shadow-xs">
              <Users2 size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-content dark:text-white tracking-tight flex items-center gap-2">
                <span>Sales Desk</span>
                <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 bg-brand-soft text-brand-ink rounded-full border border-brand-line ">
                  Representatives Roster
                </span>
              </h2>
              <p className="text-sm text-secondary mt-0.5">
                Centralized workspace to monitor sales representatives, performance metrics, and assigned leads.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onOpenNewInquiry && (
            <button
              onClick={onOpenNewInquiry}
              className="px-3.5 py-2 bg-surface border border-line hover:bg-canvas text-content dark:text-zinc-200 rounded-xl text-sm font-medium transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} className="text-secondary" />
              <span>New Inquiry</span>
            </button>
          )}

          {isAdmin && onOpenAddAgent && (
            <button
              onClick={onOpenAddAgent}
              className="px-4 py-2 bg-brand hover:bg-brand text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus size={14} />
              <span>Add Representative</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-surface p-4 rounded-xl border border-line shadow-2xs">
          <p className="text-xs font-medium text-muted uppercase tracking-wider">Sales Experts</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-content dark:text-white">{agents.length}</span>
            <span className="text-xs text-brand-ink bg-brand-soft px-1.5 py-0.5 rounded font-medium">Team</span>
          </div>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-line shadow-2xs">
          <p className="text-xs font-medium text-muted uppercase tracking-wider">Total Leads</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-content dark:text-white">{teamMetrics.totalLeads}</span>
            <span className="text-xs text-secondary bg-subtle px-1.5 py-0.5 rounded font-medium">In CRM</span>
          </div>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-line shadow-2xs">
          <p className="text-xs font-medium text-muted uppercase tracking-wider">Active Pipeline</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-brand-ink ">{teamMetrics.activeLeads}</span>
            <span className="text-xs text-brand-ink bg-brand-soft px-1.5 py-0.5 rounded font-medium">Active</span>
          </div>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-line shadow-2xs">
          <p className="text-xs font-medium text-muted uppercase tracking-wider">Hot & Urgent</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-warning-ink ">{teamMetrics.hotLeads}</span>
            <Flame size={14} className="text-warning-ink" />
          </div>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-line shadow-2xs">
          <p className="text-xs font-medium text-muted uppercase tracking-wider">Follow-ups Due</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-brand-ink ">{teamMetrics.followUpsDue}</span>
            <Clock size={14} className="text-brand-ink" />
          </div>
        </div>

        <div className="bg-surface p-4 rounded-xl border border-line shadow-2xs">
          <p className="text-xs font-medium text-muted uppercase tracking-wider">Deals Won</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-success-ink ">{teamMetrics.wonLeads}</span>
            <span className="text-xs text-success-ink bg-success-soft px-1.5 py-0.5 rounded font-medium">
              {teamMetrics.conversionRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Representatives Selector Roster */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-content dark:text-zinc-300 uppercase tracking-wider">
            Select Representative
          </label>
          <span className="text-xs text-muted">
            {selectedAgentId === 'ALL' ? 'Showing leads across all representatives' : `Viewing leads for ${activeAgent?.name}`}
          </span>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 custom-scrollbar">
          {/* ALL REPRESENTATIVES TAB */}
          <button
            onClick={() => setSelectedAgentId('ALL')}
            className={`px-4 py-3 rounded-xl border transition-all shrink-0 text-left cursor-pointer flex items-center gap-3 ${
              selectedAgentId === 'ALL'
                ? 'bg-inverse text-white border-line shadow-sm'
                : 'bg-surface border-line hover:bg-canvas text-content dark:text-zinc-200'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
              selectedAgentId === 'ALL' 
                ? 'bg-white/20 text-white ' 
                : 'bg-brand-soft text-brand-ink '
            }`}>
              <Users2 size={18} />
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">All Representatives</p>
              <p className={`text-xs mt-0.5 ${selectedAgentId === 'ALL' ? 'text-white/70 ' : 'text-muted'}`}>
                {leads.length} Total Leads
              </p>
            </div>
          </button>

          {/* INDIVIDUAL AGENTS */}
          {agents.map(agent => {
            const isSelected = selectedAgentId === agent.id;
            const assignedCount = leads.filter(l => l.assignedTo === agent.id).length;
            const wonCount = leads.filter(l => l.assignedTo === agent.id && l.status === 'Closed Won').length;

            return (
              <button
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                className={`px-3.5 py-3 rounded-xl border transition-all shrink-0 text-left cursor-pointer flex items-center gap-3 ${
                  isSelected
                    ? 'bg-brand text-white border-brand-line shadow-sm shadow-brand-line/20 ring-2 ring-brand-line/30'
                    : 'bg-surface border-line hover:border-brand-line text-content dark:text-zinc-200 hover:shadow-2xs'
                }`}
              >
                {agent.avatar ? (
                  <img
                    src={agent.avatar}
                    alt={agent.name}
                    className="w-10 h-10 rounded-xl object-cover border border-white/20 shrink-0 shadow-2xs"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-brand-soft text-brand-ink'
                  }`}>
                    {agent.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 pr-1">
                  <p className="text-xs font-bold leading-tight truncate">{agent.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-xs font-medium ${isSelected ? 'text-white/80' : 'text-secondary '}`}>
                      {assignedCount} Leads
                    </span>
                    {wonCount > 0 && (
                      <span className={`text-xs font-bold px-1 rounded ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-success-soft text-success-ink '
                      }`}>
                        {wonCount} Won
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Agent Detailed Profile Card (if single agent selected) */}
      {activeAgent && (
        <div className="bg-gradient-to-r from-line via-brand to-line text-white p-5 rounded-xl shadow-sm border border-brand-line/40 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              {activeAgent.avatar ? (
                <img
                  src={activeAgent.avatar}
                  alt={activeAgent.name}
                  className="w-14 h-14 rounded-xl object-cover border-2 border-brand-line/50 shadow-sm shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-brand text-white font-bold text-xl flex items-center justify-center border-2 border-brand-line/50 shrink-0">
                  {activeAgent.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">{activeAgent.name}</h3>
                  <span className="text-xs font-medium bg-brand/30 text-brand-ink px-2 py-0.5 rounded-full border border-brand-line/30">
                    Sales Expert
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-brand-ink/80 mt-1">
                  {activeAgent.phone && (
                    <a href={`tel:${activeAgent.phone}`} className="flex items-center gap-1 hover:text-white transition-colors">
                      <Phone size={12} className="text-brand-ink" />
                      <span>{activeAgent.phone}</span>
                    </a>
                  )}
                  {activeAgent.email && (
                    <a href={`mailto:${activeAgent.email}`} className="flex items-center gap-1 hover:text-white transition-colors">
                      <Mail size={12} className="text-brand-ink" />
                      <span>{activeAgent.email}</span>
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-xs text-brand-ink font-medium uppercase tracking-wider mr-0.5">Destinations:</span>
                  {activeAgent.specialty && activeAgent.specialty.length > 0 ? (
                    activeAgent.specialty.map(s => (
                      <span key={s} className="px-2 py-0.5 bg-white/10 text-white text-xs font-medium rounded-md border border-white/10">
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-brand-ink/70 italic">All Destinations</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-5">
              <div className="text-center px-2">
                <p className="text-xs text-brand-ink uppercase tracking-wider font-semibold">Total Assigned</p>
                <p className="text-xl font-bold mt-0.5">{agentLeads.length}</p>
              </div>
              <div className="text-center px-2">
                <p className="text-xs text-success-ink uppercase tracking-wider font-semibold">Won Deals</p>
                <p className="text-xl font-bold text-success-ink mt-0.5">
                  {agentLeads.filter(l => l.status === 'Closed Won').length}
                </p>
              </div>
              <div className="text-center px-2">
                <p className="text-xs text-warning-ink uppercase tracking-wider font-semibold">Hot Intent</p>
                <p className="text-xl font-bold text-warning-ink mt-0.5">
                  {agentLeads.filter(l => l.status === 'Hot' || l.intent === 'High Intent').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar for Assigned Leads */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-3 rounded-xl border border-line shadow-2xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder={
              activeAgent 
                ? `Search leads assigned to ${activeAgent.name} (name, trip ID, destination)...`
                : 'Search all assigned leads across sales team...'
            }
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-canvas border border-line rounded-xl pl-9 pr-3 py-2 text-sm text-content dark:text-zinc-200 outline-none focus:border-brand-line focus:bg-surface transition-all"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
          {[
            { id: 'All', label: 'All' },
            { id: 'Active', label: 'Active Pipeline' },
            { id: 'Hot', label: 'Hot Leads' },
            { id: 'Follow-up', label: 'Follow-up' },
            { id: 'Won', label: 'Won' },
            { id: 'Lost', label: 'Lost' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all shrink-0 cursor-pointer ${
                statusFilter === f.id
                  ? 'bg-inverse text-white shadow-2xs'
                  : 'bg-subtle text-secondary hover:bg-hover '
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Assigned Leads Table & Card Container */}
      <div className="bg-surface rounded-xl border border-line overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-content dark:text-white">
              {activeAgent ? `${activeAgent.name}'s Assigned Leads` : 'All Assigned Leads'}
            </h4>
            <span className="text-xs font-semibold px-2 py-0.5 bg-subtle text-secondary rounded-full">
              {filteredLeads.length} {filteredLeads.length === 1 ? 'Lead' : 'Leads'}
            </span>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-brand-ink hover:underline cursor-pointer"
            >
              Clear Search
            </button>
          )}
        </div>

        {filteredLeads.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-subtle text-muted flex items-center justify-center mx-auto">
              <Users2 size={24} />
            </div>
            <div className="max-w-xs mx-auto">
              <h5 className="text-sm font-semibold text-content dark:text-zinc-200">No leads found</h5>
              <p className="text-sm text-muted mt-1">
                {activeAgent
                  ? `There are currently no matching leads assigned to ${activeAgent.name}.`
                  : 'No leads match the selected criteria.'}
              </p>
            </div>
            {onOpenNewInquiry && (
              <button
                onClick={onOpenNewInquiry}
                className="px-3 py-1.5 bg-brand hover:bg-brand text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus size={13} />
                <span>Create Lead for {activeAgent?.name || 'Representative'}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-canvas text-secondary border-b border-line text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Client & Trip ID</th>
                  <th className="py-3 px-4">Destination & Dates</th>
                  <th className="py-3 px-4">Duration / Pax</th>
                  <th className="py-3 px-4">Assigned Expert</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Intent</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line ">
                {filteredLeads.map(lead => {
                  const leadAgent = getAgentInfo(lead.assignedTo);
                  const isReassigning = reassigningLeadId === lead.id;

                  return (
                    <tr 
                      key={lead.id} 
                      className="hover:bg-canvas/80 transition-colors group"
                    >
                      {/* Client & Trip ID */}
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-semibold text-content dark:text-white hover:text-brand-ink transition-colors cursor-pointer" onClick={() => onSelectLead(lead)}>
                            {lead.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-secondary ">
                            <span className="font-mono text-brand-ink font-semibold">{lead.tripId}</span>
                            {lead.phone && (
                              <span className="text-muted">· {lead.phone}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Destination & Dates */}
                      <td className="py-3 px-4">
                        <div>
                          <div className="flex items-center gap-1 font-medium text-content dark:text-zinc-200">
                            <MapPin size={12} className="text-danger-ink shrink-0" />
                            <span>{lead.destination || 'Not Specified'}</span>
                          </div>
                          <p className="text-xs text-muted mt-0.5">
                            {lead.travelDate ? new Date(lead.travelDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Date TBA'}
                          </p>
                        </div>
                      </td>

                      {/* Duration / Pax */}
                      <td className="py-3 px-4">
                        <div className="text-xs text-content dark:text-zinc-300">
                          <p className="font-medium">{lead.durationDays ? `${lead.durationDays} Days` : 'Flexible'}</p>
                          <p className="text-muted mt-0.5">
                            {lead.travelers ? `${lead.travelers.adults} Adults${lead.travelers.children ? `, ${lead.travelers.children} Ch.` : ''}` : '2 Adults'}
                          </p>
                        </div>
                      </td>

                      {/* Assigned Expert */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {leadAgent.avatar ? (
                            <img
                              src={leadAgent.avatar}
                              alt={leadAgent.name}
                              className="w-7 h-7 rounded-full object-cover border border-line shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-brand-soft text-brand-ink font-bold text-sm flex items-center justify-center shrink-0">
                              {leadAgent.name.charAt(0).toUpperCase()}
                            </div>
                          )}

                          {isAdmin && onReassignLead ? (
                            <select
                              value={lead.assignedTo || ''}
                              disabled={isReassigning}
                              onChange={(e) => handleReassign(lead.id, e.target.value)}
                              className="text-sm bg-canvas border border-line rounded-md px-1.5 py-1 text-content dark:text-zinc-300 font-medium outline-none focus:border-brand-line cursor-pointer disabled:opacity-50"
                              title="Reassign to another sales representative"
                            >
                              {agents.map(a => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="font-medium text-content dark:text-zinc-200 truncate max-w-[110px]">
                              {leadAgent.name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${
                          lead.status === 'Closed Won'
                            ? 'bg-success-soft text-success-ink border-success-line '
                            : lead.status === 'Hot'
                            ? 'bg-warning-soft text-warning-ink border-warning-line '
                            : lead.status === 'Qualified'
                            ? 'bg-brand-soft text-brand-ink border-brand-line '
                            : lead.status === 'Itinerary Sent'
                            ? 'bg-brand-soft text-brand-ink border-brand-line '
                            : lead.status === 'Closed Lost'
                            ? 'bg-danger-soft text-danger-ink border-danger-line '
                            : 'bg-subtle text-content border-line dark:text-zinc-300'
                        }`}>
                          {lead.status}
                        </span>
                      </td>

                      {/* Intent */}
                      <td className="py-3 px-4">
                        <span className={`text-xs font-semibold ${
                          lead.intent === 'High Intent' || lead.score >= 80
                            ? 'text-success-ink '
                            : lead.intent === 'Urgent'
                            ? 'text-danger-ink '
                            : 'text-secondary '
                        }`}>
                          {lead.intent || 'Normal'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectLead(lead)}
                            className="px-2.5 py-1 bg-subtle hover:bg-hover text-content dark:text-zinc-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                          >
                            Details
                          </button>

                          <button
                            onClick={() => {
                              if (lead.quotes && lead.quotes.length > 0) {
                                onViewProposal(lead);
                              } else {
                                onNewQuote(lead);
                              }
                            }}
                            className="px-2.5 py-1 bg-brand-soft hover:bg-brand-soft text-brand-ink border border-brand-line rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <FileText size={11} />
                            <span>{lead.quotes && lead.quotes.length > 0 ? 'Proposal' : 'Quote'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesDeskView;
