import {invoiceMoney,taxTotals,numberToWordsINR,invoiceToday,readInvoiceSettings} from '../utils/invoiceMath';
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
  const savedSettings = useMemo(()=>readInvoiceSettings(),[]);

  // Company Legal & Registered Information State
  const [companyLogo, setCompanyLogo] = useState<string>(savedSettings?.companyLogo || '');
  const [companyName, setCompanyName] = useState<string>(savedSettings?.companyName || 'Kingsland Holidays');
  const [companyGstin, setCompanyGstin] = useState<string>(savedSettings?.companyGstin === '08AABCK1234F1Z9' ? '' : (savedSettings?.companyGstin || ''));
  const [companyPan, setCompanyPan] = useState<string>(savedSettings?.companyPan === 'AABCK1234F' ? '' : (savedSettings?.companyPan || ''));
  const [companyAddress, setCompanyAddress] = useState<string>(savedSettings?.companyAddress === '402, Kingsland Business Center, M.I. Road' ? '' : (savedSettings?.companyAddress || ''));
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
    alert('Company details saved in this browser. Issued invoices retain their own saved copy.');
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
  const [tripId, setTripId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(invoiceToday());
  const [tripStartDate, setTripStartDate] = useState(invoiceToday());
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
  const [pkgDepositStatus, setPkgDepositStatus] = useState('AWAITING PAYMENT');
  const [hotelBadge, setHotelBadge] = useState('As per accepted itinerary');
  const [mealBadge, setMealBadge] = useState('As per accepted itinerary');
  const [destinationBadge, setDestinationBadge] = useState('');
  const [installments, setInstallments] = useState<Array<{
    id: string;
    num: number;
    title: string;
    amount: number;
    dueDate: string;
    status: 'DUE NOW' | 'UPCOMING' | 'PAID' | 'PARTIAL';
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

  const [packageTotal,setPackageTotal]=useState(0);
  const [invoiceLoading,setInvoiceLoading]=useState(false);
  const [invoiceError,setInvoiceError]=useState('');
  const [issuedId,setIssuedId]=useState('');
  const [invoiceHistory,setInvoiceHistory]=useState<any[]>([]);
  const [issuing,setIssuing]=useState(false);
  const [exporting,setExporting]=useState(false);
  const issueLock=useRef(false),requestId=useRef(crypto.randomUUID()),loadSequence=useRef(0);
  const requestJson=async(url:string,options?:RequestInit)=>{const response=await fetch(url,{...options,signal:AbortSignal.timeout(20000)});const data=await response.json();if(!response.ok)throw new Error(data.error || 'Could not load invoice data.');return data;};
  const applyFinancialData=(data:any)=>{
    setPackageTotal(data.packageTotal);setTotalPaidAmount(data.totalPaidAmount);setInstallments(data.installments || []);setPaymentsList(data.paymentsList || []);setNextDueDate(data.nextDueDate || '');setPkgDepositStatus(data.pkgDepositStatus);
  };
  const handleAutoFillFromCustomer=async(cust:Customer)=>{
    const sequence=++loadSequence.current;
    setInvoiceLoading(true);setInvoiceError('');setIssuedId('');requestId.current=crypto.randomUUID();setInvoiceNo('DRAFT');
    setCustomerName(cust.name || '');setCustomerMobile(cust.phone || '');setCustomerEmail(cust.email || '');setCustomerAddress((cust as any).address || '');setCustomerGstin((cust as any).gstin || '');setCustomerPan((cust as any).pan || '');
    setTripId(cust.bookingId || '');setTripName((cust.destination || 'Tour')+' Package');setTripStartDate(cust.startDate || '');setPlaceOfSupply(cust.destination || '');setDestinationBadge(cust.destination || '');
    setTotalTravelersStr(String((cust.paxAdults || 0)+(cust.paxChildren || 0))+' passengers');setPassengers([{id:'primary',text:cust.name+' (Lead traveller)'}]);
    setHotelBadge('As per accepted itinerary');setMealBadge('As per accepted itinerary');applyFinancialData({packageTotal:0,totalPaidAmount:0,pkgDepositStatus:'AWAITING PAYMENT'});
    setTaxItems([{id:'1',description:'Service Charges',subDescription:'Enter the actual taxable service value and applicable rates',sacCode:'',taxableValue:0,cgstRate:0,sgstRate:0,igstRate:0}]);setPkgDescItems([]);
    try{
      const [data,history]=await Promise.all([requestJson('/api/ops/invoice-data/'+encodeURIComponent(cust.id)),requestJson('/api/ops/invoices?customerId='+encodeURIComponent(cust.id))]);
      if(sequence!==loadSequence.current)return;
      applyFinancialData(data);setTripId(data.bookingId);setInvoiceHistory(history);
      setPkgDescItems([{id:'1',description:(cust.destination || 'Tour')+' package — as per accepted booking',price:data.packageTotal}]);
    }catch(error){if(sequence===loadSequence.current)setInvoiceError((error as Error).message);}
    finally{if(sequence===loadSequence.current)setInvoiceLoading(false);}
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

  const applyIssuedInvoice=(doc:any)=>{++loadSequence.current;setInvoiceLoading(false);setCompanyLogo(doc.fields.companyLogo);setCompanyName(doc.fields.companyName);setCompanyGstin(doc.fields.companyGstin);setCompanyPan(doc.fields.companyPan);setCompanyAddress(doc.fields.companyAddress);setCompanyCity(doc.fields.companyCity);setCompanyPhone(doc.fields.companyPhone);setCompanyEmail(doc.fields.companyEmail);setCompanyWebsite(doc.fields.companyWebsite);setTaxTermsText(doc.fields.taxTermsText);setPkgDescTermsText(doc.fields.pkgDescTermsText);setPkgCustomerTermsText(doc.fields.pkgCustomerTermsText);setTaxMode(doc.fields.taxMode);setCustomerName(doc.fields.customerName);setCustomerMobile(doc.fields.customerMobile);setCustomerEmail(doc.fields.customerEmail);setCustomerAddress(doc.fields.customerAddress);setCustomerGstin(doc.fields.customerGstin);setCustomerPan(doc.fields.customerPan);setTripId(doc.fields.tripId);setInvoiceNo(doc.fields.invoiceNo);setInvoiceDate(doc.fields.invoiceDate);setTripStartDate(doc.fields.tripStartDate);setPlaceOfSupply(doc.fields.placeOfSupply);setTripName(doc.fields.tripName);setTotalTravelersStr(doc.fields.totalTravelersStr);setPassengers(doc.fields.passengers);setTaxItems(doc.fields.taxItems);setPkgDescItems(doc.fields.pkgDescItems);setPkgDepositStatus(doc.fields.pkgDepositStatus);setHotelBadge(doc.fields.hotelBadge);setMealBadge(doc.fields.mealBadge);setDestinationBadge(doc.fields.destinationBadge);setInstallments(doc.fields.installments);setPaymentsList(doc.fields.paymentsList);setTotalPaidAmount(doc.fields.totalPaidAmount);setNextDueDate(doc.fields.nextDueDate);setTaxInvoiceTitle(doc.fields.taxInvoiceTitle);setTaxInvoiceSubtitle(doc.fields.taxInvoiceSubtitle);setPkgDescTitle(doc.fields.pkgDescTitle);setPkgCustomerTitle(doc.fields.pkgCustomerTitle);setPackageTotal(doc.fields.packageTotal);setActiveType(doc.document_type);setIssuedId(doc.id);setIsEditMode(false);setInvoiceError('');};
  const openIssuedInvoice=async(id:string)=>{if(!id)return;setInvoiceLoading(true);try{applyIssuedInvoice(await requestJson('/api/ops/invoices/'+encodeURIComponent(id)));}catch(error){setInvoiceError((error as Error).message);}finally{setInvoiceLoading(false);}};
  const selectDocumentType=(type:InvoiceType)=>{setActiveType(type);if(issuedId){setIssuedId('');const cust=customers.find(c=>c.id===selectedCustomerId);if(cust)handleAutoFillFromCustomer(cust);}};
  const issueCurrentInvoice=async()=>{
    if(issueLock.current || invoiceLoading || issuedId)return;issueLock.current=true;setIssuing(true);setInvoiceError('');
    try{
      const doc=await requestJson('/api/ops/invoices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({customerId:selectedCustomerId,documentType:activeType,requestId:requestId.current,fields:{companyLogo,companyName,companyGstin,companyPan,companyAddress,companyCity,companyPhone,companyEmail,companyWebsite,taxTermsText,pkgDescTermsText,pkgCustomerTermsText,taxMode,customerName,customerMobile,customerEmail,customerAddress,customerGstin,customerPan,tripId,invoiceNo,invoiceDate,tripStartDate,placeOfSupply,tripName,totalTravelersStr,passengers,taxItems,pkgDescItems,pkgDepositStatus,hotelBadge,mealBadge,destinationBadge,installments,paymentsList,totalPaidAmount,nextDueDate,taxInvoiceTitle,taxInvoiceSubtitle,pkgDescTitle,pkgCustomerTitle,packageTotal}})});
      applyIssuedInvoice(doc);setInvoiceHistory(await requestJson('/api/ops/invoices?customerId='+encodeURIComponent(selectedCustomerId)));
    }catch(error){setInvoiceError((error as Error).message);}finally{issueLock.current=false;setIssuing(false);}
  };
  // Calculations for Tax Invoice
  const tax=taxTotals(taxItems,taxMode);
  const taxSubtotal=tax.subtotal,taxCgstTotal=tax.cgst,taxSgstTotal=tax.sgst,taxIgstTotal=tax.igst,taxGrandTotal=tax.total;
  const taxAmountInWords = numberToWordsINR(taxGrandTotal);

  // Calculations for Package Description Invoice
  const pkgDescTotal = pkgDescItems.reduce((acc, item) => acc + Math.round(Number(item.price || 0)*100), 0)/100;
  const pkgDescAmountInWords = numberToWordsINR(pkgDescTotal);

  // Calculations for Customer Package Invoice (PDF 3)
  const pkgTotal = packageTotal;
  const balanceDue = Math.max(0,Math.round(pkgTotal*100)-Math.round(totalPaidAmount*100))/100;

  // Print & PDF Download Handlers
  const handlePrint = () => {
    if(invoiceLoading || invoiceError)return;
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current || exporting || invoiceLoading || invoiceError) return;
    setExporting(true);
    
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
      setExporting(false);
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
      <div className="p-6 rounded-xl bg-surface border border-line text-content shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-brand/20 text-brand-ink border border-brand-line/30">
              <Receipt className="w-6 h-6" />
            </span>
            <h2 className="font-semibold text-xl tracking-tight">Invoice Creation & Printing Hub</h2>
          </div>
          <p className="text-sm text-muted mt-1 max-w-xl">
            Prepare a draft, review booking and payment details, then issue a numbered document. Issued copies are saved for future download.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {activeType !== 'settings' && (
            isReadOnly ? (
              <div className="px-3.5 py-2 rounded-xl bg-warning-strong/20 text-warning-ink font-bold text-sm flex items-center gap-1.5 border border-warning-line/30">
                <span>👁️ View Only (Form Removed)</span>
              </div>
            ) : (
              <button
                disabled={!!issuedId} onClick={() => setIsEditMode(!isEditMode)}
                className={`px-3.5 py-2 rounded-xl font-bold text-sm flex items-center gap-1.5 transition-all ${
                  isEditMode ? 'bg-brand text-white shadow-sm' : 'bg-inverse text-slate-300 hover:bg-inverse'
                }`}
              >
                <Edit3 className="w-4 h-4" />
                <span>{issuedId ? 'Issued · read only' : isEditMode ? 'Edit details' : 'Show form'}</span>
              </button>
            )
          )}

          {activeType !== 'settings' && (
            <>
              <button
                disabled={invoiceLoading || !!invoiceError || exporting || issuing} onClick={handleDownloadPdf}
                className="px-3.5 py-2 rounded-xl bg-success-strong hover:bg-success-strong text-content font-semibold text-sm flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>{exporting ? 'Preparing PDF…' : 'Download PDF'}</span>
              </button>

              <button
                disabled={invoiceLoading || !!invoiceError || exporting || issuing} onClick={handlePrint}
                className="px-3.5 py-2 rounded-xl bg-inverse hover:bg-inverse text-white font-bold text-sm flex items-center gap-1.5 border border-line transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Print Invoice</span>
              </button>

              <button
                disabled={invoiceLoading || !!invoiceError || issuing} onClick={handleShareWhatsApp}
                className="px-3.5 py-2 rounded-xl bg-success-strong hover:bg-success-strong text-white font-bold text-sm flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Share WhatsApp</span>
              </button>
            </>
          )}
        </div>
      </div>

      {activeType!=='settings' && <section className="p-5 rounded-xl border border-line bg-surface space-y-4" aria-label="Invoice status">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-semibold text-content">{issuedId?'Issued invoice · saved copy':'Draft · review before issuing'}</p><p className="text-sm text-secondary mt-1">{issuedId?invoiceNo:'Printing a draft does not issue an invoice. Company details and tax allocations must be reviewed.'}</p></div>{!isReadOnly && !issuedId && <button disabled={invoiceLoading || !!invoiceError || issuing || !selectedCustomerId} onClick={issueCurrentInvoice} className="px-4 py-2.5 rounded-lg bg-brand text-white font-medium disabled:opacity-50">{issuing?'Issuing…':'Issue & save invoice'}</button>}{issuedId && <button onClick={()=>{const cust=customers.find(c=>c.id===selectedCustomerId);if(cust)handleAutoFillFromCustomer(cust);}} className="px-4 py-2 border border-line rounded-lg">New draft</button>}</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{[['Booking value',packageTotal],['Verified collections',totalPaidAmount],['Balance due',balanceDue]].map(([title,value])=><div key={String(title)} className="rounded-lg bg-canvas p-3"><p className="text-xs text-secondary">{title}</p><p className="text-lg font-semibold text-content mt-1">₹{invoiceMoney(Number(value))}</p></div>)}</div>
        <label className="block text-sm text-secondary">Saved documents<select aria-label="Saved invoices" value={issuedId} disabled={invoiceLoading} onChange={e=>openIssuedInvoice(e.target.value)} className="block mt-1 w-full p-2.5 bg-canvas border border-line rounded-lg text-content"><option value="">Choose an issued invoice</option>{invoiceHistory.map(doc=><option key={doc.id} value={doc.id}>{doc.invoice_number} · {doc.document_type.replaceAll('_',' ')} · {new Date(doc.created_at).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata'})}</option>)}</select></label>
      </section>}
      {invoiceLoading && <p role="status" className="p-4 rounded-lg bg-brand-soft text-brand-ink">Loading booking and verified payments…</p>}
      {invoiceError && <div role="alert" className="p-4 rounded-lg border border-danger-line bg-danger-soft text-danger-ink">{invoiceError}<button onClick={()=>{setInvoiceError('');}} className="ml-3 underline">Dismiss</button></div>}
      {/* Customer & Trip Search Bar for Invoice Viewer */}
      <div className="p-4 rounded-xl bg-surface border border-line shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <span className="p-2 rounded-xl bg-brand-soft text-brand-ink font-bold text-sm">🔍</span>
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search Invoice by Customer Name, Trip / Booking ID, Destination, Phone..."
              value={customerSearchQuery}
              onChange={e => setCustomerSearchQuery(e.target.value)}
              className="w-full bg-canvas border border-line rounded-xl px-3.5 py-2 text-sm font-bold text-content outline-none focus:border-brand-line focus:bg-surface transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-secondary whitespace-nowrap">Selected Invoice Guest:</span>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-line text-sm font-semibold text-content bg-canvas outline-none focus:ring-2 focus:ring-brand-line/20 max-w-xs truncate"
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
      <div className="flex flex-wrap gap-2 p-1.5 rounded-xl bg-surface border border-line shadow-xs">
        <button
          onClick={() => selectDocumentType('tax')}
          className={`flex-1 min-w-[180px] py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
            activeType === 'tax'
              ? 'bg-inverse text-white shadow-sm'
              : 'text-secondary hover:bg-subtle hover:text-content'
          }`}
        >
          <Receipt className="w-4 h-4 text-success-ink" />
          <span>1. Tax Invoice (GST)</span>
        </button>

        <button
          onClick={() => selectDocumentType('package_description')}
          className={`flex-1 min-w-[180px] py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
            activeType === 'package_description'
              ? 'bg-inverse text-white shadow-sm'
              : 'text-secondary hover:bg-subtle hover:text-content'
          }`}
        >
          <FileText className="w-4 h-4 text-brand-ink" />
          <span>2. Package Description</span>
        </button>

        <button
          onClick={() => selectDocumentType('package_customer')}
          className={`flex-1 min-w-[180px] py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
            activeType === 'package_customer'
              ? 'bg-inverse text-white shadow-sm'
              : 'text-secondary hover:bg-subtle hover:text-content'
          }`}
        >
          <Plane className="w-4 h-4 text-warning-ink" />
          <span>3. Payment Confirmation Slip</span>
        </button>

        {!isReadOnly && (
          <button
            onClick={() => selectDocumentType('settings')}
            className={`py-3 px-5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              activeType === 'settings'
                ? 'bg-brand text-white shadow-sm'
                : 'bg-brand-soft text-brand-ink hover:bg-brand-soft border border-brand-line'
            }`}
          >
            <Building2 className="w-4 h-4 text-brand-ink" />
            <span>⚙️ Company Details (Name, GST, PAN, Address) & Terms</span>
          </button>
        )}
      </div>

      {/* Global Company Banner Indicator (When viewing an invoice) */}
      {activeType !== 'settings' && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-brand-soft/80 border border-brand-line text-sm">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <Building2 className="w-5 h-5 text-brand-ink shrink-0" />
            <div className="truncate">
              <span className="font-semibold text-content">{companyName}</span>
              <span className="text-secondary ml-2">
                GSTIN: <strong className="font-mono text-content">{companyGstin}</strong> • PAN: <strong className="font-mono text-content">{companyPan}</strong> • {companyAddress}, {companyCity}
              </span>
            </div>
          </div>
          {!isReadOnly && (
            <button
              onClick={() => selectDocumentType('settings')}
              className="px-3 py-1.5 rounded-xl bg-surface hover:bg-brand hover:text-white border border-brand-line text-brand-ink font-semibold text-xs shrink-0 shadow-2xs transition-all flex items-center gap-1.5"
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
        <div className="bg-surface border border-line rounded-xl p-6 sm:p-8 shadow-sm space-y-8 animate-in fade-in duration-200">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h3 className="text-xl font-semibold text-content flex items-center gap-2">
                <Building2 className="w-6 h-6 text-brand-ink" />
                Company Details & Invoice Terms Settings
              </h3>
              <p className="text-sm text-secondary mt-0.5">Configure your company name, GST, PAN, address, contact info and customize multi-line paragraph Terms & Conditions across all 3 invoice templates.</p>
            </div>

            <button
              onClick={handleSaveSettings}
              className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand text-white font-semibold text-sm flex items-center gap-2 shadow-sm transition-all shrink-0"
            >
              <Save className="w-4 h-4" />
              <span>Save Company Details & Terms</span>
            </button>
          </div>

          {/* Section A: Full Company Legal & Contact Details */}
          <div className="space-y-4">
            <h4 className="font-semibold text-content uppercase text-sm tracking-wider flex items-center gap-2 text-brand-ink border-b pb-2">
              <Building2 className="w-4 h-4" /> 1. Company Legal & Registered Information (Applies to all 3 Invoices)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              
              {/* Logo Upload Box */}
              <div className="p-5 rounded-xl bg-canvas border border-line space-y-3">
                <h5 className="font-bold text-content uppercase text-xs flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-brand-ink" /> Company Brand Logo
                </h5>

                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl bg-surface border-2 border-dashed border-line flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                    {companyLogo ? (
                      <img src={companyLogo} alt="Uploaded Logo" className="max-h-full max-w-full object-contain p-1" />
                    ) : (
                      <div className="text-center text-muted p-2">
                        <ImageIcon className="w-5 h-5 mx-auto mb-1 opacity-50" />
                        <span className="text-xs font-bold block">No Logo</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 flex-1">
                    <label htmlFor="logo-file-input" className="px-3 py-1.5 rounded-xl bg-inverse hover:bg-inverse text-white font-bold text-sm cursor-pointer inline-flex items-center gap-1.5 transition-all">
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
                      <label className="block text-xs font-bold text-secondary uppercase">Or Image URL</label>
                      <input
                        type="text"
                        value={companyLogo}
                        onChange={(e) => setCompanyLogo(e.target.value)}
                        placeholder="https://example.com/logo.png"
                        className="w-full mt-0.5 px-2.5 py-1 rounded-lg border border-line font-mono text-xs text-content bg-surface"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Company Legal Details (Name, GSTIN, PAN) */}
              <div className="p-5 rounded-xl bg-canvas border border-line space-y-3">
                <h5 className="font-bold text-content uppercase text-xs text-success-ink">Company Identification</h5>
                
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-xs font-bold text-secondary uppercase">Company Name</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Kingsland Holidays Pvt Ltd"
                      className="w-full mt-1 px-3 py-1.5 rounded-lg border border-line font-bold text-content bg-surface"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-secondary uppercase">GSTIN / GST No</label>
                      <input
                        type="text"
                        value={companyGstin}
                        onChange={(e) => setCompanyGstin(e.target.value)}
                        placeholder="08AABCK1234F1Z9"
                        className="w-full mt-1 px-3 py-1.5 rounded-lg border border-line font-mono font-bold text-content bg-surface"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-secondary uppercase">PAN Number</label>
                      <input
                        type="text"
                        value={companyPan}
                        onChange={(e) => setCompanyPan(e.target.value)}
                        placeholder="AABCK1234F"
                        className="w-full mt-1 px-3 py-1.5 rounded-lg border border-line font-mono font-bold text-content bg-surface"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Company Registered Address & Contacts */}
              <div className="p-5 rounded-xl bg-canvas border border-line space-y-3">
                <h5 className="font-bold text-content uppercase text-xs text-brand-ink">Address & Contact Info</h5>
                
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-xs font-bold text-secondary uppercase">Registered Address</label>
                    <input
                      type="text"
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      placeholder="402, Business Tower, M.I. Road"
                      className="w-full mt-1 px-3 py-1.5 rounded-lg border border-line font-medium text-content bg-surface"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary uppercase">City, State & PIN</label>
                    <input
                      type="text"
                      value={companyCity}
                      onChange={(e) => setCompanyCity(e.target.value)}
                      placeholder="Jaipur, Rajasthan, India - 302001"
                      className="w-full mt-1 px-3 py-1.5 rounded-lg border border-line font-medium text-content bg-surface"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-secondary uppercase">Phone</label>
                      <input
                        type="text"
                        value={companyPhone}
                        onChange={(e) => setCompanyPhone(e.target.value)}
                        placeholder="+91 98000 12345"
                        className="w-full mt-1 px-2 py-1 rounded-lg border border-line text-sm text-content bg-surface"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-secondary uppercase">Email</label>
                      <input
                        type="text"
                        value={companyEmail}
                        onChange={(e) => setCompanyEmail(e.target.value)}
                        placeholder="info@company.com"
                        className="w-full mt-1 px-2 py-1 rounded-lg border border-line text-sm text-content bg-surface"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-secondary uppercase">Website</label>
                      <input
                        type="text"
                        value={companyWebsite}
                        onChange={(e) => setCompanyWebsite(e.target.value)}
                        placeholder="www.company.com"
                        className="w-full mt-1 px-2 py-1 rounded-lg border border-line text-sm text-content bg-surface"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Section B: Individual Terms & Conditions Paragraph Editors for all 3 Invoices */}
          <div className="space-y-4 pt-4 border-t border-line">
            <div>
              <h4 className="font-semibold text-content uppercase text-sm tracking-wider text-content">
                2. Terms & Conditions (Paragraph Format Textarea)
              </h4>
              <p className="text-xs text-secondary mt-0.5">
                Enter your terms and policies in full paragraph format below. You can include paragraphs, bullet points, numbers, and policies — line breaks are preserved in the printable invoices.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
              
              {/* 1. Tax Invoice Terms Editor */}
              <div className="p-5 rounded-xl bg-success-soft/40 border border-success-line space-y-3">
                <div className="flex items-center justify-between border-b border-success-line pb-2">
                  <h5 className="font-semibold text-success-ink text-sm uppercase flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-success-ink" />
                    1. Tax Invoice Terms
                  </h5>
                  <span className="text-xs bg-success-soft text-success-ink font-bold px-2 py-0.5 rounded">Paragraph Box</span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-secondary uppercase">Terms & Conditions Paragraphs:</label>
                  <textarea
                    rows={8}
                    value={taxTermsText}
                    onChange={(e) => setTaxTermsText(e.target.value)}
                    placeholder="Enter Tax Invoice Terms & Conditions paragraphs here..."
                    className="w-full p-3 rounded-xl border border-success-line text-sm text-content bg-surface font-sans leading-relaxed focus:ring-2 focus:ring-success-line/20 shadow-xs"
                  />
                  <p className="text-xs text-secondary italic">Applies to the 1. Tax Invoice (GST) template footer.</p>
                </div>
              </div>

              {/* 2. Package Description Terms Editor */}
              <div className="p-5 rounded-xl bg-brand-soft/40 border border-brand-line space-y-3">
                <div className="flex items-center justify-between border-b border-brand-line pb-2">
                  <h5 className="font-semibold text-brand-ink text-sm uppercase flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-brand-ink" />
                    2. Package Description Terms
                  </h5>
                  <span className="text-xs bg-brand-soft text-brand-ink font-bold px-2 py-0.5 rounded">Paragraph Box</span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-secondary uppercase">Terms & Conditions Paragraphs:</label>
                  <textarea
                    rows={8}
                    value={pkgDescTermsText}
                    onChange={(e) => setPkgDescTermsText(e.target.value)}
                    placeholder="Enter Package Description Terms paragraphs here..."
                    className="w-full p-3 rounded-xl border border-brand-line text-sm text-content bg-surface font-sans leading-relaxed focus:ring-2 focus:ring-brand-line/20 shadow-xs"
                  />
                  <p className="text-xs text-secondary italic">Applies to the 2. Package Description template footer.</p>
                </div>
              </div>

              {/* 3. Payment Confirmation Slip Terms Editor */}
              <div className="p-5 rounded-xl bg-warning-soft/40 border border-warning-line space-y-3">
                <div className="flex items-center justify-between border-b border-warning-line pb-2">
                  <h5 className="font-semibold text-warning-ink text-sm uppercase flex items-center gap-1.5">
                    <Plane className="w-4 h-4 text-warning-ink" />
                    3. Payment Confirmation Slip Terms
                  </h5>
                  <span className="text-xs bg-warning-soft text-warning-ink font-bold px-2 py-0.5 rounded">Paragraph Box</span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-secondary uppercase">Terms & Conditions Paragraphs:</label>
                  <textarea
                    rows={8}
                    value={pkgCustomerTermsText}
                    onChange={(e) => setPkgCustomerTermsText(e.target.value)}
                    placeholder="Enter Payment Confirmation Slip terms, payment schedules, and cancellation policies paragraphs here..."
                    className="w-full p-3 rounded-xl border border-warning-line text-sm text-content bg-surface font-sans leading-relaxed focus:ring-2 focus:ring-warning-line/20 shadow-xs"
                  />
                  <p className="text-xs text-secondary italic">Applies to the 3. Payment Confirmation Slip template footer.</p>
                </div>
              </div>

            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-line">
            <button
              onClick={handleSaveSettings}
              className="px-8 py-3 rounded-xl bg-brand hover:bg-brand text-white font-semibold text-sm flex items-center gap-2 shadow-sm transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Save Company Details & Terms</span>
            </button>
          </div>

        </div>
      )}

      {/* MANUAL FILLING FORM EDITOR PANEL */}
      {!isReadOnly && activeType !== 'settings' && isEditMode && (
        <div className="bg-surface border border-line rounded-xl p-6 shadow-sm space-y-6 animate-in fade-in duration-200">
          
          {/* Top Bar with Auto-fill Dropdown */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-line">
            <div>
              <h3 className="font-semibold text-content text-base flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-brand-ink" />
                Manual Data Entry & Customer Auto-Fill
              </h3>
              <p className="text-sm text-secondary">Fill in details manually below or select a customer to auto-fill fields instantly.</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-secondary">Auto-fill from Customer:</span>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-line text-sm font-bold text-content bg-canvas outline-none focus:ring-2 focus:ring-brand-line/20"
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
            <div className="space-y-2 p-4 rounded-xl bg-canvas border border-line">
              <h4 className="font-semibold text-content uppercase text-xs tracking-wider text-brand-ink">Customer & Client Profile</h4>
              
              <div>
                <label className="block text-xs font-bold text-secondary uppercase">Customer Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg border border-line font-bold text-content bg-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary uppercase">Mobile Number</label>
                <input
                  type="text"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg border border-line font-bold text-content bg-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary uppercase">Email Address</label>
                <input
                  type="text"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg border border-line text-content bg-surface"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase">Customer GSTIN</label>
                  <input
                    type="text"
                    value={customerGstin}
                    onChange={(e) => setCustomerGstin(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg border border-line font-mono text-content bg-surface"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase">Customer PAN</label>
                  <input
                    type="text"
                    value={customerPan}
                    onChange={(e) => setCustomerPan(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg border border-line font-mono text-content bg-surface"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Reference & Dates */}
            <div className="space-y-2 p-4 rounded-xl bg-canvas border border-line">
              <h4 className="font-semibold text-content uppercase text-xs tracking-wider text-success-ink">Invoice Reference & Trip Info</h4>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase">Trip ID</label>
                  <input
                    type="text"
                    value={tripId}
                    onChange={(e) => setTripId(e.target.value)}
                    placeholder="e.g. KL-1001"
                    className="w-full mt-1 px-3 py-1.5 rounded-lg border border-line font-bold font-mono text-content bg-surface"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase">
                    {activeType === 'package_customer' ? 'Receipt No.' : 'Invoice No.'}
                  </label>
                  <input
                    type="text"
                    value={invoiceNo} readOnly
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    placeholder={activeType === 'package_customer' ? 'Receipt No.' : 'Invoice No.'}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg border border-line font-bold font-mono text-content bg-surface"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase">Invoice Date</label>
                  <input
                    type="text"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg border border-line text-content bg-surface"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase">Trip Start Date</label>
                  <input
                    type="text"
                    value={tripStartDate}
                    onChange={(e) => setTripStartDate(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg border border-line text-content bg-surface"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary uppercase">Place of Supply</label>
                <input
                  type="text"
                  value={placeOfSupply}
                  onChange={(e) => setPlaceOfSupply(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg border border-line text-content bg-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-secondary uppercase">Trip Name / Package Title</label>
                <input
                  type="text"
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg border border-line font-bold text-content bg-surface"
                />
              </div>
            </div>

            {/* Section 3: Passenger Details Box */}
            <div className="space-y-2 p-4 rounded-xl bg-canvas border border-line">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-content uppercase text-xs tracking-wider text-warning-ink">Travelers & Passengers List</h4>
                <button
                  onClick={() => setPassengers([...passengers, { id: Date.now().toString(), text: 'New Passenger Age 25' }])}
                  className="px-2 py-0.5 rounded bg-warning-strong text-white text-xs font-bold flex items-center gap-1"
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
                      className="flex-1 px-2.5 py-1 rounded border border-line text-sm font-semibold bg-surface"
                    />
                    <button
                      onClick={() => setPassengers(passengers.filter(item => item.id !== p.id))}
                      className="p-1 rounded text-danger-ink hover:bg-danger-soft"
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
            <div className="pt-4 border-t border-line space-y-4">
              
              {/* GST Tax Mode Selector (CGST + SGST vs IGST) */}
              <div className="p-4 rounded-xl bg-success-soft/60 border border-success-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm">
                <div>
                  <h4 className="font-semibold text-success-ink uppercase tracking-wider text-sm flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-success-ink" /> GST Tax Calculation Mode
                  </h4>
                  <p className="text-xs text-success-ink font-medium mt-0.5">Manually choose between Dual Tax (CGST + SGST) for intra-state or Single Tax (IGST) for inter-state billing.</p>
                </div>

                <div className="flex items-center gap-2 bg-surface p-1 rounded-xl border border-success-line shrink-0 font-bold">
                  <button
                    type="button"
                    onClick={() => setTaxMode('cgst_sgst')}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      taxMode === 'cgst_sgst'
                        ? 'bg-success-strong text-white font-semibold shadow-sm'
                        : 'text-content hover:bg-subtle'
                    }`}
                  >
                    ● CGST + SGST (9% + 9%)
                  </button>

                  <button
                    type="button"
                    onClick={() => setTaxMode('igst')}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      taxMode === 'igst'
                        ? 'bg-success-strong text-white font-semibold shadow-sm'
                        : 'text-content hover:bg-subtle'
                    }`}
                  >
                    ● IGST (18%)
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm uppercase tracking-wider text-content">Tax Invoice Service Items & SAC Codes</h4>
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
                  className="px-3 py-1 rounded-lg bg-brand text-white font-bold text-sm flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Service Row
                </button>
              </div>

              <div className="space-y-2">
                {taxItems.map((item, index) => (
                  <div key={item.id} className="p-3 rounded-xl bg-canvas border border-line grid grid-cols-1 md:grid-cols-6 gap-2 text-sm items-center">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-secondary uppercase">Description of Service</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => {
                          const updated = [...taxItems];
                          updated[index].description = e.target.value;
                          setTaxItems(updated);
                        }}
                        className="w-full mt-0.5 px-2 py-1 rounded border border-line font-bold bg-surface"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-secondary uppercase">SAC Code</label>
                      <input
                        type="text"
                        value={item.sacCode}
                        onChange={(e) => {
                          const updated = [...taxItems];
                          updated[index].sacCode = e.target.value;
                          setTaxItems(updated);
                        }}
                        className="w-full mt-0.5 px-2 py-1 rounded border border-line font-mono bg-surface"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-secondary uppercase">Taxable Value (₹)</label>
                      <input
                        type="number"
                        value={item.taxableValue}
                        onChange={(e) => {
                          const updated = [...taxItems];
                          updated[index].taxableValue = parseFloat(e.target.value) || 0;
                          setTaxItems(updated);
                        }}
                        className="w-full mt-0.5 px-2 py-1 rounded border border-line font-mono font-bold bg-surface"
                      />
                    </div>

                    {taxMode === 'cgst_sgst' ? (
                      <div>
                        <label className="block text-xs font-bold text-secondary uppercase">CGST % / SGST %</label>
                        <div className="flex items-center gap-1 mt-0.5">
                          <input
                            type="number"
                            value={item.cgstRate}
                            onChange={(e) => {
                              const updated = [...taxItems];
                              updated[index].cgstRate = parseFloat(e.target.value) || 0;
                              setTaxItems(updated);
                            }}
                            className="w-1/2 px-1 py-1 rounded border border-line font-mono text-center bg-surface"
                          />
                          <span className="text-muted">/</span>
                          <input
                            type="number"
                            value={item.sgstRate}
                            onChange={(e) => {
                              const updated = [...taxItems];
                              updated[index].sgstRate = parseFloat(e.target.value) || 0;
                              setTaxItems(updated);
                            }}
                            className="w-1/2 px-1 py-1 rounded border border-line font-mono text-center bg-surface"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-secondary uppercase">IGST Rate %</label>
                        <input
                          type="number"
                          value={item.igstRate ?? 0}
                          onChange={(e) => {
                            const updated = [...taxItems];
                            updated[index].igstRate = parseFloat(e.target.value) || 0;
                            setTaxItems(updated);
                          }}
                          className="w-full mt-0.5 px-2 py-1 rounded border border-line font-mono font-bold text-center bg-surface"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-end pt-3">
                      <button
                        onClick={() => setTaxItems(taxItems.filter(i => i.id !== item.id))}
                        className="p-1 text-danger-ink hover:bg-danger-soft rounded"
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
            <div className="pt-4 border-t border-line space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm uppercase tracking-wider text-content">Package Description Expense Breakdown Rows</h4>
                <button
                  onClick={() => setPkgDescItems([...pkgDescItems, {
                    id: Date.now().toString(),
                    description: 'Extra Sightseeing & Guide Services',
                    price: 5000
                  }])}
                  className="px-3 py-1 rounded-lg bg-brand text-white font-bold text-sm flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Expense Item
                </button>
              </div>

              <div className="space-y-2">
                {pkgDescItems.map((item, index) => (
                  <div key={item.id} className="p-3 rounded-xl bg-canvas border border-line flex items-center gap-3 text-sm">
                    <span className="font-mono font-bold text-secondary">{index + 1}.</span>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => {
                        const updated = [...pkgDescItems];
                        updated[index].description = e.target.value;
                        setPkgDescItems(updated);
                      }}
                      className="flex-1 px-3 py-1.5 rounded border border-line font-bold bg-surface"
                    />
                    <div className="w-36 flex items-center gap-1">
                      <span className="font-bold text-secondary">₹</span>
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => {
                          const updated = [...pkgDescItems];
                          updated[index].price = parseFloat(e.target.value) || 0;
                          setPkgDescItems(updated);
                        }}
                        className="w-full px-2 py-1 rounded border border-line font-mono font-bold bg-surface"
                      />
                    </div>
                    <button
                      onClick={() => setPkgDescItems(pkgDescItems.filter(i => i.id !== item.id))}
                      className="p-1 text-danger-ink hover:bg-danger-soft rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeType === 'package_customer' && (
            <div className="pt-4 border-t border-line space-y-3">
              <h4 className="font-bold text-sm uppercase tracking-wider text-content">Customer Package Specifics & Installment Schedule</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase">Deposit Status Badge</label>
                  <input
                    type="text"
                    value={pkgDepositStatus}
                    readOnly
                    className="w-full mt-0.5 px-2.5 py-1 rounded border border-line font-bold bg-surface"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase">Hotel Badge Tag</label>
                  <input
                    type="text"
                    value={hotelBadge}
                    onChange={(e) => setHotelBadge(e.target.value)}
                    className="w-full mt-0.5 px-2.5 py-1 rounded border border-line font-bold bg-surface"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase">Meal Badge Tag</label>
                  <input
                    type="text"
                    value={mealBadge}
                    onChange={(e) => setMealBadge(e.target.value)}
                    className="w-full mt-0.5 px-2.5 py-1 rounded border border-line font-bold bg-surface"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-secondary uppercase">Total Amount Paid (₹)</label>
                  <input
                    type="number"
                    value={totalPaidAmount}
                    readOnly aria-label="Verified amount received"
                    className="w-full mt-0.5 px-2.5 py-1 rounded border border-line font-bold text-success-ink bg-surface"
                  />
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* PRINTABLE / DISPLAY CONTAINER (PIXEL PERFECT MATCHING USER PDFs) */}
      {activeType !== 'settings' && (
        <div className="p-4 bg-hover rounded-xl overflow-x-auto flex justify-center custom-scrollbar print:bg-white print:p-0">
          
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
              .doc-preview-protected, .doc-preview-protected * {
                color-scheme: light !important;
              }
              .doc-preview-protected {
                color: #0f172a !important;
              }
              .doc-preview-protected .text-slate-900,
              .doc-preview-protected .text-slate-950,
              .doc-preview-protected .text-gray-900,
              .doc-preview-protected .text-black,
              .doc-preview-protected h1,
              .doc-preview-protected h2,
              .doc-preview-protected h3,
              .doc-preview-protected h4,
              .doc-preview-protected strong,
              .doc-preview-protected b {
                color: #0f172a !important;
              }
              .doc-preview-protected .text-slate-800,
              .doc-preview-protected .text-gray-800 {
                color: #1e293b !important;
              }
              .doc-preview-protected .text-slate-700,
              .doc-preview-protected .text-gray-700 {
                color: #334155 !important;
              }
              .doc-preview-protected .text-slate-600,
              .doc-preview-protected .text-gray-600 {
                color: #475569 !important;
              }
              .doc-preview-protected .text-slate-500,
              .doc-preview-protected .text-gray-500 {
                color: #64748b !important;
              }
              .doc-preview-protected .text-slate-400,
              .doc-preview-protected .text-gray-400 {
                color: #94a3b8 !important;
              }
              .doc-preview-protected .bg-white {
                background-color: #ffffff !important;
              }
              .doc-preview-protected .bg-slate-50 {
                background-color: #f8fafc !important;
              }
              .doc-preview-protected .bg-slate-100 {
                background-color: #f1f5f9 !important;
              }
              .doc-preview-protected .bg-slate-200 {
                background-color: #e2e8f0 !important;
              }
              .doc-preview-protected .border-slate-100 {
                border-color: #f1f5f9 !important;
              }
              .doc-preview-protected .border-slate-200 {
                border-color: #e2e8f0 !important;
              }
              .doc-preview-protected .border-slate-300 {
                border-color: #cbd5e1 !important;
              }
              .doc-preview-protected .border-slate-900 {
                border-color: #0f172a !important;
              }
            `}</style>
            
            {/* ======================================================== */}
            {!issuedId && <div className="text-center py-2 border-b border-amber-300 text-amber-800 text-sm font-semibold">DRAFT — NOT ISSUED</div>}
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
                      <p><strong className="font-bold">Invoice No:</strong> <span className="font-mono font-bold">{invoiceNo}</span></p>
                      {tripId && <p><strong className="font-bold">Trip ID:</strong> <span className="font-mono font-bold text-indigo-700">#{tripId}</span></p>}
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
                        const cgstVal = Math.round(Math.round(item.taxableValue*100)*item.cgstRate/100)/100;
                        const sgstVal = Math.round(Math.round(item.taxableValue*100)*item.sgstRate/100)/100;
                        const igstVal = Math.round(Math.round(item.taxableValue*100)*(item.igstRate ?? 0)/100)/100;

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
                                <p>IGST @ {item.igstRate ?? 0}%: ₹{igstVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
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
                      <p><strong className="font-bold">Invoice No:</strong> <span className="font-mono font-bold">{invoiceNo}</span></p>
                      {tripId && <p><strong className="font-bold">Trip ID:</strong> <span className="font-mono font-bold text-indigo-700">#{tripId}</span></p>}
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
                    <p className="font-mono text-sm font-extrabold text-[#B85B28]">
                      TRIP ID: #{tripId || invoiceNo} {invoiceNo ? `· RECEIPT NO: #${invoiceNo}` : ''}
                    </p>
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        {pkgDepositStatus}
                      </span>
                    </div>
                  </div>

                </div>

                {/* Metadata Bar (5 Columns) */}
                <div className="invoice-meta-bar invoice-avoid-break grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-2xl bg-[#F6F0E4] border border-[#E6DCC8] text-center text-xs">
                  <div>
                    <span className="text-[9px] uppercase tracking-widest font-extrabold text-slate-500 block">ISSUE DATE</span>
                    <span className="font-bold text-slate-900">{invoiceDate}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-widest font-extrabold text-slate-500 block">TRAVEL DATE</span>
                    <span className="font-bold text-slate-900">{tripStartDate}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-widest font-extrabold text-slate-500 block">TRIP ID</span>
                    <span className="font-bold text-[#7B1D2A] font-mono">{tripId || invoiceNo}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-widest font-extrabold text-slate-500 block">RECEIPT NO</span>
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
                                ₹ {invoiceMoney(pay.amount)}
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
                              No verified receipts recorded for this booking.
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
                        <strong className="font-mono text-slate-900">₹ {invoiceMoney(pkgTotal)}</strong>
                      </div>
                      <div className="flex justify-between text-slate-900 font-extrabold border-t border-[#E0D3BB] pt-1.5">
                        <span>Total Package Cost:</span>
                        <strong className="font-mono text-sm text-[#7B1D2A]">₹ {invoiceMoney(pkgTotal)}</strong>
                      </div>
                      <div className="flex justify-between text-emerald-800 font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                        <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Total Received:</span>
                        <strong className="font-mono text-sm text-emerald-800">₹ {invoiceMoney(totalPaidAmount)}</strong>
                      </div>
                      <div className="flex justify-between text-rose-800 font-bold bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                        <span className="flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Balance Remaining:</span>
                        <strong className="font-mono text-sm text-rose-800">₹ {invoiceMoney(balanceDue)}</strong>
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
                        ₹ {invoiceMoney(balanceDue)}
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
                    This document shows the verified collections recorded for Trip ID <strong>#{tripId || invoiceNo}</strong> (Receipt Ref: <strong>#{invoiceNo}</strong>). Kindly ensure subsequent milestone installments are cleared prior to the due dates to ensure uninterrupted vehicle allocation and luxury stay confirmations. For payment verification or amendments, contact Kingsland 24x7 desk at <strong>{companyPhone}</strong>.
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

