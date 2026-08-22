import React, { useState } from 'react';
import { 
  Car, 
  User, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Building2, 
  AlertCircle, 
  MessageSquare, 
  Check, 
  Pencil,
  Phone,
  BedDouble
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
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');

  // Quick partial modal / inline states for Hotel
  const [activePartialHotelId, setActivePartialHotelId] = useState<string | null>(null);
  const [partialHotelAmount, setPartialHotelAmount] = useState<number>(0);
  const [partialHotelMode, setPartialHotelMode] = useState<string>('UPI');
  const [partialHotelRef, setPartialHotelRef] = useState<string>('');

  // Quick partial modal / inline states for Cab
  const [activePartialCabCustId, setActivePartialCabCustId] = useState<string | null>(null);
  const [partialCabAmount, setPartialCabAmount] = useState<number>(0);
  const [partialCabMode, setPartialCabMode] = useState<string>('UPI');
  const [partialCabRef, setPartialCabRef] = useState<string>('');

  // Direct Inline Hotel Edit State (cost + details)
  const [editingVoucherId, setEditingVoucherId] = useState<string | null>(null);
  const [tempVoucherCost, setTempVoucherCost] = useState<number>(0);
  const [tempVoucherName, setTempVoucherName] = useState<string>('');
  const [tempVoucherRoomType, setTempVoucherRoomType] = useState<string>('');

  // Direct Inline Cab Edit State (cost + driver details)
  const [editingCabCustId, setEditingCabCustId] = useState<string | null>(null);
  const [tempCabCost, setTempCabCost] = useState<number>(0);
  const [tempDriverName, setTempDriverName] = useState<string>('');
  const [tempDriverPhone, setTempDriverPhone] = useState<string>('');
  const [tempCabModel, setTempCabModel] = useState<string>('');
  const [tempCabNumber, setTempCabNumber] = useState<string>('');
  const [tempCabPickup, setTempCabPickup] = useState<string>('');

  // Direct Inline Remarks Edit State
  const [editingRemarksCustId, setEditingRemarksCustId] = useState<string | null>(null);
  const [tempOpsRemarks, setTempOpsRemarks] = useState<string>('');

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

  // --- Hotel Inline Edit Handlers ---
  const handleStartEditVoucher = (v: HotelVoucher) => {
    if (isReadOnly) return;
    setEditingVoucherId(v.id);
    setTempVoucherCost(v.totalCost || 0);
    setTempVoucherName(v.hotelName || '');
    setTempVoucherRoomType(v.roomType || '');
  };

  const handleSaveVoucherDetails = async (v: HotelVoucher) => {
    if (isReadOnly) {
      alert('Access Restricted: You do not have permission to edit hotel records.');
      return;
    }
    const cost = Number(tempVoucherCost) || 0;
    try {
      const res = await fetch(`/api/ops/vouchers/${v.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          totalCost: cost,
          hotelName: tempVoucherName || v.hotelName,
          roomType: tempVoucherRoomType || v.roomType,
        })
      });
      if (res.ok) {
        const updated = await res.json();
        if (onUpdateVoucher) onUpdateVoucher(updated);
      } else {
        const updatedV: HotelVoucher = {
          ...v,
          totalCost: cost,
          hotelName: tempVoucherName || v.hotelName,
          roomType: tempVoucherRoomType || v.roomType,
        };
        if (onUpdateVoucher) onUpdateVoucher(updatedV);
      }
    } catch (e) {
      console.error('Failed to update voucher details:', e);
      const updatedV: HotelVoucher = {
        ...v,
        totalCost: cost,
        hotelName: tempVoucherName || v.hotelName,
        roomType: tempVoucherRoomType || v.roomType,
      };
      if (onUpdateVoucher) onUpdateVoucher(updatedV);
    }
    setEditingVoucherId(null);
  };

  // --- Cab Inline Edit Handlers ---
  const handleStartEditCab = (cust: Customer) => {
    if (isReadOnly) return;
    setEditingCabCustId(cust.id);
    setTempCabCost(cust.cabTotalCost !== undefined ? cust.cabTotalCost : 0);
    setTempDriverName(cust.driverName || '');
    setTempDriverPhone(cust.driverPhone || '');
    setTempCabModel(cust.cabModel || '');
    setTempCabNumber(cust.cabNumber || '');
    setTempCabPickup(cust.cabPickupLocation || '');
  };

  const handleSaveCabDetails = (cust: Customer) => {
    if (isReadOnly) {
      alert('Access Restricted: You do not have permission to edit cab records.');
      return;
    }
    const cost = Number(tempCabCost) || 0;
    const paid = cust.cabPaymentAmount || 0;
    const status = paid >= cost && cost > 0 ? 'Paid to Driver' : paid > 0 ? 'Partially Paid' : 'Pending';

    const updated: Customer = {
      ...cust,
      cabTotalCost: cost,
      driverName: tempDriverName,
      driverPhone: tempDriverPhone,
      cabModel: tempCabModel,
      cabNumber: tempCabNumber,
      cabPickupLocation: tempCabPickup,
      cabPaymentStatus: status,
    };
    onUpdateCustomer(updated);
    setEditingCabCustId(null);
  };

  // --- Remarks Inline Edit Handlers ---
  const handleStartEditRemarks = (cust: Customer) => {
    if (isReadOnly) return;
    setEditingRemarksCustId(cust.id);
    setTempOpsRemarks(cust.opsRemarks || cust.specialRequests || '');
  };

  const handleSaveRemarks = (cust: Customer) => {
    if (isReadOnly) return;
    const updated: Customer = {
      ...cust,
      opsRemarks: tempOpsRemarks,
    };
    onUpdateCustomer(updated);
    setEditingRemarksCustId(null);
  };

  // --- Hotel Payment Actions ---
  const handleHotelCompletePaymentDone = (cust: Customer, voucher: HotelVoucher, defaultCost: number) => {
    const totalCost = voucher.totalCost || defaultCost || 12000;
    const currentPaid = voucher.paidAmount || 0;
    const remaining = Math.max(0, totalCost - currentPaid);
    const partAmount = remaining > 0 ? remaining : totalCost;
    const now = getNowFormatted();
    const mode = voucher.paymentMode || 'UPI / Bank';
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

  // --- Cab Payment Actions ---
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
    const ref = partialCabRef || `CAB-ADV-${Math.floor(100000 + Math.random() * 90000)}`;

    const prevLogs = Array.isArray(cust.cabPaymentLogs) ? cust.cabPaymentLogs : [];
    const newLog = {
      id: `cab-part-${Date.now()}`,
      amount: partialCabAmount,
      paidAt: now,
      paymentMode: partialCabMode,
      paymentRef: ref,
      remarks: `Partial payment of ₹${partialCabAmount.toLocaleString('en-IN')} paid to driver.`,
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
        <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
            <p className="font-medium">Read-Only View: Payment modifications and payout logs are restricted.</p>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold text-[11px]">View Only</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs uppercase tracking-wider mb-1">
            <Building2 size={15} />
            <span>Operations Logistics & Payouts</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-800">Hotel & Cab Driver Payment Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage individual hotel voucher payouts and driver logistics. Edit costs directly on cards, record partial advances or mark payments cleared.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] uppercase font-medium text-slate-500 block">Total Trips</span>
            <span className="text-base font-semibold text-slate-800 tabular-nums">{customers.length}</span>
          </div>
          <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
            <span className="text-[10px] uppercase font-medium text-emerald-600 block">Active Logistics</span>
            <span className="text-base font-semibold text-emerald-700 tabular-nums">
              {customers.filter((c) => c.hotelPaymentStatus === 'Paid to Hotel' || c.cabPaymentStatus === 'Paid to Driver').length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 rounded-lg bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <User size={15} className="text-slate-400" />
          <span className="font-medium text-slate-700">Filter by Trip:</span>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="px-2.5 py-1.5 rounded-md text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[280px]"
          >
            <option value="all">All Converted Trips ({customers.length})</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.bookingId}) - {c.destination}
              </option>
            ))}
          </select>
        </div>

        <span className="text-slate-500">
          Showing <strong className="text-slate-800 tabular-nums">{filtered.length}</strong> trip payment records
        </span>
      </div>

      {/* Trip Cards */}
      <div className="space-y-6">
        {filtered.map((cust) => {
          const isEditingCab = editingCabCustId === cust.id;
          const isEditingRemarks = editingRemarksCustId === cust.id;

          const driverName = cust.driverName || '';
          const driverPhone = cust.driverPhone || '';
          const cabModel = cust.cabModel || '';
          const cabNumber = cust.cabNumber || '';
          const cabPickup = cust.cabPickupLocation || '';

          // Cab Financials
          const cabCost = cust.cabTotalCost || 0;
          const cabPaid = cust.cabPaymentAmount || 0;
          const cabRemaining = Math.max(0, cabCost - cabPaid);
          const cabPayStatus = cust.cabPaymentStatus || (cabPaid >= cabCost && cabCost > 0 ? 'Paid to Driver' : cabPaid > 0 ? 'Partially Paid' : 'Pending');
          const cabPayDate = cust.cabPaymentDate || '—';
          const cabPayMode = cust.cabPaymentMode || '';
          const cabPayRef = cust.cabPaymentRef || '—';

          const opsRemarks = cust.opsRemarks || cust.specialRequests || '';

          // Find hotel vouchers for this customer
          const custVouchers = vouchers.filter(
            (v) => v.customerId === cust.id || v.bookingId === cust.bookingId
          );

          // Compute aggregate hotel totals
          const totalHotelsBudget = custVouchers.reduce((sum, v) => sum + (v.totalCost || 0), 0);
          const totalHotelsPaid = custVouchers.reduce((sum, v) => sum + (v.paidAmount || 0), 0);
          const totalHotelsRemaining = Math.max(0, totalHotelsBudget - totalHotelsPaid);

          return (
            <div key={cust.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              
              {/* Trip Header */}
              <div className="p-4 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-[11px] font-semibold border border-slate-700">
                      {cust.bookingId}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium text-[11px]">
                      {cust.destination}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-300 font-medium text-[11px] flex items-center gap-1">
                      <Calendar size={12} />
                      {cust.startDate} to {cust.endDate}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium text-[11px]">
                      {custVouchers.length} {custVouchers.length === 1 ? 'Hotel' : 'Hotels'}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-white">
                    Guest: {cust.name} <span className="text-xs font-normal text-slate-400">({cust.paxAdults} Adults {cust.paxChildren > 0 ? `· ${cust.paxChildren} Child` : ''})</span>
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300">
                    Total Trip Amount: <strong className="font-mono text-white text-sm">₹{(cust.totalAmount || 0).toLocaleString('en-IN')}</strong>
                  </span>
                </div>
              </div>

              {/* Trip Body */}
              <div className="p-5 space-y-5 bg-slate-50/40">
                
                {/* 1. HOTEL BREAKDOWN SECTION */}
                <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-indigo-50 text-indigo-600">
                        <Building2 size={16} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">Hotel Payments Breakdown ({custVouchers.length} {custVouchers.length === 1 ? 'Hotel' : 'Hotels'})</h4>
                        <p className="text-[11px] text-slate-500">
                          Payout records for individual hotel properties. Edit cost or record payouts directly.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="px-2.5 py-1 rounded-md bg-slate-50 border border-slate-100 text-slate-600 text-xs">
                        Budget: <strong className="text-slate-800 font-mono">₹{totalHotelsBudget.toLocaleString('en-IN')}</strong>
                      </div>
                      <div className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs">
                        Paid: <strong className="font-mono">₹{totalHotelsPaid.toLocaleString('en-IN')}</strong>
                      </div>
                      {totalHotelsRemaining > 0 && (
                        <div className="px-2.5 py-1 rounded-md bg-amber-50 border border-amber-100 text-amber-700 text-xs">
                          Due: <strong className="font-mono">₹{totalHotelsRemaining.toLocaleString('en-IN')}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Individual Hotel Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {custVouchers.map((v, idx) => {
                      const hCost = v.totalCost || 0;
                      const hPaid = v.paidAmount || 0;
                      const hRemaining = Math.max(0, hCost - hPaid);
                      const hStatus = v.paymentStatus || (hPaid >= hCost && hCost > 0 ? 'Paid to Hotel' : hPaid > 0 ? 'Partially Paid' : 'Pending');
                      const hPaidAt = v.paidAt || '—';
                      const hMode = v.paymentMode || 'UPI / Bank';
                      const hRef = v.paymentRef || '—';
                      const isPartialOpen = activePartialHotelId === v.id;
                      const isEditing = editingVoucherId === v.id;

                      return (
                        <div 
                          key={v.id} 
                          className={`p-4 rounded-lg border transition-all space-y-3.5 flex flex-col justify-between ${
                            hStatus === 'Paid to Hotel' 
                              ? 'bg-white border-emerald-200' 
                              : hStatus === 'Partially Paid' 
                              ? 'bg-white border-amber-200' 
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div>
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                    Hotel #{idx + 1} · {v.city || cust.destination}
                                  </span>
                                  {!isReadOnly && !isEditing && (
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditVoucher(v)}
                                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                      title="Edit Hotel Details & Cost"
                                    >
                                      <Pencil size={12} />
                                    </button>
                                  )}
                                </div>

                                {isEditing ? (
                                  <div className="space-y-1.5 mt-1">
                                    <input
                                      type="text"
                                      value={tempVoucherName}
                                      onChange={(e) => setTempVoucherName(e.target.value)}
                                      placeholder="Hotel Name"
                                      className="w-full px-2 py-1 text-xs font-semibold border border-indigo-300 rounded bg-indigo-50/40 outline-none"
                                    />
                                    <input
                                      type="text"
                                      value={tempVoucherRoomType}
                                      onChange={(e) => setTempVoucherRoomType(e.target.value)}
                                      placeholder="Room Type"
                                      className="w-full px-2 py-1 text-[11px] font-medium border border-slate-300 rounded bg-white outline-none"
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <h5 className="font-semibold text-slate-800 text-sm truncate">
                                      {v.hotelName || `Hotel ${idx + 1}`}
                                    </h5>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                                      <BedDouble size={12} className="text-slate-400" />
                                      <span>{v.roomType || 'Standard Deluxe'}</span>
                                    </p>
                                  </>
                                )}
                              </div>

                              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${
                                hStatus === 'Paid to Hotel' 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                  : hStatus === 'Partially Paid' 
                                  ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                {hStatus}
                              </span>
                            </div>

                            {/* Financial Metric Row */}
                            <div className="grid grid-cols-3 gap-2 text-center mt-2.5">
                              {/* Cost */}
                              <div className="p-2 rounded-md bg-slate-50 border border-slate-100">
                                <span className="text-[10px] uppercase font-medium text-slate-500 block">Cost</span>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={tempVoucherCost}
                                    onChange={(e) => setTempVoucherCost(Number(e.target.value))}
                                    className="w-full text-center px-1 py-0.5 text-xs font-mono font-semibold border border-indigo-300 rounded bg-white mt-1 outline-none"
                                  />
                                ) : (
                                  <span className="font-semibold text-sm text-slate-800 font-mono block mt-0.5 tabular-nums">
                                    ₹{hCost.toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>

                              {/* Paid */}
                              <div className="p-2 rounded-md bg-emerald-50 border border-emerald-100">
                                <span className="text-[10px] uppercase font-medium text-emerald-600 block">Paid</span>
                                <span className="font-semibold text-sm text-emerald-700 font-mono block mt-0.5 tabular-nums">
                                  ₹{hPaid.toLocaleString('en-IN')}
                                </span>
                              </div>

                              {/* Balance */}
                              <div className="p-2 rounded-md bg-amber-50 border border-amber-100">
                                <span className="text-[10px] uppercase font-medium text-amber-600 block">Balance</span>
                                <span className="font-semibold text-sm text-amber-700 font-mono block mt-0.5 tabular-nums">
                                  ₹{hRemaining.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>

                            {/* Inline Edit Action Buttons */}
                            {isEditing && (
                              <div className="flex items-center gap-1.5 mt-2 justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleSaveVoucherDetails(v)}
                                  className="px-2.5 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium transition-colors"
                                >
                                  Save Details
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingVoucherId(null)}
                                  className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-medium transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}

                            {/* Payment Metadata */}
                            <div className="mt-2.5 p-2 rounded-md bg-slate-50 border border-slate-100 text-[11px] space-y-1">
                              <div className="flex items-center justify-between text-slate-600">
                                <span className="text-slate-400">Paid Date:</span>
                                <span className="font-mono text-slate-700 font-medium">{hPaidAt}</span>
                              </div>
                              <div className="flex items-center justify-between text-slate-600">
                                <span className="text-slate-400">Mode:</span>
                                <span className="font-medium text-slate-700">{hMode}</span>
                              </div>
                              <div className="flex items-center justify-between text-slate-600">
                                <span className="text-slate-400">Ref #:</span>
                                <span className="font-mono text-slate-700 truncate max-w-[140px]">{hRef}</span>
                              </div>
                            </div>

                            {/* Payment Parts Log */}
                            {Array.isArray(v.paymentLogs) && v.paymentLogs.length > 0 && (
                              <div className="mt-2 p-2 rounded-md bg-slate-50 border border-slate-100 text-[11px] space-y-1">
                                <div className="text-[10px] font-semibold uppercase text-slate-500 flex items-center justify-between">
                                  <span>Installments ({v.paymentLogs.length})</span>
                                  <span className="font-mono text-emerald-700">₹{v.paymentLogs.reduce((acc, p) => acc + (p.amount || 0), 0).toLocaleString('en-IN')}</span>
                                </div>
                                {v.paymentLogs.map((part, pIdx) => (
                                  <div key={part.id || pIdx} className="flex items-center justify-between text-[10px] text-slate-600 bg-white p-1 rounded border border-slate-100">
                                    <span className="font-mono text-slate-400">{part.paidAt}</span>
                                    <span>Part {pIdx + 1}: <strong className="font-mono text-emerald-700">₹{part.amount.toLocaleString('en-IN')}</strong></span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Quick Payment Actions */}
                          {!isReadOnly && (
                            <div className="pt-2 border-t border-slate-100">
                              {hStatus !== 'Paid to Hotel' ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleHotelCompletePaymentDone(cust, v, hCost)}
                                    className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                                  >
                                    <Check size={14} />
                                    <span>Payment Done</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isPartialOpen) {
                                        setActivePartialHotelId(null);
                                      } else {
                                        setActivePartialHotelId(v.id);
                                        setPartialHotelAmount(0);
                                        setPartialHotelMode('UPI');
                                        setPartialHotelRef('');
                                      }
                                    }}
                                    className="py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
                                  >
                                    <span>Partial</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="py-1.5 px-3 rounded-lg bg-emerald-50 border border-emerald-100 text-center text-emerald-700 text-xs font-medium flex items-center justify-center gap-1.5">
                                  <CheckCircle2 size={14} className="text-emerald-600" />
                                  <span>100% Hotel Payment Cleared</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Inline Partial Payment Form */}
                          {!isReadOnly && isPartialOpen && (
                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs animate-in fade-in duration-150">
                              <div className="flex items-center justify-between font-medium text-slate-700 border-b border-slate-200 pb-1.5">
                                <span>Record Partial Payment:</span>
                                <span className="font-mono text-amber-700 font-semibold">Due: ₹{hRemaining.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="space-y-1.5">
                                <div>
                                  <label className="text-[10px] text-slate-500 block">Amount (₹):</label>
                                  <input
                                    type="number"
                                    value={partialHotelAmount}
                                    onChange={(e) => setPartialHotelAmount(Number(e.target.value))}
                                    className="w-full px-2 py-1 rounded bg-white text-slate-800 font-mono font-semibold border border-slate-200 text-xs outline-none focus:border-indigo-400"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[10px] text-slate-500 block">Mode:</label>
                                    <select
                                      value={partialHotelMode}
                                      onChange={(e) => setPartialHotelMode(e.target.value)}
                                      className="w-full px-1.5 py-1 rounded bg-white text-slate-700 border border-slate-200 text-xs outline-none"
                                    >
                                      <option value="UPI">UPI</option>
                                      <option value="Bank Transfer">Bank Transfer</option>
                                      <option value="Card">Card</option>
                                      <option value="Cash">Cash</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-slate-500 block">UTR / Ref #:</label>
                                    <input
                                      type="text"
                                      value={partialHotelRef}
                                      onChange={(e) => setPartialHotelRef(e.target.value)}
                                      className="w-full px-2 py-1 rounded bg-white text-slate-800 font-mono text-xs border border-slate-200 outline-none"
                                      placeholder="Ref #"
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleSavePartialHotelPayment(cust, v, hCost)}
                                    className="flex-1 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-colors"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActivePartialHotelId(null)}
                                    className="px-2 py-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-600 text-xs font-medium transition-colors"
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

                {/* 2. CAB & DRIVER LOGISTICS & PAYOUTS */}
                <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-teal-50 text-teal-600">
                        <Car size={16} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">Cab & Driver Payment Management</h4>
                        <p className="text-[11px] text-slate-500">
                          Driver allocation, vehicle details, and payout tracking with full or partial payment options.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                        cabPayStatus === 'Paid to Driver' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        cabPayStatus === 'Partially Paid' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {cabPayStatus}
                      </span>
                    </div>
                  </div>

                  {/* 3-Column Cab Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    
                    {/* Column 1: Assigned Driver & Vehicle Info */}
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between text-xs">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] uppercase font-semibold text-slate-500">Assigned Driver & Vehicle</span>
                          {!isReadOnly && !isEditingCab && (
                            <button
                              type="button"
                              onClick={() => handleStartEditCab(cust)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors flex items-center gap-1 text-[11px]"
                              title="Edit Driver & Vehicle Details"
                            >
                              <Pencil size={12} />
                              <span>Edit</span>
                            </button>
                          )}
                        </div>

                        {isEditingCab ? (
                          <div className="space-y-2 mt-1">
                            <div>
                              <label className="text-[10px] text-slate-500 block">Driver Name:</label>
                              <input
                                type="text"
                                value={tempDriverName}
                                onChange={(e) => setTempDriverName(e.target.value)}
                                className="w-full px-2 py-1 text-xs font-semibold border border-indigo-300 rounded bg-white outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 block">Driver Phone:</label>
                              <input
                                type="text"
                                value={tempDriverPhone}
                                onChange={(e) => setTempDriverPhone(e.target.value)}
                                className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded bg-white outline-none"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-slate-500 block">Cab Model:</label>
                                <input
                                  type="text"
                                  value={tempCabModel}
                                  onChange={(e) => setTempCabModel(e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-500 block">Cab Number:</label>
                                <input
                                  type="text"
                                  value={tempCabNumber}
                                  onChange={(e) => setTempCabNumber(e.target.value)}
                                  className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded bg-white outline-none"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-500 block">Pickup Location:</label>
                              <input
                                type="text"
                                value={tempCabPickup}
                                onChange={(e) => setTempCabPickup(e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white outline-none"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1 mt-1">
                            <strong className="text-slate-800 text-sm font-semibold block">{driverName}</strong>
                            <p className="font-mono text-xs text-slate-600">{cabModel} ({cabNumber})</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin size={12} className="text-slate-400 flex-shrink-0" />
                              <span className="truncate">{cabPickup}</span>
                            </p>
                          </div>
                        )}
                      </div>

                      {isEditingCab ? (
                        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleSaveCabDetails(cust)}
                            className="flex-1 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium transition-colors"
                          >
                            Save Cab Details
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCabCustId(null)}
                            className="px-2.5 py-1.5 text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <a 
                          href={`tel:${driverPhone}`} 
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-mono font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Phone size={13} className="text-slate-500" />
                          <span>Call Driver: {driverPhone}</span>
                        </a>
                      )}
                    </div>

                    {/* Column 2: Cab Financial Metrics */}
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-3 flex flex-col justify-between text-xs">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] uppercase font-semibold text-slate-500">Cab Payout Metrics</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-2 rounded-md bg-white border border-slate-200">
                            <span className="text-[10px] uppercase font-medium text-slate-400 block">Cost</span>
                            {isEditingCab ? (
                              <input
                                type="number"
                                value={tempCabCost}
                                onChange={(e) => setTempCabCost(Number(e.target.value))}
                                className="w-full text-center px-1 py-0.5 text-xs font-mono font-semibold border border-indigo-300 rounded bg-white mt-1 outline-none"
                              />
                            ) : (
                              <span className="font-semibold text-sm text-slate-800 font-mono block mt-0.5 tabular-nums">
                                ₹{cabCost.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                          <div className="p-2 rounded-md bg-emerald-50 border border-emerald-100">
                            <span className="text-[10px] uppercase font-medium text-emerald-600 block">Paid</span>
                            <span className="font-semibold text-sm text-emerald-700 font-mono block mt-0.5 tabular-nums">
                              ₹{cabPaid.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="p-2 rounded-md bg-amber-50 border border-amber-100">
                            <span className="text-[10px] uppercase font-medium text-amber-600 block">Balance</span>
                            <span className="font-semibold text-sm text-amber-700 font-mono block mt-0.5 tabular-nums">
                              ₹{cabRemaining.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        <div className="p-2 rounded-md bg-white border border-slate-200 text-[11px] space-y-1 font-medium mt-2.5">
                          <div className="flex justify-between text-slate-600">
                            <span className="text-slate-400">Paid Date:</span>
                            <span className="font-mono text-slate-700">{cabPayDate}</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span className="text-slate-400">Mode:</span>
                            <span className="text-slate-700 font-medium">{cabPayMode}</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span className="text-slate-400">Ref #:</span>
                            <span className="font-mono text-slate-700 truncate max-w-[140px]">{cabPayRef}</span>
                          </div>
                        </div>

                        {/* Cab Payment Parts Log */}
                        {Array.isArray(cust.cabPaymentLogs) && cust.cabPaymentLogs.length > 0 && (
                          <div className="mt-2 p-2 rounded-md bg-white border border-slate-200 text-[11px] space-y-1">
                            <div className="text-[10px] font-semibold uppercase text-slate-500 flex items-center justify-between">
                              <span>Installments ({cust.cabPaymentLogs.length})</span>
                              <span className="font-mono text-emerald-700 font-semibold">₹{cust.cabPaymentLogs.reduce((acc, p) => acc + (p.amount || 0), 0).toLocaleString('en-IN')}</span>
                            </div>
                            {cust.cabPaymentLogs.map((part, pIdx) => (
                              <div key={part.id || pIdx} className="flex items-center justify-between text-[10px] text-slate-600 bg-slate-50 p-1 rounded border border-slate-100">
                                <span className="font-mono text-slate-400">{part.paidAt}</span>
                                <span>Part {pIdx + 1}: <strong className="font-mono text-emerald-700">₹{part.amount.toLocaleString('en-IN')}</strong></span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Column 3: Cab Payment Controls */}
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">Cab Payout Actions</span>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          {cabPaid >= cabCost ? 'Full cab payment has been cleared to driver.' : `Pending balance of ₹${cabRemaining.toLocaleString('en-IN')} remaining.`}
                        </p>
                      </div>

                      {!isReadOnly && (
                        <div className="space-y-2">
                          {cabPayStatus !== 'Paid to Driver' ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleCabCompletePaymentDone(cust)}
                                className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <Check size={14} />
                                <span>Payment Done</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (activePartialCabCustId === cust.id) {
                                    setActivePartialCabCustId(null);
                                  } else {
                                    setActivePartialCabCustId(cust.id);
                                    setPartialCabAmount(0);
                                    setPartialCabMode('UPI');
                                    setPartialCabRef('');
                                  }
                                }}
                                className="py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
                              >
                                <span>Partial</span>
                              </button>
                            </div>
                          ) : (
                            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100 text-center text-emerald-700 font-medium text-xs flex items-center justify-center gap-1.5">
                              <CheckCircle2 size={14} className="text-emerald-600" />
                              <span>100% Cab Payment Completed</span>
                            </div>
                          )}

                          {/* Inline Partial Payment Box for Cab */}
                          {activePartialCabCustId === cust.id && (
                            <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-2 text-xs animate-in fade-in duration-150 mt-2">
                              <div className="flex items-center justify-between font-medium text-slate-700 border-b border-slate-100 pb-1.5">
                                <span>Record Driver Partial Advance:</span>
                                <span className="font-mono text-amber-700 font-semibold">Due: ₹{cabRemaining.toLocaleString('en-IN')}</span>
                              </div>
                              <div className="space-y-1.5">
                                <div>
                                  <label className="text-[10px] text-slate-500 block">Amount (₹):</label>
                                  <input
                                    type="number"
                                    value={partialCabAmount}
                                    onChange={(e) => setPartialCabAmount(Number(e.target.value))}
                                    className="w-full px-2 py-1 rounded bg-slate-50 text-slate-800 font-mono font-semibold border border-slate-200 text-xs outline-none focus:border-indigo-400"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[10px] text-slate-500 block">Mode:</label>
                                    <select
                                      value={partialCabMode}
                                      onChange={(e) => setPartialCabMode(e.target.value)}
                                      className="w-full px-1.5 py-1 rounded bg-slate-50 text-slate-700 border border-slate-200 text-xs outline-none"
                                    >
                                      <option value="UPI">UPI</option>
                                      <option value="Cash">Cash</option>
                                      <option value="Bank Transfer">Bank Transfer</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-slate-500 block">UTR / Ref #:</label>
                                    <input
                                      type="text"
                                      value={partialCabRef}
                                      onChange={(e) => setPartialCabRef(e.target.value)}
                                      className="w-full px-2 py-1 rounded bg-slate-50 text-slate-800 font-mono text-xs border border-slate-200 outline-none"
                                      placeholder="Ref #"
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleSavePartialCabPayment(cust)}
                                    className="flex-1 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-colors"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActivePartialCabCustId(null)}
                                    className="px-2 py-1.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-600 text-xs font-medium transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                {/* 3. INTERNAL TRIP OPERATIONS REMARKS */}
                <div className="p-3.5 rounded-lg bg-white border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <div className="flex items-center gap-1.5 font-medium text-slate-700">
                      <MessageSquare size={14} className="text-slate-400" />
                      <span>Operations Remarks</span>
                    </div>
                    {!isReadOnly && !isEditingRemarks && (
                      <button
                        type="button"
                        onClick={() => handleStartEditRemarks(cust)}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors flex items-center gap-1 text-[11px]"
                      >
                        <Pencil size={12} />
                        <span>Edit Remarks</span>
                      </button>
                    )}
                  </div>

                  {isEditingRemarks ? (
                    <div className="space-y-2">
                      <textarea
                        rows={2}
                        value={tempOpsRemarks}
                        onChange={(e) => setTempOpsRemarks(e.target.value)}
                        className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-normal text-xs text-slate-800 outline-none focus:border-indigo-400"
                        placeholder="Add operational remarks e.g. Guest requested early check-in, driver briefing completed..."
                      />
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => handleSaveRemarks(cust)}
                          className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium transition-colors"
                        >
                          Save Remarks
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingRemarksCustId(null)}
                          className="px-2.5 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-600 leading-relaxed font-normal">
                      {opsRemarks}
                    </p>
                  )}
                </div>

              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
