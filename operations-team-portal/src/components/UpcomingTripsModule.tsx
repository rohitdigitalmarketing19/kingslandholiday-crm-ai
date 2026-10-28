import React, { useState } from 'react';
import { 
  PlaneTakeoff, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  User, 
  ChevronRight, 
  ChevronDown,
  FileCheck, 
  Car, 
  PhoneCall, 
  Ticket, 
  AlertCircle, 
  Share2 
} from 'lucide-react';
import { Customer, HotelVoucher, TripItinerary } from '../types';

interface UpcomingTripsModuleProps {
  customers: Customer[];
  vouchers: HotelVoucher[];
  itineraries: TripItinerary[];
  searchTerm: string;
  onNavigateToDayWise: (customerId: string) => void;
  onToggleChecklist: (customerId: string, itemKey: keyof TripItinerary['readinessChecklist']) => void;
  onOpenShareCustomer: (customer: Customer) => void;
}

export const UpcomingTripsModule: React.FC<UpcomingTripsModuleProps> = ({
  customers,
  vouchers,
  itineraries,
  searchTerm,
  onNavigateToDayWise,
  onToggleChecklist,
  onOpenShareCustomer,
}) => {
  const [readinessFilter, setReadinessFilter] = useState<string>('all');
  const [expandedTripIds, setExpandedTripIds] = useState<Record<string, boolean>>({});

  const toggleTripExpanded = (id: string) => {
    setExpandedTripIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const upcomingCustomers = customers.filter(
    (c) => c.status === 'Upcoming' || c.status === 'In-Transit'
  );

  const calculateDaysUntil = (startDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tripStart = new Date(startDateStr);
    tripStart.setHours(0, 0, 0, 0);
    const diffTime = tripStart.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filtered = upcomingCustomers
    .filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.destination.toLowerCase().includes(searchTerm.toLowerCase());

      const itin = itineraries.find((i) => i.customerId === c.id);
      const checklist = itin?.readinessChecklist || { airTickets: false, hotelVouchers: false, cabAssigned: false, briefingCompleted: false };
      const isFullyReady = checklist.airTickets && checklist.hotelVouchers && checklist.cabAssigned && checklist.briefingCompleted;

      const matchesReadiness =
        readinessFilter === 'all' ||
        (readinessFilter === 'ready' && isFullyReady) ||
        (readinessFilter === 'pending' && !isFullyReady);

      return matchesSearch && matchesReadiness;
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-brand to-brand text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-white/20 backdrop-blur-xs">
              <PlaneTakeoff className="w-5 h-5" />
            </span>
            <h3 className="font-bold text-lg">Upcoming Trips & Readiness Monitor</h3>
          </div>
          <p className="text-sm text-brand-ink mt-1 max-w-xl">
            Ensure 100% operational readiness before guest departure. Verify flights, hotel vouchers, local cab driver assignments, and briefing calls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-center">
            <span className="text-xs uppercase font-semibold text-brand-ink block">Upcoming Departures</span>
            <span className="text-2xl font-semibold">{upcomingCustomers.length}</span>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="p-4 rounded-xl bg-surface border border-line flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-content">Filter By Readiness:</span>
          <div className="flex items-center gap-1 bg-subtle p-1 rounded-xl">
            <button
              onClick={() => setReadinessFilter('all')}
              className={`px-3 py-1 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                readinessFilter === 'all' ? 'bg-surface text-content shadow-xs' : 'text-secondary hover:text-content'
              }`}
            >
              All Departures
            </button>
            <button
              onClick={() => setReadinessFilter('ready')}
              className={`px-3 py-1 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                readinessFilter === 'ready' ? 'bg-success-strong text-white shadow-xs' : 'text-secondary hover:text-content'
              }`}
            >
              100% Ready
            </button>
            <button
              onClick={() => setReadinessFilter('pending')}
              className={`px-3 py-1 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                readinessFilter === 'pending' ? 'bg-warning-strong text-white shadow-xs' : 'text-secondary hover:text-content'
              }`}
            >
              Action Needed
            </button>
          </div>
        </div>

        <span className="text-sm text-secondary font-medium">
          Showing <b>{filtered.length}</b> upcoming trip departures
        </span>
      </div>

      {/* Upcoming Trips List (Expandable Rows) */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-surface border border-dashed border-line">
          <PlaneTakeoff className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-content text-base">No Upcoming Trips Match Filter</h3>
          <p className="text-sm text-secondary mt-1 max-w-sm mx-auto">
            Check your search filter or add a new customer booking to track pre-flight readiness.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((cust) => {
            const isExpanded = !!expandedTripIds[cust.id];
            const daysLeft = calculateDaysUntil(cust.startDate);
            const itin = itineraries.find((i) => i.customerId === cust.id);
            const custVouchers = vouchers.filter((v) => v.bookingId === cust.bookingId);
            const hasUploadedVoucher = custVouchers.some((v) => v.status === 'Uploaded' || v.status === 'Sent to Customer');
            const isNewTrip = !hasUploadedVoucher;
            const checklist = itin?.readinessChecklist || {
              airTickets: false,
              hotelVouchers: false,
              cabAssigned: false,
              briefingCompleted: false,
            };

            const readyCount = Object.values(checklist).filter(Boolean).length;
            const isFullyReady = readyCount === 4;

            return (
              <div
                key={cust.id}
                className={`bg-surface border rounded-xl transition-all font-sans overflow-hidden ${
                  isExpanded 
                    ? 'border-brand-line shadow-sm ring-1 ring-brand-line' 
                    : 'border-line hover:border-brand-line hover:shadow-xs shadow-2xs'
                }`}
              >
                {/* Compact Row Header (Always visible - Click to toggle full checklist) */}
                <div 
                  onClick={() => toggleTripExpanded(cust.id)}
                  className={`px-4 py-3 cursor-pointer select-none transition-colors flex flex-wrap items-center justify-between gap-3 ${
                    isExpanded ? 'bg-brand-soft/40 border-b border-brand-line' : 'bg-surface hover:bg-canvas/70'
                  }`}
                >
                  {/* Left Side: Chevron, Booking ID, Name, Destination, Dates, Countdown */}
                  <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                    <button
                      type="button"
                      className="p-1 rounded-md text-muted hover:text-secondary hover:bg-hover/60 transition-transform duration-200"
                      title={isExpanded ? "Collapse checklist" : "Expand full checklist"}
                    >
                      {isExpanded ? (
                        <ChevronDown size={16} className="text-brand-ink transform rotate-180 transition-transform duration-200" />
                      ) : (
                        <ChevronRight size={16} className="text-muted group-hover:text-secondary transition-transform duration-200" />
                      )}
                    </button>

                    <span className="text-sm font-mono font-bold text-brand-ink bg-brand-soft px-2 py-0.5 rounded border border-brand-line shrink-0">
                      #{cust.bookingId}
                    </span>

                    {isNewTrip && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-gradient-to-r from-warning-strong to-warning-strong text-white shadow-xs flex items-center gap-1 border border-warning-line shrink-0">
                        <span>✨</span> NEW
                      </span>
                    )}

                    <h3 className="font-bold text-content text-sm truncate max-w-[160px] sm:max-w-[220px]">
                      {cust.name}
                    </h3>
                    <span className="text-sm text-secondary font-medium shrink-0">({cust.paxAdults} PAX)</span>

                    {/* Destination Badge */}
                    <div className="hidden sm:flex items-center gap-1 text-sm text-brand-ink font-medium bg-brand-soft/70 border border-brand-line px-2 py-0.5 rounded shrink-0">
                      <MapPin size={11} className="text-brand-ink" />
                      <span>{cust.destination}</span>
                    </div>

                    {/* Travel Dates */}
                    <div className="hidden md:flex items-center gap-1 text-sm text-secondary shrink-0 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-muted" />
                      <span>{cust.startDate} to {cust.endDate}</span>
                    </div>

                    {/* Countdown Badge */}
                    <div className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold flex items-center gap-1 border shrink-0 ${
                      daysLeft <= 2 ? 'bg-danger-soft text-danger-ink border-danger-line animate-pulse' :
                      daysLeft <= 7 ? 'bg-warning-soft text-warning-ink border-warning-line' :
                      'bg-subtle text-content border-line'
                    }`}>
                      <Clock className="w-3 h-3" />
                      <span>{daysLeft <= 0 ? 'Starts Today' : `${daysLeft} Days Left`}</span>
                    </div>

                    {/* Overall Readiness Badge */}
                    <div className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border shrink-0 ${
                      isFullyReady 
                        ? 'bg-success-soft text-success-ink border-success-line' 
                        : 'bg-subtle text-content border-line'
                    }`}>
                      {readyCount}/4 Checks
                    </div>
                  </div>

                  {/* Right Side: Quick Action Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenShareCustomer(cust);
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-sm font-semibold bg-success-soft text-success-ink border border-success-line hover:bg-success-soft transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Pre-Trip Pack</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToDayWise(cust.id);
                      }}
                      className="px-3.5 py-1.5 rounded-lg text-sm font-bold bg-brand text-white hover:bg-brand transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <span>Day-Wise</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Complete Card Body (Visible when Expanded) */}
                {isExpanded && (
                  <div className="p-5 bg-surface space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Pre-Trip Readiness Interactive Checklist */}
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-wider text-secondary mb-2.5">
                        Pre-Departure Operational Checklist (Click to update):
                      </h4>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        
                        {/* Item 1: Air Tickets */}
                        <button
                          type="button"
                          onClick={() => onToggleChecklist(cust.id, 'airTickets')}
                          className={`p-3 rounded-xl border text-sm text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                            checklist.airTickets
                              ? 'bg-success-soft/60 border-success-line text-success-ink font-semibold'
                              : 'bg-canvas border-line text-secondary hover:bg-subtle'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Ticket className={`w-4 h-4 ${checklist.airTickets ? 'text-success-ink' : 'text-muted'}`} />
                            <span>Air Tickets</span>
                          </div>
                          <CheckCircle2 className={`w-4 h-4 ${checklist.airTickets ? 'text-success-ink' : 'text-slate-300'}`} />
                        </button>

                        {/* Item 2: Hotel Vouchers */}
                        <button
                          type="button"
                          onClick={() => onToggleChecklist(cust.id, 'hotelVouchers')}
                          className={`p-3 rounded-xl border text-sm text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                            checklist.hotelVouchers
                              ? 'bg-success-soft/60 border-success-line text-success-ink font-semibold'
                              : 'bg-warning-soft/60 border-warning-line text-warning-ink font-semibold hover:bg-warning-soft'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <FileCheck className={`w-4 h-4 ${checklist.hotelVouchers ? 'text-success-ink' : 'text-warning-ink'}`} />
                            <span>Hotel Vouchers</span>
                          </div>
                          <CheckCircle2 className={`w-4 h-4 ${checklist.hotelVouchers ? 'text-success-ink' : 'text-warning-ink'}`} />
                        </button>

                        {/* Item 3: Cab / Driver Assigned */}
                        <button
                          type="button"
                          onClick={() => onToggleChecklist(cust.id, 'cabAssigned')}
                          className={`p-3 rounded-xl border text-sm text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                            checklist.cabAssigned
                              ? 'bg-success-soft/60 border-success-line text-success-ink font-semibold'
                              : 'bg-canvas border-line text-secondary hover:bg-subtle'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Car className={`w-4 h-4 ${checklist.cabAssigned ? 'text-success-ink' : 'text-muted'}`} />
                            <span>Driver Assigned</span>
                          </div>
                          <CheckCircle2 className={`w-4 h-4 ${checklist.cabAssigned ? 'text-success-ink' : 'text-slate-300'}`} />
                        </button>

                        {/* Item 4: Pre-Trip Briefing Completed */}
                        <button
                          type="button"
                          onClick={() => onToggleChecklist(cust.id, 'briefingCompleted')}
                          className={`p-3 rounded-xl border text-sm text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                            checklist.briefingCompleted
                              ? 'bg-success-soft/60 border-success-line text-success-ink font-semibold'
                              : 'bg-canvas border-line text-secondary hover:bg-subtle'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <PhoneCall className={`w-4 h-4 ${checklist.briefingCompleted ? 'text-success-ink' : 'text-muted'}`} />
                            <span>Briefing Done</span>
                          </div>
                          <CheckCircle2 className={`w-4 h-4 ${checklist.briefingCompleted ? 'text-success-ink' : 'text-slate-300'}`} />
                        </button>

                      </div>
                    </div>

                    {/* Bottom Bar: Action buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-line">
                      <span className="text-sm text-secondary">
                        Assigned Operations Manager: <strong className="text-content font-semibold">{cust.assignedOpsManager || 'Ops Team'}</strong>
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenShareCustomer(cust)}
                          className="px-3.5 py-2 rounded-lg text-sm font-semibold bg-success-soft text-success-ink border border-success-line hover:bg-success-soft transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Share Pre-Trip Pack</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onNavigateToDayWise(cust.id)}
                          className="px-4 py-2 rounded-lg text-sm font-bold bg-brand text-white hover:bg-brand transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <span>Open Day-Wise Schedule</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
