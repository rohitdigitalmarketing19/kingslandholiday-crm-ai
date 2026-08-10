import React from 'react';
import { Lead } from '../types';

interface LeadCardProps {
  lead: Lead;
  onClick: (lead: Lead) => void;
  onViewProposal?: (lead: Lead) => void;
  onDeleteLead?: (leadId: string) => void;
  agentName?: string;
  showGiveQuote?: boolean; 
  displayIndex?: number;
}

const formatDate = (dateStr: string | undefined) => {
  if (!dateStr) return 'Not specified';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const LeadCard: React.FC<LeadCardProps> = ({ lead, onClick, onViewProposal, onDeleteLead, agentName = "Agent", showGiveQuote = false, displayIndex }) => {
  // Status mapping to match LeadProposalView logic
  const statusMapping: Record<Lead['status'], { label: string; badgeBg: string }> = {
    'New': { label: 'NEW LEAD', badgeBg: 'bg-[#5c6e84]' },
    'Qualified': { label: 'ACTIVE LEAD', badgeBg: 'bg-indigo-500' },
    'Hot': { label: 'HOT LEAD', badgeBg: 'bg-rose-500' },
    'Updated': { label: 'UPDATE LEAD', badgeBg: 'bg-blue-500' },
    'Itinerary Sent': { label: 'IN PROGRESS LEAD', badgeBg: 'bg-amber-500' },
    'Closed Won': { label: 'CONVERTED', badgeBg: 'bg-emerald-500' },
    'Closed Lost': { label: 'CANCEL', badgeBg: 'bg-slate-400' },
    'Postponed': { label: 'POSTPONED', badgeBg: 'bg-purple-500' },
    'Payment Pending': { label: 'PAYMENT PENDING', badgeBg: 'bg-amber-600' },
    'Follow-up': { label: 'FOLLOW-UP', badgeBg: 'bg-amber-500' }
  };

  const currentStatus = statusMapping[lead.status] || { label: lead.status.toUpperCase(), badgeBg: 'bg-slate-500' };

  return (
    <div 
      className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-xl transition-all cursor-default mb-6 overflow-hidden font-sans group animate-in fade-in duration-500"
    >
      {/* Top Header Row: Numeric Indicator, Status, ID, and Action Buttons */}
      <div className="flex items-center px-8 py-5 bg-white border-b border-slate-50 gap-4">
        {/* Dark numeric indicator square/circle */}
        <div className="w-10 h-10 bg-[#0f172a] text-white font-black flex items-center justify-center rounded-xl text-sm shadow-md">
          {displayIndex || lead.tripId.slice(-1)}
        </div>
        
        {/* Status Pill Badge */}
        <span className={`${currentStatus.badgeBg} text-white text-[10px] font-extrabold px-6 py-2.5 rounded-full uppercase tracking-[0.1em] shadow-sm`}>
          {currentStatus.label}
        </span>

        {lead.status === 'Postponed' && lead.postponedDate && (
          <span className="bg-purple-100 text-purple-900 border border-purple-300 text-[10px] font-black px-4 py-2 rounded-full flex items-center gap-1.5 shadow-xs">
            <span>📅</span>
            <span>POSTPONED UNTIL: {formatDate(lead.postponedDate)}</span>
          </span>
        )}

        {(lead.status === 'Follow-up' || lead.followUpDate) && (
          <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-4 py-2 rounded-full flex items-center gap-1.5 shadow-xs animate-pulse">
            <span>⏰</span>
            <span>FOLLOW-UP: {formatDate(lead.followUpDate)} {lead.followUpTime ? `· ${lead.followUpTime}` : ''} ({lead.followUpType || 'Call'})</span>
          </span>
        )}
        
        <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest ml-2">#{lead.tripId}</span>

        <div className="ml-auto flex items-center gap-4">
          {onDeleteLead && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete Lead inquiry #${lead.tripId} (${lead.name})? This lead will be permanently deleted.`)) {
                  onDeleteLead(lead.id);
                }
              }}
              className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-black uppercase transition-colors flex items-center gap-1.5 border border-rose-100"
              title="Delete Lead"
            >
              <span>🗑️</span>
              <span className="hidden sm:inline">DELETE</span>
            </button>
          )}

          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (onViewProposal) onViewProposal(lead);
            }}
            className="flex items-center gap-2 text-slate-400 font-black text-[11px] uppercase tracking-widest hover:text-indigo-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            PREVIEW
          </button>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClick(lead);
            }}
            className="px-10 py-3.5 bg-[#4f46e5] text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.15em] shadow-lg shadow-indigo-100 hover:bg-[#4338ca] transition-all"
          >
            GIVE QUOTE
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="p-10 grid grid-cols-1 md:grid-cols-3 gap-16">
        <div className="space-y-8 border-r border-slate-100 pr-10">
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-[0.25em] mb-3">STARTING DATE</p>
            <p className="text-lg font-black text-slate-800 tracking-tight">{formatDate(lead.travelDate)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-[0.25em] mb-3">DURATION</p>
            <p className="text-lg font-black text-slate-800 tracking-tight">
              {lead.durationDays || '0'} Days & {Math.max(0, (lead.durationDays || 1) - 1)} Nights
            </p>
          </div>
        </div>

        <div className="space-y-8 border-r border-slate-100 pr-10">
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-[0.25em] mb-3">NO. OF TRAVELLERS</p>
            <p className="text-lg font-black text-slate-800 tracking-tight">
              {lead.travelers?.adults || 0} Adults, {lead.travelers?.children || 0} Child
            </p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-[0.25em] mb-3">DESTINATION</p>
            <p className="text-xl font-black text-[#4f46e5] tracking-widest uppercase">{lead.destination}</p>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-[0.25em] mb-3">SOURCE CHANNEL</p>
            <p className="text-lg font-black text-slate-800 tracking-tight">{lead.source}</p>
          </div>

          {lead.status === 'Postponed' ? (
            <div className="flex items-start gap-4 p-5 bg-purple-50 rounded-xl border border-purple-200 shadow-xs">
              <div className="text-purple-600 mt-0.5 text-lg">📅</div>
              <div>
                <p className="text-[9px] text-purple-700 font-black uppercase tracking-widest mb-1">POSTPONED UNTIL</p>
                <p className="text-[14px] font-black text-purple-950">
                  {formatDate(lead.postponedDate)}
                </p>
                {lead.postponedReason && (
                  <p className="text-[11px] font-bold text-purple-800 mt-1">
                    Note: {lead.postponedReason}
                  </p>
                )}
              </div>
            </div>
          ) : (lead.status === 'Follow-up' || lead.followUpDate) ? (
            <div className="flex items-start gap-4 p-5 bg-amber-50 rounded-xl border border-amber-200 shadow-xs">
              <div className="text-amber-600 mt-0.5 text-lg">⏰</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <p className="text-[9px] text-amber-800 font-black uppercase tracking-widest">NEXT FOLLOW-UP</p>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-200/80 text-amber-900">
                    {lead.followUpType || 'Call'}
                  </span>
                </div>
                <p className="text-[14px] font-black text-amber-950">
                  {formatDate(lead.followUpDate)} {lead.followUpTime ? `· ${lead.followUpTime}` : ''}
                </p>
                {lead.followUpNote && (
                  <p className="text-[11px] font-semibold text-amber-900 mt-1 line-clamp-2">
                    {lead.followUpNote}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4 p-5 bg-[#fffbeb] rounded-xl border border-[#fef3c7]">
              <div className="text-[#f59e0b] mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-[9px] text-[#b45309] font-black uppercase tracking-widest mb-1 opacity-60">LAST FOLLOW UP</p>
                <p className="text-[14px] font-black text-[#92400e]">
                  {new Date(lead.lastFollowUp).toLocaleDateString()} at {new Date(lead.lastFollowUp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Contact Bar */}
      <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#4f46e5] text-white font-black text-sm rounded-full flex items-center justify-center shadow-lg uppercase">
              {lead.name.charAt(0)}
            </div>
            <span className="text-xl font-black text-slate-800 tracking-tighter">{lead.name}</span>
          </div>
          
          <div className="flex items-center gap-3 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="text-base font-black text-slate-600 tracking-tight">{lead.phone || '+91 00000 00000'}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-right">
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none mb-1">SALES EXPERT</p>
            <p className="text-[12px] font-black text-slate-800 tracking-tight uppercase">{agentName}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadCard;