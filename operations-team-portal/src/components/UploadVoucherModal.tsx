import React, { useState } from 'react';
import { X, Upload, FileUp, CheckCircle, Hotel, Building2, Calendar, FileText } from 'lucide-react';
import { HotelVoucher } from '../types';

interface UploadVoucherModalProps {
  voucher: HotelVoucher | null;
  onClose: () => void;
  onConfirmUpload: (
    voucherId: string, 
    confirmationNumber: string, 
    fileName: string, 
    fileUrl?: string
  ) => void;
}

export const UploadVoucherModal: React.FC<UploadVoucherModalProps> = ({
  voucher,
  onClose,
  onConfirmUpload,
}) => {
  if (!voucher) return null;

  const [confirmationNumber, setConfirmationNumber] = useState(
    voucher.confirmationNumber || `HTL-CONF-${Math.floor(10000 + Math.random() * 90000)}`
  );
  const [fileName, setFileName] = useState(
    voucher.fileName || `Hotel_Voucher_${voucher.hotelName.replace(/\s+/g, '_')}.pdf`
  );
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedSuccess, setUploadedSuccess] = useState(false);

  const sampleImages = [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80',
  ];
  const chosenSampleUrl = sampleImages[Math.floor(Math.random() * sampleImages.length)];

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFileName(e.dataTransfer.files[0].name);
      setUploadedSuccess(true);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileName(e.target.files[0].name);
      setUploadedSuccess(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmUpload(
      voucher.id,
      confirmationNumber,
      fileName,
      chosenSampleUrl
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500 text-white">
              <Upload className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Upload Hotel Voucher Document
              </h3>
              <p className="text-xs text-slate-500">Booking: {voucher.bookingId} • {voucher.customerName}</p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hotel Info Summary */}
        <div className="p-3.5 rounded-xl bg-slate-50 /60 border border-slate-200 text-xs space-y-1">
          <div className="flex items-center justify-between font-bold text-slate-900">
            <span className="flex items-center gap-1.5"><Hotel className="w-4 h-4 text-amber-600" /> {voucher.hotelName}</span>
            <span>{voucher.city}</span>
          </div>
          <p className="text-slate-500">Check-in: <strong>{voucher.checkIn}</strong> to <strong>{voucher.checkOut}</strong> ({voucher.roomType})</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Supplier Confirmation Number
            </label>
            <input
              type="text"
              placeholder="e.g. HTL-CONF-9842"
              value={confirmationNumber}
              onChange={(e) => setConfirmationNumber(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-slate-50 border border-slate-300 font-mono font-bold text-slate-900"
              required
            />
          </div>

          {/* Drag & Drop File Box */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Upload PDF Voucher or Confirmation Image
            </label>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`
                p-6 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer relative
                ${isDragging ? 'border-amber-500 bg-amber-50/50' : 'border-slate-300  hover:border-amber-400'}
                ${uploadedSuccess ? 'bg-emerald-50/50 border-emerald-400' : ''}
              `}
            >
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />

              <FileUp className={`w-8 h-8 mx-auto mb-2 ${uploadedSuccess ? 'text-emerald-600' : 'text-slate-400'}`} />

              <p className="font-bold text-slate-800">
                {uploadedSuccess ? 'File Selected & Verified!' : 'Drag & drop voucher document here'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Supports PDF, JPG, PNG up to 15MB
              </p>

              {fileName && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 font-mono text-emerald-700 font-semibold text-[11px]">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{fileName}</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-600 font-semibold hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-xs"
            >
              Confirm & Mark as Uploaded
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
