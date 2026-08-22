import React, { useState } from 'react';
import { Trash2, Eye, FileText, Calendar, Clock, Phone, User, ChevronDown, ChevronRight, MapPin, Users as UsersIcon } from 'lucide-react';
import { Lead } from '../types';

interface LeadCardProps {
  lead: Lead;
  onClick: (lead: Lead) => void;
  onViewProposal?: (lead: Lead) => void;
  onDeleteLead?: (leadId: string) => void;
  agentName?: string;
  showGiveQuote?: boolean; 
  displayIndex?: number;
  defaultExpanded?: boolean;
}

const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return 'Not specified';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const LeadCard: React.FC<LeadCardProps> = ({ 
  lead, 
  onClick, 
  onViewProposal, 
  onDeleteLead, 
  agentName = "Agent", 
  showGiveQuote = false, 
  displayIndex,
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const statusMapping: Record<Lead['status'], { label: string; badgeClass: string }> = {
    'New': { label: 'New Lead', badgeClass: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700' },
    'Qualified': { label: 'Active Lead', badgeClass: 'bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700' },
    'Hot': { label: 'Hot Lead', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20' },
    'Updated': { label: 'Updated', badgeClass: 'bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700' },
    'Itinerary Sent': { label: 'In Progress', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' },
    'Closed Won': { label: 'Converted', badgeClass: 'bg-lime-50 text-lime-900 border-lime-200 dark:bg-lime-400/10 dark:text-lime-400 dark:border-lime-400/20' },
    'Closed Lost': { label: 'Cancelled', badgeClass: 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800/60 dark:text-zinc-400 dark:border-zinc-700' },
    'Postponed': { label: 'Postponed', badgeClass: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700' },
    'Payment Pending': { label: 'Payment Pending', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' },
    'Follow-up': { label: 'Follow-Up', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' }
  };

  const currentStatus = statusMapping[lead.status] || { label: lead.status, badgeClass: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700' };

  return (
    <div 
      className={`bg-white dark:bg-[#161713] border rounded-2xl transition-all font-sans overflow-hidden ${
        isExpanded 
          ? 'border-lime-400/50 dark:border-lime-400/40 shadow-md ring-1 ring-lime-400/20' 
          : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 hover:shadow-xs shadow-2xs'
      }`}
    >
      {/* Compact Row Header (Always Visible - Click to toggle full card) */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`px-4 py-3 cursor-pointer select-none transition-colors flex flex-wrap items-center justify-between gap-3 ${
          isExpanded ? 'bg-slate-50/80 dark:bg-zinc-900/80 border-b border-slate-200 dark:border-zinc-800' : 'bg-white dark:bg-[#161713] hover:bg-slate-50 dark:hover:bg-zinc-800/40'
        }`}
      >
        {/* Left Side: Chevron, Badges, Name, Destination, Key Summary */}
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          <button
            type="button"
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-transform duration-200"
            title={isExpanded ? "Collapse card" : "Expand full card"}
          >
            {isExpanded ? (
              <ChevronDown size={16} className="text-lime-400 transform rotate-180 transition-transform duration-200" />
            ) : (
              <ChevronRight size={16} className="text-slate-400 dark:text-zinc-500 group-hover:text-slate-600 transition-transform duration-200" />
            )}
          </button>

          <span className="w-6 h-6 rounded-md bg-slate-900 dark:bg-zinc-800 text-white font-semibold text-[11px] flex items-center justify-center shrink-0">
            {displayIndex || lead.tripId.slice(-1)}
          </span>

          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${currentStatus.badgeClass}`}>
            {currentStatus.label}
          </span>

          <span className="text-xs font-mono font-semibold text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded shrink-0">
            #{lead.tripId}
          </span>

          {/* Customer Avatar & Name */}
          <div className="flex items-center gap-1.5 min-w-0 pr-1">
            <div className="w-5 h-5 rounded-full bg-lime-400/10 text-lime-400 font-bold text-[10px] flex items-center justify-center shrink-0 border border-lime-400/20">
              {lead.name.charAt(0).toUpperCase()}
            </div>
            <span className="font-semibold text-slate-900 dark:text-zinc-100 text-xs truncate max-w-[150px] sm:max-w-[200px]">
              {lead.name}
            </span>
          </div>

          {/* Quick Destination Badge */}
          {lead.destination && (
            <div className="hidden sm:flex items-center gap-1 text-xs text-zinc-700 dark:text-zinc-300 font-semibold bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-2 py-0.5 rounded shrink-0">
              <MapPin size={11} className="text-lime-400" />
              <span>{lead.destination}</span>
            </div>
          )}

          {/* Quick Date & Travelers preview in row */}
          {!isExpanded && (
            <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-500 shrink-0">
              <span>📅 {formatDate(lead.travelDate)}</span>
              <span>·</span>
              <span>{lead.durationDays || 0}D/{Math.max(0, (lead.durationDays || 1) - 1)}N</span>
              <span>·</span>
              <span>{lead.travelers?.adults || 0} Adults</span>
            </div>
          )}

          {/* Follow-up / Postponed indicators */}
          {lead.status === 'Postponed' && lead.postponedDate && (
            <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-medium px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
              <Calendar size={11} />
              <span>{formatDate(lead.postponedDate)}</span>
            </span>
          )}

          {(lead.status === 'Follow-up' || lead.followUpDate) && (
            <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-medium px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
              <Clock size={11} />
              <span>{formatDate(lead.followUpDate)}</span>
            </span>
          )}
        </div>

        {/* Right Side: Agent info & Quick Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden lg:flex items-center gap-1 text-[11px] text-slate-500 mr-1">
            <User size={11} className="text-slate-400" />
            <span>{agentName}</span>
          </div>

          {onDeleteLead && (
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteLead(lead.id);
              }}
              className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 border border-slate-200 hover:border-rose-200 cursor-pointer"
              title="Delete Lead"
            >
              <Trash2 size={13} />
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}

          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onViewProposal) onViewProposal(lead);
            }}
            className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border border-slate-200 cursor-pointer"
          >
            <Eye size={13} className="text-slate-500" />
            <span>Preview</span>
          </button>
          
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClick(lead);
            }}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <FileText size={13} />
            <span>Give Quote</span>
          </button>
        </div>
      </div>

      {/* Complete Card Body (Visible when Expanded) */}
      {isExpanded && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Main Content Grid */}
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-white">
            {/* Col 1: Travel Specs */}
            <div className="space-y-2 border-r-0 sm:border-r border-slate-100 sm:pr-4">
              <div>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide block">Starting Date</span>
                <span className="font-semibold text-slate-800 text-xs">{formatDate(lead.travelDate)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide block">Duration</span>
                <span className="font-medium text-slate-700 text-xs">
                  {lead.durationDays || 0} Days / {Math.max(0, (lead.durationDays || 1) - 1)} Nights
                </span>
              </div>
            </div>

            {/* Col 2: Destination & Travelers */}
            <div className="space-y-2 border-r-0 sm:border-r border-slate-100 sm:pr-4">
              <div>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide block">Destination</span>
                <span className="font-semibold text-indigo-700 text-xs">{lead.destination || 'Unassigned'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide block">Travelers</span>
                <span className="font-medium text-slate-700 text-xs">
                  {lead.travelers?.adults || 0} Adults{lead.travelers?.children ? `, ${lead.travelers.children} Child` : ''}
                </span>
              </div>
            </div>

            {/* Col 3: Channel & Follow-up status */}
            <div className="space-y-2">
              <div>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide block">Source Channel</span>
                <span className="font-medium text-slate-700 text-xs">{lead.source || 'Direct'}</span>
              </div>

              {lead.status === 'Postponed' && lead.postponedReason ? (
                <div className="p-2 rounded bg-purple-50 border border-purple-100 text-[11px] text-purple-900">
                  <span className="font-medium">Reason: </span>{lead.postponedReason}
                </div>
              ) : (lead.status === 'Follow-up' || lead.followUpDate) && lead.followUpNote ? (
                <div className="p-2 rounded bg-amber-50 border border-amber-100 text-[11px] text-amber-900 line-clamp-2">
                  <span className="font-medium">Note: </span>{lead.followUpNote}
                </div>
              ) : (
                <div>
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide block">Last Activity</span>
                  <span className="text-[11px] text-slate-500">
                    {new Date(lead.lastFollowUp || lead.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Contact Bar */}
          <div className="px-5 py-2.5 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-[10px] flex items-center justify-center">
                  {lead.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-semibold text-slate-800">{lead.name}</span>
              </div>

              {lead.phone && (
                <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                  <Phone size={11} className="text-slate-400" />
                  <span>{lead.phone}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
              <User size={11} className="text-slate-400" />
              <span>Assigned: <strong className="text-slate-700 font-medium">{agentName}</strong></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadCard;