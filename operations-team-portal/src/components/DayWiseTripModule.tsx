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
      <div className="p-12 text-center bg-surface border border-line rounded-xl shadow-sm space-y-3">
        <Compass className="w-12 h-12 text-slate-300 mx-auto animate-spin-slow" />
        <h3 className="text-lg font-semibold text-content">No Active Converted Trips Found</h3>
        <p className="text-sm text-secondary max-w-md mx-auto">
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
      <div className="p-6 rounded-xl bg-inverse text-white shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-success-ink font-bold text-sm uppercase tracking-wider">
              <Compass className="w-4 h-4 text-success-ink" />
              <span>Operations Day-Wise Itinerary Desk</span>
            </div>
            <h2 className="text-2xl font-semibold text-white mt-1">Day-Wise Trip Schedule</h2>
            <p className="text-sm text-muted mt-0.5">
              View daily travel dates, itinerary titles, hotel payments, operational remarks & multiple cab driver assignments.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleShareDayWise}
              className="px-4 py-2 rounded-xl bg-success-strong hover:bg-success-strong text-white font-semibold text-sm shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Itinerary</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-success-strong hover:bg-success-strong text-content font-semibold text-sm shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print Day Schedule</span>
            </button>
          </div>
        </div>

        {/* TRIP FILTERS TOOLBAR */}
        <div className="pt-4 border-t border-line space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-semibold text-success-ink uppercase tracking-widest">
                📅 Filter Trip Dates:
              </span>

              {/* Start Date (From) */}
              <div className="flex items-center gap-1.5 bg-inverse px-3 py-1.5 rounded-xl border border-line">
                <span className="text-xs text-muted font-bold uppercase">From:</span>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer"
                  title="Filter by Trip Start Date"
                />
              </div>

              {/* Departure / End Date (To) */}
              <div className="flex items-center gap-1.5 bg-inverse px-3 py-1.5 rounded-xl border border-line">
                <span className="text-xs text-muted font-bold uppercase">To Departure:</span>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer"
                  title="Filter by Trip Departure Date"
                />
              </div>

              {/* Status Select */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-inverse px-3 py-1.5 rounded-xl border border-line text-sm font-bold text-success-ink focus:outline-none cursor-pointer"
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
                className="bg-inverse px-3 py-1.5 rounded-xl border border-line text-sm font-bold text-white placeholder-secondary focus:outline-none"
              />

              {(filterStartDate || filterEndDate || filterStatus !== 'active' || searchQuery) && (
                <button
                  onClick={() => {
                    setFilterStartDate('');
                    setFilterEndDate('');
                    setFilterStatus('active');
                    setSearchQuery('');
                  }}
                  className="px-2.5 py-1.5 bg-danger-strong/20 text-danger-ink hover:bg-danger-strong/30 rounded-xl text-xs font-semibold uppercase transition-all"
                >
                  Reset Filters
                </button>
              )}
            </div>

            <div className="text-xs font-bold text-muted">
              Showing <span className="text-success-ink font-semibold">{eligibleCustomers.length}</span> of {customers.length} trips
            </div>
          </div>

          {/* TRIP SELECTOR CARDS */}
          {eligibleCustomers.length === 0 ? (
            <div className="p-6 text-center bg-inverse/60 rounded-xl border border-line text-muted text-sm font-medium">
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
                    className={`p-3.5 rounded-xl text-left border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-brand border-brand ring-2 ring-brand-line text-on-brand shadow-sm'
                        : 'bg-inverse/80 border-line/80 text-slate-300 hover:bg-inverse hover:text-white'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate text-white">{cust.name}</span>
                        <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-white/10 text-success-ink font-bold shrink-0">
                          {cust.bookingId}
                        </span>
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${cust.status === 'In-Transit' ? 'bg-warning-strong/20 text-warning-ink border border-warning-line/30' : cust.status === 'Completed' ? 'bg-success-strong/20 text-success-ink' : 'bg-brand/20 text-brand-ink'}`}>
                          {cust.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted mt-1 font-medium">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-success-ink" />
                          {cust.destination}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-warning-ink" />
                          {formattedStart} {formattedEnd ? `→ ${formattedEnd}` : ''}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="p-1.5 rounded-full bg-success-strong text-content shrink-0">
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
      <div className="p-5 rounded-xl bg-surface border-2 border-line shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2 font-semibold text-content text-base">
            <Building2 className="w-5 h-5 text-success-ink" />
            <span>Operations Trip Summary Row: Hotel Payment, Cab Payment & Remarks</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-success-soft text-success-ink font-mono text-sm font-semibold">
            {activeCustomer.bookingId}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Hotel Payment Summary */}
          <div className="p-4 rounded-xl bg-success-soft/60 border border-success-line space-y-1.5">
            <div className="flex items-center justify-between font-bold">
              <span className="text-sm text-success-ink flex items-center gap-1 font-semibold">
                <Building2 className="w-4 h-4 text-success-ink" /> Hotel Payment Status
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                activeCustomer.hotelPaymentStatus === 'Paid to Hotel'
                  ? 'bg-success-soft text-success-ink border border-success-line'
                  : 'bg-warning-soft text-warning-ink border border-warning-line'
              }`}>
                {activeCustomer.hotelPaymentStatus || 'Pending'}
              </span>
            </div>
            <div className="text-lg font-semibold text-content">
              ₹{(computedHotelTotalCost || activeCustomer.hotelPaymentAmount || Math.round((activeCustomer.totalAmount || 0) * 0.4)).toLocaleString()}
            </div>
            <p className="text-xs text-secondary font-semibold">
              Mode: {activeCustomer.hotelPaymentMode || 'Bank Transfer / NEFT'}
              {activeCustomer.hotelPaymentRef && ` • Ref: ${activeCustomer.hotelPaymentRef}`}
            </p>
          </div>

          {/* Cab Payment Summary */}
          <div className="p-4 rounded-xl bg-success-soft/60 border border-success-line space-y-1.5">
            <div className="flex items-center justify-between font-bold">
              <span className="text-sm text-success-ink flex items-center gap-1 font-semibold">
                <Car className="w-4 h-4 text-success-ink" /> Cab Payment Status
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                activeCustomer.cabPaymentStatus === 'Paid to Driver'
                  ? 'bg-success-soft text-success-ink border border-success-line'
                  : 'bg-warning-soft text-warning-ink border border-warning-line'
              }`}>
                {activeCustomer.cabPaymentStatus || 'Pending'}
              </span>
            </div>
            <div className="text-lg font-semibold text-content">
              ₹{(activeCustomer.cabTotalCost || activeCustomer.cabPaymentAmount || Math.round((activeCustomer.totalAmount || 0) * 0.2)).toLocaleString()}
            </div>
            <p className="text-xs text-secondary font-semibold">
              Mode: {activeCustomer.cabPaymentMode || 'UPI / Cash'}
              {activeCustomer.cabPaymentRef && ` • Ref: ${activeCustomer.cabPaymentRef}`}
            </p>
          </div>

          {/* Operational Remarks Summary */}
          <div className="p-4 rounded-xl bg-brand-soft/60 border border-brand-line space-y-1.5">
            <div className="flex items-center justify-between font-bold text-sm text-brand-ink">
              <span className="flex items-center gap-1 font-semibold">
                <MessageSquare className="w-4 h-4 text-brand-ink" /> Operational Remarks
              </span>
              <span className="text-xs uppercase font-bold text-brand-ink">Internal</span>
            </div>
            <p className="text-sm text-content font-medium italic line-clamp-3 leading-relaxed">
              {activeCustomer.opsRemarks || activeCustomer.specialRequests || 'Operations briefing completed. Guest requested early check-in.'}
            </p>
          </div>

        </div>
      </div>

      {/* DAY-BY-DAY ITINERARY LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base text-content flex items-center gap-2">
            <span>Day-Wise Travel Dates & Route Schedule</span>
            <span className="px-2 py-0.5 rounded-md bg-success-soft text-success-ink font-mono text-sm">
              {displayDays.length} Days
            </span>
          </h3>
          <p className="text-sm text-secondary font-medium">
            Click any day to collapse/expand activity & driver details
          </p>
        </div>

        {displayDays.map((day, idx) => {
          const isExpanded = expandedDays[day.dayNumber] === true;
          const dayDateStr = formatDayDate(activeCustomer.startDate, idx);

          return (
            <div
              key={`day-${day.dayNumber}-${idx}`}
              className="border-2 border-line hover:border-success-line rounded-xl bg-surface shadow-xs overflow-hidden transition-all"
            >
              {/* DAY ACCORDION HEADER */}
              <div
                onClick={() => toggleDayAccordion(day.dayNumber)}
                className="p-4 bg-gradient-to-r from-line via-line to-line text-white cursor-pointer flex flex-wrap items-center justify-between gap-3 hover:bg-inverse transition-colors"
              >
                <div className="flex flex-wrap items-center gap-3 min-w-0 flex-1">
                  <div className="px-3 py-1.5 rounded-xl bg-success-strong text-content font-semibold text-sm font-mono flex items-center gap-1.5 shadow-xs shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{dayDateStr}</span>
                  </div>

                  <div className="px-2.5 py-1 rounded-lg bg-white/10 text-warning-ink font-semibold text-sm uppercase tracking-wider shrink-0">
                    DAY {day.dayNumber}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-sm sm:text-base text-white">
                      {day.title}
                    </h4>
                    {day.dayRemark && (
                      <span className="px-2.5 py-0.5 rounded-lg bg-warning-strong/20 text-warning-ink text-sm font-semibold flex items-center gap-1 border border-warning-line/40 shadow-2xs">
                        💬 <span className="font-normal italic">{day.dayRemark}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted font-mono hidden sm:inline">
                    {day.activities ? day.activities.length : 0} Activities
                  </span>
                  <div className="p-1 rounded-lg bg-white/10 text-success-ink">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* ACCORDION CONTENT */}
              {isExpanded && (
                <div className="p-5 space-y-4 bg-canvas/50">
                  {day.activities && day.activities.length > 0 ? (
                    <div className="space-y-3">
                      {day.activities.map((act, actIdx) => (
                        <div
                          key={act.id || `act-${actIdx}`}
                          className="p-4 rounded-xl bg-surface border border-line shadow-2xs space-y-2.5 hover:border-success-line transition-all"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-md bg-success-soft text-success-ink font-mono text-xs font-semibold flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {act.timeSlot || '09:00 AM - 05:00 PM'}
                              </span>
                              <h5 className="font-semibold text-sm text-content">{act.title}</h5>
                            </div>

                            {act.location && (
                              <span className="text-xs font-bold text-secondary flex items-center gap-1 bg-subtle px-2 py-0.5 rounded-md">
                                <MapPin className="w-3 h-3 text-danger-ink" />
                                {act.location}
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-secondary leading-relaxed font-normal">
                            {act.description || `Sightseeing tour and local exploration.`}
                          </p>

                          {/* ASSIGNED DRIVER & CAR FOR THIS SPECIFIC DAY / LEG */}
                          <div className="mt-2 p-3 rounded-xl bg-success-soft/80 border border-success-line text-sm flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2 font-semibold text-success-ink">
                              <Car className="w-4 h-4 text-success-ink" />
                              <span>Day {day.dayNumber} Assigned Cab: <strong>{act.cabModel || activeCustomer.cabModel || 'Toyota Innova Crysta'}</strong> ({act.cabNumber || activeCustomer.cabNumber || 'RJ 14 CZ 9876'})</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                              <div className="flex items-center gap-2 font-semibold text-content">
                                <span>Driver: <strong>{act.driverName || activeCustomer.driverName || 'Rajesh Sharma'}</strong></span>
                                <a
                                  href={`tel:${act.driverPhone || activeCustomer.driverPhone || '+91 98290 12345'}`}
                                  className="text-success-ink hover:underline flex items-center gap-1 font-mono font-bold"
                                >
                                  <Phone className="w-3 h-3" />
                                  {act.driverPhone || activeCustomer.driverPhone || '+91 98290 12345'}
                                </a>
                              </div>

                              <button
                                onClick={() => handleOpenEditDayDriver(day.dayNumber, day.dayRemark, act.driverName, act.driverPhone, act.cabModel, act.cabNumber)}
                                className="px-2.5 py-1 rounded-lg bg-success-strong hover:bg-success-strong text-white font-bold text-xs flex items-center gap-1 shadow-2xs"
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
                    <div className="p-4 text-center rounded-xl bg-surface border border-line text-sm text-secondary font-medium">
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
        <div className="fixed inset-0 z-50 bg-inverse/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-surface border border-line rounded-xl max-w-md w-full p-6 space-y-4 shadow-sm animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h4 className="font-semibold text-content text-base flex items-center gap-2">
                <Car className="w-5 h-5 text-success-ink" />
                Edit Day {editingDayNum} Remark & Driver
              </h4>
              <button onClick={() => setEditingDayNum(null)} className="text-muted hover:text-secondary font-bold">×</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-content block mb-1">Day {editingDayNum} Custom Remark (Shows after Title):</label>
                <input
                  type="text"
                  value={dayDriverForm.dayRemark}
                  onChange={(e) => setDayDriverForm({ ...dayDriverForm, dayRemark: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-line font-bold text-content focus:ring-2 focus:ring-success-line"
                  placeholder="e.g. Hotel Check-in at 02:00 PM, evening dinner included"
                />
              </div>

              <div>
                <label className="font-bold text-content block mb-1">Driver Name:</label>
                <input
                  type="text"
                  value={dayDriverForm.driverName}
                  onChange={(e) => setDayDriverForm({ ...dayDriverForm, driverName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-line font-bold"
                  placeholder="e.g. Suresh Kumar"
                />
              </div>

              <div>
                <label className="font-bold text-content block mb-1">Driver Phone Number:</label>
                <input
                  type="text"
                  value={dayDriverForm.driverPhone}
                  onChange={(e) => setDayDriverForm({ ...dayDriverForm, driverPhone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-line font-mono font-bold"
                  placeholder="e.g. +91 98765 43210"
                />
              </div>

              <div>
                <label className="font-bold text-content block mb-1">Cab Model:</label>
                <input
                  type="text"
                  value={dayDriverForm.cabModel}
                  onChange={(e) => setDayDriverForm({ ...dayDriverForm, cabModel: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-line font-bold"
                  placeholder="e.g. Swift Dzire AC / Innova"
                />
              </div>

              <div>
                <label className="font-bold text-content block mb-1">Cab Reg Number:</label>
                <input
                  type="text"
                  value={dayDriverForm.cabNumber}
                  onChange={(e) => setDayDriverForm({ ...dayDriverForm, cabNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-line font-mono font-bold"
                  placeholder="e.g. RJ 14 TA 5544"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <button
                onClick={() => setEditingDayNum(null)}
                className="px-4 py-2 rounded-xl bg-subtle text-content font-bold text-sm hover:bg-hover"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDayDriver}
                className="px-4 py-2 rounded-xl bg-success-strong text-white font-semibold text-sm hover:bg-success-strong shadow-sm"
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
