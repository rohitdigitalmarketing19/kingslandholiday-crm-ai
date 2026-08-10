import { Customer, HotelVoucher, TripItinerary, PaymentInstallment } from '../types';

const CUSTOMERS_KEY = 'ops_app_customers_v2';
const VOUCHERS_KEY = 'ops_app_vouchers_v1';
const ITINERARIES_KEY = 'ops_app_itineraries_v1';

export function ensureCustomerInstallments(c: Customer): PaymentInstallment[] {
  // If package total amount is 0 or not set, do not show/calculate EMI amounts
  if (!c.totalAmount || c.totalAmount <= 0) {
    return [];
  }

  const todayStr = new Date().toISOString().split('T')[0];

  if (c.installments && c.installments.length > 0) {
    // Re-evaluate overdue status based on current date
    return c.installments.map((inst) => {
      if (inst.status === 'Paid') return inst;
      const isPast = inst.dueDate ? inst.dueDate < todayStr : false;
      return {
        ...inst,
        status: isPast ? 'Overdue' : 'Pending',
      };
    });
  }

  // No installments from backend — return empty array (backend handles creation)
  return [];
}

export function getStoredCustomers(): Customer[] {
  try {
    const data = localStorage.getItem(CUSTOMERS_KEY);
    if (!data) {
      return [];
    }
    const parsed: Customer[] = JSON.parse(data);
    // Filter out legacy mock dummy records (cust-1, cust-2, cust-3, cust-4)
    const filtered = parsed.filter(c => !['cust-1', 'cust-2', 'cust-3', 'cust-4'].includes(c.id));
    const validated = filtered.map(c => ({
      ...c,
      installments: ensureCustomerInstallments(c),
    }));
    return validated;
  } catch (e) {
    console.error('Error reading customers from localStorage', e);
    return [];
  }
}

export function saveCustomers(customers: Customer[]): void {
  try {
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
  } catch (e) {
    console.error('Error saving customers to localStorage', e);
  }
}

export function getStoredVouchers(customers?: Customer[]): HotelVoucher[] {
  try {
    const data = localStorage.getItem(VOUCHERS_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (e) {
    console.error('Error reading vouchers from localStorage', e);
    return [];
  }
}

export function saveVouchers(vouchers: HotelVoucher[]): void {
  try {
    localStorage.setItem(VOUCHERS_KEY, JSON.stringify(vouchers));
  } catch (e) {
    console.error('Error saving vouchers to localStorage', e);
  }
}

export function getStoredItineraries(): TripItinerary[] {
  try {
    const data = localStorage.getItem(ITINERARIES_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (e) {
    console.error('Error reading itineraries from localStorage', e);
    return [];
  }
}

export function saveItineraries(itineraries: TripItinerary[]): void {
  try {
    localStorage.setItem(ITINERARIES_KEY, JSON.stringify(itineraries));
  } catch (e) {
    console.error('Error saving itineraries to localStorage', e);
  }
}

export function resetToDefaults(): void {
  localStorage.setItem(CUSTOMERS_KEY, JSON.stringify([]));
  localStorage.setItem(VOUCHERS_KEY, JSON.stringify([]));
  localStorage.setItem(ITINERARIES_KEY, JSON.stringify([]));
}
