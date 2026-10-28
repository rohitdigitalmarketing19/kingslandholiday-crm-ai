import React from 'react';
import type { HotelEntry, QuoteData } from '../types';
interface Props {
  value: QuoteData['hotelAlternative']; onChange: (value: QuoteData['hotelAlternative']) => void;
  price: number; onPriceChange: (price: number) => void; city: string; mealPlan: string;
}
export default function HotelAlternativeEditor({ value, onChange, price, onPriceChange, city, mealPlan }: Props) {
  const newHotel = (): HotelEntry => ({ nights: 1, hotelName: '', city, category: '3 Star', roomType: 'Standard', mealPlan, comments: '', selectedNightIndices: [] });
  const fieldClass = 'w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-content';
  if (!value) return <button type="button" onClick={() => onChange({ price: 0, hotels: [newHotel()] })} className="w-full rounded-xl border-2 border-dashed border-brand-line px-4 py-4 font-bold text-brand-ink">+ Add Hotel Option 2</button>;
  const update = (index: number, field: keyof HotelEntry, fieldValue: string | number) => onChange({ ...value, hotels: value.hotels.map((hotel, i) => i === index ? { ...hotel, [field]: fieldValue } : hotel) });
  return <section className="space-y-4 rounded-xl border border-brand-line bg-brand-soft/40 p-5" aria-label="Hotel options comparison">
    <div className="flex items-center justify-between gap-3"><h3 className="font-bold text-content">Hotel Options &amp; Prices</h3><button type="button" onClick={() => onChange(null)} className="text-sm font-semibold text-danger-ink">Remove Hotel Option 2</button></div>
    <p className="text-sm text-secondary">Option 1 uses the stay plan above. Each option’s total appears below its own hotel table in the quote.</p>
    <label className="block text-sm font-semibold">Hotel Option 1 Price (₹)<input aria-label="Hotel Option 1 Price" type="number" min="0" step="0.01" className={fieldClass} value={price || ''} onChange={event => onPriceChange(Number(event.target.value))} /></label>
    <h4 className="font-bold text-content">Hotel Details – Option 2</h4>
    {value.hotels.map((hotel, index) => <fieldset key={index} className="space-y-3 rounded-xl border border-line bg-surface p-4">
      <legend className="px-2 text-sm font-bold">Option 2 Hotel {index + 1}</legend>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {(['hotelName','city','roomType','mealPlan','category'] as const).map(field => <label key={field} className="text-sm font-semibold">{{ hotelName:'Hotel Name',city:'City',roomType:'Room Type',mealPlan:'Meal Type',category:'Category' }[field]}<input aria-label={`Option 2 Hotel ${index + 1} ${field}`} className={fieldClass} value={hotel[field] || ''} onChange={event => update(index, field, event.target.value)} /></label>)}
        <label className="text-sm font-semibold">Nights<input aria-label={`Option 2 Hotel ${index + 1} nights`} type="number" min="1" max="365" className={fieldClass} value={hotel.nights} onChange={event => update(index,'nights',Number(event.target.value))} /></label>
      </div>
      <button type="button" disabled={value.hotels.length === 1} onClick={() => onChange({ ...value, hotels:value.hotels.filter((_,i)=>i!==index) })} className="text-sm font-semibold text-danger-ink disabled:opacity-40">Remove this hotel</button>
    </fieldset>)}
    <button type="button" className="font-semibold text-brand-ink" onClick={() => onChange({ ...value, hotels:[...value.hotels,newHotel()] })}>+ Add hotel to Option 2</button>
    <label className="block text-sm font-semibold">Hotel Option 2 Price (₹)<input aria-label="Hotel Option 2 Price" type="number" min="0" step="0.01" className={fieldClass} value={value.price || ''} onChange={event => onChange({ ...value,price:Number(event.target.value) })} /></label>
  </section>;
}
