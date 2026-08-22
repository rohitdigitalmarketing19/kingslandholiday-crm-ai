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
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-white/20 backdrop-blur-xs">
              <FileCheck2 className="w-5 h-5" />
            </span>
            <h3 className="font-bold text-lg">Uploaded Hotel Vouchers Repository</h3>
          </div>
          <p className="text-xs text-emerald-100 mt-1 max-w-xl">
            Verified hotel confirmation vouchers ready for delivery or archived for past trips. Send directly to customer via WhatsApp or Email.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-center">
            <span className="text-[10px] uppercase font-semibold text-emerald-200 block">Verified Vouchers</span>
            <span className="text-2xl font-black">{uploadedVouchers.length}</span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-emerald-900/50 backdrop-blur-md border border-emerald-400/30 text-center">
            <span className="text-[10px] uppercase font-semibold text-emerald-200 block">Delivered</span>
            <span className="text-2xl font-black text-emerald-100">
              {uploadedVouchers.filter(v => v.status === 'Sent to Customer').length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs">
          <span className="font-semibold text-slate-700">Delivery Filter:</span>
          
          <button
            onClick={() => setDeliveryFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              deliveryFilter === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100  text-slate-600  hover:bg-slate-200'
            }`}
          >
            All Uploaded ({uploadedVouchers.length})
          </button>

          <button
            onClick={() => setDeliveryFilter('pending_delivery')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              deliveryFilter === 'pending_delivery'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-slate-100  text-slate-600  hover:bg-slate-200'
            }`}
          >
            Ready to Send ({uploadedVouchers.filter(v => v.status === 'Uploaded').length})
          </button>

          <button
            onClick={() => setDeliveryFilter('sent')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              deliveryFilter === 'sent'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100  text-slate-600  hover:bg-slate-200'
            }`}
          >
            Sent to Customer ({uploadedVouchers.filter(v => v.status === 'Sent to Customer').length})
          </button>
        </div>

        <span className="text-xs text-slate-500">
          Showing <span className="font-bold text-slate-800">{filtered.length}</span> documents
        </span>
      </div>

      {/* Uploaded Vouchers Grid */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-dashed border-slate-300">
          <FileCheck2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">No Uploaded Vouchers Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
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
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-emerald-300 transition-all shadow-2xs flex flex-col justify-between"
              >
                <div>
                  {/* Header: Booking ID & Delivery Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 /50 px-2.5 py-0.5 rounded border border-blue-200">
                      {v.bookingId}
                    </span>

                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                      isSent 
                        ? 'bg-blue-50 text-blue-700 /40  border border-blue-200' 
                        : 'bg-emerald-50 text-emerald-700 /40  border border-emerald-200'
                    }`}>
                      {isSent ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {v.status}
                    </span>
                  </div>

                  {/* Hotel Name & City */}
                  <div className="flex items-start gap-2">
                    <Hotel className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-slate-900 text-base leading-snug">
                        {v.hotelName}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">{v.city}</p>
                    </div>
                  </div>

                  {/* Details Box */}
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 /60 border border-slate-100 text-xs space-y-1.5 text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Guest Name:</span>
                      <strong className="text-slate-900">{v.customerName}</strong>
                    </div>

                    <div className="flex flex-col gap-1 py-1 border-y border-slate-200/60 /60 my-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Check-In:</span>
                        <strong className="text-emerald-600 font-mono font-bold">{v.checkIn}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Check-Out:</span>
                        <strong className="text-rose-600 font-mono font-bold">{v.checkOut}</strong>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                        <span>Duration:</span>
                        <span>{v.nights} {v.nights === 1 ? 'Night' : 'Nights'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Room Type:</span>
                      <span className="font-medium text-slate-800 truncate max-w-[160px]">{v.roomType}</span>
                    </div>

                    {v.confirmationNumber && (
                      <div className="flex items-center justify-between text-emerald-600 font-mono text-[11px] font-semibold pt-1 border-t border-slate-200/60">
                        <span>Conf No:</span>
                        <span>{v.confirmationNumber}</span>
                      </div>
                    )}
                  </div>

                  {/* Upload Info */}
                  <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Uploaded by {v.uploadedBy || 'Ops Staff'}</span>
                    <span>{v.uploadedAt || 'Recent'}</span>
                  </div>
                </div>

                {/* Bottom Action Controls */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onPreviewVoucher(v)}
                    className="flex-1 py-2 px-2.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Voucher</span>
                  </button>

                  <button
                    onClick={() => onSendToCustomer(v)}
                    className={`py-2 px-3 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer ${
                      isSent ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                    title="Send Voucher PDF via WhatsApp / Email"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{isSent ? 'Resend PDF' : 'Send PDF'}</span>
                  </button>

                  <button
                    onClick={() => onReuploadVoucher(v)}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
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
                      className="p-2 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
