import React, { useState } from 'react';
import { 
  Car, 
  Phone, 
  User, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  IndianRupee, 
  CreditCard, 
  FileText, 
  Edit3, 
  Send, 
  Building2, 
  AlertCircle, 
  ShieldCheck, 
  Save, 
  Sparkles,
  MessageSquare,
  DollarSign,
  ArrowRight,
  Check,
  Plus,
  Receipt
} from 'lucide-react';
import { Customer, HotelVoucher } from '../types';

interface CabLogisticsModuleProps {
  customers: Customer[];
  vouchers?: HotelVoucher[];
  searchTerm: string;
  isReadOnly?: boolean;
  onUpdateCustomer: (updatedCustomer: Customer) => void;
  onUpdateVoucher?: (updatedVoucher: HotelVoucher) => void;
  onOpenShareModal?: (shareText: string) => void;
}

export const CabLogisticsModule: React.FC<CabLogisticsModuleProps> = ({
  customers,
  vouchers = [],
  searchTerm,
  isReadOnly = false,
  onUpdateCustomer,
  onUpdateVoucher,
  onOpenShareModal,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);

  // Quick partial modal / inline states
  const [activePartialHotelId, setActivePartialHotelId] = useState<string | null>(null);
  const [partialHotelAmount, setPartialHotelAmount] = useState<number>(0);
  const [partialHotelMode, setPartialHotelMode] = useState<string>('UPI');
  const [partialHotelRef, setPartialHotelRef] = useState<string>('');

  const [activePartialCabCustId, setActivePartialCabCustId] = useState<string | null>(null);
  const [partialCabAmount, setPartialCabAmount] = useState<number>(0);
  const [partialCabMode, setPartialCabMode] = useState<string>('UPI');
  const [partialCabRef, setPartialCabRef] = useState<string>('');

  // Inline Hotel Cost Edit State
  const [editingVoucherCostId, setEditingVoucherCostId] = useState<string | null>(null);
  const [tempVoucherCost, setTempVoucherCost] = useState<number>(0);

  const handleSaveVoucherCost = async (v: HotelVoucher) => {
    if (isReadOnly) {
      alert('🚫 Access Restricted: You do not have permission to edit hotel voucher costs. Your account is set to View-Only Mode.');
      return;
    }
    const cost = Number(tempVoucherCost) || 0;
    try {
      const res = await fetch(`/api/ops/vouchers/${v.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalCost: cost })
      });
      if (res.ok) {
        const updated = await res.json();
        if (onUpdateVoucher) onUpdateVoucher(updated);
      }
    } catch (e) {
      console.error('Failed to update voucher cost:', e);
    }
    setEditingVoucherCostId(null);
  };

  // Full Edit Form State
  const [editForm, setEditForm] = useState<{
    driverName: string;
    driverPhone: string;
    cabModel: string;
    cabNumber: string;
    cabPickupLocation: string;

    // Cab Payment Management
    cabTotalCost: number;
    cabPaymentStatus: 'Pending' | 'Paid to Driver' | 'Partially Paid';
    cabPaymentAmount: number;
    cabPaymentDate: string;
    cabPaymentMode: string;
    cabPaymentRef: string;
    cabPaymentRemarks: string;

    // General Remarks
    opsRemarks: string;
  }>({
    driverName: '',
    driverPhone: '',
    cabModel: '',
    cabNumber: '',
    cabPickupLocation: '',

    cabTotalCost: 0,
    cabPaymentStatus: 'Pending',
    cabPaymentAmount: 0,
    cabPaymentDate: '',
    cabPaymentMode: 'UPI',
    cabPaymentRef: '',
    cabPaymentRemarks: '',

    opsRemarks: '',
  });

  const getNowFormatted = () => {
    const now = new Date();
    return now.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleStartEdit = (cust: Customer) => {
    if (isReadOnly) {
      alert('🚫 Access Restricted: You do not have permission to edit logistics or payment records. Your account is set to View-Only Mode.');
      return;
    }
    setEditingCustomerId(cust.id);

    const defaultCabTotal = cust.cabTotalCost || 0;
    const defaultCabPaid = cust.cabPaymentAmount || 0;

    setEditForm({
      driverName: cust.driverName || 'Rajesh Sharma',
      driverPhone: cust.driverPhone || '+91 98290 12345',
      cabModel: cust.cabModel || 'Toyota Innova Crysta',
      cabNumber: cust.cabNumber || 'RJ 14 CZ 9876',
      cabPickupLocation: cust.cabPickupLocation || `${cust.destination} Airport / Railway Station`,

      cabTotalCost: defaultCabTotal,
      cabPaymentStatus: cust.cabPaymentStatus || 'Pending',
      cabPaymentAmount: defaultCabPaid,
      cabPaymentDate: cust.cabPaymentDate || getNowFormatted(),
      cabPaymentMode: cust.cabPaymentMode || 'UPI',
      cabPaymentRef: cust.cabPaymentRef || '',
      cabPaymentRemarks: cust.cabPaymentRemarks || '',

      opsRemarks: cust.opsRemarks || cust.specialRequests || 'Operations briefing completed.',
    });
  };

  const handleSaveEdit = (cust: Customer) => {
    const cabCost = Number(editForm.cabTotalCost) || 0;
    const cabPaid = Number(editForm.cabPaymentAmount) || 0;
    let derivedCabStatus = editForm.cabPaymentStatus;
    if (cabPaid >= cabCost && cabCost > 0) {
      derivedCabStatus = 'Paid to Driver';
    } else if (cabPaid > 0) {
      derivedCabStatus = 'Partially Paid';
    } else {
      derivedCabStatus = 'Pending';
    }

    const updated: Customer = {
      ...cust,
      driverName: editForm.driverName,
      driverPhone: editForm.driverPhone,
      cabModel: editForm.cabModel,
      cabNumber: editForm.cabNumber,
      cabPickupLocation: editForm.cabPickupLocation,

      cabTotalCost: cabCost,
      cabPaymentStatus: derivedCabStatus,
      cabPaymentAmount: cabPaid,
      cabPaymentDate: editForm.cabPaymentDate,
      cabPaymentMode: editForm.cabPaymentMode,
      cabPaymentRef: editForm.cabPaymentRef,
      cabPaymentRemarks: editForm.cabPaymentRemarks,

      opsRemarks: editForm.opsRemarks,
    };

    onUpdateCustomer(updated);
    setEditingCustomerId(null);
  };

  // Quick Action: Mark Complete Cab Payment Done
  // Quick Action: Mark Complete Cab Payment Done
  const handleCabCompletePaymentDone = (cust: Customer) => {
    const totalCost = cust.cabTotalCost || Math.round((cust.totalAmount || 0) * 0.2) || 10000;
    const currentPaid = cust.cabPaymentAmount || 0;
    const remaining = Math.max(0, totalCost - currentPaid);
    const partAmount = remaining > 0 ? remaining : totalCost;
    const now = getNowFormatted();
    const mode = cust.cabPaymentMode || 'UPI (PhonePe/GPay)';
    const ref = cust.cabPaymentRef || `CAB-TXN-${Math.floor(100000 + Math.random() * 900000)}`;

    const prevLogs = Array.isArray(cust.cabPaymentLogs) ? cust.cabPaymentLogs : [];
    const newLog = {
      id: `cab-part-${Date.now()}`,
      amount: partAmount,
      paidAt: now,
      paymentMode: mode,
      paymentRef: ref,
      remarks: 'Full driver payment cleared by Operations.',
    };

    const updated: Customer = {
      ...cust,
      cabTotalCost: totalCost,
      cabPaymentAmount: totalCost,
      cabPaymentStatus: 'Paid to Driver',
      cabPaymentDate: now,
      cabPaymentMode: mode,
      cabPaymentRef: ref,
      cabPaymentRemarks: 'Full driver payment completed by Ops.',
      cabPaymentLogs: [...prevLogs, newLog],
    };
    onUpdateCustomer(updated);
  };

  // Quick Action: Record Partial Cab Payment
  const handleSavePartialCabPayment = (cust: Customer) => {
    if (partialCabAmount <= 0) {
      alert('Please enter a valid partial payment amount.');
      return;
    }
    const totalCost = cust.cabTotalCost || Math.round((cust.totalAmount || 0) * 0.2) || 10000;
    const currentPaid = cust.cabPaymentAmount || 0;
    const newPaid = currentPaid + partialCabAmount;
    const status = newPaid >= totalCost ? 'Paid to Driver' : 'Partially Paid';
    const now = getNowFormatted();
    const ref = partialCabRef || `CAB-ADV-${Math.floor(100000 + Math.random() * 900000)}`;

    const prevLogs = Array.isArray(cust.cabPaymentLogs) ? cust.cabPaymentLogs : [];
    const newLog = {
      id: `cab-part-${Date.now()}`,
      amount: partialCabAmount,
      paidAt: now,
      paymentMode: partialCabMode,
      paymentRef: ref,
      remarks: `Partial payment part of ₹${partialCabAmount.toLocaleString('en-IN')} paid to driver.`,
    };

    const updated: Customer = {
      ...cust,
      cabTotalCost: totalCost,
      cabPaymentAmount: newPaid,
      cabPaymentStatus: status,
      cabPaymentDate: now,
      cabPaymentMode: partialCabMode,
      cabPaymentRef: ref,
      cabPaymentRemarks: `Partial payment of ₹${partialCabAmount.toLocaleString('en-IN')} recorded on ${now}.`,
      cabPaymentLogs: [...prevLogs, newLog],
    };
    onUpdateCustomer(updated);
    setActivePartialCabCustId(null);
    setPartialCabAmount(0);
    setPartialCabRef('');
  };

  // Quick Action: Mark Individual Hotel Complete Payment Done
  const handleHotelCompletePaymentDone = (cust: Customer, voucher: HotelVoucher, defaultCost: number) => {
    const totalCost = voucher.totalCost || defaultCost || 12000;
    const currentPaid = voucher.paidAmount || 0;
    const remaining = Math.max(0, totalCost - currentPaid);
    const partAmount = remaining > 0 ? remaining : totalCost;
    const now = getNowFormatted();
    const mode = voucher.paymentMode || 'Bank Transfer / NEFT';
    const ref = voucher.paymentRef || `UTR-${Math.floor(10000000 + Math.random() * 90000000)}`;

    const prevLogs = Array.isArray(voucher.paymentLogs) ? voucher.paymentLogs : [];
    const newLog = {
      id: `hotel-part-${Date.now()}`,
      amount: partAmount,
      paidAt: now,
      paymentMode: mode,
      paymentRef: ref,
      remarks: `100% full payment cleared to ${voucher.hotelName || 'hotel'}.`,
    };

    const updatedVoucher: HotelVoucher = {
      ...voucher,
      totalCost,
      paidAmount: totalCost,
      paymentStatus: 'Paid to Hotel',
      paidAt: now,
      paymentMode: mode,
      paymentRef: ref,
      paymentRemarks: `100% full payment cleared to ${voucher.hotelName || 'hotel'}.`,
      paymentLogs: [...prevLogs, newLog],
    };

    if (onUpdateVoucher) {
      onUpdateVoucher(updatedVoucher);
    }

    // Also update parent customer hotel aggregate if needed
    const custHotelTotal = Math.max(cust.hotelTotalCost || 0, totalCost);
    const updatedCust: Customer = {
      ...cust,
      hotelTotalCost: custHotelTotal,
      hotelPaymentAmount: Math.min(custHotelTotal, (cust.hotelPaymentAmount || 0) + partAmount),
      hotelPaymentStatus: 'Paid to Hotel',
      hotelPaymentDate: now,
    };
    onUpdateCustomer(updatedCust);
  };

  // Quick Action: Record Partial Hotel Payment
  const handleSavePartialHotelPayment = (cust: Customer, voucher: HotelVoucher, defaultCost: number) => {
    if (partialHotelAmount <= 0) {
      alert('Please enter a valid partial amount.');
      return;
    }
    const totalCost = voucher.totalCost || defaultCost || 12000;
    const currentPaid = voucher.paidAmount || 0;
    const newPaid = currentPaid + partialHotelAmount;
    const status = newPaid >= totalCost ? 'Paid to Hotel' : 'Partially Paid';
    const now = getNowFormatted();
    const ref = partialHotelRef || `UTR-${Math.floor(10000000 + Math.random() * 90000000)}`;

    const prevLogs = Array.isArray(voucher.paymentLogs) ? voucher.paymentLogs : [];
    const newLog = {
      id: `hotel-part-${Date.now()}`,
      amount: partialHotelAmount,
      paidAt: now,
      paymentMode: partialHotelMode,
      paymentRef: ref,
      remarks: `Partial advance of ₹${partialHotelAmount.toLocaleString('en-IN')} paid to ${voucher.hotelName}.`,
    };

    const updatedVoucher: HotelVoucher = {
      ...voucher,
      totalCost,
      paidAmount: newPaid,
      paymentStatus: status,
      paidAt: now,
      paymentMode: partialHotelMode,
      paymentRef: ref,
      paymentRemarks: `Partial advance of ₹${partialHotelAmount.toLocaleString('en-IN')} paid to ${voucher.hotelName}.`,
      paymentLogs: [...prevLogs, newLog],
    };

    if (onUpdateVoucher) {
      onUpdateVoucher(updatedVoucher);
    }

    const custHotelTotal = Math.max(cust.hotelTotalCost || 0, totalCost);
    const updatedCust: Customer = {
      ...cust,
      hotelTotalCost: custHotelTotal,
      hotelPaymentAmount: (cust.hotelPaymentAmount || 0) + partialHotelAmount,
      hotelPaymentStatus: (cust.hotelPaymentAmount || 0) + partialHotelAmount >= custHotelTotal ? 'Paid to Hotel' : 'Partially Paid',
      hotelPaymentDate: now,
    };
    onUpdateCustomer(updatedCust);

    setActivePartialHotelId(null);
    setPartialHotelAmount(0);
    setPartialHotelRef('');
  };

  // Filter customers
  const filtered = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.driverName && c.driverName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter = selectedCustomerId === 'all' || c.id === selectedCustomerId;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      
      {isReadOnly && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">👁️</span>
            <div>
              <h4 className="font-black text-xs uppercase tracking-wider">Read-Only View Mode Enabled</h4>
              <p className="text-xs text-amber-800 font-medium">Payment editing, recording driver advances, and hotel payouts are restricted for View-Only access. You can view payment details, vouchers, and download records.</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-amber-200 text-amber-950 font-black text-[10px] uppercase border border-amber-400">View Only Mode</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>Operations Payment Management Desk</span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1">Multi-Hotel & Cab Driver Payment Tracker</h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
            Track individual hotel payments (1, 2, 3+ hotels in package) & driver payouts. Instantly mark full payments done or record partial token advances with real-time timestamps.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-center">
            <span className="text-[10px] uppercase font-semibold text-slate-300 block">Total Trips</span>
            <span className="text-2xl font-black text-white">{customers.length}</span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-emerald-950/60 backdrop-blur-md border border-emerald-400/30 text-center">
            <span className="text-[10px] uppercase font-semibold text-emerald-300 block">Active Logistics</span>
            <span className="text-2xl font-black text-emerald-200">
              {customers.filter((c) => c.hotelPaymentStatus === 'Paid to Hotel' || c.cabPaymentStatus === 'Paid to Driver').length}
            </span>
          </div>
        </div>
      </div>

      {/* Customer Filter Dropdown */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-800">Select Trip:</span>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[260px]"
          >
            <option value="all">All Converted Trips ({customers.length})</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.bookingId}) - {c.destination}
              </option>
            ))}
          </select>
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Showing <strong>{filtered.length}</strong> trip payment records
        </span>
      </div>

      {/* Payment Management Trip Cards */}
      <div className="space-y-8">
        {filtered.map((cust) => {
          const isEditing = editingCustomerId === cust.id;

          const driverName = cust.driverName || 'Rajesh Sharma';
          const driverPhone = cust.driverPhone || '+91 98290 12345';
          const cabModel = cust.cabModel || 'Toyota Innova Crysta';
          const cabNumber = cust.cabNumber || 'RJ 14 CZ 9876';
          const cabPickup = cust.cabPickupLocation || `${cust.destination} Pickup Point`;

          // Cab Payment Calculations
          const cabCost = cust.cabTotalCost || Math.round((cust.totalAmount || 0) * 0.2) || 10000;
          const cabPaid = cust.cabPaymentAmount || 0;
          const cabRemaining = Math.max(0, cabCost - cabPaid);
          const cabPayStatus = cust.cabPaymentStatus || (cabPaid >= cabCost && cabCost > 0 ? 'Paid to Driver' : cabPaid > 0 ? 'Partially Paid' : 'Pending');
          const cabPayDate = cust.cabPaymentDate || '—';
          const cabPayMode = cust.cabPaymentMode || 'UPI';
          const cabPayRef = cust.cabPaymentRef || '—';
          const cabRemarks = cust.cabPaymentRemarks || 'Driver advance paid via PhonePe.';

          const opsRemarks = cust.opsRemarks || cust.specialRequests || 'Operations briefing completed.';

          // Find hotel vouchers for this customer
          const custVouchers = vouchers.filter(
            (v) => v.customerId === cust.id || v.bookingId === cust.bookingId
          );

          // Compute aggregate hotel totals
          const totalHotelsBudget = custVouchers.reduce((sum, v) => sum + (v.totalCost || 0), 0);
          const totalHotelsPaid = custVouchers.reduce((sum, v) => sum + (v.paidAmount || 0), 0);
          const totalHotelsRemaining = Math.max(0, totalHotelsBudget - totalHotelsPaid);

          return (
            <div key={cust.id} className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden transition-all hover:shadow-lg">
              
              {/* CARD HEADER */}
              <div className="p-6 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-xs font-black border border-amber-400/30">
                      {cust.bookingId}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-white/10 text-slate-300 font-bold text-xs">
                      {cust.destination}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-400/20 text-emerald-300 font-bold text-xs flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {cust.startDate} to {cust.endDate}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-bold text-xs">
                      🏨 {custVouchers.length} Hotels in Package
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white mt-1">
                    Guest: {cust.name} <span className="text-xs font-normal text-slate-400">({cust.paxAdults} Adults {cust.paxChildren > 0 ? `& ${cust.paxChildren} Child` : ''})</span>
                  </h3>
                </div>

                {!isReadOnly && (
                  <div className="flex items-center gap-2">
                    {!isEditing ? (
                      <button
                        onClick={() => handleStartEdit(cust)}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Edit All Logistics & Payments</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSaveEdit(cust)}
                        className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all animate-pulse cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save All Payment Records</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* CARD BODY */}
              <div className="p-6 space-y-6 bg-slate-50/50">
                
                {/* 1. MULTI-HOTEL BREAKDOWN SECTION */}
                <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 font-extrabold text-base text-slate-900">
                      <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-slate-900 font-extrabold">Hotel Payments Breakdown ({custVouchers.length} Hotels in Package)</h4>
                        <p className="text-xs text-slate-500 font-normal">
                          Manage payouts for each hotel separately. Mark full payment done or record partial installments.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
                        Total Hotel Budget: <strong className="text-slate-900 font-mono">₹{totalHotelsBudget.toLocaleString('en-IN')}</strong>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold">
                        Paid: <strong className="font-mono">₹{totalHotelsPaid.toLocaleString('en-IN')}</strong>
                      </div>
                      {totalHotelsRemaining > 0 && (
                        <div className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 text-xs font-bold">
                          Due: <strong className="font-mono">₹{totalHotelsRemaining.toLocaleString('en-IN')}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* GRID OF INDIVIDUAL HOTELS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {custVouchers.map((v, idx) => {
                      const hCost = v.totalCost || 0;
                      const hPaid = v.paidAmount || 0;
                      const hRemaining = Math.max(0, hCost - hPaid);
                      const hStatus = v.paymentStatus || (hPaid >= hCost && hCost > 0 ? 'Paid to Hotel' : hPaid > 0 ? 'Partially Paid' : 'Pending');
                      const hPaidAt = v.paidAt || '—';
                      const hMode = v.paymentMode || 'UPI / Bank';
                      const hRef = v.paymentRef || '—';
                      const isPartialOpen = activePartialHotelId === v.id;
                      const isEditingCost = editingVoucherCostId === v.id;

                      return (
                        <div 
                          key={v.id} 
                          className={`p-5 rounded-3xl border-2 transition-all space-y-4 flex flex-col justify-between shadow-sm hover:shadow-md ${
                            hStatus === 'Paid to Hotel' 
                              ? 'bg-emerald-50/50 border-emerald-300' 
                              : hStatus === 'Partially Paid' 
                              ? 'bg-amber-50/50 border-amber-300' 
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div>
                            {/* Hotel Title & Badge Header */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-black uppercase text-amber-800 bg-amber-100/90 px-3 py-1 rounded-lg border border-amber-200/80 inline-block mb-1.5 shadow-2xs">
                                  Hotel #{idx + 1} · {v.city || cust.destination}
                                </span>
                                <h5 className="font-black text-slate-900 text-base sm:text-lg leading-snug truncate">
                                  {v.hotelName || `Hotel ${idx + 1}`}
                                </h5>
                                <p className="text-xs text-slate-600 font-semibold mt-1 flex items-center gap-1">
                                  <span>🛏️</span> {v.roomType || 'Deluxe Room'}
                                </p>
                              </div>

                              <span className={`text-xs font-black px-3 py-1.5 rounded-full border shadow-xs whitespace-nowrap shrink-0 ${
                                hStatus === 'Paid to Hotel' 
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                                  : hStatus === 'Partially Paid' 
                                  ? 'bg-amber-100 text-amber-900 border-amber-300' 
                                  : 'bg-rose-100 text-rose-900 border-rose-300'
                              }`}>
                                {hStatus}
                              </span>
                            </div>

                            {/* Financial Metric Row */}
                            <div className="grid grid-cols-3 gap-2.5 mt-4 text-center">
                              {/* COST BOX */}
                              <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs relative flex flex-col justify-between">
                                <div className="flex items-center justify-center gap-1">
                                  <span className="text-xs uppercase font-extrabold text-slate-500 block tracking-wider">COST</span>
                                  {!isEditingCost && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingVoucherCostId(v.id);
                                        setTempVoucherCost(hCost);
                                      }}
                                      className="p-1 rounded-md text-amber-700 hover:bg-amber-100 transition-colors text-xs font-bold"
                                      title="Edit Hotel Total Price"
                                    >
                                      ✏️
                                    </button>
                                  )}
                                </div>
                                {isEditingCost ? (
                                  <div className="mt-1 space-y-1">
                                    <input
                                      type="number"
                                      value={tempVoucherCost}
                                      onChange={e => setTempVoucherCost(Number(e.target.value))}
                                      className="w-full text-center px-1.5 py-1 text-sm font-mono font-bold border border-amber-400 rounded-lg bg-amber-50"
                                      placeholder="Cost"
                                    />
                                    <div className="flex gap-1 justify-center">
                                      <button
                                        type="button"
                                        onClick={() => handleSaveVoucherCost(v)}
                                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-0.5 rounded-lg shadow-2xs"
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingVoucherCostId(null)}
                                        className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-2 py-0.5 rounded-lg"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="font-black text-base sm:text-lg text-slate-900 font-mono block mt-1">₹{hCost.toLocaleString('en-IN')}</span>
                                )}
                              </div>

                              {/* PAID BOX */}
                              <div className="p-3 rounded-2xl bg-emerald-50/90 border border-emerald-200 shadow-2xs flex flex-col justify-between">
                                <span className="text-xs uppercase font-extrabold text-emerald-700 block tracking-wider">PAID</span>
                                <span className="font-black text-base sm:text-lg text-emerald-700 font-mono block mt-1">₹{hPaid.toLocaleString('en-IN')}</span>
                              </div>

                              {/* BALANCE BOX */}
                              <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200 shadow-2xs flex flex-col justify-between">
                                <span className="text-xs uppercase font-extrabold text-amber-800 block tracking-wider">BALANCE</span>
                                <span className="font-black text-base sm:text-lg text-amber-900 font-mono block mt-1">₹{hRemaining.toLocaleString('en-IN')}</span>
                              </div>
                            </div>

                            {/* Metadata */}
                            <div className="mt-4 p-3.5 rounded-2xl bg-slate-100/80 border border-slate-200 text-xs space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-500 font-medium">Paid Timestamp:</span>
                                <strong className="text-slate-900 font-mono text-xs font-bold">{hPaidAt}</strong>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-500 font-medium">Payment Mode:</span>
                                <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-900 font-black text-xs border border-indigo-200">{hMode}</span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-500 font-medium shrink-0">UTR / Ref #:</span>
                                <strong className="text-slate-900 font-mono text-xs font-bold break-all text-right">{hRef}</strong>
                              </div>
                            </div>

                            {/* Payment Parts List if any */}
                            {Array.isArray(v.paymentLogs) && v.paymentLogs.length > 0 && (
                              <div className="mt-3 p-3 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs space-y-2 shadow-2xs">
                                <div className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center justify-between">
                                  <span>Payment Parts ({v.paymentLogs.length})</span>
                                  <span className="font-mono text-emerald-800 font-bold">₹{v.paymentLogs.reduce((acc, p) => acc + (p.amount || 0), 0).toLocaleString('en-IN')} Paid</span>
                                </div>
                                <div className="space-y-1.5 pt-1">
                                  {v.paymentLogs.map((part, pIdx) => (
                                    <div key={part.id || pIdx} className="flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-amber-200/80 font-medium shadow-2xs">
                                      <span className="font-mono text-slate-600 text-[11px]">{part.paidAt}</span>
                                      <span className="font-bold text-slate-800">Part {pIdx + 1}: <strong className="font-mono text-emerald-700 text-xs">₹{part.amount.toLocaleString('en-IN')}</strong></span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Quick Actions for this Hotel */}
                          {!isReadOnly && (
                            <div className="pt-3 border-t border-slate-200/80 space-y-2">
                              {hStatus !== 'Paid to Hotel' ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleHotelCompletePaymentDone(cust, v, hCost)}
                                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                                  >
                                    <Check className="w-4 h-4" />
                                    <span>Payment Done</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isPartialOpen) {
                                        setActivePartialHotelId(null);
                                      } else {
                                        setActivePartialHotelId(v.id);
                                        setPartialHotelAmount(hRemaining > 0 ? Math.round(hRemaining / 2) : 5000);
                                        setPartialHotelMode('UPI');
                                        setPartialHotelRef(`UPI-H${idx + 1}-${Math.floor(10000 + Math.random() * 90000)}`);
                                      }
                                    }}
                                    className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                                  >
                                    <span>Partial Payment</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="py-2.5 px-4 rounded-xl bg-emerald-100 border border-emerald-300 text-center text-emerald-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xs">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  <span>100% Hotel Payment Cleared</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Inline Partial Payment Form for this Hotel */}
                          {!isReadOnly && isPartialOpen && (
                            <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 shadow-xl border border-slate-800 animate-in fade-in zoom-in-95 duration-150 mt-2">
                              <div className="flex items-center justify-between text-xs font-bold text-amber-300 border-b border-slate-800 pb-2">
                                <span>Record Partial Payment:</span>
                                <span className="font-mono text-amber-400 font-extrabold">Due: ₹{hRemaining.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="space-y-2 text-xs">
                                <div>
                                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Amount (₹):</label>
                                  <input
                                    type="number"
                                    value={partialHotelAmount}
                                    onChange={(e) => setPartialHotelAmount(Number(e.target.value))}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-800 text-white font-mono font-bold border border-slate-700 focus:ring-2 focus:ring-amber-400 text-xs sm:text-sm outline-none"
                                    placeholder="Amount"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Mode:</label>
                                  <select
                                    value={partialHotelMode}
                                    onChange={(e) => setPartialHotelMode(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-800 text-white font-bold border border-slate-700 text-xs sm:text-sm outline-none"
                                  >
                                    <option value="UPI">UPI (PhonePe / GPay)</option>
                                    <option value="Bank Transfer / NEFT">Bank Transfer / NEFT</option>
                                    <option value="Card">Credit/Debit Card</option>
                                    <option value="Cash">Cash</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[11px] font-bold text-slate-300 block mb-1">UTR / Ref #:</label>
                                  <input
                                    type="text"
                                    value={partialHotelRef}
                                    onChange={(e) => setPartialHotelRef(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-slate-800 text-white font-mono text-xs sm:text-sm border border-slate-700 focus:ring-2 focus:ring-amber-400 outline-none"
                                    placeholder="UTR / Ref"
                                  />
                                </div>
                                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                                  <button
                                    type="button"
                                    onClick={() => handleSavePartialHotelPayment(cust, v, hCost)}
                                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer"
                                  >
                                    Confirm Partial Payment
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActivePartialHotelId(null)}
                                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-bold cursor-pointer transition-all"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. CAB & DRIVER PAYMENT MANAGEMENT CARD */}
                <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 font-extrabold text-base text-slate-900">
                      <div className="p-2 rounded-xl bg-teal-100 text-teal-800">
                        <Car className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-slate-900 font-extrabold">Cab & Driver Payment Management</h4>
                        <p className="text-xs text-slate-500 font-normal">
                          Manage driver payouts, fuel advances, and vehicle allocations with full and partial payment options.
                        </p>
                      </div>
                    </div>

                    <span className={`text-xs font-black px-3 py-1 rounded-full border ${
                      cabPayStatus === 'Paid to Driver' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                      cabPayStatus === 'Partially Paid' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                      'bg-rose-100 text-rose-800 border-rose-300'
                    }`}>
                      {cabPayStatus}
                    </span>
                  </div>

                  {!isEditing ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Driver & Cab Info */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <span className="text-[10px] uppercase font-black text-slate-500 block">Assigned Driver & Vehicle</span>
                        <div>
                          <strong className="text-slate-900 text-base">{driverName}</strong>
                          <p className="font-mono text-xs text-slate-600 mt-0.5">{cabModel} ({cabNumber})</p>
                          <p className="text-xs text-slate-500 mt-1">📍 {cabPickup}</p>
                        </div>
                        <a href={`tel:${driverPhone}`} className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs">
                          <Phone className="w-3.5 h-3.5" />
                          <span>Call Driver: {driverPhone}</span>
                        </a>
                      </div>

                      {/* Cab Payment Financials */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between">
                        <span className="text-[10px] uppercase font-black text-slate-500 block">Cab Financial Metrics</span>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-center">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Cost</span>
                            <span className="font-extrabold text-slate-900 text-sm font-mono">₹{cabCost.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                            <span className="text-[9px] uppercase font-bold text-emerald-600 block">Paid</span>
                            <span className="font-extrabold text-emerald-800 text-sm font-mono">₹{cabPaid.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-center">
                            <span className="text-[9px] uppercase font-bold text-amber-700 block">Balance</span>
                            <span className="font-extrabold text-amber-900 text-sm font-mono">₹{cabRemaining.toLocaleString('en-IN')}</span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs space-y-1 font-medium">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Paid Timestamp:</span>
                            <strong className="text-slate-900 font-mono text-[11px]">{cabPayDate}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Payment Mode:</span>
                            <strong className="text-teal-700 font-bold">{cabPayMode}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">UTR / Ref #:</span>
                            <strong className="text-slate-800 font-mono text-[11px]">{cabPayRef}</strong>
                          </div>
                        </div>

                        {/* Cab Payment Parts History */}
                        {Array.isArray(cust.cabPaymentLogs) && cust.cabPaymentLogs.length > 0 && (
                          <div className="p-2.5 rounded-xl bg-teal-50/80 border border-teal-200 text-xs space-y-1.5">
                            <div className="text-[10px] font-black uppercase tracking-wider text-teal-900 flex items-center justify-between">
                              <span>Cab Payment Parts ({cust.cabPaymentLogs.length})</span>
                              <span className="font-mono text-teal-900 font-bold">₹{cust.cabPaymentLogs.reduce((acc, p) => acc + (p.amount || 0), 0).toLocaleString('en-IN')} Paid</span>
                            </div>
                            <div className="space-y-1 pt-1">
                              {cust.cabPaymentLogs.map((part, pIdx) => (
                                <div key={part.id || pIdx} className="flex items-center justify-between text-[10px] bg-white p-1.5 rounded-lg border border-teal-100 font-medium">
                                  <span className="font-mono text-slate-600">{part.paidAt}</span>
                                  <span className="font-bold text-slate-800">Part {pIdx + 1}: <strong className="font-mono text-teal-800">₹{part.amount.toLocaleString('en-IN')}</strong> ({part.paymentMode || 'UPI'})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Cab Payment Quick Actions */}
                      <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200 flex flex-col justify-between space-y-3">
                        <div>
                          <span className="text-[10px] uppercase font-black text-teal-900 block">Cab Quick Payment Controls</span>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {cabRemarks}
                          </p>
                        </div>

                        {!isReadOnly && (
                          <div className="space-y-2">
                            {cabPayStatus !== 'Paid to Driver' ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleCabCompletePaymentDone(cust)}
                                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                                >
                                  <Check className="w-4 h-4" />
                                  <span>Complete Payment Done</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (activePartialCabCustId === cust.id) {
                                      setActivePartialCabCustId(null);
                                    } else {
                                      setActivePartialCabCustId(cust.id);
                                      setPartialCabAmount(cabRemaining > 0 ? Math.round(cabRemaining / 2) : 3000);
                                      setPartialCabMode('UPI');
                                      setPartialCabRef(`CAB-TXN-${Math.floor(10000 + Math.random() * 90000)}`);
                                    }
                                  }}
                                  className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1 shadow-md transition-all cursor-pointer"
                                >
                                  <span>Partial Payment</span>
                                </button>
                              </div>
                            ) : (
                              <div className="p-2 rounded-xl bg-emerald-100 border border-emerald-300 text-center text-emerald-900 font-bold text-xs flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>100% Cab Payment Completed</span>
                              </div>
                            )}
                          </div>
                        )}

                          {/* Inline Partial Payment Box for Cab */}
                          {!isReadOnly && activePartialCabCustId === cust.id && (
                            <div className="p-3 rounded-xl bg-slate-900 text-white space-y-2 animate-in fade-in zoom-in-95 duration-150">
                              <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                                <span>Record Cab Partial Payment:</span>
                                <span>Due: ₹{cabRemaining.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="space-y-1.5 text-xs">
                                <div>
                                  <label className="text-[10px] text-slate-300 block">Amount (₹):</label>
                                  <input
                                    type="number"
                                    value={partialCabAmount}
                                    onChange={(e) => setPartialCabAmount(Number(e.target.value))}
                                    className="w-full px-2 py-1 rounded-lg bg-white/10 text-white font-mono font-bold border border-white/20"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-300 block">Payment Mode:</label>
                                  <select
                                    value={partialCabMode}
                                    onChange={(e) => setPartialCabMode(e.target.value)}
                                    className="w-full px-2 py-1 rounded-lg bg-slate-800 text-white font-bold border border-slate-700 text-xs"
                                  >
                                    <option value="UPI">UPI (PhonePe / GPay / Paytm)</option>
                                    <option value="Cash">Cash Given to Driver</option>
                                    <option value="Bank Transfer / NEFT">Bank Transfer / NEFT</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-300 block">UTR / Ref #:</label>
                                  <input
                                    type="text"
                                    value={partialCabRef}
                                    onChange={(e) => setPartialCabRef(e.target.value)}
                                    className="w-full px-2 py-1 rounded-lg bg-white/10 text-white font-mono text-[10px] border border-white/20"
                                  />
                                </div>
                                <div className="flex items-center gap-1.5 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleSavePartialCabPayment(cust)}
                                    className="flex-1 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs cursor-pointer"
                                  >
                                    Confirm Cab Payment
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActivePartialCabCustId(null)}
                                    className="px-2 py-1 rounded-lg bg-white/10 text-slate-300 text-xs cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                  ) : (
                    /* Edit Form Mode */
                    <div className="space-y-4 text-xs">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Driver Name:</label>
                          <input
                            type="text"
                            value={editForm.driverName}
                            onChange={(e) => setEditForm({ ...editForm, driverName: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-bold"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Driver Phone:</label>
                          <input
                            type="text"
                            value={editForm.driverPhone}
                            onChange={(e) => setEditForm({ ...editForm, driverPhone: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Cab Model:</label>
                          <input
                            type="text"
                            value={editForm.cabModel}
                            onChange={(e) => setEditForm({ ...editForm, cabModel: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-bold"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Cab Reg Number:</label>
                          <input
                            type="text"
                            value={editForm.cabNumber}
                            onChange={(e) => setEditForm({ ...editForm, cabNumber: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-mono font-bold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Total Cab Cost (₹):</label>
                          <input
                            type="number"
                            value={editForm.cabTotalCost}
                            onChange={(e) => setEditForm({ ...editForm, cabTotalCost: Number(e.target.value) })}
                            className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-extrabold text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Amount Paid (₹):</label>
                          <input
                            type="number"
                            value={editForm.cabPaymentAmount}
                            onChange={(e) => setEditForm({ ...editForm, cabPaymentAmount: Number(e.target.value) })}
                            className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-extrabold text-emerald-700"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Payment Date & Time:</label>
                          <input
                            type="text"
                            value={editForm.cabPaymentDate}
                            onChange={(e) => setEditForm({ ...editForm, cabPaymentDate: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-mono"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Payment Mode:</label>
                          <select
                            value={editForm.cabPaymentMode}
                            onChange={(e) => setEditForm({ ...editForm, cabPaymentMode: e.target.value })}
                            className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-bold"
                          >
                            <option value="UPI">UPI</option>
                            <option value="Cash">Cash</option>
                            <option value="Bank Transfer / NEFT">Bank Transfer / NEFT</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. INTERNAL OPERATIONS REMARKS BOX FOR THIS TRIP */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900">
                      <MessageSquare className="w-4 h-4 text-indigo-600" />
                      <span>Internal Trip Operations Remarks</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Operations Desk Only</span>
                  </div>

                  {!isEditing ? (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium leading-relaxed">
                      {opsRemarks}
                    </div>
                  ) : (
                    <div>
                      <label className="font-bold text-slate-700 block mb-1 text-xs">Enter Operational Internal Remarks for this Trip:</label>
                      <textarea
                        rows={3}
                        value={editForm.opsRemarks}
                        onChange={(e) => setEditForm({ ...editForm, opsRemarks: e.target.value })}
                        className="w-full p-3 rounded-xl bg-white border border-slate-300 font-medium text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                        placeholder="Add operational remarks e.g. Guest requested early check-in, driver briefing completed..."
                      />
                    </div>
                  )}
                </div>

                {/* SAVE BUTTON WHEN EDITING */}
                {isEditing && (
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(cust)}
                      className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save All Payment Records & Remarks</span>
                    </button>
                  </div>
                )}

              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
