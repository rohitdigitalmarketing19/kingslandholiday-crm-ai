import HotelRateFields from './HotelRateFields';
import EntryLink from './EntryLink';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Plus, Search, FileText, Pencil, X, Trash2, CalendarDays, Upload } from 'lucide-react';
import * as api from '../services/apiService';
import { HotelRate, RATE_BANDS, matchesRateBand, toPaise, validateBlackoutDates, validateSeasonStart, validateHotelContact } from '../utils/hotelRates';

const control = 'w-full min-h-11 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-content focus:outline-none focus:ring-2 focus:ring-indigo-500';
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:opacity-50';
const money = (value: string) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value));
const dateLabel = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
type Draft = Omit<HotelRate, 'id' | 'updatedAt' | 'pdfName'>;
const empty = (): Draft => ({ name: '', city: '', category: '', contactNumber: '', offSeasonRate: '', offSeasonStartDate: '', seasonStartDate: '', seasonalRate: '', blackoutRate: '', blackoutDates: [] });

function Modal({ title, close, children, wide = false }: { title: string; close: () => void; children: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} aria-labelledby={wide ? 'pdf-title' : 'hotel-editor-title'} onCancel={event => { event.preventDefault(); close(); }} className={`m-auto max-h-[92dvh] w-[calc(100%-2rem)] ${wide ? 'max-w-5xl' : 'max-w-2xl'} overflow-auto rounded-xl border border-line bg-surface p-0 text-content shadow-xl backdrop:bg-black/50`}>
    <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-surface px-5 py-4"><h2 id={wide ? 'pdf-title' : 'hotel-editor-title'} className="text-lg font-bold">{title}</h2><button type="button" aria-label="Close" className={button} onClick={close}><X size={18} /></button></div>{children}
  </dialog>;
}

export default function HotelRatesView({ readOnly = false }: { readOnly?: boolean }) {
  const [hotels, setHotels] = useState<HotelRate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [band, setBand] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<HotelRate | 'new' | null>(null);
  const [draft, setDraft] = useState<Draft>(empty);
  const [initial, setInitial] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [removePdf, setRemovePdf] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);
  const [openingPdf, setOpeningPdf] = useState(false);
  const dirty = !!editing && (JSON.stringify(draft) !== initial || !!file || removePdf);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);
  const load = async () => {
    setLoading(true); setError('');
    try {
      const [rows, masters] = await Promise.all([api.fetchHotelRates(), api.fetchMasters('Hotel Categories')]);
      setHotels(rows); setCategories(masters.filter((item: any) => item.is_enabled === 1).map((item: any) => item.name));
    } catch (err) { setError((err as Error).message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => setPage(1), [search, band, category, city]);
  const cities = useMemo(() => [...new Set(hotels.map(hotel => hotel.city))].sort((a, b) => a.localeCompare(b)), [hotels]);
  const filterCategories = [...new Set([...categories, ...hotels.map(hotel => hotel.category)])].sort();
  const filtered = useMemo(() => hotels.filter(hotel => hotel.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) && (!category || hotel.category === category) && (!city || hotel.city === city) && matchesRateBand(hotel.seasonalRate, band)), [hotels, search, category, city, band]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 20));
  const visible = filtered.slice((Math.min(page, pageCount) - 1) * 20, Math.min(page, pageCount) * 20);
  const deleteHotel = async (hotel: HotelRate) => {
    if (deletingId || !window.confirm(`Delete "${hotel.name}" from Hotel Rates? Its rates and PDF will no longer appear in this directory. Existing quotes and bookings will not change.`)) return;
    setDeletingId(hotel.id); setError('');
    try {
      await api.deleteHotelRate(hotel.id);
      setHotels(current => current.filter(item => item.id !== hotel.id));
      setNotice(`${hotel.name} deleted successfully.`);
    } catch (err) { setError((err as Error).message); }
    finally { setDeletingId(null); }
  };
  const open = (hotel: HotelRate | 'new') => {
    const value = hotel === 'new' ? empty() : { name: hotel.name, city: hotel.city, category: hotel.category, contactNumber: hotel.contactNumber || '', offSeasonRate: hotel.offSeasonRate || '', offSeasonStartDate: hotel.offSeasonStartDate || '', seasonStartDate: hotel.seasonStartDate || '', seasonalRate: hotel.seasonalRate, blackoutRate: hotel.blackoutRate, blackoutDates: hotel.blackoutDates.map(period => ({ ...period })) };
    setDraft(value); setInitial(JSON.stringify(value)); setEditing(hotel); setFile(null); setRemovePdf(false); setFormError('');
  };
  const close = () => { if (!saving && (!dirty || window.confirm('Discard unsaved hotel changes?'))) setEditing(null); };
  const change = (key: keyof Draft, value: any) => setDraft(current => ({ ...current, [key]: value }));
  const showPdf = async (hotel?: HotelRate) => {
    setOpeningPdf(true);
    try { const blob = hotel ? await api.fetchHotelRatePdf(hotel.id) : file; if (blob) setPreview({ url: URL.createObjectURL(blob), name: hotel ? hotel.pdfName : file!.name }); }
    catch (err) { if (editing) setFormError((err as Error).message); else setError((err as Error).message); }
    finally { setOpeningPdf(false); }
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (saving) return;
    setFormError(''); setSaving(true);
    try {
      if (draft.offSeasonRate) toPaise(draft.offSeasonRate);
      validateSeasonStart(draft.offSeasonStartDate, 'Off-season start date'); validateSeasonStart(draft.seasonStartDate, 'Season start date'); validateHotelContact(draft.contactNumber);
      toPaise(draft.seasonalRate); toPaise(draft.blackoutRate); validateBlackoutDates(draft.blackoutDates);
      let pdf: { name: string; data: string } | undefined;
      if (file) {
        const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error('Unable to read the PDF. Please select it again.')); reader.readAsDataURL(file); });
        pdf = { name: file.name, data };
      }
      const saved = await api.saveHotelRate({ ...draft, pdf, removePdf }, editing !== 'new' ? (editing as HotelRate).id : undefined);
      setHotels(current => [...current.filter(item => item.id !== saved.id), saved].sort((a, b) => a.name.localeCompare(b.name)));
      setEditing(null); setNotice(`${saved.name} saved successfully.`);
    } catch (err) { setFormError((err as Error).message); } finally { setSaving(false); }
  };
  const existingPdf = editing && editing !== 'new' && editing.pdfName && !removePdf ? editing : null;
  return <section className="space-y-5 text-content">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold tracking-tight">Hotel Rates</h1><p className="mt-1 text-sm text-secondary">Your hotel pricing directory, blackout periods and rate sheets.</p></div>{!readOnly && <button className={`${button} border-indigo-600 bg-brand text-on-brand hover:bg-brand-hover`} onClick={() => open('new')}><Plus size={18} />Add hotel</button>}</div>
    <EntryLink kind="hotel-rates" />
    {notice && <div role="status" className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}<button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={18} /></button></div>}
    {error && <div role="alert" className="rounded-lg bg-danger-soft p-4 text-sm text-danger-ink">{error} <button className="ml-2 underline" onClick={load}>Retry</button></div>}
    <div className="rounded-xl border border-line bg-surface p-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[2fr_1.4fr_1fr_1fr]">
      <label className="space-y-1.5 text-sm font-medium"><span>Hotel name</span><div className="relative"><Search size={17} className="absolute left-3 top-3.5 text-secondary" /><input className={`${control} pl-10`} placeholder="Search hotels…" value={search} onChange={event => setSearch(event.target.value)} /></div></label>
      <label className="space-y-1.5 text-sm font-medium"><span>Hotel rate range</span><select className={control} value={band} onChange={event => setBand(event.target.value)}>{RATE_BANDS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label className="space-y-1.5 text-sm font-medium"><span>Category</span><select className={control} value={category} onChange={event => setCategory(event.target.value)}><option value="">All categories</option>{filterCategories.map(item => <option key={item}>{item}</option>)}</select></label>
      <label className="space-y-1.5 text-sm font-medium"><span>City</span><select className={control} value={city} onChange={event => setCity(event.target.value)}><option value="">All cities</option>{cities.map(item => <option key={item}>{item}</option>)}</select></label>
    </div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-secondary"><span>Rate ranges use the seasonal price per room, per night (INR). Upper limits are included.</span>{(search || band || category || city) && <button className="min-h-8 font-semibold text-brand-ink" onClick={() => { setSearch(''); setBand(''); setCategory(''); setCity(''); }}>Clear filters</button>}</div></div>
    <div className="overflow-hidden rounded-xl border border-line bg-surface"><div className="border-b border-line px-5 py-4 text-sm font-semibold" aria-live="polite">{loading ? 'Loading hotels…' : `${filtered.length} ${filtered.length === 1 ? 'hotel' : 'hotels'}${filtered.length !== hotels.length ? ` of ${hotels.length}` : ''}`}</div>
      {!loading && !filtered.length ? <div className="px-5 py-16 text-center"><Building2 size={32} className="mx-auto mb-3 text-secondary" /><h2 className="font-semibold">{hotels.length ? 'No hotels match your filters' : 'Build your hotel rate directory'}</h2><p className="mt-2 text-sm text-secondary">{hotels.length ? 'Try another name, city, category or price range.' : 'Add your first hotel to keep rates and supplier PDFs in one place.'}</p></div> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Hotel rates in Indian rupees per room per night</caption><thead className="border-b border-line bg-slate-50 text-xs text-secondary dark:bg-slate-900"><tr>{['Hotel / city', 'Category', 'Off-season rate', 'Seasonal rate', 'Blackout rate', 'Blackout dates', 'Rate sheet', 'Actions'].map((label, i) => <th key={i} scope="col" className="px-5 py-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-line">{visible.map(hotel => <tr key={hotel.id} className="align-top"><td className="px-5 py-4"><div className="min-w-36 font-semibold">{hotel.name}</div><div className="mt-1 text-xs text-secondary">{hotel.city}</div>{hotel.contactNumber && <a className="mt-2 inline-block text-xs text-brand-ink underline" href={`tel:${hotel.contactNumber.replace(/[^+\d]/g, '')}`}>{hotel.contactNumber}</a>}</td><td className="px-5 py-4">{hotel.category}</td><td className="whitespace-nowrap px-5 py-4"><div className="mb-1 text-xs text-secondary">{hotel.offSeasonStartDate ? `From ${dateLabel(hotel.offSeasonStartDate)}` : 'Start date not set'}</div><div className="font-semibold">{hotel.offSeasonRate ? money(hotel.offSeasonRate) : 'Not set'}</div></td><td className="whitespace-nowrap px-5 py-4"><div className="mb-1 text-xs text-secondary">{hotel.seasonStartDate ? `From ${dateLabel(hotel.seasonStartDate)}` : 'Start date not set'}</div><div className="font-semibold">{money(hotel.seasonalRate)}</div></td><td className="whitespace-nowrap px-5 py-4">{money(hotel.blackoutRate)}</td><td className="px-5 py-4">{hotel.blackoutDates.length ? <details><summary className="cursor-pointer whitespace-nowrap text-brand-ink">{hotel.blackoutDates.length} {hotel.blackoutDates.length === 1 ? 'period' : 'periods'}</summary><ul className="mt-2 space-y-2 text-xs text-secondary">{hotel.blackoutDates.map((period, i) => <li className="min-w-40" key={i}>{dateLabel(period.start)} – {dateLabel(period.end)}</li>)}</ul></details> : <span className="text-secondary">None</span>}</td><td className="px-5 py-3">{hotel.pdfName ? <button className={button} disabled={openingPdf} onClick={() => showPdf(hotel)}><FileText size={16} />Preview</button> : <span className="text-xs text-secondary">No PDF</span>}</td><td className="px-5 py-3">{!readOnly && <div className="flex gap-2"><button disabled={deletingId === hotel.id} className={button} aria-label={`Edit ${hotel.name}`} onClick={() => open(hotel)}><Pencil size={16} /><span>Edit</span></button><button disabled={!!deletingId} className={`${button} text-danger-ink hover:bg-danger-soft`} aria-label={`Delete ${hotel.name}`} onClick={() => deleteHotel(hotel)}><Trash2 size={16} /><span>{deletingId === hotel.id ? 'Deleting…' : 'Delete'}</span></button></div>}</td></tr>)}</tbody></table></div>}
      {pageCount > 1 && <div className="flex items-center justify-between border-t border-line p-3 text-sm"><button className={button} disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {Math.min(page, pageCount)} of {pageCount}</span><button className={button} disabled={page >= pageCount} onClick={() => setPage(value => value + 1)}>Next</button></div>}
    </div>
    {editing && <Modal title={editing === 'new' ? 'Add hotel' : 'Edit hotel'} close={close}><form onSubmit={save} className="space-y-6 p-5"><fieldset disabled={saving} className="space-y-6 disabled:opacity-60">
      <HotelRateFields draft={draft} change={change} categories={[...new Set([...categories, ...(editing !== 'new' && editing ? [editing.category] : [])])]} cities={cities} />
      <div className="space-y-3 border-t border-line pt-5"><h3 className="flex items-center gap-2 font-semibold"><Upload size={17} />Hotel rate sheet</h3><label className="block space-y-2 text-sm"><span>Upload PDF <span className="text-xs text-secondary">(optional · up to 10 MB)</span></span><input ref={fileInput} type="file" accept=".pdf,application/pdf" className={`${control} file:mr-3 file:rounded file:border-0 file:bg-indigo-50 file:px-3 file:py-1 file:text-indigo-700`} onChange={event => { const selected = event.target.files?.[0]; if (!selected) return; if (!/\.pdf$/i.test(selected.name) || selected.size > 10 * 1024 * 1024) { setFormError('Choose a PDF up to 10 MB.'); event.target.value = ''; return; } setFile(selected); setRemovePdf(false); setFormError(''); }} /></label>{(file || existingPdf) && <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3"><span className="break-all text-sm">{file?.name || existingPdf?.pdfName}</span><div className="flex gap-2"><button type="button" className={button} disabled={openingPdf} onClick={() => showPdf(file ? undefined : existingPdf as HotelRate)}><FileText size={16} />Preview</button><button type="button" className={button} onClick={() => { setFile(null); setRemovePdf(true); if (fileInput.current) fileInput.current.value = ''; }} aria-label="Remove rate sheet"><Trash2 size={16} /></button></div></div>}</div>
    </fieldset>{formError && <p id="hotel-form-error" role="alert" className="rounded-lg bg-danger-soft p-3 text-sm text-danger-ink">{formError}</p>}<div className="flex justify-end gap-3 border-t border-line pt-4"><button type="button" disabled={saving} className={button} onClick={close}>Cancel</button><button disabled={saving} className={`${button} border-indigo-600 bg-brand text-on-brand hover:bg-brand-hover`}>{saving ? 'Saving…' : 'Save hotel'}</button></div></form></Modal>}
    {preview && <Modal title={preview.name} wide close={() => setPreview(null)}><div className="p-4"><div className="mb-3 text-sm"><a href={preview.url} download={preview.name} className="font-semibold text-brand-ink underline">Download PDF</a><span className="ml-3 text-secondary">Download if your browser cannot display the preview.</span></div><iframe title={`Rate sheet: ${preview.name}`} src={preview.url} className="h-[65dvh] w-full rounded-lg border border-line bg-white" /></div></Modal>}
  </section>;
}
