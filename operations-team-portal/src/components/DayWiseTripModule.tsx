import React, { useState } from 'react';
import { 
  Calendar, 
  MapPin, 
  Car, 
  UserCheck, 
  CheckCircle2, 
  Clock, 
  Building2, 
  Share2, 
  Printer, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Navigation,
  Phone,
  FileText,
  ShieldCheck,
  Plus,
  Send,
  User,
  Compass,
  CreditCard,
  MessageSquare,
  Edit3
} from 'lucide-react';
import { Customer, HotelVoucher, TripItinerary, DayWiseSchedule } from '../types';

interface DayWiseTripModuleProps {
  customers: Customer[];
  vouchers: HotelVoucher[];
  itineraries: TripItinerary[];
  selectedCustomerId: string;
  setSelectedCustomerId: (id: string) => void;
  onUpdateItinerary?: (updated: TripItinerary) => void;
  onOpenShareModal?: (shareText: string) => void;
  onUpdateCustomer?: (updated: Customer) => void;
}

// Helper to format date string to human-readable date e.g. 15th Sept 2026
function formatDayDate(baseDateStr: string, dayOffset: number): string {
  try {
    if (!baseDateStr) return `Day ${dayOffset + 1}`;
    const dateObj = new Date(baseDateStr);
    if (isNaN(dateObj.getTime())) return baseDateStr;
    dateObj.setDate(dateObj.getDate() + dayOffset);
    
    const dayNum = dateObj.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    const month = months[dateObj.getMonth()];
    const year = dateObj.getFullYear();

    const suffix = (dayNum === 1 || dayNum === 21 || dayNum === 31) ? 'st' :
                   (dayNum === 2 || dayNum === 22) ? 'nd' :
                   (dayNum === 3 || dayNum === 23) ? 'rd' : 'th';

    return `${dayNum}${suffix} ${month} ${year}`;
  } catch (e) {
    return baseDateStr;
  }
}

export const DayWiseTripModule: React.FC<DayWiseTripModuleProps> = ({
  customers,
  vouchers,
  itineraries,
  selectedCustomerId,
  setSelectedCustomerId,
  onUpdateItinerary,
  onOpenShareModal,
  onUpdateCustomer,
}) => {
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('active'); // Default: Active In-Transit & Upcoming trips
  const [searchQuery, setSearchQuery] = useState<string>('');

  const eligibleCustomers = React.useMemo(() => {
    return customers.filter(c => {
      // Status filter
      if (filterStatus === 'active' && c.status !== 'In-Transit' && c.status !== 'Upcoming') return false;
      if (filterStatus !== 'active' && filterStatus !== 'all' && c.status !== filterStatus) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = c.name.toLowerCase().includes(q) || c.bookingId.toLowerCase().includes(q) || c.destination.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Date range filter based on trip start date & departure/end date
      if (filterStartDate && c.startDate && c.startDate < filterStartDate) return false;
      if (filterEndDate && c.endDate && c.endDate > filterEndDate) return false;

      return true;
    }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [customers, filterStatus, searchQuery, filterStartDate, filterEndDate]);

  const activeCustomer = eligibleCustomers.find((c) => c.id === selectedCustomerId) || eligibleCustomers[0] || customers[0];
  const activeItinerary = itineraries.find(
    (i) => i.customerId === activeCustomer?.id || i.bookingId === activeCustomer?.bookingId
  );
  const activeCustomerVouchers = vouchers.filter(
    (v) => v.customerId === activeCustomer?.id || v.bookingId === activeCustomer?.bookingId
  );

  let computedHotelTotalCost = 0;
  if (activeCustomerVouchers && activeCustomerVouchers.length > 0) {
    computedHotelTotalCost = activeCustomerVouchers.reduce((acc, v) => acc + (v.totalCost || 0), 0);
  } else if (Array.isArray(activeCustomer?.hotelPayments) && (activeCustomer?.hotelPayments as any[]).length > 0) {
    computedHotelTotalCost = (activeCustomer?.hotelPayments as any[]).reduce((acc, hp) => acc + (hp.totalCost || 0), 0);
  } else {
    computedHotelTotalCost = activeCustomer?.hotelTotalCost || 0;
  }

  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({});

  // Day Driver & Remark Edit Modal State
  const [editingDayNum, setEditingDayNum] = useState<number | null>(null);
  const [dayDriverForm, setDayDriverForm] = useState({
    driverName: '',
    driverPhone: '',
    cabModel: '',
    cabNumber: '',
    dayRemark: ''
  });

  const toggleDayAccordion = (dayNum: number) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dayNum]: !prev[dayNum],
    }));
  };

  if (!activeCustomer) {
    return (
      <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl shadow-sm space-y-3">
        <Compass className="w-12 h-12 text-slate-300 mx-auto animate-spin-slow" />
        <h3 className="text-lg font-extrabold text-slate-800">No Active Converted Trips Found</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Convert leads in your CRM desk to automatically see their day-wise travel dates & route itinerary here.
        </p>
      </div>
    );
  }

  const totalDaysCount = activeCustomer.startDate && activeCustomer.endDate
    ? Math.max(1, Math.ceil((new Date(activeCustomer.endDate).getTime() - new Date(activeCustomer.startDate).getTime()) / (1000 * 3600 * 24)))
    : 5;

  const displayDays: DayWiseSchedule[] = (activeItinerary && activeItinerary.days && activeItinerary.days.length > 0)
    ? activeItinerary.days
    : Array.from({ length: totalDaysCount }, (_, idx) => ({
        dayNumber: idx + 1,
        date: formatDayDate(activeCustomer.startDate, idx),
        title: idx === 0 
          ? `Arrival in ${activeCustomer.destination} & Check-in` 
          : idx === totalDaysCount - 1 
          ? `Departure from ${activeCustomer.destination} & Return` 
          : `Full Day ${activeCustomer.destination} Sightseeing & Local Route Tour`,
        dayRemark: idx === 0 ? 'Hotel Check-in at 02:00 PM' : idx === totalDaysCount - 1 ? 'Hotel Check-out & Airport Drop' : '',
        activities: [
          {
            id: `act-${activeCustomer.id}-${idx + 1}-1`,
            timeSlot: '09:00 AM - 01:00 PM',
            title: idx === 0 ? `Airport / Station Pickup & Hotel Transfer` : `Morning ${activeCustomer.destination} Sightseeing`,
            description: `Private cab pick-up from designated point. Guided tour and scenic drive.`,
            location: activeCustomer.destination,
            driverName: idx % 2 === 0 ? (activeCustomer.driverName || 'Rajesh Sharma') : 'Suresh Kumar',
            driverPhone: idx % 2 === 0 ? (activeCustomer.driverPhone || '+91 98290 12345') : '+91 98765 43210',
            cabModel: idx % 2 === 0 ? (activeCustomer.cabModel || 'Toyota Innova Crysta') : 'Swift Dzire AC',
            cabNumber: idx % 2 === 0 ? (activeCustomer.cabNumber || 'RJ 14 CZ 9876') : 'RJ 14 TA 5544',
            status: 'Pending'
          },
          {
            id: `act-${activeCustomer.id}-${idx + 1}-2`,
            timeSlot: '02:00 PM - 06:00 PM',
            title: `Afternoon Local Exploration & Market Tour`,
            description: `Visit local heritage landmarks, markets, and cultural spots.`,
            location: activeCustomer.destination,
            status: 'Pending'
          }
        ]
      }));

  const handleOpenEditDayDriver = (dayNum: number, currentRemark?: string, currentDriver?: string, currentPhone?: string, currentCab?: string, currentReg?: string) => {
    setEditingDayNum(dayNum);
    setDayDriverForm({
      driverName: currentDriver || activeCustomer.driverName || 'Rajesh Sharma',
      driverPhone: currentPhone || activeCustomer.driverPhone || '+91 98290 12345',
      cabModel: currentCab || activeCustomer.cabModel || 'Toyota Innova Crysta',
      cabNumber: currentReg || activeCustomer.cabNumber || 'RJ 14 CZ 9876',
      dayRemark: currentRemark || ''
    });
  };

  const handleSaveDayDriver = () => {
    if (!editingDayNum) return;

    const baseItin: TripItinerary = activeItinerary || {
      id: `itin-${activeCustomer.id}`,
      bookingId: activeCustomer.bookingId,
      customerId: activeCustomer.id,
      customerName: activeCustomer.name,
      destination: activeCustomer.destination,
      startDate: activeCustomer.startDate,
      endDate: activeCustomer.endDate,
      days: displayDays,
      readinessChecklist: {
        airTickets: true,
        hotelVouchers: false,
        cabAssigned: false,
        briefingCompleted: false,
      }
    };

    const updatedDays = displayDays.map((d) => {
      if (d.dayNumber === editingDayNum) {
        return {
          ...d,
          dayRemark: dayDriverForm.dayRemark,
          activities: (d.activities && d.activities.length > 0)
            ? d.activities.map((act, i) => i === 0 ? {
                ...act,
                driverName: dayDriverForm.driverName,
                driverPhone: dayDriverForm.driverPhone,
                cabModel: dayDriverForm.cabModel,
                cabNumber: dayDriverForm.cabNumber
              } : act)
            : [
                {
                  id: `act-${activeCustomer.id}-${editingDayNum}-1`,
                  timeSlot: '09:00 AM - 01:00 PM',
                  title: `Day ${editingDayNum} Sightseeing & Local Tour`,
                  description: `Private cab pick-up and scenic tour.`,
                  location: activeCustomer.destination,
                  driverName: dayDriverForm.driverName,
                  driverPhone: dayDriverForm.driverPhone,
                  cabModel: dayDriverForm.cabModel,
                  cabNumber: dayDriverForm.cabNumber,
                  status: 'Pending' as const
                }
              ]
        };
      }
      return d;
    });

    const updatedItin: TripItinerary = {
      ...baseItin,
      days: updatedDays
    };

    if (onUpdateItinerary) {
      onUpdateItinerary(updatedItin);
    }

    setEditingDayNum(null);
  };

  const handleShareDayWise = () => {
    if (!onOpenShareModal) return;
    let text = `✈️ *DAY-WISE TRAVEL SCHEDULE & ROUTE*\n\n`;
    text += `👤 *Guest:* ${activeCustomer.name}\n`;
    text += `🆔 *Booking Ref:* ${activeCustomer.bookingId}\n`;
    text += `📍 *Destination:* ${activeCustomer.destination}\n`;
    text += `📅 *Travel Dates:* ${formatDayDate(activeCustomer.startDate, 0)} to ${formatDayDate(activeCustomer.startDate, displayDays.length - 1)}\n\n`;
    text += `------------------------------------\n`;

    displayDays.forEach((day, i) => {
      const dayDateFormatted = formatDayDate(activeCustomer.startDate, i);
      text += `📅 *${dayDateFormatted}* — *Day ${day.dayNumber}: ${day.title}*\n`;
      day.activities.forEach((act) => {
        text += `   • [${act.timeSlot}] ${act.title}`;
        if (act.driverName) text += ` (Driver: ${act.driverName} - ${act.driverPhone})`;
        text += `\n`;
      });
      text += `\n`;
    });

    onOpenShareModal(text);
  };

  return (
    <div className="space-y-6">
      
      {/* TOP HEADER BAR: TRIP SELECTOR */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
              <Compass className="w-4 h-4 text-teal-400" />
              <span>Operations Day-Wise Itinerary Desk</span>
            </div>
            <h2 className="text-2xl font-black text-white mt-1">Day-Wise Trip Schedule</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              View daily travel dates, itinerary titles, hotel payments, operational remarks & multiple cab driver assignments.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleShareDayWise}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Itinerary</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs shadow-md flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print Day Schedule</span>
            </button>
          </div>
        </div>

        {/* TRIP FILTERS TOOLBAR */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[11px] font-extrabold text-teal-400 uppercase tracking-widest">
                📅 Filter Trip Dates:
              </span>

              {/* Start Date (From) */}
              <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                <span className="text-[10px] text-slate-400 font-bold uppercase">From:</span>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                  title="Filter by Trip Start Date"
                />
              </div>

              {/* Departure / End Date (To) */}
              <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                <span className="text-[10px] text-slate-400 font-bold uppercase">To Departure:</span>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
                  title="Filter by Trip Departure Date"
                />
              </div>

              {/* Status Select */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-bold text-teal-300 focus:outline-none cursor-pointer"
              >
                <option value="active">Active (In-Transit & Upcoming)</option>
                <option value="In-Transit">In-Transit Only</option>
                <option value="Upcoming">Upcoming Only</option>
                <option value="Completed">Completed Trips</option>
                <option value="all">All Trips</option>
              </select>

              {/* Search input */}
              <input
                type="text"
                placeholder="Search trip / name / id..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 text-xs font-bold text-white placeholder-slate-500 focus:outline-none"
              />

              {(filterStartDate || filterEndDate || filterStatus !== 'active' || searchQuery) && (
                <button
                  onClick={() => {
                    setFilterStartDate('');
                    setFilterEndDate('');
                    setFilterStatus('active');
                    setSearchQuery('');
                  }}
                  className="px-2.5 py-1.5 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 rounded-xl text-[10px] font-extrabold uppercase transition-all"
                >
                  Reset Filters
                </button>
              )}
            </div>

            <div className="text-[11px] font-bold text-slate-400">
              Showing <span className="text-teal-300 font-black">{eligibleCustomers.length}</span> of {customers.length} trips
            </div>
          </div>

          {/* TRIP SELECTOR CARDS */}
          {eligibleCustomers.length === 0 ? (
            <div className="p-6 text-center bg-slate-800/60 rounded-2xl border border-slate-700 text-slate-400 text-xs font-medium">
              No trip leads found matching the selected start/departure dates or status filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {eligibleCustomers.map((cust) => {
                const isSelected = cust.id === activeCustomer?.id;
                const formattedStart = formatDayDate(cust.startDate, 0);
                const formattedEnd = cust.endDate ? formatDayDate(cust.endDate, 0) : '';
                return (
                  <button
                    key={cust.id}
                    onClick={() => setSelectedCustomerId(cust.id)}
                    className={`p-3.5 rounded-2xl text-left border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-gradient-to-r from-teal-900/90 to-slate-900 border-teal-400 ring-2 ring-teal-500/30 text-white shadow-lg'
                        : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm truncate text-white">{cust.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-teal-300 font-bold shrink-0">
                          {cust.bookingId}
                        </span>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${cust.status === 'In-Transit' ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : cust.status === 'Completed' ? 'bg-emerald-400/20 text-emerald-300' : 'bg-blue-400/20 text-blue-300'}`}>
                          {cust.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 font-medium">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-teal-400" />
                          {cust.destination}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-amber-400" />
                          {formattedStart} {formattedEnd ? `→ ${formattedEnd}` : ''}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="p-1.5 rounded-full bg-teal-500 text-slate-950 shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 🌟 FIRST ROW SUMMARY: HOTEL PAYMENT & OPERATIONS REMARKS */}
      <div className="p-5 rounded-3xl bg-white border-2 border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 font-black text-slate-900 text-base">
            <Building2 className="w-5 h-5 text-teal-700" />
            <span>Operations Trip Summary Row: Hotel Payment, Cab Payment & Remarks</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-mono text-xs font-black">
            {activeCustomer.bookingId}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Hotel Payment Summary */}
          <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-1.5">
            <div className="flex items-center justify-between font-bold">
              <span className="text-xs text-teal-900 flex items-center gap-1 font-extrabold">
                <Building2 className="w-4 h-4 text-teal-700" /> Hotel Payment Status
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                activeCustomer.hotelPaymentStatus === 'Paid to Hotel'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {activeCustomer.hotelPaymentStatus || 'Pending'}
              </span>
            </div>
            <div className="text-lg font-black text-slate-900">
              ₹{(computedHotelTotalCost || activeCustomer.hotelPaymentAmount || Math.round((activeCustomer.totalAmount || 0) * 0.4)).toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-600 font-semibold">
              Mode: {activeCustomer.hotelPaymentMode || 'Bank Transfer / NEFT'}
              {activeCustomer.hotelPaymentRef && ` • Ref: ${activeCustomer.hotelPaymentRef}`}
            </p>
          </div>

          {/* Cab Payment Summary */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-1.5">
            <div className="flex items-center justify-between font-bold">
              <span className="text-xs text-emerald-900 flex items-center gap-1 font-extrabold">
                <Car className="w-4 h-4 text-emerald-700" /> Cab Payment Status
              </span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                activeCustomer.cabPaymentStatus === 'Paid to Driver'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {activeCustomer.cabPaymentStatus || 'Pending'}
              </span>
            </div>
            <div className="text-lg font-black text-slate-900">
              ₹{(activeCustomer.cabTotalCost || activeCustomer.cabPaymentAmount || Math.round((activeCustomer.totalAmount || 0) * 0.2)).toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-600 font-semibold">
              Mode: {activeCustomer.cabPaymentMode || 'UPI / Cash'}
              {activeCustomer.cabPaymentRef && ` • Ref: ${activeCustomer.cabPaymentRef}`}
            </p>
          </div>

          {/* Operational Remarks Summary */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-1.5">
            <div className="flex items-center justify-between font-bold text-xs text-indigo-900">
              <span className="flex items-center gap-1 font-extrabold">
                <MessageSquare className="w-4 h-4 text-indigo-700" /> Operational Remarks
              </span>
              <span className="text-[10px] uppercase font-bold text-indigo-600">Internal</span>
            </div>
            <p className="text-xs text-slate-700 font-medium italic line-clamp-3 leading-relaxed">
              {activeCustomer.opsRemarks || activeCustomer.specialRequests || 'Operations briefing completed. Guest requested early check-in.'}
            </p>
          </div>

        </div>
      </div>

      {/* DAY-BY-DAY ITINERARY LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
            <span>Day-Wise Travel Dates & Route Schedule</span>
            <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-mono text-xs">
              {displayDays.length} Days
            </span>
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Click any day to collapse/expand activity & driver details
          </p>
        </div>

        {displayDays.map((day, idx) => {
          const isExpanded = expandedDays[day.dayNumber] === true;
          const dayDateStr = formatDayDate(activeCustomer.startDate, idx);

          return (
            <div
              key={`day-${day.dayNumber}-${idx}`}
              className="border-2 border-slate-200 hover:border-teal-400 rounded-2xl bg-white shadow-xs overflow-hidden transition-all"
            >
              {/* DAY ACCORDION HEADER */}
              <div
                onClick={() => toggleDayAccordion(day.dayNumber)}
                className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white cursor-pointer flex flex-wrap items-center justify-between gap-3 hover:bg-slate-800 transition-colors"
              >
                <div className="flex flex-wrap items-center gap-3 min-w-0 flex-1">
                  <div className="px-3 py-1.5 rounded-xl bg-teal-400 text-slate-950 font-black text-xs font-mono flex items-center gap-1.5 shadow-xs shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{dayDateStr}</span>
                  </div>

                  <div className="px-2.5 py-1 rounded-lg bg-white/10 text-amber-300 font-black text-xs uppercase tracking-wider shrink-0">
                    DAY {day.dayNumber}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-extrabold text-sm sm:text-base text-white">
                      {day.title}
                    </h4>
                    {day.dayRemark && (
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-400/20 text-amber-300 text-xs font-semibold flex items-center gap-1 border border-amber-400/40 shadow-2xs">
                        💬 <span className="font-normal italic">{day.dayRemark}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                    {day.activities ? day.activities.length : 0} Activities
                  </span>
                  <div className="p-1 rounded-lg bg-white/10 text-teal-300">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* ACCORDION CONTENT */}
              {isExpanded && (
                <div className="p-5 space-y-4 bg-slate-50/50">
                  {day.activities && day.activities.length > 0 ? (
                    <div className="space-y-3">
                      {day.activities.map((act, actIdx) => (
                        <div
                          key={act.id || `act-${actIdx}`}
                          className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2.5 hover:border-teal-300 transition-all"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-md bg-teal-50 text-teal-700 font-mono text-[11px] font-black flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {act.timeSlot || '09:00 AM - 05:00 PM'}
                              </span>
                              <h5 className="font-extrabold text-sm text-slate-900">{act.title}</h5>
                            </div>

                            {act.location && (
                              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
                                <MapPin className="w-3 h-3 text-rose-500" />
                                {act.location}
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed font-normal">
                            {act.description || `Sightseeing tour and local exploration.`}
                          </p>

                          {/* ASSIGNED DRIVER & CAR FOR THIS SPECIFIC DAY / LEG */}
                          <div className="mt-2 p-3 rounded-xl bg-teal-50/80 border border-teal-200 text-xs flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2 font-extrabold text-teal-900">
                              <Car className="w-4 h-4 text-teal-700" />
                              <span>Day {day.dayNumber} Assigned Cab: <strong>{act.cabModel || activeCustomer.cabModel || 'Toyota Innova Crysta'}</strong> ({act.cabNumber || activeCustomer.cabNumber || 'RJ 14 CZ 9876'})</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                              <div className="flex items-center gap-2 font-semibold text-slate-800">
                                <span>Driver: <strong>{act.driverName || activeCustomer.driverName || 'Rajesh Sharma'}</strong></span>
                                <a
                                  href={`tel:${act.driverPhone || activeCustomer.driverPhone || '+91 98290 12345'}`}
                                  className="text-teal-700 hover:underline flex items-center gap-1 font-mono font-bold"
                                >
                                  <Phone className="w-3 h-3" />
                                  {act.driverPhone || activeCustomer.driverPhone || '+91 98290 12345'}
                                </a>
                              </div>

                              <button
                                onClick={() => handleOpenEditDayDriver(day.dayNumber, day.dayRemark, act.driverName, act.driverPhone, act.cabModel, act.cabNumber)}
                                className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Edit Day Remark & Driver</span>
                              </button>
                            </div>
                          </div>

                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center rounded-xl bg-white border border-slate-200 text-xs text-slate-500 font-medium">
                      No activities added for this day yet. Standard leisure & sightseeing schedule active.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* EDIT DAY DRIVER & REMARK MODAL */}
      {editingDayNum && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Car className="w-5 h-5 text-teal-600" />
                Edit Day {editingDayNum} Remark & Driver
              </h4>
              <button onClick={() => setEditingDayNum(null)} className="text-slate-400 hover:text-slate-600 font-bold">×</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Day {editingDayNum} Custom Remark (Shows after Title):</label>
                <input
                  type="text"
                  value={dayDriverForm.dayRemark}
                  onChange={(e) => setDayDriverForm({ ...dayDriverForm, dayRemark: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g. Hotel Check-in at 02:00 PM, evening dinner included"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Driver Name:</label>
                <input
                  type="text"
                  value={dayDriverForm.driverName}
                  onChange={(e) => setDayDriverForm({ ...dayDriverForm, driverName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold"
                  placeholder="e.g. Suresh Kumar"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Driver Phone Number:</label>
                <input
                  type="text"
                  value={dayDriverForm.driverPhone}
                  onChange={(e) => setDayDriverForm({ ...dayDriverForm, driverPhone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono font-bold"
                  placeholder="e.g. +91 98765 43210"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Cab Model:</label>
                <input
                  type="text"
                  value={dayDriverForm.cabModel}
                  onChange={(e) => setDayDriverForm({ ...dayDriverForm, cabModel: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold"
                  placeholder="e.g. Swift Dzire AC / Innova"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Cab Reg Number:</label>
                <input
                  type="text"
                  value={dayDriverForm.cabNumber}
                  onChange={(e) => setDayDriverForm({ ...dayDriverForm, cabNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono font-bold"
                  placeholder="e.g. RJ 14 TA 5544"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setEditingDayNum(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDayDriver}
                className="px-4 py-2 rounded-xl bg-teal-600 text-white font-extrabold text-xs hover:bg-teal-700 shadow-md"
              >
                Save Driver for Day {editingDayNum}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
