import React from 'react';
import { Customer } from '../types';
import { CheckCircle2, AlertCircle, Calendar, MapPin, X, User } from 'lucide-react';

interface CompleteTripModalProps {
  isOpen: boolean;
  customer: Customer | null;
  onClose: () => void;
  onConfirm: (customer: Customer) => void;
}

export const CompleteTripModal: React.FC<CompleteTripModalProps> = ({
  isOpen,
  customer,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-inverse/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface rounded-xl shadow-sm max-w-md w-full overflow-hidden border border-line animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-success-strong to-success-strong p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-semibold tracking-tight">Complete Trip Confirmation</h3>
          <p className="text-sm text-success-ink mt-1 font-medium">
            Are you sure you want to mark this guest's journey as Completed?
          </p>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4">
          
          {/* Trip Summary Card */}
          <div className="bg-canvas border border-line rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-success-ink bg-success-soft px-2 py-0.5 rounded border border-success-line">
                {customer.bookingId}
              </span>
              <span className="text-sm font-semibold text-content">
                ₹{customer.totalAmount?.toLocaleString() || 0}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted shrink-0" />
              <span className="font-semibold text-content text-sm">{customer.name}</span>
            </div>

            <div className="flex items-center justify-between text-sm text-secondary pt-1 border-t border-line">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-danger-ink" />
                {customer.destination}
              </span>
              <span className="flex items-center gap-1 font-mono font-medium">
                <Calendar className="w-3.5 h-3.5 text-warning-ink" />
                {customer.startDate} → {customer.endDate}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-warning-soft border border-warning-line text-warning-ink text-sm">
            <AlertCircle className="w-4 h-4 text-warning-ink shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              This trip will transition to the <strong>Completed Trips & Post-Travel Audit</strong> section. All vouchers, day schedules, and accounts logs will remain accessible.
            </p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-canvas border-t border-line flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-bold text-secondary bg-surface border border-line hover:bg-subtle transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(customer);
              onClose();
            }}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-success-strong hover:bg-success-strong shadow-sm shadow-success-line/20 transition-all flex items-center gap-2 uppercase tracking-wider"
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirm Trip Completed
          </button>
        </div>

      </div>
    </div>
  );
};
