import React from 'react';
import { B2BDraft, B2B_QUALITIES } from '../utils/b2bData';
import { control } from './dataEntryStyles';

export default function B2BFields({ draft, change }: { draft: B2BDraft; change: (key: keyof B2BDraft, value: string) => void }) {
  return <div className="grid gap-5 sm:grid-cols-2">
    <label className="space-y-2 text-sm font-medium sm:col-span-2">Name<input required name="name" autoComplete="name" maxLength={160} className={control} placeholder="Contact or business name" value={draft.name} onChange={e => change('name', e.target.value)} /></label>
    <label className="space-y-2 text-sm font-medium sm:col-span-2">Phone number<input required name="phone" type="tel" autoComplete="tel" maxLength={32} className={control} placeholder="e.g. +91 98765 43210" value={draft.phone} onChange={e => change('phone', e.target.value)} /></label>
    <label className="space-y-2 text-sm font-medium">City<input required name="city" autoComplete="address-level2" maxLength={160} className={control} placeholder="e.g. Jaipur" value={draft.city} onChange={e => change('city', e.target.value)} /></label>
    <label className="space-y-2 text-sm font-medium">State<input required name="state" autoComplete="address-level1" maxLength={160} className={control} placeholder="e.g. Rajasthan" value={draft.state} onChange={e => change('state', e.target.value)} /></label>
    <label className="space-y-2 text-sm font-medium sm:col-span-2">Quality label<select required name="quality" className={control} value={draft.quality} onChange={e => change('quality', e.target.value)}>{B2B_QUALITIES.map(quality => <option key={quality}>{quality}</option>)}</select><span className="block text-xs font-normal text-secondary">Partner: working together · Potential: developing the relationship · Not Active: currently inactive.</span></label>
  </div>;
}
