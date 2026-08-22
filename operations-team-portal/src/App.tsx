import React, { useState, useEffect } from 'react';
import { TabType, Customer, HotelVoucher, TripItinerary } from './types';
import { 
  getStoredCustomers, 
  saveCustomers, 
  getStoredVouchers, 
  saveVouchers, 
  getStoredItineraries, 
  saveItineraries, 
  resetToDefaults 
} from './utils/storage';
import * as api from './services/api';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { CustomerModule } from './components/CustomerModule';
import { PendingVouchersModule } from './components/PendingVouchersModule';
import { UploadedVouchersModule } from './components/UploadedVouchersModule';
import { UpcomingTripsModule } from './components/UpcomingTripsModule';
import { DayWiseTripModule } from './components/DayWiseTripModule';
import { CabLogisticsModule } from './components/CabLogisticsModule';
import { CompletedTripsModule } from './components/CompletedTripsModule';
import { InvoiceModule } from './components/InvoiceModule';

import { CustomerDetailDrawer } from './components/CustomerDetailDrawer';
import { VoucherPreviewModal } from './components/VoucherPreviewModal';
import { UploadVoucherModal } from './components/UploadVoucherModal';
import { CreateVoucherModal } from './components/CreateVoucherModal';
import { SendHotelEmailModal } from './components/SendHotelEmailModal';
import { SendCustomerVoucherPdfModal } from './components/SendCustomerVoucherPdfModal';
import { ShareModal } from './components/ShareModal';
import { RecordPaymentModal } from './components/RecordPaymentModal';
import { CompleteTripModal } from './components/CompleteTripModal';
import { PaymentInstallment } from './types';

interface OperationsPortalProps {
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
  hideSidebar?: boolean;
  isReadOnly?: boolean;
}

export default function App({ activeTab: externalActiveTab, onTabChange, hideSidebar = false, isReadOnly = false }: OperationsPortalProps = {}) {
  const [internalActiveTab, setInternalActiveTab] = useState<TabType>('customer');
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;

  const setActiveTab = (tab: TabType) => {
    setInternalActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  // App Data State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vouchers, setVouchers] = useState<HotelVoucher[]>([]);
  const [itineraries, setItineraries] = useState<TripItinerary[]>([]);

  // Selected State for Drawers / Modals
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [previewVoucher, setPreviewVoucher] = useState<HotelVoucher | null>(null);
  const [uploadTargetVoucher, setUploadTargetVoucher] = useState<HotelVoucher | null>(null);
  const [selectedCustomerIdForDayWise, setSelectedCustomerIdForDayWise] = useState<string>('');
  const [selectedCustomerIdForInvoice, setSelectedCustomerIdForInvoice] = useState<string>('');

  // Create Voucher Modal State
  const [isCreateVoucherOpen, setIsCreateVoucherOpen] = useState<boolean>(false);
  const [createVoucherTarget, setCreateVoucherTarget] = useState<HotelVoucher | null>(null);

  // Send Mail to Hotel Modal State
  const [isSendHotelEmailOpen, setIsSendHotelEmailOpen] = useState<boolean>(false);
  const [sendHotelEmailVoucher, setSendHotelEmailVoucher] = useState<HotelVoucher | null>(null);
  const [sendHotelEmailPackageVouchers, setSendHotelEmailPackageVouchers] = useState<HotelVoucher[]>([]);

  const handleOpenSendMailToHotel = (voucher: HotelVoucher, allVouchersInPackage?: HotelVoucher[]) => {
    setSendHotelEmailVoucher(voucher);
    setSendHotelEmailPackageVouchers(allVouchersInPackage || [voucher]);
    setIsSendHotelEmailOpen(true);
  };

  const handleOpenCreateVoucher = (voucher?: HotelVoucher) => {
    setCreateVoucherTarget(voucher || null);
    setIsCreateVoucherOpen(true);
  };

  const handleSaveCreatedVoucher = async (createdVoucher: HotelVoucher) => {
    try {
      const updated = await api.createOpsVoucher(createdVoucher);
      const newVouchers = [...vouchers.filter(v => v.id !== createdVoucher.id), updated || createdVoucher];
      setVouchers(newVouchers);
      saveVouchers(newVouchers);
    } catch (e) {
      console.error('Error saving created voucher:', e);
      const newVouchers = [...vouchers.filter(v => v.id !== createdVoucher.id), createdVoucher];
      setVouchers(newVouchers);
      saveVouchers(newVouchers);
    }
  };

  // Modals visibility
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [shareText, setShareText] = useState<string>('');

  // Send Customer Voucher PDF Modal State
  const [sendPdfCustomerVoucher, setSendPdfCustomerVoucher] = useState<HotelVoucher | null>(null);
  const [sendPdfCustomer, setSendPdfCustomer] = useState<Customer | null>(null);
  const [isSendPdfModalOpen, setIsSendPdfModalOpen] = useState<boolean>(false);

  // Payment Recording Modal State
  const [recordPaymentCustomer, setRecordPaymentCustomer] = useState<Customer | null>(null);
  const [recordPaymentInstallment, setRecordPaymentInstallment] = useState<PaymentInstallment | null>(null);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState<boolean>(false);

  // Complete Trip Confirmation Modal State
  const [confirmCompleteCustomer, setConfirmCompleteCustomer] = useState<Customer | null>(null);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState<boolean>(false);

  const handleOpenRecordPayment = (customer: Customer, installment: PaymentInstallment) => {
    setRecordPaymentCustomer(customer);
    setRecordPaymentInstallment(installment);
    setIsRecordPaymentOpen(true);
  };

  const handleConfirmPayment = async (
    customerId: string,
    installmentId: string,
    updatedDetails: Partial<PaymentInstallment>
  ) => {
    try {
      const updatedCust = await api.recordOpsPayment(customerId, installmentId, updatedDetails);
      const updated = customers.map((c) => (c.id === customerId ? updatedCust : c));
      setCustomers(updated);
      saveCustomers(updated);
      if (selectedCustomer && selectedCustomer.id === customerId) {
        setSelectedCustomer(updatedCust);
      }
    } catch (e) {
      console.error('Error confirming payment:', e);
    }
  };

  // Initial Data Load from Backend API
  const loadData = async () => {
    try {
      const custs = await api.fetchOpsCustomers();
      const [vouches, itins] = await Promise.all([
        api.fetchOpsVouchers(custs),
        api.fetchOpsItineraries(),
      ]);

      setCustomers(custs);
      setVouchers(vouches);
      setItineraries(itins);

      if (custs.length > 0 && !selectedCustomerIdForDayWise) {
        setSelectedCustomerIdForDayWise(custs[0].id);
      }
    } catch (err) {
      console.error('Failed loading operations data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync state helpers
  const handleUpdateCustomers = (newCusts: Customer[]) => {
    setCustomers(newCusts);
    saveCustomers(newCusts);
  };

  const handleUpdateSingleCustomer = async (updatedCust: Customer) => {
    try {
      const result = await api.updateOpsCustomer(updatedCust.id, updatedCust);
      const newCusts = customers.map((c) => (c.id === updatedCust.id ? (result || updatedCust) : c));
      setCustomers(newCusts);
      saveCustomers(newCusts);
    } catch (e) {
      console.error('Error updating customer:', e);
      const newCusts = customers.map((c) => (c.id === updatedCust.id ? updatedCust : c));
      setCustomers(newCusts);
      saveCustomers(newCusts);
    }
  };

  const handleDeleteVoucher = async (voucherId: string) => {
    try {
      const success = await api.deleteOpsVoucher(voucherId);
      if (success) {
        const newVouchers = vouchers.filter((v) => v.id !== voucherId);
        setVouchers(newVouchers);
        saveVouchers(newVouchers);
      } else {
        alert('Failed to delete voucher');
      }
    } catch (e) {
      console.error('Error deleting voucher:', e);
      alert('Error deleting voucher');
    }
  };

  const handleUpdateVouchers = (newVouches: HotelVoucher[]) => {
    setVouchers(newVouches);
    saveVouchers(newVouches);
  };

  const handleUpdateItineraries = (newItins: TripItinerary[]) => {
    setItineraries(newItins);
    saveItineraries(newItins);
  };

  // Add Customer Handler
  const handleAddCustomer = async (newCustomer: Customer, newVoucher?: HotelVoucher) => {
    try {
      const created = await api.createOpsCustomer(newCustomer);
      const updatedCusts = [created, ...customers];
      setCustomers(updatedCusts);
      saveCustomers(updatedCusts);

      if (newVoucher) {
        const createdVoucher = await api.updateOpsVoucher(newVoucher.id, newVoucher);
        const updatedVouches = [createdVoucher, ...vouchers];
        setVouchers(updatedVouches);
        saveVouchers(updatedVouches);
      }

      // Reload fresh itineraries
      const freshItins = await api.fetchOpsItineraries();
      setItineraries(freshItins);
      saveItineraries(freshItins);
      setSelectedCustomerIdForDayWise(created.id);
    } catch (e) {
      console.error('Error adding customer:', e);
    }
  };

  // Confirm Voucher Upload Handler
  const handleConfirmVoucherUpload = async (
    voucherId: string,
    confirmationNumber: string,
    fileName: string,
    fileUrl?: string
  ) => {
    try {
      const updatedVoucher = await api.uploadOpsVoucherFile(voucherId, confirmationNumber, fileName, fileUrl);
      const updated = vouchers.map((v) => (v.id === voucherId ? updatedVoucher : v));
      handleUpdateVouchers(updated);
    } catch (e) {
      console.error('Error uploading voucher:', e);
    }
  };

  // Supplier Reminder Trigger
  const handleSendSupplierReminder = (v: HotelVoucher) => {
    const msg = `⚠️ *URGENT HOTEL VOUCHER REMINDER*\n\nDear Supplier (${v.supplierName}),\n\nPlease send the confirmed accommodation voucher for Booking Code *${v.bookingId}* at *${v.hotelName}* (${v.city}).\nCheck-in Date: ${v.checkIn}\nGuest: ${v.customerName}\n\nKindly send voucher PDF ASAP.\n- Operations Team Desk`;
    setShareText(msg);
    setIsShareModalOpen(true);
  };

  // Update Single Voucher Handler
  const handleUpdateSingleVoucher = async (updatedV: HotelVoucher) => {
    try {
      const saved = await api.updateOpsVoucher(updatedV.id, updatedV);
      const updated = vouchers.map((v) => (v.id === updatedV.id ? (saved || updatedV) : v));
      handleUpdateVouchers(updated);
    } catch (e) {
      console.error('Error updating voucher:', e);
      const updated = vouchers.map((v) => (v.id === updatedV.id ? updatedV : v));
      handleUpdateVouchers(updated);
    }
  };

  // Send Voucher PDF to Customer
  const handleSendVoucherToCustomer = async (v: HotelVoucher) => {
    try {
      const updatedV = await api.updateOpsVoucher(v.id, { status: 'Sent to Customer' });
      const updated = vouchers.map((item) => (item.id === v.id ? updatedV : item));
      handleUpdateVouchers(updated);
    } catch (e) {
      console.error('Error updating voucher status:', e);
    }

    const matchedCustomer = customers.find((c) => c.id === v.customerId || c.bookingId === v.bookingId) || null;
    const phone = matchedCustomer?.phone || '917014939068';
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const msg = `Dear ${v.customerName || 'Guest'},\n\n` +
      `Please find attached your official Hotel Confirmation Voucher (PDF) from Kingsland Holidays! 🏨✈️\n\n` +
      `📌 *Booking ID:* ${v.bookingId}\n` +
      `🏨 *Hotel Name:* ${v.hotelName}\n` +
      `📍 *Destination:* ${v.city || 'Confirmed Location'}\n` +
      `📅 *Check-In:* ${v.checkIn} | *Check-Out:* ${v.checkOut}\n` +
      `🛏️ *Room Category:* ${v.roomType} (${v.mealPlan || 'Breakfast Included'})\n` +
      `🔑 *Confirmation Ref:* ${v.confirmationNumber || 'Confirmed'}\n\n` +
      `📎 Your official PDF voucher has been downloaded to your device. Please attach it here or present it at the hotel front desk.\n\n` +
      `Warm regards,\n` +
      `*Kingsland Holidays Operations Desk*\n` +
      `📞 +91 6376983416, +91 7014939068 | www.kingslandholidays.com`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/${phoneWithCountry}?text=${encoded}`, '_blank');
  };

  // Checklist Toggle Handler
  const handleToggleChecklist = async (customerId: string, itemKey: keyof TripItinerary['readinessChecklist']) => {
    const itin = itineraries.find((i) => i.customerId === customerId);
    if (!itin) return;
    const updatedChecklist = {
      ...itin.readinessChecklist,
      [itemKey]: !itin.readinessChecklist[itemKey],
    };
    try {
      const updatedItin = await api.updateOpsItinerary(itin.id, { readinessChecklist: updatedChecklist });
      const updated = itineraries.map((i) => (i.id === itin.id ? updatedItin : i));
      handleUpdateItineraries(updated);
    } catch (e) {
      console.error('Error toggling checklist:', e);
    }
  };

  // Update Itinerary Handler
  const handleUpdateSingleItinerary = async (updatedItin: TripItinerary) => {
    try {
      const saved = await api.updateOpsItinerary(updatedItin.id, updatedItin);
      const targetId = saved?.id || updatedItin.id;
      const exists = itineraries.some((i) => i.id === targetId || i.customerId === updatedItin.customerId);
      const updated = exists
        ? itineraries.map((i) => (i.id === targetId || i.customerId === updatedItin.customerId ? (saved || updatedItin) : i))
        : [...itineraries, saved || updatedItin];
      handleUpdateItineraries(updated);
    } catch (e) {
      console.error('Error updating itinerary:', e);
      const exists = itineraries.some((i) => i.id === updatedItin.id || i.customerId === updatedItin.customerId);
      const updated = exists
        ? itineraries.map((i) => (i.id === updatedItin.id || i.customerId === updatedItin.customerId ? updatedItin : i))
        : [...itineraries, updatedItin];
      handleUpdateItineraries(updated);
    }
  };

  // Reset to default sample data
  const handleResetData = async () => {
    if (window.confirm('Reset all operational data back to default Thailand & Bali sample records?')) {
      await api.resetOpsBackendData();
      await loadData();
    }
  };

  // Counts for sidebar badges
  const pendingVouchersCount = vouchers.filter((v) => v.status === 'Pending').length;
  const upcomingTripsCount = customers.filter((c) => c.status === 'Upcoming').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased">
      <div className="flex flex-1 min-h-screen overflow-hidden">
        
        {/* Operations Sidebar Navigation */}
        {!hideSidebar && (
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            pendingVouchersCount={pendingVouchersCount}
            upcomingTripsCount={upcomingTripsCount}
            customersCount={customers.length}
            isMobileOpen={isMobileOpen}
            setIsMobileOpen={setIsMobileOpen}
          />
        )}

        {/* Mobile Backdrop Overlay */}
        {isMobileOpen && (
          <div
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 z-30 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          
          {activeTab !== 'invoices' && (
            <Header
              activeTab={activeTab}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              onOpenUploadVoucher={() => {
                const firstPending = vouchers.find((v) => v.status === 'Pending') || vouchers[0];
                setUploadTargetVoucher(firstPending);
              }}
              onOpenShareModal={() => {
                setShareText('');
                setIsShareModalOpen(true);
              }}
              onResetData={handleResetData}
              onToggleMobileMenu={() => setIsMobileOpen(!isMobileOpen)}
              pendingCount={pendingVouchersCount}
              upcomingCount={upcomingTripsCount}
            />
          )}

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            
            {/* 1. Customer Option */}
            {activeTab === 'customer' && (
              <CustomerModule
                customers={customers}
                vouchers={vouchers}
                itineraries={itineraries}
                searchTerm={searchTerm}
                onSelectCustomer={(cust) => setSelectedCustomer(cust)}
                onOpenShareCustomer={(cust) => {
                  const msg = `✈️ *POST-SALES BOOKING SUMMARY*\n\nGuest: *${cust.name}*\nBooking ID: *${cust.bookingId}*\nDestination: ${cust.destination}\nTravel Dates: ${cust.startDate} to ${cust.endDate}\nPAX: ${cust.paxAdults} Adults\nOps Manager: ${cust.assignedOpsManager}\n\nHotel vouchers & driver details verified.`;
                  setShareText(msg);
                  setIsShareModalOpen(true);
                }}
                onNavigateToDayWise={(custKey) => {
                  setSelectedCustomerIdForDayWise(custKey);
                  setActiveTab('day-wise-trip');
                }}
                onRecordPaymentClick={handleOpenRecordPayment}
                onCompleteTrip={(cust) => {
                  setConfirmCompleteCustomer(cust);
                  setIsCompleteModalOpen(true);
                }}
              />
            )}

            {/* 2. Pending Hotel Vouchers Option */}
            {activeTab === 'pending-vouchers' && (
              <PendingVouchersModule
                vouchers={vouchers}
                searchTerm={searchTerm}
                onUploadVoucherClick={(v) => setUploadTargetVoucher(v)}
                onSendSupplierReminder={handleSendSupplierReminder}
                onOpenCreateVoucherClick={handleOpenCreateVoucher}
                onViewVoucherClick={(v) => setPreviewVoucher(v)}
                onSendMailToHotel={handleOpenSendMailToHotel}
                onDeleteVoucher={handleDeleteVoucher}
              />
            )}

            {/* 3. Uploaded Hotel Vouchers Option */}
            {activeTab === 'uploaded-vouchers' && (
              <UploadedVouchersModule
                vouchers={vouchers}
                searchTerm={searchTerm}
                onPreviewVoucher={(v) => setPreviewVoucher(v)}
                onSendToCustomer={handleSendVoucherToCustomer}
                onReuploadVoucher={(v) => setUploadTargetVoucher(v)}
                onDeleteVoucher={handleDeleteVoucher}
              />
            )}

            {/* 4. Upcoming Trips Option */}
            {activeTab === 'upcoming-trips' && (
              <UpcomingTripsModule
                customers={customers}
                vouchers={vouchers}
                itineraries={itineraries}
                searchTerm={searchTerm}
                onNavigateToDayWise={(custKey) => {
                  setSelectedCustomerIdForDayWise(custKey);
                  setActiveTab('day-wise-trip');
                }}
                onToggleChecklist={handleToggleChecklist}
                onOpenShareCustomer={(cust) => {
                  const msg = `✈️ *PRE-TRIP DEPARTURE PACK*\n\nGuest: *${cust.name}*\nDestination: ${cust.destination}\nDeparture Date: ${cust.startDate}\n\n✅ Air Tickets Verified\n✅ Hotel Vouchers Confirmed\n✅ Local Driver Assigned\n\nWish you an incredible journey!`;
                  setShareText(msg);
                  setIsShareModalOpen(true);
                }}
              />
            )}

            {/* 5. Day wise Trip Option */}
            {activeTab === 'day-wise-trip' && (
              <DayWiseTripModule
                customers={customers}
                vouchers={vouchers}
                itineraries={itineraries}
                selectedCustomerId={selectedCustomerIdForDayWise || (customers.find(c => c.status === 'In-Transit')?.id || customers[0]?.id || '')}
                setSelectedCustomerId={setSelectedCustomerIdForDayWise}
                onUpdateItinerary={handleUpdateSingleItinerary}
                onOpenShareModal={(msg) => {
                  setShareText(msg);
                  setIsShareModalOpen(true);
                }}
              />
            )}

            {/* 6. Cab & Driver Manager Option */}
            {activeTab === 'cab-logistics' && (
              <CabLogisticsModule
                customers={customers}
                vouchers={vouchers}
                searchTerm={searchTerm}
                isReadOnly={isReadOnly}
                onUpdateCustomer={handleUpdateSingleCustomer}
                onUpdateVoucher={handleUpdateSingleVoucher}
                onOpenShareModal={(msg) => {
                  setShareText(msg);
                  setIsShareModalOpen(true);
                }}
              />
            )}

            {/* 7. Completed Trips Option */}
            {activeTab === 'completed-trips' && (
              <CompletedTripsModule
                customers={customers}
                vouchers={vouchers}
                itineraries={itineraries}
                searchTerm={searchTerm}
                onUpdateCustomer={handleUpdateSingleCustomer}
                onOpenShareCustomer={(cust) => {
                  const msg = `🌟 *COMPLETED TRIP ARCHIVE*\n\nGuest: *${cust.name}*\nBooking Code: *${cust.bookingId}*\nDestination: ${cust.destination}\nRating: 5/5 Stars ⭐⭐⭐⭐⭐\n\nThank you for traveling with us!`;
                  setShareText(msg);
                  setIsShareModalOpen(true);
                }}
              />
            )}

            {/* 8. Invoices Desk Option */}
            {activeTab === 'invoices' && (
              <InvoiceModule
                customers={customers}
                initialCustomerId={selectedCustomerIdForInvoice || (customers[0]?.id || '')}
                isReadOnly={isReadOnly}
                onOpenShareModal={(msg) => {
                  setShareText(msg);
                  setIsShareModalOpen(true);
                }}
              />
            )}

          </main>
        </div>

      </div>

      {/* Global Slide-Over / Modal Views */}
      <CustomerDetailDrawer
        customer={selectedCustomer}
        vouchers={vouchers}
        itinerary={itineraries.find((i) => i.customerId === selectedCustomer?.id)}
        onClose={() => setSelectedCustomer(null)}
        onOpenShare={(cust) => {
          setSelectedCustomer(null);
          const msg = `✈️ *BOOKING SUMMARY*\nGuest: ${cust.name}\nBooking ID: ${cust.bookingId}\nDestination: ${cust.destination}\nDates: ${cust.startDate} to ${cust.endDate}`;
          setShareText(msg);
          setIsShareModalOpen(true);
        }}
        onNavigateToDayWise={(custKey) => {
          setSelectedCustomerIdForDayWise(custKey);
          setActiveTab('day-wise-trip');
        }}
        onNavigateToInvoices={(custKey) => {
          setSelectedCustomerIdForInvoice(custKey);
          setActiveTab('invoices');
        }}
        onPreviewVoucher={(v) => setPreviewVoucher(v)}
        onRecordPaymentClick={handleOpenRecordPayment}
      />

      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        customer={recordPaymentCustomer}
        installment={recordPaymentInstallment}
        onClose={() => setIsRecordPaymentOpen(false)}
        onConfirmPayment={handleConfirmPayment}
      />

      <VoucherPreviewModal
        voucher={previewVoucher}
        onClose={() => setPreviewVoucher(null)}
        onSendWhatsApp={(v) => {
          setPreviewVoucher(null);
          handleSendVoucherToCustomer(v);
        }}
      />

      <UploadVoucherModal
        voucher={uploadTargetVoucher}
        onClose={() => setUploadTargetVoucher(null)}
        onConfirmUpload={handleConfirmVoucherUpload}
      />

      <CreateVoucherModal
        isOpen={isCreateVoucherOpen}
        onClose={() => setIsCreateVoucherOpen(false)}
        customers={customers}
        initialVoucher={createVoucherTarget}
        onSaveVoucher={handleSaveCreatedVoucher}
      />

      <SendHotelEmailModal
        isOpen={isSendHotelEmailOpen}
        onClose={() => setIsSendHotelEmailOpen(false)}
        voucher={sendHotelEmailVoucher}
        allPackageVouchers={sendHotelEmailPackageVouchers}
      />

      <SendCustomerVoucherPdfModal
        isOpen={isSendPdfModalOpen}
        onClose={() => setIsSendPdfModalOpen(false)}
        voucher={sendPdfCustomerVoucher}
        customer={sendPdfCustomer}
        onPreviewVoucher={(v) => setPreviewVoucher(v)}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        initialMessage={shareText}
        onClose={() => setIsShareModalOpen(false)}
      />

      <CompleteTripModal
        isOpen={isCompleteModalOpen}
        customer={confirmCompleteCustomer}
        onClose={() => {
          setIsCompleteModalOpen(false);
          setConfirmCompleteCustomer(null);
        }}
        onConfirm={(cust) => {
          handleUpdateSingleCustomer({ ...cust, status: 'Completed' });
        }}
      />

    </div>
  );
}
