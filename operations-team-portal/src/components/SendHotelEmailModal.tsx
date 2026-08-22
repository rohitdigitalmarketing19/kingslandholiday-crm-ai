import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Copy, 
  Check, 
  ExternalLink, 
  Send, 
  Plus, 
  Trash2, 
  Building, 
  Calendar, 
  User, 
  Users, 
  Sparkles,
  LayoutGrid,
  FileText
} from 'lucide-react';
import { HotelVoucher } from '../types';

interface HotelBookingRow {
  id: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  nights: number | string;
  category: string;
  meal: string;
  tariffRate: string;
  total: number | string;
}

interface SendHotelEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucher: HotelVoucher | null;
  allPackageVouchers?: HotelVoucher[];
  isReadOnly?: boolean;
}

export const SendHotelEmailModal: React.FC<SendHotelEmailModalProps> = ({
  isOpen,
  onClose,
  voucher,
  allPackageVouchers = [],
  isReadOnly = false,
}) => {
  if (!isOpen || !voucher) return null;

  // Active Template Format: 'format1' (Yellow Multi-Room Table) or 'format2' (Blue Single Property Table)
  const [activeFormat, setActiveFormat] = useState<'format1' | 'format2'>('format1');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Common Header & Greeting Info
  const [managerGreeting, setManagerGreeting] = useState<string>('Mohit Ji');
  const [introText, setIntroText] = useState<string>('As per our call conversation please confirm this booking');
  const [guestName, setGuestName] = useState<string>(voucher.customerName || 'Ms. Himaja S');
  const [numberOfPersons, setNumberOfPersons] = useState<string>('4 Adults & 1 Child (3 Yrs)');
  const [hotelEmail, setHotelEmail] = useState<string>('');
  const [hotelPhone, setHotelPhone] = useState<string>('');
  const [senderName, setSenderName] = useState<string>('Md. Asran / Operations Team');
  const [senderTitle, setSenderTitle] = useState<string>('Operations Manager (Kingsland Holidays)');
  const [companyName, setCompanyName] = useState<string>('Kingsland Holidays');

  // Format 1: Multi-Hotel / Multi-Room Rows
  const [tableRows, setTableRows] = useState<HotelBookingRow[]>([]);
  const [grandTotalStr, setGrandTotalStr] = useState<string>('19,200/-');

  // Format 2: Single Property Specifics
  const [f2HotelName, setF2HotelName] = useState<string>(voucher.hotelName || 'Sia Resort , Sam');
  const [f2RequiredRoom, setF2RequiredRoom] = useState<string>(voucher.roomType || '2 AC Swiss Tents');
  const [f2MealPlan, setF2MealPlan] = useState<string>(voucher.mealPlan || 'MAPAI (Breakfast and Dinner)');
  const [f2CheckIn, setF2CheckIn] = useState<string>(voucher.checkIn || '24th Dec 2026');
  const [f2CheckOut, setF2CheckOut] = useState<string>(voucher.checkOut || '25th Dec 2026');
  const [f2Nights, setF2Nights] = useState<string>(`${voucher.nights || 1} Night`);
  const [f2Tariff, setF2Tariff] = useState<string>('4,500/- Per Room per night (CPAI)');
  const [f2Remarks, setF2Remarks] = useState<string>('Double sharing with extra mattress for child');

  // Populate data whenever voucher changes
  useEffect(() => {
    if (voucher) {
      setGuestName(voucher.customerName || 'Guest Name');
      setF2HotelName(voucher.hotelName ? `${voucher.hotelName}, ${voucher.city || 'Tour'}` : 'Hotel & Resort');
      setF2RequiredRoom(voucher.roomType || '2 Deluxe Rooms');
      setF2MealPlan(voucher.mealPlan || 'CPAI');
      setF2CheckIn(voucher.checkIn || '');
      setF2CheckOut(voucher.checkOut || '');
      setF2Nights(`${voucher.nights || 1} Night${(voucher.nights || 1) > 1 ? 's' : ''}`);

      // If multiple package vouchers exist for this booking, populate all into Format 1 table
      const relevant = allPackageVouchers.length > 0 ? allPackageVouchers : [voucher];
      const initialRows: HotelBookingRow[] = relevant.map((v, i) => ({
        id: v.id || `row-${i}`,
        hotelName: `${v.hotelName}${v.city ? `, ${v.city}` : ''}`,
        checkIn: v.checkIn || '22 Dec 2026',
        checkOut: v.checkOut || '23 Dec 2026',
        nights: v.nights || 1,
        category: v.roomType || '2 Garden Cottage Rooms',
        meal: v.mealPlan || 'CPAI',
        tariffRate: '4150*2R',
        total: '8300'
      }));

      // If only 1 voucher, add a second sample row or use the one
      if (initialRows.length === 1) {
        initialRows.push({
          id: 'row-sample-2',
          hotelName: `${voucher.hotelName}, ${voucher.city || 'Location'}`,
          checkIn: '25 Dec 2026',
          checkOut: '26 Dec 2026',
          nights: 1,
          category: '2 Suite Rooms',
          meal: 'CPAI',
          tariffRate: '5450*2R',
          total: '10900'
        });
        setGrandTotalStr('19,200/-');
      }
      setTableRows(initialRows);
    }
  }, [voucher, allPackageVouchers]);

  // Recalculate Grand Total in Format 1
  const calculateTotal = () => {
    let sum = 0;
    tableRows.forEach(r => {
      const num = parseFloat(String(r.total).replace(/[^0-9.]/g, '')) || 0;
      sum += num;
    });
    return sum > 0 ? `${sum.toLocaleString('en-IN')}/-` : grandTotalStr;
  };

  const handleAddRow = () => {
    setTableRows([
      ...tableRows,
      {
        id: Date.now().toString(),
        hotelName: voucher.hotelName || 'Hotel Name',
        checkIn: voucher.checkIn || '24 Dec 2026',
        checkOut: voucher.checkOut || '25 Dec 2026',
        nights: 1,
        category: '2 Deluxe Rooms',
        meal: 'CPAI',
        tariffRate: '4000*2R',
        total: '8000'
      }
    ]);
  };

  const handleRemoveRow = (id: string) => {
    setTableRows(tableRows.filter(r => r.id !== id));
  };

  const handleRowChange = (id: string, field: keyof HotelBookingRow, val: any) => {
    setTableRows(tableRows.map(r => {
      if (r.id === id) {
        return { ...r, [field]: val };
      }
      return r;
    }));
  };

  // Generate Clean Structured Plain Text Table for Format 1
  const generateFormat1PlainText = () => {
    let text = `Dear ${managerGreeting},\n\n`;
    text += `${introText}:\n\n`;
    text += `======================================================================\n`;
    text += `                  HOTEL BOOKING CONFIRMATION DETAILS                  \n`;
    text += `======================================================================\n`;
    text += `Guest Name        : ${guestName}\n`;
    text += `Number of Persons : ${numberOfPersons}\n`;
    text += `----------------------------------------------------------------------\n`;
    tableRows.forEach((r, idx) => {
      text += `HOTEL #${idx + 1} : ${r.hotelName}\n`;
      text += `  • Check-In    : ${r.checkIn}  |  Check-Out: ${r.checkOut} (${r.nights} Night${Number(r.nights) > 1 ? 's' : ''})\n`;
      text += `  • Category    : ${r.category}\n`;
      text += `  • Meal Plan   : ${r.meal}\n`;
      text += `  • Tariff Rate : ${r.tariffRate}\n`;
      text += `  • Total       : ₹${r.total}\n\n`;
    });
    text += `----------------------------------------------------------------------\n`;
    text += `GRAND TOTAL       : ₹${grandTotalStr || calculateTotal()}\n`;
    text += `======================================================================\n\n`;
    text += `Please confirm this booking and send us confirmation.\n\n`;
    text += `--\nBest Regards,\n${senderName}\n${senderTitle}\n${companyName}`;
    return text;
  };

  // Generate Clean Structured Plain Text Table for Format 2
  const generateFormat2PlainText = () => {
    let text = `Dear ${managerGreeting},\n\n`;
    text += `${introText} -\n\n`;
    text += `======================================================================\n`;
    text += `HOTEL : ${f2HotelName.toUpperCase()}\n`;
    text += `======================================================================\n`;
    text += `Guest Name        : ${guestName}\n`;
    text += `Number of Persons : ${numberOfPersons}\n`;
    text += `Required Room     : ${f2RequiredRoom}\n`;
    text += `Meal Plan         : ${f2MealPlan}\n`;
    text += `Check - In Date   : ${f2CheckIn}\n`;
    text += `Check - Out Date  : ${f2CheckOut}\n`;
    text += `Number of Night   : ${f2Nights}\n`;
    text += `Rate / Tariff     : ${f2Tariff}\n`;
    if (f2Remarks) text += `Remarks           : ${f2Remarks}\n`;
    text += `======================================================================\n\n`;
    text += `Please confirm this booking and send us confirmation.\n\n`;
    text += `--\nBest Regards,\n${senderName}\n${senderTitle}\n${companyName}`;
    return text;
  };

  // Generate Rich HTML Table for Format 1 (Yellow Header)
  const generateFormat1HTML = () => {
    return `
<div style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #1e293b; line-height: 1.5; max-width: 750px;">
  <p style="margin: 0 0 10px 0;">Dear <strong>${managerGreeting}</strong>,</p>
  <p style="margin: 0 0 16px 0;">${introText}</p>
  
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 1px solid #cbd5e1; font-size: 12px;">
    <tbody>
      <tr style="background-color: #fef08a; font-weight: bold; border-bottom: 1px solid #cbd5e1;">
        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; width: 140px;">Guest Name</td>
        <td colspan="7" style="padding: 8px 12px; border: 1px solid #cbd5e1; color: #0f172a; font-size: 13px;">${guestName}</td>
      </tr>
      <tr style="background-color: #fef08a; font-weight: bold; border-bottom: 1px solid #cbd5e1;">
        <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">Number of Person's</td>
        <td colspan="7" style="padding: 8px 12px; border: 1px solid #cbd5e1; color: #0f172a;">${numberOfPersons}</td>
      </tr>
      <tr style="background-color: #fef08a; font-weight: bold; text-align: center; border-bottom: 2px solid #cbd5e1;">
        <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: left;">Hotel Name</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1;">C/In</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1;">C/Out</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1;">Night</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1;">Category</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1;">Meal</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1;">Tariff</td>
        <td style="padding: 8px; border: 1px solid #cbd5e1;">Total</td>
      </tr>
      ${tableRows.map((r, i) => `
      <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: 600;">${r.hotelName}</td>
        <td style="padding: 8px 6px; border: 1px solid #cbd5e1; text-align: center;">${r.checkIn}</td>
        <td style="padding: 8px 6px; border: 1px solid #cbd5e1; text-align: center;">${r.checkOut}</td>
        <td style="padding: 8px 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${r.nights}</td>
        <td style="padding: 8px 8px; border: 1px solid #cbd5e1;">${r.category}</td>
        <td style="padding: 8px 6px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${r.meal}</td>
        <td style="padding: 8px 8px; border: 1px solid #cbd5e1; text-align: center;">${r.tariffRate}</td>
        <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right; font-weight: bold;">${r.total}</td>
      </tr>`).join('')}
      <tr style="background-color: #fef08a; font-weight: bold;">
        <td colspan="7" style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: right; font-size: 13px;">Grand Total</td>
        <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right; font-size: 13px; color: #854d0e;">${grandTotalStr || calculateTotal()}</td>
      </tr>
    </tbody>
  </table>

  <p style="margin: 12px 0 16px 0;">Please confirm this booking and send us confirmation.</p>
  
  <p style="margin: 0; color: #475569;">--<br>Best Regards...<br><strong>${senderName}</strong><br>${senderTitle}<br><strong>${companyName}</strong></p>
</div>
    `.trim();
  };

  // Generate Rich HTML Table for Format 2 (Blue Header Bar)
  const generateFormat2HTML = () => {
    return `
<div style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #1e293b; line-height: 1.5; max-width: 650px;">
  <p style="margin: 0 0 10px 0;">Dear <strong>${managerGreeting}</strong>,</p>
  <p style="margin: 0 0 16px 0;">${introText} -</p>
  
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 1px solid #93c5fd; font-size: 13px;">
    <tbody>
      <tr>
        <td colspan="2" style="background-color: #3b82f6; color: #ffffff; padding: 10px 14px; font-weight: bold; font-size: 15px; border: 1px solid #3b82f6;">
          ${f2HotelName}
        </td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; width: 170px; color: #475569;">Guest Name</td>
        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #0f172a;">${guestName}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0; background-color: #ffffff;">
        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #475569;">Number of Person's</td>
        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; color: #0f172a;">${numberOfPersons}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #475569;">Required Room</td>
        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #0f172a;">${f2RequiredRoom}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0; background-color: #ffffff;">
        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #475569;">Meal Plan</td>
        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #1e40af;">${f2MealPlan}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #475569;">Check - In Date</td>
        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #047857;">${f2CheckIn}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0; background-color: #ffffff;">
        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #475569;">Check - Out Date</td>
        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #b91c1c;">${f2CheckOut}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #475569;">Number of Night</td>
        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #0f172a;">${f2Nights}</td>
      </tr>
      <tr style="border-bottom: 1px solid #e2e8f0; background-color: #ffffff;">
        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #475569;">Rate / Tariff / Remarks</td>
        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #b45309;">${f2Tariff}</td>
      </tr>
    </tbody>
  </table>

  <p style="margin: 12px 0 16px 0;">Please confirm this booking and send us confirmation.</p>
  
  <p style="margin: 0; color: #475569;">--<br>Best Regards...<br><strong>${senderName}</strong><br>${senderTitle}<br><strong>${companyName}</strong></p>
</div>
    `.trim();
  };

  // State to show copy instruction banner
  const [showGmailTip, setShowGmailTip] = useState<boolean>(false);

  // Copy HTML Formatted Table with colors (for pasting cleanly into Gmail / Outlook)
  const handleCopyHTML = async (): Promise<boolean> => {
    const htmlContent = activeFormat === 'format1' ? generateFormat1HTML() : generateFormat2HTML();
    const plainText = activeFormat === 'format1' ? generateFormat1PlainText() : generateFormat2PlainText();

    let success = false;

    // Primary: Modern Async Clipboard API with text/html & text/plain
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const typeHtml = 'text/html';
        const typePlain = 'text/plain';
        const blobHtml = new Blob([htmlContent], { type: typeHtml });
        const blobPlain = new Blob([plainText], { type: typePlain });
        const data = [new ClipboardItem({ [typeHtml]: blobHtml, [typePlain]: blobPlain })];
        await navigator.clipboard.write(data);
        success = true;
      }
    } catch (e) {
      console.warn('Async clipboard write failed, using DOM selection fallback:', e);
    }

    // Secondary Fallback: DOM Range + execCommand('copy') for rich HTML
    if (!success) {
      try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        tempDiv.style.position = 'fixed';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '-9999px';
        tempDiv.style.opacity = '0';
        document.body.appendChild(tempDiv);

        const range = document.createRange();
        range.selectNodeContents(tempDiv);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
          document.execCommand('copy');
          selection.removeAllRanges();
          success = true;
        }
        document.body.removeChild(tempDiv);
      } catch (domErr) {
        console.warn('DOM copy fallback failed:', domErr);
        await navigator.clipboard.writeText(plainText);
      }
    }

    setCopiedType('html');
    setTimeout(() => setCopiedType(null), 3000);
    return success;
  };

  // Copy Plain Text
  const handleCopyText = async () => {
    const plainText = activeFormat === 'format1' ? generateFormat1PlainText() : generateFormat2PlainText();
    await navigator.clipboard.writeText(plainText);
    setCopiedType('text');
    setTimeout(() => setCopiedType(null), 2500);
  };

  // Trigger Direct Gmail Web Compose with pre-filled structured table & colored table in clipboard
  const handleOpenGmailWithTable = async () => {
    if (isReadOnly) {
      alert('🚫 Access Restricted: You do not have permission to send emails in View-Only Mode.');
      return;
    }
    // 1. Copy the exact rich HTML colored table to clipboard
    await handleCopyHTML();
    setShowGmailTip(true);

    // 2. Pre-fill body so Gmail is NEVER blank!
    const subject = encodeURIComponent(`Booking Confirmation Request - ${guestName} (${voucher?.hotelName || 'Hotel'})`);
    const body = encodeURIComponent(activeFormat === 'format1' ? generateFormat1PlainText() : generateFormat2PlainText());
    const to = encodeURIComponent(hotelEmail || '');
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
  };

  // Fallback: Open Gmail with plain text pre-filled
  const handleOpenGmailPlainText = () => {
    if (isReadOnly) {
      alert('🚫 Access Restricted: You do not have permission to send emails in View-Only Mode.');
      return;
    }
    const subject = encodeURIComponent(`Booking Confirmation Request - ${guestName} (${voucher?.hotelName || 'Hotel'})`);
    const body = encodeURIComponent(activeFormat === 'format1' ? generateFormat1PlainText() : generateFormat2PlainText());
    const to = encodeURIComponent(hotelEmail || '');
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
  };

  // Trigger Direct Outlook Web Compose
  const handleOpenOutlook = async () => {
    if (isReadOnly) {
      alert('🚫 Access Restricted: You do not have permission to send emails in View-Only Mode.');
      return;
    }
    await handleCopyHTML();
    setShowGmailTip(true);

    const subject = encodeURIComponent(`Booking Confirmation Request - ${guestName} (${voucher?.hotelName || 'Hotel'})`);
    const to = encodeURIComponent(hotelEmail || '');
    const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=${to}&subject=${subject}`;
    window.open(outlookUrl, '_blank', 'noopener,noreferrer');
  };

  // Trigger Native Desktop Mail Client without opening blank tab
  const handleOpenMailto = () => {
    if (isReadOnly) {
      alert('🚫 Access Restricted: You do not have permission to send emails in View-Only Mode.');
      return;
    }
    const subject = encodeURIComponent(`Booking Confirmation Request - ${guestName} (${voucher?.hotelName || 'Hotel'})`);
    const body = encodeURIComponent(activeFormat === 'format1' ? generateFormat1PlainText() : generateFormat2PlainText());
    const mailtoUrl = `mailto:${hotelEmail || ''}?subject=${subject}&body=${body}`;
    
    // Use hidden anchor to prevent Chrome from opening a blank hanging tab
    const link = document.createElement('a');
    link.href = mailtoUrl;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 500);
  };

  // Trigger WhatsApp share
  const handleSendWhatsApp = () => {
    if (isReadOnly) {
      alert('🚫 Access Restricted: You do not have permission to send WhatsApp messages in View-Only Mode.');
      return;
    }
    const text = encodeURIComponent(activeFormat === 'format1' ? generateFormat1PlainText() : generateFormat2PlainText());
    const phone = hotelPhone ? hotelPhone.replace(/\D/g, '') : '';
    const waUrl = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="hotel-voucher-fixed send-mail-hotel-fixed hotel-email-modal-fixed doc-preview-protected bg-white rounded-3xl max-w-5xl w-full border border-slate-200 shadow-xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        
        {/* MODAL HEADER */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-indigo-800/40">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              <Mail className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-white">Send Hotel Booking Confirmation Email</h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-white/10 text-indigo-200 font-bold">
                  {voucher.bookingId}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Hotel: <strong className="text-white">{voucher.hotelName}</strong> • Guest: <strong className="text-teal-300">{voucher.customerName}</strong>
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isReadOnly && (
          <div className="p-3.5 bg-amber-50 border-b border-amber-300 text-amber-900 text-xs font-bold flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">👁️</span>
              <span>Read-Only Mode Active: Mail template editing is disabled. You can preview, copy text, or view hotel reservation details.</span>
            </div>
            <span className="px-2.5 py-0.5 rounded bg-amber-200 text-amber-950 font-black text-[10px] uppercase border border-amber-400">View Only Mode</span>
          </div>
        )}

        {/* FORMAT SELECTOR TABS */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Choose Format:</span>
            
            <button
              onClick={() => setActiveFormat('format1')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                activeFormat === 'format1'
                  ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-400/30'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-amber-700" />
              <span>Format 1: Multi-Room Yellow Table</span>
            </button>

            <button
              onClick={() => setActiveFormat('format2')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all ${
                activeFormat === 'format2'
                  ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-600/30'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4 text-blue-400" />
              <span>Format 2: Single Property Blue Banner</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500">
              💡 Fill & edit details below. All fields update live in preview!
            </span>
          </div>
        </div>

        {/* BODY CONTAINER: SPLIT 2-COLUMNS (EDITOR & LIVE PREVIEW) */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-100/60">
          
          {/* LEFT COLUMN: EDITABLE FIELDS FORM (5 Cols) */}
          <div className="lg:col-span-5 space-y-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-indigo-900 border-b pb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Customize Email Details
            </h4>

            {/* Recipient & Contact Details */}
            <div className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Manager Greeting</label>
                  <input
                    type="text"
                    value={managerGreeting}
                    onChange={(e) => setManagerGreeting(e.target.value)}
                    placeholder="Mohit Ji / Team"
                    className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Hotel Contact Email</label>
                  <input
                    type="email"
                    value={hotelEmail}
                    onChange={(e) => setHotelEmail(e.target.value)}
                    placeholder="reservations@hotel.com"
                    className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Lead Guest Name</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-300 font-extrabold text-slate-900 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">No. of Persons (Pax)</label>
                  <input
                    type="text"
                    value={numberOfPersons}
                    onChange={(e) => setNumberOfPersons(e.target.value)}
                    placeholder="4 Adults & 1 Child (3 Yrs)"
                    className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Hotel Phone (WhatsApp)</label>
                  <input
                    type="text"
                    value={hotelPhone}
                    onChange={(e) => setHotelPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Intro Conversation Note</label>
                <input
                  type="text"
                  value={introText}
                  onChange={(e) => setIntroText(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-800 bg-white"
                />
              </div>
            </div>

            {/* FORMAT 1 SPECIFIC EDITORS */}
            {activeFormat === 'format1' && (
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <h5 className="font-extrabold text-xs text-amber-800 uppercase">Multi-Room Table Rows:</h5>
                  <button
                    onClick={handleAddRow}
                    className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Room Row
                  </button>
                </div>

                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {tableRows.map((row, idx) => (
                    <div key={row.id} className="p-3 rounded-xl bg-amber-50/50 border border-amber-200 text-xs space-y-2">
                      <div className="flex items-center justify-between font-bold text-amber-900">
                        <span>Row #{idx + 1}</span>
                        {tableRows.length > 1 && (
                          <button
                            onClick={() => handleRemoveRow(row.id)}
                            className="text-rose-600 hover:bg-rose-50 p-1 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={row.hotelName}
                        onChange={(e) => handleRowChange(row.id, 'hotelName', e.target.value)}
                        placeholder="Hotel & Location Name"
                        className="w-full px-2.5 py-1 rounded border border-slate-300 font-bold bg-white text-xs"
                      />

                      <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                        <div>
                          <span className="text-[9px] text-slate-500 block">C/In</span>
                          <input
                            type="text"
                            value={row.checkIn}
                            onChange={(e) => handleRowChange(row.id, 'checkIn', e.target.value)}
                            className="w-full p-1 rounded border border-slate-300 bg-white"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 block">C/Out</span>
                          <input
                            type="text"
                            value={row.checkOut}
                            onChange={(e) => handleRowChange(row.id, 'checkOut', e.target.value)}
                            className="w-full p-1 rounded border border-slate-300 bg-white"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 block">Nights</span>
                          <input
                            type="text"
                            value={row.nights}
                            onChange={(e) => handleRowChange(row.id, 'nights', e.target.value)}
                            className="w-full p-1 rounded border border-slate-300 bg-white text-center font-bold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        <div>
                          <span className="text-[9px] text-slate-500 block">Category (Rooms)</span>
                          <input
                            type="text"
                            value={row.category}
                            onChange={(e) => handleRowChange(row.id, 'category', e.target.value)}
                            className="w-full p-1 rounded border border-slate-300 bg-white"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 block">Meal Plan</span>
                          <input
                            type="text"
                            value={row.meal}
                            onChange={(e) => handleRowChange(row.id, 'meal', e.target.value)}
                            className="w-full p-1 rounded border border-slate-300 bg-white font-bold"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        <div>
                          <span className="text-[9px] text-slate-500 block">Tariff Rate</span>
                          <input
                            type="text"
                            value={row.tariffRate}
                            onChange={(e) => handleRowChange(row.id, 'tariffRate', e.target.value)}
                            className="w-full p-1 rounded border border-slate-300 bg-white"
                          />
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 block">Row Total</span>
                          <input
                            type="text"
                            value={row.total}
                            onChange={(e) => handleRowChange(row.id, 'total', e.target.value)}
                            className="w-full p-1 rounded border border-slate-300 bg-white font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Grand Total (₹)</label>
                  <input
                    type="text"
                    value={grandTotalStr}
                    onChange={(e) => setGrandTotalStr(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg border border-amber-300 font-black text-amber-900 bg-amber-50"
                  />
                </div>
              </div>
            )}

            {/* FORMAT 2 SPECIFIC EDITORS */}
            {activeFormat === 'format2' && (
              <div className="space-y-3 pt-3 border-t border-slate-200 text-xs">
                <h5 className="font-extrabold text-xs text-blue-900 uppercase">Single Property Details:</h5>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Hotel & Location Header</label>
                  <input
                    type="text"
                    value={f2HotelName}
                    onChange={(e) => setF2HotelName(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg border border-blue-300 font-extrabold text-blue-900 bg-blue-50/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Required Room</label>
                    <input
                      type="text"
                      value={f2RequiredRoom}
                      onChange={(e) => setF2RequiredRoom(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1 rounded border border-slate-300 font-bold bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Meal Plan</label>
                    <input
                      type="text"
                      value={f2MealPlan}
                      onChange={(e) => setF2MealPlan(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1 rounded border border-slate-300 font-bold text-indigo-700 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Check - In Date</label>
                    <input
                      type="text"
                      value={f2CheckIn}
                      onChange={(e) => setF2CheckIn(e.target.value)}
                      className="w-full mt-1 px-2 py-1 rounded border border-slate-300 font-mono text-emerald-700 font-bold bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Check - Out Date</label>
                    <input
                      type="text"
                      value={f2CheckOut}
                      onChange={(e) => setF2CheckOut(e.target.value)}
                      className="w-full mt-1 px-2 py-1 rounded border border-slate-300 font-mono text-rose-700 font-bold bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Nights</label>
                    <input
                      type="text"
                      value={f2Nights}
                      onChange={(e) => setF2Nights(e.target.value)}
                      className="w-full mt-1 px-2 py-1 rounded border border-slate-300 text-center font-bold bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Rate / Tariff / Remarks</label>
                  <input
                    type="text"
                    value={f2Tariff}
                    onChange={(e) => setF2Tariff(e.target.value)}
                    placeholder="4,500/- Per Room per night (CPAI)"
                    className="w-full mt-1 px-3 py-1.5 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                  />
                </div>
              </div>
            )}

            {/* Sender Sign-off Details */}
            <div className="pt-3 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Sender Name</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1 rounded border border-slate-300 font-semibold bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Sender Title</label>
                <input
                  type="text"
                  value={senderTitle}
                  onChange={(e) => setSenderTitle(e.target.value)}
                  className="w-full mt-1 px-2.5 py-1 rounded border border-slate-300 text-slate-600 bg-white"
                />
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: VISUAL EMAIL PREVIEW (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-4 font-sans text-slate-900">
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-indigo-600" /> Live Email View
                </span>
                <span className="text-[11px] font-bold text-slate-400">
                  {activeFormat === 'format1' ? 'Format 1: Yellow Multi-Room Table' : 'Format 2: Blue Single Property'}
                </span>
              </div>

              {/* FORMAT 1 VISUAL PREVIEW */}
              {activeFormat === 'format1' && (
                <div className="space-y-4 text-xs font-sans text-slate-800">
                  <p>Dear <strong>{managerGreeting}</strong>,</p>
                  <p>{introText}</p>

                  <div className="border border-slate-300 rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <tbody>
                        <tr className="bg-yellow-200 font-bold border-b border-slate-300">
                          <td className="p-2 border-r border-slate-300 w-32 font-bold text-slate-900">Guest Name</td>
                          <td colSpan={7} className="p-2 font-bold text-slate-900 text-xs">{guestName}</td>
                        </tr>
                        <tr className="bg-yellow-200 font-bold border-b border-slate-300">
                          <td className="p-2 border-r border-slate-300 font-bold text-slate-900">Number of Person's</td>
                          <td colSpan={7} className="p-2 font-bold text-slate-900">{numberOfPersons}</td>
                        </tr>
                        <tr className="bg-yellow-200 font-black text-slate-900 text-center border-b-2 border-slate-400">
                          <td className="p-2 border-r border-slate-300 text-left">Hotel Name</td>
                          <td className="p-1.5 border-r border-slate-300">C/In</td>
                          <td className="p-1.5 border-r border-slate-300">C/Out</td>
                          <td className="p-1.5 border-r border-slate-300">Night</td>
                          <td className="p-1.5 border-r border-slate-300">Category</td>
                          <td className="p-1.5 border-r border-slate-300">Meal</td>
                          <td className="p-1.5 border-r border-slate-300">Tariff</td>
                          <td className="p-1.5">Total</td>
                        </tr>
                        {tableRows.map((r, idx) => (
                          <tr key={r.id} className={`border-b border-slate-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                            <td className="p-2 border-r border-slate-200 font-bold text-slate-900">{r.hotelName}</td>
                            <td className="p-1.5 border-r border-slate-200 text-center">{r.checkIn}</td>
                            <td className="p-1.5 border-r border-slate-200 text-center">{r.checkOut}</td>
                            <td className="p-1.5 border-r border-slate-200 text-center font-bold">{r.nights}</td>
                            <td className="p-1.5 border-r border-slate-200">{r.category}</td>
                            <td className="p-1.5 border-r border-slate-200 text-center font-bold text-indigo-700">{r.meal}</td>
                            <td className="p-1.5 border-r border-slate-200 text-center">{r.tariffRate}</td>
                            <td className="p-1.5 text-right font-black text-slate-900">₹{r.total}</td>
                          </tr>
                        ))}
                        <tr className="bg-yellow-200 font-black text-slate-900">
                          <td colSpan={7} className="p-2 border-r border-slate-300 text-right text-xs">Grand Total</td>
                          <td className="p-2 text-right text-xs text-amber-950">₹{grandTotalStr || calculateTotal()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p>Please confirm this booking and send us confirmation.</p>

                  <div className="pt-2 text-slate-600 text-xs">
                    <p className="text-slate-400">--</p>
                    <p>Best Regards...</p>
                    <p className="font-bold text-slate-900">{senderName}</p>
                    <p className="text-slate-600">{senderTitle}</p>
                    <p className="font-bold text-indigo-900">{companyName}</p>
                  </div>
                </div>
              )}

              {/* FORMAT 2 VISUAL PREVIEW */}
              {activeFormat === 'format2' && (
                <div className="space-y-4 text-xs font-sans text-slate-800">
                  <p>Dear <strong>{managerGreeting}</strong>,</p>
                  <p>{introText} -</p>

                  <div className="border border-blue-300 rounded-xl overflow-hidden shadow-xs">
                    <div className="bg-blue-600 text-white p-3 font-extrabold text-sm tracking-wide">
                      {f2HotelName}
                    </div>

                    <table className="w-full text-left border-collapse text-xs">
                      <tbody className="divide-y divide-slate-200">
                        <tr className="bg-slate-50">
                          <td className="p-2.5 border-r border-slate-200 font-bold text-slate-600 w-44">Guest Name</td>
                          <td className="p-2.5 font-bold text-slate-900">{guestName}</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="p-2.5 border-r border-slate-200 font-bold text-slate-600">Number of Person's</td>
                          <td className="p-2.5 text-slate-900">{numberOfPersons}</td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="p-2.5 border-r border-slate-200 font-bold text-slate-600">Required Room</td>
                          <td className="p-2.5 font-bold text-slate-900">{f2RequiredRoom}</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="p-2.5 border-r border-slate-200 font-bold text-slate-600">Meal Plan</td>
                          <td className="p-2.5 font-black text-blue-700">{f2MealPlan}</td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="p-2.5 border-r border-slate-200 font-bold text-slate-600">Check - In Date</td>
                          <td className="p-2.5 font-bold text-emerald-700">{f2CheckIn}</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="p-2.5 border-r border-slate-200 font-bold text-slate-600">Check - Out Date</td>
                          <td className="p-2.5 font-bold text-rose-700">{f2CheckOut}</td>
                        </tr>
                        <tr className="bg-slate-50">
                          <td className="p-2.5 border-r border-slate-200 font-bold text-slate-600">Number of Night</td>
                          <td className="p-2.5 font-bold text-slate-900">{f2Nights}</td>
                        </tr>
                        <tr className="bg-white">
                          <td className="p-2.5 border-r border-slate-200 font-bold text-slate-600">Rate / Tariff / Remarks</td>
                          <td className="p-2.5 font-bold text-amber-800">{f2Tariff}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p>Please confirm this booking and send us confirmation.</p>

                  <div className="pt-2 text-slate-600 text-xs">
                    <p className="text-slate-400">--</p>
                    <p>Best Regards...</p>
                    <p className="font-bold text-slate-900">{senderName}</p>
                    <p className="text-slate-600">{senderTitle}</p>
                    <p className="font-bold text-indigo-900">{companyName}</p>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>

        {/* INSTRUCTIONAL TIP BANNER AFTER OPENING GMAIL / COPYING */}
        {showGmailTip && (
          <div className="mx-6 mb-3 p-3.5 bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white rounded-2xl border border-indigo-400/40 flex items-center justify-between shadow-xl animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-400/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="font-black text-xs text-amber-300">
                  ✨ Exact Colored Table Copied to Clipboard!
                </p>
                <p className="text-[11px] text-slate-200 font-medium">
                  In your opened Gmail / Outlook window, simply press <kbd className="px-1.5 py-0.5 bg-white text-slate-900 font-black rounded-md text-[10px] mx-1 shadow-xs">Ctrl + V</kbd> (or Right Click → Paste) to insert the full styled colored table.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowGmailTip(false)} 
              className="text-slate-300 hover:text-white hover:bg-white/10 p-1.5 rounded-xl transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* MODAL FOOTER: ACTION BUTTONS */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          
          {/* Left Copy Options */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopyHTML}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center gap-2 shadow-md transition-all"
              title="Copy formatted rich colored table to paste directly into Gmail or Outlook"
            >
              {copiedType === 'html' ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copiedType === 'html' ? '✓ Copied Colored Table!' : 'Copy Colored Table (Gmail / Outlook)'}</span>
            </button>

            <button
              onClick={handleCopyText}
              className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs"
            >
              {copiedType === 'text' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy Plain Text</span>
            </button>
          </div>

          {/* Right Direct Send / App Triggers */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Primary: Direct Gmail Web Compose with Colored Table Auto-Copied */}
            <button
              onClick={handleOpenGmailWithTable}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs flex items-center gap-2 shadow-md transition-all group"
              title="Opens Gmail compose and copies the exact colored table so you can paste (Ctrl+V) instantly"
            >
              <Mail className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
              <span>Open in Gmail (Colored Table)</span>
            </button>

            {/* Direct Outlook Web Compose Button */}
            <button
              onClick={handleOpenOutlook}
              className="px-3.5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
              title="Open directly in Outlook Web Compose window"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Outlook Web</span>
            </button>

            {/* Native Desktop Mail App */}
            <button
              onClick={handleOpenMailto}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
              title="Open with your computer default email app"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span>Default App</span>
            </button>

            {/* WhatsApp Share */}
            <button
              onClick={handleSendWhatsApp}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-2 shadow-md transition-all"
            >
              <Send className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
