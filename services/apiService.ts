/**
 * Frontend API Service Layer
 * Replaces all in-memory state operations with REST API calls to the backend.
 */

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const customKey = typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : null;
  const customHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
  if (customKey) {
    customHeaders['x-gemini-api-key'] = customKey;
  }

  const res = await fetch(`${API_BASE}${url}`, {
    headers: { ...customHeaders, ...(options?.headers as Record<string, string>) },
    ...options,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Request failed: ${res.status}`);
  }

  return res.json();
}

// ========================
// LEADS
// ========================

export async function fetchLeads(filters?: {
  status?: string;
  assignedTo?: string;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.assignedTo) params.set('assignedTo', filters.assignedTo);
  if (filters?.search) params.set('search', filters.search);
  const query = params.toString();
  return request<any[]>(`/leads${query ? `?${query}` : ''}`);
}

export async function fetchLeadById(id: string) {
  return request<any>(`/leads/${id}`);
}

export async function createLead(data: any) {
  return request<any>('/leads', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateLeadStatus(id: string, status: string, extra?: { 
  postponedDate?: string; 
  postponedReason?: string;
  followUpDate?: string;
  followUpTime?: string;
  followUpType?: string;
  followUpNote?: string;
  followUpCompleted?: boolean;
}) {
  return request<any>(`/leads/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, ...(extra || {}) }),
  });
}

export async function deleteLead(id: string) {
  return request<any>(`/leads/${id}`, { method: 'DELETE' });
}

// ========================
// AGENTS
// ========================

export async function fetchAgents() {
  return request<any[]>('/agents');
}

export async function createAgent(data: { name: string; specialty: string[] }) {
  return request<any>('/agents', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteAgent(id: string) {
  return request<any>(`/agents/${id}`, { method: 'DELETE' });
}

// ========================
// QUOTES
// ========================

export async function saveQuote(leadId: string, quote: any, isUpdate: boolean) {
  if (isUpdate) {
    return request<any>(`/leads/${leadId}/quotes/${quote.id}`, {
      method: 'PUT',
      body: JSON.stringify(quote),
    });
  } else {
    return request<any>(`/leads/${leadId}/quotes`, {
      method: 'POST',
      body: JSON.stringify(quote),
    });
  }
}

export async function deleteQuote(leadId: string, quoteId: string) {
  return request<any>(`/leads/${leadId}/quotes/${quoteId}`, { method: 'DELETE' });
}

// ========================
// NOTES
// ========================

export async function addNote(leadId: string, text: string, type: string) {
  return request<any>(`/leads/${leadId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ text, type }),
  });
}

// ========================
// TEMPLATES
// ========================

export async function fetchTemplates(search?: string) {
  const params = search ? `?search=${encodeURIComponent(search)}` : '';
  return request<any[]>(`/templates${params}`);
}

export async function createTemplate(data: { title: string; destination: string; nights: number; templateData?: any }) {
  return request<any>('/templates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteTemplate(id: string) {
  return request<any>(`/templates/${id}`, { method: 'DELETE' });
}

// ========================
// AI (proxied through backend)
// ========================

export async function analyzeLeadAI(data: {
  name: string;
  destination: string;
  duration: number;
  date: string;
  travelers: any;
  otherInfo: string;
}) {
  return request<any>('/ai/analyze-lead', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function generateItineraryAI(data: {
  name: string;
  destination: string;
  durationDays: number;
  travelDate: string;
  adults: number;
  children: number;
  summary: string;
  otherInfo: string;
}) {
  return request<any>('/ai/generate-itinerary', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function draftFollowUpEmailAI(data: {
  leadName: string;
  agentName: string;
  destination: string;
  travelDate: string;
  status: string;
  otherInfo: string;
}) {
  return request<{ email: string }>('/ai/draft-email', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ========================
// PAYMENTS (WordPress travelpro-crm integration)
// ========================

export async function createPaymentLink(data: {
  leadId?: string;
  packageName: string;
  amount: number;
  gst?: number;
  fee?: number;
  discount?: number;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  destination?: string;
  travelDate?: string;
  adults?: number;
  children?: number;
  duration?: string;
  hotels?: string;
  travelers?: string;
}) {
  return request<any>('/payments/links', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

const SUBMISSIONS_KEY = 'kingsland_payment_submissions';
const LINKS_KEY = 'kingsland_payment_links';

export async function fetchPaymentLinks(leadId?: string) {
  try {
    const params = leadId ? `?leadId=${encodeURIComponent(leadId)}` : '';
    const res = await request<any[]>(`/payments/links${params}`);
    if (Array.isArray(res)) {
      if (!leadId && typeof window !== 'undefined') {
        localStorage.setItem(LINKS_KEY, JSON.stringify(res));
      }
      return res;
    }
  } catch (err) {
    console.warn('⚠️ Static Mode: Fetching payment links from local storage');
  }
  const local = typeof window !== 'undefined' ? localStorage.getItem(LINKS_KEY) : null;
  const list = local ? JSON.parse(local) : [];
  if (leadId) {
    return list.filter((l: any) => l.lead_id === leadId || l.leadId === leadId);
  }
  return list;
}

export async function fetchPaymentLinkByKey(payKey: string) {
  try {
    return await request<any>(`/payments/links/${encodeURIComponent(payKey)}`);
  } catch (err) {
    const local = typeof window !== 'undefined' ? localStorage.getItem(LINKS_KEY) : null;
    const list = local ? JSON.parse(local) : [];
    return list.find((l: any) => l.pay_key === payKey || l.payKey === payKey) || null;
  }
}

export async function createPaymentSubmission(data: {
  payKey?: string;
  leadId?: string;
  customerName: string;
  mobile: string;
  packageName: string;
  amountPaid: number;
  utrNumber: string;
  paymentMode: 'Razorpay' | 'UPI' | 'Bank Transfer' | 'Cash';
  receiptUrl?: string;
}) {
  const newSub = {
    id: `sub-${Date.now()}`,
    pay_key: data.payKey || '',
    lead_id: data.leadId || '',
    customer_name: data.customerName || 'Customer',
    mobile: data.mobile || '',
    package_name: data.packageName || 'Tour Package',
    amount_paid: data.amountPaid || 0,
    utr_number: data.utrNumber || '',
    payment_mode: data.paymentMode || 'UPI',
    verification_status: 'Pending Review',
    created_at: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(SUBMISSIONS_KEY);
    const list = local ? JSON.parse(local) : [];
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify([newSub, ...list]));
  }

  try {
    return await request<any>('/payments/submissions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.warn('⚠️ Saved payment submission locally in static mode');
    return newSub;
  }
}

export async function fetchPaymentSubmissions(leadId?: string) {
  try {
    const params = leadId ? `?leadId=${encodeURIComponent(leadId)}` : '';
    const res = await request<any[]>(`/payments/submissions${params}`);
    if (Array.isArray(res)) {
      if (!leadId && typeof window !== 'undefined') {
        localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(res));
      }
      return res;
    }
  } catch (err) {
    console.warn('⚠️ Static Mode: Fetching payment submissions from local storage');
  }
  const local = typeof window !== 'undefined' ? localStorage.getItem(SUBMISSIONS_KEY) : null;
  const list = local ? JSON.parse(local) : [];
  if (leadId) {
    return list.filter((s: any) => s.lead_id === leadId || s.leadId === leadId);
  }
  return list;
}

export async function clearAllPaymentSubmissions() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SUBMISSIONS_KEY);
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify([]));
  }
  try {
    await request<any>('/payments/submissions', { method: 'DELETE' });
  } catch (err) {
    console.warn('⚠️ Server offline, cleared local submissions only');
  }
  return { success: true };
}

export async function verifyPaymentSubmission(id: string, status: 'Approved' | 'Rejected' | 'Pending Review') {
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(SUBMISSIONS_KEY);
    const list = local ? JSON.parse(local) : [];
    const updated = list.map((s: any) => s.id === id ? { ...s, verification_status: status } : s);
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(updated));
  }
  try {
    return await request<any>(`/payments/submissions/${id}/verify`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  } catch (err) {
    console.warn('⚠️ Updated submission status locally in static mode');
    return { id, verification_status: status };
  }
}

export async function fetchPaymentSettings() {
  return request<any>('/payments/settings');
}

export async function savePaymentSettings(data: any) {
  return request<any>('/payments/settings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchLeadInstallments(leadId: string) {
  return request<any[]>(`/payments/installments?leadId=${encodeURIComponent(leadId)}`);
}

export async function saveInstallmentSchedule(leadId: string, installments: any[]) {
  return request<any[]>('/payments/installments', {
    method: 'POST',
    body: JSON.stringify({ leadId, installments }),
  });
}

export function updateInstallmentStatus(
  id: string,
  status: 'Pending' | 'Paid',
  paidAmount?: number,
  paymentMode?: string,
  transactionRef?: string
) {
  return request<any>(`/payments/installments/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, paidAmount, paymentMode, transactionRef }),
  });
}

export async function confirmPayment(data: {
  payKey?: string;
  id?: string;
  refNumber?: string;
  paymentMode?: string;
  amount?: number;
}) {
  return request<any>('/payments/confirm', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePaymentLinkStatus(key: string, status: string, paidAmount?: number, ref?: string) {
  return request<any>(`/payments/links/${encodeURIComponent(key)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, paidAmount, transactionRef: ref }),
  });
}

export async function updateOpsInstallment(customerId: string, installmentId: string, details: any) {
  return request<any>(`/ops/customers/${customerId}/installments/${installmentId}`, {
    method: 'PATCH',
    body: JSON.stringify(details),
  });
}

export async function updateLeadAccounts(id: string, data: { accountsRemarks?: string; reviewRequestedAt?: string; reviewChannel?: string }) {
  return request<any>(`/leads/${id}/accounts`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function fetchOpsCustomers(filters?: { status?: string; search?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.search) params.set('search', filters.search);
  const query = params.toString();
  return request<any[]>(`/ops/customers${query ? `?${query}` : ''}`);
}

export async function updateOpsCustomer(id: string, data: any) {
  return request<any>(`/ops/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function fetchOpsVouchers(filters?: { status?: string; search?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.search) params.set('search', filters.search);
  const query = params.toString();
  return request<any[]>(`/ops/vouchers${query ? `?${query}` : ''}`);
}

export async function updateOpsVoucher(id: string, data: any) {
  return request<any>(`/ops/vouchers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
