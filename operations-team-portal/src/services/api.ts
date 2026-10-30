import { Customer, HotelVoucher, TripItinerary, PaymentInstallment } from '../types';
import { getStoredCustomers, saveCustomers, getStoredVouchers, saveVouchers, getStoredItineraries, saveItineraries, resetToDefaults } from '../utils/storage';

const API_BASE = '/api/ops';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API Error (${res.status}): ${errText}`);
  }
  return res.json();
}

export async function fetchOpsCustomers(): Promise<Customer[]> {
  try {
    const res = await fetch(`${API_BASE}/customers`);
    if (!res.ok) throw new Error('Backend unavailable');
    const data = await handleResponse<Customer[]>(res);
    saveCustomers(data);
    return data;
  } catch (err) { throw err; }
}

export async function createOpsCustomer(customerData: Partial<Customer>): Promise<Customer> {
  try {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerData),
    });
    return await handleResponse<Customer>(res);
  } catch (err) { throw err; }
}

export async function updateOpsCustomer(id: string, customerData: Partial<Customer>): Promise<Customer> {
  try {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerData),
    });
    return await handleResponse<Customer>(res);
  } catch (err) { throw err; }
}

export async function recordOpsPayment(
  customerId: string,
  installmentId: string,
  details: Partial<PaymentInstallment>
): Promise<Customer> {
  try {
    const res = await fetch(`${API_BASE}/customers/${customerId}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installmentId, ...details }),
    });
    return await handleResponse<Customer>(res);
  } catch (err) { throw err; }
}

export async function updateOpsInstallment(
  customerId: string,
  installmentId: string,
  details: Partial<PaymentInstallment>
): Promise<Customer> {
  try {
    const res = await fetch(`${API_BASE}/customers/${customerId}/installments/${installmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details),
    });
    return await handleResponse<Customer>(res);
  } catch (err) { throw err; }
}

export async function fetchOpsVouchers(customers?: Customer[]): Promise<HotelVoucher[]> {
  try {
    const res = await fetch(`${API_BASE}/vouchers`);
    if (!res.ok) throw new Error('Backend unavailable');
    const data = await handleResponse<HotelVoucher[]>(res);
    saveVouchers(data);
    return data;
  } catch (err) { throw err; }
}

export async function createOpsVoucher(voucherData: Partial<HotelVoucher>): Promise<HotelVoucher> {
  try {
    const res = await fetch(`${API_BASE}/vouchers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(voucherData),
    });
    return await handleResponse<HotelVoucher>(res);
  } catch (err) { throw err; }
}

export async function uploadOpsVoucherFile(
  voucherId: string,
  confirmationNumber: string,
  fileName: string,
  fileUrl?: string
): Promise<HotelVoucher> {
  try {
    const res = await fetch(`${API_BASE}/vouchers/${voucherId}/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmationNumber, fileName, fileUrl }),
    });
    return await handleResponse<HotelVoucher>(res);
  } catch (err) { throw err; }
}

export async function updateOpsVoucher(id: string, data: Partial<HotelVoucher>): Promise<HotelVoucher> {
  try {
    const res = await fetch(`${API_BASE}/vouchers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handleResponse<HotelVoucher>(res);
  } catch (err) { throw err; }
}

export async function deleteOpsVoucher(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/vouchers/${id}`, {
      method: 'DELETE',
    });
    const result = await handleResponse<{ success: boolean }>(res);
    return !!result?.success;
  } catch (err) { throw err; }
}

export async function fetchOpsItineraries(): Promise<TripItinerary[]> {
  try {
    const res = await fetch(`${API_BASE}/itineraries`);
    if (!res.ok) throw new Error('Backend unavailable');
    const data = await handleResponse<TripItinerary[]>(res);
    saveItineraries(data);
    return data;
  } catch (err) { throw err; }
}

export async function updateOpsItinerary(id: string, data: Partial<TripItinerary>): Promise<TripItinerary> {
  try {
    const res = await fetch(`${API_BASE}/itineraries/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handleResponse<TripItinerary>(res);
  } catch (err) { throw err; }
}

export async function resetOpsBackendData(): Promise<void> {
  try {
    await handleResponse(await fetch(`${API_BASE}/reset`, { method: 'POST' }));
  } catch (err) { throw err; }
}
