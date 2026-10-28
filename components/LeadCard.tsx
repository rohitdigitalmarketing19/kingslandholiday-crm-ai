import React, { useState } from 'react';
import { Trash2, Eye, FileText, Calendar, Clock, Phone, User, ChevronDown, ChevronRight, MapPin, Users as UsersIcon, FolderLock, Link as LinkIcon } from 'lucide-react';
import { Lead } from '../types';

interface LeadCardProps {
  lead: Lead;
  onClick: (lead: Lead) => void;
  onViewProposal?: (lead: Lead) => void;
  onDeleteLead?: (leadId: string) => void;
  onOpenLeadDetails?: (lead: Lead, tab?: 'overview' | 'documents' | 'client_details') => void;
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
  onOpenLeadDetails,
  agentName = "Agent", 
  showGiveQuote = false, 
  displayIndex,
  defaultExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const statusMapping: Record<Lead['status'], { label: string; badgeClass: string }> = {
    'New': { label: 'New Lead', badgeClass: 'bg-subtle text-content border-line dark:text-zinc-300 ' },
    'Qualified': { label: 'Active Lead', badgeClass: 'bg-subtle text-content border-line dark:text-zinc-200 ' },
    'Hot': { label: 'Hot Lead', badgeClass: 'bg-danger-soft text-danger-ink border-danger-line ' },
    'Updated': { label: 'Updated', badgeClass: 'bg-subtle text-content border-line dark:text-zinc-200 ' },
    'Itinerary Sent': { label: 'In Progress', badgeClass: 'bg-warning-soft text-warning-ink border-warning-line ' },
    'Closed Won': { label: 'Converted', badgeClass: 'bg-brand-soft text-brand-ink border-brand-line ' },
    'Closed Lost': { label: 'Cancelled', badgeClass: 'bg-subtle text-secondary border-line ' },
    'Postponed': { label: 'Postponed', badgeClass: 'bg-subtle text-content border-line dark:text-zinc-300 ' },
    'Payment Pending': { label: 'Payment Pending', badgeClass: 'bg-warning-soft text-warning-ink border-warning-line ' },
    'Follow-up': { label: 'Follow-Up', badgeClass: 'bg-warning-soft text-warning-ink border-warning-line ' }
  };

  const currentStatus = statusMapping[lead.status] || { label: lead.status, badgeClass: 'bg-subtle text-content border-line dark:text-zinc-300 ' };

  return (
    <div 
      className={`bg-surface border rounded-xl transition-all font-sans overflow-hidden ${
        isExpanded 
          ? 'border-brand-line/50 shadow-sm ring-1 ring-brand-line/20' 
          : 'border-line hover:border-line hover:shadow-xs shadow-2xs'
      }`}
    >
      {/* Compact Row Header (Always Visible - Click to toggle full card) */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`px-4 py-3 cursor-pointer select-none transition-colors flex flex-wrap items-center justify-between gap-3 ${
          isExpanded ? 'bg-canvas/80 border-b border-line ' : 'bg-surface hover:bg-canvas '
        }`}
      >
        {/* Left Side: Chevron, Badges, Name, Destination, Key Summary */}
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          <button
            type="button"
            className="p-1 rounded-md text-muted hover:text-secondary dark:hover:text-zinc-200 hover:bg-hover/60 transition-transform duration-200"
            title={isExpanded ? "Collapse card" : "Expand full card"}
          >
            {isExpanded ? (
              <ChevronDown size={16} className="text-brand-ink transform rotate-180 transition-transform duration-200" />
            ) : (
              <ChevronRight size={16} className="text-muted group-hover:text-secondary transition-transform duration-200" />
            )}
          </button>

          <span className="w-6 h-6 rounded-md bg-inverse text-white font-semibold text-xs flex items-center justify-center shrink-0">
            {displayIndex || lead.tripId.slice(-1)}
          </span>

          <span className={`text-xs font-bold px-2 py-0.5 rounded-md border shrink-0 ${currentStatus.badgeClass}`}>
            {currentStatus.label}
          </span>

          <span className="text-sm font-mono font-semibold text-secondary bg-subtle px-2 py-0.5 rounded shrink-0">
            #{lead.tripId}
          </span>

          {/* Customer Avatar & Name */}
          <div 
            onClick={(e) => {
              if (onOpenLeadDetails) {
                e.stopPropagation();
                onOpenLeadDetails(lead, 'overview');
              }
            }}
            className={`flex items-center gap-1.5 min-w-0 pr-1 ${onOpenLeadDetails ? 'hover:underline cursor-pointer' : ''}`}
            title={onOpenLeadDetails ? 'Click to open full lead details' : undefined}
          >
            <div className="w-5 h-5 rounded-full bg-brand/10 text-brand-ink font-bold text-xs flex items-center justify-center shrink-0 border border-brand-line/20">
              {lead.name.charAt(0).toUpperCase()}
            </div>
            <span className="font-semibold text-content dark:text-zinc-100 text-sm truncate max-w-[150px] sm:max-w-[200px]">
              {lead.name}
            </span>
          </div>

          {/* Quick Destination Badge */}
          {lead.destination && (
            <div className="hidden sm:flex items-center gap-1 text-sm text-content dark:text-zinc-300 font-semibold bg-subtle border border-line px-2 py-0.5 rounded shrink-0">
              <MapPin size={11} className="text-brand-ink" />
              <span>{lead.destination}</span>
            </div>
          )}

          {/* Quick Date & Travelers preview in row */}
          {!isExpanded && (
            <div className="hidden md:flex items-center gap-3 text-xs text-secondary shrink-0">
              <span>📅 {formatDate(lead.travelDate)}</span>
              <span>·</span>
              <span>{lead.durationDays || 0}D/{Math.max(0, (lead.durationDays || 1) - 1)}N</span>
              <span>·</span>
              <span>{lead.travelers?.adults || 0} Adults</span>
            </div>
          )}

          {/* Follow-up / Postponed indicators */}
          {lead.status === 'Postponed' && lead.postponedDate && (
            <span className="bg-brand-soft text-brand-ink border border-brand-line text-xs font-medium px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
              <Calendar size={11} />
              <span>{formatDate(lead.postponedDate)}</span>
            </span>
          )}

          {(lead.status === 'Follow-up' || lead.followUpDate) && (
            <span className="bg-warning-soft text-warning-ink border border-warning-line text-xs font-medium px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
              <Clock size={11} />
              <span>{formatDate(lead.followUpDate)}</span>
            </span>
          )}

          {/* Client Documents indicator for converted leads */}
          {(lead.status === 'Closed Won' || (lead as any).status === 'Converted') && (
            <span 
              className={`text-xs font-semibold px-2 py-0.5 rounded flex items-center gap-1 shrink-0 border ${
                (lead.documentsCount ?? 0) > 0
                  ? 'bg-brand-soft text-brand-ink border-brand-line '
                  : 'bg-subtle text-secondary border-line '
              }`}
              title={`${lead.documentsCount ?? 0} client documents uploaded`}
            >
              <FileText size={11} className={lead.documentsCount ? 'text-brand-ink ' : 'text-muted'} />
              <span>Docs ({lead.documentsCount ?? 0})</span>
            </span>
          )}
        </div>

        {/* Right Side: Agent info & Quick Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden lg:flex items-center gap-1 text-xs text-secondary mr-1">
            <User size={11} className="text-muted" />
            <span>{agentName}</span>
          </div>

          {onDeleteLead && (
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteLead(lead.id);
              }}
              className="px-2.5 py-1.5 bg-surface hover:bg-danger-soft text-secondary hover:text-danger-ink rounded-lg text-sm font-medium transition-colors flex items-center gap-1 border border-line hover:border-danger-line cursor-pointer"
              title="Delete Lead"
            >
              <Trash2 size={13} />
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}

          {/* Direct Actions for Converted Leads */}
          {(lead.status === 'Closed Won' || (lead as any).status === 'Converted') && onOpenLeadDetails && (
            <>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenLeadDetails(lead, 'documents');
                }}
                className="px-2.5 py-1.5 bg-brand-soft hover:bg-brand-soft text-brand-ink border border-brand-line rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="View & upload client documents (Passports, Visas, KYC)"
              >
                <FolderLock size={13} className="text-brand-ink " />
                <span>Docs</span>
              </button>

              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenLeadDetails(lead, 'client_details');
                }}
                className="px-2.5 py-1.5 bg-info-soft hover:bg-info-soft text-info-ink border border-info-line rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Generate and share public client details intake link"
              >
                <LinkIcon size={13} className="text-info-ink " />
                <span>Client Link</span>
              </button>
            </>
          )}

          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onViewProposal) onViewProposal(lead);
            }}
            className="px-2.5 py-1.5 bg-surface hover:bg-subtle text-content rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 border border-line cursor-pointer"
          >
            <Eye size={13} className="text-secondary" />
            <span>Preview</span>
          </button>
          
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClick(lead);
            }}
            className="px-3.5 py-1.5 bg-brand hover:bg-brand text-white rounded-lg text-sm font-medium transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
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
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm bg-surface">
            {/* Col 1: Travel Specs */}
            <div className="space-y-2 border-r-0 sm:border-r border-line sm:pr-4">
              <div>
                <span className="text-xs text-muted font-medium uppercase tracking-wide block">Starting Date</span>
                <span className="font-semibold text-content text-sm">{formatDate(lead.travelDate)}</span>
              </div>
              <div>
                <span className="text-xs text-muted font-medium uppercase tracking-wide block">Duration</span>
                <span className="font-medium text-content text-sm">
                  {lead.durationDays || 0} Days / {Math.max(0, (lead.durationDays || 1) - 1)} Nights
                </span>
              </div>
            </div>

            {/* Col 2: Destination & Travelers */}
            <div className="space-y-2 border-r-0 sm:border-r border-line sm:pr-4">
              <div>
                <span className="text-xs text-muted font-medium uppercase tracking-wide block">Destination</span>
                <span className="font-semibold text-brand-ink text-sm">{lead.destination || 'Unassigned'}</span>
              </div>
              <div>
                <span className="text-xs text-muted font-medium uppercase tracking-wide block">Travelers</span>
                <span className="font-medium text-content text-sm">
                  {lead.travelers?.adults || 0} Adults{lead.travelers?.children ? `, ${lead.travelers.children} Child` : ''}
                </span>
              </div>
            </div>

            {/* Col 3: Channel & Follow-up status */}
            <div className="space-y-2">
              <div>
                <span className="text-xs text-muted font-medium uppercase tracking-wide block">Source Channel</span>
                <span className="font-medium text-content text-sm">{lead.source || 'Direct'}</span>
              </div>

              {lead.status === 'Postponed' && lead.postponedReason ? (
                <div className="p-2 rounded bg-brand-soft border border-brand-line text-xs text-brand-ink">
                  <span className="font-medium">Reason: </span>{lead.postponedReason}
                </div>
              ) : (lead.status === 'Follow-up' || lead.followUpDate) && lead.followUpNote ? (
                <div className="p-2 rounded bg-warning-soft border border-warning-line text-xs text-warning-ink line-clamp-2">
                  <span className="font-medium">Note: </span>{lead.followUpNote}
                </div>
              ) : (
                <div>
                  <span className="text-xs text-muted font-medium uppercase tracking-wide block">Last Activity</span>
                  <span className="text-xs text-secondary">
                    {new Date(lead.lastFollowUp || lead.createdAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Contact Bar */}
          <div className="px-5 py-2.5 bg-canvas/70 border-t border-line flex flex-wrap items-center justify-between text-sm gap-2">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-brand-soft text-brand-ink font-semibold text-xs flex items-center justify-center">
                  {lead.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-semibold text-content">{lead.name}</span>
              </div>

              {lead.phone && (
                <div className="flex items-center gap-1.5 text-secondary font-mono text-xs">
                  <Phone size={11} className="text-muted" />
                  <span>{lead.phone}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-secondary text-xs">
              <User size={11} className="text-muted" />
              <span>Assigned: <strong className="text-content font-medium">{agentName}</strong></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadCard;