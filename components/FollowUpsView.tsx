import React, { useState, useMemo } from 'react';
import { Lead, Agent } from '../types';

interface FollowUpsViewProps {
  leads: Lead[];
  agents: Agent[];
  onOpenLead: (lead: Lead) => void;
  onCompleteFollowUp: (leadId: string) => Promise<void>;
  onRescheduleFollowUp?: (lead: Lead) => void;
}

type FollowUpTab = 'overdue' | 'today' | 'tomorrow' | 'upcoming' | 'completed';

export const FollowUpsView: React.FC<FollowUpsViewProps> = ({
  leads,
  agents,
  onOpenLead,
  onCompleteFollowUp,
}) => {
  const [activeTab, setActiveTab] = useState<FollowUpTab>('today');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [completingId, setCompletingId] = useState<string | null>(null);

  const todayStr = useMemo(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }, []);

  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  // ONLY leads that have status === 'Follow-up' OR have a scheduled followUpDate
  const allFollowUpLeads = useMemo(() => {
    return leads.filter((l) => {
      return (l.status === 'Follow-up' || Boolean(l.followUpDate));
    });
  }, [leads]);

  // Categorize leads by date
  const categorized = useMemo(() => {
    const overdue: Lead[] = [];
    const today: Lead[] = [];
    const tomorrow: Lead[] = [];
    const upcoming: Lead[] = [];
    const completed: Lead[] = [];

    allFollowUpLeads.forEach((l) => {
      if (l.followUpCompleted) {
        completed.push(l);
        return;
      }

      const fDate = l.followUpDate || l.createdAt.split('T')[0];
      if (fDate < todayStr) {
        overdue.push(l);
      } else if (fDate === todayStr) {
        today.push(l);
      } else if (fDate === tomorrowStr) {
        tomorrow.push(l);
      } else {
        upcoming.push(l);
      }
    });

    return { overdue, today, tomorrow, upcoming, completed };
  }, [allFollowUpLeads, todayStr, tomorrowStr]);

  // Filter current active list by agent & search
  const currentList = useMemo(() => {
    let list = categorized[activeTab] || [];
    if (selectedAgent !== 'all') {
      list = list.filter((l) => l.assignedTo === selectedAgent);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((l) => 
        l.name.toLowerCase().includes(q) ||
        l.destination.toLowerCase().includes(q) ||
        l.tripId.toLowerCase().includes(q) ||
        (l.followUpNote && l.followUpNote.toLowerCase().includes(q))
      );
    }
    return list;
  }, [categorized, activeTab, selectedAgent, searchQuery]);

  const formatDisplayDate = (dateStr?: string) => {
    if (!dateStr) return 'No Date';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const handleMarkComplete = async (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletingId(leadId);
    try {
      await onCompleteFollowUp(leadId);
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-[0.3em]">
              Kingsland CRM Touchpoints
            </span>
            <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {allFollowUpLeads.filter(l => !l.followUpCompleted).length} Active Scheduled
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl border border-amber-200/80 shadow-sm shadow-amber-500/5">
              ⏰
            </div>
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter">
                Follow-ups
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Every planned customer touch — complete them directly or open lead preview.
              </p>
            </div>
          </div>
        </div>

        {/* Right Controls: Agent Filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white p-1.5 pl-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Agent:</span>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="bg-slate-50 text-slate-800 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-black outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="all">All agents</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tab Buttons & Search Toolbar */}
      <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Tabs Bar */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-2xl overflow-x-auto custom-scrollbar">
          
          {/* Overdue */}
          <button
            onClick={() => setActiveTab('overdue')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'overdue'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span>Overdue</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              categorized.overdue.length > 0 
                ? activeTab === 'overdue' ? 'bg-rose-800 text-white' : 'bg-rose-500 text-white animate-pulse' 
                : 'bg-slate-200 text-slate-600'
            }`}>
              {categorized.overdue.length}
            </span>
          </button>

          {/* Today */}
          <button
            onClick={() => setActiveTab('today')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'today'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span>Today</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'today' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800 font-extrabold'
            }`}>
              {categorized.today.length}
            </span>
          </button>

          {/* Tomorrow */}
          <button
            onClick={() => setActiveTab('tomorrow')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'tomorrow'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span>Tomorrow</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'tomorrow' ? 'bg-indigo-800 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {categorized.tomorrow.length}
            </span>
          </button>

          {/* Upcoming */}
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'upcoming'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span>Upcoming</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'upcoming' ? 'bg-indigo-800 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {categorized.upcoming.length}
            </span>
          </button>

          {/* Completed */}
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'completed'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span>Completed</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'completed' ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {categorized.completed.length}
            </span>
          </button>

        </div>

        {/* Quick Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search follow-ups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-64 bg-slate-50 text-slate-800 border border-slate-200 rounded-2xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-400 outline-none"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Follow-up Items List */}
      <div className="space-y-4">
        {currentList.length === 0 ? (
          <div className="p-16 rounded-2xl bg-white border border-slate-100 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-50 flex items-center justify-center text-3xl">
              {activeTab === 'completed' ? '🎉' : '☕'}
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              No {activeTab} follow-ups
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
              {activeTab === 'completed'
                ? 'Completed customer touchpoints will appear here.'
                : `You're all caught up on ${activeTab} customer follow-ups.`}
            </p>
          </div>
        ) : (
          currentList.map((lead) => {
            const assignedAgent = agents.find((a) => a.id === lead.assignedTo)?.name || 'Alex Thompson';
            const fDate = lead.followUpDate || lead.createdAt.split('T')[0];
            const fTime = lead.followUpTime || '10:30';
            const fType = lead.followUpType || 'Call';
            const fNote = lead.followUpNote || lead.summary || 'Customer touchpoint scheduled from CRM proposal desk.';

            return (
              <div
                key={lead.id}
                onClick={() => onOpenLead(lead)}
                className={`p-6 rounded-[2rem] bg-white border transition-all hover:shadow-xl hover:-translate-y-0.5 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-6 group shadow-sm ${
                  activeTab === 'overdue' 
                    ? 'border-rose-300/80 bg-rose-50/20 hover:border-rose-500' 
                    : 'border-slate-100 hover:border-indigo-400'
                }`}
              >
                {/* Left Column: Date, Time & Touchpoint Type */}
                <div className="flex items-center gap-4 min-w-[190px]">
                  <div className="text-left">
                    <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span>{formatDisplayDate(fDate)}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-amber-600 font-mono font-black">{fTime}</span>
                    </div>
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200/80">
                        <span>{fType === 'Call' ? '📞' : fType === 'WhatsApp' ? '💬' : fType === 'Email' ? '✉️' : '🤝'}</span>
                        <span>{fType}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Center Column: Lead Name, Destination & Action Agenda */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h4 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {lead.name}
                    </h4>
                    <span className="text-slate-300 text-xs">·</span>
                    <span className="text-xs font-bold text-slate-600">
                      {lead.destination}
                    </span>
                    <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200/60">
                      #{lead.tripId}
                    </span>
                  </div>
                  {fNote && (
                    <div className="mt-2 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl line-clamp-2">
                      {fNote}
                    </div>
                  )}
                </div>

                {/* Right Column: Agent Name & Action Buttons */}
                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                      Assigned Agent
                    </p>
                    <p className="text-xs font-black text-slate-800 mt-0.5">
                      {assignedAgent}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!lead.followUpCompleted && (
                      <button
                        onClick={(e) => handleMarkComplete(lead.id, e)}
                        disabled={completingId === lead.id}
                        className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-emerald-200 hover:border-emerald-600 flex items-center gap-1.5 shadow-xs"
                        title="Mark Follow-up Completed"
                      >
                        {completingId === lead.id ? '...' : '✓ Done'}
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenLead(lead);
                      }}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-slate-900/10"
                    >
                      Open Lead →
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};

export default FollowUpsView;
