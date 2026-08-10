import React, { useState } from 'react';
import { 
  PlaneTakeoff, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  User, 
  ChevronRight, 
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
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-white/20 backdrop-blur-xs">
              <PlaneTakeoff className="w-5 h-5" />
            </span>
            <h3 className="font-bold text-lg">Upcoming Trips & Readiness Monitor</h3>
          </div>
          <p className="text-xs text-blue-100 mt-1 max-w-xl">
            Ensure 100% operational readiness before guest departure. Verify flights, hotel vouchers, local cab driver assignments, and briefing calls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-center">
            <span className="text-[10px] uppercase font-semibold text-blue-200 block">Upcoming Departures</span>
            <span className="text-2xl font-black">{upcomingCustomers.length}</span>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs">
          <span className="font-semibold text-slate-700">Readiness Status:</span>
          
          <button
            onClick={() => setReadinessFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              readinessFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100  text-slate-600  hover:bg-slate-200'
            }`}
          >
            All Upcoming
          </button>

          <button
            onClick={() => setReadinessFilter('pending')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              readinessFilter === 'pending'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100  text-slate-600  hover:bg-slate-200'
            }`}
          >
            Pending Actions
          </button>

          <button
            onClick={() => setReadinessFilter('ready')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              readinessFilter === 'ready'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100  text-slate-600  hover:bg-slate-200'
            }`}
          >
            100% Departure Ready
          </button>
        </div>

        <span className="text-xs text-slate-500">
          Showing <span className="font-bold text-slate-800">{filtered.length}</span> upcoming journeys
        </span>
      </div>

      {/* Upcoming Trips List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-dashed border-slate-300">
          <PlaneTakeoff className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">No Upcoming Trips Match Filter</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Check your search filter or add a new customer booking to track pre-flight readiness.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((cust) => {
            const daysLeft = calculateDaysUntil(cust.startDate);
            const itin = itineraries.find((i) => i.customerId === cust.id);
            const custVouchers = vouchers.filter((v) => v.bookingId === cust.bookingId);
            const hasUploadedVoucher = custVouchers.some((v) => v.status === 'Uploaded' || v.status === 'Sent to Customer');
            const isNewTrip = !hasUploadedVoucher;
            const checklist = itin?.readinessChecklist || {
              airTickets: true,
              hotelVouchers: false,
              cabAssigned: true,
              briefingCompleted: false,
            };

            const readyCount = Object.values(checklist).filter(Boolean).length;
            const isFullyReady = readyCount === 4;

            return (
              <div
                key={cust.id}
                className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 transition-all shadow-2xs space-y-4"
              >
                {/* Header: Customer Name, Destination, Countdown Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 /50 px-2 py-0.5 rounded border border-blue-200">
                        {cust.bookingId}
                      </span>
                      {isNewTrip && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs animate-pulse flex items-center gap-1 border border-amber-300">
                          <span>✨</span> NEW TRIP
                        </span>
                      )}
                      <h3 className="font-bold text-slate-900 text-base">
                        {cust.name}
                      </h3>
                      <span className="text-xs text-slate-500 font-medium">({cust.paxAdults} PAX)</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-600 mt-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span>{cust.destination}</span>
                      <span className="text-slate-300">•</span>
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{cust.startDate} to {cust.endDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Countdown Badge */}
                    <div className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border ${
                      daysLeft <= 2 ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' :
                      daysLeft <= 7 ? 'bg-amber-50 text-amber-800 border-amber-200' :
                      'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{daysLeft <= 0 ? 'Starts Today / In-Transit' : `Starts in ${daysLeft} Days`}</span>
                    </div>

                    {/* Overall Readiness Badge */}
                    <div className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                      isFullyReady 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {readyCount}/4 Operational Checks
                    </div>
                  </div>
                </div>

                {/* Pre-Trip Readiness Interactive Checklist */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                    Pre-Departure Operational Checklist:
                  </h4>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    
                    {/* Item 1: Air Tickets */}
                    <button
                      onClick={() => onToggleChecklist(cust.id, 'airTickets')}
                      className={`p-3 rounded-xl border text-xs text-left transition-all flex items-center justify-between gap-2 ${
                        checklist.airTickets
                          ? 'bg-emerald-50/60 /20 border-emerald-200 text-emerald-900  font-semibold'
                          : 'bg-slate-50  border-slate-200  text-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Ticket className={`w-4 h-4 ${checklist.airTickets ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span>Air Tickets</span>
                      </div>
                      <CheckCircle2 className={`w-4 h-4 ${checklist.airTickets ? 'text-emerald-600' : 'text-slate-300'}`} />
                    </button>

                    {/* Item 2: Hotel Vouchers */}
                    <button
                      onClick={() => onToggleChecklist(cust.id, 'hotelVouchers')}
                      className={`p-3 rounded-xl border text-xs text-left transition-all flex items-center justify-between gap-2 ${
                        checklist.hotelVouchers
                          ? 'bg-emerald-50/60 /20 border-emerald-200 text-emerald-900  font-semibold'
                          : 'bg-amber-50/60 /20 border-amber-300 text-amber-900  font-semibold'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FileCheck className={`w-4 h-4 ${checklist.hotelVouchers ? 'text-emerald-600' : 'text-amber-600'}`} />
                        <span>Hotel Vouchers</span>
                      </div>
                      <CheckCircle2 className={`w-4 h-4 ${checklist.hotelVouchers ? 'text-emerald-600' : 'text-amber-400'}`} />
                    </button>

                    {/* Item 3: Cab / Driver Assigned */}
                    <button
                      onClick={() => onToggleChecklist(cust.id, 'cabAssigned')}
                      className={`p-3 rounded-xl border text-xs text-left transition-all flex items-center justify-between gap-2 ${
                        checklist.cabAssigned
                          ? 'bg-emerald-50/60 /20 border-emerald-200 text-emerald-900  font-semibold'
                          : 'bg-slate-50  border-slate-200  text-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Car className={`w-4 h-4 ${checklist.cabAssigned ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span>Driver Assigned</span>
                      </div>
                      <CheckCircle2 className={`w-4 h-4 ${checklist.cabAssigned ? 'text-emerald-600' : 'text-slate-300'}`} />
                    </button>

                    {/* Item 4: Pre-Trip Briefing Completed */}
                    <button
                      onClick={() => onToggleChecklist(cust.id, 'briefingCompleted')}
                      className={`p-3 rounded-xl border text-xs text-left transition-all flex items-center justify-between gap-2 ${
                        checklist.briefingCompleted
                          ? 'bg-emerald-50/60 /20 border-emerald-200 text-emerald-900  font-semibold'
                          : 'bg-slate-50  border-slate-200  text-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <PhoneCall className={`w-4 h-4 ${checklist.briefingCompleted ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <span>Briefing Done</span>
                      </div>
                      <CheckCircle2 className={`w-4 h-4 ${checklist.briefingCompleted ? 'text-emerald-600' : 'text-slate-300'}`} />
                    </button>

                  </div>
                </div>

                {/* Bottom Bar: Action buttons */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <span className="text-xs text-slate-500">
                    Assigned Ops: <strong className="text-slate-800">{cust.assignedOpsManager}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenShareCustomer(cust)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share Pre-Trip Pack</span>
                    </button>

                    <button
                      onClick={() => onNavigateToDayWise(cust.id)}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-1 shadow-xs"
                    >
                      <span>Open Day-Wise Schedule</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
