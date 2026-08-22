import React, { useState, useMemo } from 'react';
import { Lead, Agent } from '../types';
import { 
  Clock, 
  Search, 
  Calendar, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Eye, 
  ChevronRight,
  Filter,
  Check
} from 'lucide-react';

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

  // Leads that have status === 'Follow-up' OR have a scheduled followUpDate
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
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <h2 className="text-xl font-semibold text-slate-800">
              Follow-ups & Reminders
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage scheduled customer call logs, touchpoint reminders, and completed follow-up notes.
          </p>
        </div>

        {/* Agent Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Assigned Agent:</span>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="bg-white text-slate-800 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium outline-none focus:border-indigo-400 cursor-pointer shadow-2xs"
          >
            <option value="all">All Agents</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs & Search Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Tabs Bar */}
        <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-lg overflow-x-auto custom-scrollbar">
          
          {/* Overdue */}
          <button
            onClick={() => setActiveTab('overdue')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer ${
              activeTab === 'overdue'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span>Overdue</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
              categorized.overdue.length > 0 
                ? activeTab === 'overdue' ? 'bg-rose-800 text-white' : 'bg-rose-100 text-rose-700' 
                : 'bg-slate-200 text-slate-600'
            }`}>
              {categorized.overdue.length}
            </span>
          </button>

          {/* Today */}
          <button
            onClick={() => setActiveTab('today')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer ${
              activeTab === 'today'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span>Today</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
              activeTab === 'today' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-800'
            }`}>
              {categorized.today.length}
            </span>
          </button>

          {/* Tomorrow */}
          <button
            onClick={() => setActiveTab('tomorrow')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer ${
              activeTab === 'tomorrow'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span>Tomorrow</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
              activeTab === 'tomorrow' ? 'bg-indigo-800 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {categorized.tomorrow.length}
            </span>
          </button>

          {/* Upcoming */}
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer ${
              activeTab === 'upcoming'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span>Upcoming</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
              activeTab === 'upcoming' ? 'bg-indigo-800 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {categorized.upcoming.length}
            </span>
          </button>

          {/* Completed */}
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span>Completed</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
              activeTab === 'completed' ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {categorized.completed.length}
            </span>
          </button>

        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search follow-ups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-indigo-400 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Follow-up Leads List */}
      <div className="space-y-3">
        {currentList.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-xl border border-dashed border-slate-200 p-8 space-y-2">
            <div className="w-10 h-10 mx-auto rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
              <CheckCircle2 size={20} />
            </div>
            <h4 className="text-sm font-semibold text-slate-800">No Scheduled Follow-ups</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-medium">
              There are no {activeTab} follow-up calls or reminders matching your filters.
            </p>
          </div>
        ) : (
          currentList.map((lead) => {
            const agent = agents.find((a) => a.id === lead.assignedTo);
            const isCompleted = lead.followUpCompleted;
            const isCompleting = completingId === lead.id;

            return (
              <div
                key={lead.id}
                onClick={() => onOpenLead(lead)}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
              >
                {/* Left Info */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
                    {lead.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 text-xs">{lead.name}</span>
                      <span className="font-mono text-[10px] text-slate-400">#{lead.tripId}</span>
                      
                      <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                        {lead.destination}
                      </span>

                      <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                        {lead.followUpType || 'Call'}
                      </span>
                    </div>

                    {lead.followUpNote && (
                      <p className="text-xs text-slate-600 line-clamp-1 italic">
                        "{lead.followUpNote}"
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      {lead.phone && (
                        <span className="flex items-center gap-1 font-mono text-slate-600">
                          <Phone size={10} />
                          <span>{lead.phone}</span>
                        </span>
                      )}

                      {agent && (
                        <span className="flex items-center gap-1">
                          <User size={10} />
                          <span>{agent.name}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action & Schedule Details */}
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs font-semibold text-slate-800">
                      <Calendar size={12} className="text-slate-400" />
                      <span>{formatDisplayDate(lead.followUpDate)}</span>
                      {lead.followUpTime && <span className="text-slate-400 font-normal">· {lead.followUpTime}</span>}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {lead.status === 'Postponed' ? 'Postponed' : 'Scheduled Touch'}
                    </span>
                  </div>

                  {!isCompleted ? (
                    <button
                      type="button"
                      disabled={isCompleting}
                      onClick={(e) => handleMarkComplete(lead.id, e)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      title="Mark as Completed"
                    >
                      <Check size={13} />
                      <span>{isCompleting ? 'Saving...' : 'Done'}</span>
                    </button>
                  ) : (
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-xs font-medium flex items-center gap-1">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      <span>Completed</span>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenLead(lead);
                    }}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                    title="Open Lead"
                  >
                    <ChevronRight size={16} />
                  </button>
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
