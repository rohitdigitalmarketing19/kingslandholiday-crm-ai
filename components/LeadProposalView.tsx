import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { Lead, LeadNote, QuoteData } from '../types';
import * as api from '../services/apiService';
import { exportElementToPdf } from '../utils/pdfExport';

interface LeadProposalViewProps {
  lead: Lead;
  agentName: string;
  onClose: () => void;
  onUpdateStatus: (leadId: string, status: Lead['status'], extra?: { 
    postponedDate?: string; 
    postponedReason?: string;
    followUpDate?: string;
    followUpTime?: string;
    followUpType?: string;
    followUpNote?: string;
    followUpCompleted?: boolean;
  }) => void;
  onAddNote: (leadId: string, text: string, type: LeadNote['type']) => void;
  onEditQuote: (lead: Lead, quoteId: string) => void;
  onNewQuote: (lead: Lead) => void;
  onDeleteQuote: (leadId: string, quoteId: string) => void;
  onDeleteLead?: (leadId: string) => void;
  isReadOnly?: boolean;
  onUpdateLead?: (updatedLead: Lead) => void;
}

const PASTEL_TAB_COLORS = ['#ff9d81', '#8ecae6', '#c9a4ff', '#8fd9a8', '#ffd166'];

const StructuredTermsBlock: React.FC<{ termsText?: string; isPdf?: boolean }> = ({ termsText, isPdf = false }) => {
  const content = (termsText && termsText.trim().length > 10) ? termsText : `Terms & Conditions

Cancellation Policy (for the land package):
• More than 30 days before the starting date: 25% of the total land package cost will be cancellation fees.
• Between 16-30 days before the starting date: 40% of the total land package cost will be cancellation fees.
• Between 7-15 days before the starting date: 55% of the total land package cost will be cancellation fees.
• Between 3-6 days before the starting date: 70% of the total land package cost will be cancellation fees.
• Within 0-2 days before the starting date: 85% of the total land package cost will be cancellation fees.
• In case of No Show: 100% of the total land package cost will be cancellation fees.
• Peak Periods: No Refund & No Amendment allowed during the Diwali period, Christmas, New Year period, and Long weekends.
• Note: Number of days for cancellation will be counted by first contact and check-in time and date. First contact is considered when you first email / WhatsApp our salesperson cancellation request.

Cancellation Policy (for flights/trains):
• For flights and trains, cancellation charges vary as per airlines / Railways / booking source policies. Cancellation charges will be according to that.

Hotels & Accommodation Guidelines:
• Most of the time hotels mentioned in this quote will be provided. In some cases, if the mentioned hotels are not available due to unforeseen reasons, similar hotels will be provided.
• On 24th Dec - 31st Dec: Gala Dinner may be compulsory in some hotels (ranging from Rs. 1500 per person to Rs. 5000 per person or sometimes higher), payable directly to the hotel.
• Standard Check-in time is 12:00 PM and Check-out time is 10:00 AM (varies as per hotel). Early check-in and/or late check-out is subject to availability and may be chargeable directly to the hotel.
• Itinerary provided in this quote is indicative. It may change before or during the trip if required. No refund will be given in case of a missed itinerary.
• Room Heater: Certain Hotels in Low Budget, Standard, Deluxe categories provide room heaters on request at extra charge. We do not include this cost; travelers settle directly before checkout (INR 250.00 to INR 500.00 per heater per room per night).

Important Information & Permits:
• All guests must carry valid Government Photo IDs (Passport / Driving License / Voter ID). PAN Card is NOT accepted as valid address proof.
• Guests must carry 4 passport size photographs along with Photo-ID proof (Passport / DL / Voter ID & School ID for children) for Gangtok (Changu Lake / Baba Mandir) and North Sikkim (Lachung) permits.
• Tsomgo Lake, Baba Mandir, Nathula Pass, Gurudongmar, Yumthang & Yumesamdong (Zero Point) depend heavily on weather conditions. In hilly areas, roads may be out of operation at the time of travel. Operational status will be updated during the pre-arrival briefing call.
• Nathula Permit Formalities: Nathula Pass is an optional tour with supplement cost, applied 24 hours prior. Only 5% of vehicles get permits via government lottery. Once a permit is issued, there is no refund if Nathula Pass cannot be visited for any reason.
• Himalayan Mountaineering Institute and Padmaja Naidu Himalayan Zoological Park remain closed on Thursday.
• Toy Train Ride: A 2-hour journey starting from Darjeeling up to Ghoom Station and back, covering Batasia Loop, War Memorial & Ghoom Railway Museum. Cost of tickets and pickup-drop will be borne by the traveler.
• The Tibetan Refugee Centre remains closed on Sunday.
• Vehicle Capacity: Maximum capacity is 6 people (including children) as per Motor Vehicle Act.
• Sector Allotment: In Sikkim and Darjeeling, vehicles are allotted per sector as per syndicate rules; a single vehicle cannot be used for the entire trip. Good vehicles and drivers are assured for each sector.
• Point-to-Point Transfers: All vehicles assigned are on a point-to-point basis and not disposable. Air conditioning will not operate on uphill drives.
• Parking & Entry: Due to parking scarcity, entry restrictions and specific timings apply in many areas.
• Natural Diversions: Landslides are common in hilly areas. Guests must bear additional costs for any diversion/changes due to road blockage, landslide, or political unrest.
• Local Syndicate Excursions: Excursions like Tshangu Lake, Nathula, and North Sikkim are controlled by local transport syndicates. Vehicles and drivers may change for transfers and sightseeing.
• Restricted Area Security: Nathula is a restricted area and can be sealed without notice for security reasons. In such cases, tours operate only up to Tshangu Lake with no refund for unutilized services.
• Payment Schedule: Payments must be cleared as per the payment schedule. Delayed installments attract late payment charges (5% of installment amount).

Pure Agent Declaration (Terms & Conditions):
• We provide our services strictly as a pure agent, and charge a service fee solely for planning, coordinating, and arranging the tour on behalf of the client.
• All other travel-related services (transport, hotel booking, entry tickets, etc.) are arranged on behalf of the customer and recovered at actual cost.
• As a pure agent: We do not intend to hold nor hold any title to the goods or services procured on behalf of the client.
• We do not use such goods or services for our own interest or benefit.
• We recover only the actual amount incurred for third-party services, in addition to our separately charged service fee.
• All legal obligations are subject to Jaipur jurisdiction only.`;

  const sections: { title: string; items: string[] }[] = [];
  let currentSection = { title: 'Standard Terms & Conditions', items: [] as string[] };

  const rawLines = content.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of rawLines) {
    const lower = line.toLowerCase();
    if (
      lower.startsWith('cancellation policy') ||
      lower.startsWith('hotels') ||
      lower.startsWith('important') ||
      lower.startsWith('pure agent') ||
      lower.startsWith('payment schedule') ||
      line.endsWith(':')
    ) {
      if (currentSection.items.length > 0 || currentSection.title !== 'Standard Terms & Conditions') {
        sections.push(currentSection);
      }
      currentSection = { title: line.replace(/:$/, ''), items: [] };
    } else if (lower === 'terms & conditions' || lower === 'terms and conditions') {
      // Header skip
    } else {
      const cleanLine = line.replace(/^[•\-\*]\s*/, '').trim();
      if (cleanLine) {
        currentSection.items.push(cleanLine);
      }
    }
  }
  if (currentSection.items.length > 0) {
    sections.push(currentSection);
  }

  if (isPdf) {
    return (
      <div className="terms-box" style={{ border: '1px solid #D7E0EA', borderRadius: '4px', padding: '10px 14px', fontSize: '9px', background: '#ffffff', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        {sections.map((sec, sIdx) => (
          <div key={sIdx} style={{ marginBottom: sIdx === sections.length - 1 ? 0 : '8px' }}>
            <div style={{ fontWeight: 700, color: '#12233D', fontSize: '10px', marginBottom: '3px', borderBottom: '1px solid #EEF2F6', paddingBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              {sec.title}
            </div>
            <ul style={{ margin: '0', paddingLeft: '14px', listStyleType: 'disc', color: '#3d4f66', lineHeight: '1.45' }}>
              {sec.items.map((it, iIdx) => (
                <li key={iIdx} style={{ marginBottom: '2px' }}>{it}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="border border-[#D7E0EA] rounded-xl p-5 bg-white space-y-4 text-xs">
      {sections.map((sec, sIdx) => (
        <div key={sIdx} className="space-y-1.5">
          <h5 className="font-bold text-[#12233D] text-xs pb-1 border-b border-slate-100 flex items-center gap-1.5 uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
            {sec.title}
          </h5>
          <ul className="text-[11px] text-slate-600 list-disc pl-5 space-y-1 leading-relaxed">
            {sec.items.map((it, iIdx) => (
              <li key={iIdx}>{it}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

const getCleanDayTitle = (day: any, dIdx: number, totalDays: number, destination?: string) => {
  const clean = (day.title || '').trim();
  if (clean && !/^day\s*0*\d+$/i.test(clean)) {
    return clean;
  }
  // If no title provided or user left default "Day X", provide a meaningful contextual title
  if (dIdx === 0) return `Arrival & Welcome in ${destination || 'Destination'}`;
  if (dIdx === totalDays - 1) return `Departure from ${destination || 'Destination'} with Memories`;
  if (dIdx === 1) return `Local Sightseeing & Guided City Tour`;
  return `Day ${dIdx + 1} Excursion & Highlights`;
};

const LeadProposalView: React.FC<LeadProposalViewProps> = ({ lead, agentName, onClose, onUpdateStatus, onAddNote, onEditQuote, onNewQuote, onDeleteQuote, onDeleteLead, isReadOnly = false, onUpdateLead }) => {
  const [activeQuoteIndex, setActiveQuoteIndex] = useState(0);
  const [pendingStatus, setPendingStatus] = useState<{ label: string; status: Lead['status']; color: string; bg: string } | null>(null);

  const [isEditingReqs, setIsEditingReqs] = useState(false);
  const [tempAdults, setTempAdults] = useState(lead?.travelers?.adults || 0);
  const [tempChildren, setTempChildren] = useState(lead?.travelers?.children || 0);
  const [tempChildAgesStr, setTempChildAgesStr] = useState((lead?.travelers?.childAges || []).join(', '));
  const [tempBudgetTier, setTempBudgetTier] = useState<'Luxury' | 'Mid' | 'Budget'>(lead?.budgetTier || 'Mid');
  const [tempIncludeStay, setTempIncludeStay] = useState(lead?.includeStay || 'Yes');
  const [tempIncludeFlight, setTempIncludeFlight] = useState(lead?.includeFlight || 'No');
  const [tempIncludeCab, setTempIncludeCab] = useState(lead?.includeCab || 'Yes');
  const [tempHotelCategory, setTempHotelCategory] = useState(lead?.hotelCategory || '4/3 Star');
  const [tempOtherInfo, setTempOtherInfo] = useState(lead?.otherInfo || '');

  useEffect(() => {
    if (lead) {
      setTempAdults(lead.travelers?.adults || 0);
      setTempChildren(lead.travelers?.children || 0);
      setTempChildAgesStr((lead.travelers?.childAges || []).join(', '));
      setTempBudgetTier(lead.budgetTier || 'Mid');
      setTempIncludeStay(lead.includeStay || 'Yes');
      setTempIncludeFlight(lead.includeFlight || 'No');
      setTempIncludeCab(lead.includeCab || 'Yes');
      setTempHotelCategory(lead.hotelCategory || '4/3 Star');
      setTempOtherInfo(lead.otherInfo || '');
    }
  }, [lead]);

  const handleSaveTravelerRequirements = async () => {
    try {
      const childAgesArr = tempChildAgesStr
        .split(',')
        .map(a => a.trim())
        .filter(Boolean)
        .map(Number)
        .filter(n => !isNaN(n));

      const updated = await api.updateLeadTravelers(
        lead.id,
        Number(tempAdults),
        Number(tempChildren),
        childAgesArr,
        {
          budgetTier: tempBudgetTier,
          includeStay: tempIncludeStay,
          includeFlight: tempIncludeFlight,
          includeCab: tempIncludeCab,
          hotelCategory: tempHotelCategory,
          otherInfo: tempOtherInfo
        }
      );
      if (updated && onUpdateLead) {
        onUpdateLead(updated);
      }
      setIsEditingReqs(false);
    } catch (e) {
      console.error('Error saving traveler requirements:', e);
      alert('Failed to save traveler requirements');
    }
  };
  
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [postponeDate, setPostponeDate] = useState<string>(lead?.postponedDate || '');
  const [postponeReason, setPostponeReason] = useState<string>(lead?.postponedReason || '');
  const [followUpDate, setFollowUpDate] = useState<string>(lead?.followUpDate || new Date().toISOString().split('T')[0]);
  const [followUpTime, setFollowUpTime] = useState<string>(lead?.followUpTime || '10:30');
  const [followUpType, setFollowUpType] = useState<'Call' | 'WhatsApp' | 'Email' | 'Meeting'>(lead?.followUpType || 'Call');
  const [followUpNote, setFollowUpNote] = useState<string>(lead?.followUpNote || '');
  const [pendingReminder, setPendingReminder] = useState<{ date: string; time: string } | null>(null);
  const [isConfirmingCNP, setIsConfirmingCNP] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [noteText, setNoteText] = useState('');
  const printRef = useRef<HTMLDivElement>(null);
  
  const quotes = lead?.quotes || [];
  const currentQuote = quotes[activeQuoteIndex];

  // Payment & EMI State inside Lead Preview
  const [paymentMode, setPaymentMode] = useState<'Deposit' | 'Partial'>('Partial');
  const [leadInstallments, setLeadInstallments] = useState<any[]>([]);
  const [isSavingInstallments, setIsSavingInstallments] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<any>(null);

  // PDF Designs & Template Styling State
  const [pdfDesigns, setPdfDesigns] = useState<any[]>([]);
  const [selectedDesign, setSelectedDesign] = useState<any>(null);

  useEffect(() => {
    api.fetchPdfDesigns().then((designs) => {
      if (Array.isArray(designs) && designs.length > 0) {
        setPdfDesigns(designs);
        const active = designs.find((d: any) => d.is_active === 1) || designs[0];
        setSelectedDesign(active);
      }
    }).catch(() => {});
  }, []);

  const designColors = useMemo(() => {
    if (!selectedDesign) {
      return {
        primary: '#3A6EA5',
        secondary: '#12233D',
        textPrimary: '#12233D',
        fontFamily: "'IBM Plex Serif', Georgia, serif",
        watermark: 'KINGSLAND HOLIDAYS',
        bannerUrl: '',
        stampUrl: ''
      };
    }
    const primary = selectedDesign.primary_color || '#3A6EA5';
    const secondary = selectedDesign.secondary_color || '#12233D';
    const font = selectedDesign.font_family || 'IBM Plex Serif';
    return {
      primary,
      secondary,
      textPrimary: secondary,
      fontFamily: font.includes('serif') || font.includes('Sans') || font.includes('Display') || font.includes('Outfit') ? `'${font}', serif` : `'${font}', sans-serif`,
      watermark: selectedDesign.watermark_text || 'KINGSLAND HOLIDAYS',
      bannerUrl: selectedDesign.header_banner_url || '',
      stampUrl: selectedDesign.agency_stamp_url || ''
    };
  }, [selectedDesign]);

  useEffect(() => {
    if (lead?.id) {
      api.fetchLeadInstallments(lead.id).then((instData) => {
        const pkgPrice = currentQuote?.finalSellingPrice || 0;
        const hasOnlyZero = instData && instData.length > 0 && instData.every((i: any) => !i.amount || Number(i.amount) === 0);
        if (instData && instData.length > 0 && !hasOnlyZero) {
          setLeadInstallments(instData);
          setPaymentMode('Partial');
        } else {
          const effectivePrice = pkgPrice > 0 ? pkgPrice : ((lead as any).budget || 50000);
          const part1 = Math.round(effectivePrice * 0.3);
          const part2 = Math.round(effectivePrice * 0.4);
          const part3 = effectivePrice - part1 - part2;
          const newInsts = [
            { title: '1st Installment - Token / Visa', amount: part1, dueDate: lead.travelDate || '', paymentCondition: 'Immediate for booking token' },
            { title: '2nd Installment - Hotel & Flight Lock', amount: part2, dueDate: lead.travelDate || '', paymentCondition: '30 days before departure' },
            { title: '3rd Installment - Final Balance', amount: part3, dueDate: lead.travelDate || '', paymentCondition: '15 days before departure' },
          ];
          setLeadInstallments(newInsts);
          if (hasOnlyZero && pkgPrice > 0) {
            api.saveInstallmentSchedule(lead.id, newInsts).catch(() => {});
          }
        }
      });
      api.fetchPaymentSettings().then(setPaymentSettings);
    }
  }, [lead?.id, currentQuote?.finalSellingPrice]);


  const handlePresetEMISchedule = (ratio: '30-40-30' | '50-50') => {
    const pkgPrice = currentQuote?.finalSellingPrice || 50000;
    if (ratio === '30-40-30') {
      const part1 = Math.round(pkgPrice * 0.3);
      const part2 = Math.round(pkgPrice * 0.4);
      const part3 = pkgPrice - part1 - part2;
      setLeadInstallments([
        { title: '1st Installment (Booking Advance - 30%)', amount: part1, due_date: new Date().toISOString().split('T')[0], payment_condition: 'Upon Booking', payment_status: 'Pending' },
        { title: '2nd Installment (Mid Payment - 40%)', amount: part2, due_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0], payment_condition: '15 Days Before Travel', payment_status: 'Pending' },
        { title: '3rd Installment (Final Balance - 30%)', amount: part3, due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], payment_condition: 'Before Travel', payment_status: 'Pending' },
      ]);
    } else {
      const part1 = Math.round(pkgPrice * 0.5);
      const part2 = pkgPrice - part1;
      setLeadInstallments([
        { title: '1st Installment (Advance Deposit - 50%)', amount: part1, due_date: new Date().toISOString().split('T')[0], payment_condition: 'Upon Booking', payment_status: 'Pending' },
        { title: '2nd Installment (Final Balance - 50%)', amount: part2, due_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0], payment_condition: 'Before Travel', payment_status: 'Pending' },
      ]);
    }
  };

  const handleSaveInstallmentSchedule = async () => {
    if (!lead?.id) return;
    setIsSavingInstallments(true);
    try {
      const saved = await api.saveInstallmentSchedule(lead.id, leadInstallments);
      setLeadInstallments(saved);
      onAddNote(lead.id, `Saved EMI Installment Schedule (${leadInstallments.length} Milestones)`, 'Action');
      alert('Installment EMI schedule saved successfully!');
    } catch (err) {
      console.error('Failed to save installments:', err);
      alert('Failed to save EMI schedule.');
    } finally {
      setIsSavingInstallments(false);
    }
  };

  const triggerRecordManualPayment = async (idx: number) => {
    const target = leadInstallments[idx];
    if (!target) return;
    const updated = [...leadInstallments];
    updated[idx].payment_status = 'Paid';
    setLeadInstallments(updated);

    await api.saveInstallmentSchedule(lead.id, updated);
    await api.createPaymentSubmission({
      payKey: target.pay_key || 'MANUAL',
      leadId: lead.id,
      customerName: lead.name,
      mobile: lead.phone || '',
      packageName: currentQuote?.packageTitle || lead.destination,
      amountPaid: target.amount,
      utrNumber: `MANUAL_REC_${Date.now().toString().slice(-6)}`,
      paymentMode: 'Cash'
    });
    onAddNote(lead.id, `Recorded Manual Payment of ₹${target.amount.toLocaleString()} for "${target.title}"`, 'Action');
    alert(`Payment of ₹${target.amount.toLocaleString()} recorded successfully for "${target.title}"!`);
  };

  const triggerRazorpayCheckout = (amount: number, title: string) => {
    const keyId = paymentSettings?.key_id || 'rzp_test_51HKingslandDemoKey';

    const options = {
      key: keyId,
      amount: Math.round(amount * 100),
      currency: 'INR',
      name: 'Kingsland Holidays Services',
      description: title,
      image: 'https://cdn-icons-png.flaticon.com/512/201/201623.png',
      handler: function (response: any) {
        alert(`Razorpay Payment Successful!\nPayment ID: ${response.razorpay_payment_id}`);
        api.createPaymentSubmission({
          payKey: 'RAZORPAY',
          leadId: lead.id,
          customerName: lead.name,
          mobile: lead.phone || '',
          packageName: currentQuote?.packageTitle || lead.destination,
          amountPaid: amount,
          utrNumber: response.razorpay_payment_id || 'RAZORPAY_PAID',
          paymentMode: 'Razorpay'
        });
        onUpdateStatus(lead.id, 'Closed Won');
      },
      prefill: {
        name: lead.name,
        contact: lead.phone || '',
        email: lead.email || 'guest@kingslandholidays.com'
      },
      theme: { color: '#7B1D2A' }
    };

    const runRazorpay = () => {
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    };

    if ((window as any).Razorpay) {
      runRazorpay();
    } else {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = runRazorpay;
      document.body.appendChild(script);
    }
  };

  const statusOptions: { label: string; status: Lead['status']; color: string; bg: string; badgeBg: string }[] = [
    { label: 'ACTIVE LEAD', status: 'Qualified', color: 'text-indigo-600', bg: 'bg-indigo-50', badgeBg: 'bg-indigo-500' },
    { label: 'FOLLOW-UP', status: 'Follow-up', color: 'text-amber-600', bg: 'bg-amber-50', badgeBg: 'bg-amber-500' },
    { label: 'HOT LEAD', status: 'Hot', color: 'text-rose-500', bg: 'bg-rose-50', badgeBg: 'bg-rose-500' },
    { label: 'UPDATE LEAD', status: 'Updated', color: 'text-blue-600', bg: 'bg-blue-50', badgeBg: 'bg-blue-500' },
    { label: 'IN PROGRESS LEAD', status: 'Itinerary Sent', color: 'text-amber-600', bg: 'bg-amber-50', badgeBg: 'bg-amber-500' },
    { label: 'CONVERTED', status: 'Closed Won', color: 'text-emerald-600', bg: 'bg-emerald-50', badgeBg: 'bg-emerald-500' },
    { label: 'CANCEL', status: 'Closed Lost', color: 'text-slate-400', bg: 'bg-slate-50', badgeBg: 'bg-slate-400' },
    { label: 'POSTPONED', status: 'Postponed', color: 'text-purple-600', bg: 'bg-purple-50', badgeBg: 'bg-purple-500' },
  ];

  const currentOption = statusOptions.find(o => o.status === lead?.status);
  const currentStatusLabel = currentOption?.label || lead?.status || 'NEW LEAD';
  const currentBadgeBg = currentOption?.badgeBg || 'bg-slate-500';

  const handleConfirmStatusUpdate = () => {
    if (pendingStatus && lead) {
      if (pendingStatus.status === 'Postponed') {
        if (!postponeDate) {
          alert('Please enter or select the postponed travel / follow-up date.');
          return;
        }
        if (postponeDate < todayStr) {
          alert('Postponed date cannot be a past date. Please select today or a future date.');
          return;
        }
        onUpdateStatus(lead.id, pendingStatus.status, { postponedDate: postponeDate, postponedReason: postponeReason });
      } else if (pendingStatus.status === 'Follow-up') {
        if (!followUpDate) {
          alert('Please select the follow-up date.');
          return;
        }
        if (followUpDate < todayStr) {
          alert('Follow-up date cannot be a past date. Please select today or a future date.');
          return;
        }
        onUpdateStatus(lead.id, pendingStatus.status, { 
          followUpDate, 
          followUpTime: followUpTime || '10:30', 
          followUpType, 
          followUpNote: followUpNote || 'Follow up with client' 
        });
      } else {
        onUpdateStatus(lead.id, pendingStatus.status);
      }
      setPendingStatus(null);
    }
  };

  const handleConfirmReminder = () => {
    if (pendingReminder && pendingReminder.date && pendingReminder.time && lead) {
      if (pendingReminder.date < todayStr) {
        alert('Reminder date cannot be a past date. Please select today or a future date.');
        return;
      }
      const reminderText = `Call Reminder set for ${new Date(pendingReminder.date).toLocaleDateString()} at ${pendingReminder.time}`;
      onAddNote(lead.id, reminderText, 'Action');
      setPendingReminder(null);
    }
  };

  const handleConfirmCNP = () => {
    if (lead) {
      onAddNote(lead.id, 'CNP (Call Not Picked)', 'Action');
      setIsConfirmingCNP(false);
    }
  };

  const handleConfirmDelete = () => {
    if (currentQuote && lead) {
      onDeleteQuote(lead.id, currentQuote.id);
      setActiveQuoteIndex(0);
    }
    setIsConfirmingDelete(false);
  };

  const handleAddNote = () => {
    if (noteText.trim() && lead) {
      onAddNote(lead.id, noteText, 'Note');
      setNoteText('');
    }
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current || !currentQuote || !lead) return;

    setIsDownloading(true);
    try {
      const filename = `Kingsland-Proposal-${lead.tripId}-${(currentQuote.packageTitle || 'Package').replace(/\s+/g, '-')}.pdf`;
      await exportElementToPdf(printRef.current, {
        filename,
        margin: 8,
        width: 794,
        scale: 3
      });
    } catch (err) {
      console.error('PDF Generation Error:', err);
      alert('Failed to generate PDF. Browser restrictions may apply.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleActionClick = (action: string) => {
    if (action === 'Download') {
      handleDownloadPDF();
    } else if (action === 'Delete') {
      setIsConfirmingDelete(true);
    }
  };

  const getAccommodationInclusion = (quote: QuoteData) => {
    if (!quote?.inclusions?.accommodation) return 'Excluded';
    const acc = quote.inclusions.accommodation;
    const parts = [];
    if (acc.single?.included) parts.push('Single');
    if (acc.double?.included) parts.push('Double');
    if (acc.triple?.included) parts.push('Triple');
    return parts.length > 0 ? `Accommodation on ${parts.join(' / ')}` : 'Excluded';
  };

  const getMealInclusion = (quote: QuoteData) => {
    if (!quote?.inclusions?.mealPlan) return 'Excluded';
    const meals = quote.inclusions.mealPlan;
    const parts = [];
    if (meals.breakfast?.included) parts.push('Breakfast');
    if (meals.lunch?.included) parts.push('Lunch');
    if (meals.dinner?.included) parts.push('Dinner');
    return parts.length > 0 ? `Meals: ${parts.join(', ')}` : 'Excluded';
  };

  const parseCustomItems = (text?: string): string[] => {
    if (!text) return [];
    return text.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
  };

  const pricingData = useMemo(() => {
    if (!currentQuote) return { mrp: 0, finalPrice: 0, savings: 0, discount: 0 };
    const finalPrice = currentQuote.finalSellingPrice || 0;
    const discount = currentQuote.discountPercentage || 0;
    const factor = 1 - (discount / 100);
    const mrp = factor > 0 ? Math.round(finalPrice / factor) : finalPrice;
    const savings = mrp - finalPrice;
    return { mrp, finalPrice, savings, discount };
  }, [currentQuote]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xl flex flex-col justify-between">
      {/* Printable PDF Template container (Styled strictly as Kingsland-Proposal-Design5-CorporateQuotation.html) */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '794px', minWidth: '794px', maxWidth: '794px', background: '#ffffff', backgroundColor: '#ffffff' }}>
        <div ref={printRef} style={{ width: '794px', minWidth: '794px', maxWidth: '794px', boxSizing: 'border-box', fontFamily: "'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: '#1B2A41', background: '#ffffff', backgroundColor: '#ffffff', fontSize: '11.8px', lineHeight: '1.55', padding: '24px 30px' }}>
          {currentQuote && lead && (
            <div>
              <style>{`
                .meta-strip, .quotebox, .trust-strip, .hrow, .hstays, .day, .box, .two-col,
                .guarantee-strip, .terms-box, .trow, .partners, .partner-row, .signblock,
                .footer, .testimonial, .section-title, .avoid-page-break { break-inside: avoid !important; page-break-inside: avoid !important; }
                .hhead, .section-title { break-after: avoid !important; page-break-after: avoid !important; }
              `}</style>

              {/* Letterhead */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #12233D', paddingBottom: '14px' }}>
                <div>
                  <div style={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontWeight: 700, fontSize: '22px', color: '#12233D' }}>Kingsland Holidays</div>
                  <div style={{ fontFamily: "'Work Sans', sans-serif", fontSize: '9.5px', letterSpacing: '2px', textTransform: 'uppercase', color: '#5c7291', marginTop: '3px' }}>
                    Registered Tour Operator · North India Journeys
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: '#3A6EA5', fontWeight: 700 }}>Travel Quotation</div>
                  <div style={{ fontSize: '10.5px', color: '#5c7291', marginTop: '4px' }}>
                    Ref. No. {lead.tripId} · {currentQuote.packageTitle || lead.destination}
                  </div>
                </div>
              </div>

              {/* Meta Strip */}
              <div className="meta-strip" style={{ display: 'flex', marginTop: '14px', border: '1px solid #D7E0EA', borderRadius: '4px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <div style={{ flex: 1, padding: '10px 14px', borderRight: '1px solid #D7E0EA' }}>
                  <div style={{ fontSize: '8.5px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#5c7291' }}>Prepared For</div>
                  <div style={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontWeight: 700, fontSize: '13px', marginTop: '2px', color: '#12233D' }}>{lead.name}</div>
                </div>
                <div style={{ flex: 1, padding: '10px 14px', borderRight: '1px solid #D7E0EA' }}>
                  <div style={{ fontSize: '8.5px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#5c7291' }}>Package</div>
                  <div style={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontWeight: 700, fontSize: '13px', marginTop: '2px', color: '#12233D' }}>{currentQuote.packageTitle || lead.destination}</div>
                </div>
                <div style={{ flex: 1, padding: '10px 14px', borderRight: '1px solid #D7E0EA' }}>
                  <div style={{ fontSize: '8.5px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#5c7291' }}>Duration</div>
                  <div style={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontWeight: 700, fontSize: '13px', marginTop: '2px', color: '#12233D' }}>
                    {currentQuote.nights || (lead.durationDays ? lead.durationDays - 1 : 6)} Nights / {currentQuote.itinerary?.length || lead.durationDays || 7} Days
                  </div>
                </div>
                <div style={{ flex: 1, padding: '10px 14px' }}>
                  <div style={{ fontSize: '8.5px', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#5c7291' }}>Services</div>
                  <div style={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontWeight: 700, fontSize: '12px', marginTop: '2px', color: '#12233D' }}>
                    Cab, Hotel, Sightseeing{lead.includeFlight === 'Yes' ? ', Flight' : ''}
                  </div>
                </div>
              </div>

              {/* Greeting Line */}
              <div style={{ marginTop: '16px', fontSize: '12px', color: '#1B2A41' }}>
                Dear <b style={{ color: '#12233D' }}>{lead.name}</b>, thank you for considering Kingsland Holidays. Please find below our detailed quotation for your requested itinerary.
              </div>

              {/* Quotebox (Price Hero matching Kingsland-Proposal-FIXED.html) */}
              <div className="quotebox" style={{ marginTop: '14px', border: '2px solid #12233D', borderRadius: '6px', display: 'flex', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <div className="qleft" style={{ flex: 1, padding: '14px 18px' }}>
                  <div style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: '#5c7291' }}>Quoted Package Price</div>
                  <div style={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontSize: '15px', fontWeight: 700, marginTop: '3px', color: '#12233D' }}>
                    {currentQuote.packageTitle || `${lead.destination} Trip Package`} — {lead.travelers?.adults || 2} Adults{lead.travelers?.children ? `, ${lead.travelers.children} Children` : ''} · Private Tour
                  </div>
                </div>
                <div className="qright" style={{ width: '190px', flexShrink: 0, background: '#12233D', color: '#ffffff', padding: '14px 18px', textAlign: 'center' }}>
                  {pricingData.discount > 0 ? (
                    <div>
                      <div style={{ background: '#3A6EA5', fontSize: '9px', letterSpacing: '1px', padding: '2px 8px', borderRadius: '3px', display: 'inline-block', marginBottom: '6px', fontWeight: 700 }}>
                        {pricingData.discount}% DISCOUNT APPLIED
                      </div>
                      <div style={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontWeight: 700, fontSize: '24px' }}>
                        ₹{pricingData.finalPrice.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '10px', textDecoration: 'line-through', color: '#9ab0c9' }}>
                        ₹{pricingData.mrp.toLocaleString()}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ background: '#3A6EA5', fontSize: '9px', letterSpacing: '1px', padding: '2px 8px', borderRadius: '3px', display: 'inline-block', marginBottom: '6px', fontWeight: 700 }}>
                        ALL-INCLUSIVE QUOTE
                      </div>
                      <div style={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontWeight: 700, fontSize: '24px' }}>
                        ₹{pricingData.finalPrice.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Trust Strip */}
              <div className="trust-strip" style={{ display: 'flex', marginTop: '14px', background: '#F4F7FA', border: '1px solid #D7E0EA', borderRadius: '4px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <div className="trust-item" style={{ flex: 1, textAlign: 'center', padding: '10px 6px', borderRight: '1px solid #D7E0EA' }}>
                  <div className="num" style={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontWeight: 700, fontSize: '15px', color: '#12233D' }}>12,000+</div>
                  <div className="lbl" style={{ fontSize: '8px', letterSpacing: '1px', textTransform: 'uppercase', color: '#5c7291', marginTop: '2px' }}>Trips Delivered</div>
                </div>
                <div className="trust-item" style={{ flex: 1, textAlign: 'center', padding: '10px 6px', borderRight: '1px solid #D7E0EA' }}>
                  <div className="num" style={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontWeight: 700, fontSize: '15px', color: '#12233D' }}>4.8/5</div>
                  <div className="lbl" style={{ fontSize: '8px', letterSpacing: '1px', textTransform: 'uppercase', color: '#5c7291', marginTop: '2px' }}>2,140+ Reviews</div>
                </div>
                <div className="trust-item" style={{ flex: 1, textAlign: 'center', padding: '10px 6px', borderRight: '1px solid #D7E0EA' }}>
                  <div className="num" style={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontWeight: 700, fontSize: '15px', color: '#12233D' }}>98%</div>
                  <div className="lbl" style={{ fontSize: '8px', letterSpacing: '1px', textTransform: 'uppercase', color: '#5c7291', marginTop: '2px' }}>Super Reviews</div>
                </div>
                <div className="trust-item" style={{ flex: 1, textAlign: 'center', padding: '10px 6px' }}>
                  <div className="num" style={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontWeight: 700, fontSize: '15px', color: '#12233D' }}>11 Yrs</div>
                  <div className="lbl" style={{ fontSize: '8px', letterSpacing: '1px', textTransform: 'uppercase', color: '#5c7291', marginTop: '2px' }}>In Operation</div>
                </div>
              </div>

              {/* Accommodation Schedule Table */}
              {currentQuote.hotels && currentQuote.hotels.length > 0 && (
                <div style={{ marginTop: '18px' }}>
                  <div className="section-title" style={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontWeight: 700, fontSize: '13.5px', color: '#12233D', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid #D7E0EA', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Accommodation Schedule
                  </div>
                  <div className="hstays" style={{ border: '1px solid #D7E0EA', borderRadius: '4px', overflow: 'hidden' }}>
                    <div className="hhead" style={{ display: 'flex', background: '#12233D', color: '#ffffff', fontSize: '9px', letterSpacing: '1px', textTransform: 'uppercase', padding: '8px 14px', pageBreakAfter: 'avoid', breakAfter: 'avoid' }}>
                      <div className="c1" style={{ width: '70px', flexShrink: 0, fontWeight: 700 }}>Night</div>
                      <div className="c2" style={{ width: '100px', flexShrink: 0 }}>Region / City</div>
                      <div className="c3" style={{ flex: 1, fontWeight: 700 }}>Hotel</div>
                      <div className="c4" style={{ width: '90px', flexShrink: 0 }}>Category</div>
                      <div className="c5" style={{ width: '170px', flexShrink: 0, textAlign: 'right' }}>Room Type</div>
                    </div>
                    {currentQuote.hotels.map((hotel, hIdx) => {
                      const nightStr = (hotel.selectedNightIndices || []).map(n => n + 1).join(' & ');
                      return (
                        <div key={hIdx} className="hrow" style={{ display: 'flex', padding: '8px 14px', borderBottom: hIdx === currentQuote.hotels.length - 1 ? 'none' : '1px solid #EEF2F6', fontSize: '11px', background: hIdx % 2 === 1 ? '#F9FBFC' : '#ffffff', alignItems: 'center', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                          <div className="c1" style={{ width: '70px', flexShrink: 0, fontWeight: 700, color: '#12233D' }}>Night {nightStr || hIdx + 1}</div>
                          <div className="c2" style={{ width: '100px', flexShrink: 0, color: '#5c7291' }}>{hotel.city || lead.destination}</div>
                          <div className="c3" style={{ flex: 1, fontWeight: 700, color: '#12233D' }}>
                            <div>{hotel.hotelName || 'Selected Property'}</div>
                            {hotel.comments && (
                              <div style={{ fontSize: '9px', color: '#B45309', fontWeight: 600, marginTop: '2px' }}>
                                ✨ {hotel.comments}
                              </div>
                            )}
                          </div>
                          <div className="c4" style={{ width: '90px', flexShrink: 0, color: '#3A6EA5', fontWeight: 600 }}>{hotel.category || '4 Star'}</div>
                          <div className="c5" style={{ width: '170px', flexShrink: 0, textAlign: 'right', color: '#5c7291' }}>
                            <div style={{ fontWeight: 600, color: '#12233D' }}>{hotel.roomType || 'Standard Room'}</div>
                            <div style={{ fontSize: '9px', color: '#5c7291' }}>{lead.travelers?.adults || 2} Adults{lead.travelers?.children ? `, ${lead.travelers.children} Child` : ''}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Day-Wise Itinerary */}
              {currentQuote.itinerary && currentQuote.itinerary.length > 0 && (
                <div style={{ marginTop: '18px' }}>
                  <div className="section-title" style={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontWeight: 700, fontSize: '13.5px', color: '#12233D', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid #D7E0EA', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Day-Wise Itinerary
                  </div>
                  {currentQuote.itinerary.map((day, dIdx) => (
                    <div key={dIdx} className="day" style={{ display: 'flex', gap: '14px', padding: '9px 0', borderBottom: '1px solid #EEF2F6', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <div className="dtag" style={{ width: '60px', flexShrink: 0, fontFamily: "'IBM Plex Serif', Georgia, serif", fontWeight: 700, fontSize: '12px', color: '#3A6EA5' }}>
                        Day {String(day.day || dIdx + 1).padStart(2, '0')}
                      </div>
                      <div className="dbody" style={{ flex: 1 }}>
                        <h3 style={{ margin: '0 0 3px 0', fontSize: '12.5px', fontWeight: 700, color: '#12233D' }}>
                          {getCleanDayTitle(day, dIdx, currentQuote.itinerary.length, lead.destination)}
                        </h3>
                        <p style={{ margin: 0, fontSize: '10.8px', color: '#3d4f66', lineHeight: 1.55 }}>{day.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Testimonial Box */}
              <div className="testimonial" style={{ marginTop: '14px', background: '#F4F7FA', borderLeft: '3px solid #3A6EA5', padding: '12px 16px', fontSize: '11.5px', fontStyle: 'italic', color: '#1B2A41', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                “Every hotel, cab and guide was exactly as promised — Kingsland made our trip effortless and truly memorable.”
                <div className="auth" style={{ marginTop: '4px', fontSize: '9.5px', color: '#5c7291', fontStyle: 'normal', fontWeight: 700 }}>
                  — Verified Client Review · Kingsland Holidays
                </div>
              </div>

              {/* Inclusions & Exclusions */}
              <div className="avoid-page-break" style={{ marginTop: '18px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <div className="section-title" style={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontWeight: 700, fontSize: '13.5px', color: '#12233D', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid #D7E0EA', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Inclusions & Exclusions
                </div>
                <div className="two-col" style={{ display: 'flex', gap: '14px', marginTop: '6px' }}>
                  <div className="box inc" style={{ flex: 1, border: '1px solid #D7E0EA', borderRadius: '4px', padding: '12px 16px', background: '#ffffff', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '10.5px', letterSpacing: '1px', textTransform: 'uppercase', color: '#12233D', fontWeight: 700 }}>INCLUDED</h4>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: '10.8px' }}>
                      <li style={{ marginBottom: '4px', color: '#1B2A41' }}><span style={{ color: '#2E7D32', fontWeight: 700, marginRight: '4px' }}>✓</span> {getAccommodationInclusion(currentQuote)}</li>
                      <li style={{ marginBottom: '4px', color: '#1B2A41' }}><span style={{ color: '#2E7D32', fontWeight: 700, marginRight: '4px' }}>✓</span> {getMealInclusion(currentQuote)}</li>
                      {currentQuote.inclusions?.transfer?.arrival?.included && <li style={{ marginBottom: '4px', color: '#1B2A41' }}><span style={{ color: '#2E7D32', fontWeight: 700, marginRight: '4px' }}>✓</span> Airport / Station Transfers Included</li>}
                      {currentQuote.inclusions?.sightseeing?.included && <li style={{ marginBottom: '4px', color: '#1B2A41' }}><span style={{ color: '#2E7D32', fontWeight: 700, marginRight: '4px' }}>✓</span> All Sightseeing as per itinerary</li>}
                      {currentQuote.inclusions?.taxes?.included && <li style={{ marginBottom: '4px', color: '#1B2A41' }}><span style={{ color: '#2E7D32', fontWeight: 700, marginRight: '4px' }}>✓</span> Government Taxes & Service Charges</li>}
                      {currentQuote.otherInclusions && parseCustomItems(currentQuote.otherInclusions).map((inc, i) => (
                        <li key={i} style={{ marginBottom: '4px', color: '#1B2A41' }}><span style={{ color: '#2E7D32', fontWeight: 700, marginRight: '4px' }}>✓</span> {inc}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="box exc" style={{ flex: 1, border: '1px solid #D7E0EA', borderRadius: '4px', padding: '12px 16px', background: '#ffffff', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '10.5px', letterSpacing: '1px', textTransform: 'uppercase', color: '#12233D', fontWeight: 700 }}>EXCLUDED</h4>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: '10.8px' }}>
                      <li style={{ marginBottom: '4px', color: '#1B2A41' }}><span style={{ color: '#C62828', fontWeight: 700, marginRight: '4px' }}>✕</span> Personal Expenses (Laundry, Drinks, Tips)</li>
                      <li style={{ marginBottom: '4px', color: '#1B2A41' }}><span style={{ color: '#C62828', fontWeight: 700, marginRight: '4px' }}>✕</span> Optional Tours & Activities</li>
                      {currentQuote.flightsNotIncluded && <li style={{ marginBottom: '4px', color: '#1B2A41' }}><span style={{ color: '#C62828', fontWeight: 700, marginRight: '4px' }}>✕</span> Airfare / Train Tickets</li>}
                      {currentQuote.otherExclusions && parseCustomItems(currentQuote.otherExclusions).map((exc, i) => (
                        <li key={i} style={{ marginBottom: '4px', color: '#1B2A41' }}><span style={{ color: '#C62828', fontWeight: 700, marginRight: '4px' }}>✕</span> {exc}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Guarantee Strip */}
              <div className="guarantee-strip avoid-page-break" style={{ display: 'flex', gap: '10px', marginTop: '14px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <div className="gitem" style={{ flex: 1, border: '1px solid #D7E0EA', borderRadius: '4px', padding: '9px 12px', textAlign: 'center', background: '#F4F7FA' }}>
                  <div className="gt" style={{ fontWeight: 700, fontSize: '10.5px', color: '#12233D' }}>Best Price Guarantee</div>
                  <div className="gs" style={{ fontSize: '8.5px', color: '#5c7291', marginTop: '2px' }}>We'll match a lower quote</div>
                </div>
                <div className="gitem" style={{ flex: 1, border: '1px solid #D7E0EA', borderRadius: '4px', padding: '9px 12px', textAlign: 'center', background: '#F4F7FA' }}>
                  <div className="gt" style={{ fontWeight: 700, fontSize: '10.5px', color: '#12233D' }}>Free Cancellation</div>
                  <div className="gs" style={{ fontSize: '8.5px', color: '#5c7291', marginTop: '2px' }}>Free cancellation up to 30 days before travel</div>
                </div>
                <div className="gitem" style={{ flex: 1, border: '1px solid #D7E0EA', borderRadius: '4px', padding: '9px 12px', textAlign: 'center', background: '#F4F7FA' }}>
                  <div className="gt" style={{ fontWeight: 700, fontSize: '10.5px', color: '#12233D' }}>Secure Payments</div>
                  <div className="gs" style={{ fontSize: '8.5px', color: '#5c7291', marginTop: '2px' }}>Secure payments via UPI, Cards & Net Banking</div>
                </div>
              </div>

              {/* Terms & Cancellation Policy */}
              <div className="avoid-page-break" style={{ marginTop: '18px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <div className="section-title" style={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontWeight: 700, fontSize: '13.5px', color: '#12233D', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid #D7E0EA', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Terms & Cancellation Policy
                </div>
                <StructuredTermsBlock termsText={currentQuote.termsAndConditions} isPdf={true} />
              </div>

              {/* Our Hotel Partner Network */}
              <div className="partners" style={{ marginTop: '18px', border: '1px solid #D7E0EA', borderRadius: '4px', padding: '12px 14px', background: '#F9FBFC', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <div className="section-title" style={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontWeight: 700, fontSize: '13.5px', color: '#12233D', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid #D7E0EA', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Our Hotel Partner Network
                </div>
                <div className="partner-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="partner-badge" style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRight: '1px solid #E4EAF0' }}>
                    <div className="pname" style={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontWeight: 700, fontSize: '12px', color: '#12233D' }}>TAJ HOTELS</div>
                    <div className="ptag" style={{ fontSize: '7.5px', letterSpacing: '1px', textTransform: 'uppercase', color: '#8fa0b5', marginTop: '2px' }}>IHCL Group</div>
                  </div>
                  <div className="partner-badge" style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRight: '1px solid #E4EAF0' }}>
                    <div className="pname" style={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontWeight: 700, fontSize: '12px', color: '#12233D' }}>OBEROI</div>
                    <div className="ptag" style={{ fontSize: '7.5px', letterSpacing: '1px', textTransform: 'uppercase', color: '#8fa0b5', marginTop: '2px' }}>Luxury Collection</div>
                  </div>
                  <div className="partner-badge" style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRight: '1px solid #E4EAF0' }}>
                    <div className="pname" style={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontWeight: 700, fontSize: '12px', color: '#12233D' }}>ITC HOTELS</div>
                    <div className="ptag" style={{ fontSize: '7.5px', letterSpacing: '1px', textTransform: 'uppercase', color: '#8fa0b5', marginTop: '2px' }}>Responsible Luxury</div>
                  </div>
                  <div className="partner-badge" style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRight: '1px solid #E4EAF0' }}>
                    <div className="pname" style={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontWeight: 700, fontSize: '12px', color: '#12233D' }}>RADISSON</div>
                    <div className="ptag" style={{ fontSize: '7.5px', letterSpacing: '1px', textTransform: 'uppercase', color: '#8fa0b5', marginTop: '2px' }}>Hotel Group</div>
                  </div>
                  <div className="partner-badge" style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRight: '1px solid #E4EAF0' }}>
                    <div className="pname" style={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontWeight: 700, fontSize: '12px', color: '#12233D' }}>THE LEELA</div>
                    <div className="ptag" style={{ fontSize: '7.5px', letterSpacing: '1px', textTransform: 'uppercase', color: '#8fa0b5', marginTop: '2px' }}>Palaces & Resorts</div>
                  </div>
                  <div className="partner-badge" style={{ flex: 1, textAlign: 'center', padding: '8px 4px' }}>
                    <div className="pname" style={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontWeight: 700, fontSize: '12px', color: '#12233D' }}>MARRIOTT</div>
                    <div className="ptag" style={{ fontSize: '7.5px', letterSpacing: '1px', textTransform: 'uppercase', color: '#8fa0b5', marginTop: '2px' }}>Bonvoy Network</div>
                  </div>
                </div>
                <div className="pnote" style={{ textAlign: 'center', fontSize: '8.5px', color: '#8fa0b5', marginTop: '8px' }}>
                  Indicative hotel partners; final property confirmed at booking.
                </div>
              </div>

              {/* Working With Travel Partners */}
              <div className="partners" style={{ marginTop: '16px', border: '1px solid #D7E0EA', borderRadius: '4px', padding: '12px 14px', background: '#F9FBFC', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <div className="section-title" style={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontWeight: 700, fontSize: '13.5px', color: '#12233D', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid #D7E0EA', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Working With Travel Partners
                </div>
                <div className="partner-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="partner-badge" style={{ flex: 1, textAlign: 'center', padding: '6px 4px', borderRight: '1px solid #E4EAF0' }}>
                    <div className="pname" style={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontWeight: 700, fontSize: '12px', color: '#12233D' }}>MakeMyTrip</div>
                    <div className="ptag" style={{ fontSize: '7.5px', letterSpacing: '1px', textTransform: 'uppercase', color: '#8fa0b5', marginTop: '2px' }}>Verified Seller</div>
                  </div>
                  <div className="partner-badge" style={{ flex: 1, textAlign: 'center', padding: '6px 4px', borderRight: '1px solid #E4EAF0' }}>
                    <div className="pname" style={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontWeight: 700, fontSize: '12px', color: '#12233D' }}>Travel Triangle</div>
                    <div className="ptag" style={{ fontSize: '7.5px', letterSpacing: '1px', textTransform: 'uppercase', color: '#8fa0b5', marginTop: '2px' }}>Certified Partner Agent</div>
                  </div>
                  <div className="partner-badge" style={{ flex: 1, textAlign: 'center', padding: '6px 4px' }}>
                    <div className="pname" style={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontWeight: 700, fontSize: '12px', color: '#12233D' }}>TripAdvisor</div>
                    <div className="ptag" style={{ fontSize: '7.5px', letterSpacing: '1px', textTransform: 'uppercase', color: '#8fa0b5', marginTop: '2px' }}>Traveller Reviewed</div>
                  </div>
                </div>
              </div>

              {/* Signature Block */}
              <div className="signblock" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '22px', padding: '0 8px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <div className="sign" style={{ width: '220px' }}>
                  <b style={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontSize: '12px', color: '#12233D', display: 'block' }}>For {lead.name}</b>
                  <div className="line" style={{ borderTop: '1px solid #12233D', marginTop: '28px', paddingTop: '4px', fontSize: '9.5px', color: '#5c7291' }}>
                    Client Acceptance & Signature
                  </div>
                </div>
                <div className="sign" style={{ width: '220px', textAlign: 'right' }}>
                  <b style={{ fontFamily: "'IBM Plex Serif', Georgia, serif", fontSize: '12px', color: '#12233D', display: 'block' }}>For Kingsland Holidays</b>
                  <div className="line" style={{ borderTop: '1px solid #12233D', marginTop: '28px', paddingTop: '4px', fontSize: '9.5px', color: '#5c7291' }}>
                    Authorised Signatory ({agentName})
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="footer" style={{ marginTop: '18px', background: '#12233D', color: '#ffffff', padding: '14px 18px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                <div>
                  <span style={{ color: '#9ab0c9' }}>Trip Advisor:</span> <strong>{agentName}</strong> · Senior Trip Advisor
                </div>
                <div>
                  <span style={{ color: '#9ab0c9' }}>Contact:</span> +91 6376983416, +91 7014939068 · official.kingslandholidays@gmail.com
                </div>
              </div>
              <div className="license" style={{ textAlign: 'center', fontSize: '8.5px', color: '#8a94a3', marginTop: '8px' }}>
                Regd. No. RAJ/TRVL/2019/00842 · Govt. Recognised Tour Operator · www.kingslandholidays.com
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Top Header Bar */}
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={onClose} className="p-3 bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 rounded-2xl transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                PROPOSAL VIEWER
              </span>
              <span className="text-xs font-black text-slate-400">#{lead?.tripId}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">{lead?.name} — {lead?.destination}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {pdfDesigns.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-100 px-3.5 py-2.5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs">🎨</span>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Design:</span>
              <select
                value={selectedDesign?.id || ''}
                onChange={(e) => {
                  const found = pdfDesigns.find(d => d.id === e.target.value);
                  if (found) setSelectedDesign(found);
                }}
                className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
              >
                {pdfDesigns.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.title} {d.is_active === 1 ? '★ Active' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!isReadOnly && onDeleteLead && (
            <button
              type="button"
              onClick={() => {
                onDeleteLead(lead.id);
              }}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg font-medium text-xs transition-all flex items-center gap-1.5 shadow-xs"
              title="Delete Lead"
            >
              <Trash2 size={14} />
              <span>Delete Lead</span>
            </button>
          )}

          <button 
            onClick={handleDownloadPDF} 
            disabled={isDownloading || !currentQuote}
            className="px-6 py-3.5 bg-[#12233D] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg flex items-center gap-3 disabled:opacity-50"
            style={{ backgroundColor: designColors.secondary }}
          >
            {isDownloading ? (
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            DOWNLOAD PROPOSAL PDF
          </button>
        </div>
      </header>

      {/* Main Content Workspace */}
      <div className="flex-1 overflow-y-auto p-8 md:p-10 custom-scrollbar">
         {/* STATUS CONFIRMATION MODAL */}
         {pendingStatus && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
             <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-10 text-center animate-in zoom-in-95 duration-300">
               <div className={`w-16 h-16 mx-auto rounded-3xl ${pendingStatus.bg} flex items-center justify-center mb-6 text-2xl`}>
                 {pendingStatus.status === 'Postponed' ? '📅' : pendingStatus.status === 'Follow-up' ? '⏰' : '📌'}
               </div>
               <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">
                 {pendingStatus.status === 'Postponed' ? 'Postpone Lead Trip' : pendingStatus.status === 'Follow-up' ? 'Schedule Follow-up' : 'Update Lead Status?'}
               </h3>
               <p className="text-xs text-slate-500 mb-6 font-medium">
                 {pendingStatus.status === 'Postponed' 
                   ? 'Please select the next follow-up or postponed travel date for this lead.' 
                   : pendingStatus.status === 'Follow-up'
                   ? 'Set scheduled customer touchpoint date, time & action note.'
                   : <>Change status to <span className={`font-black ${pendingStatus.color}`}>{pendingStatus.label}</span>.</>}
               </p>

               {pendingStatus.status === 'Postponed' && (
                 <div className="space-y-4 mb-6 text-left">
                   <div>
                     <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                       📅 Postponed Date <span className="text-rose-500">*</span>
                     </label>
                     <input 
                       type="date" 
                       min={todayStr}
                       value={postponeDate} 
                       onChange={e => setPostponeDate(e.target.value)} 
                       className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 focus:outline-indigo-500" 
                       required 
                     />
                   </div>
                   <div>
                     <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                       📝 Reason / Notes (Optional)
                     </label>
                     <input 
                       type="text" 
                       placeholder="e.g., Client requested trip next quarter" 
                       value={postponeReason} 
                       onChange={e => setPostponeReason(e.target.value)} 
                       className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 focus:outline-indigo-500" 
                     />
                   </div>
                 </div>
               )}

               {pendingStatus.status === 'Follow-up' && (
                 <div className="space-y-4 mb-6 text-left">
                   <div className="grid grid-cols-2 gap-3">
                     <div>
                       <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                         📅 Date <span className="text-rose-500">*</span>
                       </label>
                       <input 
                         type="date" 
                         min={todayStr}
                         value={followUpDate} 
                         onChange={e => setFollowUpDate(e.target.value)} 
                         className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-indigo-500" 
                         required 
                       />
                     </div>
                     <div>
                       <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                         ⏰ Time <span className="text-rose-500">*</span>
                       </label>
                       <input 
                         type="time" 
                         value={followUpTime} 
                         onChange={e => setFollowUpTime(e.target.value)} 
                         className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-indigo-500" 
                         required 
                       />
                     </div>
                   </div>

                   <div>
                     <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                       Touchpoint Type
                     </label>
                     <div className="grid grid-cols-4 gap-1.5">
                       {(['Call', 'WhatsApp', 'Email', 'Meeting'] as const).map(t => (
                         <button
                           key={t}
                           type="button"
                           onClick={() => setFollowUpType(t)}
                           className={`py-2 px-1 rounded-xl text-[10px] font-extrabold uppercase transition-all ${
                             followUpType === t 
                               ? 'bg-amber-500 text-white shadow-xs font-black' 
                               : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                           }`}
                         >
                           {t === 'Call' ? '📞 Call' : t === 'WhatsApp' ? '💬 WA' : t === 'Email' ? '✉️ Mail' : '🤝 Meet'}
                         </button>
                       ))}
                     </div>
                   </div>

                   <div>
                     <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                       📝 Note / Agenda
                     </label>
                     <textarea 
                       rows={2}
                       placeholder="e.g., Share room-upgrade options and child policy in writing." 
                       value={followUpNote} 
                       onChange={e => setFollowUpNote(e.target.value)} 
                       className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-indigo-500 resize-none" 
                     />
                   </div>
                 </div>
               )}

               <div className="flex gap-4">
                 <button onClick={() => setPendingStatus(null)} className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl border border-slate-100 hover:bg-slate-50">Cancel</button>
                 <button onClick={handleConfirmStatusUpdate} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-slate-800">Confirm</button>
               </div>
             </div>
           </div>
         )}

         {/* DELETE CONFIRMATION MODAL */}
         {isConfirmingDelete && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
             <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-10 text-center animate-in zoom-in-95 duration-300">
               <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-50 flex items-center justify-center mb-6 text-2xl text-rose-500">⚠️</div>
               <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Delete Quotation?</h3>
               <p className="text-xs text-slate-500 mb-8 font-medium">This quote option will be permanently removed.</p>
               <div className="flex gap-4">
                 <button onClick={() => setIsConfirmingDelete(false)} className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl border border-slate-100 hover:bg-slate-50">Cancel</button>
                 <button onClick={handleConfirmDelete} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-rose-700">Delete</button>
               </div>
             </div>
           </div>
         )}

         {/* REMINDER SETTER MODAL */}
         {pendingReminder && (
           <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
             <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-10 text-center animate-in zoom-in-95 duration-300 space-y-6">
               <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-50 flex items-center justify-center text-2xl text-indigo-600">⏰</div>
               <h3 className="text-xl font-black text-slate-900 tracking-tight">Schedule Call Reminder</h3>
               <div className="space-y-4">
                 <input type="date" min={todayStr} value={pendingReminder.date} onChange={e => setPendingReminder({ ...pendingReminder, date: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold" />
                 <input type="time" value={pendingReminder.time} onChange={e => setPendingReminder({ ...pendingReminder, time: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold" />
               </div>
               <div className="flex gap-4 pt-2">
                 <button onClick={() => setPendingReminder(null)} className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-2xl">Cancel</button>
                 <button onClick={handleConfirmReminder} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">Set Reminder</button>
               </div>
             </div>
           </div>
         )}

         <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10 pb-24">
            
            {/* SIDEBAR: LEAD CONTROL PANEL & ANALYSIS */}
            {!isReadOnly && (
            <div className="lg:col-span-1 space-y-8">
               
               {/* LEAD STATUS CONTROL CARD WITH CONFIRMATION */}
               <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                    <div>
                      <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block mb-1">LEAD STATUS CONTROL</span>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">{lead.name}</h3>
                    </div>
                    <span className="text-xs font-black text-slate-400">#{lead.tripId}</span>
                  </div>

                  {/* Current Active Status Badge */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Status</span>
                    <span className={`px-4 py-1.5 ${currentBadgeBg} text-white text-[10px] font-black rounded-full uppercase tracking-wider`}>
                      {currentStatusLabel}
                    </span>
                  </div>

                  {/* Interactive Status Changer Buttons (All Trigger Confirmation Modal) */}
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Update Lead Status (Requires Approval):</p>
                    <div className="grid grid-cols-1 gap-2">
                      {statusOptions.map((opt) => {
                        const isCurrent = lead.status === opt.status;
                        return (
                          <button
                            key={opt.status}
                            onClick={() => setPendingStatus(opt)}
                            className={`w-full p-3.5 rounded-2xl text-left font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-between border ${
                              isCurrent 
                                ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                                : `${opt.bg} ${opt.color} border-slate-100 hover:scale-[1.02] hover:shadow-sm`
                            }`}
                          >
                            <span>{opt.label}</span>
                            {isCurrent && <span className="text-xs">✓ Active</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
               </div>

                {/* TRAVELER REQUIREMENTS CARD */}
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 space-y-6">
                   <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                      <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.25em]">TRAVELER REQUIREMENTS</h3>
                      {!isReadOnly && !isEditingReqs && (
                        <button
                          type="button"
                          onClick={() => setIsEditingReqs(true)}
                          className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase hover:bg-indigo-100 transition-colors"
                        >
                          ✏️ Edit Reqs
                        </button>
                      )}
                   </div>

                   {isEditingReqs ? (
                     <div className="space-y-4 text-xs">
                       <div className="grid grid-cols-2 gap-3">
                         <div>
                           <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Adults</label>
                           <input
                             type="number"
                             min={0}
                             value={tempAdults}
                             onChange={(e) => setTempAdults(Number(e.target.value))}
                             className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                           />
                         </div>
                         <div>
                           <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Children</label>
                           <input
                             type="number"
                             min={0}
                             value={tempChildren}
                             onChange={(e) => setTempChildren(Number(e.target.value))}
                             className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                           />
                         </div>
                       </div>

                       <div>
                         <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Child Ages (comma separated)</label>
                         <input
                           type="text"
                           placeholder="e.g. 5, 8"
                           value={tempChildAgesStr}
                           onChange={(e) => setTempChildAgesStr(e.target.value)}
                           className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                         />
                       </div>

                       <div className="grid grid-cols-2 gap-3">
                         <div>
                           <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Budget Tier</label>
                           <select
                             value={tempBudgetTier}
                             onChange={(e) => setTempBudgetTier(e.target.value as 'Luxury' | 'Mid' | 'Budget')}
                             className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                           >
                             <option value="Budget">Budget</option>
                             <option value="Mid">Mid</option>
                             <option value="Luxury">Luxury</option>
                           </select>
                         </div>
                         <div>
                           <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Hotel Category</label>
                           <select
                             value={tempHotelCategory}
                             onChange={(e) => setTempHotelCategory(e.target.value)}
                             className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                           >
                             <option value="2 Star">2 Star</option>
                             <option value="3 Star">3 Star</option>
                             <option value="4/3 Star">4/3 Star</option>
                             <option value="4 Star">4 Star</option>
                             <option value="5 Star">5 Star</option>
                           </select>
                         </div>
                       </div>

                       <div className="grid grid-cols-3 gap-2">
                         <div>
                           <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Stay</label>
                           <select
                             value={tempIncludeStay}
                             onChange={(e) => setTempIncludeStay(e.target.value)}
                             className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold outline-none"
                           >
                             <option value="Yes">Yes</option>
                             <option value="No">No</option>
                           </select>
                         </div>
                         <div>
                           <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Flights</label>
                           <select
                             value={tempIncludeFlight}
                             onChange={(e) => setTempIncludeFlight(e.target.value)}
                             className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold outline-none"
                           >
                             <option value="Yes">Yes</option>
                             <option value="No">No</option>
                           </select>
                         </div>
                         <div>
                           <label className="block text-[8px] font-black text-slate-400 uppercase mb-1">Cab</label>
                           <select
                             value={tempIncludeCab}
                             onChange={(e) => setTempIncludeCab(e.target.value)}
                             className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold outline-none"
                           >
                             <option value="Yes">Yes</option>
                             <option value="No">No</option>
                           </select>
                         </div>
                       </div>

                       <div>
                         <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Special Comments</label>
                         <textarea
                           rows={2}
                           value={tempOtherInfo}
                           onChange={(e) => setTempOtherInfo(e.target.value)}
                           className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium outline-none resize-none"
                           placeholder="Add requirements comments..."
                         />
                       </div>

                       <div className="flex gap-2 pt-2">
                         <button
                           type="button"
                           onClick={() => setIsEditingReqs(false)}
                           className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors"
                         >
                           Cancel
                         </button>
                         <button
                           type="button"
                           onClick={handleSaveTravelerRequirements}
                           className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors"
                         >
                           Save Reqs
                         </button>
                       </div>
                     </div>
                   ) : (
                     <div className="space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                           <div>
                              <p className="text-[9px] font-black text-slate-400 uppercase mb-1">TRIP ROSTER</p>
                              <p className="text-base font-black text-slate-800">{lead.travelers?.adults || 0} Adults, {lead.travelers?.children || 0} Children</p>
                           </div>
                           <span className="text-[9px] font-black bg-slate-50 px-3 py-1 rounded-lg text-slate-500 border border-slate-100">{lead.budgetTier} Tier</span>
                        </div>

                        {lead.travelers?.childAges && lead.travelers.childAges.length > 0 && (
                          <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50 flex items-center justify-between">
                            <span className="text-[9px] font-black text-indigo-400 uppercase">Child Ages</span>
                            <span className="text-xs font-black text-indigo-700">{lead.travelers.childAges.join(', ')} yrs</span>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 pt-2">
                           {[
                             { l: 'Accommodation', v: lead.includeStay || 'N/A', icon: '🏨' },
                             { l: 'Flights', v: lead.includeFlight || 'N/A', icon: '✈️' },
                             { l: 'Private Cab', v: lead.includeCab || 'N/A', icon: '🚗' },
                             { l: 'Hotel Star', v: lead.hotelCategory || 'N/A', icon: '⭐' },
                           ].map((pref, i) => (
                             <div key={i} className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                <span className="text-sm block mb-1">{pref.icon}</span>
                                <span className="text-[8px] font-black text-slate-400 uppercase block">{pref.l}</span>
                                <span className="text-xs font-black text-slate-800 truncate block">{pref.v}</span>
                             </div>
                           ))}
                        </div>

                        {lead.otherInfo && (
                          <div className="pt-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Special Comments</span>
                            <p className="text-xs text-slate-600 font-medium bg-amber-50/50 p-3 rounded-xl border border-amber-100">{lead.otherInfo}</p>
                          </div>
                        )}
                     </div>
                   )}
                </div>

               {/* LOG ACTIVITY & NOTES CARD (Matching Screenshot Design) */}
               <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 space-y-6">
                  <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.25em] border-b border-slate-100 pb-3">LOG ACTIVITY & NOTES</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button"
                      onClick={() => {
                        onAddNote(lead.id, 'CNP (Call Not Picked)', 'Action');
                        alert(`📞 CNP (Call Not Picked) logged for ${lead.name}.`);
                      }} 
                      className="py-4 px-4 bg-[#FAFBFD] hover:bg-rose-50 text-[#8C2C5E] hover:text-rose-700 font-extrabold text-[11px] uppercase tracking-wider rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-center gap-2 transition-all group"
                    >
                      <span className="text-base group-hover:scale-110 transition-transform">📞</span>
                      <span>CNP (NO PICK)</span>
                    </button>

                    <button 
                      type="button"
                      onClick={() => setPendingReminder({ date: new Date().toISOString().split('T')[0], time: '14:00' })} 
                      className="py-4 px-4 bg-[#FAFBFD] hover:bg-indigo-50 text-[#3A3550] hover:text-indigo-700 font-extrabold text-[11px] uppercase tracking-wider rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-center gap-2 transition-all group"
                    >
                      <span className="text-base group-hover:scale-110 transition-transform">⏰</span>
                      <span>SCHEDULE CALL</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    <textarea 
                      rows={3} 
                      value={noteText} 
                      onChange={e => setNoteText(e.target.value)} 
                      placeholder="Add follow-up note..." 
                      className="w-full bg-[#F7F9FC] border border-slate-200 rounded-2xl p-4 text-xs font-medium text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all resize-none shadow-inner"
                    />
                    <button 
                      type="button"
                      onClick={handleAddNote} 
                      className="w-full py-4 bg-[#0F172A] hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all"
                    >
                      ADD NOTE TO LEAD
                    </button>
                  </div>
               </div>

               {/* LEAD COMMENTS & SCHEDULED CALLS LOG (Rendered below the box) */}
               <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.25em]">LEAD COMMENTS & SCHEDULED CALLS</h3>
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100">
                      {lead.notes?.length || 0} Logs
                    </span>
                  </div>

                  <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-1">
                    {lead.notes && lead.notes.length > 0 ? (
                      [...lead.notes].reverse().map((note) => {
                        const isCnp = note.text.includes('CNP');
                        const isReminder = note.text.includes('Reminder') || note.text.includes('Scheduled');
                        
                        return (
                          <div 
                            key={note.id} 
                            className={`p-4 rounded-2xl border text-xs space-y-1.5 transition-all ${
                              isCnp 
                                ? 'bg-rose-50/70 border-rose-200 text-rose-950' 
                                : isReminder 
                                  ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950' 
                                  : 'bg-slate-50 border-slate-100 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                                isCnp 
                                  ? 'bg-rose-200 text-rose-800 border border-rose-300' 
                                  : isReminder 
                                    ? 'bg-indigo-200 text-indigo-800 border border-indigo-300' 
                                    : 'bg-slate-200 text-slate-700'
                              }`}>
                                {isCnp ? '📞 CNP (No Pick)' : isReminder ? '⏰ Scheduled Call' : note.type}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400">
                                {new Date(note.timestamp).toLocaleDateString()} at {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="font-bold leading-relaxed">{note.text}</p>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-8 text-center text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        No activity comments or scheduled calls logged yet.
                      </div>
                    )}
                  </div>
               </div>

            </div>
            )}

            {/* RIGHT COLUMN: PACKAGE PROPOSAL PRESENTATION */}
            <div className={isReadOnly ? "lg:col-span-3 space-y-8 max-w-5xl mx-auto w-full" : "lg:col-span-2 space-y-8"}>
               
               {/* PACKAGE SELECTOR TABS */}
               <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                     <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                       {lead.destination} Proposals
                     </h2>
                     <span className="text-xs font-black text-slate-400">{quotes.length} Option{quotes.length === 1 ? '' : 's'} Created</span>
                  </div>

                  {quotes.length > 0 && (
                    <div className="flex flex-wrap gap-4 border-b border-slate-200 pb-6">
                       {quotes.map((q, idx) => (
                         <button key={q.id} onClick={() => setActiveQuoteIndex(idx)} className={`px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${activeQuoteIndex === idx ? 'bg-[#3a3550] text-white shadow-xl scale-105' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}>
                            Package {idx + 1}
                         </button>
                       ))}
                       {!isReadOnly && (
                         <button onClick={() => onNewQuote(lead)} className="px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-all">+ New Option</button>
                       )}
                    </div>
                  )}
               </div>

               {currentQuote ? (
                 <div className="space-y-8 animate-in fade-in duration-500">
                   
                   {/* PACKAGE OPTIONS MANAGEMENT CARD — 3 ACTION BUTTONS (PDF, EDIT, DELETE) */}
                   <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white p-8 rounded-2xl border border-slate-100 shadow-xl">
                      <div className="flex-1">
                         <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Viewing Package {activeQuoteIndex + 1}</p>
                         <h3 className="text-2xl font-black text-slate-900 tracking-tight">{currentQuote.packageTitle || 'Package Proposal'}</h3>
                         <div className="flex items-center gap-6 mt-3">
                            <div className="flex flex-col">
                               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Investment</span>
                               <span className="text-xl font-black text-emerald-600">₹{pricingData.finalPrice.toLocaleString()}</span>
                            </div>
                            <div className="w-px h-7 bg-slate-100"></div>
                            <div className="flex flex-col">
                               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Duration</span>
                               <span className="text-sm font-black text-slate-800">{currentQuote.itinerary?.length || lead.durationDays || 7} Days</span>
                            </div>
                         </div>
                      </div>

                      <div className="flex gap-4 sm:gap-6 items-center flex-wrap">
                        {!isReadOnly && (
                          <button 
                            onClick={async () => {
                              try {
                                const title = currentQuote.packageTitle || `${lead.destination} Itinerary - ${lead.name}`;
                                await api.createTemplate({
                                  title: title,
                                  destination: lead.destination || 'Custom',
                                  nights: currentQuote.nights || (currentQuote.itinerary?.length || lead.durationDays || 5),
                                  templateData: currentQuote
                                });
                                alert(`✅ Itinerary package saved to "Saved Itineraries" section with title:\n\n"${title}"`);
                              } catch (err) {
                                console.error('Failed to save to template library:', err);
                                alert('Error saving itinerary draft.');
                              }
                            }} 
                            className="flex flex-col items-center gap-2 group"
                            title="Save this itinerary proposal to Saved Itineraries section"
                          >
                             <div className="w-13 h-13 p-3 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white shadow-inner group-hover:scale-110 transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                </svg>
                             </div>
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Save Draft</span>
                          </button>
                        )}

                        {/* Button 1: Download PDF */}
                        <button onClick={handleDownloadPDF} disabled={isDownloading} className="flex flex-col items-center gap-2 group disabled:opacity-50">
                           <div className="w-13 h-13 p-3 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white shadow-inner group-hover:scale-110 transition-all">
                              {isDownloading ? (
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              )}
                           </div>
                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">PDF</span>
                        </button>

                        {/* Button 2: Edit Quote */}
                        {!isReadOnly && (
                          <button 
                            onClick={() => onEditQuote(lead, currentQuote.id)} 
                            className="flex flex-col items-center gap-2 group"
                            title="Edit details, days, prices, and hotels of this package proposal"
                          >
                             <div className="w-13 h-13 p-3 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 group-hover:bg-amber-500 group-hover:text-white shadow-inner group-hover:scale-110 transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                             </div>
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Edit Quote</span>
                          </button>
                        )}

                        {/* Button 3: Delete Option */}
                        {!isReadOnly && quotes.length > 1 && (
                          <button 
                            onClick={() => onDeleteQuote(lead.id, currentQuote.id)} 
                            className="flex flex-col items-center gap-2 group"
                            title="Delete this quote option"
                          >
                             <div className="w-13 h-13 p-3 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white shadow-inner group-hover:scale-110 transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                             </div>
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Delete Option</span>
                          </button>
                        )}
                       </div>
                    </div>

                   <div
                     ref={printRef}
                     className="doc-preview-protected bg-white rounded-2xl p-8 md:p-12 border shadow-xl space-y-8 relative overflow-hidden"
                     style={{
                       borderColor: designColors.primary + '40',
                       fontFamily: designColors.fontFamily || "'Work Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                     }}
                   >
                     {/* Watermark Overlay */}
                     {designColors.watermark && (
                       <div
                         className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none text-[60px] md:text-[80px] font-black uppercase tracking-[16px] rotate-[-28deg] z-0"
                         style={{ color: designColors.secondary }}
                       >
                         {designColors.watermark}
                       </div>
                     )}

                     {/* Optional Custom Header Banner */}
                     {designColors.bannerUrl && (
                       <div className="w-full h-32 rounded-xl overflow-hidden mb-4 border border-slate-200 avoid-page-break relative z-10">
                         <img src={designColors.bannerUrl} alt="Header Banner" className="w-full h-full object-cover" />
                       </div>
                     )}
                     
                     {/* Letterhead */}
                     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b-[3px] gap-4 avoid-page-break relative z-10" style={{ borderColor: designColors.secondary }}>
                       <div>
                         <h2 className="text-2xl sm:text-3xl font-black" style={{ color: designColors.secondary, fontFamily: designColors.fontFamily }}>Kingsland Holidays</h2>
                         <p className="text-[10px] tracking-[2px] uppercase font-semibold mt-1" style={{ color: designColors.primary }}>Registered Tour Operator · North India & International Journeys</p>
                       </div>
                       <div className="sm:text-right">
                         <span className="text-xs font-bold tracking-[2px] uppercase block" style={{ color: designColors.primary }}>Travel Quotation</span>
                         <span className="text-xs text-slate-500 mt-1 block">Ref. No. {lead.tripId} · {currentQuote.packageTitle || lead.destination}</span>
                         {selectedDesign && (
                           <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 inline-block mt-1">Theme: {selectedDesign.title}</span>
                         )}
                       </div>
                     </div>

                     {/* Meta Strip */}
                     <div className="grid grid-cols-2 md:grid-cols-4 border rounded-xl overflow-hidden divide-y md:divide-y-0 md:divide-x bg-[#F9FBFC]/70 relative z-10" style={{ borderColor: designColors.primary + '30' }}>
                       <div className="p-4">
                         <span className="text-[9px] tracking-wider uppercase block font-bold text-slate-500">Prepared For</span>
                         <span className="text-sm font-bold block mt-1" style={{ color: designColors.secondary, fontFamily: designColors.fontFamily }}>{lead.name}</span>
                       </div>
                       <div className="p-4">
                         <span className="text-[9px] tracking-wider uppercase block font-bold text-slate-500">Package</span>
                         <span className="text-sm font-bold block mt-1" style={{ color: designColors.secondary, fontFamily: designColors.fontFamily }}>{currentQuote.packageTitle || lead.destination}</span>
                       </div>
                       <div className="p-4">
                         <span className="text-[9px] tracking-wider uppercase block font-bold text-slate-500">Duration</span>
                         <span className="text-sm font-bold block mt-1" style={{ color: designColors.secondary, fontFamily: designColors.fontFamily }}>
                           {currentQuote.nights || (lead.durationDays ? lead.durationDays - 1 : 6)}N / {currentQuote.itinerary?.length || lead.durationDays || 7}D
                         </span>
                       </div>
                       <div className="p-4">
                         <span className="text-[9px] tracking-wider uppercase block font-bold text-slate-500">Services</span>
                         <span className="text-sm font-bold block mt-1" style={{ color: designColors.secondary, fontFamily: designColors.fontFamily }}>
                           Cab, Hotel, Sightseeing{lead.includeFlight === 'Yes' ? ', Flight' : ''}
                         </span>
                       </div>
                     </div>

                     {/* Greeting Line */}
                     <p className="text-sm text-slate-700 leading-relaxed relative z-10">
                       Dear <strong style={{ color: designColors.secondary }}>{lead.name}</strong>, thank you for considering Kingsland Holidays. Please find below our detailed quotation for your requested itinerary.
                     </p>

                     {/* Quotebox (Quoted Package Price Hero) */}
                      <div className="border-2 rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-sm avoid-page-break relative z-10" style={{ borderColor: designColors.secondary }}>
                        <div className="p-5 md:p-6 flex-1 bg-white flex flex-col justify-center">
                          <span className="text-[10px] tracking-[2px] uppercase font-bold block mb-1" style={{ color: designColors.primary }}>Quoted Package Price</span>
                          <h3 className="text-xl sm:text-2xl font-bold" style={{ color: designColors.secondary, fontFamily: designColors.fontFamily }}>
                            {currentQuote.packageTitle || `${lead.destination} Trip Package`}
                          </h3>
                          <p className="text-xs text-slate-500 mt-2 font-medium">
                            {lead.travelers?.adults || 2} Adults{lead.travelers?.children ? `, ${lead.travelers.children} Children` : ''} · Private Vehicle & Handpicked Stays
                          </p>
                        </div>
                        <div className="text-white p-4 md:p-5 flex flex-col items-center justify-center text-center md:min-w-[220px]" style={{ backgroundColor: designColors.secondary }}>
                          {pricingData.discount > 0 ? (
                            <div className="w-full">
                              <span className="inline-block text-white text-[9px] font-extrabold tracking-wider px-3 py-1 rounded mb-1.5" style={{ backgroundColor: designColors.primary }}>
                                {pricingData.discount}% DISCOUNT APPLIED
                              </span>
                              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-none" style={{ fontFamily: designColors.fontFamily }}>
                                ₹{pricingData.finalPrice.toLocaleString()}
                              </div>
                              <div className="text-xs text-slate-300 line-through mt-1.5 leading-tight">
                                ₹{pricingData.mrp.toLocaleString()}
                              </div>
                            </div>
                          ) : (
                            <div className="w-full">
                              <span className="inline-block text-white text-[9px] font-extrabold tracking-wider px-3 py-1 rounded mb-1.5" style={{ backgroundColor: designColors.primary }}>
                                ALL-INCLUSIVE QUOTE
                              </span>
                              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-none" style={{ fontFamily: designColors.fontFamily }}>
                                ₹{pricingData.finalPrice.toLocaleString()}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                     {/* Trust Strip */}
                     <div className="grid grid-cols-2 md:grid-cols-4 border rounded-xl bg-[#F4F7FA] divide-y md:divide-y-0 md:divide-x text-center avoid-page-break relative z-10" style={{ borderColor: designColors.primary + '30' }}>
                       <div className="p-4">
                         <div className="text-lg font-bold" style={{ color: designColors.secondary, fontFamily: designColors.fontFamily }}>12,000+</div>
                         <div className="text-[9px] tracking-wider uppercase text-slate-500 font-semibold mt-0.5">Trips Delivered</div>
                       </div>
                       <div className="p-4">
                         <div className="text-lg font-bold" style={{ color: designColors.secondary, fontFamily: designColors.fontFamily }}>4.8/5</div>
                         <div className="text-[9px] tracking-wider uppercase text-slate-500 font-semibold mt-0.5">2,140+ Reviews</div>
                       </div>
                       <div className="p-4">
                         <div className="text-lg font-bold" style={{ color: designColors.secondary, fontFamily: designColors.fontFamily }}>98%</div>
                         <div className="text-[9px] tracking-wider uppercase text-slate-500 font-semibold mt-0.5">Super Reviews</div>
                       </div>
                       <div className="p-4">
                         <div className="text-lg font-bold" style={{ color: designColors.secondary, fontFamily: designColors.fontFamily }}>11 Yrs</div>
                         <div className="text-[9px] tracking-wider uppercase text-slate-500 font-semibold mt-0.5">In Operation</div>
                       </div>
                     </div>

                     {/* Accommodation Schedule */}
                     {currentQuote.hotels && currentQuote.hotels.length > 0 && (
                       <div className="space-y-4 avoid-page-break relative z-10">
                         <h4 className="text-base font-bold uppercase tracking-wider pb-2 border-b" style={{ color: designColors.secondary, borderColor: designColors.primary + '40', fontFamily: designColors.fontFamily }}>
                           Accommodation Schedule
                         </h4>
                         <div className="border rounded-xl overflow-hidden shadow-sm" style={{ borderColor: designColors.primary + '30' }}>
                           <div className="hidden sm:grid grid-cols-12 text-white text-[10px] tracking-wider uppercase font-bold px-5 py-3" style={{ backgroundColor: designColors.secondary }}>
                             <div className="col-span-2">Night</div>
                             <div className="col-span-3">Region / City</div>
                             <div className="col-span-4">Hotel Property</div>
                             <div className="col-span-3 text-right">Room Type</div>
                           </div>
                           <div className="divide-y divide-slate-100">
                             {currentQuote.hotels.map((hotel, hIdx) => {
                               const nightStr = (hotel.selectedNightIndices || []).map(n => n + 1).join(' & ');
                               return (
                                 <div key={hIdx} className={`p-4 sm:px-5 sm:py-3.5 grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-0 items-center text-xs ${hIdx % 2 === 1 ? 'bg-[#F9FBFC]' : 'bg-white'}`}>
                                   <div className="sm:col-span-2 font-bold" style={{ color: designColors.secondary }}>Night {nightStr || hIdx + 1}</div>
                                   <div className="sm:col-span-3 text-slate-500 font-medium">{hotel.city || lead.destination}</div>
                                   <div className="sm:col-span-4">
                                     <span className="font-bold block" style={{ color: designColors.secondary }}>{hotel.hotelName || 'Selected Property'}</span>
                                     <span className="text-[10px] font-semibold" style={{ color: designColors.primary }}>{hotel.category || '4 Star'}</span>
                                     {hotel.comments && (
                                       <span className="block text-[11px] text-amber-700 font-medium mt-0.5">
                                         ✨ {hotel.comments}
                                       </span>
                                     )}
                                   </div>
                                   <div className="sm:col-span-3 sm:text-right">
                                     <span className="font-semibold text-slate-800 block">{hotel.roomType || 'Standard Room'}</span>
                                     <span className="text-[11px] text-slate-500">{lead.travelers?.adults || 2} Adults{lead.travelers?.children ? `, ${lead.travelers.children} Child` : ''}</span>
                                   </div>
                                 </div>
                               );
                             })}
                           </div>
                         </div>
                       </div>
                     )}

                     {/* Day-Wise Itinerary */}
                     {currentQuote.itinerary && currentQuote.itinerary.length > 0 && (
                       <div className="space-y-4 relative z-10">
                         <h4 className="text-base font-bold uppercase tracking-wider pb-2 border-b" style={{ color: designColors.secondary, borderColor: designColors.primary + '40', fontFamily: designColors.fontFamily }}>
                           Day-Wise Itinerary
                         </h4>
                         <div className="space-y-4">
                           {currentQuote.itinerary.map((day, dIdx) => (
                             <div key={dIdx} className="flex gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 bg-white transition-all avoid-page-break">
                               <div className="shrink-0 w-16 font-bold text-sm" style={{ color: designColors.primary, fontFamily: designColors.fontFamily }}>
                                 Day {String(day.day || dIdx + 1).padStart(2, '0')}
                               </div>
                               <div className="space-y-1">
                                 <h5 className="text-sm font-bold" style={{ color: designColors.secondary }}>
                                   {getCleanDayTitle(day, dIdx, currentQuote.itinerary.length, lead.destination)}
                                 </h5>
                                 <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{day.description}</p>
                               </div>
                             </div>
                           ))}
                         </div>
                       </div>
                     )}

                     {/* Testimonial Quote */}
                     <div className="bg-[#F4F7FA] border-l-4 p-5 rounded-r-xl text-xs italic text-slate-700 avoid-page-break relative z-10" style={{ borderColor: designColors.primary }}>
                       “Every hotel, cab and guide was exactly as promised — Kingsland made our trip effortless and truly memorable.”
                       <div className="mt-2 font-bold not-italic text-[10px] text-slate-500">
                         — Verified Client Review · Kingsland Holidays
                      </div>
                     </div>

                     {/* Inclusions & Exclusions */}
                     <div className="space-y-4 avoid-page-break relative z-10">
                       <h4 className="text-base font-bold uppercase tracking-wider pb-2 border-b" style={{ color: designColors.secondary, borderColor: designColors.primary + '40', fontFamily: designColors.fontFamily }}>
                         Inclusions & Exclusions
                       </h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="border rounded-xl p-5 bg-white space-y-3" style={{ borderColor: designColors.primary + '30' }}>
                           <h5 className="text-xs font-bold uppercase tracking-wider" style={{ color: designColors.secondary }}>INCLUDED</h5>
                           <ul className="space-y-2 text-xs text-slate-700">
                             <li><span className="text-emerald-600 font-bold mr-1.5">✓</span> {getAccommodationInclusion(currentQuote)}</li>
                             <li><span className="text-emerald-600 font-bold mr-1.5">✓</span> {getMealInclusion(currentQuote)}</li>
                             {currentQuote.inclusions?.transfer?.arrival?.included && <li><span className="text-emerald-600 font-bold mr-1.5">✓</span> Airport / Station Transfers Included</li>}
                             {currentQuote.inclusions?.sightseeing?.included && <li><span className="text-emerald-600 font-bold mr-1.5">✓</span> All Sightseeing as per itinerary</li>}
                             {currentQuote.inclusions?.taxes?.included && <li><span className="text-emerald-600 font-bold mr-1.5">✓</span> Government Taxes & Service Charges</li>}
                             {currentQuote.otherInclusions && parseCustomItems(currentQuote.otherInclusions).map((inc, i) => (
                               <li key={i}><span className="text-emerald-600 font-bold mr-1.5">✓</span> {inc}</li>
                             ))}
                           </ul>
                         </div>
                         <div className="border rounded-xl p-5 bg-white space-y-3" style={{ borderColor: designColors.primary + '30' }}>
                           <h5 className="text-xs font-bold uppercase tracking-wider" style={{ color: designColors.secondary }}>EXCLUDED</h5>
                           <ul className="space-y-2 text-xs text-slate-700">
                             <li><span className="text-rose-600 font-bold mr-1.5">✕</span> Personal Expenses (Laundry, Drinks, Tips)</li>
                             <li><span className="text-rose-600 font-bold mr-1.5">✕</span> Optional Tours & Activities</li>
                             {currentQuote.flightsNotIncluded && <li><span className="text-rose-600 font-bold mr-1.5">✕</span> Airfare / Train Tickets</li>}
                             {currentQuote.otherExclusions && parseCustomItems(currentQuote.otherExclusions).map((exc, i) => (
                               <li key={i}><span className="text-rose-600 font-bold mr-1.5">✕</span> {exc}</li>
                             ))}
                           </ul>
                         </div>
                       </div>
                     </div>

                     {/* Guarantee Strip */}
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 avoid-page-break relative z-10">
                       <div className="border rounded-xl p-4 text-center bg-[#F4F7FA]" style={{ borderColor: designColors.primary + '30' }}>
                         <div className="text-xs font-bold" style={{ color: designColors.secondary }}>Best Price Guarantee</div>
                         <div className="text-[10px] text-slate-500 mt-0.5">We'll match a lower quote</div>
                       </div>
                       <div className="border rounded-xl p-4 text-center bg-[#F4F7FA]" style={{ borderColor: designColors.primary + '30' }}>
                         <div className="text-xs font-bold" style={{ color: designColors.secondary }}>Free Cancellation</div>
                         <div className="text-[10px] text-slate-500 mt-0.5">Free cancellation up to 30 days before travel</div>
                       </div>
                       <div className="border rounded-xl p-4 text-center bg-[#F4F7FA]" style={{ borderColor: designColors.primary + '30' }}>
                         <div className="text-xs font-bold" style={{ color: designColors.secondary }}>Secure Payments</div>
                         <div className="text-[10px] text-slate-500 mt-0.5">Secure payments via UPI, Cards & Net Banking</div>
                       </div>
                     </div>

                     {/* Terms & Cancellation Policy */}
                     <div className="space-y-4 avoid-page-break relative z-10">
                       <h4 className="text-base font-bold uppercase tracking-wider pb-2 border-b" style={{ color: designColors.secondary, borderColor: designColors.primary + '40', fontFamily: designColors.fontFamily }}>
                         Terms & Cancellation Policy
                       </h4>
                       <StructuredTermsBlock termsText={currentQuote.termsAndConditions} isPdf={false} />
                     </div>

                     {/* Hotel Partners & Travel Partners */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 avoid-page-break relative z-10">
                       <div className="border rounded-xl p-4 bg-[#F9FBFC]" style={{ borderColor: designColors.primary + '30' }}>
                         <span className="text-[10px] font-bold tracking-wider uppercase block mb-3" style={{ color: designColors.secondary, fontFamily: designColors.fontFamily }}>
                           Our Hotel Partner Network
                         </span>
                         <div className="grid grid-cols-3 gap-2 text-center text-xs">
                           <div className="p-2 bg-white rounded-lg border border-slate-100 font-bold" style={{ color: designColors.secondary }}>Taj Hotels</div>
                           <div className="p-2 bg-white rounded-lg border border-slate-100 font-bold" style={{ color: designColors.secondary }}>Oberoi</div>
                           <div className="p-2 bg-white rounded-lg border border-slate-100 font-bold" style={{ color: designColors.secondary }}>ITC Hotels</div>
                           <div className="p-2 bg-white rounded-lg border border-slate-100 font-bold" style={{ color: designColors.secondary }}>Radisson</div>
                           <div className="p-2 bg-white rounded-lg border border-slate-100 font-bold" style={{ color: designColors.secondary }}>The Leela</div>
                           <div className="p-2 bg-white rounded-lg border border-slate-100 font-bold" style={{ color: designColors.secondary }}>Marriott</div>
                         </div>
                       </div>
                       <div className="border rounded-xl p-4 bg-[#F9FBFC]" style={{ borderColor: designColors.primary + '30' }}>
                         <span className="text-[10px] font-bold tracking-wider uppercase block mb-3" style={{ color: designColors.secondary, fontFamily: designColors.fontFamily }}>
                           Working With Travel Partners
                         </span>
                         <div className="grid grid-cols-3 gap-2 text-center text-xs">
                           <div className="p-2 bg-white rounded-lg border border-slate-100 font-bold" style={{ color: designColors.secondary }}>MakeMyTrip</div>
                           <div className="p-2 bg-white rounded-lg border border-slate-100 font-bold" style={{ color: designColors.secondary }}>TravelTriangle</div>
                           <div className="p-2 bg-white rounded-lg border border-slate-100 font-bold" style={{ color: designColors.secondary }}>TripAdvisor</div>
                         </div>
                       </div>
                     </div>

                     {/* Footer Banner */}
                     <div className="text-white p-5 rounded-xl flex flex-col sm:flex-row justify-between items-center text-xs gap-3 relative z-10 shadow-md" style={{ backgroundColor: designColors.secondary }}>
                       <div>
                         <span className="text-slate-300">Trip Advisor:</span> <strong>{agentName}</strong> · Senior Trip Advisor
                       </div>
                       <div>
                         <span className="text-slate-300">Contact:</span> +91 6376983416, +91 7014939068 · official.kingslandholidays@gmail.com
                       </div>
                     </div>

                   </div>

                 </div>
               ) : (
                 <div className="py-32 flex flex-col items-center justify-center text-center px-12 bg-white rounded-2xl border border-dashed border-slate-200">
                     <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-8 shadow-xl">
                       <span className="text-5xl grayscale opacity-30">📜</span>
                     </div>
                     <h4 className="text-2xl font-black text-slate-900 mb-3 tracking-tighter uppercase">No Packages Found</h4>
                     <p className="text-sm text-slate-400 max-w-sm font-bold leading-relaxed mb-10">Start by creating your first itinerary proposal for this customer.</p>
                     <button onClick={() => onNewQuote(lead)} className="px-12 py-5 bg-[#12233D] text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all">Create Package 1</button>
                 </div>
               )}
            </div>

         </div>
      </div>
    </div>
  );
};

export default LeadProposalView;