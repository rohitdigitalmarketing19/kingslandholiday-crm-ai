import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Building, 
  Award, 
  FileText, 
  Save, 
  CheckCircle2, 
  RefreshCw, 
  Upload,
  Globe,
  Phone,
  Mail,
  Percent,
  MapPin,
  Sparkles,
  Hash
} from 'lucide-react';
import * as api from '../services/apiService';

export const SettingsView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [formData, setFormData] = useState({
    company_name: 'Kingsland Holidays',
    tagline: 'Desire to travel',
    phone: '+91 6376983416',
    email: 'support@kingslandholiday.com',
    website: 'kingslandholiday.com',
    gst_number: '',
    default_gst_percent: 5.0,
    place_of_supply: 'Rajasthan (08)',
    address: 'Plot No. 42, Kingsland Tower, MI Road, Jaipur, Rajasthan 302001',
    intro_about: 'Founded in 2010, we are a trusted travel agency committed to creating memorable journeys for our clients. We specialise in personalised holiday packages, guided tours, and unique travel experiences across India. Your satisfaction is our priority — let us turn your travel dreams into reality!',
    established_year: '2010',
    rating: 4.8,
    happy_customers: '5000+',
    logo_url: '',
    favicon_url: '',
    trip_id_prefix: 'KL-',
    trip_id_next_number: 1001,
    trip_id_digits: 4,
    default_payment_terms: '50% advance to confirm the booking, balance 15 days before travel.',
    default_terms_conditions: `1. Booking and Payment: All bookings are subject to availability and confirmation. Payment as per the payment schedule.
2. Cancellation and Refunds: Cancellation charges apply as per the cancellation policy. Refunds, if applicable, are processed per our refund policy.
3. Travel Documents: Guests must carry valid photo ID and any required permits. We are not liable for loss from inadequate or expired documents.
4. Health and Safety: Participants are responsible for their health and safety and must comply with local laws and customs.
5. Limitation of Liability: We act only as a booking agent for airlines, hotels, and operators, and are not liable for their acts or omissions. Our liability is limited to the amount paid for the booking.

Cancellation Policy (Land Package):
- >30 days before starting date: 25% of total land package cost will be cancellation fees
- 16-30 days before starting date: 40% of total land package cost will be cancellation fees
- 7-15 days before starting date: 55% of total land package cost will be cancellation fees
- 3-6 days before starting date: 70% of total land package cost will be cancellation fees
- 0-2 days before starting date / No Show: 100% of total land package cost will be cancellation fees
- Non-refundable during peak periods (Diwali, Christmas, New Year, Long Weekends).`
  });

  const updateBrowserFavicon = (iconUrl: string) => {
    if (!iconUrl || typeof document === 'undefined') return;
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = iconUrl;
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.fetchAgencySettings();
      if (data) {
        setFormData(prev => ({
          ...prev,
          ...data
        }));
        if (data.favicon_url) {
          updateBrowserFavicon(data.favicon_url);
        }
      }
    } catch (err) {
      console.error('Error loading agency settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logo_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const iconData = reader.result as string;
        setFormData(prev => ({ ...prev, favicon_url: iconData }));
        updateBrowserFavicon(iconData);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateAgencySettings(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving agency settings:', err);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-lime-400" /> Loading settings...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-lime-400/10 text-lime-400 border border-lime-400/20 flex items-center justify-center font-black">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white dark:text-white">Settings</h1>
          </div>
          <p className="text-xs text-zinc-400">
            Company profile, terms, and payment details shown on proposals and invoices.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="px-6 py-2.5 bg-lime-400 hover:bg-lime-300 text-black font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : saveSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saveSuccess ? 'Settings Saved!' : 'Save Settings'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Box 1: Company Profile */}
        <div className="bg-zinc-900/60 dark:bg-[#161713] border border-zinc-800 rounded-2xl p-5 md:p-6 space-y-4">
          <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider block">
            Company profile
          </span>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Company name<span className="text-lime-400 ml-0.5">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.company_name}
                onChange={e => handleChange('company_name', e.target.value)}
                placeholder="e.g. Kingsland Holidays"
                className="w-full bg-zinc-950/80 dark:bg-[#0e0f0c] border border-zinc-700/80 focus:border-lime-400 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none transition-all focus:ring-1 focus:ring-lime-400/30"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Tagline
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={e => handleChange('tagline', e.target.value)}
                placeholder="e.g. Desire to travel"
                className="w-full bg-zinc-950/80 dark:bg-[#0e0f0c] border border-zinc-700/80 focus:border-lime-400 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none transition-all focus:ring-1 focus:ring-lime-400/30"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Phone
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => handleChange('phone', e.target.value)}
                  placeholder="e.g. +91 7615907468"
                  className="w-full bg-zinc-950/80 dark:bg-[#0e0f0c] border border-zinc-700/80 focus:border-lime-400 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none transition-all focus:ring-1 focus:ring-lime-400/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => handleChange('email', e.target.value)}
                  placeholder="e.g. support@kingslandholiday.com"
                  className="w-full bg-zinc-950/80 dark:bg-[#0e0f0c] border border-zinc-700/80 focus:border-lime-400 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none transition-all focus:ring-1 focus:ring-lime-400/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Website
                </label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={e => handleChange('website', e.target.value)}
                  placeholder="e.g. kingslandholiday.com"
                  className="w-full bg-zinc-950/80 dark:bg-[#0e0f0c] border border-zinc-700/80 focus:border-lime-400 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none transition-all focus:ring-1 focus:ring-lime-400/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  GST number
                </label>
                <input
                  type="text"
                  value={formData.gst_number}
                  onChange={e => handleChange('gst_number', e.target.value)}
                  placeholder="e.g. 08AAACK1234F1Z5"
                  className="w-full bg-zinc-950/80 dark:bg-[#0e0f0c] border border-zinc-700/80 focus:border-lime-400 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none transition-all focus:ring-1 focus:ring-lime-400/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Default GST % (new proposals)<span className="text-lime-400 ml-0.5">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.default_gst_percent}
                  onChange={e => handleChange('default_gst_percent', parseFloat(e.target.value) || 0)}
                  placeholder="5.00"
                  className="w-full bg-zinc-950/80 dark:bg-[#0e0f0c] border border-zinc-700/80 focus:border-lime-400 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none transition-all focus:ring-1 focus:ring-lime-400/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-0.5">
                  Place of supply (invoices)
                </label>
                <span className="text-[10px] text-zinc-500 block mb-1.5">
                  Usually the agency's state, e.g. Rajasthan (08).
                </span>
                <input
                  type="text"
                  value={formData.place_of_supply}
                  onChange={e => handleChange('place_of_supply', e.target.value)}
                  placeholder="Rajasthan (08)"
                  className="w-full bg-zinc-950/80 dark:bg-[#0e0f0c] border border-zinc-700/80 focus:border-lime-400 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none transition-all focus:ring-1 focus:ring-lime-400/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Address
              </label>
              <textarea
                rows={2}
                value={formData.address}
                onChange={e => handleChange('address', e.target.value)}
                placeholder="Agency office address"
                className="w-full bg-zinc-950/80 dark:bg-[#0e0f0c] border border-zinc-700/80 focus:border-lime-400 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none transition-all focus:ring-1 focus:ring-lime-400/30 resize-y"
              />
            </div>
          </div>
        </div>

        {/* Box 2: Trip ID & Auto-Numbering Format */}
        <div className="bg-zinc-900/60 dark:bg-[#161713] border border-zinc-800 rounded-2xl p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Hash className="w-3.5 h-3.5 text-lime-400" />
              Trip ID & Auto-Numbering Format
            </span>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-lime-400/10 border border-lime-400/30 rounded-lg text-lime-400 text-xs font-mono font-bold">
              <span>Next Trip ID Preview:</span>
              <span className="bg-lime-400 text-black px-1.5 py-0.5 rounded font-black text-[11px]">
                {(formData.trip_id_prefix || 'KL-') + String(formData.trip_id_next_number || 1001).padStart(formData.trip_id_digits || 4, '0')}
              </span>
            </div>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Configure the prefix and starting sequence for generating unique Trip IDs. Every new lead, quote, and booking will automatically continue with this numbering format.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Trip ID Prefix / Format<span className="text-lime-400 ml-0.5">*</span>
              </label>
              <input
                type="text"
                value={formData.trip_id_prefix || ''}
                onChange={e => handleChange('trip_id_prefix', e.target.value)}
                placeholder="e.g. KL-, KLH-, KLH-2026-, TRIP-"
                className="w-full bg-zinc-950/80 dark:bg-[#0e0f0c] border border-zinc-700/80 focus:border-lime-400 rounded-xl px-4 py-2.5 text-xs text-zinc-100 font-mono font-bold placeholder:text-zinc-600 outline-none transition-all focus:ring-1 focus:ring-lime-400/30"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['KL-', 'KLH-', 'KLH-2026-', 'TRIP-'].map(pre => (
                  <button
                    key={pre}
                    type="button"
                    onClick={() => handleChange('trip_id_prefix', pre)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all cursor-pointer ${
                      formData.trip_id_prefix === pre
                        ? 'bg-lime-400 text-black border-lime-400 font-bold'
                        : 'bg-zinc-800/80 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    {pre}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Next Sequential Number<span className="text-lime-400 ml-0.5">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={formData.trip_id_next_number || 1001}
                onChange={e => handleChange('trip_id_next_number', parseInt(e.target.value, 10) || 1)}
                placeholder="1001"
                className="w-full bg-zinc-950/80 dark:bg-[#0e0f0c] border border-zinc-700/80 focus:border-lime-400 rounded-xl px-4 py-2.5 text-xs text-zinc-100 font-mono font-bold placeholder:text-zinc-600 outline-none transition-all focus:ring-1 focus:ring-lime-400/30"
              />
              <span className="text-[10px] text-zinc-500 block mt-1.5">
                New leads will start from this number and count up.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Minimum Digits (Padding)
              </label>
              <select
                value={formData.trip_id_digits || 4}
                onChange={e => handleChange('trip_id_digits', parseInt(e.target.value, 10) || 4)}
                className="w-full bg-zinc-950/80 dark:bg-[#0e0f0c] border border-zinc-700/80 focus:border-lime-400 rounded-xl px-4 py-2.5 text-xs text-zinc-100 font-mono font-bold outline-none transition-all focus:ring-1 focus:ring-lime-400/30"
              >
                <option value={3}>3 Digits (e.g. 001)</option>
                <option value={4}>4 Digits (e.g. 1001)</option>
                <option value={5}>5 Digits (e.g. 01001)</option>
                <option value={6}>6 Digits (e.g. 001001)</option>
              </select>
              <span className="text-[10px] text-zinc-500 block mt-1.5">
                Sequence: {(formData.trip_id_prefix || 'KL-') + String((formData.trip_id_next_number || 1001) + 1).padStart(formData.trip_id_digits || 4, '0')}, {(formData.trip_id_prefix || 'KL-') + String((formData.trip_id_next_number || 1001) + 2).padStart(formData.trip_id_digits || 4, '0')}...
              </span>
            </div>
          </div>
        </div>

        {/* Box 3: Branding & Proof */}
        <div className="bg-zinc-900/60 dark:bg-[#161713] border border-zinc-800 rounded-2xl p-5 md:p-6 space-y-4">
          <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider block">
            Branding & proof
          </span>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Intro / about (shown on proposal)
              </label>
              <textarea
                rows={3}
                value={formData.intro_about}
                onChange={e => handleChange('intro_about', e.target.value)}
                className="w-full bg-zinc-950/80 dark:bg-[#0e0f0c] border border-zinc-700/80 focus:border-lime-400 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none transition-all focus:ring-1 focus:ring-lime-400/30 resize-y"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Established year
                </label>
                <input
                  type="text"
                  value={formData.established_year}
                  onChange={e => handleChange('established_year', e.target.value)}
                  placeholder="2010"
                  className="w-full bg-zinc-950/80 dark:bg-[#0e0f0c] border border-zinc-700/80 focus:border-lime-400 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none transition-all focus:ring-1 focus:ring-lime-400/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Rating (0–5)
                </label>
                <input
                  type="number"
                  step="0.1"
                  max="5"
                  min="0"
                  value={formData.rating}
                  onChange={e => handleChange('rating', parseFloat(e.target.value) || 0)}
                  placeholder="4.8"
                  className="w-full bg-zinc-950/80 dark:bg-[#0e0f0c] border border-zinc-700/80 focus:border-lime-400 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none transition-all focus:ring-1 focus:ring-lime-400/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Happy customers
                </label>
                <input
                  type="text"
                  value={formData.happy_customers}
                  onChange={e => handleChange('happy_customers', e.target.value)}
                  placeholder="5000+"
                  className="w-full bg-zinc-950/80 dark:bg-[#0e0f0c] border border-zinc-700/80 focus:border-lime-400 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none transition-all focus:ring-1 focus:ring-lime-400/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Agency Logo
                </label>
                <div className="flex items-center gap-3">
                  <label className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs rounded-xl border border-zinc-700 cursor-pointer flex items-center gap-1.5 transition-colors shrink-0">
                    <Upload className="w-3.5 h-3.5 text-lime-400" />
                    Choose Logo
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                  {formData.logo_url ? (
                    <img src={formData.logo_url} alt="Logo" className="h-7 max-w-[80px] object-contain rounded border border-zinc-700 p-0.5 bg-white shrink-0" />
                  ) : (
                    <span className="text-[11px] text-zinc-500 truncate">No file</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Favicon (Browser Icon)
                </label>
                <div className="flex items-center gap-3">
                  <label className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs rounded-xl border border-zinc-700 cursor-pointer flex items-center gap-1.5 transition-colors shrink-0">
                    <Upload className="w-3.5 h-3.5 text-lime-400" />
                    Choose Icon
                    <input type="file" accept="image/x-icon,image/png,image/svg+xml,image/jpeg" onChange={handleFaviconUpload} className="hidden" />
                  </label>
                  {formData.favicon_url ? (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <img src={formData.favicon_url} alt="Favicon" className="w-6 h-6 object-contain rounded border border-zinc-700 p-0.5 bg-white shrink-0" />
                      <span className="text-[10px] text-lime-400 font-bold truncate">Active ✓</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-zinc-500 truncate">Default</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Box 3: Defaults for Documents */}
        <div className="bg-zinc-900/60 dark:bg-[#161713] border border-zinc-800 rounded-2xl p-5 md:p-6 space-y-4">
          <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider block">
            Defaults for documents
          </span>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                Default payment terms
              </label>
              <textarea
                rows={2}
                value={formData.default_payment_terms}
                onChange={e => handleChange('default_payment_terms', e.target.value)}
                placeholder="e.g. 50% advance to confirm the booking, balance 15 days before travel."
                className="w-full bg-zinc-950/80 dark:bg-[#0e0f0c] border border-zinc-700/80 focus:border-lime-400 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none transition-all focus:ring-1 focus:ring-lime-400/30 resize-y"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-0.5">
                Default terms & conditions
              </label>
              <span className="text-[10px] text-zinc-500 block mb-1.5">
                Printed on the proposal and invoice.
              </span>
              <textarea
                rows={8}
                value={formData.default_terms_conditions}
                onChange={e => handleChange('default_terms_conditions', e.target.value)}
                className="w-full bg-zinc-950/80 dark:bg-[#0e0f0c] border border-zinc-700/80 focus:border-lime-400 rounded-xl px-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none transition-all focus:ring-1 focus:ring-lime-400/30 resize-y font-mono text-[11px] leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Bottom Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 bg-lime-400 hover:bg-lime-300 text-black font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : saveSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saveSuccess ? 'Settings Saved Successfully!' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsView;
