export enum LeadIntent {
  HIGH = 'High Intent',
  INFO = 'Information Seeking',
  URGENT = 'Urgent'
}

export interface TravelerInfo {
  adults: number;
  children: number;
  childAges: number[];
}

export interface LeadNote {
  id: string;
  text: string;
  type: 'Note' | 'StatusChange' | 'Action';
  timestamp: string;
}

export interface Lead {
  id: string;
  tripId: string; 
  name: string;
  phone?: string;
  email: string;
  rawInquiry: string;
  summary: string;
  score: number;
  intent: LeadIntent;
  destination: string;
  budgetTier: 'Luxury' | 'Mid' | 'Budget';
  assignedTo: string; 
  source: string; // e.g. 'Google Ads' | 'Meta Ads' | 'Website' | 'Reference' | 'Other' | 'Repeated Client'
  status: 'New' | 'Qualified' | 'Itinerary Sent' | 'Payment Pending' | 'Closed Won' | 'Closed Lost' | 'Postponed' | 'Hot' | 'Updated' | 'Follow-up';
  postponedDate?: string;
  postponedReason?: string;
  followUpDate?: string;
  followUpTime?: string;
  followUpType?: 'Call' | 'WhatsApp' | 'Email' | 'Meeting';
  followUpNote?: string;
  followUpCompleted?: boolean;
  createdAt: string;
  lastFollowUp: string;
  preferences?: string[];
  travelDate?: string;
  durationDays?: number;
  travelers?: TravelerInfo;
  otherInfo?: string;
  notes?: LeadNote[];
  includeStay?: string;
  includeFlight?: string;
  includeCab?: string;
  hotelCategory?: string;
  englishDriver?: boolean;
  quotes?: QuoteData[];
  accountsRemarks?: string;
  reviewRequestedAt?: string;
  reviewChannel?: string;
}

export interface Agent {
  id: string;
  name: string;
  specialty: string[];
  activeLeads: number;
  avatar: string;
}

export interface HotelEntry {
  nights: number;
  selectedNightIndices?: number[];
  hotelName: string;
  city: string;
  category: string;
  roomType: string;
  comments: string;
}

export interface InclusionEntry {
  included: boolean;
  comments: string;
}

export interface QuoteData {
  id: string; 
  packageTitle: string;
  finalSellingPrice: number;
  visaCost: number;
  flightCost: number;
  landPackageCost: number;
  marketingFees: number;
  discountPercentage: number;
  nights: number;
  hotelsNotIncluded: boolean;
  flightsNotIncluded: boolean;
  cabsNotIncluded: boolean;
  flightDetails: string;
  cabDetails: string;
  hotels: HotelEntry[];
  inclusions: {
    accommodation: {
      single: InclusionEntry;
      double: InclusionEntry;
      triple: InclusionEntry;
    };
    mealPlan: {
      breakfast: InclusionEntry;
      lunch: InclusionEntry;
      dinner: InclusionEntry;
    };
    transfer: {
      arrival: InclusionEntry;
      departure: InclusionEntry;
    };
    sightseeing: InclusionEntry;
    taxes: InclusionEntry;
    tollParking: InclusionEntry;
    tripSupplements: InclusionEntry;
  };
  otherInclusions: string;
  otherExclusions: string;
  itinerary: {
    day: number;
    title: string;
    description: string;
  }[];
  termsAndConditions: string;
  useDefaultTC: boolean;
  otherInformation: string;
  workingAgentId: string;
  createdAt: string;
}

export interface Itinerary {
  id: string;
  leadId: string;
  title: string;
  days: {
    day: number;
    title: string;
    description: string;
    activities: string[];
  }[];
  totalPrice: number;
  bestValueWindow: string;
}

export interface PaymentLink {
  id: string;
  payKey: string;
  leadId: string;
  packageName: string;
  amount: number;
  gst: number;
  fee: number;
  discount: number;
  netAmount: number;
  customerName: string;
  customerPhone: string;
  duration: string;
  hotels: string;
  travelers: string;
  status: 'Pending' | 'Paid' | 'Failed';
  createdAt: string;
}

export interface PaymentSubmission {
  id: string;
  payKey: string;
  leadId: string;
  customerName: string;
  mobile: string;
  packageName: string;
  amountPaid: number;
  utrNumber: string;
  paymentMode: 'Razorpay' | 'UPI' | 'Bank Transfer' | 'Cash';
  receiptUrl?: string;
  verificationStatus: 'Pending Review' | 'Approved' | 'Rejected';
  createdAt: string;
}

export type UserRole = 'Admin' | 'Sales' | 'Operations' | 'Accounts' | 'Custom';

export type UserPermissionSection = 
  | 'Dashboard' 
  | 'Leads' 
  | 'New Inquiry' 
  | 'Follow-ups' 
  | 'Saved Itinerary' 
  | 'HotelVouchers' 
  | 'Operations' 
  | 'Payments' 
  | 'Accounts' 
  | 'Invoices' 
  | 'Analytics' 
  | 'Sales Team' 
  | 'User Management';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  role: UserRole;
  department?: string;
  status: 'Active' | 'Inactive';
  accessLevel: 'Editor' | 'ViewOnly';
  permissions: UserPermissionSection[];
  avatar?: string;
  createdAt: string;
}