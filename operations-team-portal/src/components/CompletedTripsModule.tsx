import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Star, 
  MapPin, 
  Calendar, 
  User, 
  Award, 
  MessageSquare, 
  DollarSign, 
  Share2, 
  Check, 
  Send,
  Edit3,
  Save,
  X,
  Copy,
  ExternalLink,
  ShieldCheck,
  Mail,
  Phone
} from 'lucide-react';
import { Customer, HotelVoucher, TripItinerary } from '../types';

interface CompletedTripsModuleProps {
  customers: Customer[];
  vouchers: HotelVoucher[];
  itineraries: TripItinerary[];
  searchTerm: string;
  onOpenShareCustomer: (customer: Customer) => void;
  onUpdateCustomer?: (customer: Customer) => void;
}

export const CompletedTripsModule: React.FC<CompletedTripsModuleProps> = ({
  customers,
  vouchers,
  itineraries,
  searchTerm,
  onOpenShareCustomer,
  onUpdateCustomer,
}) => {
  const [editingRemarkCustId, setEditingRemarkCustId] = useState<string | null>(null);
  const [remarkText, setRemarkText] = useState('');

  // Review Dispatcher Modal State
  const [reviewModalCust, setReviewModalCust] = useState<Customer | null>(null);
  const [reviewMessageDraft, setReviewMessageDraft] = useState('');
  const [reviewSubjectDraft, setReviewSubjectDraft] = useState('');
  const [copiedReview, setCopiedReview] = useState(false);

  const GMB_REVIEW_URL = 'https://g.page/r/CTH_2txUgnSLEAE/review';

  const completedCustomers = customers.filter((c) => c.status === 'Completed');

  const filtered = completedCustomers.filter((c) => {
    return (
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.destination.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Start Editing Remark
  const handleStartEditRemark = (cust: Customer) => {
    setEditingRemarkCustId(cust.id);
    setRemarkText(cust.opsRemarks || cust.accountsRemarks || cust.notes || '');
  };

  // Save Remark
  const handleSaveRemark = (cust: Customer) => {
    if (onUpdateCustomer) {
      onUpdateCustomer({
        ...cust,
        opsRemarks: remarkText,
        accountsRemarks: remarkText,
      });
    }
    setEditingRemarkCustId(null);
  };

  // Open Review Dispatcher Modal
  const handleOpenReviewModal = (cust: Customer) => {
    setReviewModalCust(cust);
    setCopiedReview(false);

    const subject = `How was your ${cust.destination || 'holiday'} trip with Kingsland Holidays? ⭐`;
    const message = `Dear ${cust.name},\n\n` +
      `Thank you for traveling with Kingsland Holidays on your trip to ${cust.destination || 'your destination'}! ✈️🏔️\n\n` +
      `We hope you had a wonderful journey and created unforgettable memories with your family & loved ones.\n\n` +
      `Could you please take 30 seconds to share your valuable review and rate your experience with us on our Google profile? Your review helps our team grow!\n\n` +
      `⭐ Share Your Review Here:\n${GMB_REVIEW_URL}\n\n` +
      `Thank you for trusting Kingsland Holidays!\nWarm regards,\n` +
      `Kingsland Holidays Operations Desk\n` +
      `📞 +91 6376983416, +91 7014939068 | www.kingslandholidays.com`;

    setReviewSubjectDraft(subject);
    setReviewMessageDraft(message);
  };

  // Send via WhatsApp
  const handleSendWhatsAppReview = () => {
    if (!reviewModalCust) return;
    const cleanPhone = (reviewModalCust.phone || '').replace(/[^0-9]/g, '');
    const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const encoded = encodeURIComponent(reviewMessageDraft);

    const now = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    if (onUpdateCustomer) {
      onUpdateCustomer({
        ...reviewModalCust,
        reviewRequestedAt: now,
        reviewChannel: 'WhatsApp',
      });
    }

    window.open(`https://wa.me/${phoneWithCountry}?text=${encoded}`, '_blank');
    setReviewModalCust(null);
  };

  // Send via Gmail
  const handleSendGmailReview = () => {
    if (!reviewModalCust) return;
    const encodedSub = encodeURIComponent(reviewSubjectDraft);
    const encodedBody = encodeURIComponent(reviewMessageDraft);

    const now = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    if (onUpdateCustomer) {
      onUpdateCustomer({
        ...reviewModalCust,
        reviewRequestedAt: now,
        reviewChannel: 'Gmail',
      });
    }

    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(reviewModalCust.email || '')}&su=${encodedSub}&body=${encodedBody}`,
      '_blank'
    );
    setReviewModalCust(null);
  };

  // Copy Review Text
  const handleCopyReviewText = () => {
    navigator.clipboard.writeText(reviewMessageDraft);
    setCopiedReview(true);
    setTimeout(() => setCopiedReview(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <h3 className="font-extrabold text-xl">Completed Trips & Review Desk</h3>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
            Archived journey logs, guest remarks, operational audit, and automated Google Review requests via WhatsApp & Gmail.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-5 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-300 block">Completed Trips</span>
            <span className="text-2xl font-black text-white">{completedCustomers.length}</span>
          </div>
          <div className="px-5 py-2.5 rounded-2xl bg-amber-500/20 backdrop-blur-md border border-amber-500/40 text-center">
            <span className="text-[10px] uppercase font-bold text-amber-300 block">Avg Rating</span>
            <span className="text-2xl font-black text-amber-300">5.0 ★</span>
          </div>
        </div>
      </div>

      {/* Completed List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border-2 border-dashed border-slate-200 shadow-sm">
          <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-base">No Completed Trips Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Trips marked as 'Completed' will appear here with guest remarks and Google Review dispatch options.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((cust) => {
            const itin = itineraries.find((i) => i.customerId === cust.id);
            const score = itin?.feedbackScore || 5;
            const isEditingRemark = editingRemarkCustId === cust.id;

            return (
              <div
                key={cust.id}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Bar: Booking ID & Stars */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-200">
                      {cust.bookingId}
                    </span>

                    <div className="flex items-center gap-1 text-amber-500 text-xs font-extrabold bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-3.5 h-3.5 fill-current ${s <= score ? 'text-amber-400' : 'text-slate-200'}`} />
                      ))}
                      <span className="ml-1 text-slate-800">{score}.0</span>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div>
                    <h4 className="font-black text-slate-900 text-lg">
                      {cust.name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 font-medium mt-1">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        <strong className="text-slate-800">{cust.destination}</strong>
                      </div>
                      <span className="text-slate-300">•</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{cust.startDate} to {cust.endDate}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono mt-1.5">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {cust.phone || '—'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {cust.email || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Feedback Comment (if any) */}
                  {itin?.feedbackComment && (
                    <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-100 text-xs text-slate-700 italic">
                      "{itin.feedbackComment}"
                    </div>
                  )}

                  {/* Operational Remarks Section */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Lead & Trip Remarks:
                      </span>
                      {!isEditingRemark && (
                        <button
                          onClick={() => handleStartEditRemark(cust)}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{cust.opsRemarks || cust.accountsRemarks ? 'Edit' : '+ Add Remark'}</span>
                        </button>
                      )}
                    </div>

                    {!isEditingRemark ? (
                      <p className="text-xs text-slate-700 italic font-medium leading-relaxed">
                        {cust.opsRemarks || cust.accountsRemarks || cust.notes || 'No remarks recorded for this completed trip.'}
                      </p>
                    ) : (
                      <div className="space-y-2 pt-1 animate-in fade-in duration-100">
                        <textarea
                          rows={2}
                          value={remarkText}
                          onChange={(e) => setRemarkText(e.target.value)}
                          placeholder="Enter trip settlement remarks..."
                          className="w-full p-2.5 rounded-xl bg-white border border-indigo-400 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleSaveRemark(cust)}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <Save className="w-3 h-3" />
                            <span>Save Remark</span>
                          </button>
                          <button
                            onClick={() => setEditingRemarkCustId(null)}
                            className="px-3 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10px] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions: Review Request & Summary Share */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleOpenReviewModal(cust)}
                      className="px-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer group"
                    >
                      <Star className="w-3.5 h-3.5 fill-slate-950 text-slate-950 group-hover:scale-110 transition-transform" />
                      <span>Request GMB Review</span>
                    </button>

                    <button
                      onClick={() => onOpenShareCustomer(cust)}
                      className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share Summary</span>
                    </button>
                  </div>

                  {/* Review Request Status Banner */}
                  {cust.reviewRequestedAt ? (
                    <div className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Review requested via {cust.reviewChannel}</span>
                      </span>
                      <span className="font-mono text-slate-500">{cust.reviewRequestedAt}</span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 font-medium px-1 text-center">
                      Review not requested yet
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* GOOGLE REVIEW DISPATCHER MODAL (WHATSAPP & GMAIL) */}
      {/* ========================================================================= */}
      {reviewModalCust && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <Star className="w-5 h-5 fill-amber-500 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Send Google Review Request
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Guest: <strong>{reviewModalCust.name}</strong> ({reviewModalCust.bookingId}) · {reviewModalCust.destination}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setReviewModalCust(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Official GMB Link Indicator */}
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-amber-900">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span className="font-bold">Official GMB Review URL:</span>
              </div>
              <a
                href={GMB_REVIEW_URL}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-indigo-700 font-bold hover:underline flex items-center gap-1"
              >
                <span>g.page/r/CTH_2txUgnSLEAE/review</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Editable Subject (for Gmail) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Email Subject:</label>
              <input
                type="text"
                value={reviewSubjectDraft}
                onChange={(e) => setReviewSubjectDraft(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Editable Message Content */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 block">Review Invitation Message:</label>
                <button
                  onClick={handleCopyReviewText}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  {copiedReview ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedReview ? 'Copied to Clipboard!' : 'Copy Message'}</span>
                </button>
              </div>
              <textarea
                rows={8}
                value={reviewMessageDraft}
                onChange={(e) => setReviewMessageDraft(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500 font-sans leading-relaxed"
              />
            </div>

            {/* Action Buttons: WhatsApp & Gmail */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <button
                onClick={handleSendWhatsAppReview}
                className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 fill-white" />
                <span>Send via WhatsApp</span>
              </button>

              <button
                onClick={handleSendGmailReview}
                className="py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <Mail className="w-4 h-4" />
                <span>Send via Gmail</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
