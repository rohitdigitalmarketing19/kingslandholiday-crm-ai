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
        <div className="p-4 rounded-xl bg-surface border border-line shadow-2xs">
          <div className="flex items-center justify-between text-secondary text-xs font-medium uppercase tracking-wide">
            <span>Total Revenue</span>
            <span className="p-1 rounded bg-brand-soft text-brand-ink">
              <IndianRupee className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-xl font-bold text-content mt-1 tabular-nums">
            ₹{overallFinancials.totalBookings.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-muted mt-0.5">{customers.length} confirmed packages</p>
        </div>

        {/* Collected Payments */}
        <div className="p-4 rounded-xl bg-surface border border-line shadow-2xs">
          <div className="flex items-center justify-between text-secondary text-xs font-medium uppercase tracking-wide">
            <span>Received Revenue</span>
            <span className="p-1 rounded bg-success-soft text-success-ink">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-xl font-bold text-success-ink mt-1 tabular-nums">
            ₹{overallFinancials.totalCollected.toLocaleString('en-IN')}
          </p>
          <div className="w-full bg-subtle h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-success-strong h-full rounded-full transition-all duration-300" 
              style={{ width: `${Math.round((overallFinancials.totalCollected / (overallFinancials.totalBookings || 1)) * 100)}%` }}
            />
          </div>
        </div>

        {/* OVERDUE PAYMENTS ALERT */}
        <div className={`p-4 rounded-xl border shadow-2xs transition-all ${
          overallFinancials.totalOverdue > 0
            ? 'bg-danger-soft/50 border-danger-line'
            : 'bg-surface border-line'
        }`}>
          <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide">
            <span className={overallFinancials.totalOverdue > 0 ? 'text-danger-ink flex items-center gap-1 font-semibold' : 'text-secondary'}>
              {overallFinancials.totalOverdue > 0 && <AlertTriangle className="w-3.5 h-3.5 text-danger-ink" />}
              Overdue EMIs
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-danger-soft text-danger-ink">
              {overallFinancials.overdueEmiCount} EMIs
            </span>
          </div>
          <p className="text-xl font-bold text-danger-ink mt-1 tabular-nums">
            ₹{overallFinancials.totalOverdue.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-danger-ink/90 mt-0.5 font-medium">
            {overallFinancials.totalOverdue > 0 ? `${overallFinancials.overdueCustomersCount} guest(s) pending payment` : 'All installments on time'}
          </p>
        </div>

        {/* Pending Balance */}
        <div className="p-4 rounded-xl bg-surface border border-line shadow-2xs">
          <div className="flex items-center justify-between text-secondary text-xs font-medium uppercase tracking-wide">
            <span>Pending Balance</span>
            <span className="p-1 rounded bg-warning-soft text-warning-ink">
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <p className="text-xl font-bold text-warning-ink mt-1 tabular-nums">
            ₹{overallFinancials.totalPending.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-muted mt-0.5">{overallFinancials.pendingEmiCount} future scheduled EMIs</p>
        </div>

      </div>

      {/* Live EMI Breakdown Counter Bar */}
      <div className="p-3 bg-inverse text-white rounded-xl flex flex-wrap items-center justify-between gap-2.5 text-sm shadow-xs">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-brand-ink" />
          <span className="font-semibold text-slate-200 text-sm">Operations Milestone Breakdown:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2.5 py-0.5 rounded-md bg-white/10 text-white font-medium">
            Total: <strong className="text-brand-ink font-semibold">{overallFinancials.totalEmiCount}</strong>
          </span>
          <span className="px-2.5 py-0.5 rounded-md bg-success-strong/20 text-success-ink font-medium border border-success-line/30">
            Paid: <strong className="font-semibold">{overallFinancials.paidEmiCount}</strong>
          </span>
          <span className={`px-2.5 py-0.5 rounded-md font-medium border ${overallFinancials.overdueEmiCount > 0 ? 'bg-danger-strong/20 text-danger-ink border-danger-line/40' : 'bg-white/10 text-slate-300 border-transparent'}`}>
            Overdue: <strong className="font-semibold">{overallFinancials.overdueEmiCount}</strong>
          </span>
          <span className="px-2.5 py-0.5 rounded-md bg-warning-strong/20 text-warning-ink font-medium border border-warning-line/30">
            Pending: <strong className="font-semibold">{overallFinancials.pendingEmiCount}</strong>
          </span>
        </div>
      </div>

      {/* Advanced Multi-Filter Controls */}
      <div className="p-3.5 rounded-xl bg-surface border border-line flex flex-wrap items-center justify-between gap-3 text-sm shadow-2xs">
        
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-secondary text-sm">Filter:</span>
          
          {/* Quick Payment Status Filter Pills */}
          <button
            onClick={() => setFilterPayment('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              filterPayment === 'all'
                ? 'bg-inverse text-white shadow-2xs'
                : 'bg-subtle text-secondary hover:bg-hover'
            }`}
          >
            All Packages ({customers.length})
          </button>

          <button
            onClick={() => setFilterPayment('overdue')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              filterPayment === 'overdue'
                ? 'bg-danger-strong text-white shadow-2xs'
                : 'bg-danger-soft text-danger-ink border border-danger-line hover:bg-danger-soft'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Overdue ({customers.filter(c => getCustomerPaymentMetrics(c).overdueCount > 0).length})
          </button>

          <button
            onClick={() => setFilterPayment('pending')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              filterPayment === 'pending'
                ? 'bg-warning-strong text-white shadow-2xs'
                : 'bg-warning-soft text-warning-ink border border-warning-line hover:bg-warning-soft'
            }`}
          >
            Pending Balance
          </button>

          <button
            onClick={() => setFilterPayment('paid')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              filterPayment === 'paid'
                ? 'bg-success-strong text-white shadow-2xs'
                : 'bg-success-soft text-success-ink border border-success-line hover:bg-success-soft'
            }`}
          >
            Fully Paid
          </button>

          {/* Select dropdowns for status & destination */}
          <div className="h-4 w-px bg-hover mx-1 hidden sm:block" />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-canvas border border-line font-medium text-content text-sm focus:border-brand-line outline-none cursor-pointer"
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
            className="px-2.5 py-1.5 rounded-lg bg-canvas border border-line font-medium text-content text-sm focus:border-brand-line outline-none cursor-pointer"
          >
            <option value="all">All Destinations</option>
            {destinations.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="text-sm text-secondary font-medium">
          Showing <span className="font-semibold text-content">{filteredCustomers.length}</span> records
        </div>
      </div>

      {/* Customer Cards / Expandable Rows */}
      {filteredCustomers.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-surface border border-dashed border-line space-y-2">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-semibold text-content text-sm">No Customer Packages Found</h3>
          <p className="text-sm text-muted max-w-sm mx-auto">
            No customer bookings match the active payment or trip filter criteria.
          </p>
          <button
            onClick={() => { setFilterPayment('all'); setFilterStatus('all'); setFilterDestination('all'); }}
            className="mt-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-brand text-white hover:bg-brand transition-colors cursor-pointer"
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
              cust.status === 'Upcoming' ? 'bg-success-soft text-success-ink border-success-line' :
              cust.status === 'In-Transit' ? 'bg-brand-soft text-brand-ink border-brand-line' :
              'bg-subtle text-content border-line';

            return (
              <div 
                key={cust.id}
                className={`bg-surface border rounded-xl transition-all font-sans overflow-hidden ${
                  isExpanded 
                    ? 'border-brand-line shadow-sm ring-1 ring-brand-line' 
                    : m.overdueCount > 0 
                    ? 'border-danger-line hover:border-danger-line shadow-2xs' 
                    : 'border-line hover:border-line hover:shadow-xs shadow-2xs'
                }`}
              >
                {/* Compact Row (Always visible - click to toggle complete card) */}
                <div 
                  onClick={() => toggleCustomerExpanded(cust.id)}
                  className={`px-4 py-3 cursor-pointer select-none transition-colors flex flex-wrap items-center justify-between gap-3 ${
                    isExpanded 
                      ? 'bg-brand-soft/40 border-b border-brand-line' 
                      : 'bg-surface hover:bg-canvas/70'
                  }`}
                >
                  {/* Left Side: Chevron, Booking ID, Name, Destination, Travel Dates, Financial Pills */}
                  <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                    <button
                      type="button"
                      className="p-1 rounded-md text-muted hover:text-secondary hover:bg-hover/60 transition-transform duration-200"
                      title={isExpanded ? "Collapse card" : "Expand full card"}
                    >
                      {isExpanded ? (
                        <ChevronDown size={16} className="text-brand-ink transform rotate-180 transition-transform duration-200" />
                      ) : (
                        <ChevronRight size={16} className="text-muted group-hover:text-secondary transition-transform duration-200" />
                      )}
                    </button>

                    <span className="text-sm font-mono font-semibold text-content bg-subtle px-2 py-0.5 rounded border border-line shrink-0">
                      #{cust.bookingId}
                    </span>

                    {isNewTrip && (
                      <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-warning-soft text-warning-ink border border-warning-line shrink-0">
                        New
                      </span>
                    )}

                    <span className={`text-xs px-2 py-0.5 rounded font-medium border shrink-0 ${statusBadge}`}>
                      {cust.status}
                    </span>

                    {/* Customer Avatar & Name */}
                    <div className="flex items-center gap-1.5 min-w-0 pr-1">
                      <div className="w-5 h-5 rounded-full bg-brand-soft text-brand-ink font-semibold text-xs flex items-center justify-center shrink-0">
                        {cust.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-content text-sm truncate max-w-[150px] sm:max-w-[200px]">
                        {cust.name}
                      </span>
                    </div>

                    {/* Destination Badge */}
                    <div className="hidden sm:flex items-center gap-1 text-sm text-brand-ink font-medium bg-brand-soft/70 border border-brand-line px-2 py-0.5 rounded shrink-0">
                      <MapPin size={11} className="text-brand-ink" />
                      <span>{cust.destination}</span>
                    </div>

                    {/* Travel Dates & Pax (Compact row summary) */}
                    <div className="hidden md:flex items-center gap-2 text-xs text-secondary shrink-0">
                      <span>📅 {cust.startDate}</span>
                      <span>·</span>
                      <span>{cust.paxAdults} Adults{cust.paxChildren > 0 ? `, ${cust.paxChildren} Kids` : ''}</span>
                    </div>

                    {/* Quick Financial Status Badge in Row */}
                    {cust.totalAmount > 0 ? (
                      <div className="hidden lg:flex items-center gap-1.5 shrink-0">
                        <span className="text-xs font-semibold text-content">
                          ₹{cust.totalAmount.toLocaleString('en-IN')}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded font-medium border ${
                          m.overdueCount > 0 
                            ? 'bg-danger-soft text-danger-ink border-danger-line'
                            : m.overallPaymentStatus === 'Fully Paid'
                            ? 'bg-success-soft text-success-ink border-success-line'
                            : 'bg-warning-soft text-warning-ink border-warning-line'
                        }`}>
                          {m.overdueCount > 0 ? `${m.overdueCount} Overdue` : m.overallPaymentStatus === 'Fully Paid' ? 'Fully Paid' : `Paid ₹${m.paidAmount.toLocaleString('en-IN')}`}
                        </span>
                      </div>
                    ) : (
                      <span className="hidden lg:inline text-xs text-warning-ink bg-warning-soft px-2 py-0.5 rounded border border-warning-line shrink-0">
                        EMI Pending
                      </span>
                    )}

                    {/* Quick Voucher Badge */}
                    <div className="hidden xl:flex items-center gap-1 shrink-0">
                      {vouchSummary.pending > 0 ? (
                        <span className="text-xs font-semibold text-warning-ink bg-warning-soft px-2 py-0.5 rounded border border-warning-line flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> {vouchSummary.pending} Vouchers Pending
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-success-ink bg-success-soft px-2 py-0.5 rounded border border-success-line flex items-center gap-1">
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
                      className="px-2.5 py-1.5 text-sm font-medium rounded-lg bg-subtle hover:bg-hover text-content transition-colors cursor-pointer"
                    >
                      Details
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToDayWise(cust.id);
                      }}
                      className="px-2.5 py-1.5 text-sm font-medium rounded-lg bg-brand-soft hover:bg-brand-soft text-brand-ink border border-brand-line transition-colors flex items-center gap-1 cursor-pointer"
                      title="View Day Wise Trip Itinerary"
                    >
                      <span>Day Wise</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>

                    {cust.status === 'Completed' ? (
                      <span className="text-xs font-medium py-1 px-2 rounded-lg bg-success-soft text-success-ink border border-success-line flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-success-ink" /> Done
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onCompleteTrip) onCompleteTrip(cust);
                        }}
                        className="text-sm font-medium py-1.5 px-2.5 rounded-lg bg-success-strong hover:bg-success-strong text-white shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
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
                      className="p-1.5 rounded-lg bg-canvas hover:bg-subtle text-secondary border border-line transition-colors cursor-pointer"
                      title="Share Details"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Complete Card Body (Visible when Expanded) */}
                {isExpanded && (
                  <div className="p-5 bg-surface space-y-4 border-t border-line animate-in fade-in slide-in-from-top-2 duration-200">
                    
                    {/* Customer Info & Contact Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-canvas border border-line text-sm">
                      <div>
                        <span className="text-xs text-muted font-medium uppercase tracking-wide block">Contact Phone</span>
                        <div className="flex items-center gap-1 text-content font-mono font-medium text-sm mt-0.5">
                          <Phone className="w-3.5 h-3.5 text-muted" />
                          <span>{cust.phone || 'Not specified'}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-muted font-medium uppercase tracking-wide block">Email Address</span>
                        <div className="flex items-center gap-1 text-content font-medium text-sm mt-0.5 truncate">
                          <Mail className="w-3.5 h-3.5 text-muted shrink-0" />
                          <span className="truncate">{cust.email || 'Not specified'}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-muted font-medium uppercase tracking-wide block">Assigned Operations Manager</span>
                        <span className="font-semibold text-content text-sm mt-0.5 block">
                          {cust.assignedOpsManager || 'Ops Team'}
                        </span>
                      </div>
                    </div>

                    {/* Financial & Installments Section */}
                    {cust.totalAmount <= 0 ? (
                      <div className="p-3.5 rounded-xl bg-warning-soft border border-warning-line text-sm space-y-1">
                        <div className="flex items-center justify-between font-semibold text-warning-ink">
                          <span>Package Cost: Pending Quotation</span>
                          <span className="text-xs font-medium text-warning-ink bg-warning-soft px-2 py-0.5 rounded border border-warning-line">
                            EMI Schedule Pending
                          </span>
                        </div>
                        <p className="text-xs text-warning-ink">
                          Please update the lead quote price to generate the standard milestone payment schedule.
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-canvas/80 border border-line text-sm space-y-3">
                        {/* Financial Summary Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                          <span className="text-content text-sm">
                            Total Package Value: ₹{cust.totalAmount.toLocaleString('en-IN')}
                          </span>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-success-ink font-medium">
                              Received: ₹{m.paidAmount.toLocaleString('en-IN')} ({m.percentPaid}%)
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className={m.overdueCount > 0 ? 'text-danger-ink font-semibold' : 'text-secondary'}>
                              Balance Due: ₹{(m.total - m.paidAmount).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-hover h-2 rounded-full overflow-hidden flex">
                          <div 
                            className="bg-success-strong h-full transition-all duration-300"
                            style={{ width: `${m.percentPaid}%` }}
                          />
                          {m.overdueCount > 0 && (
                            <div 
                              className="bg-danger-strong h-full transition-all duration-300"
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
                                className={`p-3 rounded-lg border text-sm flex flex-col justify-between gap-2 transition-all ${
                                  isPaid 
                                    ? 'bg-success-soft/70 text-content border-success-line ring-1 ring-success-line' 
                                    : isOverdue 
                                    ? 'bg-danger-soft border-danger-line text-danger-ink shadow-2xs' 
                                    : 'bg-surface border-line text-content'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-semibold text-content text-xs truncate">
                                    {shortLabel}
                                  </span>
                                  {isPaid ? (
                                    <span className="text-xs font-bold text-success-ink bg-success-soft px-1.5 py-0.5 rounded">
                                      PAID ✓
                                    </span>
                                  ) : isOverdue ? (
                                    <span className="text-xs font-bold text-danger-ink bg-danger-soft px-1.5 py-0.5 rounded">
                                      OVERDUE
                                    </span>
                                  ) : (
                                    <span className="text-xs font-medium text-secondary bg-subtle px-1.5 py-0.5 rounded">
                                      DUE
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center justify-between gap-2 pt-1 border-t border-line">
                                  <span className="font-bold text-content text-sm">
                                    ₹{inst.amount.toLocaleString('en-IN')}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onRecordPaymentClick(cust, inst);
                                    }}
                                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                                      isPaid
                                        ? 'bg-success-soft text-success-ink hover:bg-success-soft'
                                        : isOverdue
                                        ? 'bg-danger-strong hover:bg-danger-strong text-white shadow-2xs'
                                        : 'bg-brand hover:bg-brand text-white shadow-2xs'
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
                    <div className="p-3.5 rounded-xl bg-canvas border border-line text-sm flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Hotel className="w-4 h-4 text-brand-ink" />
                        <span className="font-semibold text-content">Accommodation Vouchers:</span>
                        <span className="text-secondary">
                          {vouchSummary.uploaded} uploaded of {vouchSummary.total || 0} total required
                        </span>
                      </div>
                      {vouchSummary.pending > 0 ? (
                        <span className="text-sm font-semibold text-warning-ink bg-warning-soft px-2.5 py-1 rounded-lg border border-warning-line flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" /> {vouchSummary.pending} Vouchers Pending Upload
                        </span>
                      ) : (
                        <span className="text-sm font-semibold text-success-ink bg-success-soft px-2.5 py-1 rounded-lg border border-success-line flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> All Hotel Vouchers Confirmed
                        </span>
                      )}
                    </div>

                    {/* Full Action Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectCustomer(cust)}
                          className="text-sm font-medium py-2 px-3.5 rounded-lg bg-inverse hover:bg-inverse text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <span>Open Full Customer Drawer</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => onNavigateToDayWise(cust.id)}
                          className="text-sm font-medium py-2 px-3.5 rounded-lg bg-brand-soft hover:bg-brand-soft text-brand-ink border border-brand-line transition-colors flex items-center gap-1.5 cursor-pointer"
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
                            className="text-sm font-medium py-2 px-3.5 rounded-lg bg-success-strong hover:bg-success-strong text-white shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Complete Trip</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onOpenShareCustomer(cust)}
                          className="text-sm font-medium py-2 px-3 rounded-lg bg-canvas hover:bg-subtle text-content border border-line transition-colors flex items-center gap-1.5 cursor-pointer"
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
