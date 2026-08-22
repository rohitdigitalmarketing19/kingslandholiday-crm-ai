import React, { useState, useRef } from 'react';
import { X, Printer, Download, CheckCircle, Hotel, Sparkles, FileText, Send, Building2, User, Calendar, ShieldCheck } from 'lucide-react';
import { Customer, HotelVoucher } from '../types';
import { exportElementToPdf } from '../utils/pdfExport';

interface CreateVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  initialVoucher?: HotelVoucher | null;
  onSaveVoucher: (createdVoucher: HotelVoucher) => void;
}

export const CreateVoucherModal: React.FC<CreateVoucherModalProps> = ({
  isOpen,
  onClose,
  customers,
  initialVoucher,
  onSaveVoucher,
}) => {
  if (!isOpen) return null;

  const defaultCust = customers.find((c) => c.bookingId === initialVoucher?.bookingId) || customers[0];

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(defaultCust?.id || '');
  const currentCustomer = customers.find((c) => c.id === selectedCustomerId) || defaultCust;

  // Form Fields for Manual Box Details (Pre-filled if customer/voucher provided)
  const [hotelName, setHotelName] = useState<string>(initialVoucher?.hotelName || 'Heena Heritage Resort, Jaipur');
  const [hotelAddress, setHotelAddress] = useState<string>('opp. Jaipur Golden Petrol Pump, Pepliyan ki Dhani, Amer, Jaipur, Rajasthan 302028');
  const [hotelPhone, setHotelPhone] = useState<string>('097850 80421');
  const [hotelBookingNo, setHotelBookingNo] = useState<string>(initialVoucher?.confirmationNumber || `KLHR${Math.floor(300 + Math.random() * 680)}`);
  const [voucherNo, setVoucherNo] = useState<string>(`3${Math.floor(300 + Math.random() * 680)}`);
  const [guestName, setGuestName] = useState<string>(currentCustomer ? `Mr. ${currentCustomer.name}` : 'Mr. Guest');
  const [checkIn, setCheckIn] = useState<string>(initialVoucher?.checkIn || currentCustomer?.startDate || '15th Sept 2026');
  const [checkOut, setCheckOut] = useState<string>(initialVoucher?.checkOut || currentCustomer?.endDate || '16th Sept 2026');
  const [noOfPersons, setNoOfPersons] = useState<string>(currentCustomer ? `${currentCustomer.paxAdults} Adults & ${currentCustomer.paxChildren} Child` : '2 Adults');
  const [noOfNights, setNoOfNights] = useState<string>(initialVoucher ? `${initialVoucher.nights}N` : '1N');
  const [roomDetails, setRoomDetails] = useState<string>(initialVoucher?.roomType || '1 Deluxe Room');
  const [mealPlan, setMealPlan] = useState<string>(initialVoucher?.mealPlan || 'CPAI (Breakfast)');
  const [extraInclusions, setExtraInclusions] = useState<string>('N/A');
  const [paymentStatus, setPaymentStatus] = useState<string>('Paid by Kingsland Holidays');

  const printRef = useRef<HTMLDivElement>(null);

  const handleCustomerChange = (custId: string) => {
    setSelectedCustomerId(custId);
    const c = customers.find((item) => item.id === custId);
    if (c) {
      setGuestName(`Mr. ${c.name}`);
      setCheckIn(c.startDate);
      setCheckOut(c.endDate);
      setNoOfPersons(`${c.paxAdults} Adults & ${c.paxChildren} Child`);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    const filename = `Hotel_Voucher_${hotelName.replace(/\s+/g, '_')}.pdf`;
    
    try {
      await exportElementToPdf(printRef.current, {
        filename,
        margin: 6,
        width: 800,
        scale: 2
      });
    } catch (err) {
      console.error('PDF export error:', err);
      window.print();
    }
  };

  const handleSaveAndConfirm = () => {
    const newVoucher: HotelVoucher = {
      id: initialVoucher?.id || `vouch-${Date.now()}`,
      bookingId: currentCustomer?.bookingId || '',
      customerId: currentCustomer?.id || '',
      customerName: currentCustomer?.name || guestName,
      hotelName,
      city: currentCustomer?.destination || '',
      checkIn,
      checkOut,
      nights: parseInt(noOfNights) || 1,
      roomType: roomDetails,
      mealPlan,
      supplierName: 'Kingsland Holidays Partner',
      confirmationNumber: hotelBookingNo,
      status: 'Uploaded',
      dueDate: checkIn,
      fileName: `Hotel_Voucher_${hotelName.replace(/\s+/g, '_')}.pdf`,
      uploadedAt: new Date().toISOString().split('T')[0],
      uploadedBy: 'Ops Manager',
      urgency: 'Medium',
    };

    onSaveVoucher(newVoucher);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden print:p-0 print:bg-white print:static">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-6xl h-[94vh] max-h-[94vh] shadow-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 print:max-w-none print:max-h-none print:h-auto print:shadow-none print:border-none print:rounded-none">
        
        {/* Modal Top Toolbar (Hidden on print) */}
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white print:hidden shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500 text-slate-900 font-bold">
              <Hotel className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base flex items-center gap-2">
                Official Kingsland Hotel Voucher Generator
                <span className="text-[10px] bg-teal-400/20 text-teal-300 px-2.5 py-0.5 rounded-full font-mono border border-teal-400/30">PDF Layout Replica</span>
              </h3>
              <p className="text-xs text-slate-400">Fill box details manually or pre-fill from customer records. Fixed header, logo & conditions.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-slate-700"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>

            <button
              onClick={handleSaveAndConfirm}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Save to Active Vouchers</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Content (Split Form + Live Replica Preview) */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden print:overflow-visible">
          
          {/* Left Form: Manual Box Details Input (Hidden on Print) */}
          <div className="w-full lg:w-96 p-5 border-r border-slate-200 bg-slate-50/70 space-y-4 shrink-0 h-full overflow-y-auto print:hidden text-xs custom-scrollbar">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1">
                <FileText className="w-4 h-4 text-teal-600" /> Fill Box Details (Manual)
              </span>
            </div>

            {/* Customer Selector */}
            {customers.length > 0 && (
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Customer / Lead:</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.bookingId} - {c.name} ({c.destination})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Hotel Name & Address */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Hotel Name & Destination:</label>
              <input
                type="text"
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-bold text-slate-900"
                placeholder="e.g. Heena Heritage Resort, Jaipur"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Hotel Full Address:</label>
              <textarea
                rows={2}
                value={hotelAddress}
                onChange={(e) => setHotelAddress(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Hotel Phone No:</label>
              <input
                type="text"
                value={hotelPhone}
                onChange={(e) => setHotelPhone(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Hotel Booking No:</label>
                <input
                  type="text"
                  value={hotelBookingNo}
                  onChange={(e) => setHotelBookingNo(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-mono font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Kingsland Voucher No:</label>
                <input
                  type="text"
                  value={voucherNo}
                  onChange={(e) => setVoucherNo(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Guest Name:</label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-extrabold text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Check In Date:</label>
                <input
                  type="text"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Check Out Date:</label>
                <input
                  type="text"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-slate-700 block mb-1">No of Persons:</label>
                <input
                  type="text"
                  value={noOfPersons}
                  onChange={(e) => setNoOfPersons(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">No of Nights:</label>
                <input
                  type="text"
                  value={noOfNights}
                  onChange={(e) => setNoOfNights(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Room Details:</label>
              <textarea
                rows={2}
                value={roomDetails}
                onChange={(e) => setRoomDetails(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Meal Plan:</label>
                <input
                  type="text"
                  value={mealPlan}
                  onChange={(e) => setMealPlan(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Extra Inclusions:</label>
                <input
                  type="text"
                  value={extraInclusions}
                  onChange={(e) => setExtraInclusions(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Payment Status:</label>
              <input
                type="text"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-extrabold text-teal-800"
              />
            </div>
          </div>

          {/* Right Panel: Official Kingsland Holiday Voucher PDF Replica */}
          <div className="flex-1 min-h-0 h-full p-4 sm:p-8 bg-slate-200/70 overflow-y-scroll overflow-x-hidden flex flex-col items-center custom-scrollbar print:bg-white print:p-0 print:overflow-visible">
            
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
                        <h2 className="font-extrabold text-teal-900 text-sm underline decoration-teal-400 underline-offset-2">{hotelName}</h2>
                        <p className="text-[11px] font-semibold text-slate-700 mt-0.5 leading-snug">{hotelAddress}</p>
                        <p className="text-[11px] font-bold text-slate-900 mt-1">Phone no. <span className="font-mono">{hotelPhone}</span></p>
                      </div>
                    </div>
                  </div>

                  {/* Booking Nos */}
                  <div className="p-2.5 flex flex-col justify-center divide-y-2 divide-teal-800 text-center font-bold">
                    <div className="pb-2">
                      <span className="text-[10px] uppercase text-teal-700 font-extrabold block">Hotel Booking No</span>
                      <span className="font-mono text-slate-900 text-sm font-black">{hotelBookingNo}</span>
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
                    <span className="font-black text-slate-900 text-xs sm:text-sm">{guestName}</span>
                  </div>
                  <div className="p-2.5">
                    <span className="text-[10px] uppercase text-teal-700 font-extrabold block">Check In</span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">{checkIn}</span>
                  </div>
                  <div className="p-2.5">
                    <span className="text-[10px] uppercase text-teal-700 font-extrabold block">Check Out</span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">{checkOut}</span>
                  </div>
                </div>

                {/* Row 3: Persons, Nights, Room Details, Meal Plan, Extra Inclusions */}
                <div className="grid grid-cols-5 divide-x-2 divide-teal-800 border-t-2 border-teal-800 bg-teal-50/20 text-center">
                  <div className="p-2">
                    <span className="text-[9px] uppercase text-teal-700 font-extrabold block">No of Persons</span>
                    <span className="font-extrabold text-slate-900 text-xs">{noOfPersons}</span>
                  </div>
                  <div className="p-2">
                    <span className="text-[9px] uppercase text-teal-700 font-extrabold block">No. of Nights</span>
                    <span className="font-black text-slate-900 text-xs">{noOfNights}</span>
                  </div>
                  <div className="p-2">
                    <span className="text-[9px] uppercase text-teal-700 font-extrabold block">Room Details</span>
                    <span className="font-bold text-slate-900 text-[11px] whitespace-pre-line">{roomDetails}</span>
                  </div>
                  <div className="p-2">
                    <span className="text-[9px] uppercase text-teal-700 font-extrabold block">Meal Plan</span>
                    <span className="font-extrabold text-slate-900 text-xs">{mealPlan}</span>
                  </div>
                  <div className="p-2">
                    <span className="text-[9px] uppercase text-teal-700 font-extrabold block">Extra Inclusions</span>
                    <span className="font-bold text-slate-900 text-xs">{extraInclusions}</span>
                  </div>
                </div>

                {/* Payment Status Bar */}
                <div className="bg-teal-700 text-white text-center py-2 font-black text-xs uppercase tracking-wider border-t-2 border-teal-800">
                  Payment Status :: {paymentStatus}
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

              {/* Mountain Vector Footer */}
              <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-500">
                <p>Thank you for choosing Kingsland Holidays. Have a wonderful stay!</p>
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
