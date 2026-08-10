import React, { useState, useEffect } from 'react';
import { X, CheckCircle, IndianRupee, CreditCard, Calendar, FileText, AlertTriangle, ArrowLeftRight } from 'lucide-react';
import { Customer, PaymentInstallment } from '../types';

interface RecordPaymentModalProps {
  isOpen: boolean;
  customer: Customer | null;
  installment: PaymentInstallment | null;
  onClose: () => void;
  onConfirmPayment: (
    customerId: string,
    installmentId: string,
    updatedDetails: Partial<PaymentInstallment>
  ) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  customer,
  installment,
  onClose,
  onConfirmPayment,
}) => {
  if (!isOpen || !customer || !installment) return null;

  const todayStr = new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState<string>(installment.title || '');
  const [amount, setAmount] = useState<number>(installment.amount || 0);
  const [dueDate, setDueDate] = useState<string>(installment.dueDate || todayStr);
  const [status, setStatus] = useState<'Paid' | 'Pending' | 'Overdue'>('Paid');
  const [paymentMode, setPaymentMode] = useState<string>(
    installment.paymentMode || 'UPI'
  );
  const [transactionRef, setTransactionRef] = useState<string>(
    installment.transactionRef || `TXN-${Math.floor(100000 + Math.random() * 900000)}`
  );
  const [paidAt, setPaidAt] = useState<string>(
    installment.paidAt || todayStr
  );
  const [notes, setNotes] = useState<string>(installment.notes || '');

  useEffect(() => {
    if (installment) {
      setTitle(installment.title || '');
      setAmount(installment.amount || 0);
      setDueDate(installment.dueDate || todayStr);
      setStatus('Paid'); // Default to Paid when opening Record Payment modal
      setPaymentMode(installment.paymentMode || 'UPI');
      setTransactionRef(
        installment.transactionRef || `TXN-${Math.floor(100000 + Math.random() * 900000)}`
      );
      setPaidAt(installment.paidAt || todayStr);
      setNotes(installment.notes || '');
    }
  }, [installment]);

  const handleMarkPaid = (e: React.FormEvent) => {
    e.preventDefault();
    const finalStatus: 'Paid' | 'Pending' | 'Overdue' = status === 'Pending' || status === 'Overdue' ? 'Paid' : status;
    const finalRef = transactionRef || `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
    const finalDate = paidAt || todayStr;
    const finalMode = paymentMode || 'UPI';

    onConfirmPayment(customer.id, installment.id, {
      title,
      amount,
      dueDate,
      status: finalStatus,
      paidAt: finalStatus === 'Paid' ? finalDate : undefined,
      paymentMode: finalStatus === 'Paid' ? finalMode : undefined,
      transactionRef: finalStatus === 'Paid' ? finalRef : undefined,
      notes,
    });
    onClose();
  };

  const handleRevertToPending = () => {
    onConfirmPayment(customer.id, installment.id, {
      status: 'Pending',
      paidAt: undefined,
      paymentMode: undefined,
      transactionRef: undefined,
      notes: 'Reverted to pending by Ops Team',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
              <IndianRupee className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Record Installment Payment
              </h3>
              <p className="text-xs text-slate-500">
                Booking: <span className="font-mono font-bold text-blue-600">{customer.bookingId}</span> • {customer.name}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Installment Summary Header Card */}
        <div className={`p-4 rounded-xl border text-xs space-y-1.5 ${
          installment.status === 'Overdue' 
            ? 'bg-rose-50 /40 border-rose-200  text-rose-950 '
            : 'bg-slate-50 /70 border-slate-200 '
        }`}>
          <div className="flex items-center justify-between font-bold">
            <span className="text-sm text-slate-900">{installment.title}</span>
            <span className="text-base font-extrabold text-slate-900">
              ₹{installment.amount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span>Due Date: <strong>{installment.dueDate}</strong></span>
            <span className={`px-2 py-0.5 rounded-md font-bold uppercase ${
              installment.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
              installment.status === 'Overdue' ? 'bg-rose-200 text-rose-800 animate-pulse' :
              'bg-amber-100 text-amber-800'
            }`}>
              {installment.status}
            </span>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleMarkPaid} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Installment Amount (₹)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-300 font-black text-slate-900"
                required
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-300 font-bold text-slate-900"
              >
                <option value="Paid">Paid ✓</option>
                <option value="Pending">Pending</option>
                <option value="Overdue">Overdue ⚠️</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Installment Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-300 font-semibold text-slate-900"
                required
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-300 font-semibold text-slate-900"
                required
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Payment Mode
            </label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-300 font-medium text-slate-900"
              required
            >
              <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
              <option value="Bank Wire / NEFT">Bank Wire / NEFT / IMPS</option>
              <option value="Credit Card">Credit / Debit Card</option>
              <option value="Cash">Cash Receipt</option>
              <option value="Cheque">Cheque Deposit</option>
              <option value="Other">Other Gateway</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Transaction Ref / UTR #
              </label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="e.g. UPI-991023"
                className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-300 font-mono font-bold text-slate-900"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Received Date
              </label>
              <input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-300 font-semibold text-slate-900"
                required
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Ops / Reconciliation Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Verified in bank account statement on July 28"
              className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-300 text-slate-900"
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-200">
            {installment.status === 'Paid' ? (
              <button
                type="button"
                onClick={handleRevertToPending}
                className="px-3 py-2 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 font-medium text-[11px] flex items-center gap-1"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                Unmark / Revert to Pending
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-xs"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Confirm Paid (₹{installment.amount.toLocaleString()})</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
