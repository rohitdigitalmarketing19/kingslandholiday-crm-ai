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

  const totalPaid = customer.receivedAmount ?? installments.reduce((sum,i)=>sum+Number(i.paidAmount ?? (i.status==='Paid'?i.amount:0)),0);

  const totalOverdue = installments
    .filter((i) => i.status === 'Overdue')
    .reduce((sum, i) => sum + Math.max(0,i.amount-Number(i.paidAmount || 0)), 0);

  const balanceDue = customer.totalAmount - totalPaid;

  return (
    <div className="fixed inset-0 z-50 bg-inverse/60 backdrop-blur-xs flex justify-end">
      <div className="bg-surface w-full max-w-xl h-full shadow-sm flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-line flex items-center justify-between bg-canvas /80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-bold text-brand-ink bg-brand-soft /50 px-2.5 py-0.5 rounded border border-brand-line">
                {customer.bookingId}
              </span>
              <span className="text-sm px-2.5 py-0.5 rounded-full font-bold bg-success-soft text-success-ink border border-success-line">
                {customer.status}
              </span>
            </div>
            <h3 className="font-bold text-content text-lg mt-1">{customer.name}</h3>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted hover:text-secondary hover:bg-hover/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          
          {/* Key Overview Cards */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-canvas /60 border border-line">
              <span className="text-secondary font-semibold block mb-0.5">Destination:</span>
              <span className="font-bold text-content text-sm">{customer.destination}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-canvas /60 border border-line">
              <span className="text-secondary font-semibold block mb-0.5">Travel Dates:</span>
              <span className="font-bold text-content">{customer.startDate} to {customer.endDate}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-canvas /60 border border-line">
              <span className="text-secondary font-semibold block mb-0.5">PAX Count:</span>
              <span className="font-bold text-content">{customer.paxAdults} Adults {customer.paxChildren > 0 ? `, ${customer.paxChildren} Children` : ''}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-canvas /60 border border-line">
              <span className="text-secondary font-semibold block mb-0.5">Total Package:</span>
              <span className="font-bold text-content text-sm">₹{customer.totalAmount.toLocaleString()} {customer.currency === 'USD' ? 'INR' : (customer.currency || 'INR')}</span>
            </div>
          </div>

          {/* PAYMENT INSTALLMENTS & RECONCILIATION SECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-success-ink" /> Payment Schedule & Installments
              </h4>
              <span className="text-xs font-bold text-secondary">
                Paid: ₹{totalPaid.toLocaleString()} / ₹{customer.totalAmount.toLocaleString()}
              </span>
            </div>

            {/* Financial Status Summary */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-canvas /80 border border-line text-sm">
              <div>
                <span className="text-secondary text-xs uppercase font-bold block">Received</span>
                <span className="text-success-ink font-semibold text-sm">₹{totalPaid.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-secondary text-xs uppercase font-bold block">Overdue</span>
                <span className={`font-semibold text-sm ${totalOverdue > 0 ? 'text-danger-ink animate-pulse' : 'text-muted'}`}>
                  ₹{totalOverdue.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-secondary text-xs uppercase font-bold block">Remaining</span>
                <span className="text-content font-semibold text-sm">₹{balanceDue.toLocaleString()}</span>
              </div>
            </div>

            {/* Installment Items */}
            {installments.length === 0 ? (
              <div className="p-4 rounded-xl bg-warning-soft border border-warning-line text-sm text-warning-ink space-y-1">
                <p className="font-bold">Package Amount Not Added</p>
                <p className="text-xs text-warning-ink">Add a package total amount and save to view the EMI installment schedule.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {installments.map((inst) => (
                  <div
                    key={inst.id}
                    className={`p-3.5 rounded-xl border text-sm transition-all space-y-1.5 ${
                      inst.status === 'Paid'
                        ? 'bg-success-soft/60 /30 border-success-line '
                        : inst.status === 'Overdue'
                        ? 'bg-danger-soft /40 border-danger-line ring-1 ring-danger-line/20'
                        : 'bg-canvas /70 border-line '
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-content flex items-center gap-1.5">
                        {inst.status === 'Overdue' && <AlertTriangle className="w-3.5 h-3.5 text-danger-ink animate-bounce" />}
                        {inst.title}
                      </span>
                      <span className="text-sm text-content">₹{inst.amount.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-secondary">
                      <span>Due Date: <strong>{inst.dueDate}</strong></span>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-xs ${
                          inst.status === 'Paid' ? 'bg-success-soft text-success-ink' :
                          inst.status === 'Overdue' ? 'bg-danger-strong text-white font-semibold animate-pulse' :
                          'bg-warning-soft text-warning-ink'
                        }`}>
                          {inst.status}
                        </span>

                        <button
                          onClick={() => onRecordPaymentClick(customer, inst)}
                          className={`px-2.5 py-1 rounded font-bold text-xs transition-colors shadow-2xs ${
                            inst.status === 'Paid'
                              ? 'bg-hover text-content hover:bg-hover'
                              : inst.status === 'Overdue'
                              ? 'bg-danger-strong hover:bg-danger-strong text-white font-semibold'
                              : 'bg-success-strong hover:bg-success-strong text-white font-bold'
                          }`}
                        >
                          {inst.status === 'Paid' ? 'Edit / Update EMI' : '✓ Confirm EMI Received'}
                        </button>
                      </div>
                    </div>

                    {inst.status === 'Paid' && (
                      <div className="pt-1 text-xs text-success-ink font-medium flex items-center justify-between border-t border-success-line/60 /60">
                        <span>Received on: {inst.paidAt || 'Confirmed'}</span>
                        <span>Mode: {inst.paymentMode || 'Direct'} ({inst.transactionRef || 'N/A'})</span>
                      </div>
                    )}

                    {inst.notes && (
                      <p className="text-xs text-muted italic">Note: {inst.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CAB DRIVER LOGISTICS SECTION (OPERATIONS ONLY) */}
          <div className="space-y-3 p-4 rounded-xl bg-success-soft/40 border border-success-line">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-success-ink flex items-center gap-1.5">
              <Car className="w-4 h-4 text-success-ink" /> Assigned Cab Driver & Vehicle Details
            </h4>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-surface border border-success-line">
                <span className="text-xs text-secondary font-bold block">Driver Name</span>
                <strong className="text-content font-semibold">{customer.driverName || ''}</strong>
              </div>

              <div className="p-2.5 rounded-xl bg-surface border border-success-line">
                <span className="text-xs text-secondary font-bold block">Driver Mobile</span>
                {customer.driverPhone ? (
                  <a href={`tel:${customer.driverPhone}`} className="text-success-ink font-mono font-bold hover:underline">
                    {customer.driverPhone}
                  </a>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </div>

              <div className="p-2.5 rounded-xl bg-surface border border-success-line">
                <span className="text-xs text-secondary font-bold block">Vehicle Model</span>
                <strong className="text-content font-bold">{customer.cabModel || ''}</strong>
              </div>

              <div className="p-2.5 rounded-xl bg-surface border border-success-line">
                <span className="text-xs text-secondary font-bold block">Cab Reg No</span>
                <strong className="text-content font-mono">{customer.cabNumber || ''}</strong>
              </div>
            </div>
          </div>

          {/* PAYMENT CONFIRMATION BOXES (HOTEL & CAB) */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-content flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-success-ink" /> Vendor Payment Confirmation Boxes
            </h4>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Hotel Payment Box */}
              <div className="p-3 rounded-xl bg-canvas border border-line space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-content flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-success-ink" /> Hotel Payment
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    customer.hotelPaymentStatus === 'Paid to Hotel' ? 'bg-success-soft text-success-ink' : 'bg-warning-soft text-warning-ink'
                  }`}>
                    {customer.hotelPaymentStatus || 'Pending'}
                  </span>
                </div>
                <p className="text-xs font-semibold text-content">
                  ₹{(computedHotelTotalCost || customer.hotelPaymentAmount || 0).toLocaleString()}
                </p>
                <p className="text-xs text-secondary">Mode: {customer.hotelPaymentMode || ''}</p>
              </div>

              {/* Cab Payment Box */}
              <div className="p-3 rounded-xl bg-canvas border border-line space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-content flex items-center gap-1">
                    <Car className="w-3.5 h-3.5 text-success-ink" /> Cab Payment
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    customer.cabPaymentStatus === 'Paid to Driver' ? 'bg-success-soft text-success-ink' : 'bg-warning-soft text-warning-ink'
                  }`}>
                    {customer.cabPaymentStatus || 'Pending'}
                  </span>
                </div>
                <p className="text-xs font-semibold text-content">
                  ₹{(customer.cabTotalCost || customer.cabPaymentAmount || 0).toLocaleString()}
                </p>
                <p className="text-xs text-secondary">Mode: {customer.cabPaymentMode || ''}</p>
              </div>
            </div>
          </div>

          {/* INTERNAL OPERATIONS REMARKS */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-content flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-brand-ink" /> Internal Operations Remarks
            </h4>
            <div className="p-3 rounded-xl bg-canvas border border-line text-sm text-content font-medium italic">
              {customer.opsRemarks || customer.specialRequests || ''}
            </div>
          </div>

          {/* Contact Details & Emergency */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-secondary">
              Contact & Emergency Information
            </h4>
            
            <div className="p-4 rounded-xl border border-line space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-secondary flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-brand-ink" /> Phone:
                </span>
                <strong className="text-content">{customer.phone}</strong>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-secondary flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-brand-ink" /> Email:
                </span>
                <strong className="text-content">{customer.email}</strong>
              </div>

              {customer.emergencyContact && (
                <div className="flex items-center justify-between pt-2 border-t border-line">
                  <span className="text-secondary flex items-center gap-1.5 text-danger-ink font-semibold">
                    <ShieldAlert className="w-3.5 h-3.5" /> Emergency Contact:
                  </span>
                  <strong className="text-content">{customer.emergencyContact}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Linked Hotel Vouchers Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                <Hotel className="w-4 h-4 text-warning-ink" /> Linked Hotel Vouchers ({customerVouchers.length})
              </h4>
            </div>

            {customerVouchers.length === 0 ? (
              <p className="text-sm text-muted italic">No hotel vouchers linked yet.</p>
            ) : (
              <div className="space-y-2.5">
                {customerVouchers.map((v) => (
                  <div
                    key={v.id}
                    className="p-3.5 rounded-xl bg-canvas /80 border border-line flex items-center justify-between gap-3 text-sm"
                  >
                    <div>
                      <h5 className="font-bold text-content">{v.hotelName} ({v.city})</h5>
                      <p className="text-secondary text-xs">{v.checkIn} - {v.checkOut} ({v.roomType})</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        v.status === 'Uploaded' || v.status === 'Sent to Customer'
                          ? 'bg-success-soft text-success-ink'
                          : 'bg-warning-soft text-warning-ink'
                      }`}>
                        {v.status}
                      </span>

                      {(v.status === 'Uploaded' || v.status === 'Sent to Customer') && (
                        <button
                          onClick={() => onPreviewVoucher(v)}
                          className="px-2.5 py-1 rounded bg-brand text-white font-semibold hover:bg-brand transition-colors"
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
            <div className="p-4 rounded-xl bg-brand-soft/60 /20 border border-brand-line text-sm text-brand-ink space-y-1">
              <span className="font-bold block">Ops Notes & Requests:</span>
              <p>{customer.notes}</p>
              {customer.specialRequests && <p className="italic">"{customer.specialRequests}"</p>}
            </div>
          )}

        </div>

        {/* Drawer Bottom Actions */}
        <div className="p-4 border-t border-line bg-canvas /80 flex items-center justify-between gap-2">
          {onNavigateToInvoices && (
            <button
              onClick={() => {
                onClose();
                onNavigateToInvoices(customer.id);
              }}
              className="py-2.5 px-3 rounded-xl bg-inverse hover:bg-inverse text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              <Receipt className="w-4 h-4 text-success-ink" />
              <span>Generate Invoice</span>
            </button>
          )}

          <button
            onClick={() => onOpenShare(customer)}
            className="flex-1 py-2.5 px-3 rounded-xl bg-success-strong hover:bg-success-strong text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onNavigateToDayWise(customer.id);
            }}
            className="py-2.5 px-3 rounded-xl bg-brand hover:bg-brand text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <span>Day-Wise</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
