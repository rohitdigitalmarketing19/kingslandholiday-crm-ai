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
      <div className="p-6 rounded-xl bg-inverse text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-success-strong/20 text-success-ink border border-success-line/30">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <h3 className="font-semibold text-xl">Completed Trips & Review Desk</h3>
          </div>
          <p className="text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
            Archived journey logs, guest remarks, operational audit, and automated Google Review requests via WhatsApp & Gmail.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-5 py-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-center">
            <span className="text-xs uppercase font-bold text-slate-300 block">Completed Trips</span>
            <span className="text-2xl font-semibold text-white">{completedCustomers.length}</span>
          </div>
          <div className="px-5 py-2.5 rounded-xl bg-warning-strong/20 backdrop-blur-md border border-warning-line/40 text-center">
            <span className="text-xs uppercase font-bold text-warning-ink block">Avg Rating</span>
            <span className="text-2xl font-semibold text-warning-ink">5.0 ★</span>
          </div>
        </div>
      </div>

      {/* Completed List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-surface border-2 border-dashed border-line shadow-sm">
          <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-content text-base">No Completed Trips Found</h3>
          <p className="text-sm text-secondary mt-1 max-w-sm mx-auto">
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
                className="bg-surface border border-line rounded-xl p-6 shadow-sm hover:shadow-sm transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Bar: Booking ID & Stars */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono font-semibold text-brand-ink bg-brand-soft px-3 py-1 rounded-xl border border-brand-line">
                      {cust.bookingId}
                    </span>

                    <div className="flex items-center gap-1 text-warning-ink text-sm font-semibold bg-warning-soft px-2.5 py-1 rounded-xl border border-warning-line">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-3.5 h-3.5 fill-current ${s <= score ? 'text-warning-ink' : 'text-slate-200'}`} />
                      ))}
                      <span className="ml-1 text-content">{score}.0</span>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div>
                    <h4 className="font-semibold text-content text-lg">
                      {cust.name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-secondary font-medium mt-1">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-danger-ink" />
                        <strong className="text-content">{cust.destination}</strong>
                      </div>
                      <span className="text-slate-300">•</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-muted" />
                        <span>{cust.startDate} to {cust.endDate}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-secondary font-mono mt-1.5">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-muted" />
                        {cust.phone || '—'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-muted" />
                        {cust.email || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Feedback Comment (if any) */}
                  {itin?.feedbackComment && (
                    <div className="p-3 rounded-xl bg-warning-soft/60 border border-warning-line text-sm text-content italic">
                      "{itin.feedbackComment}"
                    </div>
                  )}

                  {/* Operational Remarks Section */}
                  <div className="p-3.5 rounded-xl bg-canvas border border-line space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                        Lead & Trip Remarks:
                      </span>
                      {!isEditingRemark && (
                        <button
                          onClick={() => handleStartEditRemark(cust)}
                          className="text-xs font-bold text-brand-ink hover:text-brand-ink flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{cust.opsRemarks || cust.accountsRemarks ? 'Edit' : '+ Add Remark'}</span>
                        </button>
                      )}
                    </div>

                    {!isEditingRemark ? (
                      <p className="text-sm text-content italic font-medium leading-relaxed">
                        {cust.opsRemarks || cust.accountsRemarks || cust.notes || 'No remarks recorded for this completed trip.'}
                      </p>
                    ) : (
                      <div className="space-y-2 pt-1 animate-in fade-in duration-100">
                        <textarea
                          rows={2}
                          value={remarkText}
                          onChange={(e) => setRemarkText(e.target.value)}
                          placeholder="Enter trip settlement remarks..."
                          className="w-full p-2.5 rounded-xl bg-surface border border-brand-line text-sm font-medium text-content focus:ring-2 focus:ring-brand-line outline-none"
                        />
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleSaveRemark(cust)}
                            className="px-3 py-1 rounded-lg bg-success-strong hover:bg-success-strong text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <Save className="w-3 h-3" />
                            <span>Save Remark</span>
                          </button>
                          <button
                            onClick={() => setEditingRemarkCustId(null)}
                            className="px-3 py-1 rounded-lg bg-hover hover:bg-hover text-content font-bold text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions: Review Request & Summary Share */}
                <div className="pt-3 border-t border-line space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleOpenReviewModal(cust)}
                      className="px-3 py-2.5 rounded-xl bg-warning-strong hover:bg-warning-strong text-content font-semibold text-sm flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer group"
                    >
                      <Star className="w-3.5 h-3.5 fill-slate-950 text-content group-hover:scale-110 transition-transform" />
                      <span>Request GMB Review</span>
                    </button>

                    <button
                      onClick={() => onOpenShareCustomer(cust)}
                      className="px-3 py-2.5 rounded-xl bg-subtle hover:bg-hover text-content font-bold text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share Summary</span>
                    </button>
                  </div>

                  {/* Review Request Status Banner */}
                  {cust.reviewRequestedAt ? (
                    <div className="text-xs text-success-ink font-semibold bg-success-soft border border-success-line px-2.5 py-1 rounded-xl flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-success-ink" />
                        <span>Review requested via {cust.reviewChannel}</span>
                      </span>
                      <span className="font-mono text-secondary">{cust.reviewRequestedAt}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-muted font-medium px-1 text-center">
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
        <div className="fixed inset-0 z-50 bg-inverse/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface rounded-xl max-w-xl w-full p-6 shadow-sm border border-line space-y-5 animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-warning-soft text-warning-ink">
                  <Star className="w-5 h-5 fill-amber-500 text-warning-ink" />
                </div>
                <div>
                  <h3 className="font-semibold text-content text-base">
                    Send Google Review Request
                  </h3>
                  <p className="text-sm text-secondary font-medium">
                    Guest: <strong>{reviewModalCust.name}</strong> ({reviewModalCust.bookingId}) · {reviewModalCust.destination}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setReviewModalCust(null)}
                className="p-1.5 rounded-xl text-muted hover:text-content hover:bg-subtle cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Official GMB Link Indicator */}
            <div className="p-3 rounded-xl bg-warning-soft border border-warning-line flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-warning-ink">
                <ShieldCheck className="w-4 h-4 text-warning-ink" />
                <span className="font-bold">Official GMB Review URL:</span>
              </div>
              <a
                href={GMB_REVIEW_URL}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-brand-ink font-bold hover:underline flex items-center gap-1"
              >
                <span>g.page/r/CTH_2txUgnSLEAE/review</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Editable Subject (for Gmail) */}
            <div className="space-y-1">
              <label className="text-sm font-bold text-content block">Email Subject:</label>
              <input
                type="text"
                value={reviewSubjectDraft}
                onChange={(e) => setReviewSubjectDraft(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-canvas border border-line text-sm font-bold text-content focus:ring-2 focus:ring-brand-line"
              />
            </div>

            {/* Editable Message Content */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-content block">Review Invitation Message:</label>
                <button
                  onClick={handleCopyReviewText}
                  className="text-xs font-bold text-brand-ink hover:text-brand-ink flex items-center gap-1 cursor-pointer"
                >
                  {copiedReview ? <Check className="w-3.5 h-3.5 text-success-ink" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedReview ? 'Copied to Clipboard!' : 'Copy Message'}</span>
                </button>
              </div>
              <textarea
                rows={8}
                value={reviewMessageDraft}
                onChange={(e) => setReviewMessageDraft(e.target.value)}
                className="w-full p-3 rounded-xl bg-canvas border border-line text-sm font-medium text-content focus:ring-2 focus:ring-brand-line font-sans leading-relaxed"
              />
            </div>

            {/* Action Buttons: WhatsApp & Gmail */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-line">
              <button
                onClick={handleSendWhatsAppReview}
                className="py-3 px-4 rounded-xl bg-success-strong hover:bg-success-strong text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 fill-white" />
                <span>Send via WhatsApp</span>
              </button>

              <button
                onClick={handleSendGmailReview}
                className="py-3 px-4 rounded-xl bg-danger-strong hover:bg-danger-strong text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
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
