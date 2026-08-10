import React from 'react';
import { 
  X, 
  User, 
  MapPin, 
  Calendar, 
  Phone, 
  Mail, 
  IndianRupee, 
  Hotel, 
  FileText, 
  CheckCircle, 
  Clock, 
  Share2, 
  ChevronRight,
  ShieldAlert,
  AlertTriangle,
  CreditCard,
  Receipt,
  Plus,
  Car,
  Building2,
  MessageSquare
} from 'lucide-react';
import { Customer, HotelVoucher, TripItinerary, PaymentInstallment } from '../types';
import { ensureCustomerInstallments } from '../utils/storage';

interface CustomerDetailDrawerProps {
  customer: Customer | null;
  vouchers: HotelVoucher[];
  itinerary: TripItinerary | undefined;
  onClose: () => void;
  onOpenShare: (customer: Customer) => void;
  onNavigateToDayWise: (customerId: string) => void;
  onNavigateToInvoices?: (customerId: string) => void;
  onPreviewVoucher: (voucher: HotelVoucher) => void;
  onRecordPaymentClick: (customer: Customer, installment: PaymentInstallment) => void;
}

export const CustomerDetailDrawer: React.FC<CustomerDetailDrawerProps> = ({
  customer,
  vouchers,
  itinerary,
  onClose,
  onOpenShare,
  onNavigateToDayWise,
  onNavigateToInvoices,
  onPreviewVoucher,
  onRecordPaymentClick,
}) => {
  if (!customer) return null;

  const customerVouchers = vouchers.filter((v) => v.bookingId === customer.bookingId || v.customerId === customer.id);
  const installments = ensureCustomerInstallments(customer);
  
  let computedHotelTotalCost = 0;
  if (customerVouchers && customerVouchers.length > 0) {
    computedHotelTotalCost = customerVouchers.reduce((acc, v) => acc + (v.totalCost || 0), 0);
  } else if (Array.isArray(customer.hotelPayments) && customer.hotelPayments.length > 0) {
    computedHotelTotalCost = customer.hotelPayments.reduce((acc, hp) => acc + (hp.totalCost || 0), 0);
  } else {
    computedHotelTotalCost = customer.hotelTotalCost || 0;
  }

  const totalPaid = installments
    .filter((i) => i.status === 'Paid')
    .reduce((sum, i) => sum + i.amount, 0);

  const totalOverdue = installments
    .filter((i) => i.status === 'Overdue')
    .reduce((sum, i) => sum + i.amount, 0);

  const balanceDue = customer.totalAmount - totalPaid;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-xl h-full shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 /80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 /50 px-2.5 py-0.5 rounded border border-blue-200">
                {customer.bookingId}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {customer.status}
              </span>
            </div>
            <h3 className="font-bold text-slate-900 text-lg mt-1">{customer.name}</h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          
          {/* Key Overview Cards */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 /60 border border-slate-200">
              <span className="text-slate-500 font-semibold block mb-0.5">Destination:</span>
              <span className="font-bold text-slate-900 text-sm">{customer.destination}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 /60 border border-slate-200">
              <span className="text-slate-500 font-semibold block mb-0.5">Travel Dates:</span>
              <span className="font-bold text-slate-900">{customer.startDate} to {customer.endDate}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 /60 border border-slate-200">
              <span className="text-slate-500 font-semibold block mb-0.5">PAX Count:</span>
              <span className="font-bold text-slate-900">{customer.paxAdults} Adults {customer.paxChildren > 0 ? `, ${customer.paxChildren} Children` : ''}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 /60 border border-slate-200">
              <span className="text-slate-500 font-semibold block mb-0.5">Total Package:</span>
              <span className="font-bold text-slate-900 text-sm">₹{customer.totalAmount.toLocaleString()} {customer.currency === 'USD' ? 'INR' : (customer.currency || 'INR')}</span>
            </div>
          </div>

          {/* PAYMENT INSTALLMENTS & RECONCILIATION SECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-600" /> Payment Schedule & Installments
              </h4>
              <span className="text-[11px] font-bold text-slate-600">
                Paid: ₹{totalPaid.toLocaleString()} / ₹{customer.totalAmount.toLocaleString()}
              </span>
            </div>

            {/* Financial Status Summary */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 /80 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Received</span>
                <span className="text-emerald-600 font-black text-sm">₹{totalPaid.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Overdue</span>
                <span className={`font-black text-sm ${totalOverdue > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`}>
                  ₹{totalOverdue.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Remaining</span>
                <span className="text-slate-900 font-black text-sm">₹{balanceDue.toLocaleString()}</span>
              </div>
            </div>

            {/* Installment Items */}
            {installments.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                <p className="font-bold">Package Amount Not Added</p>
                <p className="text-[11px] text-amber-700">Add a package total amount and save to view the EMI installment schedule.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {installments.map((inst) => (
                  <div
                    key={inst.id}
                    className={`p-3.5 rounded-xl border text-xs transition-all space-y-1.5 ${
                      inst.status === 'Paid'
                        ? 'bg-emerald-50/60 /30 border-emerald-200 '
                        : inst.status === 'Overdue'
                        ? 'bg-rose-50 /40 border-rose-300  ring-1 ring-rose-500/20'
                        : 'bg-slate-50 /70 border-slate-200 '
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-900 flex items-center gap-1.5">
                        {inst.status === 'Overdue' && <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-bounce" />}
                        {inst.title}
                      </span>
                      <span className="text-sm text-slate-900">₹{inst.amount.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Due Date: <strong>{inst.dueDate}</strong></span>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          inst.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                          inst.status === 'Overdue' ? 'bg-rose-600 text-white font-black animate-pulse' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {inst.status}
                        </span>

                        <button
                          onClick={() => onRecordPaymentClick(customer, inst)}
                          className={`px-2.5 py-1 rounded font-bold text-[11px] transition-colors shadow-2xs ${
                            inst.status === 'Paid'
                              ? 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                              : inst.status === 'Overdue'
                              ? 'bg-rose-600 hover:bg-rose-700 text-white font-extrabold'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold'
                          }`}
                        >
                          {inst.status === 'Paid' ? 'Edit / Update EMI' : '✓ Confirm EMI Received'}
                        </button>
                      </div>
                    </div>

                    {inst.status === 'Paid' && (
                      <div className="pt-1 text-[11px] text-emerald-800 font-medium flex items-center justify-between border-t border-emerald-200/60 /60">
                        <span>Received on: {inst.paidAt || 'Confirmed'}</span>
                        <span>Mode: {inst.paymentMode || 'Direct'} ({inst.transactionRef || 'N/A'})</span>
                      </div>
                    )}

                    {inst.notes && (
                      <p className="text-[10px] text-slate-400 italic">Note: {inst.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CAB DRIVER LOGISTICS SECTION (OPERATIONS ONLY) */}
          <div className="space-y-3 p-4 rounded-2xl bg-teal-50/40 border border-teal-200">
            <h4 className="text-xs font-black uppercase tracking-wider text-teal-900 flex items-center gap-1.5">
              <Car className="w-4 h-4 text-teal-700" /> Assigned Cab Driver & Vehicle Details
            </h4>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white border border-teal-100">
                <span className="text-[10px] text-slate-500 font-bold block">Driver Name</span>
                <strong className="text-slate-900 font-extrabold">{customer.driverName || 'Rajesh Sharma'}</strong>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-teal-100">
                <span className="text-[10px] text-slate-500 font-bold block">Driver Mobile</span>
                <a href={`tel:${customer.driverPhone || '+91 98290 12345'}`} className="text-teal-700 font-mono font-bold hover:underline">
                  {customer.driverPhone || '+91 98290 12345'}
                </a>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-teal-100">
                <span className="text-[10px] text-slate-500 font-bold block">Vehicle Model</span>
                <strong className="text-slate-900 font-bold">{customer.cabModel || 'Toyota Innova Crysta'}</strong>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-teal-100">
                <span className="text-[10px] text-slate-500 font-bold block">Cab Reg No</span>
                <strong className="text-slate-900 font-mono">{customer.cabNumber || 'RJ 14 CZ 9876'}</strong>
              </div>
            </div>
          </div>

          {/* PAYMENT CONFIRMATION BOXES (HOTEL & CAB) */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" /> Vendor Payment Confirmation Boxes
            </h4>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Hotel Payment Box */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-800 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-teal-700" /> Hotel Payment
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    customer.hotelPaymentStatus === 'Paid to Hotel' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {customer.hotelPaymentStatus || 'Pending'}
                  </span>
                </div>
                <p className="text-[11px] font-black text-slate-900">
                  ₹{(computedHotelTotalCost || customer.hotelPaymentAmount || Math.round((customer.totalAmount || 0) * 0.4)).toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-500">Mode: {customer.hotelPaymentMode || 'Bank Wire'}</p>
              </div>

              {/* Cab Payment Box */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-800 flex items-center gap-1">
                    <Car className="w-3.5 h-3.5 text-emerald-600" /> Cab Payment
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    customer.cabPaymentStatus === 'Paid to Driver' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {customer.cabPaymentStatus || 'Pending'}
                  </span>
                </div>
                <p className="text-[11px] font-black text-slate-900">
                  ₹{(customer.cabTotalCost || customer.cabPaymentAmount || Math.round((customer.totalAmount || 0) * 0.2)).toLocaleString()}
                </p>
                <p className="text-[10px] text-slate-500">Mode: {customer.cabPaymentMode || 'UPI'}</p>
              </div>
            </div>
          </div>

          {/* INTERNAL OPERATIONS REMARKS */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-indigo-600" /> Internal Operations Remarks
            </h4>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium italic">
              {customer.opsRemarks || customer.specialRequests || 'No special remarks recorded.'}
            </div>
          </div>

          {/* Contact Details & Emergency */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Contact & Emergency Information
            </h4>
            
            <div className="p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-600" /> Phone:
                </span>
                <strong className="text-slate-900">{customer.phone}</strong>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600" /> Email:
                </span>
                <strong className="text-slate-900">{customer.email}</strong>
              </div>

              {customer.emergencyContact && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5 text-rose-600 font-semibold">
                    <ShieldAlert className="w-3.5 h-3.5" /> Emergency Contact:
                  </span>
                  <strong className="text-slate-900">{customer.emergencyContact}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Linked Hotel Vouchers Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Hotel className="w-4 h-4 text-amber-600" /> Linked Hotel Vouchers ({customerVouchers.length})
              </h4>
            </div>

            {customerVouchers.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No hotel vouchers linked yet.</p>
            ) : (
              <div className="space-y-2.5">
                {customerVouchers.map((v) => (
                  <div
                    key={v.id}
                    className="p-3.5 rounded-xl bg-slate-50 /80 border border-slate-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <h5 className="font-bold text-slate-900">{v.hotelName} ({v.city})</h5>
                      <p className="text-slate-500 text-[11px]">{v.checkIn} - {v.checkOut} ({v.roomType})</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        v.status === 'Uploaded' || v.status === 'Sent to Customer'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {v.status}
                      </span>

                      {(v.status === 'Uploaded' || v.status === 'Sent to Customer') && (
                        <button
                          onClick={() => onPreviewVoucher(v)}
                          className="px-2.5 py-1 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                        >
                          View
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes & Requests */}
          {(customer.notes || customer.specialRequests) && (
            <div className="p-4 rounded-xl bg-blue-50/60 /20 border border-blue-200 text-xs text-blue-950 space-y-1">
              <span className="font-bold block">Ops Notes & Requests:</span>
              <p>{customer.notes}</p>
              {customer.specialRequests && <p className="italic">"{customer.specialRequests}"</p>}
            </div>
          )}

        </div>

        {/* Drawer Bottom Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 /80 flex items-center justify-between gap-2">
          {onNavigateToInvoices && (
            <button
              onClick={() => {
                onClose();
                onNavigateToInvoices(customer.id);
              }}
              className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              <Receipt className="w-4 h-4 text-emerald-400" />
              <span>Generate Invoice</span>
            </button>
          )}

          <button
            onClick={() => onOpenShare(customer)}
            className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onNavigateToDayWise(customer.id);
            }}
            className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <span>Day-Wise</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
