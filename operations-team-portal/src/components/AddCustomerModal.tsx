import React, { useState } from 'react';
import { X, Plus, User, MapPin, Calendar, Phone, Mail, DollarSign, Hotel } from 'lucide-react';
import { Customer, HotelVoucher, TripItinerary, PaymentInstallment } from '../types';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCustomer: (newCustomer: Customer, newHotelVoucher?: HotelVoucher) => void;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  onClose,
  onAddCustomer,
}) => {
  if (!isOpen) return null;

  const [bookingId, setBookingId] = useState(`LIXKT-${Math.floor(1000 + Math.random() * 9000)}`);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [destination, setDestination] = useState('Thailand (Phuket & Krabi)');
  const [startDate, setStartDate] = useState('2026-08-10');
  const [endDate, setEndDate] = useState('2026-08-16');
  const [paxAdults, setPaxAdults] = useState(2);
  const [paxChildren, setPaxChildren] = useState(0);
  const [totalAmount, setTotalAmount] = useState(2200);
  const [opsManager, setOpsManager] = useState('Ananya Roy');
  const [notes, setNotes] = useState('');

  // Optional Hotel Voucher details to add simultaneously
  const [hotelName, setHotelName] = useState('');
  const [hotelCity, setHotelCity] = useState('');
  const [supplierName, setSupplierName] = useState('GoThailand DMC');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !bookingId) return;

    const custId = `cust-${Date.now()}`;
    const tot = Number(totalAmount) || 2000;
    const todayStr = new Date().toISOString().split('T')[0];

    // Auto generate 3 installment schedule
    const inst1Amount = Math.round(tot * 0.3);
    const inst2Amount = Math.round(tot * 0.4);
    const inst3Amount = tot - inst1Amount - inst2Amount;

    const defaultInstallments: PaymentInstallment[] = [
      {
        id: `inst-${Date.now()}-1`,
        installmentNumber: 1,
        title: '1st Installment - Advance Token',
        amount: inst1Amount,
        dueDate: todayStr,
        status: 'Pending',
        paidAt: '',
        paymentMode: '',
        transactionRef: '',
        notes: 'Token advance scheduled on booking confirmation',
      },
      {
        id: `inst-${Date.now()}-2`,
        installmentNumber: 2,
        title: '2nd Installment - Flight & Hotel Lock',
        amount: inst2Amount,
        dueDate: startDate,
        status: 'Pending',
      },
      {
        id: `inst-${Date.now()}-3`,
        installmentNumber: 3,
        title: '3rd Installment - Pre-Departure Final Balance',
        amount: inst3Amount,
        dueDate: startDate,
        status: 'Pending',
      }
    ];

    const newCust: Customer = {
      id: custId,
      bookingId,
      name,
      email: email || 'guest@example.com',
      phone: phone || '+91 98765 00000',
      destination,
      startDate,
      endDate,
      paxAdults: Number(paxAdults),
      paxChildren: Number(paxChildren),
      totalAmount: tot,
      currency: 'USD',
      assignedOpsManager: opsManager,
      status: 'Upcoming',
      installments: defaultInstallments,
      notes,
      createdAt: todayStr,
    };

    let newVoucher: HotelVoucher | undefined = undefined;
    if (hotelName) {
      newVoucher = {
        id: `vouch-${Date.now()}`,
        bookingId,
        customerId: custId,
        customerName: name,
        hotelName,
        city: hotelCity || destination,
        checkIn: startDate,
        checkOut: endDate,
        nights: 5,
        roomType: 'Deluxe Room',
        mealPlan: 'Bed & Breakfast',
        supplierName,
        status: 'Pending',
        dueDate: startDate,
        urgency: 'High',
      };
    }

    onAddCustomer(newCust, newVoucher);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-xl animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 /80">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-600 text-white">
              <Plus className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-slate-900 text-base">
              Add New Post-Sales Customer Booking
            </h3>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 p-6 overflow-y-auto space-y-4 text-xs">
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Booking ID</label>
              <input
                type="text"
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 font-mono font-bold text-blue-600"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Assigned Ops Manager</label>
              <select
                value={opsManager}
                onChange={(e) => setOpsManager(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 font-medium"
              >
                <option value="Ananya Roy">Ananya Roy</option>
                <option value="Vikram Malhotra">Vikram Malhotra</option>
                <option value="Siddharth Rao">Siddharth Rao</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">Customer / Guest Name</label>
            <input
              type="text"
              placeholder="e.g. Rahul & Priya Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 font-semibold"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Email Address</label>
              <input
                type="email"
                placeholder="guest@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-3 sm:col-span-1">
              <label className="font-semibold text-slate-700 block mb-1">Destination</label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Adult PAX</label>
              <input
                type="number"
                min={1}
                value={paxAdults}
                onChange={(e) => setPaxAdults(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Child PAX</label>
              <input
                type="number"
                min={0}
                value={paxChildren}
                onChange={(e) => setPaxChildren(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Total ($ USD)</label>
              <input
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-300 font-bold"
              />
            </div>
          </div>

          {/* Optional Initial Hotel Booking */}
          <div className="p-3.5 rounded-xl bg-slate-50 /60 border border-slate-200 space-y-2">
            <span className="font-bold text-slate-800 block">
              + Add Pending Hotel Booking (Optional):
            </span>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Hotel Name (e.g. Centara Grand)"
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
                className="px-3 py-1.5 rounded bg-white border border-slate-300"
              />
              <input
                type="text"
                placeholder="City (e.g. Phuket)"
                value={hotelCity}
                onChange={(e) => setHotelCity(e.target.value)}
                className="px-3 py-1.5 rounded bg-white border border-slate-300"
              />
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
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs"
            >
              Save Customer Booking
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
