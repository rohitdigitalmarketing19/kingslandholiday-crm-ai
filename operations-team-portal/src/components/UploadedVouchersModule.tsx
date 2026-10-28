import React, { useState } from 'react';
import { 
  FileCheck2, 
  Eye, 
  Download, 
  Share2, 
  Send, 
  Hotel, 
  User, 
  Calendar, 
  Check, 
  Clock, 
  FileText,
  Search,
  ExternalLink,
  Building2,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { HotelVoucher } from '../types';

interface UploadedVouchersModuleProps {
  vouchers: HotelVoucher[];
  searchTerm: string;
  onPreviewVoucher: (voucher: HotelVoucher) => void;
  onSendToCustomer: (voucher: HotelVoucher) => void;
  onReuploadVoucher: (voucher: HotelVoucher) => void;
  onDeleteVoucher?: (voucherId: string) => void;
}

export const UploadedVouchersModule: React.FC<UploadedVouchersModuleProps> = ({
  vouchers,
  searchTerm,
  onPreviewVoucher,
  onSendToCustomer,
  onReuploadVoucher,
  onDeleteVoucher,
}) => {
  const [deliveryFilter, setDeliveryFilter] = useState<string>('all');

  const uploadedVouchers = vouchers.filter(
    (v) => v.status === 'Uploaded' || v.status === 'Sent to Customer'
  );

  const filtered = uploadedVouchers.filter((v) => {
    const matchesSearch =
      v.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.hotelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.confirmationNumber && v.confirmationNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDelivery = 
      deliveryFilter === 'all' || 
      (deliveryFilter === 'sent' && v.status === 'Sent to Customer') ||
      (deliveryFilter === 'pending_delivery' && v.status === 'Uploaded');

    return matchesSearch && matchesDelivery;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-success-strong to-success-strong text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-white/20 backdrop-blur-xs">
              <FileCheck2 className="w-5 h-5" />
            </span>
            <h3 className="font-bold text-lg">Uploaded Hotel Vouchers Repository</h3>
          </div>
          <p className="text-sm text-success-ink mt-1 max-w-xl">
            Verified hotel confirmation vouchers ready for delivery or archived for past trips. Send directly to customer via WhatsApp or Email.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-center">
            <span className="text-xs uppercase font-semibold text-success-ink block">Verified Vouchers</span>
            <span className="text-2xl font-semibold">{uploadedVouchers.length}</span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-success-soft/50 backdrop-blur-md border border-success-line/30 text-center">
            <span className="text-xs uppercase font-semibold text-success-ink block">Delivered</span>
            <span className="text-2xl font-semibold text-success-ink">
              {uploadedVouchers.filter(v => v.status === 'Sent to Customer').length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="p-4 rounded-xl bg-surface border border-line flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs">
          <span className="font-semibold text-content">Delivery Filter:</span>
          
          <button
            onClick={() => setDeliveryFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              deliveryFilter === 'all'
                ? 'bg-success-strong text-white shadow-xs'
                : 'bg-subtle text-secondary hover:bg-hover'
            }`}
          >
            All Uploaded ({uploadedVouchers.length})
          </button>

          <button
            onClick={() => setDeliveryFilter('pending_delivery')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              deliveryFilter === 'pending_delivery'
                ? 'bg-warning-strong text-white shadow-xs'
                : 'bg-subtle text-secondary hover:bg-hover'
            }`}
          >
            Ready to Send ({uploadedVouchers.filter(v => v.status === 'Uploaded').length})
          </button>

          <button
            onClick={() => setDeliveryFilter('sent')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              deliveryFilter === 'sent'
                ? 'bg-brand text-white shadow-xs'
                : 'bg-subtle text-secondary hover:bg-hover'
            }`}
          >
            Sent to Customer ({uploadedVouchers.filter(v => v.status === 'Sent to Customer').length})
          </button>
        </div>

        <span className="text-sm text-secondary">
          Showing <span className="font-bold text-content">{filtered.length}</span> documents
        </span>
      </div>

      {/* Uploaded Vouchers Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-surface border border-dashed border-line">
          <FileCheck2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-content text-base">No Uploaded Vouchers Found</h3>
          <p className="text-sm text-secondary mt-1 max-w-sm mx-auto">
            Uploaded vouchers will appear here once verified and processed from the Pending Hotels Vouchers tab.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((v) => {
            const isSent = v.status === 'Sent to Customer';
            return (
              <div
                key={v.id}
                className="bg-surface border border-line rounded-xl p-5 hover:border-success-line transition-all shadow-2xs flex flex-col justify-between"
              >
                <div>
                  {/* Header: Booking ID & Delivery Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-sm font-mono font-bold text-brand-ink bg-brand-soft /50 px-2.5 py-0.5 rounded border border-brand-line">
                      {v.bookingId}
                    </span>

                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                      isSent 
                        ? 'bg-brand-soft text-brand-ink /40 border border-brand-line' 
                        : 'bg-success-soft text-success-ink /40 border border-success-line'
                    }`}>
                      {isSent ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {v.status}
                    </span>
                  </div>

                  {/* Hotel Name & City */}
                  <div className="flex items-start gap-2">
                    <Hotel className="w-5 h-5 text-success-ink mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-content text-base leading-snug">
                        {v.hotelName}
                      </h4>
                      <p className="text-sm text-secondary font-medium">{v.city}</p>
                    </div>
                  </div>

                  {/* Details Box */}
                  <div className="mt-3 p-3 rounded-xl bg-canvas /60 border border-line text-sm space-y-1.5 text-secondary">
                    <div className="flex items-center justify-between">
                      <span className="text-secondary">Guest Name:</span>
                      <strong className="text-content">{v.customerName}</strong>
                    </div>

                    <div className="flex flex-col gap-1 py-1 border-y border-line/60 /60 my-1">
                      <div className="flex items-center justify-between">
                        <span className="text-secondary">Check-In:</span>
                        <strong className="text-success-ink font-mono font-bold">{v.checkIn}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-secondary">Check-Out:</span>
                        <strong className="text-danger-ink font-mono font-bold">{v.checkOut}</strong>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted pt-0.5">
                        <span>Duration:</span>
                        <span>{v.nights} {v.nights === 1 ? 'Night' : 'Nights'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-secondary">Room Type:</span>
                      <span className="font-medium text-content truncate max-w-[160px]">{v.roomType}</span>
                    </div>

                    {v.confirmationNumber && (
                      <div className="flex items-center justify-between text-success-ink font-mono text-xs font-semibold pt-1 border-t border-line/60">
                        <span>Conf No:</span>
                        <span>{v.confirmationNumber}</span>
                      </div>
                    )}
                  </div>

                  {/* Upload Info */}
                  <div className="mt-2 text-xs text-muted flex items-center justify-between">
                    <span>Uploaded by {v.uploadedBy || 'Ops Staff'}</span>
                    <span>{v.uploadedAt || 'Recent'}</span>
                  </div>
                </div>

                {/* Bottom Action Controls */}
                <div className="mt-4 pt-3 border-t border-line flex items-center justify-between gap-2">
                  <button
                    onClick={() => onPreviewVoucher(v)}
                    className="flex-1 py-2 px-2.5 rounded-lg bg-subtle text-content hover:bg-hover text-sm font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Voucher</span>
                  </button>

                  <button
                    onClick={() => onSendToCustomer(v)}
                    className={`py-2 px-3 rounded-lg text-sm font-bold text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer ${
                      isSent ? 'bg-brand hover:bg-brand' : 'bg-success-strong hover:bg-success-strong'
                    }`}
                    title="Send Voucher PDF via WhatsApp / Email"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{isSent ? 'Resend PDF' : 'Send PDF'}</span>
                  </button>

                  <button
                    onClick={() => onReuploadVoucher(v)}
                    className="p-2 rounded-lg text-muted hover:text-secondary hover:bg-subtle transition-colors"
                    title="Re-upload or Update Voucher Document"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>

                  {onDeleteVoucher && (
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete this uploaded hotel voucher for "${v.hotelName}"?`)) {
                          onDeleteVoucher(v.id);
                        }
                      }}
                      className="p-2 rounded-lg text-danger-ink hover:text-danger-ink hover:bg-danger-soft transition-colors"
                      title="Delete Voucher"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
