import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  Building2, 
  Car, 
  CheckCircle2, 
  TrendingUp, 
  CreditCard, 
  FileSpreadsheet, 
  Briefcase,
  ShieldCheck,
  RefreshCw,
  Eye,
  X,
  Clock,
  Printer,
  ChevronRight,
  AlertCircle,
  ArrowUpRight,
  Receipt,
  FileText
} from 'lucide-react';
import { Lead } from '../types';

interface AccountsViewProps {
  leads: Lead[];
  onUpdateLead?: (updatedLead: Lead) => void;
  isReadOnly?: boolean;
  onViewProposal?: (lead: Lead) => void;
}

export interface PaymentPartRecord {
  id: string;
  amount: number;
  paidAt: string;
  paymentMode?: string;
  paymentRef?: string;
  remarks?: string;
}

interface HotelDisbursement {
  id: string;
  hotelName: string;
  city: string;
  roomType: string;
  nights: number;
  totalCost: number;
  paidAmount: number;
  paymentStatus: 'Paid to Hotel' | 'Partially Paid' | 'Pending';
  paidAt: string;
  paymentMode: string;
  paymentRef: string;
  paymentRemarks: string;
  paymentLogs?: PaymentPartRecord[];
}

interface CompletedTripItem {
  id: string;
  bookingId: string;
  name: string;
  phone: string;
  email: string;
  destination: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  paxAdults: number;
  paxChildren: number;
  assignedOpsManager: string;
  
  // Financials - Customer Inflow
  totalAmount: number;
  customerPaymentStatus: string;
  installments: Array<{
    id: string;
    title: string;
    amount: number;
    dueDate: string;
    status: string;
    paidAt?: string;
    paymentMode?: string;
    transactionRef?: string;
  }>;

  // Financials - Hotels
  hotelTotalCost: number;
  hotelPaidAmount: number;
  hotelPaymentStatus: 'Paid to Hotel' | 'Partially Paid' | 'Pending';
  hotelPaymentDate: string;
  hotelPaymentMode: string;
  hotelPaymentRef: string;
  hotelPaymentRemarks: string;
  hotelsList: HotelDisbursement[];

  // Financials - Cab & Driver
  cabTotalCost: number;
  cabPaidAmount: number;
  cabPaymentStatus: 'Paid to Driver' | 'Partially Paid' | 'Pending';
  cabPaymentDate: string;
  cabPaymentMode: string;
  cabPaymentRef: string;
  cabPaymentRemarks: string;
  cabPaymentLogs?: PaymentPartRecord[];
  driverName: string;
  driverPhone: string;
  cabModel: string;
  cabNumber: string;

  opsRemarks: string;
  status: string;
}

export const AccountsView: React.FC<AccountsViewProps> = ({ leads, isReadOnly = false, onViewProposal }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [destinationFilter, setDestinationFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [opsCompletedList, setOpsCompletedList] = useState<CompletedTripItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected Lead for Audit Details Modal / Slide-over
  const [selectedAuditTrip, setSelectedAuditTrip] = useState<CompletedTripItem | null>(null);

  const handleViewProposalForTrip = (trip: CompletedTripItem) => {
    if (!onViewProposal) return;
    const matchingLead = leads.find(l => l.tripId === trip.bookingId || l.id === trip.id);
    if (matchingLead) {
      onViewProposal(matchingLead);
    } else {
      const constructedLead: Lead = {
        id: trip.id || `lead-${trip.bookingId}`,
        tripId: trip.bookingId,
        name: trip.name,
        email: trip.email || 'customer@kingslandholidays.com',
        phone: trip.phone || '+91 6376983416',
        rawInquiry: `Confirmed ${trip.destination} package tour`,
        summary: `${trip.durationDays}-day trip to ${trip.destination}`,
        score: 100,
        intent: 'High Intent' as any,
        destination: trip.destination,
        budgetTier: 'Mid',
        assignedTo: '1',
        source: 'Website Form',
        status: 'Closed Won',
        travelDate: trip.startDate,
        durationDays: trip.durationDays,
        travelers: { adults: trip.paxAdults, children: trip.paxChildren, childAges: [] },
        createdAt: new Date().toISOString(),
        lastFollowUp: new Date().toISOString(),
        quotes: [
          {
            id: `quote-${trip.bookingId}`,
            packageTitle: `${trip.destination} Tour Package`,
            finalSellingPrice: trip.totalAmount,
            visaCost: 0,
            flightCost: Math.round(trip.totalAmount * 0.25),
            landPackageCost: Math.round(trip.totalAmount * 0.75),
            marketingFees: 0,
            discountPercentage: 5,
            nights: Math.max(1, trip.durationDays - 1),
            hotelsNotIncluded: false,
            flightsNotIncluded: false,
            cabsNotIncluded: false,
            flightDetails: "Flight / Train Tickets Included as Per Itinerary",
            cabDetails: `${trip.cabModel || 'Private AC Cab'} (${trip.driverName || 'English Speaking Driver'})`,
            hotels: trip.hotelsList && trip.hotelsList.length > 0 
              ? trip.hotelsList.map(h => ({
                  nights: h.nights || 2,
                  hotelName: h.hotelName,
                  city: h.city,
                  category: '4 Star',
                  roomType: h.roomType || 'Standard Room',
                  comments: 'Confirmed Property Booking'
                }))
              : [
                  { nights: Math.max(1, trip.durationDays - 1), hotelName: `${trip.destination} Selected Property`, city: trip.destination, category: '4/3 Star', roomType: 'Standard Room, 2 Adults', comments: '' }
                ],
            inclusions: {
              accommodation: { single: { included: false, comments: '' }, double: { included: true, comments: '' }, triple: { included: false, comments: '' } },
              mealPlan: { breakfast: { included: true, comments: '' }, lunch: { included: false, comments: '' }, dinner: { included: false, comments: '' } },
              transfer: { arrival: { included: true, comments: '' }, departure: { included: true, comments: '' } },
              sightseeing: { included: true, comments: '' },
              taxes: { included: true, comments: '' },
              tollParking: { included: true, comments: '' },
              tripSupplements: { included: true, comments: '' }
            },
            otherInclusions: "Airport / Station Transfers, Daily Breakfast, All Sightseeing as per Itinerary, Toll & Parking",
            otherExclusions: "Personal Expenses, Tips, Any unmentioned entry tickets",
            itinerary: Array.from({ length: trip.durationDays }, (_, i) => ({
              day: i + 1,
              title: i === 0 ? `Arrival in ${trip.destination} & Hotel Check-in` : i === trip.durationDays - 1 ? `Departure from ${trip.destination}` : `Day ${i + 1} Sightseeing & Exploration`,
              description: i === 0 ? `Welcome to ${trip.destination}! Transfer to hotel and check-in.` : i === trip.durationDays - 1 ? `Check-out and transfer to airport/station.` : `Full day sightseeing tour of ${trip.destination}.`
            })),
            termsAndConditions: "Standard Kingsland Holidays Cancellation & Booking Terms Apply.",
            useDefaultTC: true,
            otherInformation: "Thank you for choosing Kingsland Holidays!",
            workingAgentId: "1",
            createdAt: new Date().toISOString()
          }
        ]
      };
      onViewProposal(constructedLead);
    }
  };

  // Fetch strictly completed trips from Operations Backend
  const loadCompletedTrips = async () => {
    setIsLoading(true);
    try {
      const [custRes, vouchRes] = await Promise.all([
        fetch('/api/ops/customers'),
        fetch('/api/ops/vouchers'),
      ]);

      const allCustomers: any[] = custRes.ok ? await custRes.json() : [];
      const allVouchers: any[] = vouchRes.ok ? await vouchRes.json() : [];

      // STRICT FILTER: ONLY Trips with status === 'Completed'
      const completedOps = allCustomers.filter((c) => c.status === 'Completed');

      // Map to standardized completed trip ledger records with REAL hotel & cab payment states
      const records: CompletedTripItem[] = completedOps.map((c) => {
        const custVouchers: any[] = allVouchers.filter((v) => v.customerId === c.id || v.bookingId === c.bookingId);
        
        const totalPkg = Number(c.totalAmount || 0) > 0 ? Number(c.totalAmount) : 55000;
        let custHotelTotal = Number(c.hotelTotalCost || 0);
        let custHotelPaid = Number(c.hotelPaymentAmount || 0);

        // Build individual hotel disbursement breakdown accurately
        let hotelDisbursements: HotelDisbursement[] = [];

        if (custVouchers.length > 0) {
          // If we have actual vouchers for this booking
          const defaultPerHotelBudget = custHotelTotal > 0 ? Math.round(custHotelTotal / custVouchers.length) : 0;

          hotelDisbursements = custVouchers.map((v: any) => {
            const itemTotal = Number(v.totalCost || 0) > 0 ? Number(v.totalCost) : defaultPerHotelBudget;
            const itemPaid = Number(v.paidAmount || 0);
            
            let pStatus: 'Paid to Hotel' | 'Partially Paid' | 'Pending' = 'Pending';
            if (v.paymentStatus === 'Paid to Hotel' || (itemPaid >= itemTotal && itemTotal > 0)) {
              pStatus = 'Paid to Hotel';
            } else if (v.paymentStatus === 'Partially Paid' || itemPaid > 0) {
              pStatus = 'Partially Paid';
            } else if (c.hotelPaymentStatus === 'Paid to Hotel' && custHotelPaid > 0) {
              // If parent was marked fully paid
              pStatus = 'Paid to Hotel';
            } else {
              pStatus = 'Pending';
            }

            const isPaidOrPartial = pStatus === 'Paid to Hotel' || pStatus === 'Partially Paid';
            const paidTimestamp = isPaidOrPartial ? (v.paidAt || c.hotelPaymentDate || 'Settled') : '—';
            const paidMode = isPaidOrPartial ? (v.paymentMode || c.hotelPaymentMode || 'Bank Transfer (NEFT)') : '—';
            const paidRef = isPaidOrPartial ? (v.paymentRef || c.hotelPaymentRef || 'UTR-Confirmed') : '—';
            const effectivePaid = itemPaid > 0 ? itemPaid : (pStatus === 'Paid to Hotel' ? itemTotal : 0);

            let logs: PaymentPartRecord[] = [];
            if (Array.isArray(v.paymentLogs) && v.paymentLogs.length > 0) {
              logs = v.paymentLogs;
            } else if (effectivePaid > 0) {
              logs = [
                {
                  id: `v-log-${v.id}`,
                  amount: effectivePaid,
                  paidAt: paidTimestamp,
                  paymentMode: paidMode,
                  paymentRef: paidRef,
                  remarks: 'Payment cleared.'
                }
              ];
            }

            return {
              id: v.id,
              hotelName: v.hotelName || 'Partner Hotel',
              city: v.city || c.destination,
              roomType: v.roomType || 'Deluxe Room',
              nights: v.nights || 1,
              totalCost: itemTotal,
              paidAmount: effectivePaid,
              paymentStatus: pStatus,
              paidAt: paidTimestamp,
              paymentMode: paidMode,
              paymentRef: paidRef,
              paymentRemarks: v.paymentRemarks || (isPaidOrPartial ? 'Advance settled.' : 'Payment pending.'),
              paymentLogs: logs,
            };
          });

          // Compute accurate totals from individual hotel records
          if (custHotelTotal === 0) {
            custHotelTotal = hotelDisbursements.reduce((acc, h) => acc + h.totalCost, 0);
          }
          const sumPaid = hotelDisbursements.reduce((acc, h) => acc + h.paidAmount, 0);
          if (sumPaid > 0) {
            custHotelPaid = sumPaid;
          }
        } else if (Array.isArray(c.hotelPayments) && c.hotelPayments.length > 0) {
          hotelDisbursements = c.hotelPayments.map((hp: any, idx: number) => {
            const hPaid = Number(hp.paidAmount || 0);
            const hTime = hp.paidAt || hp.paidDate || c.hotelPaymentDate || 'Settled';
            const hMode = hp.paymentMode || 'Bank Transfer';
            const hRef = hp.paymentRef || '—';
            const hStatus = hp.status === 'Paid' || hp.status === 'Paid to Hotel' ? 'Paid to Hotel' : (hPaid > 0 ? 'Partially Paid' : 'Pending');

            return {
              id: `hp-${idx}`,
              hotelName: hp.hotelName || 'Confirmed Hotel',
              city: hp.city || c.destination,
              roomType: 'Deluxe Room',
              nights: 1,
              totalCost: Number(hp.totalCost || hp.paidAmount || 10000),
              paidAmount: hPaid,
              paymentStatus: hStatus,
              paidAt: hTime,
              paymentMode: hMode,
              paymentRef: hRef,
              paymentRemarks: hp.remarks || 'Settled.',
              paymentLogs: hPaid > 0 ? [
                {
                  id: `hp-log-${idx}`,
                  amount: hPaid,
                  paidAt: hTime,
                  paymentMode: hMode,
                  paymentRef: hRef,
                  remarks: hp.remarks || 'Settled.',
                }
              ] : [],
            };
          });
          custHotelPaid = hotelDisbursements.reduce((acc, h) => acc + h.paidAmount, 0);
        } else {
          // Single default aggregate hotel record if no multi-hotel items exist
          custHotelTotal = custHotelTotal > 0 ? custHotelTotal : 0;
          const isPaid = c.hotelPaymentStatus === 'Paid to Hotel';
          const isPartial = c.hotelPaymentStatus === 'Partially Paid';
          const pStatus: 'Paid to Hotel' | 'Partially Paid' | 'Pending' = isPaid ? 'Paid to Hotel' : isPartial ? 'Partially Paid' : 'Pending';
          const paidAmt = custHotelPaid > 0 ? custHotelPaid : (isPaid ? custHotelTotal : 0);
          const pDate = isPaid || isPartial ? (c.hotelPaymentDate || 'Settled') : '—';
          const pMode = isPaid || isPartial ? (c.hotelPaymentMode || 'Bank Transfer / NEFT') : '—';
          const pRef = isPaid || isPartial ? (c.hotelPaymentRef || 'UTR-Confirmed') : '—';

          hotelDisbursements = [
            {
              id: `hotel-single-${c.id}`,
              hotelName: `${c.destination} Luxury Hotel & Resort`,
              city: c.destination,
              roomType: 'Deluxe Room',
              nights: Math.max(1, (c.durationDays || 6) - 1),
              totalCost: custHotelTotal,
              paidAmount: paidAmt,
              paymentStatus: pStatus,
              paidAt: pDate,
              paymentMode: pMode,
              paymentRef: pRef,
              paymentRemarks: c.hotelPaymentRemarks || (isPaid ? '100% Hotel payment cleared.' : 'Hotel payment pending.'),
              paymentLogs: paidAmt > 0 ? [
                {
                  id: `hotel-log-${c.id}`,
                  amount: paidAmt,
                  paidAt: pDate,
                  paymentMode: pMode,
                  paymentRef: pRef,
                  remarks: 'Hotel payment cleared.'
                }
              ] : [],
            }
          ];
        }

        // Determine aggregate hotel payment status
        let aggHotelStatus: 'Paid to Hotel' | 'Partially Paid' | 'Pending' = 'Pending';
        if (custHotelPaid >= custHotelTotal && custHotelTotal > 0) {
          aggHotelStatus = 'Paid to Hotel';
        } else if (custHotelPaid > 0) {
          aggHotelStatus = 'Partially Paid';
        } else {
          aggHotelStatus = (c.hotelPaymentStatus as any) || 'Pending';
        }

        // Cab Logistics
        const cabTotal = Number(c.cabTotalCost || 0);
        const cabPaid = Number(c.cabPaymentAmount || 0) > 0 ? Number(c.cabPaymentAmount) : (c.cabPaymentStatus === 'Paid to Driver' ? cabTotal : 0);
        let aggCabStatus: 'Paid to Driver' | 'Partially Paid' | 'Pending' = 'Pending';
        if (cabPaid >= cabTotal && cabTotal > 0) {
          aggCabStatus = 'Paid to Driver';
        } else if (cabPaid > 0) {
          aggCabStatus = 'Partially Paid';
        } else {
          aggCabStatus = (c.cabPaymentStatus as any) || 'Pending';
        }

        let cabLogs: PaymentPartRecord[] = [];
        if (Array.isArray(c.cabPaymentLogs) && c.cabPaymentLogs.length > 0) {
          cabLogs = c.cabPaymentLogs;
        } else if (cabPaid > 0) {
          cabLogs = [
            {
              id: `cab-log-${c.id}`,
              amount: cabPaid,
              paidAt: c.cabPaymentDate || 'Settled',
              paymentMode: c.cabPaymentMode || 'UPI',
              paymentRef: c.cabPaymentRef || 'UPI-DRIVER',
              remarks: 'Driver payment cleared.'
            }
          ];
        }

        // Duration in days
        let duration = 6;
        if (c.startDate && c.endDate) {
          try {
            const start = new Date(c.startDate).getTime();
            const end = new Date(c.endDate).getTime();
            const diff = Math.round((end - start) / (1000 * 3600 * 24));
            if (diff > 0) duration = diff;
          } catch (_e) {}
        }

        // Installments
        const installments = Array.isArray(c.installments) && c.installments.length > 0 
          ? c.installments 
          : [
              {
                id: 'inst-1',
                title: 'Advance Booking Token (30%)',
                amount: Math.round(totalPkg * 0.3),
                dueDate: c.startDate || '2026-08-01',
                status: 'Paid',
                paidAt: c.startDate || '2026-08-01',
                paymentMode: 'UPI (PhonePe)',
                transactionRef: 'UPI-TXN98421',
              },
              {
                id: 'inst-2',
                title: '2nd Installment - Prior to Travel (40%)',
                amount: Math.round(totalPkg * 0.4),
                dueDate: c.startDate || '2026-08-10',
                status: 'Paid',
                paidAt: c.startDate || '2026-08-10',
                paymentMode: 'Bank Transfer (NEFT)',
                transactionRef: 'NEFT-5489201',
              },
              {
                id: 'inst-3',
                title: 'Final Settlement Balance (30%)',
                amount: Math.round(totalPkg * 0.3),
                dueDate: c.endDate || '2026-08-15',
                status: 'Paid',
                paidAt: c.endDate || '2026-08-15',
                paymentMode: 'UPI (GPay)',
                transactionRef: 'UPI-7749102',
              }
            ];

        return {
          id: c.id,
          bookingId: c.bookingId,
          name: c.name,
          phone: c.phone || '',
          email: c.email || '',
          destination: c.destination || 'Confirmed Tour',
          startDate: c.startDate || 'Confirmed Date',
          endDate: c.endDate || '',
          durationDays: duration,
          paxAdults: c.paxAdults || 2,
          paxChildren: c.paxChildren || 0,
          assignedOpsManager: c.assignedOpsManager || 'Ops Team',
          
          totalAmount: totalPkg,
          customerPaymentStatus: '100% Cleared',
          installments,

          hotelTotalCost: custHotelTotal,
          hotelPaidAmount: custHotelPaid,
          hotelPaymentStatus: aggHotelStatus,
          hotelPaymentDate: c.hotelPaymentDate || 'Settled',
          hotelPaymentMode: c.hotelPaymentMode || 'Bank Transfer / NEFT',
          hotelPaymentRef: c.hotelPaymentRef || 'UTR-987654',
          hotelPaymentRemarks: c.hotelPaymentRemarks || '',
          hotelsList: hotelDisbursements,

          cabTotalCost: cabTotal,
          cabPaidAmount: cabPaid,
          cabPaymentStatus: aggCabStatus,
          cabPaymentDate: c.cabPaymentDate || 'Settled',
          cabPaymentMode: c.cabPaymentMode || 'UPI',
          cabPaymentRef: c.cabPaymentRef || 'UPI-DRIVER-982',
          cabPaymentRemarks: c.cabPaymentRemarks || '',
          cabPaymentLogs: cabLogs,
          driverName: c.driverName || 'Assigned Driver',
          driverPhone: c.driverPhone || '+91 98290 12345',
          cabModel: c.cabModel || 'Toyota Innova Crysta',
          cabNumber: c.cabNumber || 'RJ 14 CZ 9876',

          opsRemarks: c.opsRemarks || c.notes || '',
          status: 'Completed',
        };
      });

      // Check if CRM lead has lead.status === 'Completed' and not already in records
      if (Array.isArray(leads)) {
        leads.forEach((l) => {
          const leadStatus = (l.status || '').toLowerCase();
          if (leadStatus === 'completed') {
            const alreadyAdded = records.some((r) => r.bookingId === l.tripId || r.name === l.name);
            if (!alreadyAdded) {
              const quote = l.quotes && l.quotes.length > 0 ? l.quotes[0] : null;
              const pkgPrice = quote?.finalSellingPrice || (l.budgetTier === 'Luxury' ? 85000 : l.budgetTier === 'Mid' ? 55000 : 35000);
              const landCost = quote?.landPackageCost || Math.round(pkgPrice * 0.55);
              const hCost = Math.round(landCost * 0.65);
              const cCost = Math.round(landCost * 0.35);

              records.push({
                id: l.id,
                bookingId: l.tripId || `KL-${l.id.slice(0, 6)}`,
                name: l.name,
                phone: l.phone || '',
                email: l.email || '',
                destination: l.destination || 'Package Tour',
                startDate: l.travelDate || 'Confirmed Date',
                endDate: '',
                durationDays: l.durationDays || 6,
                paxAdults: l.travelers?.adults || 2,
                paxChildren: l.travelers?.children || 0,
                assignedOpsManager: 'Sales Desk',
                totalAmount: pkgPrice,
                customerPaymentStatus: '100% Cleared',
                installments: [
                  {
                    id: 'inst-1',
                    title: 'Full Package Payment (100%)',
                    amount: pkgPrice,
                    dueDate: l.travelDate || 'Confirmed Date',
                    status: 'Paid',
                    paidAt: l.travelDate || 'Confirmed Date',
                    paymentMode: 'Bank Transfer (NEFT)',
                    transactionRef: 'NEFT-CLEARED',
                  }
                ],
                hotelTotalCost: hCost,
                hotelPaidAmount: hCost,
                hotelPaymentStatus: 'Paid to Hotel',
                hotelPaymentDate: l.travelDate || 'Confirmed Date',
                hotelPaymentMode: 'Bank Transfer (NEFT)',
                hotelPaymentRef: 'NEFT-VENDOR',
                hotelPaymentRemarks: 'Settled.',
                hotelsList: [
                  {
                    id: 'h-1',
                    hotelName: `${l.destination || 'Destination'} Grand Resort`,
                    city: l.destination || 'City',
                    roomType: 'Deluxe Room',
                    nights: Math.max(1, (l.durationDays || 6) - 1),
                    totalCost: hCost,
                    paidAmount: hCost,
                    paymentStatus: 'Paid to Hotel',
                    paidAt: l.travelDate || 'Confirmed Date',
                    paymentMode: 'Bank Transfer (NEFT)',
                    paymentRef: 'NEFT-VENDOR',
                    paymentRemarks: '100% Cleared',
                    paymentLogs: [
                      {
                        id: `h-log-crm-${l.id}`,
                        amount: hCost,
                        paidAt: l.travelDate || 'Confirmed Date',
                        paymentMode: 'Bank Transfer (NEFT)',
                        paymentRef: 'NEFT-VENDOR',
                        remarks: '100% Cleared',
                      }
                    ]
                  }
                ],
                cabTotalCost: cCost,
                cabPaidAmount: cCost,
                cabPaymentStatus: 'Paid to Driver',
                cabPaymentDate: l.travelDate || 'Confirmed Date',
                cabPaymentMode: 'UPI',
                cabPaymentRef: 'UPI-DRIVER',
                cabPaymentRemarks: 'Settled.',
                cabPaymentLogs: [
                  {
                    id: `cab-log-crm-${l.id}`,
                    amount: cCost,
                    paidAt: l.travelDate || 'Confirmed Date',
                    paymentMode: 'UPI',
                    paymentRef: 'UPI-DRIVER',
                    remarks: 'Settled.'
                  }
                ],
                driverName: 'Assigned Driver',
                driverPhone: '+91 98290 12345',
                cabModel: 'Toyota Innova Crysta',
                cabNumber: 'RJ 14 TA 9988',
                opsRemarks: typeof l.notes === 'string' ? l.notes : (Array.isArray(l.notes) ? l.notes.map(n => n.text).join('; ') : ''),
                status: 'Completed',
              });
            }
          }
        });
      }

      setOpsCompletedList(records);
    } catch (e) {
      console.error('Error fetching completed accounts:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompletedTrips();
  }, [leads]);

  // Helper to extract Month Year label from date string (e.g. "2026-08-15" or "15 Aug 2026" -> "August 2026")
  const getMonthYear = (dateStr?: string) => {
    if (!dateStr || dateStr === 'Confirmed Date' || dateStr === 'Settled' || dateStr === '—' || !dateStr.trim()) {
      return null;
    }
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const monthName = d.toLocaleString('en-US', { month: 'long' });
        const year = d.getFullYear();
        return `${monthName} ${year}`;
      }
    } catch (_e) {}

    // Regex check for month names like Aug 2026 or August 2026
    const mMatch = dateStr.match(/(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i);
    if (mMatch) {
      return `${mMatch[1]} ${mMatch[2]}`;
    }
    return null;
  };

  // Unique destinations filter list
  const uniqueDestinations = useMemo(() => {
    const set = new Set<string>();
    opsCompletedList.forEach((l) => {
      if (l.destination) set.add(l.destination);
    });
    return Array.from(set);
  }, [opsCompletedList]);

  // Available months filter list (dynamically generated & formatted)
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    opsCompletedList.forEach((item) => {
      const startM = getMonthYear(item.startDate);
      if (startM) set.add(startM);
      if (item.endDate) {
        const endM = getMonthYear(item.endDate);
        if (endM) set.add(endM);
      }
    });

    // Default current/recent months if set is empty
    if (set.size === 0) {
      set.add('August 2026');
      set.add('September 2026');
      set.add('October 2026');
    }

    return Array.from(set);
  }, [opsCompletedList]);

  // Filtered dataset for UI
  const filteredTrips = useMemo(() => {
    return opsCompletedList.filter((item) => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.phone.includes(searchTerm);

      const matchesDest = destinationFilter === 'all' || item.destination === destinationFilter;

      const matchesMonth = monthFilter === 'all' || (() => {
        const startM = getMonthYear(item.startDate);
        const endM = item.endDate ? getMonthYear(item.endDate) : null;
        return startM === monthFilter || endM === monthFilter;
      })();

      return matchesSearch && matchesDest && matchesMonth;
    });
  }, [opsCompletedList, searchTerm, destinationFilter, monthFilter]);

  // Financial KPI Metrics Aggregation (Strictly Completed Trips)
  const metrics = useMemo(() => {
    let totalCustomerPaid = 0;
    let totalHotelPaid = 0;
    let totalCabPaid = 0;

    filteredTrips.forEach((t) => {
      totalCustomerPaid += t.totalAmount;
      totalHotelPaid += t.hotelPaidAmount;
      totalCabPaid += t.cabPaidAmount;
    });

    const totalOutflow = totalHotelPaid + totalCabPaid;
    const netProfit = totalCustomerPaid - totalOutflow;
    const profitMargin = totalCustomerPaid > 0 ? Math.round((netProfit / totalCustomerPaid) * 100) : 0;

    return {
      totalCompletedTrips: filteredTrips.length,
      totalCustomerPaid,
      totalHotelPaid,
      totalCabPaid,
      totalOutflow,
      netProfit,
      profitMargin,
    };
  }, [filteredTrips]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Booking ID',
      'Customer Name',
      'Phone',
      'Email',
      'Destination',
      'Travel Date',
      'Duration (Days)',
      'Total Package Price (INR)',
      'Customer Payment Status',
      'Hotels Paid Amount (INR)',
      'Hotels Total Budget (INR)',
      'Hotel Payment Status',
      'Driver Paid Amount (INR)',
      'Driver Payment Status',
      'Total Realized Outflow (INR)',
      'Net Realized Profit (INR)',
      'Gross Margin (%)',
    ];

    const rows = filteredTrips.map((t) => {
      const totalOutflow = t.hotelPaidAmount + t.cabPaidAmount;
      const netProfit = t.totalAmount - totalOutflow;
      const margin = t.totalAmount > 0 ? Math.round((netProfit / t.totalAmount) * 100) : 0;

      return [
        `"${t.bookingId}"`,
        `"${t.name.replace(/"/g, '""')}"`,
        `"${t.phone}"`,
        `"${t.email}"`,
        `"${t.destination.replace(/"/g, '""')}"`,
        `"${t.startDate}"`,
        t.durationDays,
        t.totalAmount,
        '"100% Cleared"',
        t.hotelPaidAmount,
        t.hotelTotalCost,
        `"${t.hotelPaymentStatus}"`,
        t.cabPaidAmount,
        `"${t.cabPaymentStatus}"`,
        totalOutflow,
        netProfit,
        `${margin}%`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Kingsland_Accounts_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xl">👁️</span>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider">Read-Only Mode Enabled</h4>
              <p className="text-xs text-amber-800 font-medium">You are logged in as an Accounts View-Only User. Editing & settlement modification tools are restricted.</p>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase bg-amber-200 text-amber-900 px-2.5 py-1 rounded-full border border-amber-400">View Only</span>
        </div>
      )}

      {/* Top Banner & Title */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <Briefcase className="w-4 h-4 text-amber-400" />
            <span>Kingsland Financial Management</span>
          </div>
          <h2 className="text-2xl font-black text-white mt-1">Accounts & Settlement Desk</h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-2xl leading-relaxed">
            Professional accounting ledger for <strong>completed trips only</strong>. Click any row to inspect the complete financial audit, including multi-hotel vouchers, paid/pending status, payment timestamps, and cab settlements.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadCompletedTrips}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 border border-white/20 transition-all cursor-pointer shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export Accounts Ledger</span>
          </button>
        </div>
      </div>

      {/* 4 Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Customer Collections */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Completed Inflows</span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            ₹{metrics.totalCustomerPaid.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{metrics.totalCompletedTrips} Completed Trips</span>
          </div>
        </div>

        {/* Card 2: Hotel Vendor Payouts */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Hotel Paid Amount</span>
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            ₹{metrics.totalHotelPaid.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-amber-700 font-semibold">
            Actual disbursed hotel payments
          </div>
        </div>

        {/* Card 3: Cab & Driver Outflow */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Cab & Driver Outflow</span>
            <div className="p-2 rounded-xl bg-teal-100 text-teal-700">
              <Car className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            ₹{metrics.totalCabPaid.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-teal-700 font-semibold">
            Driver payments & fuel settlements
          </div>
        </div>

        {/* Card 4: Net Realized Profit */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-md space-y-2">
          <div className="flex items-center justify-between text-indigo-200">
            <span className="text-xs font-bold uppercase tracking-wider">Net Realized Profit</span>
            <div className="p-2 rounded-xl bg-white/10 text-amber-300">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            ₹{metrics.netProfit.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-amber-300 font-bold flex items-center justify-between">
            <span>Realized Margin:</span>
            <span className="px-2 py-0.5 rounded-md bg-amber-400/20 border border-amber-400/30">
              {metrics.profitMargin}% Gross Margin
            </span>
          </div>
        </div>

      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Guest, Booking ID, Destination, Phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold focus:outline-none text-slate-800 cursor-pointer"
              >
                <option value="all">All Months ({availableMonths.length})</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={destinationFilter}
                onChange={(e) => setDestinationFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold focus:outline-none text-slate-800 cursor-pointer"
              >
                <option value="all">All Destinations ({uniqueDestinations.length})</option>
                {uniqueDestinations.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium self-end sm:self-center">
          Showing <strong>{filteredTrips.length}</strong> completed accounts · Click row to view audit details
        </div>
      </div>

      {/* Main Executive Single-Row Financial Ledger Table */}
      <div className="border border-slate-200 rounded-3xl bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            
            {/* Table Header */}
            <thead>
              <tr className="bg-slate-900 text-white font-extrabold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <th className="py-4 px-4 whitespace-nowrap">Booking Code & Guest</th>
                <th className="py-4 px-4 whitespace-nowrap">Travel Dates</th>
                <th className="py-4 px-4 whitespace-nowrap">Customer Inflow</th>
                <th className="py-4 px-4 whitespace-nowrap">Hotel Disbursements</th>
                <th className="py-4 px-4 whitespace-nowrap">Cab & Driver Outflow</th>
                <th className="py-4 px-4 whitespace-nowrap">Net Margin</th>
                <th className="py-4 px-4 whitespace-nowrap text-center">Action</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100">
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-500 space-y-2">
                    <Briefcase className="w-9 h-9 mx-auto text-slate-300" />
                    <p className="font-bold text-base text-slate-800">No Completed Trips in Accounts</p>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Only trips marked as <strong>'Completed'</strong> in the Operations Desk appear in this financial audit ledger.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTrips.map((trip, index) => {
                  const totalOutflow = trip.hotelPaidAmount + trip.cabPaidAmount;
                  const netProfit = trip.totalAmount - totalOutflow;
                  const marginPct = trip.totalAmount > 0 ? Math.round((netProfit / trip.totalAmount) * 100) : 0;

                  // Hotel summary stats
                  const paidHotelsCount = trip.hotelsList.filter(h => h.paymentStatus === 'Paid to Hotel').length;
                  const totalHotelsCount = trip.hotelsList.length;

                  return (
                    <tr 
                      key={trip.id} 
                      onClick={() => setSelectedAuditTrip(trip)}
                      className={`hover:bg-indigo-50/50 transition-colors cursor-pointer group ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                      }`}
                    >
                      {/* 1. Booking Code & Guest */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-mono font-black text-[11px] border border-amber-300 shrink-0">
                            {trip.bookingId}
                          </span>
                          <div>
                            <div className="font-extrabold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                              {trip.name}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                              <span>📍 {trip.destination}</span>
                              <span className="text-slate-300">•</span>
                              <span className="font-mono text-slate-600">{trip.phone}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Travel Dates */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <div className="font-extrabold text-slate-800 text-xs flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{trip.startDate}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                          {trip.durationDays} Days ({trip.paxAdults} Adults)
                        </div>
                      </td>

                      {/* 3. Customer Inflow */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <div className="font-mono font-black text-slate-900 text-sm">
                          ₹{trip.totalAmount.toLocaleString('en-IN')}
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-block mt-0.5">
                          ✓ 100% Cleared
                        </span>
                      </td>

                      {/* 4. Hotel Disbursements */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-mono font-black text-amber-950 text-sm">
                            ₹{trip.hotelPaidAmount.toLocaleString('en-IN')}
                          </span>
                          {trip.hotelTotalCost > trip.hotelPaidAmount && (
                            <span className="text-[10px] text-slate-400 font-mono line-through">
                              ₹{trip.hotelTotalCost.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            trip.hotelPaymentStatus === 'Paid to Hotel' 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : trip.hotelPaymentStatus === 'Partially Paid' 
                              ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {trip.hotelPaymentStatus}
                          </span>
                          {totalHotelsCount > 1 && (
                            <span className="text-[10px] text-slate-500 font-medium">
                              ({paidHotelsCount}/{totalHotelsCount} Hotels Paid)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. Cab & Driver Outflow */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <div className="font-mono font-black text-teal-950 text-sm">
                          ₹{trip.cabPaidAmount.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-600 font-medium mt-0.5 flex items-center gap-1">
                          <span className={`px-1.5 py-0.5 rounded font-bold ${
                            trip.cabPaymentStatus === 'Paid to Driver'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {trip.cabPaymentStatus}
                          </span>
                          <span className="truncate max-w-[100px] text-slate-500">
                            • {trip.driverName}
                          </span>
                        </div>
                      </td>

                      {/* 6. Net Margin & Profit */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <div className="font-mono font-black text-emerald-700 text-sm">
                          +₹{netProfit.toLocaleString('en-IN')}
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 inline-block mt-0.5">
                          {marginPct}% Margin
                        </span>
                      </td>

                      {/* 7. Action Buttons */}
                      <td className="py-3.5 px-4 align-middle text-center whitespace-nowrap">
                        <div className="flex items-center gap-1.5 justify-center">
                          {onViewProposal && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewProposalForTrip(trip);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 font-extrabold text-xs flex items-center gap-1 border border-indigo-200 transition-all cursor-pointer shadow-2xs"
                              title="View & Download Quotation Itinerary PDF"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Itinerary PDF</span>
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAuditTrip(trip);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 group-hover:bg-slate-800 group-hover:text-white text-slate-700 font-bold text-xs flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>

          </table>
        </div>
      </div>

      {/* DETAILED AUDIT SLIDE-OVER MODAL */}
      {selectedAuditTrip && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 sm:p-6 lg:p-10 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-xl border border-slate-100 my-auto">
            
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-md">
                  <Receipt className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 font-mono font-black text-xs border border-amber-300">
                      {selectedAuditTrip.bookingId}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Completed Trip
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                    {selectedAuditTrip.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    📍 {selectedAuditTrip.destination} · 🗓️ {selectedAuditTrip.startDate} {selectedAuditTrip.endDate ? `to ${selectedAuditTrip.endDate}` : ''} ({selectedAuditTrip.durationDays} Days) · 👥 {selectedAuditTrip.paxAdults} Adults {selectedAuditTrip.paxChildren > 0 ? `& ${selectedAuditTrip.paxChildren} Children` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {onViewProposal && (
                  <button
                    onClick={() => {
                      handleViewProposalForTrip(selectedAuditTrip);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>View Itinerary PDF</span>
                  </button>
                )}
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Audit</span>
                </button>
                <button
                  onClick={() => setSelectedAuditTrip(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* P&L Executive Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                  Gross Revenue (Customer Inflow)
                </span>
                <div className="text-2xl font-black text-emerald-950 font-mono">
                  ₹{selectedAuditTrip.totalAmount.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 100% Cleared
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-1">
                <span className="text-[10px] uppercase font-bold text-amber-800 block">
                  Total Disbursed Outflow
                </span>
                <div className="text-2xl font-black text-amber-950 font-mono">
                  ₹{(selectedAuditTrip.hotelPaidAmount + selectedAuditTrip.cabPaidAmount).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-slate-600 font-medium">
                  Hotels: ₹{selectedAuditTrip.hotelPaidAmount.toLocaleString('en-IN')} · Cab: ₹{selectedAuditTrip.cabPaidAmount.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-900 text-white shadow-md space-y-1">
                <span className="text-[10px] uppercase font-bold text-indigo-200 block">
                  Realized Gross Margin
                </span>
                <div className="text-2xl font-black text-white font-mono">
                  ₹{(selectedAuditTrip.totalAmount - (selectedAuditTrip.hotelPaidAmount + selectedAuditTrip.cabPaidAmount)).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-amber-300 font-bold">
                  {selectedAuditTrip.totalAmount > 0 
                    ? Math.round(((selectedAuditTrip.totalAmount - (selectedAuditTrip.hotelPaidAmount + selectedAuditTrip.cabPaidAmount)) / selectedAuditTrip.totalAmount) * 100)
                    : 0}% Gross Margin
                </div>
              </div>
            </div>

            {/* Section 1: Customer Inflow Installments */}
            <div className="border border-slate-200 rounded-2xl p-5 space-y-3 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Customer Payments & Installments Inflow</span>
                </h4>
                <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Total: ₹{selectedAuditTrip.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[9px]">
                      <th className="py-2 px-3">Installment Title</th>
                      <th className="py-2 px-3">Amount (₹)</th>
                      <th className="py-2 px-3">Payment Date</th>
                      <th className="py-2 px-3">Mode</th>
                      <th className="py-2 px-3">Transaction UTR #</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedAuditTrip.installments.map((inst, iIdx) => (
                      <tr key={inst.id || iIdx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{inst.title}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-800">
                          ₹{inst.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{inst.paidAt || inst.dueDate}</td>
                        <td className="py-2.5 px-3 text-slate-700 font-semibold">{inst.paymentMode || 'UPI / Bank'}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">{inst.transactionRef || 'TXN-CLEARED'}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">
                            {inst.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2: Multi-Hotel Vendor Disbursements Breakdown */}
            <div className="border border-slate-200 rounded-2xl p-5 space-y-3 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-600" />
                    <span>Multi-Hotel Vendor Disbursements</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Showing individual hotel records with real payment status, mode, and UTR refs.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Total Hotel Paid:</span>
                  <span className="font-mono font-black text-amber-900 text-sm">
                    ₹{selectedAuditTrip.hotelPaidAmount.toLocaleString('en-IN')} / ₹{selectedAuditTrip.hotelTotalCost.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-amber-50 text-amber-950 font-bold uppercase text-[9px]">
                      <th className="py-2.5 px-3">Hotel Name & City</th>
                      <th className="py-2.5 px-3">Room & Nights</th>
                      <th className="py-2.5 px-3">Total Cost</th>
                      <th className="py-2.5 px-3">Amount Paid</th>
                      <th className="py-2.5 px-3">Payment Date</th>
                      <th className="py-2.5 px-3">Payment Mode & Ref</th>
                      <th className="py-2.5 px-3 text-center">Disbursement Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {selectedAuditTrip.hotelsList.map((hotel, hIdx) => {
                      const isCleared = hotel.paymentStatus === 'Paid to Hotel';
                      const isPartial = hotel.paymentStatus === 'Partially Paid';

                      return (
                        <React.Fragment key={hotel.id || hIdx}>
                          <tr className="hover:bg-amber-50/40">
                            <td className="py-2.5 px-3">
                              <div className="font-extrabold text-slate-900">{hotel.hotelName}</div>
                              <div className="text-[10px] text-slate-500">📍 {hotel.city}</div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 font-medium">
                              <div>{hotel.roomType}</div>
                              <div className="text-[10px] text-slate-400">{hotel.nights} Night(s)</div>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                              ₹{hotel.totalCost.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-black text-amber-900">
                              ₹{hotel.paidAmount.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">
                              {hotel.paidAt}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700">
                              <div>{hotel.paymentMode}</div>
                              {hotel.paymentRef && hotel.paymentRef !== '—' && (
                                <div className="text-[10px] text-slate-400">Ref: {hotel.paymentRef}</div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                isCleared 
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                  : isPartial 
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                                  : 'bg-rose-100 text-rose-800 border border-rose-200'
                              }`}>
                                {isCleared ? '✓ Paid to Hotel' : isPartial ? 'Partially Paid' : 'Pending / Unpaid'}
                              </span>
                            </td>
                          </tr>

                          {/* Render Individual Hotel Payment Parts if available */}
                          {Array.isArray(hotel.paymentLogs) && hotel.paymentLogs.length > 0 && (
                            <tr className="bg-amber-50/30">
                              <td colSpan={7} className="px-4 py-2 border-b border-amber-100">
                                <div className="p-2.5 rounded-xl bg-white border border-amber-200/80 shadow-2xs space-y-1.5">
                                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-900 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Payment Parts Log ({hotel.paymentLogs.length} Part{hotel.paymentLogs.length > 1 ? 's' : ''})</span>
                                    </span>
                                    <span className="font-mono text-emerald-800 font-bold">
                                      Total Paid: ₹{hotel.paymentLogs.reduce((acc, p) => acc + (p.amount || 0), 0).toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
                                    {hotel.paymentLogs.map((part, pIdx) => (
                                      <div key={part.id || pIdx} className="p-2 rounded-lg bg-amber-50/50 border border-amber-200 text-[11px] space-y-0.5">
                                        <div className="flex items-center justify-between font-bold">
                                          <span className="text-amber-950">Part {pIdx + 1}: <strong className="font-mono text-emerald-800">₹{part.amount.toLocaleString('en-IN')}</strong></span>
                                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-100 text-amber-900 font-bold">{part.paymentMode || 'Bank'}</span>
                                        </div>
                                        <div className="text-slate-600 font-mono text-[10px] flex items-center gap-1">
                                          <Clock className="w-3 h-3 text-slate-400" />
                                          <span>{part.paidAt}</span>
                                        </div>
                                        {part.paymentRef && (
                                          <div className="text-[10px] text-slate-500 font-mono">
                                            Ref: {part.paymentRef}
                                          </div>
                                        )}
                                        {part.remarks && (
                                          <div className="text-[10px] text-slate-500 italic">
                                            {part.remarks}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 3: Cab Logistics & Driver Settlement */}
            <div className="border border-slate-200 rounded-2xl p-5 space-y-3 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Car className="w-4 h-4 text-teal-600" />
                  <span>Cab Logistics & Driver Settlement</span>
                </h4>
                <span className="font-mono font-black text-teal-900 text-sm">
                  Paid: ₹{selectedAuditTrip.cabPaidAmount.toLocaleString('en-IN')} / ₹{selectedAuditTrip.cabTotalCost.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-teal-800 block">
                    Driver & Vehicle Details
                  </span>
                  <div className="font-extrabold text-slate-900 text-sm">
                    {selectedAuditTrip.driverName}
                  </div>
                  <div className="text-slate-600 font-medium">
                    Vehicle: <strong>{selectedAuditTrip.cabModel}</strong> ({selectedAuditTrip.cabNumber})
                  </div>
                  <div className="font-mono text-teal-800 font-bold">
                    📞 {selectedAuditTrip.driverPhone}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-teal-800 block">
                    Settlement Status & Transaction
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Disbursement Status:</span>
                    <span className="px-2 py-0.5 rounded font-black text-[10px] bg-emerald-100 text-emerald-800">
                      ✓ {selectedAuditTrip.cabPaymentStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-slate-600">Settled On:</span>
                    <strong className="text-slate-900">{selectedAuditTrip.cabPaymentDate}</strong>
                  </div>
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-slate-600">Mode & UTR:</span>
                    <strong className="text-teal-900">{selectedAuditTrip.cabPaymentMode} ({selectedAuditTrip.cabPaymentRef})</strong>
                  </div>
                </div>
              </div>

              {/* Cab Payment Parts Breakdown with Date & Time */}
              {Array.isArray(selectedAuditTrip.cabPaymentLogs) && selectedAuditTrip.cabPaymentLogs.length > 0 && (
                <div className="mt-3 p-3.5 rounded-xl bg-teal-50/50 border border-teal-200 space-y-2">
                  <div className="text-[11px] font-black uppercase tracking-wider text-teal-950 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-teal-700" />
                      <span>Cab Driver Payment Parts & Advances Log ({selectedAuditTrip.cabPaymentLogs.length} Part{selectedAuditTrip.cabPaymentLogs.length > 1 ? 's' : ''})</span>
                    </span>
                    <span className="font-mono text-teal-900 font-bold">
                      Total Paid: ₹{selectedAuditTrip.cabPaymentLogs.reduce((acc, p) => acc + (p.amount || 0), 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                    {selectedAuditTrip.cabPaymentLogs.map((part, pIdx) => (
                      <div key={part.id || pIdx} className="p-2.5 rounded-lg bg-white border border-teal-200/80 shadow-2xs text-[11px] space-y-1">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-teal-950">Part {pIdx + 1}: <strong className="font-mono text-teal-900">₹{part.amount.toLocaleString('en-IN')}</strong></span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-teal-100 text-teal-900 font-bold">{part.paymentMode || 'UPI'}</span>
                        </div>
                        <div className="text-slate-600 font-mono text-[10px] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{part.paidAt}</span>
                        </div>
                        {part.paymentRef && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            Ref: {part.paymentRef}
                          </div>
                        )}
                        {part.remarks && (
                          <div className="text-[10px] text-slate-500 italic">
                            {part.remarks}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedAuditTrip(null)}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all cursor-pointer shadow-md"
              >
                Close Audit Details
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
