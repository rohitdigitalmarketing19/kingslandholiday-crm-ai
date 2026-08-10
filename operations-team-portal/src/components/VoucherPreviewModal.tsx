import React, { useRef } from 'react';
import { 
  X, 
  Hotel, 
  CheckCircle2, 
  Printer, 
  Share2, 
  Building2, 
  MapPin, 
  Key,
  ShieldCheck,
  Send,
  FileText,
  Download
} from 'lucide-react';
import { HotelVoucher } from '../types';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface VoucherPreviewModalProps {
  voucher: HotelVoucher | null;
  onClose: () => void;
  onSendWhatsApp: (voucher: HotelVoucher) => void;
}

export const VoucherPreviewModal: React.FC<VoucherPreviewModalProps> = ({
  voucher,
  onClose,
  onSendWhatsApp,
}) => {
  if (!voucher) return null;

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    const element = printRef.current;
    const filename = `Hotel_Voucher_${(voucher.hotelName || 'Reservation').replace(/\s+/g, '_')}.pdf`;
    
    const opt = {
      margin: [0.2, 0.2, 0.2, 0.2],
      filename: filename,
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
      const pdfFunc = typeof html2pdf === 'function' ? html2pdf : (window as any).html2pdf;
      if (pdfFunc) {
        await pdfFunc().set(opt).from(element).save();
      } else {
        window.print();
      }
    } catch (e) {
      console.error('PDF export error, falling back to print:', e);
      window.print();
    }
  };

  const handleSendVoucherPdf = async () => {
    await handleDownloadPdf();
    onSendWhatsApp(voucher);
  };

  const bookingNo = voucher.confirmationNumber || `KLHR${Math.floor(300 + Math.random() * 680)}`;
  const voucherNo = `3${Math.floor(300 + Math.random() * 680)}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-hidden print:p-0 print:bg-white print:static">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full h-[94vh] max-h-[94vh] flex flex-col overflow-hidden shadow-xl animate-in zoom-in-95 duration-150 print:max-w-none print:max-h-none print:h-auto print:shadow-none print:border-none print:rounded-none">
        
        {/* Modal Top Bar (Hidden on Print) */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white print:hidden shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-teal-500 text-slate-950 font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-white text-base">
                Official Hotel Confirmation Voucher
              </h3>
              <p className="text-xs text-slate-400">Booking: <span className="font-mono text-teal-300 font-bold">{voucher.bookingId}</span> • Guest: {voucher.customerName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSendVoucherPdf}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Voucher PDF</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              className="px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-slate-700 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Voucher Printable Content (Exact PDF Layout Replica with Full Scrolling) */}
        <div className="flex-1 min-h-0 h-[calc(94vh-75px)] p-4 sm:p-8 bg-slate-200/70 overflow-y-scroll overflow-x-hidden flex flex-col items-center custom-scrollbar print:bg-white print:p-0 print:overflow-visible">
          
          <div 
            ref={printRef}
            className="printable-voucher-container bg-white border-2 border-teal-800 shadow-xl w-full max-w-3xl p-6 sm:p-8 space-y-5 text-slate-900 font-sans print:shadow-none print:border-none print:w-full print:p-0 print:max-w-none relative shrink-0 my-2"
            style={{ fontFamily: "'Trebuchet MS', Arial, sans-serif" }}
          >
            
            {/* Top Graphic Header Banner */}
            <div className="border-b-4 border-teal-700 pb-4 flex flex-row items-center justify-between gap-4">
              
              {/* Logo Section */}
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-slate-900 border-2 border-teal-500 p-1 flex items-center justify-center shrink-0 shadow-sm">
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

              {/* Company Contact Details (Fixed Header) */}
              <div className="text-right text-[11px] font-bold text-slate-800 space-y-0.5">
                <div className="text-sm font-black text-slate-900">KINGSLAND HOLIDAYS</div>
                <div className="text-teal-700">www.kingslandholidays.com</div>
                <div>official.kingslandholidays@gmail.com</div>
                <div className="font-mono">7014939068, 9772595049, 7015528341</div>
                <div className="text-[10px] text-slate-600 font-normal">25, Jain Colony, Jhotwara, Jaipur, Rajasthan, India - 302012</div>
              </div>

            </div>

            {/* Decorative Teal Bar */}
            <div className="h-1.5 bg-gradient-to-r from-teal-700 via-teal-500 to-teal-700 rounded-full" />

            {/* HOTEL & BOOKING HEADER BOX TABLE */}
            <div className="border-2 border-teal-800 rounded-xl overflow-hidden text-xs">
              
              {/* Row 1: Hotel Name & Address + Booking Nos */}
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x-2 divide-teal-800 bg-teal-50/40">
                
                {/* Hotel Name & Address */}
                <div className="p-3 md:col-span-2 space-y-1">
                  <div className="flex items-start gap-1.5">
                    <Hotel className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                    <div>
                      <h2 className="font-extrabold text-teal-900 text-sm underline decoration-teal-400 underline-offset-2">{voucher.hotelName}</h2>
                      <p className="text-[11px] font-semibold text-slate-700 mt-0.5 leading-snug">{voucher.city || 'Destination Central Hotel & Resort'}</p>
                      <p className="text-[11px] font-bold text-slate-900 mt-1">Phone no. <span className="font-mono">097850 80421</span></p>
                    </div>
                  </div>
                </div>

                {/* Booking Nos */}
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

              {/* Row 2: Guest Name, Check In, Check Out */}
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

              {/* Row 3: Persons, Nights, Room Details, Meal Plan, Extra Inclusions */}
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

              {/* Payment Status Bar */}
              <div className="bg-teal-700 text-white text-center py-2 font-black text-xs uppercase tracking-wider border-t-2 border-teal-800">
                Payment Status :: Paid by Kingsland Holidays
              </div>

            </div>

            {/* FIXED CONDITIONS & TERMS BOX (Exact 10 Bullet Points from PDF) */}
            <div className="border-2 border-dashed border-teal-800 rounded-xl p-4 bg-slate-50/50 text-[10.5px] leading-relaxed space-y-2 text-slate-800">
              <div className="flex items-start gap-2">
                <span className="text-teal-600 font-bold shrink-0">🔹</span>
                <p>Current government regulations require Indian residents to present proof of identity at the time of check-in. The proof of identity can be the guest's driving licence, Aadhar, passport or voter's id.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-teal-600 font-bold shrink-0">🔹</span>
                <p>Standard Check-in time is 12 pm or similar and Check-out time is 10 am (These also vary as per hotel).</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-teal-600 font-bold shrink-0">🔹</span>
                <p>Please remember that all special requests like early check-In, late check-out, smoking room, non-smoking room, views, floors, interconnecting rooms are strictly subject to availability upon arrival and the same cannot be guaranteed prior and may be chargeable. The price of the same will be paid directly to the hotel by you.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-teal-600 font-bold shrink-0">🔹</span>
                <p>Car/Driver details will be provided 1 day prior to travel start date.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-teal-600 font-bold shrink-0">🔹</span>
                <p>If balance payment due is On arrival, failure to pay timely on arrival may lead to booking getting canceled the next day.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-teal-600 font-bold shrink-0">🔹</span>
                <p>Hotels have their own policies for Room Heater, Laundry, Swimming pool, Spa etc and these can be availed at an extra cost. We only confirm the room with a given meal plan.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-teal-600 font-bold shrink-0">🔹</span>
                <p>No refund will be given in case of hotel Change / Cancel before 7 days , Hotel Cancellation Policy is applicable as per hotel's cancellation policy.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-teal-600 font-bold shrink-0">🔹</span>
                <p>Please note that landslides are a common occurrence in hilly areas. Guests would be required to bear the additional cost for any diversion/changes due to road blockage, landslide, political unrest, etc.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-teal-600 font-bold shrink-0">🔹</span>
                <p>Due to limited parking availability, vehicle entry is restricted in many areas and permitted only during specific time slots. Therefore, the cab will drop you at the nearest designated parking area.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-teal-600 font-bold shrink-0">🔹</span>
                <p>Please Note The Cab's AC May not function effectively during uphill drives or when the vehicle is stationary.</p>
              </div>
            </div>

            {/* STAMP & WATERMARK */}
            <div className="flex justify-end pt-2">
              <div className="border-4 border-amber-600 text-amber-700 font-black text-xs px-4 py-2 rounded-lg rotate-[-6deg] uppercase tracking-widest bg-amber-50/80 shadow-xs">
                RESERVATION CONFIRMED
              </div>
            </div>

            {/* Footer Graphic */}
            <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-500">
              <p>Thank you for choosing Kingsland Holidays. Have a wonderful stay!</p>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
