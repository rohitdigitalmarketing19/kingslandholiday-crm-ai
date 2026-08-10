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
  Sparkles
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
}

export const PendingVouchersModule: React.FC<PendingVouchersModuleProps> = ({
  vouchers,
  searchTerm,
  onUploadVoucherClick,
  onSendSupplierReminder,
  onOpenCreateVoucherClick,
  onViewVoucherClick,
  onSendMailToHotel,
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
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-teal-800/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-500/20 text-teal-300 backdrop-blur-xs border border-teal-400/30">
              <FileClock className="w-5 h-5" />
            </span>
            <h3 className="font-extrabold text-xl">Package Hotel Vouchers Action Desk</h3>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Track hotel voucher requirements per customer package. Easily create & upload confirmed hotel vouchers matching package hotels.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onOpenCreateVoucherClick && (
            <button
              onClick={() => onOpenCreateVoucherClick()}
              className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs shadow-md transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>Create Hotel Voucher (PDF)</span>
            </button>
          )}

          <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-center">
            <span className="text-[10px] uppercase font-bold text-teal-300 block">Total Pending</span>
            <span className="text-xl font-black">{totalPendingCount}</span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-red-950/50 backdrop-blur-md border border-red-400/30 text-center">
            <span className="text-[10px] uppercase font-bold text-red-300 block">Urgent</span>
            <span className="text-xl font-black text-red-200">{urgentCount}</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <User className="w-4 h-4 text-teal-600" />
            <span>Filter Customer Package:</span>
          </div>

          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 max-w-[200px]"
          >
            <option value="all">All Packages ({packageGroups.length})</option>
            {customerList.map((cName) => (
              <option key={cName} value={cName}>
                {cName}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer name..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 text-slate-800 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 w-[180px]"
            />
            {customerSearch && (
              <button
                onClick={() => setCustomerSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Urgency Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-500 text-[11px] uppercase mr-1">Urgency:</span>
          {['all', 'Urgent', 'High', 'Medium', 'Low'].map((level) => (
            <button
              key={level}
              onClick={() => setUrgencyFilter(level)}
              className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all ${
                urgencyFilter === level
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {level === 'all' ? 'All' : level}
            </button>
          ))}
        </div>
      </div>

      {/* Package Groups List */}
      {filteredPackageGroups.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-dashed border-slate-300 space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="font-extrabold text-slate-800 text-base">No Matching Package Vouchers Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
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
                className="border-2 border-slate-200 rounded-3xl bg-white shadow-sm overflow-hidden space-y-0"
              >
                {/* PACKAGE VOUCHER HEADER BANNER (Shows exact status e.g. 2 of 4 vouchers created) */}
                <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Left: Package Info */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-teal-500/20 text-teal-300 font-mono text-xs font-black border border-teal-400/30">
                        {pkg.bookingId}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-white/10 text-slate-300 font-bold text-xs">
                        Guest: {pkg.customerName}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 font-bold text-xs flex items-center gap-1">
                        <Hotel className="w-3.5 h-3.5" />
                        {totalRequired} {totalRequired === 1 ? 'Hotel' : 'Hotels'} in Package
                      </span>
                    </div>

                    <h4 className="text-lg font-black text-white flex items-center gap-2">
                      <span>Package for {pkg.customerName}</span>
                      <span className="text-slate-400 text-xs font-medium">({pkg.city || 'Tour Circuit'})</span>
                    </h4>
                  </div>

                  {/* Right: Package Voucher Status Badge & Progress Bar */}
                  <div className="min-w-[240px] space-y-1.5 p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-right">
                    <div className="flex items-center justify-between text-xs font-extrabold">
                      <span className="text-slate-300">Voucher Status:</span>
                      <span className={isFullyCreated ? 'text-emerald-400' : 'text-amber-300'}>
                        {createdCount} of {totalRequired} Vouchers Created ({percentCreated}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          isFullyCreated ? 'bg-emerald-400' : 'bg-amber-400'
                        }`}
                        style={{ width: `${percentCreated}%` }}
                      />
                    </div>

                    <p className="text-[11px] text-slate-400 font-medium">
                      {pendingCount > 0 
                        ? `⚠️ ${pendingCount} ${pendingCount === 1 ? 'voucher' : 'vouchers'} pending action` 
                        : '✅ All package hotel vouchers created'}
                    </p>
                  </div>

                </div>

                {/* INDIVIDUAL HOTEL VOUCHERS LIST UNDER THIS PACKAGE */}
                <div className="p-5 bg-slate-50/50 space-y-3">
                  <h5 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                    Package Hotel Breakdown ({pkg.allVouchers.length} Hotels):
                  </h5>

                  <div className="space-y-3">
                    {pkg.allVouchers.map((v, hIdx) => {
                      const isPending = v.status === 'Pending';
                      return (
                        <div
                          key={v.id || `vouch-${hIdx}`}
                          className={`p-4 rounded-2xl bg-white border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-2xs ${
                            isPending 
                              ? 'border-amber-300/80 bg-amber-50/30' 
                              : 'border-emerald-300/80 bg-emerald-50/20'
                          }`}
                        >
                          {/* Hotel Details */}
                          <div className="space-y-2 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-extrabold font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                Hotel #{hIdx + 1}
                              </span>

                              {/* Status Badge */}
                              <span className={`text-xs px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                                isPending
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              }`}>
                                {isPending ? '🟡 Pending Action' : '🟢 Created & Confirmed'}
                              </span>

                              <span className="text-xs text-slate-500 font-semibold ml-auto">
                                Check-In: <strong className="text-slate-900 font-mono">{v.checkIn}</strong>
                              </span>
                            </div>

                            <div className="flex items-start gap-2">
                              <Hotel className={`w-5 h-5 mt-0.5 shrink-0 ${isPending ? 'text-amber-600' : 'text-emerald-600'}`} />
                              <div>
                                <h5 className="font-extrabold text-slate-900 text-base">
                                  {v.hotelName} <span className="text-slate-500 text-xs font-medium">({v.city})</span>
                                </h5>
                                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                                  {v.nights} {v.nights === 1 ? 'Night' : 'Nights'} • Room: <strong>{v.roomType}</strong> • Meal: {v.mealPlan}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                            {isPending ? (
                              <>
                                {onOpenCreateVoucherClick && (
                                  <button
                                    onClick={() => onOpenCreateVoucherClick(v)}
                                    className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition-colors flex items-center gap-1.5"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                    <span>Create Voucher (PDF)</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => onUploadVoucherClick(v)}
                                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs transition-colors flex items-center gap-1.5"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>Upload Voucher</span>
                                </button>
                              </>
                            ) : (
                              <>
                                {onViewVoucherClick && (
                                  <button
                                    onClick={() => onViewVoucherClick(v)}
                                    className="px-3.5 py-2 rounded-xl text-xs font-extrabold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors flex items-center gap-1.5"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-teal-400" />
                                    <span>View Voucher</span>
                                  </button>
                                )}

                                {onOpenCreateVoucherClick && (
                                  <button
                                    onClick={() => onOpenCreateVoucherClick(v)}
                                    className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                                    <span>Edit Voucher</span>
                                  </button>
                                )}
                              </>
                            )}

                            {onSendMailToHotel && (
                              <button
                                onClick={() => onSendMailToHotel(v, pkg.allVouchers)}
                                className="px-3.5 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-colors flex items-center gap-1.5"
                                title="Generate and send booking confirmation email to hotel"
                              >
                                <Send className="w-3.5 h-3.5 text-indigo-200" />
                                <span>Send Mail to Hotel</span>
                              </button>
                            )}

                            <button
                              onClick={() => onSendSupplierReminder(v)}
                              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors flex items-center gap-1"
                            >
                              <BellRing className="w-3.5 h-3.5 text-amber-600" />
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
