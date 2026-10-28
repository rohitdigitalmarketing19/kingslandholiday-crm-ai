import type { QuoteData, HotelEntry } from '../types';
export class HotelOptionValidationError extends Error {}

export function normalizeHotelAlternative(value: unknown): QuoteData['hotelAlternative'] {
  if (value == null) return null;
  const option = value as { price?: unknown; hotels?: unknown };
  if (typeof option !== 'object' || !Number.isFinite(option.price) || Number(option.price) <= 0) throw new HotelOptionValidationError('Enter a valid price for Hotel Option 2.');
  if (!Array.isArray(option.hotels) || option.hotels.length === 0 || option.hotels.length > 30) throw new HotelOptionValidationError('Add at least one hotel to Hotel Option 2.');
  const hotels = option.hotels.map((entry: Partial<HotelEntry>) => {
    if (!entry || typeof entry.hotelName !== 'string' || !entry.hotelName.trim()) throw new HotelOptionValidationError('Enter the hotel name for every row in Hotel Option 2.');
    const nights = Number(entry.nights);
    if (!Number.isInteger(nights) || nights < 1 || nights > 365) throw new HotelOptionValidationError('Enter valid nights for each hotel in Option 2.');
    const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
    return { nights, hotelName: entry.hotelName.trim(), city: text(entry.city), category: text(entry.category), roomType: text(entry.roomType), mealPlan: text(entry.mealPlan), comments: text(entry.comments), selectedNightIndices: [] };
  });
  return { price: Number(option.price), hotels };
}

export function quoteMealPlan(quote: Pick<QuoteData, 'inclusions'>): string {
  const meals = quote.inclusions?.mealPlan;
  const labels = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner']].filter(([key]) => (meals as any)?.[key]?.included).map(([, label]) => label);
  if (labels.length === 3) return 'APAI (Breakfast, Lunch & Dinner)';
  if (labels.join(',') === 'Breakfast,Dinner') return 'MAPAI (Breakfast & Dinner)';
  if (labels.length === 1 && labels[0] === 'Breakfast') return 'CPAI (Breakfast)';
  return labels.length ? labels.join(' & ') : 'EP (Room Only)';
}
