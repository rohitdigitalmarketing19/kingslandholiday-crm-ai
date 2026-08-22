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
  } catch (err) {
    console.warn('Backend API fallback: Loading customers from local storage', err);
    return getStoredCustomers();
  }
}

export async function createOpsCustomer(customerData: Partial<Customer>): Promise<Customer> {
  try {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerData),
    });
    return await handleResponse<Customer>(res);
  } catch (err) {
    console.warn('Backend API fallback: Creating customer locally', err);
    const existing = getStoredCustomers();
    const newCust: Customer = {
      id: customerData.id || `cust-${Date.now()}`,
      bookingId: customerData.bookingId || `LIXKT-${Math.floor(8000 + Math.random() * 1999)}`,
      name: customerData.name || 'New Guest',
      email: customerData.email || '',
      phone: customerData.phone || '',
      destination: customerData.destination || '',
      startDate: customerData.startDate || new Date().toISOString().split('T')[0],
      endDate: customerData.endDate || new Date().toISOString().split('T')[0],
      paxAdults: customerData.paxAdults || 2,
      paxChildren: customerData.paxChildren || 0,
      totalAmount: customerData.totalAmount || 1850,
      currency: customerData.currency || 'INR',
      assignedOpsManager: customerData.assignedOpsManager || 'Unassigned',
      status: customerData.status || 'Upcoming',
      installments: customerData.installments || [],
      notes: customerData.notes || '',
      specialRequests: customerData.specialRequests || '',
      emergencyContact: customerData.emergencyContact || '',
      createdAt: customerData.createdAt || new Date().toISOString().split('T')[0],
    };
    saveCustomers([newCust, ...existing]);
    return newCust;
  }
}

export async function updateOpsCustomer(id: string, customerData: Partial<Customer>): Promise<Customer> {
  try {
    const res = await fetch(`${API_BASE}/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerData),
    });
    return await handleResponse<Customer>(res);
  } catch (err) {
    console.warn('Backend API fallback: Updating customer locally', err);
    const existing = getStoredCustomers();
    const updated = existing.map((c) => (c.id === id ? { ...c, ...customerData } : c));
    saveCustomers(updated);
    return updated.find((c) => c.id === id)!;
  }
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
  } catch (err) {
    console.warn('Backend API fallback: Recording payment locally', err);
    const existing = getStoredCustomers();
    const updated = existing.map((c) => {
      if (c.id !== customerId) return c;
      const updatedInstallments = (c.installments || []).map((inst) =>
        inst.id === installmentId ? { ...inst, ...details } : inst
      );
      return { ...c, installments: updatedInstallments };
    });
    saveCustomers(updated);
    return updated.find((c) => c.id === customerId)!;
  }
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
  } catch (err) {
    console.warn('Backend API fallback: Updating installment locally', err);
    const existing = getStoredCustomers();
    const updated = existing.map((c) => {
      if (c.id !== customerId) return c;
      const updatedInstallments = (c.installments || []).map((inst) =>
        inst.id === installmentId ? { ...inst, ...details } : inst
      );
      return { ...c, installments: updatedInstallments };
    });
    saveCustomers(updated);
    return updated.find((c) => c.id === customerId)!;
  }
}

export async function fetchOpsVouchers(customers?: Customer[]): Promise<HotelVoucher[]> {
  try {
    const res = await fetch(`${API_BASE}/vouchers`);
    if (!res.ok) throw new Error('Backend unavailable');
    const data = await handleResponse<HotelVoucher[]>(res);
    saveVouchers(data);
    return data;
  } catch (err) {
    console.warn('Backend API fallback: Loading vouchers from local storage', err);
    return getStoredVouchers();
  }
}

export async function createOpsVoucher(voucherData: Partial<HotelVoucher>): Promise<HotelVoucher> {
  try {
    const res = await fetch(`${API_BASE}/vouchers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(voucherData),
    });
    return await handleResponse<HotelVoucher>(res);
  } catch (err) {
    console.warn('Backend API fallback: Creating voucher locally', err);
    const existing = getStoredVouchers();
    const newVoucher = {
      ...voucherData,
      id: voucherData.id || `v-${Date.now()}`,
      status: voucherData.status || 'Uploaded',
    } as HotelVoucher;
    saveVouchers([...existing.filter(v => v.id !== newVoucher.id), newVoucher]);
    return newVoucher;
  }
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
  } catch (err) {
    console.warn('Backend API fallback: Uploading voucher locally', err);
    const existing = getStoredVouchers();
    const updated = existing.map((v) =>
      v.id === voucherId
        ? {
            ...v,
            confirmationNumber,
            fileName,
            fileUrl: fileUrl || v.fileUrl,
            status: 'Uploaded' as const,
            uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
            uploadedBy: 'Ops Manager',
          }
        : v
    );
    saveVouchers(updated);
    return updated.find((v) => v.id === voucherId)!;
  }
}

export async function updateOpsVoucher(id: string, data: Partial<HotelVoucher>): Promise<HotelVoucher> {
  try {
    const res = await fetch(`${API_BASE}/vouchers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handleResponse<HotelVoucher>(res);
  } catch (err) {
    console.warn('Backend API fallback: Updating voucher locally', err);
    const existing = getStoredVouchers();
    const updated = existing.map((v) => (v.id === id ? { ...v, ...data } : v));
    saveVouchers(updated);
    return updated.find((v) => v.id === id)!;
  }
}

export async function deleteOpsVoucher(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/vouchers/${id}`, {
      method: 'DELETE',
    });
    const result = await handleResponse<{ success: boolean }>(res);
    return !!result?.success;
  } catch (err) {
    console.warn('Backend API fallback: Deleting voucher locally', err);
    const existing = getStoredVouchers();
    const updated = existing.filter((v) => v.id !== id);
    saveVouchers(updated);
    return true;
  }
}

export async function fetchOpsItineraries(): Promise<TripItinerary[]> {
  try {
    const res = await fetch(`${API_BASE}/itineraries`);
    if (!res.ok) throw new Error('Backend unavailable');
    const data = await handleResponse<TripItinerary[]>(res);
    saveItineraries(data);
    return data;
  } catch (err) {
    console.warn('Backend API fallback: Loading itineraries from local storage', err);
    return getStoredItineraries();
  }
}

export async function updateOpsItinerary(id: string, data: Partial<TripItinerary>): Promise<TripItinerary> {
  try {
    const res = await fetch(`${API_BASE}/itineraries/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handleResponse<TripItinerary>(res);
  } catch (err) {
    console.warn('Backend API fallback: Updating itinerary locally', err);
    const existing = getStoredItineraries();
    const updated = existing.map((i) => (i.id === id ? { ...i, ...data } : i));
    saveItineraries(updated);
    return updated.find((i) => i.id === id)!;
  }
}

export async function resetOpsBackendData(): Promise<void> {
  try {
    await fetch(`${API_BASE}/reset`, { method: 'POST' });
  } catch (err) {
    console.warn('Backend API fallback: Resetting local storage', err);
    resetToDefaults();
  }
}
