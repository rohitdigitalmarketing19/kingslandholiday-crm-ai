import React, { useState, useEffect } from 'react';
import { Lead } from '../types';
import * as api from '../services/apiService';

export type PaymentTab = 'Links' | 'Submissions' | 'Installments' | 'CreateLink' | 'Settings' | 'Portal' | 'Confirmation';

interface PaymentManagerModalProps {
  lead?: Lead | null;
  onClose?: () => void;
  onPaymentUpdated?: () => void;
  activeTab?: PaymentTab;
  onTabChange?: (tab: PaymentTab) => void;
  isFullPage?: boolean;
}

interface Installment {
  id?: string;
  title: string;
  amount: number;
  due_date: string;
  payment_condition: string;
  payment_status: 'Pending' | 'Paid';
  pay_key?: string;
}

const PaymentManagerModal: React.FC<PaymentManagerModalProps> = ({ 
  lead, 
  onClose, 
  onPaymentUpdated,
  activeTab: externalActiveTab,
  onTabChange,
  isFullPage = true
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<PaymentTab>('Links');
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;

  const setActiveTab = (tab: PaymentTab) => {
    setInternalActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  const [paymentLinks, setPaymentLinks] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    key_id: 'rzp_test_51HKingslandDemoKey',
    key_secret: '',
    upi_id: 'kingslandholiday@okicici',
    upi_payee: 'Kingsland Holidays Services Pvt Ltd',
    bank_name: 'HDFC Bank',
    bank_acc_num: '50200087628332',
    bank_ifsc: 'HDFC0001234',
    bank_branch: 'Connaught Place, New Delhi',
    bank_acc_name: 'Kingsland Holidays Services',
    support_phone: '+91 6376983416'
  });

  const getLeadPackagePrice = (l?: Lead | null): number => {
    if (!l) return 0;
    if (l.quotes && l.quotes.length > 0) {
      const lastQuote = l.quotes[l.quotes.length - 1];
      if (lastQuote.finalSellingPrice && lastQuote.finalSellingPrice > 0) {
        return lastQuote.finalSellingPrice;
      }
    }
    return 0;
  };

  // EMI / Partial Payment Installments State
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [totalPackagePrice, setTotalPackagePrice] = useState<number>(() => getLeadPackagePrice(lead));
  const [autoSplitCount, setAutoSplitCount] = useState(3);
  const [hasExistingEMI, setHasExistingEMI] = useState(false);
  const [isSavingInstallments, setIsSavingInstallments] = useState(false);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [targetLead, setTargetLead] = useState<Lead | null>(lead || null);
  const [emiSearchQuery, setEmiSearchQuery] = useState<string>('');
  const [showPaidLinks, setShowPaidLinks] = useState<boolean>(false);
  const [showCreateChoiceModal, setShowCreateChoiceModal] = useState<boolean>(false);
  const [createdLinkModalData, setCreatedLinkModalData] = useState<any | null>(null);

  useEffect(() => {
    api.fetchLeads().then(data => setAllLeads(data)).catch(() => {});
  }, []);

  const handleSelectTripId = async (tripId: string) => {
    setSelectedTripId(tripId);
    const found = allLeads.find(l => l.tripId === tripId || l.id === tripId);
    if (found) {
      setTargetLead(found);
      setCustName(found.name);
      setCustPhone(found.phone || '');
      setCustEmail(found.email || '');
      const price = getLeadPackagePrice(found);
      setTotalPackagePrice(price);
      setBaseAmount(price);
      if (found.destination) {
        setDestination(found.destination);
        setPackageName(`${found.destination} Tour Package`);
      }
      if (found.travelDate) setTravelDate(found.travelDate);
      if (found.durationDays) setDurationText(`${found.durationDays} Days / ${Math.max(1, found.durationDays - 1)} Nights`);
      if (found.travelers) {
        setAdultsCount(found.travelers.adults || 2);
        setChildrenCount(found.travelers.children || 0);
      }

      // Fetch installments and payment links for this selected lead
      try {
        const [insts, links] = await Promise.all([
          api.fetchLeadInstallments(found.id || found.tripId),
          api.fetchPaymentLinks(found.id || found.tripId),
        ]);
        if (insts && insts.length > 0) {
          setInstallments(insts);
          setHasExistingEMI(true);
          const sum = insts.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);
          if (sum > 0) setTotalPackagePrice(sum);
        } else {
          setInstallments([]);
          setHasExistingEMI(false);
        }
        if (links && links.length > 0) {
          setPaymentLinks(links);
        }
      } catch (err) {
        console.error('Error fetching data for selected trip:', err);
      }
    }
  };

  // Link Form State (Tailored for Individual Travel Packages)
  const [packageName, setPackageName] = useState(lead?.destination ? `${lead.destination} Tour Package` : 'Tour Package Confirmation');
  const [destination, setDestination] = useState(lead?.destination || 'Bali / Maldives / Kashmir');
  const [travelDate, setTravelDate] = useState(lead?.travelDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
  const [baseAmount, setBaseAmount] = useState<number>(() => getLeadPackagePrice(lead));
  const [gstAmount, setGstAmount] = useState<number>(0);
  const [feeAmount, setFeeAmount] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [adultsCount, setAdultsCount] = useState<number>(lead?.travelers?.adults || 2);
  const [childrenCount, setChildrenCount] = useState<number>(lead?.travelers?.children || 0);
  const [custName, setCustName] = useState(lead?.name || '');
  const [custPhone, setCustPhone] = useState(lead?.phone || '');
  const [custEmail, setCustEmail] = useState(lead?.email || '');
  const [durationText, setDurationText] = useState(lead?.durationDays ? `${lead.durationDays} Days / ${lead.durationDays - 1} Nights` : '6 Days / 5 Nights');
  const [hotelsText, setHotelsText] = useState('4 Star Deluxe Resort');
  const [travelersText, setTravelersText] = useState(lead?.travelers ? `${lead.travelers.adults || 2} Adults, ${lead.travelers.children || 0} Children` : '2 Adults, 0 Children');

  // Customer Gateway State
  const [selectedLink, setSelectedLink] = useState<any | null>(null);
  const [selectedPayMode, setSelectedPayMode] = useState<'UPI' | 'Bank' | 'Razorpay' | 'Cash'>('UPI');
  const [utrNumber, setUtrNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sharing Helper Functions
  const shareOnWhatsApp = (title: string, amount: number, linkUrl: string, phone?: string) => {
    const text = `Hello! Here is your official secure payment link for ${title}:\n\nTotal Amount Payable: ₹${amount.toLocaleString('en-IN')}\n\nClick here to complete payment: ${linkUrl}\n\nThank you,\nKingsland Holidays Services`;
    const encodedText = encodeURIComponent(text);
    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodedText}` : `https://wa.me/?text=${encodedText}`;
    window.open(url, '_blank');
  };

  const shareViaEmail = (title: string, amount: number, linkUrl: string, email?: string) => {
    const subject = encodeURIComponent(`Payment Link for ${title} - Kingsland Holidays Services`);
    const body = encodeURIComponent(`Dear Customer,\n\nPlease find your secure payment link for ${title} below:\n\nAmount Payable: ₹${amount.toLocaleString('en-IN')}\nPayment Link: ${linkUrl}\n\nPlease click the link to proceed with payment via UPI, Credit/Debit Card, or Bank Transfer.\n\nWarm regards,\nKingsland Holidays Services`);
    const mailtoUrl = email ? `mailto:${email}?subject=${subject}&body=${body}` : `mailto:?subject=${subject}&body=${body}`;
    window.location.href = mailtoUrl;
  };

  // New Portal UI States matching custom payment desk design
  const [portalTab, setPortalTab] = useState<'UPI' | 'QR CODE' | 'BANK' | 'CARD'>('UPI');
  const [showCardFeePopup, setShowCardFeePopup] = useState(false);
  const [selectedUpiApp, setSelectedUpiApp] = useState<'PhonePe' | 'GPay' | 'Paytm' | 'BHIM UPI'>('PhonePe');
  const [customerUpiId, setCustomerUpiId] = useState('');
  const [customerUpiPhone, setCustomerUpiPhone] = useState(lead?.phone || '');
  const [billingName, setBillingName] = useState(lead?.name || '');
  const [billingMobile, setBillingMobile] = useState(lead?.phone || '');
  const [billingEmail, setBillingEmail] = useState(lead?.email || '');

  const handleClearSubmissions = async () => {
    if (confirm('Are you sure you want to clear all payment verification submissions? This will clear all pending/approved submissions.')) {
      await api.clearAllPaymentSubmissions();
      setSubmissions([]);
      alert('✅ All payment submissions cleared successfully!');
    }
  };

  useEffect(() => {
    loadData();
  }, [lead, targetLead?.id]);

  useEffect(() => {
    const handleUrlPayId = async () => {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      const match = hash.match(/pay_id=([^&]+)/) || search.match(/pay_id=([^&]+)/);
      if (match && match[1]) {
        const payKey = decodeURIComponent(match[1]);
        const found = paymentLinks.find((l: any) => l.pay_key === payKey);
        if (found) {
          setSelectedLink(found);
        } else {
          try {
            const fetched = await api.fetchPaymentLinkByKey(payKey);
            if (fetched) {
              setSelectedLink(fetched);
            }
          } catch (e) {
            console.error('Failed to fetch payment link by key:', e);
          }
        }
      }
    };

    handleUrlPayId();
    window.addEventListener('hashchange', handleUrlPayId);
    return () => window.removeEventListener('hashchange', handleUrlPayId);
  }, [paymentLinks]);

  const loadData = async () => {
    try {
      const targetId = targetLead?.id || lead?.id;
      const [links, subs, sets] = await Promise.all([
        api.fetchPaymentLinks(targetId),
        api.fetchPaymentSubmissions(targetId),
        api.fetchPaymentSettings(),
      ]);

      setPaymentLinks(links || []);
      setSubmissions(subs || []);
      if (sets) setSettings(sets);

      const activeLead = targetLead || lead;
      const pkgPrice = getLeadPackagePrice(activeLead);

      if (targetId) {
        const insts = await api.fetchLeadInstallments(targetId);
        if (insts && insts.length > 0) {
          const sum = insts.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);
          if (sum !== pkgPrice && pkgPrice > 0 && sum > 0) {
             // Automatically adjust installments proportionally to match new package price
             const ratio = pkgPrice / sum;
             let runningTotal = 0;
             const adjustedInsts = insts.map((inst: any, idx: number) => {
               if (idx === insts.length - 1) {
                 return { ...inst, amount: pkgPrice - runningTotal };
               }
               const newAmt = Math.round((inst.amount || 0) * ratio);
               runningTotal += newAmt;
               return { ...inst, amount: newAmt };
             });
             setInstallments(adjustedInsts);

             // CRITICAL: Save adjusted amounts back to DB so payment links show correct amount
             try {
               const saved = await api.saveInstallmentSchedule(targetId, adjustedInsts);
               if (saved && saved.length > 0) {
                 setInstallments(saved);
               }
             } catch (saveErr) {
               console.error('Failed to auto-save adjusted installments:', saveErr);
             }
          } else {
             setInstallments(insts);
          }
          setHasExistingEMI(true);
          setTotalPackagePrice(pkgPrice);
        } else {
          setInstallments([]);
          setHasExistingEMI(false);
          setTotalPackagePrice(pkgPrice);
        }
      } else {
        setInstallments([]);
        setHasExistingEMI(false);
        setTotalPackagePrice(pkgPrice);
      }
    } catch (e) {
      console.error('Failed loading payment desk data:', e);
    }
  };

  const handleCreateInstallmentLink = async (indexToSave?: number) => {
    const targetId = targetLead?.id || lead?.id;
    if (!targetId) {
      alert('Please select a Lead / Trip ID first to create installment links.');
      return;
    }
    setIsSavingInstallments(true);
    try {
      const saved = await api.saveInstallmentSchedule(targetId, installments);
      setInstallments(saved);
      setHasExistingEMI(saved.length > 0);
      const targetInst = (indexToSave !== undefined && saved[indexToSave]) ? saved[indexToSave] : saved[0];
      if (targetInst && targetInst.pay_key) {
        const portalUrl = `${window.location.origin}/#payment?pay_id=${targetInst.pay_key}`;
        navigator.clipboard.writeText(portalUrl);
        alert(`✅ Payment Link Created Successfully!\n\nCopied to Clipboard:\n${portalUrl}`);
      }
      if (onPaymentUpdated) onPaymentUpdated();
    } catch (e) {
      console.error('Error creating installment link:', e);
      alert('Failed to create installment link.');
    } finally {
      setIsSavingInstallments(false);
    }
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.createPaymentLink({
        leadId: targetLead?.id || lead?.id || '',
        packageName,
        amount: Number(baseAmount),
        gst: Number(gstAmount),
        fee: Number(feeAmount),
        discount: Number(discountAmount),
        customerName: custName,
        customerPhone: custPhone || '',
        customerEmail: custEmail || '',
        destination: destination || '',
        travelDate: travelDate || '',
        adults: Number(adultsCount) || 2,
        children: Number(childrenCount) || 0,
        duration: durationText,
        hotels: hotelsText,
        travelers: `${adultsCount} Adults, ${childrenCount} Children`,
      });

      const portalUrl = `${window.location.origin}/#payment?pay_id=${created.pay_key}`;
      setCreatedLinkModalData({
        ...created,
        portalUrl
      });
      loadData();
    } catch (err) {
      console.error('Error creating payment link:', err);
      alert('Failed to generate payment link');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await api.savePaymentSettings(settings);
      setSettings(updated);
      alert('Payment Settings & Razorpay API credentials saved!');
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  const handleSaveInstallments = async () => {
    const targetId = targetLead?.id || lead?.id;
    if (!targetId) {
      alert('Please select a Lead / Trip ID first to attach the installment schedule.');
      return;
    }
    setIsSavingInstallments(true);
    try {
      const saved = await api.saveInstallmentSchedule(targetId, installments);
      setInstallments(saved);
      setHasExistingEMI(saved.length > 0);
      alert('EMI Installment Schedule saved successfully to Lead Database!');
      if (onPaymentUpdated) onPaymentUpdated();
    } catch (e) {
      console.error('Error saving installment schedule:', e);
      alert('Failed to save installment schedule.');
    } finally {
      setIsSavingInstallments(false);
    }
  };

  const handleVerifySubmission = async (subId: string, status: 'Approved' | 'Rejected') => {
    try {
      await api.verifyPaymentSubmission(subId, status);
      alert(`Payment Submission mark as ${status}!`);
      loadData();
      if (onPaymentUpdated) onPaymentUpdated();
    } catch (e) {
      console.error('Error updating verification status:', e);
    }
  };

  const handleConfirmEmiReceived = async (
    targetLeadId: string,
    instId: string | undefined,
    refNo: string,
    payMode: string,
    amt: number,
    payKey?: string
  ) => {
    try {
      const activeLead = targetLead || lead;
      const targetId = targetLeadId || activeLead?.id || activeLead?.tripId || '';

      // 1. Call universal backend confirm endpoint
      await api.confirmPayment({
        payKey: payKey || instId,
        id: instId,
        refNumber: refNo || 'CONFIRMED',
        paymentMode: payMode || 'UPI',
        amount: amt,
      });

      // 2. Explicitly sync installment if needed
      if (instId) {
        await api.updateInstallmentStatus(instId, 'Paid', amt, payMode, refNo).catch(() => {});
      }

      // 3. Sync to Operations customer installment
      if (targetId) {
        await api.updateOpsInstallment(`cust-${targetId}`, instId || payKey || '', {
          status: 'Paid',
          paidAt: new Date().toISOString().split('T')[0],
          paymentMode: payMode || 'UPI',
          transactionRef: refNo || 'CONFIRMED',
          amount: amt
        }).catch(() => {});
      }

      // 4. Reload fresh state from backend
      await loadData();
      if (onPaymentUpdated) onPaymentUpdated();

      alert('✅ Payment Received & EMI Installment Confirmed!');
    } catch (e) {
      console.error('Error confirming EMI payment:', e);
      alert('Failed to confirm EMI payment.');
    }
  };

  const triggerRazorpayCheckout = (amount: number, title: string) => {
    if (typeof (window as any).Razorpay === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => openRazorpayModal(amount, title);
      document.body.appendChild(script);
    } else {
      openRazorpayModal(amount, title);
    }
  };

  const openRazorpayModal = (amount: number, title: string) => {
    const options = {
      key: settings.key_id || 'rzp_test_51HKingslandDemoKey',
      amount: amount * 100, // Amount in paise
      currency: 'INR',
      name: 'Kingsland Holidays Services',
      description: title,
      image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=120&auto=format&fit=crop&q=80',
      handler: function (response: any) {
        alert(`Payment Successful!\nRazorpay Payment ID: ${response.razorpay_payment_id}`);
        handleCustomerSubmitUTRWithRef(response.razorpay_payment_id, 'Razorpay');
      },
      prefill: {
        name: selectedLink ? selectedLink.customer_name : custName,
        contact: selectedLink ? selectedLink.customer_phone : custPhone,
      },
      theme: {
        color: '#7B1D2A',
      },
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  };

  const handleCustomerSubmitUTRWithRef = async (refNum: string, mode: 'Razorpay' | 'UPI' | 'Bank Transfer' | 'Cash') => {
    try {
      const netTotal = selectedLink ? selectedLink.net_amount : (baseAmount + gstAmount + feeAmount - discountAmount);
      const pkg = selectedLink ? selectedLink.package_name : packageName;

      await api.createPaymentSubmission({
        payKey: selectedLink ? selectedLink.pay_key : 'DIRECT',
        leadId: lead?.id || selectedLink?.lead_id || '',
        customerName: custName || lead?.name || 'Customer',
        mobile: custPhone || lead?.phone || '',
        packageName: pkg,
        amountPaid: netTotal,
        utrNumber: refNum,
        paymentMode: mode
      });

      alert('Payment receipt & reference submitted! Verification pending by finance desk.');
      setUtrNumber('');
      setActiveTab('Submissions');
      loadData();
    } catch (err) {
      console.error('Payment submission failed:', err);
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      
      {/* Header Bar in Modal Mode */}
      {!isFullPage && (
        <div className="p-8 bg-slate-900 text-white flex justify-between items-center rounded-3xl shadow-xl">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-lg">
                💳
             </div>
             <div>
                <h2 className="text-2xl font-black tracking-tight uppercase">KINGSLAND PAYMENT DESK</h2>
                <p className="text-xs text-slate-400 font-medium">Razorpay API Gateway & Partial EMI Installments Manager</p>
             </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-colors">
              ✕
            </button>
          )}
        </div>
      )}

      {/* Clean Full Page Header */}
      {isFullPage && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Kingsland Payment Desk</span>
              <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
              <span className="text-[10px] font-black text-emerald-600 uppercase">Razorpay Live Connected</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">
              {activeTab === 'Links' && 'Active Payment Links'}
              {activeTab === 'Installments' && 'EMI & Installment Schedules'}
              {activeTab === 'Confirmation' && 'Payment Confirmation Desk ("Payment Conference")'}
              {activeTab === 'Submissions' && 'Payment Proof Submissions'}
              {activeTab === 'CreateLink' && 'Create Payment Link'}
              {activeTab === 'Settings' && 'Razorpay & Bank Settings'}
              {activeTab === 'Portal' && 'Customer Payment Portal'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {activeTab !== 'CreateLink' && (
              <button 
                onClick={() => setShowCreateChoiceModal(true)} 
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md transition-all flex items-center gap-2"
              >
                + Create New Link
              </button>
            )}
            <button 
              onClick={() => { setSelectedLink(null); setActiveTab('Portal'); }}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md transition-all flex items-center gap-2"
            >
              🚀 Open Payment Portal ↗
            </button>
          </div>
        </div>
      )}

      {/* Payment Desk Sub-Navigation Tabs */}
      {isFullPage && (
        <div className="flex flex-wrap items-center gap-2 bg-slate-100/80 p-2 rounded-2xl border border-slate-200">
          {[
            { id: 'Links', icon: '🔗', label: 'Links' },
            { id: 'Installments', icon: '🗓️', label: 'Installments & EMI' },
            { id: 'Confirmation', icon: '✅', label: 'Confirmation' },
            { id: 'Submissions', icon: '🧾', label: 'Submissions' },
            { id: 'CreateLink', icon: '✨', label: 'Create Link' },
            { id: 'Portal', icon: '📱', label: 'Portal Preview' },
            { id: 'Settings', icon: '⚙️', label: 'Settings' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as PaymentTab)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                activeTab === t.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {t.id === 'Confirmation' && submissions.filter(s => s.verification_status === 'Pending Review').length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-500 text-white font-black animate-pulse">
                  {submissions.filter(s => s.verification_status === 'Pending Review').length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Main Content Area based on Tab */}

      {/* CREATE PAYMENT LINK TYPE SELECTION MODAL */}
      {showCreateChoiceModal && (
        <div className="fixed inset-0 z-[250] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 border border-slate-200 shadow-xl space-y-6">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center text-xl font-black">
                  🔗
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Create Payment Link</h3>
                  <p className="text-xs text-slate-500 font-medium">Select the type of payment link you want to generate</p>
                </div>
              </div>
              <button onClick={() => setShowCreateChoiceModal(false)} className="p-2 text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setShowCreateChoiceModal(false);
                  setActiveTab('CreateLink');
                }}
                className="p-6 rounded-2xl border-2 border-indigo-100 hover:border-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 text-left space-y-3 transition-all group"
              >
                <span className="text-2xl block">📦</span>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-indigo-600">Complete Deposit</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">Generate a full payment link for individual tour package booking.</p>
                </div>
                <span className="inline-block text-[10px] font-black text-indigo-600 uppercase tracking-wider">Create Full Link →</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCreateChoiceModal(false);
                  setActiveTab('Installments');
                }}
                className="p-6 rounded-2xl border-2 border-emerald-100 hover:border-emerald-600 bg-emerald-50/50 hover:bg-emerald-50 text-left space-y-3 transition-all group"
              >
                <span className="text-2xl block">🗓️</span>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-emerald-600">EMI & Installment</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">Create installment milestones schedule for customer trip.</p>
                </div>
                <span className="inline-block text-[10px] font-black text-emerald-600 uppercase tracking-wider">Configure EMI →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATED PAYMENT LINK SUCCESS POPUP */}
      {createdLinkModalData && (
        <div className="fixed inset-0 z-[250] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 border border-slate-200 shadow-xl space-y-6 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center text-3xl font-black">
              ✓
            </div>
            <div>
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">PAYMENT LINK CREATED</span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{createdLinkModalData.package_name}</h3>
              <p className="text-xs text-slate-500 mt-1">Customer: <strong className="text-slate-800">{createdLinkModalData.customer_name}</strong></p>
              <p className="text-xl font-black text-emerald-600 mt-2">₹{(createdLinkModalData.net_amount || 0).toLocaleString('en-IN')}</p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
              <input type="text" readOnly value={createdLinkModalData.portalUrl} className="bg-transparent text-xs font-mono font-bold text-slate-700 flex-1 outline-none truncate" />
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(createdLinkModalData.portalUrl);
                  alert('Link copied to clipboard!');
                }}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold uppercase hover:bg-indigo-700"
              >
                Copy
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => shareOnWhatsApp(createdLinkModalData.package_name, createdLinkModalData.net_amount, createdLinkModalData.portalUrl, createdLinkModalData.customer_phone)}
                className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2"
              >
                💬 WhatsApp
              </button>
              <button
                onClick={() => shareViaEmail(createdLinkModalData.package_name, createdLinkModalData.net_amount, createdLinkModalData.portalUrl, createdLinkModalData.customer_email)}
                className="py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2"
              >
                ✉️ Email
              </button>
            </div>

            <button
              onClick={() => {
                setCreatedLinkModalData(null);
                setActiveTab('Links');
              }}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
            >
              Close & View Active Links
            </button>
          </div>
        </div>
      )}

      <div>
         {/* TAB 1: PAYMENT LINKS LIST */}
         {activeTab === 'Links' && (() => {
           const pendingLinks = paymentLinks.filter(l => l.status !== 'Paid');
           const visibleLinks = showPaidLinks ? paymentLinks : pendingLinks;

           return (
             <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                   <div>
                      <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                        {showPaidLinks ? 'All Payment Links' : 'Active Pending Payment Links'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {pendingLinks.length} pending payment link(s) waiting for client clearance.
                      </p>
                   </div>
                   <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setShowPaidLinks(!showPaidLinks)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          showPaidLinks 
                            ? 'bg-slate-900 text-white' 
                            : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {showPaidLinks ? '✓ Showing Paid Links' : '👁️ Show Paid Links'}
                      </button>
                      {!isFullPage && (
                        <button 
                          onClick={() => setShowCreateChoiceModal(true)} 
                          className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase shadow-md hover:bg-indigo-700"
                        >
                          + New Link
                        </button>
                      )}
                   </div>
                </div>

                <div className="space-y-4">
                   {visibleLinks.length === 0 ? (
                     <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
                        <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full mx-auto flex items-center justify-center text-xl">
                          💳
                        </div>
                        <p className="text-sm font-bold text-slate-500">
                          {showPaidLinks ? 'No payment links created yet.' : 'All payment links are cleared! No pending payment links.'}
                        </p>
                        <button 
                          onClick={() => setShowCreateChoiceModal(true)} 
                          className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase shadow-md hover:bg-indigo-700"
                        >
                          + Create Payment Link
                        </button>
                     </div>
                   ) : (
                     visibleLinks.map((link) => {
                       const portalUrl = `${window.location.origin}/#payment?pay_id=${link.pay_key}`;
                       const matchingLead = allLeads.find(l => l.id === link.lead_id || l.tripId === link.lead_id);
                       const displayTripId = matchingLead?.tripId || link.lead_id || 'N/A';

                       return (
                         <div key={link.id} className="p-6 bg-white rounded-2xl border border-slate-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 hover:shadow-lg transition-all">
                            <div className="space-y-2 flex-1">
                               <div className="flex flex-wrap items-center gap-2">
                                 <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-black uppercase tracking-wider border border-indigo-100">
                                   Trip ID: {displayTripId}
                                 </span>
                                 <span className="text-xs font-mono font-bold text-slate-500">Key: {link.pay_key}</span>
                                 <span className={`px-3 py-0.5 rounded-full text-[9px] font-black uppercase ${link.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                   {link.status}
                                 </span>
                               </div>

                               <h4 className="text-lg font-black text-slate-900 tracking-tight">{link.package_name}</h4>

                               <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 font-medium">
                                 <span>👤 Customer: <strong className="text-slate-800 font-bold">{link.customer_name}</strong></span>
                                 {link.customer_phone && <span>📞 Phone: <strong className="text-slate-800 font-bold">{link.customer_phone}</strong></span>}
                                 {link.customer_email && <span>✉️ Email: <strong className="text-slate-800 font-bold">{link.customer_email}</strong></span>}
                               </div>

                               {(link.destination || link.travel_date || link.duration) && (
                                 <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1 border-t border-slate-100">
                                   {link.destination && <span>📍 Destination: <strong>{link.destination}</strong></span>}
                                   {link.travel_date && <span>📅 Date of Travel: <strong>{link.travel_date}</strong></span>}
                                   {link.duration && <span>⏱️ Duration: <strong>{link.duration}</strong></span>}
                                 </div>
                               )}
                            </div>

                            <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-3 w-full lg:w-auto border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
                               <div className="text-left lg:text-right">
                                  <span className="text-[9px] font-black text-slate-400 uppercase block">Net Amount</span>
                                  <span className="text-2xl font-black text-emerald-600">₹{(link.net_amount || 0).toLocaleString('en-IN')}</span>
                               </div>

                               <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(portalUrl);
                                      alert('Payment link copied to clipboard!\n\n' + portalUrl);
                                    }}
                                    className="px-3.5 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-100 flex items-center gap-1.5"
                                  >
                                    📋 Copy
                                  </button>
                                  <button 
                                    onClick={() => shareOnWhatsApp(link.package_name, link.net_amount, portalUrl, link.customer_phone)}
                                    className="px-3.5 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-xs hover:bg-emerald-100 flex items-center gap-1.5"
                                  >
                                    💬 WhatsApp
                                  </button>
                                  <button 
                                    onClick={() => shareViaEmail(link.package_name, link.net_amount, portalUrl, link.customer_email)}
                                    className="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-200 flex items-center gap-1.5"
                                  >
                                    ✉️ Email
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setSelectedLink(link);
                                      setActiveTab('Portal');
                                    }}
                                    className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 flex items-center gap-1.5"
                                  >
                                    💳 Pay Now
                                  </button>
                                  {link.status === 'Paid' ? (
                                    <span className="px-3.5 py-2 bg-emerald-100 text-emerald-800 rounded-xl font-black text-xs flex items-center gap-1.5 border border-emerald-300">
                                      ✓ Paid Confirmed
                                    </span>
                                  ) : (
                                    <button 
                                      onClick={async () => {
                                        const ref = prompt(`Confirm payment received for ${link.customer_name} (${link.package_name}). Enter Transaction Ref/UTR:`, `PAYLINK-${link.pay_key || 'UPI'}`);
                                        if (ref) {
                                          await handleConfirmEmiReceived(link.lead_id || '', link.id, ref, 'UPI', link.net_amount || 0, link.pay_key);
                                        }
                                      }}
                                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs"
                                    >
                                      ✓ Confirm EMI Received
                                    </button>
                                  )}
                               </div>
                            </div>
                         </div>
                       );
                     })
                   )}
                 </div>
              </div>
            );
          })()}

         {/* TAB 2: EMI & INSTALLMENTS SCHEDULER */}
         {activeTab === 'Installments' && (
           <div className="space-y-6">
              {/* Customer & Trip Search Toolbar */}
              <div className="p-6 bg-slate-900 text-white rounded-3xl space-y-4">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                       <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">SEARCH CUSTOMER & TRIP ID</span>
                       <h4 className="text-base font-bold text-white">Find Existing EMI or Create New Schedule</h4>
                    </div>
                    <div className="w-full md:w-80">
                       <select 
                         value={selectedTripId} 
                         onChange={e => handleSelectTripId(e.target.value)}
                         className="w-full bg-slate-800 text-white border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
                       >
                          <option value="">-- Select Trip ID / Customer --</option>
                          {allLeads.map(l => (
                            <option key={l.id} value={l.tripId}>{l.tripId} — {l.name} ({l.destination})</option>
                          ))}
                       </select>
                    </div>
                 </div>

                 <div className="relative">
                    <input 
                      type="text" 
                      placeholder="🔎 Search by Customer Name or Trip ID..." 
                      value={emiSearchQuery}
                      onChange={(e) => {
                        const query = e.target.value;
                        setEmiSearchQuery(query);
                        if (query.trim()) {
                          const found = allLeads.find(l => 
                            l.name.toLowerCase().includes(query.toLowerCase()) || 
                            l.tripId.toLowerCase().includes(query.toLowerCase())
                          );
                          if (found) handleSelectTripId(found.tripId);
                        }
                      }}
                      className="w-full bg-slate-800/80 text-white border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold placeholder-slate-400 outline-none focus:border-indigo-500"
                    />
                 </div>
              </div>

              {/* Lead Selected Summary / Status Banner */}
              {targetLead ? (
                <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                   <div>
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">SELECTED TRIP</span>
                      <h4 className="text-base font-black text-slate-900">{targetLead.tripId} — {targetLead.name}</h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Destination: <strong>{targetLead.destination || 'N/A'}</strong> | Mobile: <strong>{targetLead.phone || 'N/A'}</strong> | Email: <strong>{targetLead.email || 'N/A'}</strong>
                      </p>
                   </div>
                   <div className="flex items-center gap-2">
                       <span className={`px-3 py-1 text-xs font-bold rounded-lg border ${installments.length > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                         {installments.length > 0 ? `${installments.length} EMI Installments` : 'No EMI Schedule Yet'}
                       </span>
                    </div>
                </div>
              ) : (
                <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs font-bold">
                  ⚠️ Search or select a customer name / trip ID above to view existing EMI or create a new schedule.
                </div>
              )}

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
                 <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Installment Planner Schedule</h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">Configure installment milestones for {targetLead?.name || lead?.name || 'Selected Customer'}.</p>
                 </div>

                 {/* Percentage Badge */}
                 {(() => {
                   const totalAllocated = installments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
                   const isBalanced = totalAllocated === totalPackagePrice;
                   return (
                     <div className="flex items-center gap-3">
                        <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider ${isBalanced ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                           Allocated: ₹{totalAllocated.toLocaleString()} / ₹{totalPackagePrice.toLocaleString()} {isBalanced ? '✓ Balanced' : `(Diff: ₹${Math.abs(totalPackagePrice - totalAllocated)})`}
                        </div>
                        <button 
                          onClick={handleSaveInstallments}
                          disabled={isSavingInstallments}
                          className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 shadow-md transition-all disabled:opacity-50"
                        >
                           {isSavingInstallments ? 'Saving...' : '💾 Save Schedule'}
                        </button>
                     </div>
                   );
                 })()}
              </div>

              {/* Total Package Price Input & Auto-split */}
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4">
                 <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Package Price (INR)</label>
                    <input 
                      type="number" 
                      value={totalPackagePrice} 
                      onChange={e => setTotalPackagePrice(Number(e.target.value))}
                      className="bg-white border border-slate-300 rounded-xl px-4 py-2 text-lg font-black text-slate-800 outline-none w-48"
                    />
                 </div>
                 <div className="flex items-center gap-2">
                    <select
                      value={autoSplitCount}
                      onChange={e => setAutoSplitCount(Number(e.target.value))}
                      className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                    >
                      {[2,3,4,5,6,7,8,9,10].map(n => (
                        <option key={n} value={n}>{n} Installments</option>
                      ))}
                    </select>
                    <button 
                      type="button"
                      onClick={() => {
                        const count = autoSplitCount;
                        const perInst = Math.round(totalPackagePrice / count);
                        const newInstallments = [];
                        for (let i = 0; i < count; i++) {
                          const isLast = i === count - 1;
                          const amount = isLast ? totalPackagePrice - perInst * (count - 1) : perInst;
                          const dueDate = new Date(Date.now() + i * 7 * 86400000).toISOString().split('T')[0];
                          newInstallments.push({
                            title: `${i + 1}. Installment ${i + 1}`,
                            amount,
                            due_date: dueDate,
                            payment_condition: i === 0 ? 'At time of booking confirmation' : `${(i) * 7} days after booking`,
                            payment_status: 'Pending',
                          });
                        }
                        setInstallments(newInstallments);
                      }}
                      className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-100"
                    >
                       ⚡ Auto-Split Equal Installments
                    </button>
                    <button
                      type="button"
                      onClick={() => setInstallments([...installments, { title: 'New Installment', amount: 0, due_date: new Date().toISOString().split('T')[0], payment_condition: '', payment_status: 'Pending' }])}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
                    >
                      + Add Row
                    </button>
                 </div>
              </div>

              {/* Milestone Rows with Copy, WhatsApp, and Email Share Links */}
              <div className="space-y-4">
                 {installments.map((inst, idx) => {
                   const instPayKey = inst.pay_key || `pay_inst_${idx + 1}`;
                   const instPortalUrl = `${window.location.origin}/#payment?pay_id=${instPayKey}`;

                   return (
                     <div key={idx} className="p-6 bg-white rounded-3xl border border-slate-200 space-y-4 hover:border-slate-300 transition-all shadow-xs">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                           <div className="flex-1 space-y-1 w-full">
                              <input 
                                type="text" 
                                value={inst.title}
                                onChange={e => {
                                  const updated = [...installments];
                                  updated[idx].title = e.target.value;
                                  setInstallments(updated);
                                }}
                                className="font-bold text-slate-900 text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none w-full"
                              />
                              <input 
                                type="text" 
                                placeholder="Payment condition (e.g. 7 days before departure)"
                                value={inst.payment_condition}
                                onChange={e => {
                                  const updated = [...installments];
                                  updated[idx].payment_condition = e.target.value;
                                  setInstallments(updated);
                                }}
                                className="text-xs text-slate-500 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none w-full"
                              />
                           </div>

                           <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                              <div>
                                 <span className="text-[9px] font-black text-slate-400 uppercase block">Amount (₹)</span>
                                 <input 
                                   type="number" 
                                   value={inst.amount}
                                   onChange={e => {
                                     const updated = [...installments];
                                     updated[idx].amount = Number(e.target.value);
                                     setInstallments(updated);
                                   }}
                                   className="w-28 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-black text-slate-800 outline-none"
                                 />
                              </div>
                              <div>
                                 <span className="text-[9px] font-black text-slate-400 uppercase block">Due Date</span>
                                 <input 
                                   type="date" 
                                   value={inst.due_date}
                                   onChange={e => {
                                     const updated = [...installments];
                                     updated[idx].due_date = e.target.value;
                                     setInstallments(updated);
                                   }}
                                   className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none"
                                 />
                              </div>
                              <div className="pt-3">
                                 <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${inst.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {inst.payment_status}
                                 </span>
                              </div>
                           </div>
                        </div>

                        {/* EMI Milestone Action Toolbar */}
                        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                           <div className="text-[11px] font-mono text-slate-500 truncate max-w-xs">
                             {inst.pay_key ? <>Pay Key: <strong className="text-slate-800">{inst.pay_key}</strong></> : <span className="text-amber-600 font-bold">⚠️ Unsaved Link — Click 'Create Link' to generate</span>}
                           </div>

                            <div className="flex items-center gap-2">
                              {!inst.pay_key ? (
                                <button
                                  type="button"
                                  onClick={() => handleCreateInstallmentLink(idx)}
                                  disabled={isSavingInstallments}
                                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                                >
                                  ⚡ Create Link
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(instPortalUrl);
                                      alert(`EMI Link copied to clipboard!\n\n${instPortalUrl}`);
                                    }}
                                    className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 flex items-center gap-1"
                                  >
                                    📋 Copy Link
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => shareOnWhatsApp(`${targetLead?.name || 'Customer'} - ${inst.title}`, inst.amount, instPortalUrl, targetLead?.phone || custPhone)}
                                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 flex items-center gap-1"
                                  >
                                    💬 WhatsApp
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => shareViaEmail(`${targetLead?.name || 'Customer'} - ${inst.title}`, inst.amount, instPortalUrl, targetLead?.email || custEmail)}
                                    className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 flex items-center gap-1"
                                  >
                                    ✉️ Email
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      window.location.hash = `payment?pay_id=${inst.pay_key}`;
                                      window.open(`${window.location.origin}/#payment?pay_id=${inst.pay_key}`, '_blank');
                                    }}
                                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 flex items-center gap-1"
                                  >
                                    💳 Pay Now
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const ref = prompt(`Confirm EMI Received for ${targetLead?.name || custName || 'Customer'} (${inst.title}). Enter Transaction Ref / UTR:`, `EMI-REF-${Math.floor(100000 + Math.random() * 900000)}`);
                                      if (ref) {
                                        const updated = [...installments];
                                        updated[idx].payment_status = 'Paid';
                                        setInstallments(updated);
                                        await handleConfirmEmiReceived(targetLead?.id || lead?.id || '', inst.id, ref, 'UPI', inst.amount, inst.pay_key);
                                      }
                                    }}
                                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black uppercase flex items-center gap-1 shadow-sm"
                                  >
                                    ✓ Confirm EMI Received
                                  </button>
                                </>
                              )}
                           </div>
                        </div>
                     </div>
                   );
                 })}
              </div>

               {/* Add Installment Row & Delete Row Buttons */}
               <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const nextNum = installments.length + 1;
                      setInstallments([
                        ...installments,
                        {
                          title: `${nextNum}. Installment ${nextNum}`,
                          amount: 0,
                          due_date: new Date(Date.now() + installments.length * 7 * 86400000).toISOString().split('T')[0],
                          payment_condition: '',
                          payment_status: 'Pending',
                        }
                      ]);
                    }}
                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700 shadow-md flex items-center gap-2"
                  >
                    + Add Installment Row
                  </button>
                  {installments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Remove the last installment row?')) {
                          setInstallments(installments.slice(0, -1));
                        }
                      }}
                      className="px-4 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 border border-rose-200 flex items-center gap-1"
                    >
                      ✖ Remove Last Row
                    </button>
                  )}
               </div>

               {/* Empty State when no installments */}
               {installments.length === 0 && (
                 <div className="p-10 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-3">
                    <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full mx-auto flex items-center justify-center text-2xl">🗓️</div>
                    <h4 className="text-base font-black text-slate-700">No EMI Schedule Created</h4>
                    <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">This lead does not have any installment milestones yet. Use the Auto-Split above or click "+ Add Installment Row" to create a new payment schedule.</p>
                 </div>
               )}
            </div>
          )}

          {/* TAB: PAYMENT CONFIRMATION DESK ("PAYMENT CONFERENCE") */}
          {activeTab === 'Confirmation' && (() => {
            const pendingSubmissions = submissions.filter(s => s.verification_status === 'Pending Review');
            const approvedSubmissions = submissions.filter(s => s.verification_status === 'Approved');

            return (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="p-6 bg-slate-900 text-white rounded-3xl space-y-4 shadow-xl border border-indigo-900/40">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-xs">✅ CONFIRMATION DESK</span>
                        <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">Payment Conference & EMI Reconciliation</span>
                      </div>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tight">Payment Confirmation Desk</h3>
                      <p className="text-xs text-slate-300">Reconcile client payment proofs, confirm EMI installments received from links, and auto-update lead balances.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-3.5 bg-white/10 rounded-2xl text-center min-w-[100px] backdrop-blur-md">
                        <span className="text-[9px] font-black text-amber-300 uppercase block">Pending</span>
                        <span className="text-2xl font-black text-amber-400">{pendingSubmissions.length}</span>
                      </div>
                      <div className="p-3.5 bg-white/10 rounded-2xl text-center min-w-[100px] backdrop-blur-md">
                        <span className="text-[9px] font-black text-emerald-300 uppercase block">Confirmed</span>
                        <span className="text-2xl font-black text-emerald-400">{approvedSubmissions.length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submissions & Payment Link Reconciliations */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Incoming Payment Receipts & Proofs</h4>
                    {submissions.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearSubmissions}
                        className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all flex items-center gap-1.5"
                      >
                        🗑️ Clear All Submissions
                      </button>
                    )}
                  </div>
                  {submissions.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full mx-auto flex items-center justify-center text-xl font-black">✓</div>
                      <p className="text-sm font-bold text-slate-800">All Received Payments Reconciled</p>
                      <p className="text-xs text-slate-500">No unconfirmed payment receipts pending verification.</p>
                    </div>
                  ) : (
                    submissions.map((sub) => (
                      <div key={sub.id} className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4 hover:border-indigo-300 transition-all">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                UTR: {sub.utr_number || 'NO-UTR'}
                              </span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                sub.verification_status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                                sub.verification_status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {sub.verification_status === 'Approved' ? '✓ EMI Confirmed' : sub.verification_status}
                              </span>
                              <span className="text-xs text-slate-400 font-bold">• Mode: {sub.payment_mode || 'UPI'}</span>
                            </div>
                            <h4 className="text-lg font-black text-slate-900">{sub.package_name}</h4>
                            <p className="text-xs text-slate-600">
                              Customer: <strong className="text-slate-800">{sub.customer_name}</strong> ({sub.mobile})
                            </p>
                          </div>

                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                            <div className="text-left lg:text-right">
                              <span className="text-[9px] font-black text-slate-400 uppercase block">Amount Paid</span>
                              <span className="text-2xl font-black text-emerald-600">₹{(sub.amount_paid || 0).toLocaleString('en-IN')}</span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {sub.verification_status !== 'Approved' && (
                                <button
                                  onClick={async () => {
                                    const ref = prompt('Enter Transaction UTR / Ref Number to confirm EMI received:', sub.utr_number || 'UPI-REF');
                                    if (ref !== null) {
                                      await handleVerifySubmission(sub.id, 'Approved');
                                      await handleConfirmEmiReceived(sub.lead_id || targetLead?.id || '', undefined, ref, sub.payment_mode || 'UPI', sub.amount_paid || 0, sub.pay_key);
                                    }
                                  }}
                                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5"
                                >
                                  ✓ Confirm EMI Received
                                </button>
                              )}
                              {sub.verification_status === 'Pending Review' && (
                                <button
                                  onClick={() => handleVerifySubmission(sub.id, 'Rejected')}
                                  className="px-3.5 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs rounded-xl"
                                >
                                  Reject
                                </button>
                              )}
                              {sub.verification_status === 'Approved' && (
                                <span className="px-4 py-2 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 flex items-center gap-1">
                                  ✓ EMI Payment Confirmed & Verified
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })()}

         {/* TAB 3: PAYMENT SUBMISSIONS */}
         {activeTab === 'Submissions' && (
           <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Payment Verification Submissions</h3>
                {submissions.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSubmissions}
                    className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all flex items-center gap-1.5"
                  >
                    🗑️ Clear All Submissions
                  </button>
                )}
              </div>
              <div className="space-y-4">
                 {submissions.length === 0 ? (
                   <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
                     <p className="text-sm font-bold text-slate-400">No payment submissions received yet.</p>
                   </div>
                 ) : (
                   submissions.map((sub) => (
                     <div key={sub.id} className="p-6 bg-white rounded-2xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                           <div className="flex items-center gap-3 mb-1">
                              <span className="text-xs font-bold text-slate-600">UTR: <strong className="font-mono text-indigo-600">{sub.utr_number}</strong></span>
                              <span className={`px-3 py-0.5 rounded-full text-[9px] font-black uppercase ${sub.verification_status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : sub.verification_status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                {sub.verification_status}
                              </span>
                           </div>
                           <h4 className="text-base font-bold text-slate-800">{sub.package_name}</h4>
                           <p className="text-xs text-slate-500 font-medium mt-1">Paid by: <strong>{sub.customer_name}</strong> ({sub.mobile}) via {sub.payment_mode}</p>
                        </div>

                        <div className="flex items-center gap-6">
                           <div className="text-right">
                              <span className="text-[9px] font-black text-slate-400 uppercase block">Amount Paid</span>
                              <span className="text-xl font-black text-emerald-600">₹{(sub.amount_paid || 0).toLocaleString()}</span>
                           </div>
                           {sub.verification_status === 'Pending Review' && (
                             <div className="flex gap-2">
                                <button onClick={() => handleVerifySubmission(sub.id, 'Approved')} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700">Approve</button>
                                <button onClick={() => handleVerifySubmission(sub.id, 'Rejected')} className="px-4 py-2 bg-rose-100 text-rose-700 rounded-xl font-bold text-xs hover:bg-rose-200">Reject</button>
                             </div>
                           )}
                        </div>
                     </div>
                   ))
                 )}
              </div>
           </div>
         )}

         {/* TAB 4: CREATE PAYMENT LINK FORM (Individual Package) */}
         {activeTab === 'CreateLink' && (
           <form onSubmit={handleCreateLink} className="space-y-6 max-w-3xl bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Create Individual Package Payment Link</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Fill in travel details to generate a payment link for complete deposit or custom package amount.</p>
              </div>
              
              <div className="space-y-4">
                 {/* Lead Selector */}
                 <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Link to Lead / Trip ID (Optional)</label>
                    <select 
                      value={selectedTripId} 
                      onChange={e => handleSelectTripId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-500"
                    >
                       <option value="">-- Direct Individual Payment (No Trip Link) --</option>
                       {allLeads.map(l => (
                         <option key={l.id} value={l.tripId}>{l.tripId} — {l.name} ({l.destination})</option>
                       ))}
                    </select>
                 </div>

                 {/* Package Title */}
                 <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Package / Tour Title *</label>
                    <input type="text" required value={packageName} onChange={e => setPackageName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-500" placeholder="e.g. Bali Luxury Beach Villa & Island Tour" />
                 </div>

                 {/* Customer Name & Destination */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Customer Name *</label>
                       <input type="text" required value={custName} onChange={e => setCustName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-500" placeholder="Full name of customer" />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Destination *</label>
                       <input type="text" required value={destination} onChange={e => setDestination(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-500" placeholder="e.g. Bali / Maldives / Kashmir" />
                    </div>
                 </div>

                 {/* Date of Travel & Duration */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Date of Travel *</label>
                       <input type="date" required value={travelDate} onChange={e => setTravelDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Duration *</label>
                       <input type="text" required value={durationText} onChange={e => setDurationText(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-500" placeholder="e.g. 5 Days / 4 Nights" />
                    </div>
                 </div>

                 {/* Adults & Children Pax Counts */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Adults Count *</label>
                       <input type="number" min="1" required value={adultsCount} onChange={e => setAdultsCount(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Children Count *</label>
                       <input type="number" min="0" required value={childrenCount} onChange={e => setChildrenCount(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-500" />
                    </div>
                 </div>

                 {/* Optional Contact Fields: Mobile & Gmail */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div>
                       <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                         Customer Mobile <span className="text-[10px] text-slate-400 font-normal lowercase">(optional)</span>
                       </label>
                       <input type="text" value={custPhone} onChange={e => setCustPhone(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-indigo-500" placeholder="+91 98765 43210" />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                         Customer Gmail / Email <span className="text-[10px] text-slate-400 font-normal lowercase">(optional)</span>
                       </label>
                       <input type="email" value={custEmail} onChange={e => setCustEmail(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-indigo-500" placeholder="customer@gmail.com" />
                    </div>
                 </div>

                 {/* Base Price & Tax breakdown */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Package Price / Base Amount (₹) *</label>
                       <input type="number" required value={baseAmount} onChange={e => setBaseAmount(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">GST Tax Amount (₹)</label>
                       <input type="number" value={gstAmount} onChange={e => setGstAmount(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-500" />
                    </div>
                 </div>

                 <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-indigo-900">Total Net Amount Payable:</span>
                    <span className="text-2xl font-black text-indigo-600">₹{(baseAmount + gstAmount + feeAmount - discountAmount).toLocaleString('en-IN')}</span>
                 </div>
              </div>

              <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition-all">
                🚀 Generate Link & Open Share Options
              </button>
           </form>
         )}

         {/* TAB 5: GATEWAY & BANK SETTINGS */}
         {activeTab === 'Settings' && (
           <form onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Razorpay API Keys & Bank Credentials</h3>
              
              <div className="space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Razorpay Key ID</label>
                    <input type="text" value={settings.key_id} onChange={e => setSettings({...settings, key_id: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono font-bold outline-none" />
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Razorpay Key Secret</label>
                    <input type="password" value={settings.key_secret} onChange={e => setSettings({...settings, key_secret: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono font-bold outline-none" placeholder="••••••••••••••••" />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">UPI ID</label>
                       <input type="text" value={settings.upi_id} onChange={e => setSettings({...settings, upi_id: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none" />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">UPI Payee Name</label>
                       <input type="text" value={settings.upi_payee} onChange={e => setSettings({...settings, upi_payee: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none" />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Bank Name</label>
                       <input type="text" value={settings.bank_name} onChange={e => setSettings({...settings, bank_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none" />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Account Number</label>
                       <input type="text" value={settings.bank_acc_num} onChange={e => setSettings({...settings, bank_acc_num: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono font-bold outline-none" />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">IFSC Code</label>
                       <input type="text" value={settings.bank_ifsc} onChange={e => setSettings({...settings, bank_ifsc: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono font-bold outline-none" />
                    </div>
                    <div>
                       <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Branch Name</label>
                       <input type="text" value={settings.bank_branch} onChange={e => setSettings({...settings, bank_branch: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none" />
                    </div>
                 </div>

                 <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200">
                    <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">Credit Card Surcharge / Processing Fee (%)</label>
                    <p className="text-[11px] text-amber-700 mb-2">Customers selecting Card payment will be notified and charged this percentage as card processing fee.</p>
                    <input type="number" step="0.1" value={settings.card_fee_percentage !== undefined ? settings.card_fee_percentage : 2.5} onChange={e => setSettings({...settings, card_fee_percentage: parseFloat(e.target.value) || 0})} className="w-full bg-white border border-amber-300 rounded-xl px-4 py-2.5 text-xs font-extrabold outline-none text-amber-950" />
                 </div>
              </div>

              <button type="submit" className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-slate-800">
                💾 Save Gateway Settings
              </button>
           </form>
         )}

         {/* TAB 6: CUSTOMER PAYMENT PORTAL */}
         {activeTab === 'Portal' && (() => {
           // For portal view, base off selectedLink or fallbacks
           const portalName = selectedLink?.customer_name || custName;
           const portalPhone = selectedLink?.customer_phone || custPhone;
           const portalPackage = selectedLink?.package_name || packageName;
           const portalAmount = selectedLink?.amount ?? baseAmount;
           const portalGst = selectedLink?.gst ?? gstAmount;
           const portalFee = selectedLink?.fee ?? feeAmount;
           const portalDiscount = selectedLink?.discount ?? discountAmount;

           const standardTotal = selectedLink ? (selectedLink.net_amount || portalAmount) : Math.max(0, portalAmount + portalGst + portalFee - portalDiscount);
           const cardFeeRate = settings.card_fee_percentage !== undefined ? Number(settings.card_fee_percentage) : 2.5;
           const cardSurcharge = portalTab === 'CARD' ? Math.round((standardTotal * cardFeeRate) / 100) : 0;
           const finalPayableTotal = standardTotal + cardSurcharge;

           return (
             <div className="space-y-6 text-slate-800 font-sans animate-in fade-in duration-300">

               {/* Standalone Customer Header */}
               {!isFullPage && (
                 <div className="mb-8 pb-6 border-b-2 border-[#E8E1D5]">
                    <h2 className="text-3xl font-black text-[#7B1D2A] font-serif mb-2 tracking-tight">Complete Your Booking</h2>
                    <p className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-widest">
                      Safe & Secure Payment Gateway — Kingsland Holidays
                    </p>
                    <p className="text-lg font-black text-slate-800 bg-white inline-block px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                      Mr./Ms. {portalName || 'Valued Guest'} 
                      <span className="text-slate-500 font-semibold ml-2">
                        ({selectedLink?.lead_id || targetLead?.id || 'Booking'} / {portalPackage || 'Tour Package'})
                      </span>
                    </p>
                 </div>
               )}

               {/* Card Processing Fee Popup Notification Modal */}
               {showCardFeePopup && (
                 <div className="fixed inset-0 z-[200] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                   <div className="bg-white rounded-3xl max-w-md w-full p-8 text-center border-2 border-[#E0C990] shadow-xl space-y-6 animate-in zoom-in-95 duration-200">
                     <div className="w-16 h-16 bg-rose-50 text-[#7B1D2A] rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-inner border border-rose-100">
                       💳
                     </div>
                     <div>
                       <h3 className="text-2xl font-black text-[#7B1D2A] font-serif tracking-tight">Credit Card Processing Fee</h3>
                       <p className="text-sm font-medium text-slate-600 mt-3 leading-relaxed">
                         If you use credit card you will be charged <span className="font-extrabold text-[#7B1D2A]">{cardFeeRate}%</span> for payment via credit card.
                       </p>
                     </div>
                     <button
                       type="button"
                       onClick={() => setShowCardFeePopup(false)}
                       className="w-full py-4 bg-[#C9922A] hover:bg-[#A67C1E] text-white font-extrabold text-sm rounded-2xl uppercase tracking-wider shadow-lg transition-all"
                     >
                       I Understand
                     </button>
                   </div>
                 </div>
               )}

               {/* 2-Column Main Portal Layout matching screenshots */}
               <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                 
                 {/* LEFT COLUMN: Payment Methods & Tabs (7 cols) */}
                 <div className="lg:col-span-7 bg-[#FAF7F2] border border-[#E8E1D5] rounded-3xl shadow-md overflow-hidden">
                   
                   {/* Top Tabs Bar */}
                   <div className="grid grid-cols-4 bg-[#F2EBDC] border-b border-[#E3DAC8]">
                     {[
                       { id: 'UPI', label: 'UPI', icon: '📱' },
                       { id: 'QR CODE', label: 'QR CODE', icon: '⬛' },
                       { id: 'BANK', label: 'BANK', icon: '🏛️' },
                       { id: 'CARD', label: 'CARD', icon: '💳' },
                     ].map((tab) => {
                       const isActive = portalTab === tab.id;
                       return (
                         <button
                           key={tab.id}
                           type="button"
                           onClick={() => {
                             setPortalTab(tab.id as any);
                             if (tab.id === 'CARD') setShowCardFeePopup(true);
                           }}
                           className={`py-4 px-2 flex flex-col items-center justify-center gap-1 transition-all text-xs uppercase font-extrabold tracking-wider ${
                             isActive
                               ? 'bg-white text-[#7B1D2A] border-b-4 border-[#C9922A] shadow-sm'
                               : 'text-[#8C7E6C] hover:text-[#524636] hover:bg-[#EAE1CF]'
                           }`}
                         >
                           <span className="text-base">{tab.icon}</span>
                           <span>{tab.label}</span>
                         </button>
                       );
                     })}
                   </div>

                   {/* Tab Inner Contents */}
                   <div className="p-6 md:p-8 bg-white space-y-6">

                     {/* TAB 1: UPI PAYMENT */}
                     {portalTab === 'UPI' && (
                       <div className="space-y-6 animate-in fade-in duration-200">
                         <div>
                           <h3 className="text-2xl font-black text-[#7B1D2A] font-serif">UPI Payment</h3>
                           <p className="text-xs text-slate-500 font-medium">Pay instantly using any UPI app on your phone.</p>
                         </div>

                         <div className="grid grid-cols-2 gap-4">
                           {[
                             { id: 'PhonePe', color: 'bg-purple-600', icon: '💜' },
                             { id: 'GPay', color: 'bg-blue-500', icon: '🔵' },
                             { id: 'Paytm', color: 'bg-sky-500', icon: '🟠' },
                             { id: 'BHIM UPI', color: 'bg-indigo-600', icon: '💜' },
                           ].map((app) => {
                             const isSelected = selectedUpiApp === app.id;
                             return (
                               <button
                                 key={app.id}
                                 type="button"
                                 onClick={() => setSelectedUpiApp(app.id as any)}
                                 className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all ${
                                   isSelected
                                     ? 'border-[#C9922A] bg-[#FFFDF9] shadow-sm ring-2 ring-[#C9922A]/20'
                                     : 'border-[#EAE3D2] bg-white hover:border-[#C9922A]/50'
                                 }`}
                               >
                                 <span className={`w-8 h-8 rounded-full ${app.color} text-white flex items-center justify-center text-xs font-bold`}>{app.icon}</span>
                                 <span className="font-extrabold text-sm text-[#5C2B30]">{app.id}</span>
                               </button>
                             );
                           })}
                         </div>

                         <div className="space-y-4 pt-2">
                           <div>
                             <label className="block text-[11px] font-black text-[#8C7E6C] uppercase tracking-wider mb-1">ENTER UPI ID</label>
                             <input
                               type="text"
                               placeholder="yourname@upi"
                               value={customerUpiId}
                               onChange={(e) => setCustomerUpiId(e.target.value)}
                               className="w-full bg-[#FAF7F2] border border-[#E3DAC8] rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#C9922A]"
                             />
                           </div>

                           <div>
                             <label className="block text-[11px] font-black text-[#8C7E6C] uppercase tracking-wider mb-1">UPI REGISTERED MOBILE NUMBER</label>
                             <input
                               type="text"
                               value={customerUpiPhone}
                               onChange={(e) => setCustomerUpiPhone(e.target.value)}
                               className="w-full bg-[#FAF7F2] border border-[#E3DAC8] rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#C9922A]"
                             />
                           </div>
                         </div>

                         <button
                           type="button"
                           onClick={() => {
                             if (!utrNumber.trim()) {
                               triggerRazorpayCheckout(finalPayableTotal, selectedLink?.package_name || packageName);
                             } else {
                               handleCustomerSubmitUTRWithRef(utrNumber.trim(), 'UPI');
                             }
                           }}
                           className="w-full py-4 bg-[#A67C1E] hover:bg-[#8A6617] text-white font-black text-sm rounded-xl uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all"
                         >
                           🚀 CONFIRM & SUBMIT DETAILS
                         </button>
                       </div>
                     )}

                     {/* TAB 2: QR CODE */}
                     {portalTab === 'QR CODE' && (
                       <div className="space-y-6 animate-in fade-in duration-200">
                         <div>
                           <h3 className="text-2xl font-black text-[#7B1D2A] font-serif">Scan & Pay via QR</h3>
                           <p className="text-xs text-slate-500 font-medium">Open any UPI app, scan the QR code below and complete payment.</p>
                         </div>

                         <div className="p-6 bg-[#FAF7F2] border-2 border-dashed border-[#E0C990] rounded-2xl text-center space-y-4">
                           <div className="w-52 h-52 mx-auto bg-white p-3 rounded-xl shadow-md border border-[#E3DAC8] flex flex-col items-center justify-center">
                             <img
                               src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=${settings.upi_id}&pn=${encodeURIComponent(settings.upi_payee)}&am=${finalPayableTotal}&cu=INR`)}`}
                               alt="UPI QR Code"
                               className="w-44 h-44 object-contain"
                             />
                           </div>
                           <div>
                             <p className="font-extrabold text-sm text-[#7B1D2A]">{settings.upi_payee}</p>
                             <p className="text-xs font-bold text-slate-500">Scan to pay <strong className="text-emerald-700 font-black">₹{finalPayableTotal.toLocaleString()}</strong></p>
                           </div>

                           <div className="flex items-center gap-2 max-w-sm mx-auto bg-white border border-[#E3DAC8] rounded-xl p-1.5">
                             <span className="text-xs font-mono font-bold text-slate-700 truncate px-2 flex-1">{settings.upi_id}</span>
                             <button
                               type="button"
                               onClick={() => {
                                 navigator.clipboard.writeText(settings.upi_id);
                                 alert('UPI ID copied to clipboard!');
                               }}
                               className="px-4 py-1.5 bg-[#F4ECDC] text-[#7B1D2A] text-[10px] font-black uppercase rounded-lg hover:bg-[#EBDDC3]"
                             >
                               COPY
                             </button>
                           </div>
                         </div>

                         <div className="space-y-2">
                           <label className="block text-[11px] font-black text-[#8C7E6C] uppercase tracking-wider">TRANSACTION / UTR REFERENCE NUMBER AFTER PAYMENT</label>
                           <input
                             type="text"
                             placeholder="12-digit transaction reference"
                             value={utrNumber}
                             onChange={(e) => setUtrNumber(e.target.value)}
                             className="w-full bg-[#FAF7F2] border border-[#E3DAC8] rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#C9922A]"
                           />
                         </div>

                         <button
                           type="button"
                           onClick={() => {
                             if (!utrNumber.trim()) {
                               alert('Please enter your UTR / Transaction Reference Number.');
                               return;
                             }
                             handleCustomerSubmitUTRWithRef(utrNumber.trim(), 'UPI');
                           }}
                           className="w-full py-4 bg-[#A67C1E] hover:bg-[#8A6617] text-white font-black text-sm rounded-xl uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all"
                         >
                           ✓ CONFIRM PAYMENT
                         </button>
                       </div>
                     )}

                     {/* TAB 3: BANK TRANSFER */}
                     {portalTab === 'BANK' && (
                       <div className="space-y-6 animate-in fade-in duration-200">
                         <div>
                           <h3 className="text-2xl font-black text-[#7B1D2A] font-serif">Bank Transfer / NEFT / RTGS</h3>
                           <p className="text-xs text-slate-500 font-medium">Transfer directly to our bank account and share the reference number.</p>
                         </div>

                         <div className="bg-white border border-[#E3DAC8] rounded-2xl overflow-hidden divide-y divide-[#E3DAC8] text-xs font-bold">
                           <div className="flex items-center justify-between p-3.5">
                             <span className="text-[#8C7E6C] font-black uppercase text-[10px]">ACCOUNT NAME</span>
                             <div className="flex items-center gap-3">
                               <span className="text-slate-800 font-extrabold">{settings.bank_acc_name}</span>
                               <button type="button" onClick={() => { navigator.clipboard.writeText(settings.bank_acc_name); alert('Account Name copied!'); }} className="px-3 py-1 bg-[#F4ECDC] text-[#7B1D2A] text-[9px] font-black uppercase rounded-md hover:bg-[#EBDDC3]">COPY</button>
                             </div>
                           </div>

                           <div className="flex items-center justify-between p-3.5">
                             <span className="text-[#8C7E6C] font-black uppercase text-[10px]">ACCOUNT NUMBER</span>
                             <div className="flex items-center gap-3">
                               <span className="text-slate-900 font-mono font-black">{settings.bank_acc_num}</span>
                               <button type="button" onClick={() => { navigator.clipboard.writeText(settings.bank_acc_num); alert('Account Number copied!'); }} className="px-3 py-1 bg-[#F4ECDC] text-[#7B1D2A] text-[9px] font-black uppercase rounded-md hover:bg-[#EBDDC3]">COPY</button>
                             </div>
                           </div>

                           <div className="flex items-center justify-between p-3.5">
                             <span className="text-[#8C7E6C] font-black uppercase text-[10px]">IFSC CODE</span>
                             <div className="flex items-center gap-3">
                               <span className="text-slate-900 font-mono font-black">{settings.bank_ifsc}</span>
                               <button type="button" onClick={() => { navigator.clipboard.writeText(settings.bank_ifsc); alert('IFSC Code copied!'); }} className="px-3 py-1 bg-[#F4ECDC] text-[#7B1D2A] text-[9px] font-black uppercase rounded-md hover:bg-[#EBDDC3]">COPY</button>
                             </div>
                           </div>

                           <div className="flex items-center justify-between p-3.5">
                             <span className="text-[#8C7E6C] font-black uppercase text-[10px]">BANK NAME</span>
                             <span className="text-slate-800 font-extrabold">{settings.bank_name}</span>
                           </div>

                           <div className="flex items-center justify-between p-3.5">
                             <span className="text-[#8C7E6C] font-black uppercase text-[10px]">BRANCH</span>
                             <span className="text-slate-800 font-extrabold">{settings.bank_branch}</span>
                           </div>

                           <div className="flex items-center justify-between p-3.5">
                             <span className="text-[#8C7E6C] font-black uppercase text-[10px]">ACCOUNT TYPE</span>
                             <span className="px-3 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded-md">CURRENT</span>
                           </div>
                         </div>

                         <div className="space-y-2">
                           <label className="block text-[11px] font-black text-[#8C7E6C] uppercase tracking-wider">TRANSACTION / UTR REFERENCE NUMBER AFTER PAYMENT</label>
                           <input
                             type="text"
                             placeholder="12-digit NEFT / RTGS reference number"
                             value={utrNumber}
                             onChange={(e) => setUtrNumber(e.target.value)}
                             className="w-full bg-[#FAF7F2] border border-[#E3DAC8] rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#C9922A]"
                           />
                         </div>

                         <button
                           type="button"
                           onClick={() => {
                             if (!utrNumber.trim()) {
                               alert('Please enter your UTR / Transaction Reference Number.');
                               return;
                             }
                             handleCustomerSubmitUTRWithRef(utrNumber.trim(), 'Bank Transfer');
                           }}
                           className="w-full py-4 bg-[#A67C1E] hover:bg-[#8A6617] text-white font-black text-sm rounded-xl uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all"
                         >
                           📥 SUBMIT TRANSFER DETAILS
                         </button>
                       </div>
                     )}

                     {/* TAB 4: CARD PAYMENT */}
                     {portalTab === 'CARD' && (
                       <div className="space-y-6 animate-in fade-in duration-200">
                         <div>
                           <h3 className="text-2xl font-black text-[#7B1D2A] font-serif">Credit / Debit Card</h3>
                           <p className="text-xs text-slate-500 font-medium">Pay securely with Visa, Mastercard, or RuPay card.</p>
                         </div>

                         <div className="p-6 bg-gradient-to-br from-[#7B1D2A] to-[#4A101A] rounded-2xl text-white shadow-xl relative overflow-hidden space-y-6 border border-[#C9922A]/30">
                           <div className="flex justify-between items-center">
                             <div className="w-12 h-9 bg-gradient-to-r from-amber-300 to-amber-500 rounded-md shadow-md border border-amber-200"></div>
                             <span className="text-xs font-extrabold uppercase tracking-widest text-[#E8B84B]">CARD PAYMENT</span>
                           </div>

                           <div className="text-lg font-mono tracking-widest text-slate-200">
                             •••• •••• •••• ••••
                           </div>

                           <div className="flex justify-between items-end text-xs uppercase font-mono">
                             <div>
                               <span className="text-[8px] text-amber-200/70 block">CARD HOLDER</span>
                               <span className="font-extrabold text-white">{billingName || 'YOUR NAME'}</span>
                             </div>
                             <div>
                               <span className="text-[8px] text-amber-200/70 block">EXPIRES</span>
                               <span className="font-extrabold text-white">MM/YY</span>
                             </div>
                           </div>
                         </div>

                         <div className="space-y-4">
                           <div>
                             <label className="block text-[11px] font-black text-[#8C7E6C] uppercase tracking-wider mb-1">BILLING NAME *</label>
                             <input
                               type="text"
                               required
                               value={billingName}
                               onChange={(e) => setBillingName(e.target.value)}
                               className="w-full bg-[#FAF7F2] border border-[#E3DAC8] rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#C9922A]"
                             />
                           </div>

                           <div>
                             <label className="block text-[11px] font-black text-[#8C7E6C] uppercase tracking-wider mb-1">BILLING MOBILE *</label>
                             <input
                               type="text"
                               required
                               value={billingMobile}
                               onChange={(e) => setBillingMobile(e.target.value)}
                               className="w-full bg-[#FAF7F2] border border-[#E3DAC8] rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#C9922A]"
                             />
                           </div>

                           <div>
                             <label className="block text-[11px] font-black text-[#8C7E6C] uppercase tracking-wider mb-1">BILLING EMAIL *</label>
                             <input
                               type="email"
                               required
                               value={billingEmail}
                               onChange={(e) => setBillingEmail(e.target.value)}
                               className="w-full bg-[#FAF7F2] border border-[#E3DAC8] rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-[#C9922A]"
                             />
                           </div>
                         </div>

                         <button
                           type="button"
                           onClick={() => {
                             const title = selectedLink ? selectedLink.package_name : packageName;
                             triggerRazorpayCheckout(finalPayableTotal, title);
                           }}
                           className="w-full py-4 bg-[#A67C1E] hover:bg-[#8A6617] text-white font-black text-sm rounded-xl uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all"
                         >
                           🔒 PAY ₹{finalPayableTotal.toLocaleString()} SECURELY
                         </button>
                       </div>
                     )}

                   </div>
                 </div>

                 {/* RIGHT COLUMN: Booking Summary & Features (5 cols) */}
                 <div className="lg:col-span-5 space-y-6">

                   {/* Card 1: Booking Summary */}
                   <div className="bg-white border border-[#E8E1D5] rounded-3xl shadow-md overflow-hidden">
                     <div className="bg-[#7B1D2A] text-white p-5 font-serif flex items-center gap-3">
                       <span className="text-xl">🗺️</span>
                       <h3 className="text-lg font-black tracking-wide">Booking Summary</h3>
                     </div>

                     <div className="p-6 space-y-4 text-xs font-bold text-slate-700">
                       <div className="pb-3 border-b border-[#EAE3D2]">
                         <span className="font-extrabold text-sm text-[#7B1D2A] leading-tight block">
                           {selectedLink ? selectedLink.package_name : (packageName || 'Tour Package Confirmation')}
                         </span>
                       </div>

                       <div className="space-y-2.5 pt-1">
                         <div className="flex justify-between items-center text-slate-600">
                           <span>Amount</span>
                           <span className="font-mono text-slate-900">₹{portalAmount.toLocaleString()}.00</span>
                         </div>

                         <div className="flex justify-between items-center text-slate-600">
                           <span>GST</span>
                           <span className="font-mono text-slate-900">₹{portalGst.toLocaleString()}.00</span>
                         </div>

                         <div className="flex justify-between items-center text-slate-600">
                           <span>Processing Fee</span>
                           <span className="font-mono text-slate-900">₹{portalFee.toLocaleString()}.00</span>
                         </div>

                         {portalDiscount > 0 && (
                           <div className="flex justify-between items-center text-emerald-600">
                             <span>Discount</span>
                             <span className="font-mono text-emerald-700">-₹{portalDiscount.toLocaleString()}.00</span>
                           </div>
                         )}

                         {portalTab === 'CARD' && (
                           <div className="flex justify-between items-center text-[#7B1D2A] bg-rose-50/70 p-2.5 rounded-xl border border-rose-200">
                             <span>Card Surcharge ({cardFeeRate}%)</span>
                             <span className="font-mono font-black text-[#7B1D2A]">₹{cardSurcharge.toLocaleString()}.00</span>
                           </div>
                         )}


                       </div>

                       <div className="pt-4 border-t-2 border-[#EAE3D2] flex justify-between items-center">
                         <span className="text-base font-black text-[#7B1D2A]">Total Payable</span>
                         <span className="text-2xl font-black text-[#7B1D2A] font-mono">
                           ₹{finalPayableTotal.toLocaleString()}.00
                         </span>
                       </div>
                     </div>
                   </div>

                   {/* Card 2: WHY PAY WITH US */}
                   <div className="bg-[#FFFDF9] border border-[#E8E1D5] rounded-3xl p-6 space-y-4 text-xs">
                     <h4 className="font-black text-[#8C7E6C] uppercase tracking-wider text-[10px]">WHY PAY WITH US</h4>

                     <div className="space-y-3 font-medium text-slate-600">
                       <div className="flex items-start gap-3">
                         <span className="text-base">🔒</span>
                         <p>256-bit SSL encrypted transactions — your data is fully protected.</p>
                       </div>

                       <div className="flex items-start gap-3">
                         <span className="text-base text-emerald-600">✅</span>
                         <p>Instant booking confirmation via email & SMS.</p>
                       </div>

                       <div className="flex items-start gap-3">
                         <span className="text-base text-indigo-600">🔄</span>
                         <p>Easy cancellation & refund within 48 hours.</p>
                       </div>
                     </div>
                   </div>

                   {/* Card 3: ACCEPTED PAYMENTS */}
                   <div className="bg-[#FFFDF9] border border-[#E8E1D5] rounded-3xl p-6 text-center space-y-3">
                     <h4 className="font-black text-[#8C7E6C] uppercase tracking-wider text-[10px]">ACCEPTED PAYMENTS</h4>
                     <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                       {['VISA', 'MC', 'RuPay', 'UPI', 'NETBANKING'].map((b) => (
                         <span key={b} className="px-3 py-1 bg-white border border-[#E3DAC8] text-[#7B1D2A] font-black text-[10px] rounded-lg shadow-2xs uppercase">
                           {b}
                         </span>
                       ))}
                     </div>
                   </div>

                 </div>

               </div>
             </div>
           );
         })()}
      </div>
    </div>
  );
};

export default PaymentManagerModal;
