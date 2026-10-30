/**
 * Frontend API Service Layer
 * Replaces all in-memory state operations with REST API calls to the backend.
 */

const API_BASE = '/api';
export const fetchB2BContacts = () => request<import('../utils/b2bData').B2BContact[]>('/b2b-data');
export const saveB2BContact = (data: import('../utils/b2bData').B2BDraft, id?: string) => request<import('../utils/b2bData').B2BContact>(`/b2b-data${id ? `/${encodeURIComponent(id)}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) });
export const deleteB2BContact = (id: string) => request<{ success: boolean }>(`/b2b-data/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const acceptQuote = (leadId: string,quoteId: string) => request<any>(`/leads/${encodeURIComponent(leadId)}/quotes/${encodeURIComponent(quoteId)}/accept`,{method:'POST'});

export const deleteHotelRate = (id: string) => request<{ success: boolean; id: string }>(`/hotel-rates/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const fetchHotelRates = () => request<import('../utils/hotelRates').HotelRate[]>('/hotel-rates');
export const saveHotelRate = (data: any, id?: string) => request<import('../utils/hotelRates').HotelRate>(`/hotel-rates${id ? `/${encodeURIComponent(id)}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) });
export async function fetchHotelRatePdf(id: string): Promise<Blob> {
  const res = await fetch(`/api/hotel-rates/${encodeURIComponent(id)}/pdf`, { headers: { 'x-user-id': localStorage.getItem('kingsland_active_user_id') || '' } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Unable to load rate sheet.');
  return res.blob();
}


async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const customKey = typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : null;
  const activeUserId = typeof window !== 'undefined' ? localStorage.getItem('kingsland_active_user_id') : null;
  const customHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
  if (customKey) {
    customHeaders['x-gemini-api-key'] = customKey;
  }
  if (activeUserId) {
    customHeaders['x-user-id'] = activeUserId;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${url}`, {
      ...options,
      credentials: 'same-origin',
      headers: { ...customHeaders, ...(options?.headers as Record<string, string>) },
    });
  } catch {
    throw new Error('Cannot reach the CRM server. Check your connection and try again.');
  }
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = res.status === 401 ? 'Your login session has expired. Sign in again, then retry saving.' : typeof errorData.error === 'string' ? errorData.error : typeof errorData.message === 'string' ? errorData.message : `The CRM server rejected this request (HTTP ${res.status}).`;
    throw Object.assign(new Error(message), {status:res.status,code:errorData.code});
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

export async function reassignLead(leadId: string, assignedTo: string) {
  return request<any>(`/leads/${leadId}/reassign`, {
    method: 'PATCH',
    body: JSON.stringify({ assignedTo }),
  });
}

export async function updateLeadTravelers(
  id: string,
  adults: number,
  children: number,
  childAges: number[] = [],
  extra?: {
    budgetTier?: string;
    includeStay?: string;
    includeFlight?: string;
    includeCab?: string;
    hotelCategory?: string;
    otherInfo?: string;
  }
) {
  return request<any>(`/leads/${id}/travelers`, {
    method: 'PATCH',
    body: JSON.stringify({ adults, children, childAges, ...extra }),
  });
}

// ========================
// AGENTS
// ========================

export async function fetchAgents() {
  return request<any[]>('/agents');
}

export async function createAgent(data: { name: string; specialty: string[]; avatar?: string; phone?: string; email?: string }) {
  return request<any>('/agents', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAgent(id: string, data: { name?: string; specialty?: string[]; avatar?: string; phone?: string; email?: string }) {
  return request<any>(`/agents/${id}`, {
    method: 'PUT',
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

export async function updateTemplate(id: string, data: { title?: string; destination?: string; nights?: number; templateData?: any }) {
  return request<any>(`/templates/${id}`, {
    method: 'PUT',
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
  transactionRef?: string,
  comments?: string
) {
  return request<any>(`/payments/installments/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, paidAmount, paymentMode, transactionRef, comments, notes: comments }),
  });
}

export function updateInstallmentComment(id: string, comment: string) {
  return request<any>(`/payments/installments/${id}/comment`, {
    method: 'PATCH',
    body: JSON.stringify({ comment, comments: comment, notes: comment }),
  });
}

export async function confirmPayment(data: {
  payKey?: string;
  id?: string;
  refNumber?: string;
  paymentMode?: string;
  amount?: number;
  comments?: string;
  notes?: string;
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

// ========================
// MASTERS REFERENCE DATA
// ========================

export async function fetchMasters(category?: string) {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return request<any[]>(`/masters${query}`);
}

export async function addMasterItem(data: { category: string; name: string; code?: string; description?: string }) {
  return request<any>('/masters', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function toggleMasterItem(id: string, isEnabled?: boolean) {
  return request<any>(`/masters/${id}/toggle`, {
    method: 'PATCH',
    body: JSON.stringify({ isEnabled }),
  });
}

export async function updateMasterItem(id: string, data: any) {
  return request<any>(`/masters/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteMasterItem(id: string) {
  return request<any>(`/masters/${id}`, {
    method: 'DELETE',
  });
}

// ========================
// PDF DESIGNS & TEMPLATES
// ========================

export async function fetchPdfDesigns() {
  return request<any[]>('/pdf-designs');
}

export async function fetchActivePdfDesign() {
  return request<any>('/pdf-designs/active');
}

export async function fetchPdfDesignById(id: string) {
  return request<any>(`/pdf-designs/${id}`);
}

export async function savePdfDesign(data: any) {
  return request<any>('/pdf-designs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function activatePdfDesign(id: string) {
  return request<any>(`/pdf-designs/${id}/activate`, {
    method: 'PATCH',
  });
}

export const setActivePdfDesign = activatePdfDesign;

export async function deactivatePdfDesign(id: string) {
  return request<any>(`/pdf-designs/${id}/deactivate`, {
    method: 'PATCH',
  });
}

export async function updatePdfDesignMappings(id: string, fieldMappings: any[]) {
  return request<any>(`/pdf-designs/${id}/mappings`, {
    method: 'PATCH',
    body: JSON.stringify({ field_mappings: fieldMappings }),
  });
}

export async function deletePdfDesign(id: string) {
  return request<any>(`/pdf-designs/${id}`, {
    method: 'DELETE',
  });
}

// ============================================
// PARTNER BRANDS & DESTINATION CITY PHOTOS API
// ============================================

export interface PartnerBrandItem {
  id: string;
  category: 'hotel' | 'travel';
  name: string;
  tagline: string;
  brand_color?: string;
  brandColor?: string;
  logo_url?: string;
  logoUrl?: string;
  svg_icon?: string;
  svgIcon?: string;
  is_active?: number;
  sort_order?: number;
}

export async function fetchPartnerBrands(): Promise<PartnerBrandItem[]> {
  const data = await request<any[]>('/pdf-designs/partners/all');
  return (data || []).map(p => ({
    ...p,
    tagline: p.tagline || (p.category === 'hotel' ? 'Hotel Partner' : 'Working Partner'),
    brandColor: p.brand_color || p.brandColor || '#b8860b',
    brand_color: p.brand_color || p.brandColor || '#b8860b',
    logoUrl: p.logo_url || p.logoUrl || '',
    logo_url: p.logo_url || p.logoUrl || '',
    svgIcon: p.svg_icon || p.svgIcon || ''
  }));
}

export async function createPartnerBrand(data: Partial<PartnerBrandItem>): Promise<PartnerBrandItem> {
  const p = await request<any>('/pdf-designs/partners', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return {
    ...p,
    tagline: p.tagline || (p.category === 'hotel' ? 'Hotel Partner' : 'Working Partner'),
    brandColor: p.brand_color || p.brandColor || '#b8860b',
    brand_color: p.brand_color || p.brandColor || '#b8860b',
    logoUrl: p.logo_url || p.logoUrl || '',
    logo_url: p.logo_url || p.logoUrl || '',
    svgIcon: p.svg_icon || p.svgIcon || ''
  };
}

export async function deletePartnerBrand(id: string): Promise<{ success: boolean; id: string }> {
  return request<{ success: boolean; id: string }>(`/pdf-designs/partners/${id}`, {
    method: 'DELETE',
  });
}

export interface DestinationPhotoItem {
  id: string;
  city: string;
  title?: string;
  image_url: string;
  tags?: string;
  is_default?: number;
}

export async function fetchDestinationPhotos(city?: string): Promise<DestinationPhotoItem[]> {
  const query = city ? `?city=${encodeURIComponent(city)}` : '';
  return request<DestinationPhotoItem[]>(`/pdf-designs/photos/all${query}`);
}

export async function createDestinationPhoto(data: { city: string; title?: string; image_url: string; tags?: string }): Promise<DestinationPhotoItem> {
  return request<DestinationPhotoItem>('/pdf-designs/photos', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteDestinationPhoto(id: string): Promise<{ success: boolean; id: string }> {
  return request<{ success: boolean; id: string }>(`/pdf-designs/photos/${id}`, {
    method: 'DELETE',
  });
}

// ========================
// AGENCY SETTINGS
// ========================

export async function fetchAgencySettings() {
  return request<any>('/settings');
}

export async function updateAgencySettings(data: any) {
  return request<any>('/settings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ========================
// PDF THEMES & FESTIVAL TEMPLATES
// ========================

export interface PdfThemeItem {
  id: string;
  name: string;
  festival: string;
  type: 'pack' | 'artwork' | 'image';
  filePath?: string;
  file_path?: string;
  startDate?: string;
  start_date?: string;
  endDate?: string;
  end_date?: string;
  isDefault?: boolean;
  is_default?: number | boolean;
  coverPreviewUrl?: string;
  cover_preview_url?: string;
  status: 'draft' | 'active' | 'archived';
  version: string;
  meta: {
    name: string;
    festival?: string;
    version?: string;
    startDate?: string;
    endDate?: string;
    colors: {
      primary: string;
      accent: string;
      background: string;
      text: string;
      navy?: string;
      rust?: string;
      cream?: string;
    };
    fonts: {
      heading: string;
      body: string;
    };
    safeMargin?: number;
    imageRadius?: number;
    badgeStripColor?: string;
    flameIconColor?: string;
  };
  createdBy: string;
  createdAt: string;
}

export type PdfThemeRecord = PdfThemeItem;

export async function fetchPdfThemes(): Promise<PdfThemeItem[]> {
  return request<PdfThemeItem[]>('/pdf-themes');
}

export async function fetchActivePdfTheme(date?: string): Promise<PdfThemeItem> {
  const q = date ? `?date=${encodeURIComponent(date)}` : '';
  return request<PdfThemeItem>(`/pdf-themes/active${q}`);
}

export async function uploadPdfTheme(formData: FormData): Promise<PdfThemeItem> {
  const activeUserId = typeof window !== 'undefined' ? localStorage.getItem('kingsland_active_user_id') : null;
  const customHeaders: Record<string, string> = {};
  if (activeUserId) customHeaders['x-user-id'] = activeUserId;
  customHeaders['x-user-role'] = 'Admin';

  const res = await fetch('/api/pdf-themes', {
    method: 'POST',
    headers: customHeaders,
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    if (res.status === 500 && !errorData.error) {
      throw new Error(`Backend API server is offline or unreachable on port 5000. Please start the backend server with 'npm run dev' or 'npm run server'.`);
    }
    throw new Error(errorData.error || `Upload failed with status ${res.status}`);
  }

  return res.json();
}

export async function activatePdfTheme(id: string): Promise<PdfThemeItem> {
  return request<PdfThemeItem>(`/pdf-themes/${id}/activate`, { method: 'PUT' });
}

export async function setDefaultPdfTheme(id: string): Promise<PdfThemeItem> {
  return request<PdfThemeItem>(`/pdf-themes/${id}/default`, { method: 'PUT' });
}

export async function archivePdfTheme(id: string): Promise<PdfThemeItem> {
  return request<PdfThemeItem>(`/pdf-themes/${id}/archive`, { method: 'PUT' });
}

export async function deletePdfTheme(id: string): Promise<{ success: boolean; id: string }> {
  return request<{ success: boolean; id: string }>(`/pdf-themes/${id}`, { method: 'DELETE' });
}

export async function generatePackagePdfBlob(pkgOrOptions: any, themeIdParam?: string): Promise<Blob> {
  let pkg: any;
  let themeId: string | undefined = themeIdParam;

  if (pkgOrOptions && typeof pkgOrOptions === 'object' && ('packageId' in pkgOrOptions || 'days' in pkgOrOptions || 'themeId' in pkgOrOptions)) {
    themeId = pkgOrOptions.themeId;
    pkg = pkgOrOptions.package || {
      title: pkgOrOptions.packageTitle || 'Package Itinerary',
      destination: pkgOrOptions.destination || 'Destination',
      daysCount: pkgOrOptions.days || 7,
      showDetailedItinerary: pkgOrOptions.showDetailedItinerary ?? true,
      packageId: pkgOrOptions.packageId
    };
  } else {
    pkg = pkgOrOptions;
  }

  const res = await fetch('/api/pdf-themes/generate-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ package: pkg, themeId }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `PDF generation failed: ${res.status}`);
  }

  return res.blob();
}

export async function previewPdfThemeHtml(
  themeIdOrOptions: string | { package?: any; themeId?: string; sampleDays?: number },
  daysCount?: number
): Promise<string> {
  let body: any = {};
  if (typeof themeIdOrOptions === 'string') {
    body = { themeId: themeIdOrOptions, sampleDays: daysCount || 7 };
  } else {
    body = themeIdOrOptions;
  }

  const res = await fetch('/api/pdf-themes/preview-html', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Failed to load theme preview: ${res.status}`);
  }

  return res.text();
}

// ========================
// CLIENT DOCUMENTS (ADMIN)
// ========================

export interface ClientDocumentItem {
  id: string;
  lead_id: string;
  doc_type: string;
  traveller_id: string | null;
  traveller_name: string | null;
  traveller_type: string | null;
  note: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
}

export interface ClientDocumentsResponse {
  totalCount: number;
  countsByType: Record<string, number>;
  documents: ClientDocumentItem[];
}

export async function fetchClientDocuments(leadId: string): Promise<ClientDocumentsResponse> {
  return request<ClientDocumentsResponse>(`/leads/${leadId}/documents`);
}

export async function uploadClientDocuments(
  leadId: string,
  files: File[],
  docType: string,
  note = '',
  travellerId?: string | null
): Promise<{ success: boolean; message: string; documents: any[] }> {
  const activeUserId = typeof window !== 'undefined' ? localStorage.getItem('kingsland_active_user_id') : null;
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));
  formData.append('doc_type', docType);
  if (note) formData.append('note', note);
  if (travellerId) formData.append('traveller_id', travellerId);

  const customHeaders: Record<string, string> = {};
  if (activeUserId) customHeaders['x-user-id'] = activeUserId;
  customHeaders['x-user-role'] = 'Admin';

  const res = await fetch(`/api/leads/${leadId}/documents`, {
    method: 'POST',
    headers: customHeaders,
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Upload failed: ${res.status}`);
  }

  return res.json();
}

export async function deleteClientDocument(leadId: string, docId: string): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>(`/leads/${leadId}/documents/${docId}`, {
    method: 'DELETE',
  });
}

export async function updateClientDocument(
  leadId: string,
  docId: string,
  data: { doc_type?: string; note?: string; traveller_id?: string | null }
): Promise<{ success: boolean; message: string }> {
  return request<{ success: boolean; message: string }>(`/leads/${leadId}/documents/${docId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function getClientDocumentSignedToken(leadId: string, docId: string): Promise<{ ticket: string; expiresAt: number }> {
  return request<{ ticket: string; expiresAt: number }>(`/leads/${leadId}/documents/${docId}/signed-token`);
}

export async function downloadAllClientDocumentsZip(leadId: string): Promise<Blob> {
  const activeUserId = typeof window !== 'undefined' ? localStorage.getItem('kingsland_active_user_id') : null;
  const customHeaders: Record<string, string> = {};
  if (activeUserId) customHeaders['x-user-id'] = activeUserId;
  customHeaders['x-user-role'] = 'Admin';

  const res = await fetch(`/api/leads/${leadId}/documents/download-all`, {
    headers: customHeaders,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to download documents ZIP`);
  }

  return res.blob();
}

// ========================
// CLIENT DETAILS (ADMIN & PUBLIC)
// ========================

export interface LeadTraveller {
  id?: string;
  lead_id?: string;
  type: 'adult' | 'child';
  name: string;
  mobile?: string | null;
  email?: string | null;
  is_primary?: boolean;
}

export interface ClientDetailsAdminResponse {
  lead: {
    id: string;
    trip_id: string;
    name: string;
    phone?: string;
    email?: string;
    status: string;
    destination: string;
    travel_date?: string;
    expected_adults: number;
    expected_children: number;
  };
  link: {
    id: string;
    token: string;
    is_active: boolean;
    expires_at: string | null;
    submitted_at: string | null;
    created_at: string;
    url_path: string;
  } | null;
  travellers: LeadTraveller[];
}

export async function fetchClientDetails(leadId: string): Promise<ClientDetailsAdminResponse> {
  return request<ClientDetailsAdminResponse>(`/leads/${leadId}/client-details`);
}

export async function generateClientDetailsLink(
  leadId: string,
  expiresAt?: string | null
): Promise<{ success: boolean; message: string; link: any }> {
  return request<{ success: boolean; message: string; link: any }>(`/leads/${leadId}/client-details/generate-link`, {
    method: 'POST',
    body: JSON.stringify({ expires_at: expiresAt }),
  });
}

export async function toggleClientDetailsLink(
  leadId: string,
  isActive: boolean,
  expiresAt?: string | null
): Promise<{ success: boolean; message: string; link: any }> {
  return request<{ success: boolean; message: string; link: any }>(`/leads/${leadId}/client-details/toggle-link`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive, expires_at: expiresAt }),
  });
}

export async function updateLeadTravellersByAdmin(
  leadId: string,
  travellers: LeadTraveller[]
): Promise<{ success: boolean; message: string; travellers: LeadTraveller[] }> {
  return request<{ success: boolean; message: string; travellers: LeadTraveller[] }>(`/leads/${leadId}/client-details/travellers`, {
    method: 'PUT',
    body: JSON.stringify({ travellers }),
  });
}

export interface PublicClientDetailsResponse {
  success: boolean;
  booking: {
    tripId: string;
    destination: string;
    travelDate: string;
    durationDays: number;
  };
  primaryPrefill: {
    name: string;
    mobile: string;
    email: string;
  };
  isSubmitted: boolean;
  submittedAt: string | null;
  travellers: LeadTraveller[];
}

export async function fetchPublicClientDetails(token: string): Promise<PublicClientDetailsResponse> {
  const res = await fetch(`/api/public/client-details/${token}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to load details: ${res.status}`);
  }
  return res.json();
}

export async function submitPublicClientDetails(
  token: string,
  travellers: LeadTraveller[],
  botField = ''
): Promise<{ success: boolean; message: string; travellersCount: number; submittedAt: string }> {
  const res = await fetch(`/api/public/client-details/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ travellers, bot_field: botField }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Submission failed: ${res.status}`);
  }

  return res.json();
}


