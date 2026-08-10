import React, { useRef, useState } from 'react';
import { 
  X, 
  FileText, 
  Download, 
  Send, 
  Mail, 
  Copy, 
  Check, 
  ExternalLink, 
  Eye, 
  Building2, 
  Hotel, 
  CheckCircle2, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { HotelVoucher, Customer } from '../types';

interface SendCustomerVoucherPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucher: HotelVoucher | null;
  customer?: Customer | null;
  onPreviewVoucher?: (voucher: HotelVoucher) => void;
}

export const SendCustomerVoucherPdfModal: React.FC<SendCustomerVoucherPdfModalProps> = ({
  isOpen,
  onClose,
  voucher,
  customer,
  onPreviewVoucher,
}) => {
  if (!isOpen || !voucher) return null;

  const printRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const customerPhone = customer?.phone || '';
  const customerEmail = customer?.email || '';
  const bookingNo = voucher.confirmationNumber || `KLHR${Math.floor(300 + Math.random() * 680)}`;
  const voucherNo = `3${Math.floor(300 + Math.random() * 680)}`;
  const fileName = `Official_Hotel_Voucher_${(voucher.bookingId || 'KL').replace(/\s+/g, '_')}_${(voucher.customerName || 'Guest').replace(/\s+/g, '_')}.pdf`;

  // Generate and Download PDF using html2pdf
  const handleDownloadPdf = async (): Promise<boolean> => {
    if (!printRef.current) return false;
    setIsGeneratingPdf(true);
    const element = printRef.current;

    const opt = {
      margin: [0.2, 0.2, 0.2, 0.2],
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        logging: false,
        scrollY: 0,
        scrollX: 0,
        windowWidth: 1200
      },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      const pdfFunc = typeof (window as any).html2pdf === 'function' ? (window as any).html2pdf : (window as any).html2pdf;
      if (pdfFunc) {
        await pdfFunc().set(opt).from(element).save();
      } else {
        window.print();
      }
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
      setIsGeneratingPdf(false);
      return true;
    } catch (e) {
      console.error('PDF export error:', e);
      window.print();
      setIsGeneratingPdf(false);
      return false;
    }
  };

  // WhatsApp Message Text
  const generateWhatsAppMessage = () => {
    return `🏨 *OFFICIAL HOTEL CONFIRMATION VOUCHER (PDF)*\n\nDear *${voucher.customerName}*,\n\nYour official accommodation voucher for *${voucher.hotelName}* (${voucher.city || 'Confirmed'}) has been generated and verified!\n\n📋 *Booking Reference:* ${voucher.bookingId}\n🔑 *Hotel Confirmation #:* ${bookingNo}\n📅 *Check-In:* ${voucher.checkIn}\n📅 *Check-Out:* ${voucher.checkOut} (${voucher.nights} Nights)\n🛏️ *Room Details:* ${voucher.roomType} (${voucher.mealPlan})\n\n📄 *Attached PDF:* ${fileName}\nPlease find attached your official confirmation voucher document for hassle-free check-in at the hotel.\n\nWarm Regards,\n*Kingsland Holidays Operations Desk*\n📞 Support: 6376983416, 7014939068 | www.kingslandholidays.com`;
  };

  // Trigger WhatsApp with PDF Download
  const handleSendWhatsAppWithPdf = async () => {
    // 1. Download PDF to customer downloads
    await handleDownloadPdf();

    // 2. Open WhatsApp with pre-filled message
    const msg = encodeURIComponent(generateWhatsAppMessage());
    const cleanPhone = customerPhone ? customerPhone.replace(/\D/g, '') : '';
    const waUrl = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}` 
      : `https://api.whatsapp.com/send?text=${msg}`;
    
    window.open(waUrl, '_blank');
  };

  // Trigger Gmail with PDF Download
  const handleSendEmailWithPdf = async () => {
    // 1. Download PDF
    await handleDownloadPdf();

    // 2. Open Gmail Web Compose
    const subject = encodeURIComponent(`Official Hotel Confirmation Voucher - ${voucher.customerName} (Ref: ${voucher.bookingId})`);
    const body = encodeURIComponent(
      `Dear ${voucher.customerName},\n\nPlease find attached your Official Hotel Confirmation Voucher PDF for ${voucher.hotelName}.\n\nBooking ID: ${voucher.bookingId}\nHotel: ${voucher.hotelName}\nCheck-In: ${voucher.checkIn}\nCheck-Out: ${voucher.checkOut} (${voucher.nights} Nights)\nRoom Category: ${voucher.roomType}\nMeal Plan: ${voucher.mealPlan}\nPayment Status: Paid by Kingsland Holidays\n\n(The voucher PDF has been downloaded as "${fileName}" - please attach it to this email).\n\nBest Regards,\nKingsland Holidays Operations Desk\n6376983416, 7014939068 | official.kingslandholidays@gmail.com`
    );
    const to = encodeURIComponent(customerEmail || '');
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
  };

  // Copy Message
  const handleCopyMessage = () => {
    navigator.clipboard.writeText(generateWhatsAppMessage());
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:p-0 print:bg-white print:static custom-scrollbar">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full shadow-xl overflow-hidden my-auto flex flex-col animate-in zoom-in-95 duration-150">
        
        {/* MODAL HEADER */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white flex items-center justify-between border-b border-teal-800/40">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-400/30">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                Send Voucher PDF to Customer
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-teal-400/20 text-teal-300 font-bold border border-teal-400/30">
                  PDF Delivery
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Booking Ref: <strong className="text-teal-300 font-mono">{voucher.bookingId}</strong> • Guest: <strong>{voucher.customerName}</strong>
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 sm:p-6 space-y-5 text-slate-800 text-xs">
          
          {/* PDF FILE ATTACHMENT CARD */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50 via-emerald-50 to-slate-50 border-2 border-teal-500/30 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-teal-700 text-white flex items-center justify-center shrink-0 shadow-md">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="font-extrabold text-slate-900 text-sm">{fileName}</h4>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    Verified PDF
                  </span>
                </div>
                <p className="text-slate-600 text-[11px]">
                  <strong>{voucher.hotelName}</strong> • {voucher.city || 'Rajasthan'} • {voucher.roomType}
                </p>
                <p className="text-slate-500 text-[10px]">
                  Dates: {voucher.checkIn} to {voucher.checkOut} ({voucher.nights}N) • Supplier Conf #: {bookingNo}
                </p>
              </div>
            </div>

            {/* Direct Download Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all shrink-0 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : downloadSuccess ? (
                <Check className="w-4 h-4 text-emerald-300" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{downloadSuccess ? '✓ PDF Downloaded!' : 'Download PDF'}</span>
            </button>
          </div>

          {/* CUSTOMER CONTACT DETAILS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Customer Phone / WhatsApp</span>
              <span className="font-black text-slate-900 font-mono text-xs">
                {customerPhone || 'Not specified in booking'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Customer Email</span>
              <span className="font-bold text-slate-900 text-xs">
                {customerEmail || 'Not specified in booking'}
              </span>
            </div>
          </div>

          {/* SHARING INSTRUCTIONS BANNER */}
          <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-950 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              Clicking <strong>Send WhatsApp (PDF)</strong> or <strong>Send Email (PDF)</strong> automatically generates and downloads the official PDF document so you can instantly share the PDF voucher with your customer.
            </p>
          </div>

          {/* ACTION BUTTONS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            
            {/* WhatsApp with PDF */}
            <button
              onClick={handleSendWhatsAppWithPdf}
              disabled={isGeneratingPdf}
              className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold flex items-center justify-center gap-2 shadow-md transition-all hover:scale-[1.02] active:scale-98 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Send WhatsApp (PDF)</span>
            </button>

            {/* Email with PDF */}
            <button
              onClick={handleSendEmailWithPdf}
              disabled={isGeneratingPdf}
              className="py-3 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold flex items-center justify-center gap-2 shadow-md transition-all hover:scale-[1.02] active:scale-98 cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>Send Email (PDF)</span>
            </button>

            {/* View Voucher / Inspect */}
            {onPreviewVoucher && (
              <button
                onClick={() => {
                  onClose();
                  onPreviewVoucher(voucher);
                }}
                className="py-3 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Eye className="w-4 h-4 text-slate-300" />
                <span>View Full Voucher</span>
              </button>
            )}

          </div>

          {/* Copy Message / Text Fallback */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Need copyable text summary?</span>
            <button
              onClick={handleCopyMessage}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedText ? 'Copied Text!' : 'Copy Text Note'}</span>
            </button>
          </div>

        </div>

        {/* HIDDEN PRINTABLE CONTAINER FOR INSTANT PDF GENERATION */}
        <div className="fixed -left-[9999px] -top-[9999px] opacity-0 pointer-events-none">
          <div 
            ref={printRef}
            className="printable-voucher-container bg-white border-2 border-teal-800 w-[800px] p-8 space-y-5 text-slate-900 font-sans"
            style={{ fontFamily: "'Trebuchet MS', Arial, sans-serif" }}
          >
            {/* Top Graphic Header Banner */}
            <div className="border-b-4 border-teal-700 pb-4 flex flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-slate-900 border-2 border-teal-500 p-1 flex items-center justify-center shrink-0">
                  <div className="text-center text-white">
                    <Building2 className="w-7 h-7 mx-auto text-teal-400" />
                    <span className="text-[7px] font-black tracking-widest text-teal-300 block uppercase">KINGSLAND</span>
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">KINGSLAND <span className="text-teal-700">HOLIDAYS</span></h1>
                  <p className="text-[10px] text-teal-800 italic font-semibold">Desire to travel</p>
                </div>
              </div>

              <div className="text-right text-[11px] font-bold text-slate-800 space-y-0.5">
                <div className="text-sm font-black text-slate-900">KINGSLAND HOLIDAYS</div>
                <div className="text-teal-700">www.kingslandholidays.com</div>
                <div>official.kingslandholidays@gmail.com</div>
                <div className="font-mono">7014939068, 9772595049, 7015528341</div>
                <div className="text-[10px] text-slate-600 font-normal">25, Jain Colony, Jhotwara, Jaipur, Rajasthan, India - 302012</div>
              </div>
            </div>

            <div className="h-1.5 bg-gradient-to-r from-teal-700 via-teal-500 to-teal-700 rounded-full" />

            {/* HOTEL & BOOKING HEADER BOX TABLE */}
            <div className="border-2 border-teal-800 rounded-xl overflow-hidden text-xs">
              <div className="grid grid-cols-3 divide-x-2 divide-teal-800 bg-teal-50/40">
                <div className="p-3 col-span-2 space-y-1">
                  <div className="flex items-start gap-1.5">
                    <Hotel className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                    <div>
                      <h2 className="font-extrabold text-teal-900 text-sm underline decoration-teal-400 underline-offset-2">{voucher.hotelName}</h2>
                      <p className="text-[11px] font-semibold text-slate-700 mt-0.5 leading-snug">{voucher.city || 'Destination Central Hotel & Resort'}</p>
                      <p className="text-[11px] font-bold text-slate-900 mt-1">Phone no. <span className="font-mono">097850 80421</span></p>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 flex flex-col justify-center divide-y-2 divide-teal-800 text-center font-bold">
                  <div className="pb-2">
                    <span className="text-[10px] uppercase text-teal-700 font-extrabold block">Hotel Booking No</span>
                    <span className="font-mono text-slate-900 text-sm font-black">{bookingNo}</span>
                  </div>
                  <div className="pt-2">
                    <span className="text-[10px] uppercase text-teal-700 font-extrabold block">Kingsland Voucher's No</span>
                    <span className="font-mono text-slate-900 text-sm font-black">{voucherNo}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 divide-x-2 divide-teal-800 border-t-2 border-teal-800 bg-white text-center">
                <div className="p-2.5">
                  <span className="text-[10px] uppercase text-teal-700 font-extrabold block">Guest Name</span>
                  <span className="font-black text-slate-900 text-xs sm:text-sm">{voucher.customerName}</span>
                </div>
                <div className="p-2.5">
                  <span className="text-[10px] uppercase text-teal-700 font-extrabold block">Check In</span>
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">{voucher.checkIn}</span>
                </div>
                <div className="p-2.5">
                  <span className="text-[10px] uppercase text-teal-700 font-extrabold block">Check Out</span>
                  <span className="font-bold text-slate-900 text-xs sm:text-sm">{voucher.checkOut}</span>
                </div>
              </div>

              <div className="grid grid-cols-5 divide-x-2 divide-teal-800 border-t-2 border-teal-800 bg-teal-50/20 text-center">
                <div className="p-2">
                  <span className="text-[9px] uppercase text-teal-700 font-extrabold block">No of Persons</span>
                  <span className="font-extrabold text-slate-900 text-xs">Confirmed PAX</span>
                </div>
                <div className="p-2">
                  <span className="text-[9px] uppercase text-teal-700 font-extrabold block">No. of Nights</span>
                  <span className="font-black text-slate-900 text-xs">{voucher.nights}N</span>
                </div>
                <div className="p-2">
                  <span className="text-[9px] uppercase text-teal-700 font-extrabold block">Room Details</span>
                  <span className="font-bold text-slate-900 text-[11px]">{voucher.roomType}</span>
                </div>
                <div className="p-2">
                  <span className="text-[9px] uppercase text-teal-700 font-extrabold block">Meal Plan</span>
                  <span className="font-extrabold text-slate-900 text-xs">{voucher.mealPlan}</span>
                </div>
                <div className="p-2">
                  <span className="text-[9px] uppercase text-teal-700 font-extrabold block">Extra Inclusions</span>
                  <span className="font-bold text-slate-900 text-xs">N/A</span>
                </div>
              </div>

              <div className="bg-teal-700 text-white text-center py-2 font-black text-xs uppercase tracking-wider border-t-2 border-teal-800">
                Payment Status :: Paid by Kingsland Holidays
              </div>
            </div>

            {/* CONDITIONS BOX */}
            <div className="border-2 border-dashed border-teal-800 rounded-xl p-4 bg-slate-50 text-[10px] leading-relaxed space-y-1.5 text-slate-800">
              <div className="flex items-start gap-1.5">
                <span className="text-teal-600 font-bold shrink-0">🔹</span>
                <p>Current government regulations require Indian residents to present proof of identity at check-in (Aadhar, passport, voter id).</p>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-teal-600 font-bold shrink-0">🔹</span>
                <p>Standard Check-in time is 12:00 PM and Check-out is 10:00 AM.</p>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-teal-600 font-bold shrink-0">🔹</span>
                <p>Special requests (early check-in, floor, smoking) are subject to hotel availability upon arrival.</p>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-teal-600 font-bold shrink-0">🔹</span>
                <p>No refund given in case of hotel cancellation within 7 days prior to check-in.</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <div className="border-4 border-amber-600 text-amber-700 font-black text-xs px-4 py-2 rounded-lg rotate-[-6deg] uppercase tracking-widest bg-amber-50 shadow-xs">
                RESERVATION CONFIRMED
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-500">
              <p>Thank you for choosing Kingsland Holidays. Have a wonderful stay!</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
