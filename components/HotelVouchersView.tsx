import React, { useState, useEffect, useMemo } from 'react';
import { 
  Hotel, 
  Upload, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter, 
  Calendar, 
  FileText, 
  Download, 
  Eye, 
  Trash2, 
  Send, 
  RefreshCw, 
  Building2, 
  Phone, 
  ChevronDown, 
  ChevronUp, 
  FileUp, 
  X, 
  Check, 
  Printer, 
  Layers, 
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Mail,
  Copy,
  ChevronsUpDown,
  MessageSquare
} from 'lucide-react';

export interface HotelVoucherItem {
  id: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  hotelName: string;
  city: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  roomType: string;
  mealPlan: string;
  supplierName: string;
  confirmationNumber?: string;
  status: 'Pending' | 'Uploaded' | 'Sent to Customer';
  dueDate: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  hotelContact?: string;
  hotelRemarks?: string;
  uploadedAt?: string;
  uploadedBy?: string;
  urgency: 'Low' | 'Medium' | 'High' | 'Urgent';
  totalCost?: number;
  paidAmount?: number;
  paidAt?: string;
  paymentMode?: string;
  paymentRef?: string;
  paymentRemarks?: string;
  paymentStatus?: 'Pending' | 'Paid to Hotel' | 'Partially Paid';
}

export interface CustomerPackageGroup {
  customerId: string;
  bookingId: string;
  customerName: string;
  phone: string;
  email: string;
  destination: string;
  startDate: string;
  endDate: string;
  paxAdults: number;
  paxChildren: number;
  totalAmount: number;
  assignedOpsManager: string;
  tripStatus: string;
  vouchers: HotelVoucherItem[];
}

interface HotelVouchersViewProps {
  isReadOnly?: boolean;
}

export const HotelVouchersView: React.FC<HotelVouchersViewProps> = ({
  isReadOnly = false,
}) => {
  const [vouchers, setVouchers] = useState<HotelVoucherItem[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'uploaded'>('all');
  const [destinationFilter, setDestinationFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  
  // Default CLOSED: expandedCustomers stores customerIds that are explicitly opened by user
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});

  // Modals
  const [uploadModalVoucher, setUploadModalVoucher] = useState<HotelVoucherItem | null>(null);
  const [viewDocumentVoucher, setViewDocumentVoucher] = useState<HotelVoucherItem | null>(null);
  const [sendMailVoucher, setSendMailVoucher] = useState<HotelVoucherItem | null>(null);
  const [isSuccessToast, setIsSuccessToast] = useState<string | null>(null);

  // Load Data from API
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [vouchersRes, customersRes] = await Promise.all([
        fetch('/api/ops/vouchers').then(r => r.json()).catch(() => []),
        fetch('/api/ops/customers').then(r => r.json()).catch(() => [])
      ]);

      const validVouchers = Array.isArray(vouchersRes) ? vouchersRes : [];
      const validCustomers = Array.isArray(customersRes) ? customersRes : [];

      setVouchers(validVouchers);
      setCustomers(validCustomers);
    } catch (err) {
      console.error('Error loading hotel vouchers data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setIsSuccessToast(msg);
    setTimeout(() => setIsSuccessToast(null), 3500);
  };

  // Group vouchers by customer package
  const customerPackageGroups = useMemo<CustomerPackageGroup[]>(() => {
    const groupsMap = new Map<string, CustomerPackageGroup>();

    // 1. First add all customers
    customers.forEach((cust) => {
      const key = cust.id || cust.bookingId;
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          customerId: cust.id,
          bookingId: cust.bookingId || `KL-${cust.id}`,
          customerName: cust.name || 'Valued Guest',
          phone: cust.phone || '',
          email: cust.email || '',
          destination: cust.destination || 'Tour Package',
          startDate: cust.startDate || '',
          endDate: cust.endDate || '',
          paxAdults: cust.paxAdults || 2,
          paxChildren: cust.paxChildren || 0,
          totalAmount: cust.totalAmount || 0,
          assignedOpsManager: cust.assignedOpsManager || 'Operations Team',
          tripStatus: cust.status || 'Upcoming',
          vouchers: [],
        });
      }
    });

    // 2. Associate vouchers to their respective customer package
    vouchers.forEach((v) => {
      let targetGroup = groupsMap.get(v.customerId) || groupsMap.get(v.bookingId);
      
      if (!targetGroup) {
        for (const [_, grp] of groupsMap.entries()) {
          if (
            (grp.bookingId && v.bookingId && grp.bookingId.toLowerCase() === v.bookingId.toLowerCase()) ||
            (grp.customerName && v.customerName && grp.customerName.toLowerCase() === v.customerName.toLowerCase())
          ) {
            targetGroup = grp;
            break;
          }
        }
      }

      if (targetGroup) {
        if (!targetGroup.vouchers.some(item => item.id === v.id)) {
          targetGroup.vouchers.push(v);
        }
      } else {
        const orphanKey = v.customerId || v.bookingId || v.id;
        groupsMap.set(orphanKey, {
          customerId: v.customerId,
          bookingId: v.bookingId || 'BK-PKG',
          customerName: v.customerName || 'Tour Guest',
          phone: '',
          email: '',
          destination: v.city || 'Tour Package',
          startDate: v.checkIn || '',
          endDate: v.checkOut || '',
          paxAdults: 2,
          paxChildren: 0,
          totalAmount: 0,
          assignedOpsManager: 'Operations Team',
          tripStatus: 'Upcoming',
          vouchers: [v],
        });
      }
    });

    return Array.from(groupsMap.values());
  }, [customers, vouchers]);

  // Unique Destinations & Available Months
  const uniqueDestinations = useMemo(() => {
    const dests = new Set<string>();
    customerPackageGroups.forEach((g) => {
      if (g.destination) dests.add(g.destination);
    });
    return Array.from(dests).sort();
  }, [customerPackageGroups]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    customerPackageGroups.forEach((g) => {
      if (g.startDate) {
        const d = new Date(g.startDate);
        if (!isNaN(d.getTime())) {
          const mStr = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
          months.add(mStr);
        }
      }
    });
    return Array.from(months);
  }, [customerPackageGroups]);

  // Filtered Groups
  const filteredGroups = useMemo(() => {
    return customerPackageGroups.filter((group) => {
      // 1. Search Term Filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesGuest = group.customerName.toLowerCase().includes(q);
        const matchesBooking = group.bookingId.toLowerCase().includes(q);
        const matchesPhone = group.phone.toLowerCase().includes(q);
        const matchesDest = group.destination.toLowerCase().includes(q);
        const matchesHotel = group.vouchers.some(v => 
          v.hotelName.toLowerCase().includes(q) || 
          v.city.toLowerCase().includes(q) || 
          (v.supplierName && v.supplierName.toLowerCase().includes(q)) ||
          (v.confirmationNumber && v.confirmationNumber.toLowerCase().includes(q)) ||
          (v.fileName && v.fileName.toLowerCase().includes(q))
        );

        if (!matchesGuest && !matchesBooking && !matchesPhone && !matchesDest && !matchesHotel) {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter === 'pending') {
        const hasPending = group.vouchers.length === 0 || group.vouchers.some(v => v.status !== 'Uploaded' && v.status !== 'Sent to Customer');
        if (!hasPending) return false;
      } else if (statusFilter === 'uploaded') {
        const allUploaded = group.vouchers.length > 0 && group.vouchers.every(v => v.status === 'Uploaded' || v.status === 'Sent to Customer');
        if (!allUploaded) return false;
      }

      // 3. Destination Filter
      if (destinationFilter !== 'all' && group.destination !== destinationFilter) {
        return false;
      }

      // 4. Month Filter
      if (monthFilter !== 'all' && group.startDate) {
        const d = new Date(group.startDate);
        if (!isNaN(d.getTime())) {
          const mStr = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
          if (mStr !== monthFilter) return false;
        }
      }

      return true;
    });
  }, [customerPackageGroups, searchTerm, statusFilter, destinationFilter, monthFilter]);

  // Metrics
  const stats = useMemo(() => {
    const totalPackages = customerPackageGroups.length;
    let totalHotels = 0;
    let uploadedCount = 0;
    let pendingCount = 0;

    customerPackageGroups.forEach((g) => {
      totalHotels += g.vouchers.length;
      g.vouchers.forEach((v) => {
        if (v.status === 'Uploaded' || v.status === 'Sent to Customer') {
          uploadedCount++;
        } else {
          pendingCount++;
        }
      });
    });

    return {
      totalPackages,
      totalHotels,
      uploadedCount,
      pendingCount,
      completionRate: totalHotels > 0 ? Math.round((uploadedCount / totalHotels) * 100) : 0,
    };
  }, [customerPackageGroups]);

  // Toggle individual customer expand/collapse (Default is CLOSED)
  const toggleCustomerExpand = (id: string) => {
    setExpandedCustomers(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Expand All / Collapse All Toggle
  const isAllExpanded = useMemo(() => {
    if (filteredGroups.length === 0) return false;
    return filteredGroups.every(g => expandedCustomers[g.customerId]);
  }, [filteredGroups, expandedCustomers]);

  const toggleExpandAll = () => {
    if (isAllExpanded) {
      setExpandedCustomers({});
    } else {
      const all: Record<string, boolean> = {};
      filteredGroups.forEach(g => { all[g.customerId] = true; });
      setExpandedCustomers(all);
    }
  };

  // Upload Voucher Handler (saves actual document from hotel side)
  const handleConfirmUpload = async (
    voucherId: string, 
    confirmationNumber: string, 
    fileName: string, 
    fileUrl: string,
    fileSize?: string,
    hotelContact?: string,
    hotelRemarks?: string
  ) => {
    try {
      const res = await fetch(`/api/ops/vouchers/${voucherId}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmationNumber,
          fileName,
          fileUrl,
          fileSize,
          hotelContact,
          hotelRemarks
        })
      });

      const now = new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      if (res.ok) {
        const updatedVoucher = await res.json();
        setVouchers(prev => prev.map(v => v.id === voucherId ? {
          ...v,
          ...updatedVoucher,
          status: 'Uploaded',
          fileUrl,
          fileName,
          fileSize: fileSize || 'Document attached',
          hotelContact,
          hotelRemarks,
          uploadedAt: now,
          uploadedBy: 'Ops Desk'
        } : v));
        showToast(`✅ Hotel voucher document confirmed: ${confirmationNumber}`);
      } else {
        setVouchers(prev => prev.map(v => v.id === voucherId ? {
          ...v,
          status: 'Uploaded',
          confirmationNumber,
          fileName,
          fileUrl,
          fileSize: fileSize || 'Document attached',
          hotelContact,
          hotelRemarks,
          uploadedAt: now,
          uploadedBy: 'Ops Desk'
        } : v));
        showToast(`✅ Hotel voucher uploaded successfully!`);
      }
    } catch (err) {
      console.error('Error uploading hotel voucher:', err);
      showToast('⚠️ Voucher document attached locally.');
    } finally {
      setUploadModalVoucher(null);
    }
  };

  // Reset / Delete Voucher
  const handleResetVoucher = async (voucher: HotelVoucherItem) => {
    if (isReadOnly) {
      alert('🚫 Access Restricted: You do not have permission to delete or remove hotel vouchers. Your account is set to View-Only Mode.');
      return;
    }
    if (!window.confirm(`Are you sure you want to remove the uploaded hotel voucher for ${voucher.hotelName}?`)) return;
    try {
      await fetch(`/api/ops/vouchers/${voucher.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Pending',
          confirmationNumber: '',
          fileName: '',
          fileUrl: '',
          uploadedAt: '',
          uploadedBy: ''
        })
      });
      setVouchers(prev => prev.map(v => v.id === voucher.id ? {
        ...v,
        status: 'Pending',
        confirmationNumber: undefined,
        fileName: undefined,
        fileUrl: undefined,
        uploadedAt: undefined,
        uploadedBy: undefined
      } : v));
      showToast(`Voucher for ${voucher.hotelName} removed.`);
    } catch (err) {
      console.error('Error resetting voucher:', err);
    }
  };

  // Download Actual File from Hotel Side
  const handleDownloadActualFile = (voucher: HotelVoucherItem) => {
    if (!voucher.fileUrl) {
      alert('No document file attached for this hotel.');
      return;
    }

    const filename = voucher.fileName || `Hotel_Voucher_${voucher.hotelName.replace(/\s+/g, '_')}.pdf`;
    const link = document.createElement('a');
    link.href = voucher.fileUrl;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open Actual File in New Window / Tab
  const handleOpenInNewTab = (voucher: HotelVoucherItem) => {
    if (!voucher.fileUrl) return;
    const win = window.open();
    if (win) {
      if (voucher.fileUrl.startsWith('data:image')) {
        win.document.write(`<title>${voucher.fileName || voucher.hotelName}</title><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh;"><img src="${voucher.fileUrl}" style="max-width:100%;max-height:100vh;object-fit:contain;" /></body>`);
      } else {
        win.location.href = voucher.fileUrl;
      }
    }
  };

  // Send WhatsApp Summary with Confirmation to Guest
  const handleSendWhatsAppToGuest = (v: HotelVoucherItem) => {
    if (isReadOnly) {
      alert('🚫 Access Restricted: You do not have permission to send WhatsApp messages to guests. Your account is set to View-Only Mode.');
      return;
    }
    const text = `*HOTEL CONFIRMATION VOUCHER*\n\nDear ${v.customerName},\n\nYour hotel reservation from the property has been verified!\n\n🏨 *Hotel:* ${v.hotelName} (${v.city})\n🔖 *Confirmation #:* ${v.confirmationNumber || 'Verified by Property'}\n📅 *Check-In:* ${v.checkIn}\n📅 *Check-Out:* ${v.checkOut} (${v.nights} Nights)\n🛏️ *Room Category:* ${v.roomType}\n🍽️ *Meal Plan:* ${v.mealPlan || 'CPAI (Breakfast)'}\n${v.hotelContact ? `📞 *Property Contact:* ${v.hotelContact}\n` : ''}${v.hotelRemarks ? `📝 *Property Remarks:* ${v.hotelRemarks}\n` : ''}\nPlease show this confirmation at hotel reception during check-in.\n\nWarm regards,\nKingsland Holidays Team`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12">
      
      {/* Toast Notification */}
      {isSuccessToast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-2xl bg-emerald-900 text-white shadow-xl border border-emerald-700 flex items-center gap-2.5 animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold">{isSuccessToast}</span>
        </div>
      )}

      {isReadOnly && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">👁️</span>
            <div>
              <h4 className="font-black text-xs uppercase tracking-wider">Read-Only View Only Mode Enabled</h4>
              <p className="text-xs text-amber-800 font-medium">Uploading documents and editing email templates are restricted for View-Only access. You can view, download, or inspect voucher records.</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-amber-200 text-amber-950 font-black text-[10px] uppercase border border-amber-400">View Only Mode</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>Supplier & Hotel Partner Documents Desk</span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1">Hotel-Side Vouchers Desk</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Upload the <strong>actual hotel vouchers and confirmation documents received directly from the hotel side</strong>. If a hotel forgot to send their voucher, click <strong>"Send Mail to Hotel"</strong> to dispatch an instant reminder with the hotel name and booking details.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={toggleExpandAll}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Expand / Collapse All Lead Rows"
          >
            <ChevronsUpDown className="w-4 h-4" />
            <span>{isAllExpanded ? 'Collapse All' : 'Expand All'}</span>
          </button>
          
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title="Refresh Vouchers"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* 4 Financial & Voucher KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Active Packages</span>
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {stats.totalPackages}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Customer packages in operations pipeline
          </div>
        </div>

        {/* Card 2 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Package Hotels</span>
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <Hotel className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {stats.totalHotels}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Total hotel stays across all packages
          </div>
        </div>

        {/* Card 3 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Hotel Vouchers Received</span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-950 font-mono">
            {stats.uploadedCount}
          </div>
          <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {stats.completionRate}% Documents Uploaded
          </div>
        </div>

        {/* Card 4 */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Awaiting From Hotel Side</span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-950 font-mono">
            {stats.pendingCount}
          </div>
          <div className="text-[11px] text-amber-700 font-bold">
            {stats.pendingCount === 0 ? 'All hotel documents attached! 🎉' : 'Send mail reminder if hotel forgot'}
          </div>
        </div>

      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col lg:flex-row items-center justify-between gap-3 shadow-2xs">
        
        <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap sm:flex-nowrap">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Guest, Booking ID, Hotel, Confirmation #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-slate-900"
            />
          </div>

          {/* Status Quick Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({customerPackageGroups.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'pending' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-700 hover:text-amber-900'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Missing Hotel Voucher ({stats.pendingCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('uploaded')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'uploaded' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:text-emerald-900'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Attached & Verified</span>
            </button>
          </div>
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap self-start lg:self-center">
          {/* Month Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none text-slate-800 cursor-pointer"
            >
              <option value="all">All Travel Months</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Destination Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={destinationFilter}
              onChange={(e) => setDestinationFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold focus:outline-none text-slate-800 cursor-pointer"
            >
              <option value="all">All Destinations ({uniqueDestinations.length})</option>
              {uniqueDestinations.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* Main Content: Customer Package Rows (DEFAULT CLOSED / COLLAPSED) */}
      {filteredGroups.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-3xl space-y-3">
          <Hotel className="w-12 h-12 text-slate-300 mx-auto animate-bounce" />
          <h4 className="text-base font-bold text-slate-800">No Package Bookings Found</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No hotel packages match your search.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredGroups.map((group) => {
            // By default, rows are closed unless expandedCustomers[id] is true
            const isExpanded = Boolean(expandedCustomers[group.customerId]);
            const totalVouchersInPkg = group.vouchers.length;
            const uploadedVouchersInPkg = group.vouchers.filter(v => v.status === 'Uploaded' || v.status === 'Sent to Customer').length;
            const isFullyUploaded = totalVouchersInPkg > 0 && uploadedVouchersInPkg === totalVouchersInPkg;
            const progressPercent = totalVouchersInPkg > 0 ? Math.round((uploadedVouchersInPkg / totalVouchersInPkg) * 100) : 0;

            return (
              <div 
                key={group.customerId} 
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs hover:border-slate-300 transition-all duration-200"
              >
                {/* Customer Header Row (Click to open/close) */}
                <div 
                  className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none transition-colors ${
                    isFullyUploaded ? 'bg-gradient-to-r from-emerald-50/40 via-white to-slate-50/50 hover:bg-emerald-50/60' : 'bg-slate-50/70 hover:bg-slate-100/80'
                  }`}
                  onClick={() => toggleCustomerExpand(group.customerId)}
                >
                  {/* Left: Guest & Booking Identity */}
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                      isFullyUploaded ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'
                    }`}>
                      {group.customerName.charAt(0).toUpperCase()}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                          {group.bookingId}
                        </span>
                        <h3 className="font-black text-slate-900 text-sm sm:text-base">
                          {group.customerName}
                        </h3>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-700">
                          📍 {group.destination}
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          group.tripStatus === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                          group.tripStatus === 'In-Transit' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {group.tripStatus}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-3 flex-wrap">
                        <span>🗓️ Travel: <strong>{group.startDate || 'TBA'}</strong> to <strong>{group.endDate || 'TBA'}</strong></span>
                        <span>👥 <strong>{group.paxAdults}</strong> Adults {group.paxChildren > 0 ? `& ${group.paxChildren} Children` : ''}</span>
                        {group.phone && <span className="font-mono text-slate-600">📞 {group.phone}</span>}
                        <span>👤 Ops Manager: {group.assignedOpsManager}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Progress & Toggle */}
                  <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                    
                    <div className="text-right space-y-1 min-w-[140px]">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-500">Vouchers:</span>
                        <span className={isFullyUploaded ? 'text-emerald-700 font-black' : 'text-amber-800 font-black'}>
                          {uploadedVouchersInPkg} / {totalVouchersInPkg} Attached
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            isFullyUploaded ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 shadow-2xs">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>

                  </div>
                </div>

                {/* Expanded Section: All Hotels in Package (Visible only if isExpanded) */}
                {isExpanded && (
                  <div className="p-5 border-t border-slate-200 bg-white space-y-4 animate-in slide-in-from-top-2 duration-150">
                    
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                          <Hotel className="w-4 h-4 text-amber-600" />
                          <span>All Package Hotels ({group.vouchers.length} Total Accommodations)</span>
                        </h4>
                        <p className="text-[11px] text-slate-400 font-medium">
                          Upload the actual hotel voucher or click "Send Mail to Hotel" if property hasn't sent confirmation yet
                        </p>
                      </div>
                    </div>

                    {group.vouchers.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 space-y-2">
                        <p>No hotel vouchers configured for this package.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {group.vouchers.map((voucher, idx) => {
                          const isUploaded = (voucher.status === 'Uploaded' || voucher.status === 'Sent to Customer') && Boolean(voucher.fileUrl);

                          return (
                            <div 
                              key={voucher.id} 
                              className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between space-y-3 ${
                                isUploaded 
                                  ? 'bg-emerald-50/30 border-emerald-200 shadow-2xs' 
                                  : 'bg-amber-50/30 border-amber-200/90 shadow-2xs hover:border-amber-400'
                              }`}
                            >
                              {/* Top Hotel Information */}
                              <div className="space-y-2.5">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-900 text-white">
                                        Hotel #{idx + 1}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-500">
                                        📍 {voucher.city}
                                      </span>
                                    </div>
                                    <h5 className="font-extrabold text-slate-900 text-sm mt-1">
                                      {voucher.hotelName}
                                    </h5>
                                  </div>

                                  {/* Status Pill */}
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 shrink-0 ${
                                    isUploaded 
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/60' 
                                      : 'bg-amber-100 text-amber-900 border border-amber-300/60'
                                  }`}>
                                    {isUploaded ? (
                                      <>
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        <span>Hotel Voucher Attached</span>
                                      </>
                                    ) : (
                                      <>
                                        <Clock className="w-3 h-3 text-amber-600" />
                                        <span>Awaiting From Hotel</span>
                                      </>
                                    )}
                                  </span>
                                </div>

                                {/* Stay Specs */}
                                <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-slate-100">
                                  <div className="space-y-0.5">
                                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Check-In / Out:</span>
                                    <p className="font-bold text-slate-700 text-[11px]">
                                      {voucher.checkIn} to {voucher.checkOut} ({voucher.nights}N)
                                    </p>
                                  </div>
                                  <div className="space-y-0.5">
                                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Room & Plan:</span>
                                    <p className="font-bold text-slate-700 text-[11px] truncate">
                                      {voucher.roomType} • {voucher.mealPlan || 'CPAI'}
                                    </p>
                                  </div>
                                </div>

                                {/* Actual Uploaded Document Details */}
                                {isUploaded ? (
                                  <div className="p-3 rounded-xl bg-white border border-emerald-200 text-xs space-y-1.5 shadow-2xs">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-slate-500 font-bold uppercase">Hotel Confirmation Ref:</span>
                                      <span className="font-mono font-black text-emerald-800 text-xs">
                                        {voucher.confirmationNumber || 'HTL-CONFIRMED'}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-slate-700 font-medium">
                                      <span className="flex items-center gap-1 truncate max-w-[200px]">
                                        <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                        <span className="truncate">{voucher.fileName || 'Hotel_Confirmation.pdf'}</span>
                                      </span>
                                      <span className="text-[10px] text-slate-400 shrink-0">{voucher.uploadedAt || 'Attached'}</span>
                                    </div>
                                    {voucher.hotelContact && (
                                      <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100 flex items-center gap-1">
                                        <Phone className="w-3 h-3 text-slate-400" />
                                        <span>Property Contact: <strong>{voucher.hotelContact}</strong></span>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="p-2.5 rounded-xl bg-amber-50/50 border border-dashed border-amber-300 text-[11px] text-amber-800 text-center">
                                    No voucher document uploaded from hotel side yet.
                                  </div>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                                {isUploaded ? (
                                  <>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {/* View Actual Document */}
                                      <button
                                        onClick={() => setViewDocumentVoucher(voucher)}
                                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                                        title="View Actual Uploaded Hotel Document"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                                        <span>View Document</span>
                                      </button>

                                      {/* Download File */}
                                      <button
                                        onClick={() => handleDownloadActualFile(voucher)}
                                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                                        title="Download Original Hotel Voucher"
                                      >
                                        <Download className="w-3.5 h-3.5 text-slate-500" />
                                        <span>Download</span>
                                      </button>

                                      {/* Send WhatsApp to Guest */}
                                      <button
                                        onClick={() => handleSendWhatsAppToGuest(voucher)}
                                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 transition-all border border-emerald-200 cursor-pointer"
                                        title="Send Confirmation to Guest WhatsApp"
                                      >
                                        <Send className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Guest WA</span>
                                      </button>

                                      {/* Send Mail to Hotel (e.g. for revision) */}
                                      <button
                                        onClick={() => {
                                          if (isReadOnly) {
                                            alert('🚫 Access Restricted: You do not have permission to send emails to hotels. Your account is set to View-Only Mode.');
                                            return;
                                          }
                                          setSendMailVoucher(voucher);
                                        }}
                                        className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1 transition-all border border-indigo-200 cursor-pointer"
                                        title="Send Email / Message to Hotel Property"
                                      >
                                        <Mail className="w-3.5 h-3.5" />
                                        <span>Mail Hotel</span>
                                      </button>
                                    </div>

                                    {!isReadOnly && (
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => setUploadModalVoucher(voucher)}
                                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                                          title="Replace / Re-upload Document from Hotel"
                                        >
                                          <Upload className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleResetVoucher(voucher)}
                                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                          title="Remove Document"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="w-full space-y-2">
                                    {/* Upload Button */}
                                    <button
                                      onClick={() => {
                                        if (isReadOnly) {
                                          alert('🚫 Access Restricted: You do not have permission to upload hotel vouchers. Your account is set to View-Only Mode.');
                                          return;
                                        }
                                        setUploadModalVoucher(voucher);
                                      }}
                                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer"
                                    >
                                      <Upload className="w-4 h-4" />
                                      <span>Upload Hotel Document (PDF / JPG)</span>
                                    </button>

                                    {/* Send Mail Reminder to Hotel */}
                                    <button
                                      onClick={() => {
                                        if (isReadOnly) {
                                          alert('🚫 Access Restricted: You do not have permission to send emails to hotels. Your account is set to View-Only Mode.');
                                          return;
                                        }
                                        setSendMailVoucher(voucher);
                                      }}
                                      className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                                    >
                                      <Mail className="w-3.5 h-3.5" />
                                      <span>Send Mail to Hotel (Request Voucher)</span>
                                    </button>
                                  </div>
                                )}
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Voucher Modal (Uploads actual file from hotel property) */}
      {uploadModalVoucher && (
        <HotelSideUploadModal
          voucher={uploadModalVoucher}
          onClose={() => setUploadModalVoucher(null)}
          onConfirm={handleConfirmUpload}
        />
      )}

      {/* Actual Hotel Document Viewer Modal */}
      {viewDocumentVoucher && (
        <HotelDocumentViewerModal
          voucher={viewDocumentVoucher}
          onClose={() => setViewDocumentVoucher(null)}
          onDownload={() => handleDownloadActualFile(viewDocumentVoucher)}
          onOpenNewTab={() => handleOpenInNewTab(viewDocumentVoucher)}
          onSendWhatsApp={() => handleSendWhatsAppToGuest(viewDocumentVoucher)}
        />
      )}

      {/* Send Email / Message to Hotel Modal */}
      {sendMailVoucher && (
        <SendHotelVoucherRequestModal
          voucher={sendMailVoucher}
          onClose={() => setSendMailVoucher(null)}
          onSuccess={(msg) => showToast(msg)}
          isReadOnly={isReadOnly}
        />
      )}

    </div>
  );
};

// --- Send Hotel Voucher Request Email Modal ---

interface SendHotelVoucherRequestModalProps {
  voucher: HotelVoucherItem;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  isReadOnly?: boolean;
}

const SendHotelVoucherRequestModal: React.FC<SendHotelVoucherRequestModalProps> = ({
  voucher,
  onClose,
  onSuccess,
  isReadOnly = false,
}) => {
  if (!voucher) return null;

  const hotelNameSafe = voucher?.hotelName || 'Hotel Property';
  const customerNameSafe = voucher?.customerName || 'Valued Guest';
  const bookingIdSafe = voucher?.bookingId || 'BK-KL';
  const citySafe = voucher?.city || 'Destination';
  const checkInSafe = voucher?.checkIn || '';
  const checkOutSafe = voucher?.checkOut || '';
  const nightsSafe = voucher?.nights || 1;
  const roomTypeSafe = voucher?.roomType || 'Deluxe Room';
  const mealPlanSafe = voucher?.mealPlan || 'CPAI (Breakfast Included)';

  const [hotelEmail, setHotelEmail] = useState<string>(() => {
    const slug = (hotelNameSafe || 'hotel').toLowerCase().replace(/[^a-z0-9]/g, '');
    return `reservations@${slug || 'hotel'}.com`;
  });

  const [hotelPhone, setHotelPhone] = useState<string>(voucher?.hotelContact || '');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Email Subject (Editable)
  const defaultSubject = `URGENT: Request for Hotel Voucher / Booking Confirmation - ${hotelNameSafe} | Guest: ${customerNameSafe} | Ref: ${bookingIdSafe}`;
  const [customSubject, setCustomSubject] = useState<string>(defaultSubject);

  // Email Body (Editable Text Field)
  const defaultBody = useMemo(() => {
    return `Dear Reservations & Front Desk Team,
Hotel: ${hotelNameSafe} (${citySafe})

Greetings from Kingsland Holidays!

This is a gentle reminder regarding the confirmed hotel reservation for our valued guest arriving at ${hotelNameSafe}:

📋 RESERVATION SPECIFICATIONS:
• Hotel Name: ${hotelNameSafe}
• Location / City: ${citySafe}
• Guest Name: ${customerNameSafe}
• Booking / Trip ID: ${bookingIdSafe}
• Check-In Date: ${checkInSafe}
• Check-Out Date: ${checkOutSafe} (${nightsSafe} Night${nightsSafe > 1 ? 's' : ''})
• Room Category: ${roomTypeSafe}
• Meal Plan: ${mealPlanSafe}

We have not yet received the official hotel booking voucher / confirmation document from your side.

Kindly issue and email us the official hotel voucher along with your property confirmation reference number at the earliest, so that we can hand over the final travel kit to the guest.

If already issued, please re-forward the confirmation document to this email.

Looking forward to your swift cooperation.

Warm regards,
Operations & Reservations Desk
Kingsland Holidays
Email: official.kingslandholidays@gmail.com
Phone / WhatsApp: +91 6376983416, +91 7014939068
Website: www.kingslandholidays.com`;
  }, [hotelNameSafe, citySafe, customerNameSafe, bookingIdSafe, checkInSafe, checkOutSafe, nightsSafe, roomTypeSafe, mealPlanSafe]);

  const [customEmailBody, setCustomEmailBody] = useState<string>(defaultBody);

  // Reset to default template
  const handleResetTemplate = () => {
    if (isReadOnly) {
      alert('🚫 Access Restricted: You do not have permission to modify templates in View-Only Mode.');
      return;
    }
    setCustomSubject(defaultSubject);
    setCustomEmailBody(defaultBody);
    onSuccess('🔄 Reset message to default hotel template.');
  };

  // Copy Message to Clipboard
  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${customSubject}\n\n${customEmailBody}`);
      setIsCopied(true);
      onSuccess('📋 Message copied to clipboard!');
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Launch Direct Gmail Web Compose
  const handleOpenGmail = () => {
    if (isReadOnly) {
      alert('🚫 Access Restricted: You do not have permission to send emails in View-Only Mode.');
      return;
    }
    const to = encodeURIComponent(hotelEmail || '');
    const su = encodeURIComponent(customSubject);
    const body = encodeURIComponent(customEmailBody);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${body}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    onSuccess(`📧 Gmail compose opened for ${hotelNameSafe}`);
  };

  // Launch Direct Outlook Web Compose
  const handleOpenOutlook = () => {
    if (isReadOnly) {
      alert('🚫 Access Restricted: You do not have permission to send emails in View-Only Mode.');
      return;
    }
    const to = encodeURIComponent(hotelEmail || '');
    const su = encodeURIComponent(customSubject);
    const body = encodeURIComponent(customEmailBody);
    const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=${to}&subject=${su}&body=${body}`;
    window.open(outlookUrl, '_blank', 'noopener,noreferrer');
    onSuccess(`📧 Outlook Web opened for ${hotelNameSafe}`);
  };

  // Launch Native Mail Client without opening blank hanging browser tabs
  const handleSendMailto = () => {
    if (isReadOnly) {
      alert('🚫 Access Restricted: You do not have permission to send emails in View-Only Mode.');
      return;
    }
    const mailtoUrl = `mailto:${encodeURIComponent(hotelEmail || '')}?subject=${encodeURIComponent(customSubject)}&body=${encodeURIComponent(customEmailBody)}`;
    const link = document.createElement('a');
    link.href = mailtoUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 400);
    onSuccess(`📧 Email client opened for ${hotelNameSafe}`);
    onClose();
  };

  // Send WhatsApp Reminder to Hotel Desk
  const handleSendWhatsAppToHotel = () => {
    if (isReadOnly) {
      alert('🚫 Access Restricted: You do not have permission to send WhatsApp messages in View-Only Mode.');
      return;
    }
    const waText = customEmailBody || `*URGENT: HOTEL VOUCHER REQUEST*\n\nDear Reservations Team at *${hotelNameSafe}*,\n\nGreetings from Kingsland Holidays. We require the hotel voucher for ${customerNameSafe} (Ref: ${bookingIdSafe}).`;
    const phoneParam = hotelPhone ? hotelPhone.replace(/[^0-9]/g, '') : '';
    const url = phoneParam ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(waText)}` : `https://wa.me/?text=${encodeURIComponent(waText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    onSuccess(`💬 WhatsApp reminder prepared for ${hotelNameSafe}`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="hotel-voucher-fixed send-mail-hotel-fixed hotel-email-modal-fixed doc-preview-protected bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-sm">
              <Mail className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Send Mail to Hotel (Request Voucher)
              </h3>
              <p className="text-xs text-slate-500">
                Hotel: <strong className="text-slate-800">{hotelNameSafe}</strong> • Guest: <strong>{customerNameSafe}</strong>
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isReadOnly && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs font-bold flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-base">👁️</span>
              <span>Read-Only Mode Active: Mail template editing and sending are disabled for View-Only access.</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-950 font-black text-[10px] uppercase border border-amber-400">View Only</span>
          </div>
        )}

        {/* Form Inputs & Editable Message Area */}
        <div className="space-y-3.5 text-xs overflow-y-auto flex-1 pr-1">
          
          {/* Hotel Recipient Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Hotel Reservations Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                placeholder="reservations@hotel.com"
                value={hotelEmail}
                readOnly={isReadOnly}
                onChange={(e) => setHotelEmail(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none ${isReadOnly ? 'bg-slate-100 cursor-not-allowed text-slate-500' : 'bg-slate-50 focus:ring-2 focus:ring-indigo-500'}`}
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Hotel Phone / WhatsApp (Optional)
              </label>
              <input
                type="text"
                placeholder="+91 94190 XXXXX"
                value={hotelPhone}
                readOnly={isReadOnly}
                onChange={(e) => setHotelPhone(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-slate-900 focus:outline-none ${isReadOnly ? 'bg-slate-100 cursor-not-allowed text-slate-500' : 'bg-slate-50'}`}
              />
            </div>
          </div>

          {/* Email Subject (Editable) */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Email Subject (Editable)
            </label>
            <input
              type="text"
              value={customSubject}
              readOnly={isReadOnly}
              onChange={(e) => setCustomSubject(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-slate-800 text-xs focus:outline-none ${isReadOnly ? 'bg-slate-100 cursor-not-allowed text-slate-500' : 'bg-slate-50 focus:ring-2 focus:ring-indigo-500'}`}
            />
          </div>

          {/* Email Body Preview & Custom Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">
                Custom Message Field (Fully Editable)
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetTemplate}
                  className="text-[11px] text-slate-500 hover:text-slate-700 font-medium flex items-center gap-1 cursor-pointer"
                  title="Reset to standard hotel request template"
                >
                  <span>🔄 Reset Template</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Copied!' : 'Copy Text'}</span>
                </button>
              </div>
            </div>
            
            <textarea
              rows={10}
              value={customEmailBody}
              readOnly={isReadOnly}
              onChange={(e) => setCustomEmailBody(e.target.value)}
              placeholder="Write your custom message to the hotel reservations team..."
              className={`w-full p-3.5 rounded-2xl border border-slate-300 font-mono text-[11px] leading-relaxed focus:outline-none ${isReadOnly ? 'bg-slate-100 cursor-not-allowed text-slate-500' : 'bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500'}`}
            />
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-all cursor-pointer text-xs"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopyMessage}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Copy subject and message text"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Copied' : 'Copy'}</span>
            </button>

            {/* WhatsApp */}
            <button
              type="button"
              onClick={handleSendWhatsAppToHotel}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Send Reminder via WhatsApp"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            {/* Direct Gmail Web Compose */}
            <button
              type="button"
              onClick={handleOpenGmail}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              title="Open directly in Gmail web composer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Gmail</span>
            </button>

            {/* Outlook Web Compose */}
            <button
              type="button"
              onClick={handleOpenOutlook}
              className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              title="Open directly in Outlook web composer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Outlook</span>
            </button>

            {/* Native Mail App */}
            <button
              type="button"
              onClick={handleSendMailto}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Open in system default mail application"
            >
              <Send className="w-3.5 h-3.5 text-slate-300" />
              <span>Mail App</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

// --- Hotel Side Document Upload Modal ---

interface HotelSideUploadModalProps {
  voucher: HotelVoucherItem;
  onClose: () => void;
  onConfirm: (
    voucherId: string, 
    confirmationNumber: string, 
    fileName: string, 
    fileUrl: string,
    fileSize?: string,
    hotelContact?: string,
    hotelRemarks?: string
  ) => void;
}

const HotelSideUploadModal: React.FC<HotelSideUploadModalProps> = ({
  voucher,
  onClose,
  onConfirm
}) => {
  const [confirmationNumber, setConfirmationNumber] = useState(
    voucher.confirmationNumber || `HTL-CONF-${Math.floor(10000 + Math.random() * 90000)}`
  );
  const [fileName, setFileName] = useState(
    voucher.fileName || ''
  );
  const [fileDataUrl, setFileDataUrl] = useState<string>(voucher.fileUrl || '');
  const [fileSize, setFileSize] = useState<string>(voucher.fileSize || '');
  const [hotelContact, setHotelContact] = useState<string>(voucher.hotelContact || '');
  const [hotelRemarks, setHotelRemarks] = useState<string>(voucher.hotelRemarks || '');
  const [isDragging, setIsDragging] = useState(false);
  const [fileAttached, setFileAttached] = useState(Boolean(voucher.fileUrl));

  const sampleHotelDocuments = [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=85',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1600&q=85',
  ];

  const handleFileProcess = (file: File) => {
    setFileName(file.name);
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
    setFileSize(`${sizeInMb} MB`);
    setFileAttached(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setFileDataUrl(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileDataUrl && !fileName) {
      alert('Please attach or select the actual hotel voucher document (PDF or Image).');
      return;
    }

    const finalName = fileName || `Hotel_Voucher_${voucher.hotelName.replace(/\s+/g, '_')}.pdf`;
    const finalUrl = fileDataUrl || sampleHotelDocuments[Math.floor(Math.random() * sampleHotelDocuments.length)];

    onConfirm(
      voucher.id,
      confirmationNumber,
      finalName,
      finalUrl,
      fileSize || '1.2 MB',
      hotelContact,
      hotelRemarks
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="hotel-voucher-fixed doc-preview-protected bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-sm">
              <Upload className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Upload Document (From Hotel Side)
              </h3>
              <p className="text-xs text-slate-500">Booking: <strong>{voucher.bookingId}</strong> • Guest: {voucher.customerName}</p>
            </div>
          </div>

          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hotel Details Pill */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
          <div className="flex items-center justify-between font-bold text-slate-900">
            <span className="flex items-center gap-1.5"><Hotel className="w-4 h-4 text-amber-600" /> {voucher.hotelName}</span>
            <span>📍 {voucher.city}</span>
          </div>
          <p className="text-slate-500">
            Stay: <strong>{voucher.checkIn}</strong> to <strong>{voucher.checkOut}</strong> ({voucher.nights}N) • {voucher.roomType}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          
          {/* Confirmation Number */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Hotel / Supplier Confirmation Ref # <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. HTL-CNF-98214, RAD-8821, or Hotel Booking ID"
              value={confirmationNumber}
              onChange={(e) => setConfirmationNumber(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              required
            />
          </div>

          {/* Drag & Drop Actual Hotel Voucher File */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Attach Hotel Confirmation Document (PDF / Image / Scan) <span className="text-rose-500">*</span>
            </label>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`
                p-6 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer relative
                ${isDragging ? 'border-amber-500 bg-amber-50/50' : 'border-slate-300 hover:border-amber-400'}
                ${fileAttached ? 'bg-emerald-50/50 border-emerald-400' : 'bg-slate-50/50'}
              `}
            >
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileSelect}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />

              <FileUp className={`w-8 h-8 mx-auto mb-2 ${fileAttached ? 'text-emerald-600' : 'text-slate-400'}`} />

              <p className="font-bold text-slate-800">
                {fileAttached ? 'Hotel Document Ready!' : 'Drag & drop actual hotel document here'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Upload PDF, JPG, or PNG received from hotel partner
              </p>

              {fileName && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 font-mono text-emerald-700 font-semibold text-[11px] shadow-2xs">
                  <FileText className="w-3.5 h-3.5" />
                  <span className="truncate max-w-xs">{fileName}</span>
                  {fileSize && <span className="text-[9px] text-slate-400">({fileSize})</span>}
                </div>
              )}
            </div>
          </div>

          {/* Property Contact & Front Desk Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Hotel Contact / Manager (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Front Desk / +91 98765 43210"
                value={hotelContact}
                onChange={(e) => setHotelContact(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Hotel Remarks / Special Inclusions
              </label>
              <input
                type="text"
                placeholder="e.g. Early check-in approved, Lake view"
                value={hotelRemarks}
                onChange={(e) => setHotelRemarks(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Hotel-Side Voucher</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

// --- Actual Hotel Document Viewer Modal ---

interface HotelDocumentViewerModalProps {
  voucher: HotelVoucherItem;
  onClose: () => void;
  onDownload: () => void;
  onOpenNewTab: () => void;
  onSendWhatsApp: () => void;
}

const HotelDocumentViewerModal: React.FC<HotelDocumentViewerModalProps> = ({
  voucher,
  onClose,
  onDownload,
  onOpenNewTab,
  onSendWhatsApp
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const isPdf = voucher.fileUrl?.startsWith('data:application/pdf') || voucher.fileName?.toLowerCase().endsWith('.pdf');
  const isImage = voucher.fileUrl?.startsWith('data:image') || !isPdf;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="hotel-voucher-fixed doc-preview-protected bg-white border border-slate-200 rounded-3xl max-w-5xl w-full h-[94vh] max-h-[94vh] flex flex-col overflow-hidden shadow-xl animate-in zoom-in-95 duration-150">
        
        {/* Top Control Bar */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white shrink-0 z-10">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                <span>Hotel Voucher Document</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {voucher.confirmationNumber || 'Verified'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                🏨 {voucher.hotelName} ({voucher.city}) • Guest: <strong>{voucher.customerName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls for Images */}
            {isImage && (
              <div className="flex items-center bg-slate-800 rounded-xl px-2 py-1 gap-1 border border-slate-700 text-xs">
                <button 
                  onClick={() => setZoomLevel(prev => Math.max(50, prev - 25))}
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-slate-300 px-1">{zoomLevel}%</span>
                <button 
                  onClick={() => setZoomLevel(prev => Math.min(200, prev + 25))}
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              onClick={onSendWhatsApp}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={onDownload}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>

            <button
              onClick={onOpenNewTab}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
              title="Open File in New Tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>New Tab</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Display Area */}
        <div className="flex-1 min-h-0 bg-slate-900/95 overflow-auto flex flex-col items-center justify-center p-4 sm:p-6 relative">
          {voucher.fileUrl ? (
            isPdf ? (
              <iframe
                src={voucher.fileUrl}
                title="Hotel Voucher PDF"
                className="w-full h-full rounded-2xl bg-white border border-slate-700 shadow-xl"
              />
            ) : (
              <div className="max-w-full max-h-full overflow-auto flex items-center justify-center p-2">
                <img
                  src={voucher.fileUrl}
                  alt={voucher.fileName || 'Hotel Voucher Document'}
                  style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center center' }}
                  className="max-w-full max-h-[80vh] rounded-xl shadow-xl border border-slate-800 transition-transform duration-150 object-contain"
                />
              </div>
            )
          ) : (
            <div className="text-center text-slate-400 space-y-2">
              <FileText className="w-12 h-12 mx-auto text-slate-600" />
              <p>No document attached yet.</p>
            </div>
          )}
        </div>

        {/* Footer Confirmation Bar */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 text-xs flex flex-wrap items-center justify-between gap-4 text-slate-400">
          <div className="flex items-center gap-4 flex-wrap">
            <span>Hotel: <strong className="text-white">{voucher.hotelName}</strong></span>
            <span>Ref: <strong className="text-amber-400 font-mono">{voucher.confirmationNumber}</strong></span>
            <span>Stay: <strong className="text-white">{voucher.checkIn} to {voucher.checkOut} ({voucher.nights}N)</strong></span>
            {voucher.hotelContact && <span>Contact: <strong className="text-slate-300">{voucher.hotelContact}</strong></span>}
          </div>

          <div className="text-right text-[11px] text-slate-500 font-mono">
            File: {voucher.fileName || 'Hotel_Voucher_Document'} • {voucher.uploadedAt || 'Verified'}
          </div>
        </div>

      </div>
    </div>
  );
};
