import React, { useEffect, useRef, useState } from 'react';
import { Building2, Users, CheckCircle2, ArrowRight, FileText } from 'lucide-react';
import B2BFields from './B2BFields';
import HotelRateFields, { emptyHotel, HotelDraft } from './HotelRateFields';
import { emptyB2B, B2BDraft, validateB2B } from '../utils/b2bData';
import { toPaise, validateBlackoutDates, validateHotelContact, validateSeasonStart } from '../utils/hotelRates';
import { button, control, primary } from './dataEntryStyles';

async function publicRequest(path: string, options?: RequestInit) {
  const response = await fetch(`/api/public/data-entry/${path}`, { ...options, headers: { 'Content-Type': 'application/json' }, credentials: 'omit' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to submit. Please try again.');
  return data;
}
export default function DataEntryPage({ kind }: { kind: 'hotel-rates' | 'b2b-data' }) {
  const isHotel = kind === 'hotel-rates';
  const [hotel, setHotel] = useState<HotelDraft>(emptyHotel);
  const [contact, setContact] = useState<B2BDraft>(emptyB2B);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(isHotel);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [reference, setReference] = useState('');
  const [website, setWebsite] = useState('');
  const requestId = useRef(crypto.randomUUID());
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const dirty = !reference && (!!file || JSON.stringify(hotel) !== JSON.stringify(emptyHotel()) || JSON.stringify(contact) !== JSON.stringify(emptyB2B()));
  useEffect(() => { document.title = `${isHotel ? 'Hotel Rates' : 'B2B Data'} Entry | Kingsland Holidays`; }, [isHotel]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => { if (!file) { setPreviewUrl(''); return; } const url = URL.createObjectURL(file); setPreviewUrl(url); return () => URL.revokeObjectURL(url); }, [file]);
  const load = async () => {
    setLoading(true); setLoadError('');
    try { setCategories(await publicRequest('hotel-categories')); } catch (err) { setLoadError((err as Error).message); } finally { setLoading(false); }
  };
  useEffect(() => { if (isHotel) load(); }, [isHotel]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (inFlight.current) return;
    inFlight.current = true; setSaving(true); setError('');
    try {
      let data: any;
      if (isHotel) {
        if (hotel.offSeasonRate) toPaise(hotel.offSeasonRate);
        toPaise(hotel.seasonalRate); toPaise(hotel.blackoutRate);
        validateBlackoutDates(hotel.blackoutDates); validateHotelContact(hotel.contactNumber);
        validateSeasonStart(hotel.offSeasonStartDate, 'Off-season start date'); validateSeasonStart(hotel.seasonStartDate, 'Season start date');
        data = { ...hotel };
        if (file) {
          const base64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error('Unable to read the PDF. Select it again.')); reader.readAsDataURL(file); });
          data.pdf = { name: file.name, data: base64 };
        }
      } else data = validateB2B(contact);
      const result = await publicRequest(kind, { method: 'POST', body: JSON.stringify({ ...data, requestId: requestId.current, website }) });
      setReference(result.reference);
    } catch (err) { setError((err as Error).message || 'Cannot reach the server. Check your connection and retry.'); }
    finally { inFlight.current = false; setSaving(false); }
  };
  const Icon = isHotel ? Building2 : Users;
  return <div className="min-h-dvh bg-canvas font-sans text-content">
    <header className="border-b border-line bg-surface"><div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-5 sm:px-8"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand font-bold text-on-brand">K</span><div><p className="text-sm font-bold">Kingsland Holidays</p><p className="text-xs text-secondary">Business network · Data entry</p></div></div></header>
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-12"><div className="grid items-start gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
      <div><Icon size={28} className="mb-4 text-brand-ink" /><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-ink">{isHotel ? 'Hotel directory' : 'Partner network'}</p><h1 className="text-3xl font-bold tracking-tight">{isHotel ? 'Hotel rates entry' : 'B2B data entry'}</h1><p className="mt-4 text-sm leading-6 text-secondary">{isHotel ? 'Add hotel details, seasonal pricing and a rate sheet to our hotel directory.' : 'Add a business contact and label the relationship for our partner network.'}</p><div className="mt-6 border-t border-line pt-4 text-xs leading-5 text-secondary">Fields marked by your browser as required must be completed. Review the details before submitting.<p className="mt-3">This page accepts new records only.</p></div></div>
      <section className="min-w-0 rounded-2xl border border-line bg-surface p-5 sm:p-8" aria-label="Entry form">
        {reference ? <div role="status" className="py-8"><CheckCircle2 size={40} className="mb-5 text-success-ink" /><h2 className="text-2xl font-semibold">Saved successfully</h2><p className="mt-3 text-sm text-secondary">Your {isHotel ? 'hotel' : 'B2B contact'} has been added to the Kingsland admin directory.</p><p className="mt-4 break-all rounded-lg bg-canvas p-3 text-xs text-secondary">Reference: {reference}</p><button className={`${primary} mt-6`} onClick={() => { setHotel(emptyHotel()); setContact(emptyB2B()); setFile(null); setReference(''); setError(''); setWebsite(''); requestId.current = crypto.randomUUID(); }}>Add another {isHotel ? 'hotel' : 'contact'}<ArrowRight size={16} /></button></div> : <form ref={formRef} onSubmit={submit} aria-describedby={error ? 'entry-error' : undefined}>
          <div className="mb-6 border-b border-line pb-5"><h2 className="text-lg font-semibold">{isHotel ? 'Hotel details & pricing' : 'Contact details'}</h2><p className="mt-1 text-xs text-secondary">{isHotel ? 'Rates are in INR, per room, per night.' : 'Enter the contact information and current relationship.'}</p></div>
          {loadError && <div role="alert" className="mb-5 rounded-lg bg-danger-soft p-3 text-sm text-danger-ink">{loadError}<button type="button" className={`${button} ml-2`} onClick={load}>Retry</button></div>}
          {loading && <p role="status" className="mb-5 text-sm text-secondary">Loading hotel categories…</p>}
          <fieldset disabled={saving || loading || !!loadError} className="min-w-0 space-y-6 disabled:opacity-60">
            {isHotel ? <><HotelRateFields draft={hotel} change={(key, value) => setHotel(current => ({ ...current, [key]: value }))} categories={categories} /><div className="space-y-3 border-t border-line pt-5"><label className="block space-y-2 text-sm font-medium">Hotel rate sheet PDF <span className="font-normal text-secondary">(optional · up to 10 MB)</span><input type="file" accept=".pdf,application/pdf" className={`${control} file:mr-2 file:rounded file:border-0 file:bg-brand-soft file:p-1 file:text-brand-ink`} onChange={event => { const selected = event.target.files?.[0]; if (!selected) { setFile(null); return; } if (!/\.pdf$/i.test(selected.name) || selected.size > 10 * 1024 * 1024) { setError('Choose a PDF up to 10 MB.'); event.target.value = ''; setFile(null); return; } setFile(selected); setError(''); }} /></label>{file && <div className="flex flex-wrap items-center justify-between gap-2"><span className="break-all text-xs text-secondary">{file.name}</span><a href={previewUrl} target="_blank" rel="noopener noreferrer" className={button}><FileText size={16} />Preview PDF</a></div>}</div></> : <B2BFields draft={contact} change={(key, value) => setContact(current => ({ ...current, [key]: value }))} />}
            <div hidden aria-hidden="true"><label>Leave empty<input name="website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label></div>
          </fieldset>
          {error && <p id="entry-error" role="alert" className="mt-5 rounded-lg bg-danger-soft p-3 text-sm text-danger-ink">{error}</p>}
          <div className="mt-7 border-t border-line pt-5"><button disabled={saving || loading || !!loadError || (isHotel && !categories.length)} className={`${primary} w-full sm:w-auto`}>{saving ? 'Saving…' : isHotel ? 'Submit hotel rates' : 'Submit B2B contact'}<ArrowRight size={16} /></button><p className="mt-3 text-xs text-secondary">Submit only business contact details you are authorised to share.</p></div>
        </form>}
      </section>
    </div></main><footer className="mx-auto max-w-5xl px-4 pb-8 text-xs text-secondary sm:px-8">© {new Date().getFullYear()} Kingsland Holidays</footer>
  </div>;
}
