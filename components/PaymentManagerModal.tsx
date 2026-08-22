import React, { useState, useEffect } from 'react';
import { Lead } from '../types';
import * as api from '../services/apiService';
import PaymentPageView from './PaymentPageView';
import { 
  CreditCard, 
  Link2, 
  Calendar, 
  CheckCircle2, 
  FileText, 
  Plus, 
  Smartphone, 
  Settings, 
  ExternalLink, 
  Copy, 
  Check, 
  MessageSquare, 
  Mail, 
  RefreshCw, 
  X, 
  AlertTriangle, 
  IndianRupee, 
  ShieldCheck, 
  ChevronRight,
  Search,
  Trash2,
  Eye,
  SlidersHorizontal,
  Share2
} from 'lucide-react';

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
  comments?: string;
  notes?: string;
  paid_at?: string;
  payment_mode?: string;
  transaction_ref?: string;
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

  // Payment Confirmation Modal State
  const [confirmPaymentModal, setConfirmPaymentModal] = useState<{
    open: boolean;
    link: any;
  }>({ open: false, link: null });
  const [confirmRef, setConfirmRef] = useState('');
  const [confirmMode, setConfirmMode] = useState('UPI');
  const [confirmComment, setConfirmComment] = useState('');
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);

  // Installment Comment Modal State
  const [installmentCommentModal, setInstallmentCommentModal] = useState<{
    open: boolean;
    instIdx: number;
    comment: string;
    isSaving?: boolean;
  }>({ open: false, instIdx: -1, comment: '' });

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

  const [localToast, setLocalToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmClearActive, setConfirmClearActive] = useState(false);

  const showLocalToast = (message: string, type: 'success' | 'error' = 'success') => {
    setLocalToast({ message, type });
    setTimeout(() => setLocalToast(null), 3000);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearSubmissions = async () => {
    if (!confirmClearActive) {
      setConfirmClearActive(true);
      setTimeout(() => setConfirmClearActive(false), 4000);
      return;
    }
    try {
      await api.clearAllPaymentSubmissions();
      setSubmissions([]);
      setConfirmClearActive(false);
      showLocalToast('All payment submissions cleared successfully!');
    } catch (e) {
      console.error(e);
      showLocalToast('Failed to clear submissions', 'error');
    }
  };

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

  useEffect(() => {
    loadData();
  }, [lead, targetLead?.id]);

  useEffect(() => {
    const activeLead = targetLead || lead;
    if (activeLead) {
      setPackageName(activeLead.destination ? `${activeLead.destination} Tour Package` : 'Tour Package Confirmation');
      setDestination(activeLead.destination || 'Bali / Maldives / Kashmir');
      setTravelDate(activeLead.travelDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
      setBaseAmount(getLeadPackagePrice(activeLead));
      setCustName(activeLead.name || '');
      setCustPhone(activeLead.phone || '');
      setCustEmail(activeLead.email || '');
      setAdultsCount(activeLead.travelers?.adults || 2);
      setChildrenCount(activeLead.travelers?.children || 0);
      setDurationText(activeLead.durationDays ? `${activeLead.durationDays} Days / ${activeLead.durationDays - 1} Nights` : '6 Days / 5 Nights');
      setTravelersText(activeLead.travelers ? `${activeLead.travelers.adults || 2} Adults, ${activeLead.travelers.children || 0} Children` : '2 Adults, 0 Children');
    }
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
          if (sum === 0 && pkgPrice > 0) {
            // All existing installments are 0, recalculate based on split count
            const count = insts.length || 3;
            const inst1 = Math.round(pkgPrice * 0.3);
            const inst2 = Math.round(pkgPrice * 0.4);
            const inst3 = pkgPrice - inst1 - inst2;
            const defaultAmounts = count === 2 ? [Math.round(pkgPrice * 0.5), pkgPrice - Math.round(pkgPrice * 0.5)] : [inst1, inst2, inst3];
            const adjustedInsts = insts.map((inst: any, idx: number) => ({
              ...inst,
              amount: defaultAmounts[idx] !== undefined ? defaultAmounts[idx] : Math.round(pkgPrice / count)
            }));
            setInstallments(adjustedInsts);
            try {
              const saved = await api.saveInstallmentSchedule(targetId, adjustedInsts);
              if (saved && saved.length > 0) setInstallments(saved);
            } catch (saveErr) {
              console.error('Failed to auto-save adjusted zero installments:', saveErr);
            }
          } else if (sum !== pkgPrice && pkgPrice > 0 && sum > 0) {
             const linkedSum = insts.filter((i: any) => !!i.pay_key).reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);
             const remainingPrice = Math.max(0, pkgPrice - linkedSum);
             const unlinkedInsts = insts.filter((i: any) => !i.pay_key);
             const unlinkedOriginalSum = unlinkedInsts.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);

             if (unlinkedInsts.length > 0 && unlinkedOriginalSum > 0) {
               const ratio = remainingPrice / unlinkedOriginalSum;
               let runningUnlinkedTotal = 0;
               let unlinkedProcessedCount = 0;
               
               const adjustedInsts = insts.map((inst: any) => {
                 if (inst.pay_key) {
                   return inst;
                 }
                 unlinkedProcessedCount++;
                 if (unlinkedProcessedCount === unlinkedInsts.length) {
                   return { ...inst, amount: remainingPrice - runningUnlinkedTotal };
                 }
                 const newAmt = Math.round((inst.amount || 0) * ratio);
                 runningUnlinkedTotal += newAmt;
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
      const updatedInstallments = [...installments];
      if (indexToSave !== undefined && !updatedInstallments[indexToSave].pay_key) {
        updatedInstallments[indexToSave].pay_key = `pay_inst_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
      }
      const saved = await api.saveInstallmentSchedule(targetId, updatedInstallments);
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
    payKey?: string,
    comments?: string
  ) => {
    try {
      const activeLead = targetLead || lead;
      const targetId = targetLeadId || activeLead?.id || activeLead?.tripId || '';

      // 1. Call universal backend confirm endpoint (handles installment, link, ops installment & submissions in a single transaction)
      await api.confirmPayment({
        payKey: payKey || instId,
        id: instId,
        refNumber: refNo || 'CONFIRMED',
        paymentMode: payMode || 'UPI',
        amount: amt,
        comments: comments || '',
        notes: comments || ''
      });

      // 2. Reload fresh state from backend
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
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center rounded-xl shadow-lg border border-slate-800">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-xs">
                <CreditCard size={20} />
             </div>
             <div>
                <h2 className="text-base font-semibold text-white">Payment & Collections Desk</h2>
                <p className="text-xs text-slate-400 font-medium">Razorpay Gateway, UPI Transfers & Partial EMI Schedules</p>
             </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer">
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* Clean Full Page Header */}
      {isFullPage && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              <h2 className="text-xl font-semibold text-slate-800">
                Payment & Collections Desk
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage payment links, partial EMI schedules, customer submissions, and gateway settings.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab !== 'CreateLink' && (
              <button 
                onClick={() => setShowCreateChoiceModal(true)} 
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>Create Payment Link</span>
              </button>
            )}
            <button 
              onClick={() => { setSelectedLink(null); setActiveTab('Portal'); }}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink size={13} />
              <span>Customer Portal Preview</span>
            </button>
          </div>
        </div>
      )}

      {/* Payment Desk Sub-Navigation Tabs */}
      {isFullPage && (
        <div className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
          {[
            { id: 'Links', label: 'Payment Links' },
            { id: 'Installments', label: 'EMI Schedules' },
            { id: 'Confirmation', label: 'Confirmation Desk' },
            { id: 'Submissions', label: 'Payment Proofs' },
            { id: 'CreateLink', label: 'Generate Link' },
            { id: 'Portal', label: 'Portal Preview' },
            { id: 'Settings', label: 'Gateway Settings' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as PaymentTab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === t.id
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{t.label}</span>
              {t.id === 'Confirmation' && submissions.filter(s => s.verification_status === 'Pending Review').length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500 text-white font-semibold">
                  {submissions.filter(s => s.verification_status === 'Pending Review').length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* CREATE PAYMENT LINK TYPE SELECTION MODAL */}
      {showCreateChoiceModal && (
        <div className="fixed inset-0 z-[250] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Create Payment Link</h3>
              <button onClick={() => setShowCreateChoiceModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCreateChoiceModal(false);
                  setActiveTab('CreateLink');
                }}
                className="p-4 rounded-xl border border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/30 text-left space-y-2 transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <CreditCard size={16} />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 text-xs">Full Package Link</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Generate a one-time full package payment link.</p>
                </div>
                <span className="text-[10px] font-semibold text-indigo-600 flex items-center gap-1">
                  Create Link <ChevronRight size={12} />
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCreateChoiceModal(false);
                  setActiveTab('Installments');
                }}
                className="p-4 rounded-xl border border-slate-200 hover:border-emerald-400 bg-slate-50/50 hover:bg-emerald-50/30 text-left space-y-2 transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Calendar size={16} />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 text-xs">EMI Installments</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Split booking into partial milestone payments.</p>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                  Configure EMI <ChevronRight size={12} />
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATED PAYMENT LINK SUCCESS POPUP */}
      {createdLinkModalData && (
        <div className="fixed inset-0 z-[250] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 border border-slate-200 shadow-xl space-y-4 text-center animate-in zoom-in-95 duration-200">
            <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide block">Payment Link Ready</span>
              <h3 className="text-sm font-semibold text-slate-900 mt-0.5">{createdLinkModalData.package_name}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Guest: <strong className="text-slate-800">{createdLinkModalData.customer_name}</strong></p>
              <p className="text-lg font-bold text-emerald-700 mt-1">₹{(createdLinkModalData.net_amount || 0).toLocaleString('en-IN')}</p>
            </div>

            <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-1.5">
              <input type="text" readOnly value={createdLinkModalData.portalUrl} className="bg-transparent text-[11px] font-mono font-medium text-slate-700 flex-1 outline-none truncate" />
              <button 
                onClick={() => handleCopy('createdLink', createdLinkModalData.portalUrl)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  copiedId === 'createdLink' ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {copiedId === 'createdLink' ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => shareOnWhatsApp(createdLinkModalData.package_name, createdLinkModalData.net_amount, createdLinkModalData.portalUrl, createdLinkModalData.customer_phone)}
                className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <MessageSquare size={13} />
                <span>WhatsApp</span>
              </button>
              <button
                onClick={() => shareViaEmail(createdLinkModalData.package_name, createdLinkModalData.net_amount, createdLinkModalData.portalUrl, createdLinkModalData.customer_email)}
                className="py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Mail size={13} />
                <span>Email</span>
              </button>
            </div>

            <button
              onClick={() => {
                setCreatedLinkModalData(null);
                setActiveTab('Links');
              }}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg transition-colors cursor-pointer"
            >
              Done & View Links
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
                                    onClick={() => handleCopy(link.id, portalUrl)}
                                    className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors ${
                                      copiedId === link.id ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                    }`}
                                  >
                                    {copiedId === link.id ? '✓ Copied!' : '📋 Copy'}
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
                                      onClick={() => {
                                        setConfirmRef(`PAYLINK-${link.pay_key || 'UPI'}`);
                                        setConfirmMode('UPI');
                                        setConfirmComment('');
                                        setConfirmPaymentModal({ open: true, link });
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
                                disabled={!!inst.pay_key || inst.payment_status === 'Paid'}
                                className="font-bold text-slate-900 text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none w-full disabled:opacity-75"
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
                                disabled={!!inst.pay_key || inst.payment_status === 'Paid'}
                                className="text-xs text-slate-500 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none w-full disabled:opacity-75"
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
                                   disabled={!!inst.pay_key || inst.payment_status === 'Paid'}
                                   className="w-28 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-black text-slate-800 outline-none disabled:opacity-75"
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
                                   disabled={!!inst.pay_key || inst.payment_status === 'Paid'}
                                   className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 outline-none disabled:opacity-75"
                                 />
                              </div>
                              <div className="pt-3">
                                 <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${inst.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {inst.payment_status}
                                 </span>
                              </div>
                           </div>
                        </div>

                        {/* Installment Payment Comment Display Box */}
                        {(inst.comments || inst.notes) && (
                          <div className="mt-3 px-3.5 py-2.5 bg-indigo-50/90 border border-indigo-200/80 rounded-xl flex items-start justify-between gap-2 shadow-2xs">
                            <div className="flex items-start gap-2 text-xs">
                              <MessageSquare className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                              <div>
                                <span className="font-bold text-[10px] text-indigo-700 uppercase tracking-wider block">Payment Comment / Note</span>
                                <p className="font-semibold text-slate-800 text-xs mt-0.5 whitespace-pre-wrap">{inst.comments || inst.notes}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setInstallmentCommentModal({ open: true, instIdx: idx, comment: inst.comments || inst.notes || '' })}
                              className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold shrink-0 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                              title="Edit comment"
                            >
                              ✏️ Edit
                            </button>
                          </div>
                        )}

                        {/* EMI Milestone Action Toolbar */}
                        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                           <div className="text-[11px] font-mono text-slate-500 truncate max-w-xs">
                             {inst.pay_key ? <>Pay Key: <strong className="text-slate-800">{inst.pay_key}</strong></> : <span className="text-amber-600 font-bold">⚠️ Unsaved Link — Click 'Create Link' to generate</span>}
                           </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {/* Comment Button */}
                              <button
                                type="button"
                                onClick={() => setInstallmentCommentModal({ open: true, instIdx: idx, comment: inst.comments || inst.notes || '' })}
                                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/70 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Add or edit comments for this installment"
                              >
                                💬 Comment
                              </button>

                              {!inst.pay_key ? (
                                <button
                                  type="button"
                                  onClick={() => handleCreateInstallmentLink(idx)}
                                  disabled={isSavingInstallments}
                                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                                >
                                  ⚡ Create Link
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(inst.id || idx.toString(), instPortalUrl)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                                      copiedId === (inst.id || idx.toString()) ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                                    }`}
                                  >
                                    {copiedId === (inst.id || idx.toString()) ? '✓ Copied!' : '📋 Copy Link'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => shareOnWhatsApp(`${targetLead?.name || 'Customer'} - ${inst.title}`, inst.amount, instPortalUrl, targetLead?.phone || custPhone)}
                                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 flex items-center gap-1 cursor-pointer"
                                  >
                                    💬 WhatsApp
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => shareViaEmail(`${targetLead?.name || 'Customer'} - ${inst.title}`, inst.amount, instPortalUrl, targetLead?.email || custEmail)}
                                    className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 flex items-center gap-1 cursor-pointer"
                                  >
                                    ✉️ Email
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      window.location.hash = `payment?pay_id=${inst.pay_key}`;
                                      window.open(`${window.location.origin}/#payment?pay_id=${inst.pay_key}`, '_blank');
                                    }}
                                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                                  >
                                    💳 Pay Now
                                  </button>
                                  {inst.payment_status === 'Paid' ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setConfirmRef(inst.transaction_ref || `EMI-REF-${Math.floor(100000 + Math.random() * 900000)}`);
                                        setConfirmMode(inst.payment_mode || 'UPI');
                                        setConfirmComment(inst.comments || inst.notes || '');
                                        setConfirmPaymentModal({
                                          open: true,
                                          link: {
                                            id: inst.id,
                                            pay_key: inst.pay_key,
                                            lead_id: targetLead?.id || lead?.id,
                                            net_amount: inst.amount,
                                            package_name: `${inst.title} - ${targetLead?.name || custName || 'Customer'}`,
                                            instIdx: idx
                                          }
                                        });
                                      }}
                                      className="px-3.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-black uppercase flex items-center gap-1 shadow-2xs cursor-pointer"
                                    >
                                      ✓ Paid / Update
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setConfirmRef(`EMI-REF-${Math.floor(100000 + Math.random() * 900000)}`);
                                        setConfirmMode('UPI');
                                        setConfirmComment(inst.comments || inst.notes || '');
                                        setConfirmPaymentModal({
                                          open: true,
                                          link: {
                                            id: inst.id,
                                            pay_key: inst.pay_key,
                                            lead_id: targetLead?.id || lead?.id,
                                            net_amount: inst.amount,
                                            package_name: `${inst.title} - ${targetLead?.name || custName || 'Customer'}`,
                                            instIdx: idx
                                          }
                                        });
                                      }}
                                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black uppercase flex items-center gap-1 shadow-sm cursor-pointer"
                                    >
                                      ✓ Confirm EMI Received
                                    </button>
                                  )}
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
                        className={`px-3.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 font-bold text-xs ${
                          confirmClearActive 
                            ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm' 
                            : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                        }`}
                      >
                        {confirmClearActive ? '⚠️ Confirm Clear' : '🗑️ Clear All Submissions'}
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

                            {/* Payment Comment Box in Confirmation Desk */}
                            {(sub.comments || sub.notes) && (
                              <div className="mt-2 px-3 py-2 bg-indigo-50/80 border border-indigo-100 rounded-xl flex items-start gap-2 text-xs">
                                <MessageSquare className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                                <div>
                                  <span className="text-[9px] font-black text-indigo-600 uppercase block tracking-wider">Payment Confirmation Comment / Note</span>
                                  <p className="font-semibold text-slate-800 text-xs mt-0.5 whitespace-pre-wrap">{sub.comments || sub.notes}</p>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                            <div className="text-left lg:text-right">
                              <span className="text-[9px] font-black text-slate-400 uppercase block">Amount Paid</span>
                              <span className="text-2xl font-black text-emerald-600">₹{(sub.amount_paid || 0).toLocaleString('en-IN')}</span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {sub.verification_status !== 'Approved' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmRef(sub.utr_number || `UPI-REF-${Math.floor(100000 + Math.random() * 900000)}`);
                                    setConfirmMode(sub.payment_mode || 'UPI');
                                    setConfirmComment(sub.comments || sub.notes || '');
                                    setConfirmPaymentModal({
                                      open: true,
                                      link: {
                                        id: sub.id,
                                        pay_key: sub.pay_key,
                                        lead_id: sub.lead_id || targetLead?.id || '',
                                        net_amount: sub.amount_paid,
                                        package_name: sub.package_name,
                                        submissionId: sub.id
                                      }
                                    });
                                  }}
                                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
                                >
                                  ✓ Confirm EMI Received
                                </button>
                              )}
                              {sub.verification_status === 'Pending Review' && (
                                <button
                                  type="button"
                                  onClick={() => handleVerifySubmission(sub.id, 'Rejected')}
                                  className="px-3.5 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs rounded-xl cursor-pointer"
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
                    className={`px-3.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 font-bold text-xs ${
                      confirmClearActive 
                        ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm' 
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                    }`}
                  >
                    {confirmClearActive ? '⚠️ Confirm Clear' : '🗑️ Clear All Submissions'}
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

         {/* TAB 6: CUSTOMER PAYMENT PORTAL (6 RESPONSIVE THEMES) */}
         {activeTab === 'Portal' && (
           <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-sm animate-in fade-in duration-300">
             <PaymentPageView
               targetLead={targetLead || lead}
               initialLinkKey={selectedLink?.pay_key}
               onPaymentSuccess={() => {
                 loadData();
                 if (onPaymentUpdated) onPaymentUpdated();
               }}
               isStandalone={false}
             />
           </div>
         )}
      </div>
      {localToast && (
        <div className="fixed bottom-6 right-6 z-[250] bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-800 animate-in slide-in-from-bottom duration-300">
          <span className="text-emerald-400 font-extrabold">✓</span>
          <span className="text-xs font-bold">{localToast.message}</span>
        </div>
      )}
      {/* Payment Confirmation Modal */}
      {confirmPaymentModal.open && confirmPaymentModal.link && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-200">Confirm Payment Received</p>
                  <h3 className="text-lg font-black mt-0.5">{confirmPaymentModal.link.customer_name}</h3>
                  <p className="text-xs text-emerald-100 mt-0.5">{confirmPaymentModal.link.package_name} · ₹{(confirmPaymentModal.link.net_amount || 0).toLocaleString()}</p>
                </div>
                <button onClick={() => setConfirmPaymentModal({ open: false, link: null })} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Transaction Ref / UTR Number *</label>
                <input
                  type="text"
                  value={confirmRef}
                  onChange={e => setConfirmRef(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="e.g. UTR-123456789012 or TXN-REF"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Payment Mode</label>
                <div className="grid grid-cols-4 gap-2">
                  {['UPI', 'Cash', 'Bank Transfer', 'Card'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => setConfirmMode(mode)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                        confirmMode === mode
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {mode === 'UPI' && '📱 '}
                      {mode === 'Cash' && '💵 '}
                      {mode === 'Bank Transfer' && '🏦 '}
                      {mode === 'Card' && '💳 '}
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest">💬 Payment Comment / Notes (Optional)</label>
                <textarea
                  value={confirmComment}
                  onChange={e => setConfirmComment(e.target.value)}
                  className="w-full border border-indigo-100 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                  rows={3}
                  placeholder="e.g. Client paid via Google Pay. Balance ₹5000 pending for next installment. Spoke with Mr. Sharma on call."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setConfirmPaymentModal({ open: false, link: null })}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                disabled={!confirmRef.trim() || isConfirmingPayment}
                onClick={async () => {
                  const link = confirmPaymentModal.link;
                  setIsConfirmingPayment(true);
                  try {
                    const commentVal = confirmComment.trim();
                    const cleanRef = confirmRef.trim();

                    await handleConfirmEmiReceived(
                      link.lead_id || '',
                      link.id,
                      cleanRef,
                      confirmMode,
                      link.net_amount || 0,
                      link.pay_key,
                      commentVal
                    );

                    if (link.instIdx !== undefined && installments[link.instIdx]) {
                      const updated = [...installments];
                      updated[link.instIdx].payment_status = 'Paid';
                      updated[link.instIdx].comments = commentVal;
                      updated[link.instIdx].notes = commentVal;
                      updated[link.instIdx].transaction_ref = confirmRef.trim();
                      updated[link.instIdx].payment_mode = confirmMode;
                      setInstallments(updated);
                    }

                    setConfirmPaymentModal({ open: false, link: null });
                    setConfirmRef('');
                    setConfirmMode('UPI');
                    setConfirmComment('');
                  } finally {
                    setIsConfirmingPayment(false);
                  }
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-white font-black text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isConfirmingPayment ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Confirm Payment Received</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Installment Comment Modal */}
      {installmentCommentModal.open && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                <h3 className="font-bold text-base">Installment Payment Comment</h3>
              </div>
              <button
                onClick={() => setInstallmentCommentModal({ open: false, instIdx: -1, comment: '' })}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-2 font-medium">
                  Add operational remarks, verification details, or payment notes for <strong className="text-slate-800 font-bold">{installments[installmentCommentModal.instIdx]?.title || 'Installment'}</strong>:
                </p>
                <textarea
                  value={installmentCommentModal.comment}
                  onChange={e => setInstallmentCommentModal(prev => ({ ...prev, comment: e.target.value }))}
                  rows={4}
                  placeholder="e.g. Received ₹23,333 via GPay (UTR: 3291039103). Verified in HDFC Bank account by Rahul."
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setInstallmentCommentModal({ open: false, instIdx: -1, comment: '' })}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={installmentCommentModal.isSaving}
                  onClick={async () => {
                    const idx = installmentCommentModal.instIdx;
                    const commentText = installmentCommentModal.comment.trim();
                    setInstallmentCommentModal(prev => ({ ...prev, isSaving: true }));
                    try {
                      const updated = [...installments];
                      if (updated[idx]) {
                        updated[idx].comments = commentText;
                        updated[idx].notes = commentText;
                        setInstallments(updated);
                        if (updated[idx].id) {
                          await api.updateInstallmentComment(updated[idx].id!, commentText);
                        }
                      }
                      setInstallmentCommentModal({ open: false, instIdx: -1, comment: '' });
                    } catch (err) {
                      console.error('Error saving installment comment:', err);
                    }
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  💾 Save Comment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentManagerModal;
