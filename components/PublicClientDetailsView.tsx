import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Check,
  RefreshCw,
  Phone,
  Mail,
  User,
  Plane,
  Calendar,
  Lock,
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';
import {
  fetchPublicClientDetails,
  submitPublicClientDetails,
  LeadTraveller,
  PublicClientDetailsResponse
} from '../services/apiService';

interface PublicClientDetailsViewProps {
  token: string;
}

interface TravellerRowState {
  type: 'adult' | 'child';
  name: string;
  mobile: string;
  email: string;
  isPrimary: boolean;
  errors: {
    name?: string;
    mobile?: string;
    duplicate?: string;
  };
}

export const PublicClientDetailsView: React.FC<PublicClientDetailsViewProps> = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const [bookingInfo, setBookingInfo] = useState<{
    tripId: string;
    destination: string;
    travelDate: string;
    durationDays: number;
  } | null>(null);

  const [travellers, setTravellers] = useState<TravellerRowState[]>([]);
  const [honeypot, setHoneypot] = useState('');

  // Clean and normalize 10-digit mobile
  const sanitize10DigitMobile = (val: string) => {
    return val.replace(/[^0-9]/g, '').slice(0, 10);
  };

  // Load public details by token
  useEffect(() => {
    if (!token) {
      setServerError('Missing or invalid link. Please contact Kingsland Holidays.');
      setLoading(false);
      return;
    }

    const loadDetails = async () => {
      try {
        setLoading(true);
        setServerError(null);
        const res: PublicClientDetailsResponse = await fetchPublicClientDetails(token);

        setBookingInfo(res.booking);

        if (res.travellers && res.travellers.length > 0) {
          // Re-populate existing submitted travellers
          const mapped: TravellerRowState[] = res.travellers.map((t, idx) => ({
            type: t.type || 'adult',
            name: t.name || '',
            mobile: sanitize10DigitMobile(t.mobile || ''),
            email: t.email || '',
            isPrimary: idx === 0,
            errors: {}
          }));
          setTravellers(mapped);
          if (res.isSubmitted) {
            setSubmittedSuccess(false); // Allow review/edit
          }
        } else {
          // Initialize with Traveller 1 (Primary) pre-filled from lead
          setTravellers([
            {
              type: 'adult',
              name: res.primaryPrefill?.name || '',
              mobile: sanitize10DigitMobile(res.primaryPrefill?.mobile || ''),
              email: res.primaryPrefill?.email || '',
              isPrimary: true,
              errors: {}
            }
          ]);
        }
      } catch (err: any) {
        console.error('Error loading client page:', err);
        setServerError(err.message || 'Unable to open this details page. The link may have expired or been deactivated.');
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [token]);

  // Real-time client-side validation
  const validatedRows = useMemo(() => {
    const countsByMobile = new Map<string, number>();

    // Count non-empty mobile numbers to detect duplicates
    travellers.forEach(t => {
      const cleanMob = sanitize10DigitMobile(t.mobile);
      if (cleanMob.length === 10) {
        countsByMobile.set(cleanMob, (countsByMobile.get(cleanMob) || 0) + 1);
      }
    });

    let allValid = true;

    const validated = travellers.map((t, idx) => {
      const errors: { name?: string; mobile?: string; duplicate?: string } = {};

      // Name validation
      if (!t.name.trim()) {
        errors.name = 'Full Name is required.';
        allValid = false;
      }

      // Mobile validation
      const cleanMob = sanitize10DigitMobile(t.mobile);
      const isAdult = t.type === 'adult';

      if (isAdult) {
        if (!cleanMob) {
          errors.mobile = 'Mobile number is required for adult travellers.';
          allValid = false;
        } else if (cleanMob.length !== 10) {
          errors.mobile = 'Enter a valid 10-digit mobile number.';
          allValid = false;
        }
      } else {
        // Child: mobile optional, but if entered must be 10 digits
        if (cleanMob && cleanMob.length !== 10) {
          errors.mobile = 'Mobile number must be exactly 10 digits if provided.';
          allValid = false;
        }
      }

      // Duplicate mobile check across rows (blank child numbers are skipped)
      if (cleanMob && cleanMob.length === 10) {
        if ((countsByMobile.get(cleanMob) || 0) > 1) {
          errors.duplicate = `This number (+91 ${cleanMob}) is already added for another traveller.`;
          allValid = false;
        }
      }

      return {
        ...t,
        errors
      };
    });

    return {
      rows: validated,
      isValid: allValid && travellers.length > 0
    };
  }, [travellers]);

  // Update a field in a specific row
  const handleFieldChange = (index: number, field: 'type' | 'name' | 'mobile' | 'email', value: string) => {
    setTravellers(prev => {
      const updated = [...prev];
      if (field === 'mobile') {
        updated[index] = {
          ...updated[index],
          mobile: sanitize10DigitMobile(value)
        };
      } else {
        updated[index] = {
          ...updated[index],
          [field]: value
        };
      }
      return updated;
    });
  };

  // Add another traveller row
  const handleAddTraveller = () => {
    setTravellers(prev => [
      ...prev,
      {
        type: 'adult',
        name: '',
        mobile: '',
        email: '',
        isPrimary: false,
        errors: {}
      }
    ]);
  };

  // Remove a traveller row (cannot remove Traveller 1)
  const handleRemoveTraveller = (index: number) => {
    if (index === 0) return;
    setTravellers(prev => prev.filter((_, idx) => idx !== index));
  };

  // Submit all travellers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatedRows.isValid) {
      alert('Please correct the highlighted errors before submitting.');
      return;
    }

    setSubmitting(true);
    setServerError(null);

    try {
      const payload: LeadTraveller[] = validatedRows.rows.map(t => ({
        type: t.type,
        name: t.name.trim(),
        mobile: t.mobile ? t.mobile.trim() : null,
        email: t.email ? t.email.trim().toLowerCase() : null,
        is_primary: t.isPrimary
      }));

      await submitPublicClientDetails(token, payload, honeypot);
      setSubmittedSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Submission failed:', err);
      setServerError(err.message || 'Failed to submit details. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 text-center font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border border-[#E8E1D5] space-y-4">
          <RefreshCw size={36} className="animate-spin mx-auto text-[#7B1D2A]" />
          <h3 className="text-base font-black text-slate-800">Securing & Verifying Link...</h3>
          <p className="text-xs text-slate-500">Connecting to Kingsland Holidays reservation system.</p>
        </div>
      </div>
    );
  }

  // Friendly error screen for invalid, disabled, or expired token
  if (serverError && travellers.length === 0) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 font-sans">
        <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8 border border-rose-200 text-center space-y-5 animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-2xl border border-rose-100">
            ⚠️
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">
              Access Restricted
            </span>
            <h2 className="text-xl font-black text-slate-900 mt-1">
              Link Inactive or Expired
            </h2>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {serverError}
          </p>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-1.5 text-xs text-slate-600">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Phone size={13} className="text-[#7B1D2A]" />
              <span>Kingsland Holidays Guest Support</span>
            </div>
            <div>Phone: +91 6376983416 / +91 7976336759</div>
            <div>Email: support@kingslandholiday.com</div>
          </div>
        </div>
      </div>
    );
  }

  // Celebratory success view after submission
  if (submittedSuccess) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6 font-sans">
        <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 sm:p-10 border border-emerald-200 text-center space-y-6 animate-in zoom-in-95">
          <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-inner">
            <CheckCircle2 size={42} />
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Booking Ref #{bookingInfo?.tripId || 'Confirmed'}
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-2">
              Traveller Details Submitted!
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Thank you! All passenger details for your trip to <strong className="text-slate-800">{bookingInfo?.destination}</strong> have been registered in our operations desk.
            </p>
          </div>

          {/* Roster Summary */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-2 text-xs">
            <div className="font-black text-slate-400 uppercase text-[10px] tracking-wider mb-2">
              Registered Passengers ({travellers.length}):
            </div>
            {travellers.map((trv, idx) => (
              <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-400 font-bold">#{idx + 1}</span>
                  <span className="font-bold text-slate-800">{trv.name}</span>
                  <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                    {trv.type}
                  </span>
                </div>
                <span className="font-mono text-slate-600 text-[11px]">
                  {trv.mobile ? `+91 ${trv.mobile}` : '—'}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setSubmittedSuccess(false)}
              className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all cursor-pointer"
            >
              Review or Edit Details
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
            >
              Print Confirmation
            </button>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-2">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Hotel vouchers and travel permits will be issued under these names.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-900 flex flex-col justify-between font-sans selection:bg-[#7B1D2A] selection:text-white">
      {/* Top Brand Banner */}
      <header className="bg-white border-b border-[#E8E1D5] py-4 px-6 shadow-xs sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#7B1D2A] text-white flex items-center justify-center font-black text-lg shadow-sm">
              K
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900 tracking-tight leading-tight">
                Kingsland Holidays
              </h1>
              <p className="text-[10px] font-bold text-[#8C7E6C] uppercase tracking-wider">
                Official Passenger Registration
              </p>
            </div>
          </div>

          {bookingInfo?.tripId && (
            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#7B1D2A] bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                Ref #{bookingInfo.tripId}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Form Body */}
      <main className="max-w-3xl mx-auto w-full px-4 py-8 flex-1">
        <div className="space-y-6">
          {/* Trip Summary Card */}
          {bookingInfo && (
            <div className="bg-white rounded-3xl p-6 border border-[#E8E1D5] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                  Confirmed Destination
                </span>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {bookingInfo.destination}
                </h2>
                {bookingInfo.travelDate && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium pt-1">
                    <Calendar size={13} className="text-slate-400" />
                    <span>Travel Date: <strong className="text-slate-700">{bookingInfo.travelDate}</strong></span>
                    {bookingInfo.durationDays > 0 && (
                      <span>({bookingInfo.durationDays} Days / {Math.max(1, bookingInfo.durationDays - 1)} Nights)</span>
                    )}
                  </div>
                )}
              </div>

              <div className="text-[11px] text-[#7A6C5B] bg-[#F7F2EA] p-3 rounded-2xl border border-[#E8DFD1] max-w-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-slate-800">
                  <Info size={13} className="text-[#7B1D2A]" />
                  <span>Important Notice</span>
                </div>
                <div>Please ensure passenger names match official Government IDs (Passport / Aadhaar) exactly.</div>
              </div>
            </div>
          )}

          {serverError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Honeypot anti-bot protection (hidden from humans) */}
            <input
              type="text"
              name="_honeypot"
              value={honeypot}
              onChange={e => setHoneypot(e.target.value)}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
            />

            {/* Traveller Cards List */}
            <div className="space-y-4">
              {validatedRows.rows.map((trv, idx) => {
                const isPrimary = trv.isPrimary;
                const hasError = Boolean(trv.errors.name || trv.errors.mobile || trv.errors.duplicate);

                return (
                  <div
                    key={idx}
                    className={`bg-white rounded-3xl p-6 border transition-all shadow-sm ${
                      hasError
                        ? 'border-rose-300 ring-2 ring-rose-100'
                        : 'border-[#E8E1D5] hover:border-slate-300'
                    }`}
                  >
                    {/* Row Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="text-sm font-black text-slate-900">
                            {isPrimary ? 'Traveller 1 (Primary Contact)' : `Traveller ${idx + 1}`}
                          </h4>
                          {isPrimary && (
                            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
                              Primary booking guest
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Type Picker: Adult or Child */}
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleFieldChange(idx, 'type', 'adult')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              trv.type === 'adult'
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Adult (12+ Yrs)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFieldChange(idx, 'type', 'child')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              trv.type === 'child'
                                ? 'bg-white text-amber-700 shadow-xs'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Child
                          </button>
                        </div>

                        {/* Remove Row (Disabled for Primary) */}
                        {!isPrimary && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTraveller(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                            title="Remove traveller"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inputs Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Full Name */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                          Full Name (as per Govt ID) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="e.g. Rahul Sharma"
                            value={trv.name}
                            onChange={e => handleFieldChange(idx, 'name', e.target.value)}
                            className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs font-bold outline-none transition-all ${
                              trv.errors.name
                                ? 'border-rose-400 bg-rose-50/30 focus:border-rose-500'
                                : 'border-slate-200 bg-slate-50/60 focus:bg-white focus:border-[#7B1D2A]'
                            }`}
                            required
                          />
                        </div>
                        {trv.errors.name && (
                          <p className="text-[10px] text-rose-600 font-bold mt-1">
                            {trv.errors.name}
                          </p>
                        )}
                      </div>

                      {/* Mobile Number with fixed +91 */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                          Mobile Number {trv.type === 'adult' ? <span className="text-rose-500">* (10 Digits)</span> : <span className="text-slate-400 text-[10px] lowercase font-normal">(optional for child)</span>}
                        </label>
                        <div className={`flex items-center rounded-xl border overflow-hidden transition-all ${
                          trv.errors.mobile || trv.errors.duplicate
                            ? 'border-rose-400 bg-rose-50/30'
                            : 'border-slate-200 bg-slate-50/60 focus-within:bg-white focus-within:border-[#7B1D2A]'
                        }`}>
                          <span className="px-3 py-2.5 bg-slate-200/80 text-xs font-mono font-bold text-slate-700 select-none border-r border-slate-200">
                            +91
                          </span>
                          <input
                            type="tel"
                            maxLength={10}
                            placeholder="9876543210"
                            value={trv.mobile}
                            readOnly={isPrimary && Boolean(trv.mobile) && false}
                            onChange={e => handleFieldChange(idx, 'mobile', e.target.value)}
                            className="w-full px-3 py-2.5 text-xs font-mono font-bold outline-none bg-transparent"
                          />
                        </div>

                        {trv.errors.mobile && (
                          <p className="text-[10px] text-rose-600 font-bold mt-1">
                            {trv.errors.mobile}
                          </p>
                        )}
                        {trv.errors.duplicate && (
                          <p className="text-[10px] text-rose-600 font-bold mt-1">
                            {trv.errors.duplicate}
                          </p>
                        )}
                      </div>

                      {/* Optional Email (Only for Traveller 1 or adults) */}
                      {isPrimary && (
                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                            Email Address (for vouchers & confirmation delivery)
                          </label>
                          <div className="relative">
                            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="email"
                              placeholder="guest@example.com"
                              value={trv.email}
                              onChange={e => handleFieldChange(idx, 'email', e.target.value)}
                              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-[#7B1D2A] text-xs font-bold outline-none transition-all"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Another Traveller Button */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleAddTraveller}
                className="px-6 py-3 bg-white hover:bg-slate-50 border-2 border-dashed border-[#C9922A] hover:border-[#7B1D2A] text-[#7B1D2A] rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Plus size={16} />
                <span>Add Another Traveller</span>
              </button>
            </div>

            {/* Validation Notice & Submit */}
            <div className="bg-white rounded-3xl p-6 border border-[#E8E1D5] shadow-sm space-y-4">
              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                <span>
                  Your information is encrypted with 256-bit SSL and used exclusively for your tour package reservations, hotel vouchers, and travel permits.
                </span>
              </div>

              <button
                type="submit"
                disabled={!validatedRows.isValid || submitting}
                className="w-full py-4 bg-[#7B1D2A] hover:bg-[#5C1420] disabled:opacity-40 disabled:hover:bg-[#7B1D2A] text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Saving Traveller Details...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Submit All ({travellers.length}) Travellers</span>
                  </>
                )}
              </button>

              {!validatedRows.isValid && (
                <p className="text-center text-[11px] text-amber-600 font-bold">
                  Please provide a valid name and unique 10-digit mobile number for each adult traveller to enable submission.
                </p>
              )}
            </div>
          </form>
        </div>
      </main>

      {/* Public Footer */}
      <footer className="bg-[#F4ECE1] border-t border-[#E8E1D5] py-6 text-center text-xs text-[#7A6C5B] font-medium mt-12">
        <div className="max-w-4xl mx-auto px-4 space-y-2">
          <div className="flex flex-wrap justify-center items-center gap-6 text-[10px] font-bold uppercase tracking-wider text-[#7B1D2A] border-b border-[#E3DAC8] pb-3">
            <span>🔒 256-Bit SSL Encrypted</span>
            <span>🛡️ Verified Agency System</span>
            <span>⚡ Instant Ops Handoff</span>
          </div>
          <p className="pt-1">© {new Date().getFullYear()} Kingsland Holidays Services Pvt Ltd. All rights reserved.</p>
          <p className="text-[10px] text-[#8C7E6C]">Official Client Registration Desk · Plot No. 42, Kingsland Tower, MI Road, Jaipur, Rajasthan</p>
        </div>
      </footer>
    </div>
  );
};

export default PublicClientDetailsView;
