export const B2B_QUALITIES = ['Partner', 'Potential', 'Not Active'] as const;
export type B2BQuality = typeof B2B_QUALITIES[number];
export interface B2BDraft { name: string; phone: string; city: string; state: string; quality: B2BQuality }
export interface B2BContact extends B2BDraft { id: string; updatedAt: string }
export const emptyB2B = (): B2BDraft => ({ name: '', phone: '', city: '', state: '', quality: 'Potential' });
export function validateB2B(data: any): B2BDraft {
  if (!data || typeof data !== 'object') throw new Error('Enter the contact details.');
  const text = (key: string, label: string) => {
    if (typeof data[key] !== 'string' || !data[key].trim() || data[key].trim().length > 160) throw new Error(`${label}: enter between 1 and 160 characters.`);
    return data[key].trim();
  };
  const name = text('name', 'Name'), city = text('city', 'City'), state = text('state', 'State');
  const phone = text('phone', 'Phone number');
  if (phone.length > 32 || !/^\+?[\d\s().-]+$/.test(phone) || phone.replace(/\D/g, '').length < 7 || phone.replace(/\D/g, '').length > 15) throw new Error('Enter a valid phone number with 7–15 digits.');
  if (!B2B_QUALITIES.includes(data.quality)) throw new Error('Choose Partner, Potential or Not Active.');
  return { name, phone, city, state, quality: data.quality };
}
