export interface BlackoutPeriod { start: string; end: string }
export interface HotelRate {
  id: string; name: string; city: string; category: string;
  offSeasonRate?: string; offSeasonStartDate?: string; seasonStartDate?: string; contactNumber?: string;
  seasonalRate: string; blackoutRate: string; blackoutDates: BlackoutPeriod[];
  pdfName: string; updatedAt: string;
}
export const RATE_BANDS = [
  { label: 'All rates', value: '', min: 0, max: Infinity },
  { label: '₹0 – ₹1,000', value: '1000', min: 0, max: 100000 },
  { label: '₹1,000 – ₹2,000', value: '2000', min: 100000, max: 200000 },
  { label: '₹2,000 – ₹3,000', value: '3000', min: 200000, max: 300000 },
  { label: '₹3,000 – ₹4,000', value: '4000', min: 300000, max: 400000 },
  { label: '₹4,000 – ₹5,000', value: '5000', min: 400000, max: 500000 },
  { label: '₹5,000 – ₹8,000', value: '8000', min: 500000, max: 800000 },
  { label: 'Above ₹8,000', value: 'above', min: 800000, max: Infinity },
];
export function toPaise(value: unknown): number {
  if (typeof value !== 'string' || !/^\d{1,9}(\.\d{1,2})?$/.test(value)) throw new Error('Enter a valid non-negative rate with up to two decimal places.');
  const [whole, fraction = ''] = value.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
export function matchesRateBand(rate: string, band: string): boolean {
  const selected = RATE_BANDS.find(item => item.value === band) || RATE_BANDS[0];
  const amount = toPaise(rate);
  return (selected.min === 0 ? amount >= 0 : amount > selected.min) && amount <= selected.max;
}
export function validateBlackoutDates(value: unknown): BlackoutPeriod[] {
  if (!Array.isArray(value) || value.length > 100) throw new Error('Add up to 100 blackout periods.');
  const validDate = (date: unknown): date is string => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= '1900-01-01' && date <= '9999-12-31' && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
  return value.map((period, index) => {
    if (!period || !validDate(period.start) || !validDate(period.end) || period.start > period.end) throw new Error(`Blackout period ${index + 1}: enter valid dates with the end on or after the start.`);
    return { start: period.start, end: period.end };
  });
}

export function validateSeasonStart(value: unknown, label: string): string {
  if (value === '' || value == null) return '';
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > '9999-12-31' || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new Error(`${label}: enter a valid start date.`);
  return value;
}
export function validateHotelContact(value: unknown): string {
  if (value === '' || value == null) return '';
  if (typeof value !== 'string' || value.length > 32 || !/^\+?[\d ()-]+$/.test(value.trim()) || !/^\d{7,15}$/.test(value.replace(/\D/g, ''))) throw new Error('Contact number: enter 7 to 15 digits, optionally with a country code.');
  return value.trim();
}
