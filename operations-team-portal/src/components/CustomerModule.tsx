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
  
  // Track expanded installments per customer card
  const [expandedCustomerIds, setExpandedCustomerIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCustomerIds(prev => ({ ...prev, [id]: !prev[id] }));
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
    
    let overallPaymentStatus: 'Fully Paid' | 'Overdue' | 'Partially Paid' | 'Unpaid' = 'Unpaid';
    if (total > 0 && paidAmount >= total) {
      overallPaymentStatus = 'Fully Paid';
    } else if (overdueCount > 0) {
      overallPaymentStatus = 'Overdue';
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
      overdueInstallment,
      nextDueInstallment,
      installments,
    };
  };

  // Calculate Overall Financial Totals & Detailed EMI breakdown
  const overallFinancials = customers.reduce(
    (acc, c) => {
      const m = getCustomerPaymentMetrics(c);
      acc.totalBookings += m.total;
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
    <div className="space-y-6">
      
      {/* Financial & Operational High-Impact Dashboard Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Portfolio Value */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Total Revenue</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <IndianRupee className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">
            ₹{overallFinancials.totalBookings.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5"> Across {customers.length} confirmed customer packages</p>
        </div>

        {/* Collected Payments */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Received Revenue</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            ₹{overallFinancials.totalCollected.toLocaleString()}
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-300" 
              style={{ width: `${Math.round((overallFinancials.totalCollected / (overallFinancials.totalBookings || 1)) * 100)}%` }}
            />
          </div>
        </div>

        {/* OVERDUE PAYMENTS ALERT - Highlighted with Exact Overdue EMI Count */}
        <div className={`p-4 rounded-2xl border shadow-2xs transition-all ${
          overallFinancials.totalOverdue > 0
            ? 'bg-gradient-to-br from-rose-50 to-amber-50/40 border-rose-300 ring-2 ring-rose-500/20'
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between text-xs font-bold uppercase">
            <span className={overallFinancials.totalOverdue > 0 ? 'text-rose-700 flex items-center gap-1' : 'text-slate-500'}>
              {overallFinancials.totalOverdue > 0 && <AlertTriangle className="w-4 h-4 text-rose-600 animate-bounce" />}
              Overdue Installments
            </span>
            <span className="p-1.5 rounded-lg bg-rose-100/60 text-rose-600 font-bold">
              {overallFinancials.overdueEmiCount} EMIs ({overallFinancials.overdueCustomersCount} Guests)
            </span>
          </div>
          <p className="text-2xl font-black text-rose-600 mt-1">
            ₹{overallFinancials.totalOverdue.toLocaleString()}
          </p>
          <p className="text-[11px] font-semibold text-rose-600/90 mt-0.5">
            {overallFinancials.totalOverdue > 0 ? `⚠️ Action Required: ${overallFinancials.overdueEmiCount} overdue EMI(s) pending` : 'All installments up-to-date'}
          </p>
        </div>

        {/* Pending Balance */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Pending Balance</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-1">
            ₹{overallFinancials.totalPending.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{overallFinancials.pendingEmiCount} scheduled future EMIs</p>
        </div>

      </div>

      {/* Live EMI Breakdown Counter Bar */}
      <div className="p-3 bg-slate-900 text-white rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-amber-400" />
          <span className="font-black uppercase tracking-wider text-slate-200">Operations EMI Breakdown:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-white/10 text-white font-bold">
            Total EMIs: <strong className="text-amber-300">{overallFinancials.totalEmiCount}</strong>
          </span>
          <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
            Paid EMIs: <strong>{overallFinancials.paidEmiCount}</strong>
          </span>
          <span className={`px-3 py-1 rounded-xl font-bold border ${overallFinancials.overdueEmiCount > 0 ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse' : 'bg-white/10 text-slate-300 border-transparent'}`}>
            Overdue EMIs: <strong>{overallFinancials.overdueEmiCount}</strong>
          </span>
          <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
            Pending EMIs: <strong>{overallFinancials.pendingEmiCount}</strong>
          </span>
        </div>
      </div>

      {/* Advanced Multi-Filter Controls */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-slate-700 mr-1">Filter Customers:</span>
          
          {/* Quick Payment Status Filter Pills */}
          <button
            onClick={() => setFilterPayment('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              filterPayment === 'all'
                ? 'bg-slate-900 text-white   shadow-xs'
                : 'bg-slate-100  text-slate-600  hover:bg-slate-200'
            }`}
          >
            All Customers ({customers.length})
          </button>

          <button
            onClick={() => setFilterPayment('overdue')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
              filterPayment === 'overdue'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 /40 text-rose-700  border border-rose-200  hover:bg-rose-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Overdue Payments ({customers.filter(c => getCustomerPaymentMetrics(c).overdueCount > 0).length})
          </button>

          <button
            onClick={() => setFilterPayment('pending')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              filterPayment === 'pending'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 /40 text-amber-700  border border-amber-200  hover:bg-amber-100'
            }`}
          >
            Pending Balance
          </button>

          <button
            onClick={() => setFilterPayment('paid')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              filterPayment === 'paid'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 /40 text-emerald-700  border border-emerald-200  hover:bg-emerald-100'
            }`}
          >
            Fully Paid
          </button>

          {/* Select dropdowns for status & destination */}
          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 font-semibold text-slate-700 focus:outline-none"
          >
            <option value="active">Active Trips (In-Transit & Upcoming)</option>
            <option value="Upcoming">Upcoming Only</option>
            <option value="In-Transit">In-Transit Only</option>
            <option value="Completed">Completed Trips</option>
            <option value="all">All Trips (Inc. Completed)</option>
          </select>

          <select
            value={filterDestination}
            onChange={(e) => setFilterDestination(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 font-semibold text-slate-700 focus:outline-none"
          >
            <option value="all">All Destinations</option>
            {destinations.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-900">{filteredCustomers.length}</span> matching records
        </div>
      </div>

      {/* Customer Cards Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-dashed border-slate-300 space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-800 text-base">No Customer Records Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No customers match the active payment or trip filter criteria.
          </p>
          <button
            onClick={() => { setFilterPayment('all'); setFilterStatus('all'); setFilterDestination('all'); }}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCustomers.map((cust) => {
            const custVouchers = vouchers.filter((v) => v.bookingId === cust.bookingId);
            const hasUploadedVoucher = custVouchers.some((v) => v.status === 'Uploaded' || v.status === 'Sent to Customer');
            const isNewTrip = !hasUploadedVoucher;
            const vouchSummary = getVoucherSummary(cust.bookingId);
            const m = getCustomerPaymentMetrics(cust);
            const isExpanded = !!expandedCustomerIds[cust.id];

            const statusBadge = 
              cust.status === 'Upcoming' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 /40 ' :
              cust.status === 'In-Transit' ? 'bg-purple-50 text-purple-700 border-purple-200 /40 ' :
              'bg-slate-100 text-slate-700 border-slate-200  ';

            return (
              <div 
                key={cust.id}
                className={`bg-white  border rounded-2xl p-5 transition-all shadow-2xs flex flex-col justify-between group ${
                  m.overdueCount > 0 
                    ? 'border-rose-300 /80 ring-1 ring-rose-500/10 hover:border-rose-400' 
                    : 'border-slate-200  hover:border-blue-300 '
                }`}
              >
                <div>
                  
                  {/* Top Header: Booking Ref & Trip Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 /50 px-2.5 py-1 rounded-md border border-blue-200">
                        {cust.bookingId}
                      </span>
                      {isNewTrip && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs animate-pulse flex items-center gap-1 border border-amber-300">
                          <span>✨</span> NEW
                        </span>
                      )}
                    </div>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${statusBadge}`}>
                      {cust.status}
                    </span>
                  </div>

                  {/* Customer Name, Destination & Contact Info */}
                  <div className="space-y-1">
                    <h3 
                      onClick={() => onSelectCustomer(cust)}
                      className="font-bold text-slate-900 text-base group-hover:text-blue-600 transition-colors cursor-pointer flex items-center justify-between"
                    >
                      <span>{cust.name}</span>
                      <ArrowUpRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 font-medium">
                      <div className="flex items-center gap-1 text-slate-800">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{cust.destination}</span>
                      </div>
                      <div className="flex items-center gap-1 text-blue-600 font-semibold">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>{cust.phone}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate max-w-[140px]">{cust.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Travel Dates & Pax */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{cust.startDate} to {cust.endDate}</span>
                      </div>
                      <span className="font-semibold text-slate-800">
                        {cust.paxAdults} Adults {cust.paxChildren > 0 ? `, ${cust.paxChildren} Kids` : ''}
                      </span>
                    </div>
                  </div>

                  {/* ELEGANT & COMPACT FINANCIAL & INSTALLMENTS SECTION */}
                  {cust.totalAmount <= 0 ? (
                    <div className="mt-3 p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-amber-900">
                        <span className="flex items-center gap-1">
                          <IndianRupee className="w-3.5 h-3.5 text-amber-600" /> Package: <strong className="text-amber-950 font-black">Not Added</strong>
                        </span>
                        <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300/60">
                          EMI Pending
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-800 font-medium pt-0.5">
                        💡 Fill package amount & save to generate EMI installment schedule.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 p-3 rounded-xl bg-slate-50 /60 border border-slate-200 /80 text-xs space-y-2.5">
                      
                      {/* Financial Summary Row */}
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-700 flex items-center gap-1">
                          <IndianRupee className="w-3.5 h-3.5 text-emerald-600" /> Package: <strong className="text-slate-900">₹{cust.totalAmount.toLocaleString()}</strong>
                        </span>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-emerald-600 font-semibold">
                            Paid: ₹{m.paidAmount.toLocaleString()}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className={m.overdueCount > 0 ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                            Due: ₹{(m.total - m.paidAmount).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden flex">
                        <div 
                          className="bg-emerald-500 h-full transition-all"
                          style={{ width: `${m.percentPaid}%` }}
                        />
                        {m.overdueCount > 0 && (
                          <div 
                            className="bg-rose-500 h-full animate-pulse"
                            style={{ width: `${Math.round((m.overdueAmount / (m.total || 1)) * 100)}%` }}
                          />
                        )}
                      </div>

                      {/* Compact 3-Installment Rows */}
                      <div className="space-y-1.5 pt-1 border-t border-slate-200/60 /60">
                        {m.installments.map((inst, index) => {
                          const isPaid = inst.status === 'Paid';
                          const isOverdue = inst.status === 'Overdue';

                          // Dynamic clean labels: 1st Inst., 2nd Inst., 3rd Inst., 4th Inst., 5th Inst., etc.
                          const ordinal = 
                            index === 0 ? '1st' :
                            index === 1 ? '2nd' :
                            index === 2 ? '3rd' :
                            index === 3 ? '4th' :
                            index === 4 ? '5th' :
                            `${index + 1}th`;
                          const isLast = index === m.installments.length - 1 && m.installments.length > 1;
                          const shortLabel = inst.title || `${ordinal} Installment${isLast ? ' (Final)' : ''}`;

                          return (
                            <div 
                              key={inst.id}
                              className={`px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center justify-between gap-2 transition-all ${
                                isPaid 
                                  ? 'bg-emerald-50/70 /30 border-emerald-200 /60 text-slate-800 ' 
                                  : isOverdue 
                                  ? 'bg-rose-50 /40 border-rose-300 /80 text-rose-900  font-semibold' 
                                  : 'bg-white  border-slate-200  text-slate-700 '
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                {isPaid && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                                {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-bounce shrink-0" />}
                                {!isPaid && !isOverdue && <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                                
                                <span className="font-bold truncate">{shortLabel}:</span>
                                <span className="font-extrabold text-slate-900">₹{inst.amount.toLocaleString()}</span>
                                <span className="text-slate-400 text-[10px] hidden sm:inline">• Due {inst.dueDate}</span>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRecordPaymentClick(cust, inst);
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all shrink-0 ${
                                  isPaid
                                    ? 'bg-emerald-100 /50 text-emerald-800  hover:bg-emerald-200'
                                    : isOverdue
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white font-extrabold shadow-2xs'
                                    : 'bg-amber-500 hover:bg-amber-600 text-white'
                                }`}
                              >
                                {isPaid ? 'Paid ✓' : isOverdue ? '⚠️ Overdue' : 'Mark Paid'}
                              </button>
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  )}

                  {/* Hotel Voucher Summary & Hotel Dates Line */}
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-50 /60 border border-slate-100 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                        <Hotel className="w-3 h-3 text-slate-400" /> Hotel Vouchers
                      </span>
                      {vouchSummary.pending > 0 ? (
                        <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {vouchSummary.pending} Pending
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> All {vouchSummary.uploaded} Uploaded
                        </span>
                      )}
                    </div>

                    {/* Individual Hotel Names & Check-in / Check-out Dates */}
                    {custVouchers.length > 0 && (
                      <div className="pt-1 space-y-1 border-t border-slate-200/50 /50">
                        {custVouchers.map((v) => (
                          <div 
                            key={v.id} 
                            className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-white border border-slate-200/80"
                          >
                            <span className="font-bold text-slate-800 truncate max-w-[140px]" title={v.hotelName}>
                              {v.hotelName}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono font-medium">
                              {v.checkIn} → {v.checkOut}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                {/* Footer Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectCustomer(cust)}
                    className="flex-1 min-w-[90px] text-xs font-semibold py-2 px-3 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
                  >
                    View Details
                  </button>

                  <button
                    onClick={() => onNavigateToDayWise(cust.id)}
                    className="text-xs font-semibold py-2 px-3 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors flex items-center gap-1"
                    title="View Day Wise Trip Itinerary"
                  >
                    Day Wise
                    <ChevronRight className="w-3 h-3" />
                  </button>

                  {cust.status === 'Completed' ? (
                    <span className="text-[11px] font-black py-1.5 px-2.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Done
                    </span>
                  ) : (
                    <button
                      onClick={() => onCompleteTrip && onCompleteTrip(cust)}
                      className="text-xs font-bold py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-1"
                      title="Mark Trip as Complete"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Trip Complete
                    </button>
                  )}

                  <button
                    onClick={() => onOpenShareCustomer(cust)}
                    className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                    title="Share Details via WhatsApp or Email"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
