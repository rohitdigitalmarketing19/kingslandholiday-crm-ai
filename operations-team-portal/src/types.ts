export type TabType = 
  | 'customer'
  | 'pending-vouchers'
  | 'uploaded-vouchers'
  | 'upcoming-trips'
  | 'day-wise-trip'
  | 'cab-logistics'
  | 'completed-trips'
  | 'invoices';

export type TripStatus = 'Upcoming' | 'In-Transit' | 'Completed' | 'Cancelled';

export type VoucherStatus = 'Pending' | 'Uploaded' | 'Sent to Customer';

export type PaymentStatus = 'Paid' | 'Pending' | 'Overdue';

export interface PaymentInstallment {
  id: string;
  installmentNumber: number;
  title: string;
  amount: number;
  dueDate: string;
  status: PaymentStatus;
  paidAt?: string;
  paymentMode?: string;
  transactionRef?: string;
  notes?: string;
}

export interface Customer {
  id: string;
  bookingId: string;
  name: string;
  email: string;
  phone: string;
  destination: string;
  startDate: string;
  endDate: string;
  paxAdults: number;
  paxChildren: number;
  totalAmount: number;
  currency: string;
  assignedOpsManager: string;
  status: TripStatus;
  installments?: PaymentInstallment[];
  notes?: string;
  specialRequests?: string;
  emergencyContact?: string;

  // Cab & Driver Details
  driverName?: string;
  driverPhone?: string;
  cabModel?: string;
  cabNumber?: string;
  cabPickupLocation?: string;

  // Confirmation Boxes for Operations & Payment Management
  hotelTotalCost?: number;
  hotelPaymentStatus?: 'Pending' | 'Paid to Hotel' | 'Partially Paid';
  hotelPaymentAmount?: number;
  hotelPaymentDate?: string;
  hotelPaymentMode?: string;
  hotelPaymentRef?: string;
  hotelPaymentRemarks?: string;

  cabTotalCost?: number;
  cabPaymentStatus?: 'Pending' | 'Paid to Driver' | 'Partially Paid';
  cabPaymentAmount?: number;
  cabPaymentDate?: string;
  cabPaymentMode?: string;
  cabPaymentRef?: string;
  cabPaymentRemarks?: string;

  // Operational Remarks
  opsRemarks?: string;
  accountsRemarks?: string;
  reviewRequestedAt?: string;
  reviewChannel?: string;

  hotelPayments?: HotelPaymentRecord[];
  cabPaymentLogs?: PaymentPartRecord[];

  createdAt: string;
}

export interface PaymentPartRecord {
  id: string;
  amount: number;
  paidAt: string;
  paymentMode?: string;
  paymentRef?: string;
  remarks?: string;
}

export interface HotelPaymentRecord {
  hotelId: string;
  hotelName: string;
  city: string;
  totalCost: number;
  paidAmount: number;
  status: 'Pending' | 'Paid to Hotel' | 'Partially Paid';
  paidDate?: string;
  paymentMode?: string;
  paymentRef?: string;
  remarks?: string;
}

export interface HotelVoucher {
  id: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  hotelName: string;
  city: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  roomType: string;
  mealPlan: string;
  supplierName: string;
  confirmationNumber?: string;
  status: VoucherStatus;
  dueDate: string;
  fileUrl?: string;
  fileName?: string;
  uploadedAt?: string;
  uploadedBy?: string;
  urgency: 'Low' | 'Medium' | 'High' | 'Urgent';

  totalCost?: number;
  paidAmount?: number;
  paidAt?: string;
  paymentMode?: string;
  paymentRef?: string;
  paymentRemarks?: string;
  paymentStatus?: 'Pending' | 'Paid to Hotel' | 'Partially Paid';
  paymentLogs?: PaymentPartRecord[];
}

export interface DailyActivity {
  id: string;
  timeSlot: string; // e.g., "09:00 AM - 12:30 PM"
  title: string;
  description: string;
  location: string;
  driverName?: string;
  driverPhone?: string;
  cabModel?: string;
  cabNumber?: string;
  guideName?: string;
  guidePhone?: string;
  voucherRef?: string;
  status: 'Pending' | 'Ongoing' | 'Completed';
  notes?: string;
}

export interface DayWiseSchedule {
  dayNumber: number;
  date: string;
  title: string;
  dayRemark?: string;
  activities: DailyActivity[];
}

export interface TripItinerary {
  id: string;
  bookingId: string;
  customerId: string;
  customerName: string;
  destination: string;
  startDate: string;
  endDate: string;
  days: DayWiseSchedule[];
  readinessChecklist: {
    airTickets: boolean;
    hotelVouchers: boolean;
    cabAssigned: boolean;
    briefingCompleted: boolean;
  };
  feedbackScore?: number; // 1-5 stars for completed trips
  feedbackComment?: string;
  reviewCollected?: boolean;
}
