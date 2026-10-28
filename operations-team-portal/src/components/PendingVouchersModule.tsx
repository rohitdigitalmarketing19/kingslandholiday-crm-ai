import React, { useState } from 'react';
import { 
  FileClock, 
  Hotel, 
  Calendar, 
  AlertTriangle, 
  Upload, 
  Send, 
  Clock, 
  Building2, 
  User, 
  CheckCircle2, 
  ShieldAlert,
  BellRing,
  Filter,
  Search,
  ArrowRight,
  Eye,
  Package,
  Layers,
  Sparkles,
  Trash2
} from 'lucide-react';
import { HotelVoucher } from '../types';

interface PendingVouchersModuleProps {
  vouchers: HotelVoucher[];
  searchTerm: string;
  onUploadVoucherClick: (voucher: HotelVoucher) => void;
  onSendSupplierReminder: (voucher: HotelVoucher) => void;
  onOpenCreateVoucherClick?: (voucher?: HotelVoucher) => void;
  onViewVoucherClick?: (voucher: HotelVoucher) => void;
  onSendMailToHotel?: (voucher: HotelVoucher, allVouchersInPackage?: HotelVoucher[]) => void;
  onDeleteVoucher?: (voucherId: string) => void;
}

export const PendingVouchersModule: React.FC<PendingVouchersModuleProps> = ({
  vouchers,
  searchTerm,
  onUploadVoucherClick,
  onSendSupplierReminder,
  onOpenCreateVoucherClick,
  onViewVoucherClick,
  onSendMailToHotel,
  onDeleteVoucher,
}) => {
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [customerSearch, setCustomerSearch] = useState<string>('');

  // Group all vouchers (pending & uploaded) by customer package bookingId or customerName
  const packageGroupsMap: Record<string, {
    bookingId: string;
    customerName: string;
    city: string;
    allVouchers: HotelVoucher[];
    pendingVouchers: HotelVoucher[];
    createdVouchers: HotelVoucher[];
  }> = {};

  vouchers.forEach((v) => {
    const key = v.bookingId || v.customerId || v.customerName;
    if (!packageGroupsMap[key]) {
      packageGroupsMap[key] = {
        bookingId: v.bookingId,
        customerName: v.customerName,
        city: v.city,
        allVouchers: [],
        pendingVouchers: [],
        createdVouchers: [],
      };
    }
    packageGroupsMap[key].allVouchers.push(v);
    if (v.status === 'Pending') {
      packageGroupsMap[key].pendingVouchers.push(v);
    } else {
      packageGroupsMap[key].createdVouchers.push(v);
    }
  });

  const packageGroups = Object.values(packageGroupsMap);

  // Extract unique customer names for filter dropdown
  const customerList = Array.from(new Set(vouchers.map((v) => v.customerName))).sort();

  // Total pending vouchers count across all packages
  const totalPendingCount = vouchers.filter((v) => v.status === 'Pending').length;
  const urgentCount = vouchers.filter((v) => v.status === 'Pending' && (v.urgency === 'Urgent' || v.urgency === 'High')).length;

  // Filter packages based on search & filters
  const filteredPackageGroups = packageGroups.filter((pkg) => {
    const matchesGlobalSearch =
      pkg.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pkg.allVouchers.some((v) => v.hotelName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCustomerSelect =
      selectedCustomer === 'all' || pkg.customerName === selectedCustomer;

    const matchesCustomerSearch =
      !customerSearch.trim() ||
      pkg.customerName.toLowerCase().includes(customerSearch.toLowerCase().trim());

    const matchesUrgency =
      urgencyFilter === 'all' ||
      pkg.pendingVouchers.some((v) => v.urgency === urgencyFilter);

    return matchesGlobalSearch && matchesCustomerSelect && matchesCustomerSearch && matchesUrgency;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Alert Stats */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-line via-success-strong to-line text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-success-line/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-success-strong/20 text-success-ink backdrop-blur-xs border border-success-line/30">
              <FileClock className="w-5 h-5" />
            </span>
            <h3 className="font-semibold text-xl">Package Hotel Vouchers Action Desk</h3>
          </div>
          <p className="text-sm text-slate-300 mt-1 max-w-xl">
            Track hotel voucher requirements per customer package. Easily create & upload confirmed hotel vouchers matching package hotels.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onOpenCreateVoucherClick && (
            <button
              onClick={() => onOpenCreateVoucherClick()}
              className="px-4 py-2.5 rounded-xl bg-success-strong hover:bg-success-strong text-content font-semibold text-sm shadow-sm transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-content" />
              <span>Create Hotel Voucher (PDF)</span>
            </button>
          )}

          <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-center">
            <span className="text-xs uppercase font-bold text-success-ink block">Total Pending</span>
            <span className="text-xl font-semibold">{totalPendingCount}</span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-danger-soft/50 backdrop-blur-md border border-danger-line/30 text-center">
            <span className="text-xs uppercase font-bold text-danger-ink block">Urgent</span>
            <span className="text-xl font-semibold text-danger-ink">{urgentCount}</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl bg-surface border border-line shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm font-bold text-content">
            <User className="w-4 h-4 text-success-ink" />
            <span>Filter Customer Package:</span>
          </div>

          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-sm font-semibold bg-subtle text-content border border-line focus:outline-none focus:ring-2 focus:ring-success-line max-w-[200px]"
          >
            <option value="all">All Packages ({packageGroups.length})</option>
            {customerList.map((cName) => (
              <option key={cName} value={cName}>
                {cName}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search customer name..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm rounded-xl bg-canvas text-content border border-line focus:outline-none focus:ring-2 focus:ring-success-line w-[180px]"
            />
            {customerSearch && (
              <button
                onClick={() => setCustomerSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted hover:text-secondary"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Urgency Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-secondary text-xs uppercase mr-1">Urgency:</span>
          {['all', 'Urgent', 'High', 'Medium', 'Low'].map((level) => (
            <button
              key={level}
              onClick={() => setUrgencyFilter(level)}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                urgencyFilter === level
                  ? 'bg-inverse text-white shadow-xs'
                  : 'bg-subtle text-secondary hover:bg-hover'
              }`}
            >
              {level === 'all' ? 'All' : level}
            </button>
          ))}
        </div>
      </div>

      {/* Package Groups List */}
      {filteredPackageGroups.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-surface border border-dashed border-line space-y-3">
          <CheckCircle2 className="w-12 h-12 text-success-ink mx-auto" />
          <h3 className="font-semibold text-content text-base">No Matching Package Vouchers Found</h3>
          <p className="text-sm text-secondary max-w-sm mx-auto">
            Try adjusting your search query or customer name filter to view other converted lead packages.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredPackageGroups.map((pkg) => {
            const totalRequired = pkg.allVouchers.length;
            const createdCount = pkg.createdVouchers.length;
            const pendingCount = pkg.pendingVouchers.length;
            const percentCreated = totalRequired > 0 ? Math.round((createdCount / totalRequired) * 100) : 0;
            const isFullyCreated = createdCount === totalRequired && totalRequired > 0;

            return (
              <div
                key={`pkg-${pkg.bookingId}-${pkg.customerName}`}
                className="border-2 border-line rounded-xl bg-surface shadow-sm overflow-hidden space-y-0"
              >
                {/* PACKAGE VOUCHER HEADER BANNER (Shows exact status e.g. 2 of 4 vouchers created) */}
                <div className="p-5 bg-gradient-to-r from-line via-line to-line text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Left: Package Info */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-success-strong/20 text-success-ink font-mono text-sm font-semibold border border-success-line/30">
                        {pkg.bookingId}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-white/10 text-slate-300 font-bold text-sm">
                        Guest: {pkg.customerName}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-warning-strong/20 text-warning-ink font-bold text-sm flex items-center gap-1">
                        <Hotel className="w-3.5 h-3.5" />
                        {totalRequired} {totalRequired === 1 ? 'Hotel' : 'Hotels'} in Package
                      </span>
                    </div>

                    <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                      <span>Package for {pkg.customerName}</span>
                      <span className="text-muted text-sm font-medium">({pkg.city || 'Tour Circuit'})</span>
                    </h4>
                  </div>

                  {/* Right: Package Voucher Status Badge & Progress Bar */}
                  <div className="min-w-[240px] space-y-1.5 p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-right">
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span className="text-slate-300">Voucher Status:</span>
                      <span className={isFullyCreated ? 'text-success-ink' : 'text-warning-ink'}>
                        {createdCount} of {totalRequired} Vouchers Created ({percentCreated}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          isFullyCreated ? 'bg-success-strong' : 'bg-warning-strong'
                        }`}
                        style={{ width: `${percentCreated}%` }}
                      />
                    </div>

                    <p className="text-xs text-muted font-medium">
                      {pendingCount > 0 
                        ? `⚠️ ${pendingCount} ${pendingCount === 1 ? 'voucher' : 'vouchers'} pending action` 
                        : '✅ All package hotel vouchers created'}
                    </p>
                  </div>

                </div>

                {/* INDIVIDUAL HOTEL VOUCHERS LIST UNDER THIS PACKAGE */}
                <div className="p-5 bg-canvas/50 space-y-3">
                  <h5 className="text-sm font-semibold uppercase text-secondary tracking-wider">
                    Package Hotel Breakdown ({pkg.allVouchers.length} Hotels):
                  </h5>

                  <div className="space-y-3">
                    {pkg.allVouchers.map((v, hIdx) => {
                      const isPending = v.status === 'Pending';
                      return (
                        <div
                          key={v.id || `vouch-${hIdx}`}
                          className={`p-4 rounded-xl bg-surface border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-2xs ${
                            isPending 
                              ? 'border-warning-line/80 bg-warning-soft/30' 
                              : 'border-success-line/80 bg-success-soft/20'
                          }`}
                        >
                          {/* Hotel Details */}
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold font-mono text-content bg-subtle px-2 py-0.5 rounded">
                                Hotel #{hIdx + 1}
                              </span>

                              {/* Status Badge */}
                              <span className={`text-sm px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                                isPending
                                  ? 'bg-warning-soft text-warning-ink border border-warning-line'
                                  : 'bg-success-soft text-success-ink border border-success-line'
                              }`}>
                                {isPending ? '🟡 Pending Action' : '🟢 Created & Confirmed'}
                              </span>

                              <span className="text-sm text-secondary font-semibold ml-auto">
                                Check-In: <strong className="text-content font-mono">{v.checkIn}</strong>
                              </span>
                            </div>

                            <div className="flex items-start gap-2">
                              <Hotel className={`w-5 h-5 mt-0.5 shrink-0 ${isPending ? 'text-warning-ink' : 'text-success-ink'}`} />
                              <div>
                                <h5 className="font-semibold text-content text-base">
                                  {v.hotelName} <span className="text-secondary text-sm font-medium">({v.city})</span>
                                </h5>
                                <p className="text-sm text-secondary mt-0.5 font-medium">
                                  {v.nights} {v.nights === 1 ? 'Night' : 'Nights'} • Room: <strong>{v.roomType}</strong> • Meal: {v.mealPlan}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-line">
                            {isPending ? (
                              <>
                                {onOpenCreateVoucherClick && (
                                  <button
                                    onClick={() => onOpenCreateVoucherClick(v)}
                                    className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-success-strong hover:bg-success-strong text-white shadow-xs transition-colors flex items-center gap-1.5"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-warning-ink" />
                                    <span>Create Voucher (PDF)</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => onUploadVoucherClick(v)}
                                  className="px-3.5 py-2 rounded-xl text-sm font-bold bg-warning-strong hover:bg-warning-strong text-white shadow-xs transition-colors flex items-center gap-1.5"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>Upload Voucher</span>
                                </button>

                                {onDeleteVoucher && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to delete this pending hotel voucher for "${v.hotelName}"?`)) {
                                        onDeleteVoucher(v.id);
                                      }
                                    }}
                                    className="px-3.5 py-2 rounded-xl text-sm font-bold bg-danger-soft hover:bg-danger-soft text-danger-ink border border-danger-line transition-colors flex items-center gap-1.5"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete</span>
                                  </button>
                                )}
                              </>
                            ) : (
                              <>
                                {onViewVoucherClick && (
                                  <button
                                    onClick={() => onViewVoucherClick(v)}
                                    className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-inverse hover:bg-inverse text-white shadow-xs transition-colors flex items-center gap-1.5"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-success-ink" />
                                    <span>View Voucher</span>
                                  </button>
                                )}

                                {onOpenCreateVoucherClick && (
                                  <button
                                    onClick={() => onOpenCreateVoucherClick(v)}
                                    className="px-3 py-2 rounded-xl text-sm font-bold bg-subtle text-content hover:bg-hover transition-colors flex items-center gap-1.5"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-success-ink" />
                                    <span>Edit Voucher</span>
                                  </button>
                                )}

                                {onDeleteVoucher && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to delete this confirmed hotel voucher for "${v.hotelName}"?`)) {
                                        onDeleteVoucher(v.id);
                                      }
                                    }}
                                    className="px-3.5 py-2 rounded-xl text-sm font-bold bg-danger-soft hover:bg-danger-soft text-danger-ink border border-danger-line transition-colors flex items-center gap-1.5"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Delete</span>
                                  </button>
                                )}
                              </>
                            )}

                            {onSendMailToHotel && (
                              <button
                                onClick={() => onSendMailToHotel(v, pkg.allVouchers)}
                                className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-brand hover:bg-brand text-white shadow-xs transition-colors flex items-center gap-1.5"
                                title="Generate and send booking confirmation email to hotel"
                              >
                                <Send className="w-3.5 h-3.5 text-brand-ink" />
                                <span>Send Mail to Hotel</span>
                              </button>
                            )}

                            <button
                              onClick={() => onSendSupplierReminder(v)}
                              className="px-3 py-2 rounded-xl text-sm font-semibold bg-subtle text-secondary hover:bg-hover transition-colors flex items-center gap-1"
                            >
                              <BellRing className="w-3.5 h-3.5 text-warning-ink" />
                              <span>Reminder</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
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
