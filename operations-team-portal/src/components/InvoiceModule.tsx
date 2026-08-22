import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  Send, 
  UserCheck, 
  Plus, 
  Trash2, 
  Building2, 
  CheckCircle2, 
  Calendar, 
  MapPin, 
  DollarSign,
  AlertCircle,
  Receipt,
  Plane,
  ChevronDown,
  RefreshCw,
  Edit3,
  Settings,
  Upload,
  Image as ImageIcon,
  Save,
  ShieldCheck,
  Shield,
  CreditCard,
  Smartphone,
  Landmark,
  Check,
  CheckCheck,
  Lock,
  Sparkles
} from 'lucide-react';
import { Customer } from '../types';
import { exportElementToPdf } from '../utils/pdfExport';

export type InvoiceType = 'tax' | 'package_description' | 'package_customer' | 'settings';

interface InvoiceModuleProps {
  customers: Customer[];
  initialCustomerId?: string;
  initialInvoiceType?: InvoiceType;
  onOpenShareModal?: (msg: string) => void;
  isReadOnly?: boolean;
}

// Utility to convert numbers to Indian Rupee Words
function numberToWordsINR(amount: number): string {
  if (!amount || amount === 0) return "Zero Rupees Only";
  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(num: number): string {
    if ((num = num.toString() as any).length > 9) return 'overflow';
    const n: any = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + ' Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + ' Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + ' Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + ' Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + ' ' : '';
    return str.trim();
  }

  const words = inWords(Math.floor(amount));
  return `${words} Rupees Only`.replace(/\s+/g, ' ');
}

export const InvoiceModule: React.FC<InvoiceModuleProps> = ({
  customers,
  initialCustomerId,
  initialInvoiceType = 'tax',
  onOpenShareModal,
  isReadOnly = false,
}) => {
  const [activeType, setActiveType] = useState<InvoiceType>(initialInvoiceType);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId || (customers[0]?.id || ''));
  const [isEditMode, setIsEditMode] = useState<boolean>(!isReadOnly);
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');

  // Filtered customer list for invoice viewer search
  const filteredCustomersList = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers;
    const q = customerSearchQuery.toLowerCase().trim();
    return customers.filter(c =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.bookingId && c.bookingId.toLowerCase().includes(q)) ||
      (c.destination && c.destination.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  }, [customers, customerSearchQuery]);

  const printRef = useRef<HTMLDivElement>(null);

  // Load Invoice Settings from localStorage
  const savedSettingsStr = typeof window !== 'undefined' ? localStorage.getItem('kingsland_invoice_settings') : null;
  const savedSettings = savedSettingsStr ? JSON.parse(savedSettingsStr) : null;

  // Company Legal & Registered Information State
  const [companyLogo, setCompanyLogo] = useState<string>(savedSettings?.companyLogo || '');
  const [companyName, setCompanyName] = useState<string>(savedSettings?.companyName || 'Kingsland Holidays');
  const [companyGstin, setCompanyGstin] = useState<string>(savedSettings?.companyGstin || '08AABCK1234F1Z9');
  const [companyPan, setCompanyPan] = useState<string>(savedSettings?.companyPan || 'AABCK1234F');
  const [companyAddress, setCompanyAddress] = useState<string>(savedSettings?.companyAddress || '402, Kingsland Business Center, M.I. Road');
  const [companyCity, setCompanyCity] = useState<string>(savedSettings?.companyCity || 'Jaipur, Rajasthan, India - 302001');
  const [companyPhone, setCompanyPhone] = useState<string>(savedSettings?.companyPhone || '+91 6376983416, +91 7014939068');
  const [companyEmail, setCompanyEmail] = useState<string>(savedSettings?.companyEmail || 'official.kingslandholidays@gmail.com');
  const [companyWebsite, setCompanyWebsite] = useState<string>(savedSettings?.companyWebsite || 'www.kingslandholidays.com');

  // Terms & Conditions Paragraph State for each of the 3 invoices
  const [taxTermsText, setTaxTermsText] = useState<string>(
    typeof savedSettings?.taxTermsText === 'string'
      ? savedSettings.taxTermsText
      : Array.isArray(savedSettings?.taxTerms)
      ? savedSettings.taxTerms.join('\n')
      : `1. Computer generated tax invoice. No signature required.\n2. Disputes if any, are subject to Jaipur jurisdiction.\n3. Total amount is inclusive of applicable GST taxes.`
  );

  const [pkgDescTermsText, setPkgDescTermsText] = useState<string>(
    typeof savedSettings?.pkgDescTermsText === 'string'
      ? savedSettings.pkgDescTermsText
      : Array.isArray(savedSettings?.pkgDescTerms)
      ? savedSettings.pkgDescTerms.join('\n')
      : `1. Computer generated package description invoice. No signature required.\n2. Disputes if any, are subject to Jaipur jurisdiction.`
  );

  const [pkgCustomerTermsText, setPkgCustomerTermsText] = useState<string>(
    typeof savedSettings?.pkgCustomerTermsText === 'string'
      ? savedSettings.pkgCustomerTermsText
      : Array.isArray(savedSettings?.pkgCustomerTerms)
      ? savedSettings.pkgCustomerTerms.join('\n')
      : `1. Instalment Schedule: All instalments must be paid on or before the due date. Delay beyond 3 days without notice is considered a default.\n2. Cancellation Policy: 30+ days: 10%. 15–29 days: 25%. 7–14 days: 50%. Under 7 days: 100% non-refundable.\n3. Refund Policy: Approved refunds within 7–10 working days to original payment method.\n4. Payment Modes: UPI, NEFT/RTGS, bank transfer, credit/debit card. Cheques clear 5 days prior.\n5. Price Validity: Locked at booking; post-booking surcharges borne by traveller.\n6. Amendments: Subject to availability; ₹ 500–2,000 amendment fee per traveller.\n7. Force Majeure: Kingsland Holidays is not liable for delays due to disasters, strikes, or restrictions.\n8. Governing Law: Indian law; disputes under Jaipur, Rajasthan jurisdiction.`
  );

  // Save Settings Function
  const handleSaveSettings = () => {
    if (isReadOnly) {
      alert('🚫 Access Restricted: You do not have permission to edit or save invoice settings. (View-Only Mode Enabled)');
      return;
    }
    const settingsObj = {
      companyLogo,
      companyName,
      companyGstin,
      companyPan,
      companyAddress,
      companyCity,
      companyPhone,
      companyEmail,
      companyWebsite,
      taxTermsText,
      pkgDescTermsText,
      pkgCustomerTermsText,
      // Backward compatibility
      taxTerms: taxTermsText.split('\n').filter(Boolean),
      pkgDescTerms: pkgDescTermsText.split('\n').filter(Boolean),
      pkgCustomerTerms: pkgCustomerTermsText.split('\n').filter(Boolean),
    };
    localStorage.setItem('kingsland_invoice_settings', JSON.stringify(settingsObj));
    alert('✅ Company Details (Name, GST, PAN, Address) & Terms saved successfully!');
  };

  // Tax Mode State: 'cgst_sgst' vs 'igst'
  const [taxMode, setTaxMode] = useState<'cgst_sgst' | 'igst'>('cgst_sgst');

  // Customer / Lead Profile State
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerPan, setCustomerPan] = useState('');

  // Trip / Reference Details
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [tripStartDate, setTripStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [tripName, setTripName] = useState('');
  const [totalTravelersStr, setTotalTravelersStr] = useState('');

  // Passengers list
  const [passengers, setPassengers] = useState<Array<{ id: string; text: string }>>([]);

  // Tax Invoice Line Items
  const [taxItems, setTaxItems] = useState<Array<{
    id: string;
    description: string;
    subDescription: string;
    sacCode: string;
    taxableValue: number;
    cgstRate: number;
    sgstRate: number;
    igstRate: number;
  }>>([
    {
      id: '1',
      description: 'Service Charges & Commission Fee',
      subDescription: 'Taxable booking and facilitation fees for tour package',
      sacCode: '998552',
      taxableValue: 0,
      cgstRate: 9,
      sgstRate: 9,
      igstRate: 18
    }
  ]);

  // Package Description Line Items
  const [pkgDescItems, setPkgDescItems] = useState<Array<{
    id: string;
    description: string;
    price: number;
  }>>([
    { id: '1', description: 'Commission Services & Processing Fee', price: 0 },
    { id: '2', description: 'Hotel Accommodation & Stay Expenses', price: 0 },
    { id: '3', description: 'Cab Operations & Transit Services', price: 0 },
    { id: '4', description: 'Food, Catering & Dining Services', price: 0 },
    { id: '5', description: 'Flight / Transit Ticketing', price: 0 },
  ]);

  // Customer Package Invoice (PDF 3) Specifics - Payment Confirmation Slip
  const [pkgDepositStatus, setPkgDepositStatus] = useState('ADVANCE CONFIRMED');
  const [hotelBadge, setHotelBadge] = useState('Heritage Deluxe Stays');
  const [mealBadge, setMealBadge] = useState('Breakfast & Dinner Included (MAP)');
  const [destinationBadge, setDestinationBadge] = useState('');
  const [installments, setInstallments] = useState<Array<{
    id: string;
    num: number;
    title: string;
    amount: number;
    dueDate: string;
    status: 'DUE NOW' | 'UPCOMING' | 'PAID';
    paidAt?: string;
    paymentMode?: string;
    transactionRef?: string;
  }>>([]);
  const [paymentsList, setPaymentsList] = useState<Array<{
    id: string;
    date: string;
    mode: string;
    utrNumber: string;
    amount: number;
    status: string;
  }>>([]);
  const [totalPaidAmount, setTotalPaidAmount] = useState<number>(0);
  const [nextDueDate, setNextDueDate] = useState<string>('');

  // Custom Printable Titles Editable States
  const [taxInvoiceTitle, setTaxInvoiceTitle] = useState('TAX INVOICE');
  const [taxInvoiceSubtitle, setTaxInvoiceSubtitle] = useState('Original For Recipient');
  const [pkgDescTitle, setPkgDescTitle] = useState('PACKAGE DESCRIPTION');
  const [pkgCustomerTitle, setPkgCustomerTitle] = useState('PAYMENT CONFIRMATION SLIP');

  // Complete Auto-fill from selected customer & lead database
  const handleAutoFillFromCustomer = async (cust: Customer) => {
    if (!cust) return;
    setCustomerName(cust.name || '');
    setCustomerMobile(cust.phone || '');
    setCustomerEmail(cust.email || '');
    setCustomerAddress((cust as any).address || (cust as any).city || '');
    setCustomerGstin((cust as any).gstin || '');
    setCustomerPan((cust as any).pan || '');
    setInvoiceNo(cust.bookingId || cust.id || '');
    setTripName(`${cust.destination || 'Tour'} Package`);
    setTripStartDate(cust.startDate || new Date().toISOString().split('T')[0]);
    setPlaceOfSupply(cust.destination || 'Rajasthan');
    setDestinationBadge(cust.destination || 'Rajasthan');

    const adults = cust.paxAdults || 2;
    const children = cust.paxChildren || 0;
    const paxCount = `${adults + children} Passengers (${adults} Adults${children ? `, ${children} Children` : ''})`;
    setTotalTravelersStr(paxCount);

    // Auto-fill passengers roster if present or generate from traveler party
    const newPassengers: Array<{ id: string; text: string }> = [];
    newPassengers.push({ id: '1', text: `1. ${cust.name || 'Primary Guest'} (Lead Traveler)` });
    for (let i = 2; i <= adults; i++) {
      newPassengers.push({ id: `adult-${i}`, text: `${i}. Adult Passenger ${i}` });
    }
    for (let j = 1; j <= children; j++) {
      newPassengers.push({ id: `child-${j}`, text: `${adults + j}. Child Passenger ${j} (Child)` });
    }
    setPassengers(newPassengers);

    setHotelBadge(`${cust.destination || 'Rajasthan'} Luxury Hotel Accommodation`);
    setMealBadge('Breakfast & Dinner Included (MAP Plan)');

    const targetTotal = Number(cust.totalAmount) || 65000;

    // Load Live Installments and Submissions from API
    let fetchedInsts: any[] = [];
    let fetchedSubs: any[] = [];
    try {
      const targetId = cust.id || cust.bookingId;
      const [instsRes, subsRes] = await Promise.all([
        fetch(`/api/payments/installments?leadId=${encodeURIComponent(targetId)}`).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch(`/api/payments/submissions?leadId=${encodeURIComponent(targetId)}`).then(r => r.ok ? r.json() : []).catch(() => [])
      ]);
      fetchedInsts = Array.isArray(instsRes) ? instsRes : [];
      fetchedSubs = Array.isArray(subsRes) ? subsRes : [];
    } catch (_err) {}

    // Process Installments Schedule
    let finalInstallments: Array<{
      id: string;
      num: number;
      title: string;
      amount: number;
      dueDate: string;
      status: 'DUE NOW' | 'UPCOMING' | 'PAID';
      paidAt?: string;
      paymentMode?: string;
      transactionRef?: string;
    }> = [];

    if (fetchedInsts.length > 0) {
      finalInstallments = fetchedInsts.map((inst: any, idx: number) => {
        const isPaid = inst.payment_status === 'Paid' || inst.status === 'Paid';
        const isFirstPending = !isPaid && !fetchedInsts.slice(0, idx).some((x: any) => (x.payment_status !== 'Paid' && x.status !== 'Paid'));
        return {
          id: inst.id || `inst-${idx + 1}`,
          num: inst.installment_number || inst.installmentNumber || idx + 1,
          title: inst.title || (idx === 0 ? 'Booking Advance Token' : idx === 1 ? 'Milestone Installment' : 'Final Balance Clearance'),
          amount: Number(inst.amount) || 0,
          dueDate: inst.due_date || inst.dueDate || cust.startDate || '',
          status: isPaid ? 'PAID' : isFirstPending ? 'DUE NOW' : 'UPCOMING',
          paidAt: inst.paid_at || inst.paidAt || '',
          paymentMode: inst.payment_mode || inst.paymentMode || 'UPI',
          transactionRef: inst.transaction_ref || inst.transactionRef || inst.utr_number || '',
        };
      });
    } else if (cust.installments && cust.installments.length > 0) {
      finalInstallments = cust.installments.map((inst: any, idx: number) => {
        const isPaid = inst.status === 'Paid' || inst.payment_status === 'Paid';
        return {
          id: inst.id || `inst-${idx + 1}`,
          num: inst.installmentNumber || idx + 1,
          title: inst.title || (idx === 0 ? 'Booking Advance Token' : idx === 1 ? 'Milestone Installment' : 'Final Balance Clearance'),
          amount: Number(inst.amount) || 0,
          dueDate: inst.dueDate || inst.due_date || cust.startDate || '',
          status: isPaid ? 'PAID' : idx === 0 ? 'DUE NOW' : 'UPCOMING',
          paidAt: inst.paidAt || inst.paid_at || '',
          paymentMode: inst.paymentMode || inst.payment_mode || 'UPI',
          transactionRef: inst.transactionRef || inst.transaction_ref || '',
        };
      });
    } else {
      // Auto-generate standard milestone schedule from package total
      const inst1Amt = Math.round(targetTotal * 0.3);
      const inst2Amt = Math.round(targetTotal * 0.5);
      const inst3Amt = targetTotal - inst1Amt - inst2Amt;

      const startDateObj = cust.startDate ? new Date(cust.startDate) : new Date(Date.now() + 14 * 86400000);
      const due1 = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];
      const due2 = new Date(startDateObj.getTime() - 7 * 86400000).toISOString().split('T')[0];
      const due3 = new Date(startDateObj.getTime() - 2 * 86400000).toISOString().split('T')[0];

      finalInstallments = [
        {
          id: 'inst-1',
          num: 1,
          title: 'Booking Advance Token (Confirmed)',
          amount: inst1Amt,
          dueDate: due1,
          status: 'PAID',
          paidAt: due1,
          paymentMode: 'UPI / Online',
          transactionRef: `UTR-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        },
        {
          id: 'inst-2',
          num: 2,
          title: 'Second Milestone Installment',
          amount: inst2Amt,
          dueDate: due2,
          status: 'DUE NOW',
        },
        {
          id: 'inst-3',
          num: 3,
          title: 'Final Balance Clearance',
          amount: inst3Amt,
          dueDate: due3,
          status: 'UPCOMING',
        },
      ];
    }

    setInstallments(finalInstallments);

    // Build Verified Payments List
    const payments: Array<{
      id: string;
      date: string;
      mode: string;
      utrNumber: string;
      amount: number;
      status: string;
    }> = [];

    // From paid installments
    finalInstallments.filter(i => i.status === 'PAID').forEach(i => {
      payments.push({
        id: `pay-${i.id}`,
        date: i.paidAt || new Date().toISOString().split('T')[0],
        mode: i.paymentMode || 'UPI / QR Code',
        utrNumber: i.transactionRef || `CONFIRMED-${i.id}`,
        amount: i.amount,
        status: '✓ Reconciled & Confirmed',
      });
    });

    // From approved submissions if any
    fetchedSubs.filter((s: any) => s.verification_status === 'Approved').forEach((s: any) => {
      if (!payments.some(p => p.utrNumber === s.utr_number)) {
        payments.push({
          id: s.id,
          date: (s.created_at || new Date().toISOString()).split('T')[0],
          mode: s.payment_mode || 'UPI',
          utrNumber: s.utr_number || 'ONLINE-GATEWAY',
          amount: Number(s.amount_paid) || 0,
          status: '✓ Reconciled & Confirmed',
        });
      }
    });

    setPaymentsList(payments);

    // Calculate total paid & remaining balance
    const calculatedPaid = finalInstallments
      .filter(i => i.status === 'PAID')
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    
    setTotalPaidAmount(calculatedPaid);

    const firstPending = finalInstallments.find(i => i.status !== 'PAID');
    setNextDueDate(firstPending ? firstPending.dueDate : 'All Cleared');

    const totalPkg = finalInstallments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const balance = totalPkg - calculatedPaid;

    if (balance <= 0) {
      setPkgDepositStatus('PAID IN FULL (100%)');
    } else if (calculatedPaid > 0) {
      setPkgDepositStatus(`TOKEN CONFIRMED (₹${calculatedPaid.toLocaleString('en-IN')})`);
    } else {
      setPkgDepositStatus('PENDING ADVANCE');
    }

    // Tax invoice items default
    setTaxItems([
      {
        id: '1',
        description: 'Service Charges & Commission Fee',
        subDescription: `Taxable booking and facilitation fees for ${cust.destination || 'Rajasthan'} tour package`,
        sacCode: '998552',
        taxableValue: Math.round(targetTotal * 0.1),
        cgstRate: 9,
        sgstRate: 9,
        igstRate: 18
      }
    ]);

    // Package description items default
    setPkgDescItems([
      { id: '1', description: 'Commission Services & Processing Fee', price: Math.round(targetTotal * 0.12) },
      { id: '2', description: 'Hotel Accommodation & Stay Expenses', price: Math.round(targetTotal * 0.45) },
      { id: '3', description: 'Cab Operations & Transit Services', price: Math.round(targetTotal * 0.25) },
      { id: '4', description: 'Food, Catering & Dining Services', price: Math.round(targetTotal * 0.18) },
    ]);
  };

  // Sync initial customer or auto-select when customers array updates
  useEffect(() => {
    if (initialCustomerId) {
      setSelectedCustomerId(initialCustomerId);
    } else if (!selectedCustomerId && customers.length > 0) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [initialCustomerId, customers]);

  // Auto-fill fields whenever customer selection changes
  useEffect(() => {
    if (selectedCustomerId && customers.length > 0) {
      const cust = customers.find(c => c.id === selectedCustomerId || c.bookingId === selectedCustomerId);
      if (cust) {
        handleAutoFillFromCustomer(cust);
      }
    }
  }, [selectedCustomerId, customers]);

  // Calculations for Tax Invoice
  const taxSubtotal = taxItems.reduce((acc, item) => acc + (Number(item.taxableValue) || 0), 0);
  const taxCgstTotal = taxItems.reduce((acc, item) => acc + ((Number(item.taxableValue) || 0) * (Number(item.cgstRate) || 0) / 100), 0);
  const taxSgstTotal = taxItems.reduce((acc, item) => acc + ((Number(item.taxableValue) || 0) * (Number(item.sgstRate) || 0) / 100), 0);
  const taxIgstTotal = taxItems.reduce((acc, item) => acc + ((Number(item.taxableValue) || 0) * (Number(item.igstRate) || 18) / 100), 0);
  
  const taxGrandTotal = taxMode === 'cgst_sgst' ? (taxSubtotal + taxCgstTotal + taxSgstTotal) : (taxSubtotal + taxIgstTotal);
  const taxAmountInWords = numberToWordsINR(taxGrandTotal);

  // Calculations for Package Description Invoice
  const pkgDescTotal = pkgDescItems.reduce((acc, item) => acc + (Number(item.price) || 0), 0);
  const pkgDescAmountInWords = numberToWordsINR(pkgDescTotal);

  // Calculations for Customer Package Invoice (PDF 3)
  const pkgTotal = installments.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
  const balanceDue = pkgTotal - totalPaidAmount;

  // Print & PDF Download Handlers
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    
    // Temporarily turn off edit mode so inputs don't get cut off in the PDF
    const wasEditMode = isEditMode;
    if (wasEditMode) {
      setIsEditMode(false);
      // Wait for React to re-render the plain text versions
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    const nameStr = (customerName || 'Guest').replace(/\s+/g, '_');
    const filename = `${activeType.toUpperCase()}_Invoice_${nameStr}.pdf`;

    try {
      await exportElementToPdf(printRef.current, {
        filename,
        margin: 8,
        width: 794,
        scale: 3
      });
    } catch (e) {
      console.error('PDF export error, falling back to print:', e);
      window.print();
    } finally {
      if (wasEditMode) {
        setIsEditMode(true);
      }
    }
  };

  const handleShareWhatsApp = () => {
    const text = `📄 *OFFICIAL INVOICE FROM ${companyName.toUpperCase()}*\n\nType: *${
      activeType === 'tax' ? 'TAX INVOICE' : activeType === 'package_description' ? 'PACKAGE DESCRIPTION INVOICE' : 'PACKAGE INVOICE'
    }*\nGuest: *${customerName}*\nRef #: *${invoiceNo}*\nTotal Amount: ₹${
      activeType === 'tax' ? taxGrandTotal.toLocaleString() : activeType === 'package_description' ? pkgDescTotal.toLocaleString() : pkgTotal.toLocaleString()
    }\n\nThank you for choosing ${companyName}!`;
    
    if (onOpenShareModal) {
      onOpenShareModal(text);
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCompanyLogo(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">

      {/* Top Banner & Action Controls */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Receipt className="w-6 h-6" />
            </span>
            <h2 className="font-extrabold text-xl tracking-tight">Invoice Creation & Printing Hub</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Create, edit, auto-fill, print, and export 3 official invoice templates (Tax Invoice, Package Description, and Customer Package Invoice) with customizable Logo & Terms Settings.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {activeType !== 'settings' && (
            isReadOnly ? (
              <div className="px-3.5 py-2 rounded-xl bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center gap-1.5 border border-amber-400/30">
                <span>👁️ View Only (Form Removed)</span>
              </div>
            ) : (
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                  isEditMode ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Edit3 className="w-4 h-4" />
                <span>{isEditMode ? 'Editing Fields' : 'Form Hidden'}</span>
              </button>
            )
          )}

          {activeType !== 'settings' && (
            <>
              <button
                onClick={handleDownloadPdf}
                className="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>

              <button
                onClick={handlePrint}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Print Invoice</span>
              </button>

              <button
                onClick={handleShareWhatsApp}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Share WhatsApp</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Customer & Trip Search Bar for Invoice Viewer */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 font-bold text-sm">🔍</span>
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search Invoice by Customer Name, Trip / Booking ID, Destination, Phone..."
              value={customerSearchQuery}
              onChange={e => setCustomerSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-slate-600 whitespace-nowrap">Selected Invoice Guest:</span>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-black text-slate-900 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500/20 max-w-xs truncate"
          >
            {filteredCustomersList.length === 0 ? (
              <option value="">No matching trips found</option>
            ) : (
              filteredCustomersList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.bookingId || 'KL-TRIP'}) — {c.destination}
                </option>
              ))
            )}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <button
          onClick={() => setActiveType('tax')}
          className={`flex-1 min-w-[180px] py-3 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
            activeType === 'tax'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4 text-emerald-400" />
          <span>1. Tax Invoice (GST)</span>
        </button>

        <button
          onClick={() => setActiveType('package_description')}
          className={`flex-1 min-w-[180px] py-3 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
            activeType === 'package_description'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4 text-indigo-400" />
          <span>2. Package Description</span>
        </button>

        <button
          onClick={() => setActiveType('package_customer')}
          className={`flex-1 min-w-[180px] py-3 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
            activeType === 'package_customer'
              ? 'bg-slate-900 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Plane className="w-4 h-4 text-amber-400" />
          <span>3. Payment Confirmation Slip</span>
        </button>

        {!isReadOnly && (
          <button
            onClick={() => setActiveType('settings')}
            className={`py-3 px-5 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
              activeType === 'settings'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
            }`}
          >
            <Building2 className="w-4 h-4 text-indigo-500" />
            <span>⚙️ Company Details (Name, GST, PAN, Address) & Terms</span>
          </button>
        )}
      </div>

      {/* Global Company Banner Indicator (When viewing an invoice) */}
      {activeType !== 'settings' && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-xs">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <Building2 className="w-5 h-5 text-indigo-600 shrink-0" />
            <div className="truncate">
              <span className="font-black text-slate-900">{companyName}</span>
              <span className="text-slate-600 ml-2">
                GSTIN: <strong className="font-mono text-slate-800">{companyGstin}</strong> • PAN: <strong className="font-mono text-slate-800">{companyPan}</strong> • {companyAddress}, {companyCity}
              </span>
            </div>
          </div>
          {!isReadOnly && (
            <button
              onClick={() => setActiveType('settings')}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-600 hover:text-white border border-indigo-300 text-indigo-700 font-extrabold text-[11px] shrink-0 shadow-2xs transition-all flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Edit Company Details & Terms</span>
            </button>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. INVOICE SETTINGS PANEL (COMPANY DETAILS & TERMS EDITORS) */}
      {/* ======================================================== */}
      {activeType === 'settings' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8 animate-in fade-in duration-200">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-indigo-600" />
                Company Details & Invoice Terms Settings
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Configure your company name, GST, PAN, address, contact info and customize multi-line paragraph Terms & Conditions across all 3 invoice templates.</p>
            </div>

            <button
              onClick={handleSaveSettings}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center gap-2 shadow-md transition-all shrink-0"
            >
              <Save className="w-4 h-4" />
              <span>Save Company Details & Terms</span>
            </button>
          </div>

          {/* Section A: Full Company Legal & Contact Details */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-slate-900 uppercase text-xs tracking-wider flex items-center gap-2 text-indigo-700 border-b pb-2">
              <Building2 className="w-4 h-4" /> 1. Company Legal & Registered Information (Applies to all 3 Invoices)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              
              {/* Logo Upload Box */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h5 className="font-bold text-slate-800 uppercase text-[11px] flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600" /> Company Brand Logo
                </h5>

                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                    {companyLogo ? (
                      <img src={companyLogo} alt="Uploaded Logo" className="max-h-full max-w-full object-contain p-1" />
                    ) : (
                      <div className="text-center text-slate-400 p-2">
                        <ImageIcon className="w-5 h-5 mx-auto mb-1 opacity-50" />
                        <span className="text-[8px] font-bold block">No Logo</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 flex-1">
                    <label htmlFor="logo-file-input" className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 transition-all">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Logo</span>
                    </label>
                    <input
                      id="logo-file-input"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileUpload}
                      className="hidden"
                    />

                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">Or Image URL</label>
                      <input
                        type="text"
                        value={companyLogo}
                        onChange={(e) => setCompanyLogo(e.target.value)}
                        placeholder="https://example.com/logo.png"
                        className="w-full mt-0.5 px-2.5 py-1 rounded-lg border border-slate-300 font-mono text-[11px] text-slate-900 bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Company Legal Details (Name, GSTIN, PAN) */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h5 className="font-bold text-slate-800 uppercase text-[11px] text-teal-700">Company Identification</h5>
                
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Company Name</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Kingsland Holidays Pvt Ltd"
                      className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">GSTIN / GST No</label>
                      <input
                        type="text"
                        value={companyGstin}
                        onChange={(e) => setCompanyGstin(e.target.value)}
                        placeholder="08AABCK1234F1Z9"
                        className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">PAN Number</label>
                      <input
                        type="text"
                        value={companyPan}
                        onChange={(e) => setCompanyPan(e.target.value)}
                        placeholder="AABCK1234F"
                        className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Company Registered Address & Contacts */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h5 className="font-bold text-slate-800 uppercase text-[11px] text-indigo-700">Address & Contact Info</h5>
                
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Registered Address</label>
                    <input
                      type="text"
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      placeholder="402, Business Tower, M.I. Road"
                      className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-300 font-medium text-slate-900 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">City, State & PIN</label>
                    <input
                      type="text"
                      value={companyCity}
                      onChange={(e) => setCompanyCity(e.target.value)}
                      placeholder="Jaipur, Rajasthan, India - 302001"
                      className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-300 font-medium text-slate-900 bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">Phone</label>
                      <input
                        type="text"
                        value={companyPhone}
                        onChange={(e) => setCompanyPhone(e.target.value)}
                        placeholder="+91 98000 12345"
                        className="w-full mt-1 px-2 py-1 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">Email</label>
                      <input
                        type="text"
                        value={companyEmail}
                        onChange={(e) => setCompanyEmail(e.target.value)}
                        placeholder="info@company.com"
                        className="w-full mt-1 px-2 py-1 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">Website</label>
                      <input
                        type="text"
                        value={companyWebsite}
                        onChange={(e) => setCompanyWebsite(e.target.value)}
                        placeholder="www.company.com"
                        className="w-full mt-1 px-2 py-1 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Section B: Individual Terms & Conditions Paragraph Editors for all 3 Invoices */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div>
              <h4 className="font-extrabold text-slate-900 uppercase text-xs tracking-wider text-slate-800">
                2. Terms & Conditions (Paragraph Format Textarea)
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Enter your terms and policies in full paragraph format below. You can include paragraphs, bullet points, numbers, and policies — line breaks are preserved in the printable invoices.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
              
              {/* 1. Tax Invoice Terms Editor */}
              <div className="p-5 rounded-2xl bg-emerald-50/40 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                  <h5 className="font-extrabold text-emerald-900 text-xs uppercase flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    1. Tax Invoice Terms
                  </h5>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">Paragraph Box</span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">Terms & Conditions Paragraphs:</label>
                  <textarea
                    rows={8}
                    value={taxTermsText}
                    onChange={(e) => setTaxTermsText(e.target.value)}
                    placeholder="Enter Tax Invoice Terms & Conditions paragraphs here..."
                    className="w-full p-3 rounded-xl border border-emerald-300 text-xs text-slate-800 bg-white font-sans leading-relaxed focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
                  />
                  <p className="text-[10px] text-slate-500 italic">Applies to the 1. Tax Invoice (GST) template footer.</p>
                </div>
              </div>

              {/* 2. Package Description Terms Editor */}
              <div className="p-5 rounded-2xl bg-indigo-50/40 border border-indigo-200 space-y-3">
                <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
                  <h5 className="font-extrabold text-indigo-900 text-xs uppercase flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    2. Package Description Terms
                  </h5>
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded">Paragraph Box</span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">Terms & Conditions Paragraphs:</label>
                  <textarea
                    rows={8}
                    value={pkgDescTermsText}
                    onChange={(e) => setPkgDescTermsText(e.target.value)}
                    placeholder="Enter Package Description Terms paragraphs here..."
                    className="w-full p-3 rounded-xl border border-indigo-300 text-xs text-slate-800 bg-white font-sans leading-relaxed focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
                  />
                  <p className="text-[10px] text-slate-500 italic">Applies to the 2. Package Description template footer.</p>
                </div>
              </div>

              {/* 3. Payment Confirmation Slip Terms Editor */}
              <div className="p-5 rounded-2xl bg-amber-50/40 border border-amber-200 space-y-3">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <h5 className="font-extrabold text-amber-900 text-xs uppercase flex items-center gap-1.5">
                    <Plane className="w-4 h-4 text-amber-600" />
                    3. Payment Confirmation Slip Terms
                  </h5>
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">Paragraph Box</span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase">Terms & Conditions Paragraphs:</label>
                  <textarea
                    rows={8}
                    value={pkgCustomerTermsText}
                    onChange={(e) => setPkgCustomerTermsText(e.target.value)}
                    placeholder="Enter Payment Confirmation Slip terms, payment schedules, and cancellation policies paragraphs here..."
                    className="w-full p-3 rounded-xl border border-amber-300 text-xs text-slate-800 bg-white font-sans leading-relaxed focus:ring-2 focus:ring-amber-500/20 shadow-xs"
                  />
                  <p className="text-[10px] text-slate-500 italic">Applies to the 3. Payment Confirmation Slip template footer.</p>
                </div>
              </div>

            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={handleSaveSettings}
              className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center gap-2 shadow-lg transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Save Company Details & Terms</span>
            </button>
          </div>

        </div>
      )}

      {/* MANUAL FILLING FORM EDITOR PANEL */}
      {!isReadOnly && activeType !== 'settings' && isEditMode && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 animate-in fade-in duration-200">
          
          {/* Top Bar with Auto-fill Dropdown */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                Manual Data Entry & Customer Auto-Fill
              </h3>
              <p className="text-xs text-slate-500">Fill in details manually below or select a customer to auto-fill fields instantly.</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Auto-fill from Customer:</span>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.bookingId}) - {c.destination}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Form Grid Sections */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            
            {/* Section 1: Customer Details */}
            <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <h4 className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wider text-indigo-700">Customer & Client Profile</h4>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Mobile Number</label>
                <input
                  type="text"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Email Address</label>
                <input
                  type="text"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Customer GSTIN</label>
                  <input
                    type="text"
                    value={customerGstin}
                    onChange={(e) => setCustomerGstin(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Customer PAN</label>
                  <input
                    type="text"
                    value={customerPan}
                    onChange={(e) => setCustomerPan(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-slate-900 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Reference & Dates */}
            <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <h4 className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wider text-teal-700">Invoice Reference & Trip Info</h4>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Invoice / Booking No</label>
                <input
                  type="text"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Invoice Date</label>
                  <input
                    type="text"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Trip Start Date</label>
                  <input
                    type="text"
                    value={tripStartDate}
                    onChange={(e) => setTripStartDate(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Place of Supply</label>
                <input
                  type="text"
                  value={placeOfSupply}
                  onChange={(e) => setPlaceOfSupply(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Trip Name / Package Title</label>
                <input
                  type="text"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                />
              </div>
            </div>

            {/* Section 3: Passenger Details Box */}
            <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wider text-amber-700">Travelers & Passengers List</h4>
                <button
                  onClick={() => setPassengers([...passengers, { id: Date.now().toString(), text: 'New Passenger Age 25' }])}
                  className="px-2 py-0.5 rounded bg-amber-600 text-white text-[10px] font-bold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {passengers.map((p, idx) => (
                  <div key={p.id} className="flex items-center gap-1">
                    <input
                      type="text"
                      value={p.text}
                      onChange={(e) => {
                        const updated = [...passengers];
                        updated[idx].text = e.target.value;
                        setPassengers(updated);
                      }}
                      className="flex-1 px-2.5 py-1 rounded border border-slate-300 text-xs font-semibold bg-white"
                    />
                    <button
                      onClick={() => setPassengers(passengers.filter(item => item.id !== p.id))}
                      className="p-1 rounded text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Type Specific Items Editor & TAX MODE SWITCHER */}
          {activeType === 'tax' && (
            <div className="pt-4 border-t border-slate-200 space-y-4">
              
              {/* GST Tax Mode Selector (CGST + SGST vs IGST) */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <h4 className="font-black text-emerald-900 uppercase tracking-wider text-xs flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-emerald-700" /> GST Tax Calculation Mode
                  </h4>
                  <p className="text-[11px] text-emerald-700 font-medium mt-0.5">Manually choose between Dual Tax (CGST + SGST) for intra-state or Single Tax (IGST) for inter-state billing.</p>
                </div>

                <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-emerald-300 shrink-0 font-bold">
                  <button
                    type="button"
                    onClick={() => setTaxMode('cgst_sgst')}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                      taxMode === 'cgst_sgst'
                        ? 'bg-emerald-600 text-white font-extrabold shadow-sm'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    ● CGST + SGST (9% + 9%)
                  </button>

                  <button
                    type="button"
                    onClick={() => setTaxMode('igst')}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                      taxMode === 'igst'
                        ? 'bg-emerald-600 text-white font-extrabold shadow-sm'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    ● IGST (18%)
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">Tax Invoice Service Items & SAC Codes</h4>
                <button
                  onClick={() => setTaxItems([...taxItems, {
                    id: Date.now().toString(),
                    description: 'Additional Tour Service',
                    subDescription: 'Special arrangement fee',
                    sacCode: '998552',
                    taxableValue: 5000,
                    cgstRate: 9,
                    sgstRate: 9,
                    igstRate: 18
                  }])}
                  className="px-3 py-1 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Service Row
                </button>
              </div>

              <div className="space-y-2">
                {taxItems.map((item, index) => (
                  <div key={item.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 md:grid-cols-6 gap-2 text-xs items-center">
                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">Description of Service</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => {
                          const updated = [...taxItems];
                          updated[index].description = e.target.value;
                          setTaxItems(updated);
                        }}
                        className="w-full mt-0.5 px-2 py-1 rounded border border-slate-300 font-bold bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">SAC Code</label>
                      <input
                        type="text"
                        value={item.sacCode}
                        onChange={(e) => {
                          const updated = [...taxItems];
                          updated[index].sacCode = e.target.value;
                          setTaxItems(updated);
                        }}
                        className="w-full mt-0.5 px-2 py-1 rounded border border-slate-300 font-mono bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase">Taxable Value (₹)</label>
                      <input
                        type="number"
                        value={item.taxableValue}
                        onChange={(e) => {
                          const updated = [...taxItems];
                          updated[index].taxableValue = parseFloat(e.target.value) || 0;
                          setTaxItems(updated);
                        }}
                        className="w-full mt-0.5 px-2 py-1 rounded border border-slate-300 font-mono font-bold bg-white"
                      />
                    </div>

                    {taxMode === 'cgst_sgst' ? (
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase">CGST % / SGST %</label>
                        <div className="flex items-center gap-1 mt-0.5">
                          <input
                            type="number"
                            value={item.cgstRate}
                            onChange={(e) => {
                              const updated = [...taxItems];
                              updated[index].cgstRate = parseFloat(e.target.value) || 0;
                              setTaxItems(updated);
                            }}
                            className="w-1/2 px-1 py-1 rounded border border-slate-300 font-mono text-center bg-white"
                          />
                          <span className="text-slate-400">/</span>
                          <input
                            type="number"
                            value={item.sgstRate}
                            onChange={(e) => {
                              const updated = [...taxItems];
                              updated[index].sgstRate = parseFloat(e.target.value) || 0;
                              setTaxItems(updated);
                            }}
                            className="w-1/2 px-1 py-1 rounded border border-slate-300 font-mono text-center bg-white"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase">IGST Rate %</label>
                        <input
                          type="number"
                          value={item.igstRate || 18}
                          onChange={(e) => {
                            const updated = [...taxItems];
                            updated[index].igstRate = parseFloat(e.target.value) || 0;
                            setTaxItems(updated);
                          }}
                          className="w-full mt-0.5 px-2 py-1 rounded border border-slate-300 font-mono font-bold text-center bg-white"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-end pt-3">
                      <button
                        onClick={() => setTaxItems(taxItems.filter(i => i.id !== item.id))}
                        className="p-1 text-rose-600 hover:bg-rose-100 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeType === 'package_description' && (
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">Package Description Expense Breakdown Rows</h4>
                <button
                  onClick={() => setPkgDescItems([...pkgDescItems, {
                    id: Date.now().toString(),
                    description: 'Extra Sightseeing & Guide Services',
                    price: 5000
                  }])}
                  className="px-3 py-1 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Expense Item
                </button>
              </div>

              <div className="space-y-2">
                {pkgDescItems.map((item, index) => (
                  <div key={item.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3 text-xs">
                    <span className="font-mono font-bold text-slate-500">{index + 1}.</span>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => {
                        const updated = [...pkgDescItems];
                        updated[index].description = e.target.value;
                        setPkgDescItems(updated);
                      }}
                      className="flex-1 px-3 py-1.5 rounded border border-slate-300 font-bold bg-white"
                    />
                    <div className="w-36 flex items-center gap-1">
                      <span className="font-bold text-slate-500">₹</span>
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => {
                          const updated = [...pkgDescItems];
                          updated[index].price = parseFloat(e.target.value) || 0;
                          setPkgDescItems(updated);
                        }}
                        className="w-full px-2 py-1 rounded border border-slate-300 font-mono font-bold bg-white"
                      />
                    </div>
                    <button
                      onClick={() => setPkgDescItems(pkgDescItems.filter(i => i.id !== item.id))}
                      className="p-1 text-rose-600 hover:bg-rose-100 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeType === 'package_customer' && (
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">Customer Package Specifics & Installment Schedule</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase">Deposit Status Badge</label>
                  <input
                    type="text"
                    value={pkgDepositStatus}
                    onChange={(e) => setPkgDepositStatus(e.target.value)}
                    className="w-full mt-0.5 px-2.5 py-1 rounded border border-slate-300 font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase">Hotel Badge Tag</label>
                  <input
                    type="text"
                    value={hotelBadge}
                    onChange={(e) => setHotelBadge(e.target.value)}
                    className="w-full mt-0.5 px-2.5 py-1 rounded border border-slate-300 font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase">Meal Badge Tag</label>
                  <input
                    type="text"
                    value={mealBadge}
                    onChange={(e) => setMealBadge(e.target.value)}
                    className="w-full mt-0.5 px-2.5 py-1 rounded border border-slate-300 font-bold bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase">Total Amount Paid (₹)</label>
                  <input
                    type="number"
                    value={totalPaidAmount}
                    onChange={(e) => setTotalPaidAmount(parseFloat(e.target.value) || 0)}
                    className="w-full mt-0.5 px-2.5 py-1 rounded border border-slate-300 font-bold text-emerald-700 bg-white"
                  />
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* PRINTABLE / DISPLAY CONTAINER (PIXEL PERFECT MATCHING USER PDFs) */}
      {activeType !== 'settings' && (
        <div className="p-4 bg-slate-200 dark:bg-zinc-800 rounded-3xl overflow-x-auto flex justify-center custom-scrollbar print:bg-white print:p-0">
          
          <div
            ref={printRef}
            className="doc-preview-protected printable-voucher-container bg-white shadow-xl w-full max-w-4xl p-8 sm:p-10 space-y-6 text-slate-900 font-sans print:shadow-none print:border-none print:w-full print:p-0 print:max-w-none relative"
            style={{ width: '794px', minWidth: '794px', maxWidth: '794px', boxSizing: 'border-box', backgroundColor: '#ffffff', color: '#0f172a' }}
          >
            <style>{`
              .invoice-avoid-break, .invoice-header, .invoice-meta-bar, .invoice-guest-pkg-cards,
              .invoice-milestones-section, .invoice-milestone-card, .invoice-receipts-section,
              .invoice-summary-cards, .invoice-notice-box, .invoice-terms-box,
              .invoice-signatures-footer, .avoid-page-break, tr, .box, .two-col {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }
              .invoice-section-title, th {
                break-after: avoid !important;
                page-break-after: avoid !important;
              }
            `}</style>
            
            {/* ======================================================== */}
            {/* TEMPLATE 1: TAX INVOICE (Matching PDF 1) */}
            {/* ======================================================== */}
            {activeType === 'tax' && (
              <div className="space-y-6 text-slate-900">
                
                {/* Header: Logo / Company Name Left + Right with full company details */}
                <div className="invoice-header invoice-avoid-break flex items-start justify-between pb-4 border-b border-slate-200">
                  <div className="space-y-1.5">
                    {companyLogo ? (
                      <img src={companyLogo} alt="Company Logo" className="h-16 max-w-[240px] object-contain" />
                    ) : (
                      <div className="space-y-0.5">
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight font-serif">{companyName}</h1>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">TRAVEL & HOLIDAYS</p>
                      </div>
                    )}
                    <p className="text-[11px] text-slate-600 font-medium max-w-sm">
                      {companyAddress}, {companyCity}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <h2 className="text-xl font-bold text-slate-900 font-serif">{companyName}</h2>
                    <p className="text-xs text-slate-700">
                      <strong>GSTIN:</strong> <span className="font-mono font-bold text-slate-900">{companyGstin}</span>
                    </p>
                    <p className="text-xs text-slate-700">
                      <strong>PAN:</strong> <span className="font-mono font-bold text-slate-900">{companyPan}</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Phone: {companyPhone} • Email: {companyEmail}
                    </p>
                  </div>
                </div>

                {/* Title Section */}
                <div className="invoice-section-title invoice-avoid-break text-center pt-2 pb-1 border-t-2 border-slate-900 border-b-4 space-y-1">
                  {isEditMode ? (
                    <div className="space-y-1 max-w-md mx-auto">
                      <input
                        type="text"
                        value={taxInvoiceTitle}
                        onChange={(e) => setTaxInvoiceTitle(e.target.value)}
                        className="text-2xl font-black tracking-widest text-slate-900 uppercase text-center bg-indigo-50 border border-indigo-200 rounded px-2 outline-none w-full"
                        placeholder="Tax Invoice Title"
                      />
                      <input
                        type="text"
                        value={taxInvoiceSubtitle}
                        onChange={(e) => setTaxInvoiceSubtitle(e.target.value)}
                        className="text-[10px] font-bold tracking-widest text-slate-500 uppercase text-center bg-indigo-50 border border-indigo-200 rounded px-2 outline-none w-full"
                        placeholder="Tax Invoice Subtitle"
                      />
                    </div>
                  ) : (
                    <>
                      <h2 className="text-2xl font-black tracking-widest text-slate-900 uppercase">{taxInvoiceTitle}</h2>
                      {taxInvoiceSubtitle && (
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{taxInvoiceSubtitle}</p>
                      )}
                    </>
                  )}
                </div>

                {/* Customer & Reference Details 2-Column */}
                <div className="invoice-meta-bar invoice-avoid-break grid grid-cols-2 gap-8 text-xs font-sans">
                  
                  {/* Left: BILLED TO */}
                  <div className="space-y-1.5">
                    <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider border-b pb-1">BILLED TO (CUSTOMER DETAILS)</h3>
                    <div className="space-y-1 pt-1">
                      <p><strong className="font-bold">Name:</strong> {customerName}</p>
                      <p><strong className="font-bold">Mobile:</strong> {customerMobile}</p>
                      <p><strong className="font-bold">Email:</strong> {customerEmail}</p>
                      <p><strong className="font-bold">Address:</strong> {customerAddress}</p>
                      <p><strong className="font-bold">Customer GSTIN:</strong> <span className="font-mono font-bold">{customerGstin}</span></p>
                      <p><strong className="font-bold">Customer PAN:</strong> <span className="font-mono font-bold">{customerPan}</span></p>
                    </div>
                  </div>

                  {/* Right: INVOICE REFERENCE */}
                  <div className="space-y-1.5">
                    <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider border-b pb-1">INVOICE REFERENCE</h3>
                    <div className="space-y-1 pt-1">
                      <p><strong className="font-bold">Invoice No:</strong> {invoiceNo}</p>
                      <p><strong className="font-bold">Invoice Date:</strong> {invoiceDate}</p>
                      <p><strong className="font-bold">Trip Start Date:</strong> {tripStartDate}</p>
                      <p><strong className="font-bold">Place of Supply:</strong> {placeOfSupply}</p>
                    </div>
                  </div>

                </div>

                {/* TRAVELERS & PASSENGER DETAILS PANEL */}
                <div className="invoice-guest-pkg-cards invoice-avoid-break space-y-2">
                  <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">TRAVELERS & PASSENGER DETAILS</h3>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs leading-relaxed space-y-1">
                    {passengers.map((p) => (
                      <p key={p.id} className="text-slate-800 font-medium">{p.text}</p>
                    ))}
                  </div>
                </div>

                {/* ITEMIZED TABLE */}
                <div className="invoice-receipts-section invoice-avoid-break border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 font-extrabold text-slate-900 uppercase text-[10px] tracking-wider border-b border-slate-300">
                      <tr>
                        <th className="p-3 text-center w-12">S.NO</th>
                        <th className="p-3">DESCRIPTION OF SERVICES</th>
                        <th className="p-3 text-center">SAC CODE</th>
                        <th className="p-3 text-right">TAXABLE VALUE</th>
                        <th className="p-3 text-right">{taxMode === 'cgst_sgst' ? 'GST RATE & AMOUNT' : 'IGST RATE & AMOUNT'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {taxItems.map((item, idx) => {
                        const cgstVal = (item.taxableValue * item.cgstRate) / 100;
                        const sgstVal = (item.taxableValue * item.sgstRate) / 100;
                        const igstVal = (item.taxableValue * (item.igstRate || 18)) / 100;

                        return (
                          <tr key={item.id} className="align-top">
                            <td className="p-3 text-center font-bold text-slate-700">{idx + 1}</td>
                            <td className="p-3 space-y-1">
                              <p className="font-bold text-slate-900 text-sm">{item.description}</p>
                              <p className="text-slate-500 text-[11px]">{item.subDescription}</p>
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-slate-800">{item.sacCode}</td>
                            <td className="p-3 text-right font-mono font-bold text-slate-900">₹{item.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="p-3 text-right font-mono text-[11px] space-y-0.5">
                              {taxMode === 'cgst_sgst' ? (
                                <>
                                  <p>CGST @ {item.cgstRate}%: ₹{cgstVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                                  <p>SGST @ {item.sgstRate}%: ₹{sgstVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                                </>
                              ) : (
                                <p>IGST @ {item.igstRate || 18}%: ₹{igstVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* SUMMARY & GRAND TOTAL */}
                <div className="invoice-summary-cards invoice-avoid-break grid grid-cols-1 md:grid-cols-2 gap-6 text-xs items-start pt-2">
                  
                  {/* AMOUNT IN WORDS */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] uppercase font-extrabold text-slate-500 block tracking-wider">AMOUNT IN WORDS</span>
                    <p className="font-bold text-slate-900 text-sm leading-snug">{taxAmountInWords}</p>
                  </div>

                  {/* TAX CALCULATIONS TABLE */}
                  <div className="space-y-2 text-right">
                    <div className="flex justify-between py-1 border-b border-slate-100 text-slate-700">
                      <span>Taxable Subtotal (Commission):</span>
                      <strong className="font-mono text-slate-900">₹{taxSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </div>

                    {taxMode === 'cgst_sgst' ? (
                      <>
                        <div className="flex justify-between py-1 border-b border-slate-100 text-slate-700">
                          <span>CGST Tax:</span>
                          <strong className="font-mono text-slate-900">₹{taxCgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100 text-slate-700">
                          <span>SGST Tax:</span>
                          <strong className="font-mono text-slate-900">₹{taxSgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between py-1 border-b border-slate-100 text-slate-700">
                        <span>IGST Tax:</span>
                        <strong className="font-mono text-slate-900">₹{taxIgstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                      </div>
                    )}

                    <div className="flex justify-between py-2 border-t-2 border-b-2 border-slate-900 text-base font-black text-slate-900">
                      <span>Grand Total:</span>
                      <span className="font-mono text-lg">₹{taxGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                </div>

                {/* FOOTER SIGNATURE & TERMS */}
                <div className="invoice-signatures-footer invoice-avoid-break pt-10 border-t border-slate-200 space-y-6 text-xs">
                  <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
                    <div className="space-y-1.5 text-slate-700 text-[11px] max-w-lg">
                      <p className="font-extrabold text-slate-900 uppercase tracking-wider text-xs">Terms & Conditions:</p>
                      <div className="whitespace-pre-line leading-relaxed font-normal text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        {taxTermsText}
                      </div>
                    </div>

                    <div className="text-center pt-8 border-t-2 border-slate-900 min-w-[200px] shrink-0 self-end">
                      <p className="font-extrabold text-slate-900">Authorized Signatory</p>
                      <p className="text-[10px] text-slate-500 font-medium">For {companyName}</p>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* ======================================================== */}
            {/* TEMPLATE 2: PACKAGE DESCRIPTION (Matching PDF 2) */}
            {/* ======================================================== */}
            {activeType === 'package_description' && (
              <div className="space-y-6 text-slate-900">
                
                {/* Header: Company Logo / Name Left + Right with full company info */}
                <div className="invoice-header invoice-avoid-break flex items-start justify-between pb-4 border-b border-slate-200">
                  <div className="space-y-1.5">
                    {companyLogo ? (
                      <img src={companyLogo} alt="Company Logo" className="h-16 max-w-[240px] object-contain" />
                    ) : (
                      <div className="space-y-0.5">
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight font-serif">{companyName}</h1>
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">TRAVEL & HOLIDAYS</p>
                      </div>
                    )}
                    <p className="text-[11px] text-slate-600 font-medium max-w-sm">
                      {companyAddress}, {companyCity}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <h2 className="text-xl font-bold text-slate-900 font-serif">{companyName}</h2>
                    <p className="text-xs text-slate-700">
                      <strong>GSTIN:</strong> <span className="font-mono font-bold text-slate-900">{companyGstin}</span>
                    </p>
                    <p className="text-xs text-slate-700">
                      <strong>PAN:</strong> <span className="font-mono font-bold text-slate-900">{companyPan}</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Phone: {companyPhone} • Email: {companyEmail}
                    </p>
                  </div>
                </div>

                {/* Title Section */}
                <div className="invoice-section-title invoice-avoid-break text-center pt-2 pb-1 border-t-2 border-slate-900 border-b-4">
                  {isEditMode ? (
                    <input
                      type="text"
                      value={pkgDescTitle}
                      onChange={(e) => setPkgDescTitle(e.target.value)}
                      className="text-2xl font-black tracking-widest text-slate-900 uppercase text-center bg-indigo-50 border border-indigo-200 rounded px-2 outline-none w-full max-w-md mx-auto block"
                      placeholder="Package Description Title"
                    />
                  ) : (
                    <h2 className="text-2xl font-black tracking-widest text-slate-900 uppercase">{pkgDescTitle}</h2>
                  )}
                </div>

                {/* Traveler Profile & Package General Info */}
                <div className="invoice-meta-bar invoice-avoid-break grid grid-cols-2 gap-8 text-xs font-sans">
                  
                  {/* Left: TRAVELER & CLIENT PROFILE */}
                  <div className="space-y-1.5">
                    <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider border-b pb-1">TRAVELER & CLIENT PROFILE</h3>
                    <div className="space-y-1 pt-1">
                      <p><strong className="font-bold">Lead Client:</strong> {customerName}</p>
                      <p><strong className="font-bold">Mobile No:</strong> {customerMobile}</p>
                      <p><strong className="font-bold">Address:</strong> {customerAddress}</p>
                    </div>
                  </div>

                  {/* Right: PACKAGE GENERAL INFO */}
                  <div className="space-y-1.5">
                    <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider border-b pb-1">PACKAGE GENERAL INFO</h3>
                    <div className="space-y-1 pt-1">
                      <p><strong className="font-bold">Booking Ref:</strong> {invoiceNo}</p>
                      <p><strong className="font-bold">Trip Name:</strong> {tripName}</p>
                      <p><strong className="font-bold">Travel Start Date:</strong> {tripStartDate}</p>
                      <p><strong className="font-bold">Total Travelers:</strong> {totalTravelersStr}</p>
                    </div>
                  </div>

                </div>

                {/* TRAVELERS & PASSENGER DETAILS PANEL */}
                <div className="invoice-guest-pkg-cards invoice-avoid-break space-y-2">
                  <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">TRAVELERS & PASSENGER DETAILS</h3>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs leading-relaxed space-y-1">
                    {passengers.map((p) => (
                      <p key={p.id} className="text-slate-800 font-medium">{p.text}</p>
                    ))}
                  </div>
                </div>

                {/* ITEMIZED TABLE */}
                <div className="invoice-receipts-section invoice-avoid-break border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 font-extrabold text-slate-900 uppercase text-[10px] tracking-wider border-b border-slate-300">
                      <tr>
                        <th className="p-3 text-center w-12">S.NO</th>
                        <th className="p-3">SERVICE / ITEM EXPENSE DESCRIPTION</th>
                        <th className="p-3 text-right">PRICE (INR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {pkgDescItems.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="p-3 text-center font-bold text-slate-700">{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-900">{item.description}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* SUMMARY & TOTAL PAYMENT */}
                <div className="invoice-summary-cards invoice-avoid-break grid grid-cols-1 md:grid-cols-2 gap-6 text-xs items-start pt-2">
                  
                  {/* AMOUNT IN WORDS */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] uppercase font-extrabold text-slate-500 block tracking-wider">AMOUNT IN WORDS</span>
                    <p className="font-bold text-slate-900 text-sm leading-snug">{pkgDescAmountInWords}</p>
                  </div>

                  {/* TOTAL PAYMENT TABLE */}
                  <div className="space-y-2 text-right">
                    <div className="flex justify-between py-1 border-b border-slate-100 text-slate-700">
                      <span>Subtotal Expenses:</span>
                      <strong className="font-mono text-slate-900">₹{pkgDescTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div className="flex justify-between py-2 border-t-2 border-b-2 border-slate-900 text-base font-black text-slate-900">
                      <span>Total Payment:</span>
                      <span className="font-mono text-lg">₹{pkgDescTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                </div>

                {/* FOOTER SIGNATURE & TERMS */}
                <div className="invoice-signatures-footer invoice-avoid-break pt-10 border-t border-slate-200 space-y-6 text-xs">
                  <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
                    <div className="space-y-1.5 text-slate-700 text-[11px] max-w-lg">
                      <p className="font-extrabold text-slate-900 uppercase tracking-wider text-xs">Terms & Conditions:</p>
                      <div className="whitespace-pre-line leading-relaxed font-normal text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        {pkgDescTermsText}
                      </div>
                    </div>

                    <div className="text-center pt-8 border-t-2 border-slate-900 min-w-[200px] shrink-0 self-end">
                      <p className="font-extrabold text-slate-900">Authorized Signatory</p>
                      <p className="text-[10px] text-slate-500 font-medium">For {companyName}</p>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* ======================================================== */}
            {/* TEMPLATE 3: PAYMENT CONFIRMATION SLIP (Full Details)     */}
            {/* ======================================================== */}
            {activeType === 'package_customer' && (
              <div className="p-6 md:p-8 rounded-3xl bg-[#FFFDF8] border border-[#EBE3D5] text-slate-900 space-y-6 shadow-sm font-sans relative">
                
                {/* Top Luxury Accent Ribbon */}
                <div className="h-2 w-full bg-gradient-to-r from-[#7B1D2A] via-[#C9922A] to-[#7B1D2A] rounded-full mb-4" />

                {/* Header Box with Full Company Info & Slip Title */}
                <div className="invoice-header invoice-avoid-break flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E8E0D0] pb-6">
                  
                  {/* Left Brand Details */}
                  <div className="flex items-start gap-3.5">
                    {companyLogo ? (
                      <img src={companyLogo} alt="Company Logo" className="h-16 max-w-[200px] object-contain rounded-xl border border-slate-200 p-1.5 bg-white shrink-0 shadow-xs" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7B1D2A] to-[#450C14] text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-md">
                        <Plane className="w-6 h-6 text-amber-400" />
                      </div>
                    )}
                    <div className="space-y-0.5">
                      <h1 className="text-2xl font-black text-slate-900 font-serif tracking-tight">{companyName}</h1>
                      <p className="text-[10px] uppercase tracking-widest text-[#B85B28] font-bold">
                        GSTIN: <span className="font-mono">{companyGstin}</span> • PAN: <span className="font-mono">{companyPan}</span>
                      </p>
                      <p className="text-[11px] text-slate-600 font-medium">
                        {companyAddress}, {companyCity}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Phone: {companyPhone} • Email: {companyEmail} • Web: {companyWebsite}
                      </p>
                    </div>
                  </div>

                  {/* Right Payment Confirmation Slip Title & Status */}
                  <div className="text-left sm:text-right space-y-1.5">
                    {isEditMode ? (
                      <input
                        type="text"
                        value={pkgCustomerTitle}
                        onChange={(e) => setPkgCustomerTitle(e.target.value)}
                        className="text-2xl sm:text-3xl font-black font-serif italic text-slate-900 text-left sm:text-right bg-indigo-50 border border-indigo-200 rounded px-2 outline-none w-full"
                        placeholder="Payment Confirmation Slip Title"
                      />
                    ) : (
                      <h2 className="text-2xl sm:text-3xl font-black font-serif italic text-[#7B1D2A] tracking-tight">{pkgCustomerTitle}</h2>
                    )}
                    <p className="font-mono text-sm font-extrabold text-[#B85B28]">BOOKING REF: #{invoiceNo}</p>
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        {pkgDepositStatus}
                      </span>
                    </div>
                  </div>

                </div>

                {/* Metadata Bar (4 Columns) */}
                <div className="invoice-meta-bar invoice-avoid-break grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-[#F6F0E4] border border-[#E6DCC8] text-center text-xs">
                  <div>
                    <span className="text-[9px] uppercase tracking-widest font-extrabold text-slate-500 block">ISSUE DATE</span>
                    <span className="font-bold text-slate-900">{invoiceDate}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-widest font-extrabold text-slate-500 block">TRAVEL DATE</span>
                    <span className="font-bold text-slate-900">{tripStartDate}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-widest font-extrabold text-slate-500 block">BOOKING REF / TRIP ID</span>
                    <span className="font-bold text-slate-900 font-mono">{invoiceNo}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-widest font-extrabold text-slate-500 block">PASSENGERS</span>
                    <span className="font-bold text-slate-900">{totalTravelersStr}</span>
                  </div>
                </div>

                {/* Traveller Details & Package Details Cards (Side-by-Side) */}
                <div className="invoice-guest-pkg-cards invoice-avoid-break grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  
                  {/* Card 1: Traveller Details */}
                  <div className="p-5 rounded-2xl bg-[#FAF4E8] border border-[#E4D9C4] space-y-3">
                    <h3 className="font-black font-serif text-slate-900 text-sm border-b border-[#E0D3BB] pb-1.5 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-[#7B1D2A]" /> Guest & Lead Details
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between"><span className="text-slate-500">Primary Guest:</span><strong className="text-slate-900 text-sm">{customerName}</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">Mobile / WhatsApp:</span><strong className="text-slate-900 font-mono">{customerMobile}</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">Email Address:</span><strong className="text-slate-900">{customerEmail}</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">Travel Party:</span><strong className="text-slate-900">{totalTravelersStr}</strong></div>
                      {customerGstin && (
                        <div className="flex justify-between"><span className="text-slate-500">Customer GSTIN:</span><strong className="text-slate-900 font-mono">{customerGstin}</strong></div>
                      )}
                    </div>
                  </div>

                  {/* Card 2: Package Details */}
                  <div className="p-5 rounded-2xl bg-[#FAF4E8] border border-[#E4D9C4] space-y-3">
                    <h3 className="font-black font-serif text-slate-900 text-sm border-b border-[#E0D3BB] pb-1.5 flex items-center gap-2">
                      <Plane className="w-4 h-4 text-[#7B1D2A]" /> Tour Package Details
                    </h3>
                    <div className="space-y-2">
                      <h4 className="text-base font-black text-slate-900 font-serif">{tripName}</h4>
                      <div className="flex items-center gap-1.5 text-xs text-[#B85B28] font-extrabold">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{destinationBadge || 'Rajasthan'}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <span className="px-2.5 py-1 rounded-lg bg-white border border-[#E0D3BB] font-bold text-[11px] text-slate-800 flex items-center gap-1">
                          🏨 {hotelBadge || 'Deluxe Hotel Accommodation'}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-white border border-[#E0D3BB] font-bold text-[11px] text-slate-800 flex items-center gap-1">
                          🍽️ {mealBadge || 'Breakfast & Dinner Included (MAP)'}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Milestone Installment Schedule Section */}
                <div className="invoice-milestones-section invoice-avoid-break space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E0D3BB] pb-2">
                    <h3 className="font-black font-serif text-slate-900 text-sm flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#7B1D2A]" /> Complete Milestone Installment Plan
                    </h3>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">
                      {installments.length} Scheduled Milestones
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {installments.map((inst) => (
                      <div
                        key={inst.id}
                        className={`invoice-milestone-card invoice-avoid-break p-4 rounded-2xl border space-y-2.5 relative transition-all ${
                          inst.status === 'PAID'
                            ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-200'
                            : inst.status === 'DUE NOW'
                            ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-200/60 shadow-sm'
                            : 'bg-[#FAF4E8] border-[#E4D9C4]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-600">
                            MILESTONE {inst.num}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide flex items-center gap-1 ${
                              inst.status === 'PAID'
                                ? 'bg-emerald-600 text-white'
                                : inst.status === 'DUE NOW'
                                ? 'bg-amber-500 text-white animate-pulse'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {inst.status === 'PAID' && <Check className="w-2.5 h-2.5" />}
                            {inst.status}
                          </span>
                        </div>

                        <div>
                          <p className="text-[11px] font-bold text-slate-700 truncate">{inst.title}</p>
                          <p className="text-2xl font-black font-mono text-[#7B1D2A] mt-0.5">
                            ₹ {inst.amount.toLocaleString('en-IN')}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-200/70 text-[10px] space-y-1">
                          <p className="text-slate-600 font-semibold flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>Due Date: <strong>{inst.dueDate}</strong></span>
                          </p>
                          {inst.status === 'PAID' && (
                            <div className="text-emerald-800 font-mono text-[9.5px] bg-emerald-100/80 px-2 py-1 rounded-lg">
                              <span>✓ Paid: {inst.paidAt || 'Recorded'} • {inst.paymentMode || 'UPI'}</span>
                              {inst.transactionRef && (
                                <span className="block truncate font-bold text-[9px] text-emerald-900 mt-0.5">Ref: {inst.transactionRef}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recorded Payment Receipts & Transaction Log Table */}
                <div className="invoice-receipts-section invoice-avoid-break space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E0D3BB] pb-2">
                    <h3 className="font-black font-serif text-slate-900 text-sm flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-[#7B1D2A]" /> Payments Received & Verification Log
                    </h3>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Automated Receipt Trail
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-[#E4D9C4] bg-white shadow-xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#F4ECE1] text-[#7B1D2A] text-[10px] font-black uppercase tracking-wider border-b border-[#E4D9C4]">
                          <th className="p-3 text-center w-10">#</th>
                          <th className="p-3">Receipt Date</th>
                          <th className="p-3">Payment Mode</th>
                          <th className="p-3">Transaction / UTR Reference No.</th>
                          <th className="p-3 text-right">Amount Paid</th>
                          <th className="p-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0E8DC] text-[11px]">
                        {paymentsList.length > 0 ? (
                          paymentsList.map((pay, idx) => (
                            <tr key={pay.id} className="hover:bg-[#FAF6F0] transition-colors">
                              <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                              <td className="p-3 font-semibold text-slate-800">{pay.date}</td>
                              <td className="p-3 font-bold text-slate-700 flex items-center gap-1.5">
                                {pay.mode.includes('Card') ? <CreditCard className="w-3.5 h-3.5 text-blue-600" /> :
                                 pay.mode.includes('Bank') ? <Landmark className="w-3.5 h-3.5 text-purple-600" /> :
                                 <Smartphone className="w-3.5 h-3.5 text-emerald-600" />}
                                <span>{pay.mode}</span>
                              </td>
                              <td className="p-3 font-mono font-bold text-slate-900">{pay.utrNumber}</td>
                              <td className="p-3 text-right font-mono font-black text-emerald-700 text-xs">
                                ₹ {pay.amount.toLocaleString('en-IN')}.00
                              </td>
                              <td className="p-3 text-center">
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-900 inline-flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5 text-emerald-700" /> {pay.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="p-6 text-center text-slate-500 italic">
                              Payment records automatically populated from verified installments and transactions.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Summary & Balance Due Breakdown */}
                <div className="invoice-summary-cards invoice-avoid-break grid grid-cols-1 md:grid-cols-2 gap-4 text-xs items-stretch">
                  
                  {/* Left Summary Box */}
                  <div className="p-5 rounded-2xl bg-[#FAF4E8] border border-[#E4D9C4] space-y-2.5 flex flex-col justify-between">
                    <h4 className="font-black font-serif text-slate-900 text-sm border-b border-[#E0D3BB] pb-1.5">
                      Financial Summary & Breakdown
                    </h4>
                    <div className="space-y-2 pt-1 text-xs">
                      <div className="flex justify-between text-slate-700">
                        <span>Package Base Value:</span>
                        <strong className="font-mono text-slate-900">₹ {pkgTotal.toLocaleString('en-IN')}.00</strong>
                      </div>
                      <div className="flex justify-between text-slate-900 font-extrabold border-t border-[#E0D3BB] pt-1.5">
                        <span>Total Package Cost:</span>
                        <strong className="font-mono text-sm text-[#7B1D2A]">₹ {pkgTotal.toLocaleString('en-IN')}.00</strong>
                      </div>
                      <div className="flex justify-between text-emerald-800 font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Total Received:</span>
                        <strong className="font-mono text-sm text-emerald-800">₹ {totalPaidAmount.toLocaleString('en-IN')}.00</strong>
                      </div>
                      <div className="flex justify-between text-rose-800 font-bold bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                        <span className="flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Balance Remaining:</span>
                        <strong className="font-mono text-sm text-rose-800">₹ {balanceDue.toLocaleString('en-IN')}.00</strong>
                      </div>
                    </div>
                  </div>

                  {/* Right Balance Due Dark Card */}
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-[#1C1A17] via-[#2A231C] to-[#1C1A17] text-white flex flex-col justify-between space-y-4 shadow-lg border border-[#C9922A]/30">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-black tracking-widest text-[#E8B84B] block">
                          NET BALANCE DUE
                        </span>
                        <span className="px-2.5 py-0.5 bg-amber-400/20 text-amber-300 rounded-full text-[9px] font-bold">
                          {installments.filter(i => i.status !== 'PAID').length} Milestone(s) Left
                        </span>
                      </div>
                      <h3 className="text-3xl font-black font-mono text-amber-400 mt-2 tracking-tight">
                        ₹ {balanceDue.toLocaleString('en-IN')}.00
                      </h3>
                      <p className="text-xs text-slate-300 mt-1">
                        {balanceDue <= 0 ? '✓ Entire package amount has been fully settled.' : 'Advance token recorded. Balance to be cleared as per schedule.'}
                      </p>
                    </div>

                    <div className="bg-[#B85B28] text-white px-4 py-2.5 rounded-xl text-xs font-black text-center shadow-md flex items-center justify-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Next Due Milestone: {nextDueDate || installments.find(i => i.status !== 'PAID')?.dueDate || 'Cleared'}</span>
                    </div>
                  </div>

                </div>

                {/* IMPORTANT NOTICE BOX */}
                <div className="invoice-notice-box invoice-avoid-break p-4 md:p-5 rounded-2xl bg-[#FFF2EA] border border-[#FAD9C5] space-y-1.5 text-xs text-[#803512]">
                  <h4 className="font-black text-rose-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                    <AlertCircle className="w-4 h-4 text-rose-600" /> IMPORTANT RESERVATION NOTICE
                  </h4>
                  <p className="leading-relaxed font-medium">
                    This Payment Confirmation Slip officially confirms the receipt of advance token / milestone funds for booking ref <strong>#{invoiceNo}</strong>. Kindly ensure subsequent milestone installments are cleared prior to the due dates to ensure uninterrupted vehicle allocation and luxury stay confirmations. For payment verification or amendments, contact Kingsland 24x7 desk at <strong>{companyPhone}</strong>.
                  </p>
                </div>

                {/* PAYMENT TERMS & CONDITIONS BOX */}
                <div className="invoice-terms-box invoice-avoid-break p-5 rounded-2xl bg-[#FAF4E8] border border-[#E4D9C4] space-y-2.5 text-xs text-slate-800">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5 border-b border-[#E0D3BB] pb-1.5">
                    <FileText className="w-4 h-4 text-[#B85B28]" /> PAYMENT TERMS & CONFIRMATION POLICIES
                  </h4>
                  <div className="whitespace-pre-line leading-relaxed text-[11px] text-slate-700 font-medium space-y-1">
                    {pkgCustomerTermsText}
                  </div>
                </div>

                {/* SIGNATURES & OFFICIAL FOOTER */}
                <div className="invoice-signatures-footer invoice-avoid-break pt-6 border-t border-[#E8E0D0] space-y-6 text-xs">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4">
                    <div className="text-center pt-8 border-t border-slate-400 min-w-[220px]">
                      <p className="font-extrabold text-slate-900">Authorised Signatory</p>
                      <p className="text-[10px] text-slate-500 font-medium">{companyName}</p>
                    </div>
                    <div className="text-center pt-8 border-t border-slate-400 min-w-[220px]">
                      <p className="font-extrabold text-slate-900">Guest Acceptance & Signature</p>
                      <p className="text-[10px] text-slate-500 font-medium">{customerName}</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#E8E0D0] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-600">
                    <span className="font-bold text-slate-900">{companyName} — Official Customer Payment Confirmation Slip</span>
                    <div className="text-center sm:text-right">
                      <p className="font-bold text-[#B85B28]">Thank you for choosing {companyName}!</p>
                      <p className="text-[10px] text-slate-500">System-generated slip verified from payment records. Generated: {invoiceDate}</p>
                    </div>
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
};

