import { PaymentWorkspace, PaymentLinksTable, PaymentReviewTable, money } from './PaymentWorkspace';
import React, { useState, useEffect, useRef } from 'react';
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

export type PaymentTab = 'Dashboard' | 'Completed' | 'Links' | 'Submissions' | 'Installments' | 'CreateLink' | 'Settings' | 'Portal' | 'Confirmation';

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
  payment_status: 'Pending' | 'Partial' | 'Paid';
  pay_key?: string;
  comments?: string;
  notes?: string;
  paid_at?: string;
  payment_mode?: string;
  transaction_ref?: string;
  paid_amount?: number;
}

const PaymentManagerModal: React.FC<PaymentManagerModalProps> = ({ 
  lead, 
  onClose, 
  onPaymentUpdated,
  activeTab: externalActiveTab,
  onTabChange,
  isFullPage = true
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<PaymentTab>('Dashboard');
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;

  const setActiveTab = (tab: PaymentTab) => {
    setInternalActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  const [overview,setOverview]=useState<any>(null);
  const [dataLoading,setDataLoading]=useState(true);
  const [dataError,setDataError]=useState('');
  const [isCreatingLink,setIsCreatingLink]=useState(false);
  const actionLock=useRef(false),loadSequence=useRef(0);
  const [confirmAmount,setConfirmAmount]=useState('');
  const [confirmationError,setConfirmationError]=useState('');
  const [paymentLinks, setPaymentLinks] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    key_id: '',
    key_secret: '',
    upi_id: '',
    upi_payee: '',
    bank_name: '',
    bank_acc_num: '',
    bank_ifsc: '',
    bank_branch: '',
    bank_acc_name: '',
    support_phone: ''
  });

  const getLeadPackagePrice = (l?: Lead | null): number => {
    if (!l) return 0;
    if ((l as any).bookingTotal !== undefined && (l as any).bookingTotal !== null) return (l as any).bookingTotal;
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
    api.fetchLeads().then(data => setAllLeads(data)).catch(error => setDataError((error as Error).message));
  }, []);

  const handleSelectTripId = async (tripId: string) => {
    const found=allLeads.find(l=>l.tripId===tripId || l.id===tripId);
    setSelectedTripId(tripId);setTargetLead(found || null);
    setInstallments([]);setPaymentLinks([]);setHasExistingEMI(false);
  };

  const [packageName, setPackageName] = useState(lead?.destination ? `${lead.destination} Tour Package` : 'Tour Package Confirmation');
  const [destination, setDestination] = useState(lead?.destination || '');
  const [travelDate, setTravelDate] = useState(lead?.travelDate || '');
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
  const [hotelsText, setHotelsText] = useState('');
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

  const handleCopy = async (id:string,text:string) => {
    try {await navigator.clipboard.writeText(text);setCopiedId(id);showLocalToast('Payment link copied.');setTimeout(()=>setCopiedId(null),2000);}
    catch {showLocalToast('Could not copy the link. Open the customer page and copy its address.','error');}
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
      setDestination(activeLead.destination || '');
      setTravelDate(activeLead.travelDate || '');
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
    const sequence=++loadSequence.current;
    setDataLoading(true);setDataError('');
    try {
      const targetId=targetLead?.id || lead?.id;
      const [data,sets]=await Promise.all([api.fetchPaymentOverview(targetId),api.fetchPaymentSettings()]);
      if(sequence!==loadSequence.current)return;
      setOverview(data);setPaymentLinks(data.links || []);setSubmissions(data.submissions || []);setSettings(sets);
      const rows=targetId ? data.requests.filter((r:any)=>r.kind==='Installment') : [];
      setInstallments(rows);setHasExistingEMI(rows.length>0);
      const booking=data.bookings.find((b:any)=>b.id===targetId);
      if(booking?.total_paise!==null && booking?.total_paise!==undefined)setBaseAmount(Math.max(0,booking.total_paise-booking.collected_paise)/100);
      setTotalPackagePrice(booking?.total_paise!==null && booking?.total_paise!==undefined ? booking.total_paise/100 : getLeadPackagePrice(targetLead || lead));
    } catch(error) {if(sequence===loadSequence.current)setDataError((error as Error).message || 'Payment data could not be loaded.');}
    finally {if(sequence===loadSequence.current)setDataLoading(false);}
  };

  const handleCreateInstallmentLink = async (indexToSave?: number) => {
    const targetId = targetLead?.id || lead?.id;
    if (!targetId) {
      alert('Please select a Lead / Trip ID first to create installment links.');
      return;
    }
    if(actionLock.current)return;actionLock.current=true;
    setIsSavingInstallments(true);
    try {
      const updatedInstallments = [...installments];
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
      actionLock.current=false;setIsSavingInstallments(false);
    }
  };

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if(actionLock.current)return;actionLock.current=true;setIsCreatingLink(true);
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
      showLocalToast((err as Error).message || 'Failed to generate payment link','error');
    } finally {actionLock.current=false;setIsCreatingLink(false);}
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
    if(actionLock.current)return;actionLock.current=true;
    setIsSavingInstallments(true);
    try {
      const saved = await api.saveInstallmentSchedule(targetId, installments);
      setInstallments(saved);
      setHasExistingEMI(saved.length > 0);
      showLocalToast('Installment schedule saved.');
      if (onPaymentUpdated) onPaymentUpdated();
    } catch (e) {
      console.error('Error saving installment schedule:', e);
      showLocalToast((e as Error).message || 'Failed to save installment schedule.','error');
    } finally {
      actionLock.current=false;setIsSavingInstallments(false);
    }
  };

  const handleVerifySubmission = async (subId: string, status: 'Approved' | 'Rejected') => {
    try {
      await api.verifyPaymentSubmission(subId, status);
      showLocalToast(status==='Rejected'?'Payment proof rejected.':'Payment verified.');
      loadData();
      if (onPaymentUpdated) onPaymentUpdated();
    } catch (e) {
      console.error('Error updating verification status:', e);showLocalToast((e as Error).message || 'Could not update payment proof.','error');
    }
  };

  const openRecordPayment = (link:any) => {
    setConfirmRef('');setConfirmMode('UPI');setConfirmComment('');setConfirmationError('');
    setConfirmPaymentModal({open:true,link});
  };
  useEffect(()=>{
    if(confirmPaymentModal.open){
      const link=confirmPaymentModal.link;
      const prior=Number(link?.paid_amount || 0);
      setConfirmAmount(String(Math.max(0,Number(link?.net_amount || 0)-prior)));
      setConfirmationError('');
    }
  },[confirmPaymentModal]);

  useEffect(()=>{
    if(!confirmPaymentModal.open)return;
    const previous=document.activeElement as HTMLElement;
    const dialog=document.querySelector('[role="dialog"][aria-label="Record verified payment"]') as HTMLElement;
    const controls=()=>Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),textarea,select') || []);
    controls()[0]?.focus();
    const keydown=(event:KeyboardEvent)=>{
      if(event.key==='Escape' && !actionLock.current){event.preventDefault();setConfirmPaymentModal({open:false,link:null});}
      if(event.key==='Tab'){const items=controls(),first=items[0],last=items[items.length-1];if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();}}
    };
    document.addEventListener('keydown',keydown);return()=>{document.removeEventListener('keydown',keydown);previous?.focus();};
  },[confirmPaymentModal.open]);
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

      showLocalToast('Payment recorded successfully.');
    } catch (e) {
      console.error('Error confirming EMI payment:', e);
      throw e;
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      
      {/* Header Bar in Modal Mode */}
      {!isFullPage && (
        <div className="p-6 bg-inverse text-white flex justify-between items-center rounded-xl shadow-sm border border-line">
          <div className="flex flex-wrap items-center gap-3">
             <div className="w-10 h-10 bg-brand rounded-lg flex items-center justify-center text-white shadow-xs">
                <CreditCard size={20} />
             </div>
             <div>
                <h2 className="text-base font-semibold text-white">Payments</h2>
                <p className="text-sm text-muted font-medium">Razorpay Gateway, UPI Transfers & Partial Installments</p>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <CreditCard className="w-5 h-5 text-brand-ink" />
              <h2 className="text-xl font-semibold text-content">
                Payments
              </h2>
            </div>
            <p className="text-sm text-secondary mt-0.5">
              Track collections, plan installments, and verify customer payments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={loadData} disabled={dataLoading} aria-label="Refresh payment data" className="px-3 py-2 rounded-lg border border-line text-secondary flex items-center gap-2 text-sm disabled:opacity-50"><RefreshCw size={14} className={dataLoading?'animate-spin':''}/>Refresh</button>
            {activeTab !== 'CreateLink' && (
              <button 
                onClick={() => setShowCreateChoiceModal(true)} 
                className="px-3.5 py-2 bg-brand hover:bg-brand text-white rounded-lg text-sm font-medium shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>Create Payment Link</span>
              </button>
            )}
            <button 
              onClick={() => { setSelectedLink(null); setActiveTab('Portal'); }}
              className="px-3.5 py-2 bg-inverse hover:bg-inverse text-white rounded-lg text-sm font-medium shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink size={13} />
              <span>Customer Portal Preview</span>
            </button>
          </div>
        </div>
      )}

      {targetLead && !lead && <div className="p-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-line bg-brand-soft text-sm text-brand-ink"><span>Viewing {targetLead.tripId} · {targetLead.name}</span><button onClick={()=>{setSelectedTripId('');setTargetLead(null);}} className="font-medium underline">View all trips</button></div>}
      {/* Payment Desk Sub-Navigation Tabs */}
      {isFullPage && (
        <div className="flex flex-wrap items-center gap-1.5 bg-surface p-1.5 rounded-xl border border-line shadow-2xs">
          {[
            { id: 'Dashboard', label: 'Dashboard' },
            { id: 'Links', label: 'Payment links' },
            { id: 'Installments', label: 'Installments' },
            { id: 'Completed', label: 'Completed payments' },
            { id: 'Confirmation', label: 'Review payments' },
            { id: 'CreateLink', label: 'Generate Link' },
            { id: 'Settings', label: 'Gateway Settings' }
          ].map((t) => (
            <button
              key={t.id} style={{color:activeTab===t.id ? '#ffffff' : 'var(--text-secondary)'}} aria-label={t.label} aria-current={activeTab===t.id ? 'page' : undefined}
              onClick={() => setActiveTab(t.id as PaymentTab)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === t.id
                  ? 'bg-brand text-white shadow-2xs'
                  : 'text-secondary hover:bg-subtle hover:text-content'
              }`}
            >
              <span>{t.label}</span>
              {t.id === 'Confirmation' && submissions.filter(s => s.verification_status === 'Pending Review').length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-xs bg-success-strong text-white font-semibold">
                  {submissions.filter(s => s.verification_status === 'Pending Review').length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* CREATE PAYMENT LINK TYPE SELECTION MODAL */}
      {showCreateChoiceModal && (
        <div className="fixed inset-0 z-[250] bg-inverse/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface rounded-xl max-w-md w-full p-6 border border-line shadow-sm space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-line">
              <h3 className="text-sm font-semibold text-content">Create Payment Link</h3>
              <button onClick={() => setShowCreateChoiceModal(false)} className="p-1 text-muted hover:text-secondary rounded">
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
                className="p-4 rounded-xl border border-line hover:border-brand-line bg-canvas/50 hover:bg-brand-soft/30 text-left space-y-2 transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-brand-soft text-brand-ink flex items-center justify-center">
                  <CreditCard size={16} />
                </div>
                <div>
                  <h4 className="font-semibold text-content text-sm">Full Package Link</h4>
                  <p className="text-xs text-secondary mt-0.5 leading-snug">Generate a one-time full package payment link.</p>
                </div>
                <span className="text-xs font-semibold text-brand-ink flex items-center gap-1">
                  Create Link <ChevronRight size={12} />
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCreateChoiceModal(false);
                  setActiveTab('Installments');
                }}
                className="p-4 rounded-xl border border-line hover:border-success-line bg-canvas/50 hover:bg-success-soft/30 text-left space-y-2 transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-success-soft text-success-ink flex items-center justify-center">
                  <Calendar size={16} />
                </div>
                <div>
                  <h4 className="font-semibold text-content text-sm">installments</h4>
                  <p className="text-xs text-secondary mt-0.5 leading-snug">Split booking into partial milestone payments.</p>
                </div>
                <span className="text-xs font-semibold text-success-ink flex items-center gap-1">
                  Configure EMI <ChevronRight size={12} />
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATED PAYMENT LINK SUCCESS POPUP */}
      {createdLinkModalData && (
        <div className="fixed inset-0 z-[250] bg-inverse/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface rounded-xl max-w-sm w-full p-6 border border-line shadow-sm space-y-4 text-center animate-in zoom-in-95 duration-200">
            <div className="w-10 h-10 bg-success-soft border border-success-line text-success-ink rounded-full mx-auto flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <span className="text-xs font-semibold text-success-ink uppercase tracking-wide block">Payment Link Ready</span>
              <h3 className="text-sm font-semibold text-content mt-0.5">{createdLinkModalData.package_name}</h3>
              <p className="text-sm text-secondary mt-0.5">Guest: <strong className="text-content">{createdLinkModalData.customer_name}</strong></p>
              <p className="text-lg font-bold text-success-ink mt-1">₹{(createdLinkModalData.net_amount || 0).toLocaleString('en-IN')}</p>
            </div>

            <div className="p-2 bg-canvas border border-line rounded-lg flex items-center gap-1.5">
              <input type="text" readOnly value={createdLinkModalData.portalUrl} className="bg-transparent text-xs font-mono font-medium text-content flex-1 outline-none truncate" />
              <button 
                onClick={() => handleCopy('createdLink', createdLinkModalData.portalUrl)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                  copiedId === 'createdLink' ? 'bg-success-strong text-white' : 'bg-brand text-white hover:bg-brand'
                }`}
              >
                {copiedId === 'createdLink' ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => shareOnWhatsApp(createdLinkModalData.package_name, createdLinkModalData.net_amount, createdLinkModalData.portalUrl, createdLinkModalData.customer_phone)}
                className="py-2 bg-success-strong hover:bg-success-strong text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <MessageSquare size={13} />
                <span>WhatsApp</span>
              </button>
              <button
                onClick={() => shareViaEmail(createdLinkModalData.package_name, createdLinkModalData.net_amount, createdLinkModalData.portalUrl, createdLinkModalData.customer_email)}
                className="py-2 bg-inverse hover:bg-inverse text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
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
              className="w-full py-2 bg-subtle hover:bg-hover text-content font-medium text-sm rounded-lg transition-colors cursor-pointer"
            >
              Done & View Links
            </button>
          </div>
        </div>
      )}

      {dataLoading && <div role="status" className="p-4 flex gap-2 items-center text-sm text-secondary"><RefreshCw size={16} className="animate-spin"/>Loading payment data…</div>}
      {dataError && <div role="alert" className="p-4 border border-danger-line bg-danger-soft rounded-xl text-danger-ink flex flex-wrap justify-between gap-3"><span>{dataError}</span><button onClick={loadData} className="underline font-medium">Retry</button></div>}
      {!dataError && !dataLoading && <div>
         {/* TAB 1: PAYMENT LINKS LIST */}
         {(activeTab==='Dashboard' || activeTab==='Completed') && <PaymentWorkspace data={overview} mode={activeTab} onNavigate={setActiveTab} onRecord={openRecordPayment} onSelectTrip={id=>{handleSelectTripId(id);setActiveTab('Installments');}}/>}
         {activeTab==='Links' && <PaymentLinksTable links={paymentLinks} leads={allLeads} onRecord={openRecordPayment} onPreview={link=>{setSelectedLink(link);setActiveTab('Portal');}} onCopy={handleCopy} onCreate={()=>setShowCreateChoiceModal(true)}/>}

         {/* TAB 2: EMI & INSTALLMENTS SCHEDULER */}
         {activeTab === 'Installments' && (
           <div className="space-y-6">
              {/* Customer & Trip Search Toolbar */}
              <div className="p-5 bg-surface text-content rounded-xl border border-line space-y-4">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                       <span className="text-xs font-semibold text-brand-ink uppercase tracking-widest block mb-1">SEARCH CUSTOMER & TRIP ID</span>
                       <h4 className="text-base font-semibold text-content">Choose a trip to manage installments</h4>
                    </div>
                    <div className="w-full md:w-80">
                       <select 
                         aria-label="Select customer or trip" value={selectedTripId} 
                         onChange={e => handleSelectTripId(e.target.value)}
                         className="w-full bg-canvas text-content border border-line rounded-xl px-4 py-2.5 text-sm font-bold outline-none"
                       >
                          <option value="">-- Select Trip ID / Customer --</option>
                          {allLeads.filter(l=>!emiSearchQuery || `${l.name} ${l.tripId}`.toLowerCase().includes(emiSearchQuery.toLowerCase())).map(l => (
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

                      }}
                      className="w-full bg-canvas text-content border border-line rounded-xl px-4 py-2.5 text-sm font-bold placeholder-muted outline-none focus:border-brand-line"
                    />
                 </div>
              </div>

              {/* Lead Selected Summary / Status Banner */}
              {targetLead ? (
                <div className="p-5 bg-brand-soft border border-brand-line rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                   <div>
                      <span className="text-xs font-semibold text-brand-ink uppercase tracking-widest block">SELECTED TRIP</span>
                      <h4 className="text-base font-semibold text-content">{targetLead.tripId} — {targetLead.name}</h4>
                      <p className="text-sm text-secondary mt-0.5">
                        Destination: <strong>{targetLead.destination || 'N/A'}</strong> | Mobile: <strong>{targetLead.phone || 'N/A'}</strong> | Email: <strong>{targetLead.email || 'N/A'}</strong>
                      </p>
                   </div>
                   <div className="flex flex-wrap items-center gap-2">
                       <span className={`px-3 py-1 text-sm font-bold rounded-lg border ${installments.length > 0 ? 'bg-success-soft text-success-ink border-success-line' : 'bg-warning-soft text-warning-ink border-warning-line'}`}>
                         {installments.length > 0 ? `${installments.length} installments` : 'No EMI Schedule Yet'}
                       </span>
                    </div>
                </div>
              ) : (
                <div className="p-6 bg-warning-soft border border-warning-line rounded-xl text-warning-ink text-sm font-bold">
                  ⚠️ Search or select a customer name / trip ID above to view existing EMI or create a new schedule.
                </div>
              )}

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-line pb-4">
                 <div>
                    <h3 className="text-xl font-semibold text-content tracking-tight">Installment schedule</h3>
                    <p className="text-sm text-secondary font-medium mt-1">Configure installment milestones for {targetLead?.name || lead?.name || 'Selected Customer'}.</p>
                 </div>

                 {/* Percentage Badge */}
                 {(() => {
                   const totalAllocated = installments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
                   const isBalanced = totalAllocated === totalPackagePrice;
                   return (
                     <div className="flex flex-wrap items-center gap-3">
                        <div className={`px-4 py-2 rounded-xl text-sm font-semibold uppercase tracking-wider ${isBalanced ? 'bg-success-soft text-success-ink border border-success-line' : 'bg-warning-soft text-warning-ink border border-warning-line'}`}>
                           Allocated: ₹{totalAllocated.toLocaleString()} / ₹{totalPackagePrice.toLocaleString()} {isBalanced ? '✓ Balanced' : `(Diff: ₹${Math.abs(totalPackagePrice - totalAllocated)})`}
                        </div>
                        <button 
                          onClick={handleSaveInstallments}
                          disabled={isSavingInstallments}
                          className="px-6 py-2.5 bg-success-strong text-white rounded-xl text-sm font-semibold uppercase tracking-widest hover:bg-success-strong shadow-sm transition-all disabled:opacity-50"
                        >
                           {isSavingInstallments ? 'Saving...' : 'Save schedule'}
                        </button>
                     </div>
                   );
                 })()}
              </div>

              {/* Total Package Price Input & Auto-split */}
              <div className="p-6 bg-canvas border border-line rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                 <div>
                    <label className="block text-sm font-semibold text-muted uppercase tracking-widest mb-1">Booking total (INR)</label>
                    <input 
                      type="number" 
                      aria-label="Booking total" readOnly value={totalPackagePrice} 
                      onChange={e => setTotalPackagePrice(Number(e.target.value))}
                      className="bg-surface border border-line rounded-xl px-4 py-2 text-lg font-semibold text-content outline-none w-48"
                    />
                 </div>
                 <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label="Number of installments" value={autoSplitCount}
                      onChange={e => setAutoSplitCount(Number(e.target.value))}
                      className="bg-surface border border-line rounded-xl px-3 py-2 text-sm font-bold text-content outline-none"
                    >
                      {[2,3,4,5,6,7,8,9,10].map(n => (
                        <option key={n} value={n}>{n} Installments</option>
                      ))}
                    </select>
                    <button 
                      type="button"
                      onClick={() => {
                        if(installments.some(i=>Number(i.paid_amount)>0)){showLocalToast('Keep received installments. Add or adjust unpaid installments individually.','error');return;}
                        const count = autoSplitCount;
                        const totalPaise=Math.round(totalPackagePrice*100);
                        const perInst = Math.floor(totalPaise / count);
                        const newInstallments = [];
                        for (let i = 0; i < count; i++) {
                          const isLast = i === count - 1;
                          const amount = (isLast ? totalPaise - perInst * (count - 1) : perInst)/100;
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
                      className="px-4 py-2 bg-brand-soft text-brand-ink rounded-xl text-sm font-bold hover:bg-brand-soft"
                    >
                       Split evenly
                    </button>
                    <button
                      type="button"
                      onClick={() => setInstallments([...installments, { title: 'New Installment', amount: 0, due_date: new Date().toISOString().split('T')[0], payment_condition: '', payment_status: 'Pending' }])}
                      className="px-4 py-2 bg-inverse text-white rounded-xl text-sm font-bold hover:bg-inverse"
                    >
                      + Add Row
                    </button>
                 </div>
              </div>

              {/* Milestone Rows with Copy, WhatsApp, and Email Share Links */}
              <div className="space-y-4">
                 {installments.map((inst, idx) => {
                   const instPayKey = inst.pay_key || ''; 
                   const instPortalUrl = `${window.location.origin}/#payment?pay_id=${instPayKey}`;

                   return (
                     <div key={idx} className="p-6 bg-surface rounded-xl border border-line space-y-4 hover:border-line transition-all shadow-xs">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                           <div className="flex-1 space-y-1 w-full">
                              <input 
                                type="text" 
                                aria-label={`Installment ${idx+1} title`} value={inst.title}
                                onChange={e => {
                                  const updated = [...installments];
                                  updated[idx].title = e.target.value;
                                  setInstallments(updated);
                                }}
                                disabled={Number(inst.paid_amount || 0)>0}
                                className="font-bold text-content text-sm bg-transparent border-b border-transparent hover:border-line focus:border-brand-line outline-none w-full disabled:opacity-75"
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
                                disabled={Number(inst.paid_amount || 0)>0}
                                className="text-sm text-secondary bg-transparent border-b border-transparent hover:border-line focus:border-brand-line outline-none w-full disabled:opacity-75"
                              />
                           </div>

                           <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                              <div>
                                 <span className="text-xs font-semibold text-muted uppercase block">Amount (₹)</span>
                                 <input 
                                   type="number" 
                                   aria-label={`Installment ${idx+1} amount`} min="0.01" step="0.01" value={inst.amount}
                                   onChange={e => {
                                     const updated = [...installments];
                                     updated[idx].amount = Number(e.target.value);
                                     setInstallments(updated);
                                   }}
                                   disabled={Number(inst.paid_amount || 0)>0}
                                   className="w-28 bg-canvas border border-line rounded-xl px-3 py-1.5 text-sm font-semibold text-content outline-none disabled:opacity-75"
                                 />
                              </div>
                              <div>
                                 <span className="text-xs font-semibold text-muted uppercase block">Due Date</span>
                                 <input 
                                   type="date" 
                                   aria-label={`Installment ${idx+1} due date`} value={inst.due_date}
                                   onChange={e => {
                                     const updated = [...installments];
                                     updated[idx].due_date = e.target.value;
                                     setInstallments(updated);
                                   }}
                                   disabled={Number(inst.paid_amount || 0)>0}
                                   className="bg-canvas border border-line rounded-xl px-3 py-1.5 text-sm font-bold text-content outline-none disabled:opacity-75"
                                 />
                              </div>
                              <div className="pt-3">
                                 <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${inst.payment_status === 'Paid' ? 'bg-success-soft text-success-ink' : 'bg-warning-soft text-warning-ink'}`}>
                                    {inst.payment_status}
                                 </span>
                              </div>
                           </div>
                        </div>

                        {/* Installment Payment Comment Display Box */}
                        {(inst.comments || inst.notes) && (
                          <div className="mt-3 px-3.5 py-2.5 bg-brand-soft/90 border border-brand-line/80 rounded-xl flex items-start justify-between gap-2 shadow-2xs">
                            <div className="flex items-start gap-2 text-xs">
                              <MessageSquare className="w-4 h-4 text-brand-ink mt-0.5 shrink-0" />
                              <div>
                                <span className="font-bold text-xs text-brand-ink uppercase tracking-wider block">Payment Comment / Note</span>
                                <p className="font-semibold text-content text-sm mt-0.5 whitespace-pre-wrap">{inst.comments || inst.notes}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setInstallmentCommentModal({ open: true, instIdx: idx, comment: inst.comments || inst.notes || '' })}
                              className="px-2.5 py-1 bg-surface hover:bg-brand-soft text-brand-ink border border-brand-line rounded-lg text-xs font-bold shrink-0 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                              title="Edit comment"
                            >
                              ✏️ Edit
                            </button>
                          </div>
                        )}

                        {/* EMI Milestone Action Toolbar */}
                        <div className="pt-3 border-t border-line flex flex-wrap items-center justify-between gap-3">
                           <div className="text-xs font-mono text-secondary truncate max-w-xs">
                             {inst.pay_key ? <span className="text-secondary">Payment link ready to share</span> : <span className="text-warning-ink font-bold">⚠️ Unsaved Link — Click 'Create Link' to generate</span>}
                           </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {/* Comment Button */}
                              <button
                                type="button"
                                onClick={() => setInstallmentCommentModal({ open: true, instIdx: idx, comment: inst.comments || inst.notes || '' })}
                                className="px-3 py-1.5 bg-brand-soft text-brand-ink hover:bg-brand-soft border border-brand-line/70 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="Add or edit comments for this installment"
                              >
                                💬 Comment
                              </button>

                              {!inst.pay_key ? (
                                <button
                                  type="button"
                                  onClick={() => handleCreateInstallmentLink(idx)}
                                  disabled={isSavingInstallments}
                                  className="px-4 py-1.5 bg-success-strong hover:bg-success-strong text-white rounded-lg text-sm font-semibold uppercase tracking-wider shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                                >
                                  ⚡ Create Link
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(inst.id || idx.toString(), instPortalUrl)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                                      copiedId === (inst.id || idx.toString()) ? 'bg-success-soft text-success-ink border border-success-line' : 'bg-brand-soft text-brand-ink hover:bg-brand-soft'
                                    }`}
                                  >
                                    {copiedId === (inst.id || idx.toString()) ? '✓ Copied!' : '📋 Copy Link'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => shareOnWhatsApp(`${targetLead?.name || 'Customer'} - ${inst.title}`, inst.amount, instPortalUrl, targetLead?.phone || custPhone)}
                                    className="px-3 py-1.5 bg-success-soft text-success-ink rounded-lg text-sm font-bold hover:bg-success-soft flex items-center gap-1 cursor-pointer"
                                  >
                                    💬 WhatsApp
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => shareViaEmail(`${targetLead?.name || 'Customer'} - ${inst.title}`, inst.amount, instPortalUrl, targetLead?.email || custEmail)}
                                    className="px-3 py-1.5 bg-subtle text-content rounded-lg text-sm font-bold hover:bg-hover flex items-center gap-1 cursor-pointer"
                                  >
                                    ✉️ Email
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {

                                      window.open(`${window.location.origin}/#payment?pay_id=${inst.pay_key}`, '_blank');
                                    }}
                                    className="px-3 py-1.5 bg-inverse text-white rounded-lg text-sm font-bold hover:bg-inverse flex items-center gap-1 cursor-pointer"
                                  >
                                    💳 Pay Now
                                  </button>
                                  {inst.payment_status === 'Paid' ? (
                                    <button disabled
                                      type="button"
                                      onClick={() => {
                                        setConfirmRef('');
                                        setConfirmMode(inst.payment_mode || 'UPI');
                                        setConfirmComment(inst.comments || inst.notes || '');
                                        setConfirmPaymentModal({
                                          open: true,
                                          link: {
                                            id: inst.id,
                                            pay_key: inst.pay_key,
                                            lead_id: targetLead?.id || lead?.id,
                                            net_amount: inst.amount, paid_amount: inst.paid_amount || 0, customer_name: targetLead?.name || custName,
                                            package_name: `${inst.title} - ${targetLead?.name || custName || 'Customer'}`,
                                            instIdx: idx
                                          }
                                        });
                                      }}
                                      className="px-3.5 py-1.5 bg-success-soft hover:bg-success-soft text-success-ink border border-success-line rounded-lg text-sm font-semibold uppercase flex items-center gap-1 shadow-2xs cursor-pointer"
                                    >
                                      Paid in full
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setConfirmRef('');
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
                                      className="px-3.5 py-1.5 bg-success-strong hover:bg-success-strong text-white rounded-lg text-sm font-semibold uppercase flex items-center gap-1 shadow-sm cursor-pointer"
                                    >
                                      Record payment
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
                    className="px-5 py-2.5 bg-brand text-white rounded-xl text-sm font-semibold uppercase tracking-wider hover:bg-brand shadow-sm flex items-center gap-2"
                  >
                    Add installment
                  </button>
                  {installments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Remove the last installment row?')) {
                          setInstallments(installments.slice(0, -1));
                        }
                      }}
                      className="px-4 py-2.5 bg-danger-soft text-danger-ink rounded-xl text-sm font-bold hover:bg-danger-soft border border-danger-line flex items-center gap-1"
                    >
                      ✖ Remove Last Row
                    </button>
                  )}
               </div>

               {/* Empty State when no installments */}
               {installments.length === 0 && (
                 <div className="p-10 text-center bg-surface rounded-xl border border-dashed border-line space-y-3">
                    <div className="w-14 h-14 bg-subtle text-muted rounded-full mx-auto flex items-center justify-center text-2xl">🗓️</div>
                    <h4 className="text-base font-semibold text-content">No EMI Schedule Created</h4>
                    <p className="text-sm text-secondary font-medium max-w-sm mx-auto">This lead does not have any installment milestones yet. Use the Auto-Split above or click "Add installment" to create a new payment schedule.</p>
                 </div>
               )}
            </div>
          )}

          {/* TAB: PAYMENT CONFIRMATION DESK ("PAYMENT CONFERENCE") */}
          {(activeTab==='Confirmation' || activeTab==='Submissions') && <PaymentReviewTable submissions={submissions} onReject={id=>handleVerifySubmission(id,'Rejected')} onReview={sub=>{setConfirmRef(sub.utr_number || '');setConfirmMode(sub.payment_mode || 'UPI');setConfirmComment('');setConfirmPaymentModal({open:true,link:{id:sub.id,pay_key:sub.pay_key,lead_id:sub.lead_id,customer_name:sub.customer_name,net_amount:sub.amount_paid,package_name:sub.package_name,submissionId:sub.id}});}}/>}

         {activeTab==='CreateLink' && <form onSubmit={handleCreateLink} className="max-w-4xl mx-auto bg-surface border border-line rounded-xl overflow-hidden"><header className="p-5 border-b border-line"><h3 className="text-lg font-semibold text-content">Create a payment request</h3><p className="text-sm text-secondary mt-2">Select a trip, check the amount, then share the customer payment link.</p></header><div className="p-5 space-y-5"><label className="block text-sm text-secondary">Booking / trip<select aria-label="Payment request booking" value={selectedTripId} onChange={e=>handleSelectTripId(e.target.value)} className="block w-full mt-2 p-3 rounded-lg border border-line bg-canvas text-content"><option value="">Choose a trip or enter customer details</option>{allLeads.map(l=><option key={l.id} value={l.tripId}>{l.tripId} · {l.name}</option>)}</select></label><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><label className="block text-sm text-secondary">Customer name<input required value={custName} onChange={e=>setCustName(e.target.value)} className="block w-full mt-2 p-3 rounded-lg border border-line bg-canvas text-content"/></label><label className="block text-sm text-secondary">Package title<input required value={packageName} onChange={e=>setPackageName(e.target.value)} className="block w-full mt-2 p-3 rounded-lg border border-line bg-canvas text-content"/></label><label className="block text-sm text-secondary">Mobile number<input type="tel" value={custPhone} onChange={e=>setCustPhone(e.target.value)} className="block w-full mt-2 p-3 rounded-lg border border-line bg-canvas text-content"/></label><label className="block text-sm text-secondary">Email address<input type="email" value={custEmail} onChange={e=>setCustEmail(e.target.value)} className="block w-full mt-2 p-3 rounded-lg border border-line bg-canvas text-content"/></label><label className="block text-sm text-secondary">Destination<input required value={destination} onChange={e=>setDestination(e.target.value)} className="block w-full mt-2 p-3 rounded-lg border border-line bg-canvas text-content"/></label><label className="block text-sm text-secondary">Travel date<input type="date" value={travelDate} onChange={e=>setTravelDate(e.target.value)} className="block w-full mt-2 p-3 rounded-lg border border-line bg-canvas text-content"/></label></div><fieldset className="border-t border-line pt-5"><legend className="font-medium text-content">Request amount</legend><div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">{[{label:'Base amount (INR)',value:baseAmount,set:setBaseAmount,min:0.01},{label:'GST amount (INR)',value:gstAmount,set:setGstAmount,min:0},{label:'Processing fee (INR)',value:feeAmount,set:setFeeAmount,min:0},{label:'Discount (INR)',value:discountAmount,set:setDiscountAmount,min:0}].map(f=><label key={f.label} className="block text-sm text-secondary">{f.label}<input required type="number" min={f.min} step="0.01" value={f.value} onChange={e=>f.set(Number(e.target.value))} className="block w-full mt-2 p-3 rounded-lg border border-line bg-canvas text-content"/></label>)}</div></fieldset><div className="bg-brand-soft border border-brand-line rounded-lg p-4 flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-brand-ink">Customer will be asked to pay</span><strong className="text-2xl text-brand-ink tabular-nums">{money(baseAmount+gstAmount+feeAmount-discountAmount)}</strong></div><p className="text-xs text-secondary">For a linked booking, the requested total cannot exceed its remaining balance. Add only applicable, agreed charges.</p></div><footer className="p-5 border-t border-line flex flex-wrap justify-end gap-3"><button type="button" onClick={()=>setActiveTab('Links')} className="px-5 py-3 border border-line rounded-lg text-sm text-secondary">Back to links</button><button type="submit" disabled={isCreatingLink} aria-busy={isCreatingLink} className="px-5 py-3 rounded-lg bg-brand text-white text-sm font-medium disabled:opacity-50">{isCreatingLink?'Creating payment link…':'Create payment link'}</button></footer></form>}

         {/* TAB 5: GATEWAY & BANK SETTINGS */}
         {activeTab === 'Settings' && (
           <form onSubmit={handleSaveSettings} className="space-y-6 max-w-2xl bg-surface p-8 rounded-xl border border-line shadow-sm">
              <h3 className="text-lg font-semibold text-content uppercase tracking-tight">Razorpay API Keys & Bank Credentials</h3>
              
              <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-bold text-secondary uppercase tracking-wider mb-1">Razorpay Key ID</label>
                    <input type="text" value={settings.key_id} onChange={e => setSettings({...settings, key_id: e.target.value})} className="w-full bg-canvas border border-line rounded-xl px-4 py-2.5 text-sm font-mono font-bold outline-none" />
                 </div>

                 <div>
                    <label className="block text-sm font-bold text-secondary uppercase tracking-wider mb-1">Razorpay Key Secret</label>
                    <input type="password" value={settings.key_secret} onChange={e => setSettings({...settings, key_secret: e.target.value})} className="w-full bg-canvas border border-line rounded-xl px-4 py-2.5 text-sm font-mono font-bold outline-none" placeholder="••••••••••••••••" />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-bold text-secondary uppercase tracking-wider mb-1">UPI ID</label>
                       <input type="text" value={settings.upi_id} onChange={e => setSettings({...settings, upi_id: e.target.value})} className="w-full bg-canvas border border-line rounded-xl px-4 py-2.5 text-sm font-bold outline-none" />
                    </div>
                    <div>
                       <label className="block text-sm font-bold text-secondary uppercase tracking-wider mb-1">UPI Payee Name</label>
                       <input type="text" value={settings.upi_payee} onChange={e => setSettings({...settings, upi_payee: e.target.value})} className="w-full bg-canvas border border-line rounded-xl px-4 py-2.5 text-sm font-bold outline-none" />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-bold text-secondary uppercase tracking-wider mb-1">Bank Name</label>
                       <input type="text" value={settings.bank_name} onChange={e => setSettings({...settings, bank_name: e.target.value})} className="w-full bg-canvas border border-line rounded-xl px-4 py-2.5 text-sm font-bold outline-none" />
                    </div>
                    <div>
                       <label className="block text-sm font-bold text-secondary uppercase tracking-wider mb-1">Account Number</label>
                       <input type="text" value={settings.bank_acc_num} onChange={e => setSettings({...settings, bank_acc_num: e.target.value})} className="w-full bg-canvas border border-line rounded-xl px-4 py-2.5 text-sm font-mono font-bold outline-none" />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-bold text-secondary uppercase tracking-wider mb-1">IFSC Code</label>
                       <input type="text" value={settings.bank_ifsc} onChange={e => setSettings({...settings, bank_ifsc: e.target.value})} className="w-full bg-canvas border border-line rounded-xl px-4 py-2.5 text-sm font-mono font-bold outline-none" />
                    </div>
                    <div>
                       <label className="block text-sm font-bold text-secondary uppercase tracking-wider mb-1">Branch Name</label>
                       <input type="text" value={settings.bank_branch} onChange={e => setSettings({...settings, bank_branch: e.target.value})} className="w-full bg-canvas border border-line rounded-xl px-4 py-2.5 text-sm font-bold outline-none" />
                    </div>
                 </div>

                 <div className="bg-warning-soft p-4 rounded-xl border border-warning-line">
                    <label className="block text-sm font-bold text-warning-ink uppercase tracking-wider mb-1">Credit Card Surcharge / Processing Fee (%)</label>
                    <p className="text-xs text-warning-ink mb-2">Customers selecting Card payment will be notified and charged this percentage as card processing fee.</p>
                    <input type="number" step="0.1" value={settings.card_fee_percentage !== undefined ? settings.card_fee_percentage : 2.5} onChange={e => setSettings({...settings, card_fee_percentage: parseFloat(e.target.value) || 0})} className="w-full bg-surface border border-warning-line rounded-xl px-4 py-2.5 text-sm font-semibold outline-none text-warning-ink" />
                 </div>
              </div>

              <button type="submit" className="w-full py-3.5 bg-inverse text-white rounded-xl font-semibold text-sm uppercase tracking-widest shadow-sm hover:bg-inverse">
                💾 Save Gateway Settings
              </button>
           </form>
         )}

         {/* TAB 6: CUSTOMER PAYMENT PORTAL (6 RESPONSIVE THEMES) */}
         {activeTab === 'Portal' && (
           <div className="rounded-xl overflow-hidden border border-line shadow-sm animate-in fade-in duration-300">
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
      </div>}
      {localToast && (
        <div role="status" aria-live="polite" className="fixed bottom-6 right-6 z-[350] bg-inverse text-white px-5 py-3 rounded-xl shadow-sm flex items-center gap-2 border border-line animate-in slide-in-from-bottom duration-300">
          <span className="font-semibold">{localToast.type==='error' ? '!' : '✓'}</span>
          <span className="text-xs font-bold">{localToast.message}</span>
        </div>
      )}
      {/* Payment Confirmation Modal */}
      {confirmPaymentModal.open && confirmPaymentModal.link && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div role="dialog" aria-modal="true" aria-label="Record verified payment" className="bg-surface rounded-xl shadow-sm w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-success-strong to-success-strong px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-white">Record verified payment</p>
                  <h3 className="text-lg font-semibold mt-0.5">{confirmPaymentModal.link.customer_name}</h3>
                  <p className="text-sm text-white/85 mt-0.5">{confirmPaymentModal.link.package_name} · ₹{(confirmPaymentModal.link.net_amount || 0).toLocaleString()}</p>
                </div>
                <button aria-label="Close payment dialog" disabled={isConfirmingPayment} onClick={() => setConfirmPaymentModal({ open: false, link: null })} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              <div className="text-sm text-secondary bg-canvas rounded-lg p-3">Only record funds you have verified in your bank or payment provider.</div>
              {!confirmPaymentModal.link.submissionId && <label className="block text-sm text-secondary">Amount received now (INR)<input type="number" min="0.01" step="0.01" aria-label="Amount received now" value={confirmAmount} onChange={e=>setConfirmAmount(e.target.value)} className="mt-2 w-full border border-line bg-canvas text-content rounded-lg p-3"/><span className="block text-xs mt-2">Already received: {money(confirmPaymentModal.link.paid_amount || 0)}. Enter only this new receipt.</span></label>}
              {confirmationError && <p role="alert" className="text-sm text-danger-ink">{confirmationError}</p>}
              <div className="space-y-1.5">
                <label htmlFor="payment-reference" className="block text-xs font-semibold text-secondary">Transaction reference / UTR *</label>
                <input
                  type="text"
                  readOnly={!!confirmPaymentModal.link.submissionId} id="payment-reference" value={confirmRef}
                  onChange={e => setConfirmRef(e.target.value)}
                  className="w-full border border-line rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-success-line focus:border-success-line"
                  placeholder="e.g. UTR-123456789012 or TXN-REF"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-secondary uppercase tracking-widest">Payment Mode</label>
                <div className="grid grid-cols-4 gap-2">
                  {['UPI', 'Cash', 'Bank Transfer', 'Card'].map(mode => (
                    <button
                      key={mode}
                      disabled={!!confirmPaymentModal.link.submissionId} onClick={() => setConfirmMode(mode)}
                      className={`px-3 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                        confirmMode === mode
                          ? 'bg-success-strong text-white border-success-line shadow-sm shadow-success-line'
                          : 'bg-surface text-secondary border-line hover:bg-canvas'
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
                <label className="block text-xs font-semibold text-brand-ink uppercase tracking-widest">💬 Payment Comment / Notes (Optional)</label>
                <textarea
                  value={confirmComment}
                  onChange={e => setConfirmComment(e.target.value)}
                  className="w-full border border-brand-line rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-line focus:border-brand-line resize-none"
                  rows={3}
                  placeholder="e.g. Client paid via Google Pay. Balance ₹5000 pending for next installment. Spoke with Mr. Sharma on call."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setConfirmPaymentModal({ open: false, link: null })}
                className="flex-1 px-4 py-3 rounded-xl border border-line text-secondary font-bold text-sm hover:bg-canvas transition-all"
              >
                Cancel
              </button>
              <button
                disabled={!confirmRef.trim() || isConfirmingPayment}
                onClick={async () => {
                  const link = confirmPaymentModal.link;
                  if(actionLock.current)return;actionLock.current=true;
                  setIsConfirmingPayment(true);setConfirmationError('');
                  try {
                    const commentVal = confirmComment.trim();
                    const cleanRef = confirmRef.trim();

                    if(link.submissionId) {
                      await api.verifyPaymentSubmission(link.submissionId,'Approved');
                      await loadData();onPaymentUpdated?.();
                    } else {
                      const amount=Number(confirmAmount);
                      if(!Number.isFinite(amount) || amount<=0)throw new Error('Enter a positive received amount.');
                      const cumulative=Math.round((Number(link.paid_amount || 0)+amount)*100)/100;
                      await handleConfirmEmiReceived(link.lead_id || '',link.id,cleanRef,confirmMode,cumulative,link.pay_key,commentVal);
                    }
                    setConfirmPaymentModal({ open: false, link: null });
                    setConfirmRef('');
                    setConfirmMode('UPI');
                    setConfirmComment('');
                  } catch(error) {setConfirmationError((error as Error).message || 'Payment was not confirmed.');} finally {
                    actionLock.current=false;
                    setIsConfirmingPayment(false);
                  }
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-success-strong text-white font-semibold text-sm hover:bg-success-strong disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-success-line flex items-center justify-center gap-2 cursor-pointer"
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
        <div className="fixed inset-0 z-[9999] bg-inverse/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl max-w-md w-full shadow-sm border border-line overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-gradient-to-r from-brand to-brand text-white flex justify-between items-center">
              <div className="flex flex-wrap items-center gap-2">
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
                <p className="text-sm text-secondary mb-2 font-medium">
                  Add operational remarks, verification details, or payment notes for <strong className="text-content font-bold">{installments[installmentCommentModal.instIdx]?.title || 'Installment'}</strong>:
                </p>
                <textarea
                  value={installmentCommentModal.comment}
                  onChange={e => setInstallmentCommentModal(prev => ({ ...prev, comment: e.target.value }))}
                  rows={4}
                  placeholder="e.g. Received ₹23,333 via GPay (UTR: 3291039103). Verified in HDFC Bank account by Rahul."
                  className="w-full border border-line rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-line focus:border-brand-line resize-none text-content"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setInstallmentCommentModal({ open: false, instIdx: -1, comment: '' })}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-secondary hover:bg-subtle transition-colors cursor-pointer"
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
                  className="px-5 py-2 rounded-xl text-sm font-bold bg-brand hover:bg-brand text-white transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
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
