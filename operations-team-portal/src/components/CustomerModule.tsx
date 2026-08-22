import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  MapPin, 
  Calendar, 
  Phone, 
  Mail, 
  FileText, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  ChevronRight,
  Share2,
  Hotel,
  AlertTriangle,
  IndianRupee,
  CreditCard,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ArrowUpRight
} from 'lucide-react';
import { Customer, HotelVoucher, TripItinerary, PaymentInstallment } from '../types';
import { ensureCustomerInstallments } from '../utils/storage';

interface CustomerModuleProps {
  customers: Customer[];
  vouchers: HotelVoucher[];
  itineraries: TripItinerary[];
  searchTerm: string;
  onSelectCustomer: (customer: Customer) => void;
  onOpenShareCustomer: (customer: Customer) => void;
  onNavigateToDayWise: (customerId: string) => void;
  onOpenAddCustomer?: () => void;
  onRecordPaymentClick: (customer: Customer, installment: PaymentInstallment) => void;
  onCompleteTrip?: (customer: Customer) => void;
}

export const CustomerModule: React.FC<CustomerModuleProps> = ({
  customers,
  vouchers,
  itineraries,
  searchTerm,
  onSelectCustomer,
  onOpenShareCustomer,
  onNavigateToDayWise,
  onRecordPaymentClick,
  onCompleteTrip,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('active'); // Default: In-Transit & Upcoming only
  const [filterDestination, setFilterDestination] = useState<string>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  
  // Track expanded state per customer row/card
  const [expandedCustomerIds, setExpandedCustomerIds] = useState<Record<string, boolean>>({});

  const toggleCustomerExpanded = (id: string) => {
    setExpandedCustomerIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleCustomerExpanded(id);
  };

  // Helper for computing customer payment metrics
  const getCustomerPaymentMetrics = (cust: Customer) => {
    const installments = ensureCustomerInstallments(cust);
    const total = cust.totalAmount || 0;
    
    let paidAmount = 0;
    let overdueAmount = 0;
    let pendingAmount = 0;
    let overdueCount = 0;
    let nextDueInstallment: PaymentInstallment | null = null;
    let overdueInstallment: PaymentInstallment | null = null;

    installments.forEach((inst) => {
      if (inst.status === 'Paid') {
        paidAmount += inst.amount;
      } else if (inst.status === 'Overdue') {
        overdueAmount += inst.amount;
        overdueCount += 1;
        if (!overdueInstallment) overdueInstallment = inst;
      } else {
        pendingAmount += inst.amount;
        if (!nextDueInstallment) nextDueInstallment = inst;
      }
    });

    const percentPaid = total > 0 ? Math.min(100, Math.round((paidAmount / total) * 100)) : 0;
    
    let overallPaymentStatus: 'Fully Paid' | 'Partially Paid' | 'Payment Pending' | 'Overdue Alert' = 'Payment Pending';
    if (paidAmount >= total && total > 0) {
      overallPaymentStatus = 'Fully Paid';
    } else if (overdueCount > 0) {
      overallPaymentStatus = 'Overdue Alert';
    } else if (paidAmount > 0) {
      overallPaymentStatus = 'Partially Paid';
    }

    return {
      total,
      paidAmount,
      overdueAmount,
      pendingAmount,
      overdueCount,
      percentPaid,
      overallPaymentStatus,
      nextDueInstallment,
      overdueInstallment,
      installments
    };
  };

  // Overall Financial Portfolio
  const overallFinancials = customers.reduce(
    (acc, cust) => {
      const m = getCustomerPaymentMetrics(cust);
      acc.totalBookings += cust.totalAmount || 0;
      acc.totalCollected += m.paidAmount;
      acc.totalOverdue += m.overdueAmount;
      acc.overdueCustomersCount += m.overdueCount > 0 ? 1 : 0;
      acc.totalPending += (m.total - m.paidAmount);

      m.installments.forEach((inst) => {
        acc.totalEmiCount++;
        if (inst.status === 'Paid') acc.paidEmiCount++;
        else if (inst.status === 'Overdue') acc.overdueEmiCount++;
        else acc.pendingEmiCount++;
      });

      return acc;
    },
    { 
      totalBookings: 0, 
      totalCollected: 0, 
      totalOverdue: 0, 
      totalPending: 0, 
      overdueCustomersCount: 0,
      totalEmiCount: 0,
      paidEmiCount: 0,
      overdueEmiCount: 0,
      pendingEmiCount: 0
    }
  );

  // Filter Logic
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = 
      filterStatus === 'all' 
        ? true 
        : filterStatus === 'active' 
        ? (c.status === 'Upcoming' || c.status === 'In-Transit') 
        : c.status === filterStatus;
    const matchesDest = filterDestination === 'all' || c.destination.toLowerCase().includes(filterDestination.toLowerCase());

    const m = getCustomerPaymentMetrics(c);
    let matchesPayment = true;
    if (filterPayment === 'overdue') {
      matchesPayment = m.overdueCount > 0;
    } else if (filterPayment === 'pending') {
      matchesPayment = m.overallPaymentStatus !== 'Fully Paid';
    } else if (filterPayment === 'paid') {
      matchesPayment = m.overallPaymentStatus === 'Fully Paid';
    }

    return matchesSearch && matchesStatus && matchesDest && matchesPayment;
  }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const getVoucherSummary = (bookingId: string) => {
    const customerVouchers = vouchers.filter((v) => v.bookingId === bookingId);
    const pending = customerVouchers.filter((v) => v.status === 'Pending').length;
    const uploaded = customerVouchers.filter((v) => v.status === 'Uploaded' || v.status === 'Sent to Customer').length;
    return { total: customerVouchers.length, pending, uploaded };
  };

  const destinations = Array.from(new Set(customers.map((c) => c.destination)));

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* Financial & Operational KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Total Portfolio Value */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium uppercase tracking-wide">
            <span>Total Revenue</span>
            <span className="p-1 rounded bg-indigo-50 text-indigo-700">
              <IndianRupee className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">
            ₹{overallFinancials.totalBookings.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{customers.length} confirmed packages</p>
        </div>

        {/* Collected Payments */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium uppercase tracking-wide">
            <span>Received Revenue</span>
            <span className="p-1 rounded bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-xl font-bold text-emerald-700 mt-1 tabular-nums">
            ₹{overallFinancials.totalCollected.toLocaleString('en-IN')}
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-emerald-600 h-full rounded-full transition-all duration-300" 
              style={{ width: `${Math.round((overallFinancials.totalCollected / (overallFinancials.totalBookings || 1)) * 100)}%` }}
            />
          </div>
        </div>

        {/* OVERDUE PAYMENTS ALERT */}
        <div className={`p-4 rounded-xl border shadow-2xs transition-all ${
          overallFinancials.totalOverdue > 0
            ? 'bg-rose-50/50 border-rose-200'
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wide">
            <span className={overallFinancials.totalOverdue > 0 ? 'text-rose-700 flex items-center gap-1 font-semibold' : 'text-slate-500'}>
              {overallFinancials.totalOverdue > 0 && <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
              Overdue EMIs
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
              {overallFinancials.overdueEmiCount} EMIs
            </span>
          </div>
          <p className="text-xl font-bold text-rose-700 mt-1 tabular-nums">
            ₹{overallFinancials.totalOverdue.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-rose-600/90 mt-0.5 font-medium">
            {overallFinancials.totalOverdue > 0 ? `${overallFinancials.overdueCustomersCount} guest(s) pending payment` : 'All installments on time'}
          </p>
        </div>

        {/* Pending Balance */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium uppercase tracking-wide">
            <span>Pending Balance</span>
            <span className="p-1 rounded bg-amber-50 text-amber-700">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-xl font-bold text-amber-800 mt-1 tabular-nums">
            ₹{overallFinancials.totalPending.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{overallFinancials.pendingEmiCount} future scheduled EMIs</p>
        </div>

      </div>

      {/* Live EMI Breakdown Counter Bar */}
      <div className="p-3 bg-slate-900 text-white rounded-xl flex flex-wrap items-center justify-between gap-2.5 text-xs shadow-xs">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-slate-200 text-xs">Operations Milestone Breakdown:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2.5 py-0.5 rounded-md bg-white/10 text-white font-medium">
            Total: <strong className="text-indigo-300 font-semibold">{overallFinancials.totalEmiCount}</strong>
          </span>
          <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
            Paid: <strong className="font-semibold">{overallFinancials.paidEmiCount}</strong>
          </span>
          <span className={`px-2.5 py-0.5 rounded-md font-medium border ${overallFinancials.overdueEmiCount > 0 ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-white/10 text-slate-300 border-transparent'}`}>
            Overdue: <strong className="font-semibold">{overallFinancials.overdueEmiCount}</strong>
          </span>
          <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30">
            Pending: <strong className="font-semibold">{overallFinancials.pendingEmiCount}</strong>
          </span>
        </div>
      </div>

      {/* Advanced Multi-Filter Controls */}
      <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
        
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-slate-500 text-xs">Filter:</span>
          
          {/* Quick Payment Status Filter Pills */}
          <button
            onClick={() => setFilterPayment('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filterPayment === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Packages ({customers.length})
          </button>

          <button
            onClick={() => setFilterPayment('overdue')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              filterPayment === 'overdue'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Overdue ({customers.filter(c => getCustomerPaymentMetrics(c).overdueCount > 0).length})
          </button>

          <button
            onClick={() => setFilterPayment('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filterPayment === 'pending'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            Pending Balance
          </button>

          <button
            onClick={() => setFilterPayment('paid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filterPayment === 'paid'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            Fully Paid
          </button>

          {/* Select dropdowns for status & destination */}
          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-medium text-slate-700 text-xs focus:border-indigo-400 outline-none cursor-pointer"
          >
            <option value="active">Active (In-Transit & Upcoming)</option>
            <option value="Upcoming">Upcoming Only</option>
            <option value="In-Transit">In-Transit Only</option>
            <option value="Completed">Completed Trips</option>
            <option value="all">All Trips</option>
          </select>

          <select
            value={filterDestination}
            onChange={(e) => setFilterDestination(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-medium text-slate-700 text-xs focus:border-indigo-400 outline-none cursor-pointer"
          >
            <option value="all">All Destinations</option>
            {destinations.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-semibold text-slate-800">{filteredCustomers.length}</span> records
        </div>
      </div>

      {/* Customer Cards / Expandable Rows */}
      {filteredCustomers.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-white border border-dashed border-slate-200 space-y-2">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-semibold text-slate-800 text-sm">No Customer Packages Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No customer bookings match the active payment or trip filter criteria.
          </p>
          <button
            onClick={() => { setFilterPayment('all'); setFilterStatus('all'); setFilterDestination('all'); }}
            className="mt-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredCustomers.map((cust) => {
            const isExpanded = !!expandedCustomerIds[cust.id];
            const custVouchers = vouchers.filter((v) => v.bookingId === cust.bookingId);
            const hasUploadedVoucher = custVouchers.some((v) => v.status === 'Uploaded' || v.status === 'Sent to Customer');
            const isNewTrip = !hasUploadedVoucher;
            const vouchSummary = getVoucherSummary(cust.bookingId);
            const m = getCustomerPaymentMetrics(cust);

            const statusBadge = 
              cust.status === 'Upcoming' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              cust.status === 'In-Transit' ? 'bg-purple-50 text-purple-700 border-purple-200' :
              'bg-slate-100 text-slate-700 border-slate-200';

            return (
              <div 
                key={cust.id}
                className={`bg-white border rounded-xl transition-all font-sans overflow-hidden ${
                  isExpanded 
                    ? 'border-indigo-200 shadow-md ring-1 ring-indigo-100' 
                    : m.overdueCount > 0 
                    ? 'border-rose-200 hover:border-rose-300 shadow-2xs' 
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-xs shadow-2xs'
                }`}
              >
                {/* Compact Row (Always visible - click to toggle complete card) */}
                <div 
                  onClick={() => toggleCustomerExpanded(cust.id)}
                  className={`px-4 py-3 cursor-pointer select-none transition-colors flex flex-wrap items-center justify-between gap-3 ${
                    isExpanded 
                      ? 'bg-indigo-50/40 border-b border-indigo-100' 
                      : 'bg-white hover:bg-slate-50/70'
                  }`}
                >
                  {/* Left Side: Chevron, Booking ID, Name, Destination, Travel Dates, Financial Pills */}
                  <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                    <button
                      type="button"
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-transform duration-200"
                      title={isExpanded ? "Collapse card" : "Expand full card"}
                    >
                      {isExpanded ? (
                        <ChevronDown size={16} className="text-indigo-600 transform rotate-180 transition-transform duration-200" />
                      ) : (
                        <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-600 transition-transform duration-200" />
                      )}
                    </button>

                    <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                      #{cust.bookingId}
                    </span>

                    {isNewTrip && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                        New
                      </span>
                    )}

                    <span className={`text-[11px] px-2 py-0.5 rounded font-medium border shrink-0 ${statusBadge}`}>
                      {cust.status}
                    </span>

                    {/* Customer Avatar & Name */}
                    <div className="flex items-center gap-1.5 min-w-0 pr-1">
                      <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-[10px] flex items-center justify-center shrink-0">
                        {cust.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-slate-900 text-xs truncate max-w-[150px] sm:max-w-[200px]">
                        {cust.name}
                      </span>
                    </div>

                    {/* Destination Badge */}
                    <div className="hidden sm:flex items-center gap-1 text-xs text-indigo-700 font-medium bg-indigo-50/70 border border-indigo-100 px-2 py-0.5 rounded shrink-0">
                      <MapPin size={11} className="text-indigo-500" />
                      <span>{cust.destination}</span>
                    </div>

                    {/* Travel Dates & Pax (Compact row summary) */}
                    <div className="hidden md:flex items-center gap-2 text-[11px] text-slate-500 shrink-0">
                      <span>📅 {cust.startDate}</span>
                      <span>·</span>
                      <span>{cust.paxAdults} Adults{cust.paxChildren > 0 ? `, ${cust.paxChildren} Kids` : ''}</span>
                    </div>

                    {/* Quick Financial Status Badge in Row */}
                    {cust.totalAmount > 0 ? (
                      <div className="hidden lg:flex items-center gap-1.5 shrink-0">
                        <span className="text-[11px] font-semibold text-slate-800">
                          ₹{cust.totalAmount.toLocaleString('en-IN')}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                          m.overdueCount > 0 
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : m.overallPaymentStatus === 'Fully Paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {m.overdueCount > 0 ? `${m.overdueCount} Overdue` : m.overallPaymentStatus === 'Fully Paid' ? 'Fully Paid' : `Paid ₹${m.paidAmount.toLocaleString('en-IN')}`}
                        </span>
                      </div>
                    ) : (
                      <span className="hidden lg:inline text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shrink-0">
                        EMI Pending
                      </span>
                    )}

                    {/* Quick Voucher Badge */}
                    <div className="hidden xl:flex items-center gap-1 shrink-0">
                      {vouchSummary.pending > 0 ? (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {vouchSummary.pending} Vouchers Pending
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> All Vouchers Uploaded
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Quick Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCustomer(cust);
                      }}
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    >
                      Details
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToDayWise(cust.id);
                      }}
                      className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors flex items-center gap-1 cursor-pointer"
                      title="View Day Wise Trip Itinerary"
                    >
                      <span>Day Wise</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>

                    {cust.status === 'Completed' ? (
                      <span className="text-[10px] font-medium py-1 px-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Done
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onCompleteTrip) onCompleteTrip(cust);
                        }}
                        className="text-xs font-medium py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                        title="Mark Trip as Complete"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Complete</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenShareCustomer(cust);
                      }}
                      className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
                      title="Share Details"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Complete Card Body (Visible when Expanded) */}
                {isExpanded && (
                  <div className="p-5 bg-white space-y-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                    
                    {/* Customer Info & Contact Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide block">Contact Phone</span>
                        <div className="flex items-center gap-1 text-slate-700 font-mono font-medium text-xs mt-0.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{cust.phone || 'Not specified'}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide block">Email Address</span>
                        <div className="flex items-center gap-1 text-slate-700 font-medium text-xs mt-0.5 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{cust.email || 'Not specified'}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wide block">Assigned Operations Manager</span>
                        <span className="font-semibold text-slate-800 text-xs mt-0.5 block">
                          {cust.assignedOpsManager || 'Ops Team'}
                        </span>
                      </div>
                    </div>

                    {/* Financial & Installments Section */}
                    {cust.totalAmount <= 0 ? (
                      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1">
                        <div className="flex items-center justify-between font-semibold text-amber-900">
                          <span>Package Cost: Pending Quotation</span>
                          <span className="text-[10px] font-medium text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                            EMI Schedule Pending
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-700">
                          Please update the lead quote price to generate the standard milestone payment schedule.
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 text-xs space-y-3">
                        {/* Financial Summary Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                          <span className="text-slate-900 text-sm">
                            Total Package Value: ₹{cust.totalAmount.toLocaleString('en-IN')}
                          </span>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-emerald-700 font-medium">
                              Received: ₹{m.paidAmount.toLocaleString('en-IN')} ({m.percentPaid}%)
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className={m.overdueCount > 0 ? 'text-rose-600 font-semibold' : 'text-slate-600'}>
                              Balance Due: ₹{(m.total - m.paidAmount).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                          <div 
                            className="bg-emerald-600 h-full transition-all duration-300"
                            style={{ width: `${m.percentPaid}%` }}
                          />
                          {m.overdueCount > 0 && (
                            <div 
                              className="bg-rose-500 h-full transition-all duration-300"
                              style={{ width: `${Math.round((m.overdueAmount / (m.total || 1)) * 100)}%` }}
                            />
                          )}
                        </div>

                        {/* Installment Milestone Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                          {m.installments.map((inst, index) => {
                            const isPaid = inst.status === 'Paid';
                            const isOverdue = inst.status === 'Overdue';

                            const ordinal = 
                              index === 0 ? '1st' :
                              index === 1 ? '2nd' :
                              index === 2 ? '3rd' :
                              index === 3 ? '4th' :
                              `${index + 1}th`;
                            const isLast = index === m.installments.length - 1 && m.installments.length > 1;
                            const shortLabel = inst.title || `${ordinal} Installment${isLast ? ' (Final)' : ''}`;

                            return (
                              <div 
                                key={inst.id}
                                className={`p-3 rounded-lg border text-xs flex flex-col justify-between gap-2 transition-all ${
                                  isPaid 
                                    ? 'bg-emerald-50/70 text-slate-800 border-emerald-200 ring-1 ring-emerald-100' 
                                    : isOverdue 
                                    ? 'bg-rose-50 border-rose-200 text-rose-900 shadow-2xs' 
                                    : 'bg-white border-slate-200 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-semibold text-slate-800 text-[11px] truncate">
                                    {shortLabel}
                                  </span>
                                  {isPaid ? (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                      PAID ✓
                                    </span>
                                  ) : isOverdue ? (
                                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                                      OVERDUE
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                      DUE
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                                  <span className="font-bold text-slate-900 text-xs">
                                    ₹{inst.amount.toLocaleString('en-IN')}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onRecordPaymentClick(cust, inst);
                                    }}
                                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                                      isPaid
                                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                        : isOverdue
                                        ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-2xs'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs'
                                    }`}
                                  >
                                    {isPaid ? 'View Receipt' : isOverdue ? 'Collect Now' : 'Mark Paid'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                      </div>
                    )}

                    {/* Hotel Voucher Summary */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Hotel className="w-4 h-4 text-indigo-600" />
                        <span className="font-semibold text-slate-800">Accommodation Vouchers:</span>
                        <span className="text-slate-600">
                          {vouchSummary.uploaded} uploaded of {vouchSummary.total || 0} total required
                        </span>
                      </div>
                      {vouchSummary.pending > 0 ? (
                        <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" /> {vouchSummary.pending} Vouchers Pending Upload
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> All Hotel Vouchers Confirmed
                        </span>
                      )}
                    </div>

                    {/* Full Action Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectCustomer(cust)}
                          className="text-xs font-medium py-2 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <span>Open Full Customer Drawer</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onNavigateToDayWise(cust.id)}
                          className="text-xs font-medium py-2 px-3.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Day Wise Itinerary</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {cust.status !== 'Completed' && (
                          <button
                            type="button"
                            onClick={() => onCompleteTrip && onCompleteTrip(cust)}
                            className="text-xs font-medium py-2 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Complete Trip</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onOpenShareCustomer(cust)}
                          className="text-xs font-medium py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Share on WhatsApp</span>
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
