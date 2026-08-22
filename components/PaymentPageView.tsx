import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  QrCode,
  Landmark,
  CreditCard,
  Lock,
  CheckCircle2,
  RefreshCw,
  Phone,
  Rocket,
  Check,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  ShieldCheck,
  Copy,
  CheckCheck,
  ArrowRight,
  Sparkles,
  Info,
  Shield
} from 'lucide-react';
import * as api from '../services/apiService';

/* ---------------------------------------------------------------- */
/* Shared Types & Data                                              */
/* ---------------------------------------------------------------- */

export interface PaymentPageViewProps {
  initialLinkKey?: string;
  targetLead?: any;
  onPaymentSuccess?: () => void;
  isStandalone?: boolean;
}

const UPI_APPS = [
  { name: 'PhonePe', color: '#5F259F' },
  { name: 'GPay', color: '#4285F4' },
  { name: 'Paytm', color: '#00BAF2' },
  { name: 'BHIM UPI', color: '#DE3163' },
];

const METHODS = [
  { key: 'upi', label: 'UPI', icon: Smartphone },
  { key: 'qr', label: 'QR Code', icon: QrCode },
  { key: 'bank', label: 'Bank', icon: Landmark },
  { key: 'card', label: 'Card', icon: CreditCard },
];

const WHY_PAY = [
  [Lock, '256-bit SSL encrypted transactions.'],
  [CheckCircle2, 'Instant confirmation via email & SMS.'],
  [RefreshCw, 'Easy cancellation & refund within 48 hours.'],
  [Phone, 'Support: +91 6376983416 / +91 7976336759 (24x7)'],
];

/* ---------------------------------------------------------------- */
/* Themes Registry                                                  */
/* ---------------------------------------------------------------- */

export interface ThemeConfig {
  id: string;
  name: string;
  layoutNote: string;
  swatch: string[];
  bg: string;
  heroFrom: string;
  heroTo: string;
  panel: string;
  border: string;
  accent: string;
  accentSoft: string;
  text: string;
  textMuted: string;
  heroText: string;
  display: string;
  body: string;
  radius: string;
  tabActiveText: string;
  onAccent?: string;
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'haveli',
    name: 'Haveli Heritage',
    layoutNote: 'Classic split — hero banner + 2 columns',
    swatch: ['#7A1F2B', '#C9972C', '#F7F0E3'],
    bg: '#F7F0E3',
    heroFrom: '#5C1420',
    heroTo: '#7A1F2B',
    panel: '#FFFFFF',
    border: '#E4D4B0',
    accent: '#C9972C',
    accentSoft: '#F0E2C0',
    text: '#3A1E16',
    textMuted: '#8A7358',
    heroText: '#F7EBD2',
    display: '"Palatino Linotype", Palatino, Georgia, serif',
    body: 'Georgia, "Times New Roman", serif',
    radius: '10px',
    tabActiveText: '#7A1F2B',
  },

];

/* ---------------------------------------------------------------- */
/* Shared Subcomponents                                             */
/* ---------------------------------------------------------------- */

function OrnateCorner({ color, rotate = 0 }: { color: string; rotate?: number }) {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" style={{ transform: `rotate(${rotate}deg)` }}>
      <path d="M2,2 Q2,22 22,22 M2,2 Q22,2 22,22 M2,2 L12,2 M2,2 L2,12" fill="none" stroke={color} strokeWidth="2" />
      <circle cx="22" cy="22" r="2.6" fill={color} />
    </svg>
  );
}

function Panel({ t, children, style, className = '' }: { t: ThemeConfig; children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <div
      className={className}
      style={{
        background: t.panel,
        border: `1px solid ${t.border}`,
        borderRadius: t.radius,
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function AcceptedPayments({ t }: { t: ThemeConfig }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {['VISA', 'Mastercard', 'RuPay', 'UPI', 'Netbanking', 'EMI'].map((m) => (
        <span
          key={m}
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '4px 8px',
            borderRadius: t.radius,
            background: t.accentSoft,
            color: t.text,
            border: `1px solid ${t.border}`,
            letterSpacing: '0.04em',
          }}
        >
          {m}
        </span>
      ))}
    </div>
  );
}

function WhyPayBlock({ t }: { t: ThemeConfig }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {WHY_PAY.map(([Icon, text]: any, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Icon size={15} color={t.accent} style={{ marginTop: 2, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: t.text, lineHeight: 1.4, opacity: 0.9 }}>{text}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Main View Component                                              */
/* ---------------------------------------------------------------- */

export const PaymentPageView: React.FC<PaymentPageViewProps> = ({
  initialLinkKey,
  targetLead,
  onPaymentSuccess,
  isStandalone = true,
}) => {
  // Theme Selection State
  const [themeIdx, setThemeIdx] = useState<number>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('kingsland_payment_theme_idx') : null;
    return saved !== null ? parseInt(saved, 10) || 0 : 0;
  });

  const t = THEMES[themeIdx] || THEMES[0];

  const handleSelectTheme = (i: number) => {
    setThemeIdx(i);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kingsland_payment_theme_idx', String(i));
    }
  };

  // Payment Link Data & Backend Settings State
  const [paymentLink, setPaymentLink] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [settings, setSettings] = useState<any>({
    key_id: 'rzp_test_51HKingslandDemoKey',
    key_secret: '',
    upi_id: 'kingslandholiday@okicici',
    upi_payee: 'Kingsland Holidays Services Pvt Ltd',
    bank_name: 'HDFC Bank',
    bank_acc_num: '50200087628332',
    bank_ifsc: 'HDFC0001234',
    bank_branch: 'Connaught Place, New Delhi',
    bank_acc_name: 'Kingsland Holidays Services',
    support_phone: '+91 6376983416',
    card_fee_percentage: 2.5,
  });

  // Interactive Form States
  const [method, setMethod] = useState<string>('upi');
  const [selectedUpiApp, setSelectedUpiApp] = useState<string>('PhonePe');
  const [customerUpiId, setCustomerUpiId] = useState<string>('');
  const [customerUpiPhone, setCustomerUpiPhone] = useState<string>('');
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [billingName, setBillingName] = useState<string>('');
  const [billingMobile, setBillingMobile] = useState<string>('');
  const [billingEmail, setBillingEmail] = useState<string>('');
  const [showCardFeePopup, setShowCardFeePopup] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [confirmedDetails, setConfirmedDetails] = useState<any>(null);

  // Load Link & Lead Data
  useEffect(() => {
    const loadPaymentData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Backend Payment Settings
        const sets = await api.fetchPaymentSettings();
        if (sets) setSettings(sets);

        // 2. Extract Pay Key from URL or Props
        let payKey = initialLinkKey;
        if (!payKey && typeof window !== 'undefined') {
          const hash = window.location.hash || '';
          const search = window.location.search || '';
          const match = hash.match(/pay_id=([^&]+)/) || search.match(/pay_id=([^&]+)/);
          if (match && match[1]) {
            payKey = decodeURIComponent(match[1]);
          }
        }

        if (payKey) {
          const fetchedLink = await api.fetchPaymentLinkByKey(payKey);
          if (fetchedLink) {
            setPaymentLink(fetchedLink);
            setBillingName(fetchedLink.customer_name || '');
            setBillingMobile(fetchedLink.customer_phone || '');
            setCustomerUpiPhone(fetchedLink.customer_phone || '');
            setBillingEmail(fetchedLink.customer_email || '');
          }
        } else if (targetLead) {
          // Generate virtual link from Lead
          setPaymentLink({
            id: targetLead.id,
            pay_key: targetLead.tripId || `lead_${targetLead.id}`,
            lead_id: targetLead.id,
            package_name: targetLead.destination ? `${targetLead.destination} Tour Package` : 'Tour Package Booking',
            customer_name: targetLead.name || 'Valued Guest',
            customer_phone: targetLead.phone || '',
            customer_email: targetLead.email || '',
            destination: targetLead.destination || 'Rajasthan',
            travel_date: targetLead.travelDate || '',
            amount: 21000,
            gst: 0,
            fee: 0,
            discount: 0,
            net_amount: 21000,
            status: 'Pending',
          });
          setBillingName(targetLead.name || '');
          setBillingMobile(targetLead.phone || '');
          setCustomerUpiPhone(targetLead.phone || '');
          setBillingEmail(targetLead.email || '');
        }
      } catch (err) {
        console.error('Failed to load payment link data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPaymentData();
  }, [initialLinkKey, targetLead]);

  // Derived financial numbers
  const customerName = paymentLink?.customer_name || targetLead?.name || 'Valued Guest';
  const packageName = paymentLink?.package_name || (targetLead?.destination ? `${targetLead.destination} Tour Package` : 'Rajasthan Tour Package');
  const baseAmount = Number(paymentLink?.amount ?? 21000);
  const gstAmount = Number(paymentLink?.gst ?? 0);
  const feeAmount = Number(paymentLink?.fee ?? 0);
  const discountAmount = Number(paymentLink?.discount ?? 0);

  const cardFeePercent = settings.card_fee_percentage !== undefined ? Number(settings.card_fee_percentage) : 2.5;
  const standardNet = Math.max(0, baseAmount + gstAmount + feeAmount - discountAmount);
  const cardSurcharge = method === 'card' ? Math.round((standardNet * cardFeePercent) / 100) : 0;
  const totalPayable = standardNet + cardSurcharge;

  // Copy helper
  const handleCopy = (key: string, text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  // Submission handler
  const handleSubmitPayment = async (payMode: string, customRef?: string) => {
    const finalRef = customRef || utrNumber.trim() || `TXN-${Date.now().toString(36).toUpperCase()}`;
    setSubmitting(true);
    try {
      const subPayload = {
        payKey: paymentLink?.pay_key || initialLinkKey || 'direct_portal',
        leadId: paymentLink?.lead_id || targetLead?.id || '',
        customerName: billingName || customerName,
        mobile: billingMobile || customerUpiPhone || paymentLink?.customer_phone || '',
        packageName: packageName,
        amountPaid: totalPayable,
        utrNumber: finalRef,
        paymentMode: (payMode as any) || 'UPI',
      };

      await api.createPaymentSubmission(subPayload);

      // Confirm payment link status if matching key
      if (paymentLink?.pay_key) {
        await api.confirmPayment({
          payKey: paymentLink.pay_key,
          refNumber: finalRef,
          paymentMode: payMode,
          amount: totalPayable,
        });
      }

      setConfirmedDetails({
        txnId: finalRef,
        amount: totalPayable,
        mode: payMode,
        date: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
        name: customerName,
        package: packageName,
      });

      setIsSuccess(true);
      if (onPaymentSuccess) onPaymentSuccess();
    } catch (e) {
      console.error('Error submitting payment:', e);
      alert('Payment submission could not be verified. Please verify your reference number.');
    } finally {
      setSubmitting(false);
    }
  };

  // Razorpay Checkout Trigger
  const triggerRazorpayCheckout = (amount: number, title: string) => {
    const key = settings.key_id || 'rzp_test_51HKingslandDemoKey';
    if (typeof (window as any).Razorpay !== 'undefined') {
      const options = {
        key: key,
        amount: Math.round(amount * 100),
        currency: 'INR',
        name: 'Kingsland Holidays',
        description: `Payment for ${title}`,
        image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=100',
        handler: function (response: any) {
          handleSubmitPayment('Razorpay', response.razorpay_payment_id);
        },
        prefill: {
          name: billingName || customerName,
          email: billingEmail || 'guest@kingslandholidays.com',
          contact: billingMobile || customerUpiPhone || '9876543210',
        },
        theme: {
          color: t.accent || '#C9922A',
        },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } else {
      // Fallback if Razorpay script not loaded
      const mockRef = `RZP-${Date.now().toString(36).toUpperCase()}`;
      handleSubmitPayment('Card / Online Gateway', mockRef);
    }
  };

  // Reusable Summary Component
  const renderSummaryBlock = (compact = false) => {
    const rows = [
      ['Amount', `₹${baseAmount.toLocaleString('en-IN')}.00`],
      ['GST Tax', `₹${gstAmount.toLocaleString('en-IN')}.00`],
      ['Processing Fee', `₹${feeAmount.toLocaleString('en-IN')}.00`],
      ...(discountAmount > 0 ? [['Discount', `-₹${discountAmount.toLocaleString('en-IN')}.00`]] : []),
      ...(method === 'card' ? [[`Card Fee (${cardFeePercent}%)`, `+₹${cardSurcharge.toLocaleString('en-IN')}.00`]] : []),
    ];

    return (
      <div>
        {!compact && (
          <p style={{ color: t.accent, fontWeight: 700, fontSize: 13, marginTop: 0, marginBottom: 12 }}>
            {packageName}
          </p>
        )}
        {rows.map(([label, value]) => (
          <div
            key={label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 13,
              color: t.textMuted,
              padding: '7px 0',
              borderBottom: `1px solid ${t.border}`,
            }}
          >
            <span>{label}</span>
            <span style={{ fontWeight: 600, color: label.includes('Discount') ? '#10B981' : t.text }}>{value}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 14, fontWeight: 800, color: t.text }}>
          <span style={{ fontFamily: t.display, fontSize: 15 }}>Total Payable</span>
          <span style={{ color: t.accent, fontSize: 18, fontFamily: t.display }}>
            ₹{totalPayable.toLocaleString('en-IN')}.00
          </span>
        </div>
      </div>
    );
  };

  // Reusable Method Tabs Row
  const renderMethodTabs = (vertical = false) => {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: vertical ? 'column' : 'row',
          borderBottom: vertical ? 'none' : `1px solid ${t.border}`,
          gap: vertical ? 6 : 0,
        }}
      >
        {METHODS.map((m) => {
          const Icon = m.icon;
          const on = method === m.key;
          return (
            <button
              key={m.key}
              onClick={() => {
                setMethod(m.key);
                if (m.key === 'card') setShowCardFeePopup(true);
              }}
              style={{
                flex: vertical ? 'none' : 1,
                padding: vertical ? '12px 14px' : '14px 8px',
                background: on ? t.accentSoft : 'transparent',
                border: 'none',
                borderBottom: !vertical && on ? `3px solid ${t.accent}` : '3px solid transparent',
                borderRadius: vertical ? t.radius : '0px',
                color: on ? t.tabActiveText : t.textMuted,
                fontFamily: t.body,
                fontWeight: on ? 800 : 600,
                fontSize: 12,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: vertical ? 'flex-start' : 'center',
                flexDirection: vertical ? 'row' : 'column',
                gap: 8,
                transition: 'all .2s ease',
              }}
            >
              <Icon size={17} color={on ? t.accent : undefined} />
              <span>{m.label.toUpperCase()}</span>
            </button>
          );
        })}
      </div>
    );
  };

  // Reusable Method Form Content
  const renderMethodContent = (dense = false) => {
    return (
      <div>
        {/* UPI METHOD */}
        {method === 'upi' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: dense ? 12 : 16 }}>
            <div>
              <label style={{ fontSize: 11, letterSpacing: '0.08em', color: t.textMuted, fontWeight: 800, textTransform: 'uppercase' }}>
                Select Preferred UPI App
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: 10,
                  marginTop: 8,
                }}
              >
                {UPI_APPS.map((a) => {
                  const active = selectedUpiApp === a.name;
                  return (
                    <button
                      key={a.name}
                      type="button"
                      onClick={() => setSelectedUpiApp(a.name)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: dense ? '10px 12px' : '12px 14px',
                        borderRadius: t.radius,
                        border: active ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
                        background: active ? t.accentSoft : 'transparent',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ width: 20, height: 20, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, fontSize: 12.5, color: t.text, fontFamily: t.body }}>{a.name}</span>
                      {active && <Check size={15} color={t.accent} style={{ marginLeft: 'auto' }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, letterSpacing: '0.08em', color: t.textMuted, fontWeight: 800, textTransform: 'uppercase' }}>
                Enter UPI ID
              </label>
              <input
                type="text"
                placeholder="yourname@upi / mobilenumber@okhdfcbank"
                value={customerUpiId}
                onChange={(e) => setCustomerUpiId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  marginTop: 6,
                  border: `1px solid ${t.border}`,
                  borderRadius: t.radius,
                  background: t.panel,
                  color: t.text,
                  fontFamily: t.body,
                  fontSize: 13,
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, letterSpacing: '0.08em', color: t.textMuted, fontWeight: 800, textTransform: 'uppercase' }}>
                UPI Registered Mobile Number
              </label>
              <input
                type="tel"
                value={customerUpiPhone}
                onChange={(e) => setCustomerUpiPhone(e.target.value)}
                placeholder="+91 98765 43210"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  marginTop: 6,
                  border: `1px solid ${t.border}`,
                  borderRadius: t.radius,
                  background: t.panel,
                  color: t.text,
                  fontFamily: t.body,
                  fontSize: 13,
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, letterSpacing: '0.08em', color: t.textMuted, fontWeight: 800, textTransform: 'uppercase' }}>
                Transaction / UTR Reference No. (If already paid)
              </label>
              <input
                type="text"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value)}
                placeholder="12-digit UTR or Reference Number"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  marginTop: 6,
                  border: `1px solid ${t.border}`,
                  borderRadius: t.radius,
                  background: t.panel,
                  color: t.text,
                  fontFamily: t.body,
                  fontSize: 13,
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                if (!utrNumber.trim()) {
                  alert('Please enter your UTR / Transaction Reference number after making the payment.');
                  return;
                }
                handleSubmitPayment('UPI', utrNumber.trim());
              }}
              style={{
                width: '100%',
                padding: dense ? '12px' : '15px',
                borderRadius: t.radius,
                border: 'none',
                background: t.accent,
                color: t.onAccent || '#FFFFFF',
                fontWeight: 800,
                fontSize: 13,
                letterSpacing: '0.06em',
                fontFamily: t.body,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                transition: 'all .2s ease',
              }}
            >
              <Rocket size={16} /> {submitting ? 'PROCESSING...' : `CONFIRM & PAY ₹${totalPayable.toLocaleString('en-IN')}`}
            </button>
          </div>
        )}

        {/* QR CODE METHOD */}
        {method === 'qr' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center' }}>
            <div
              style={{
                padding: '20px',
                background: t.accentSoft,
                border: `2px dashed ${t.accent}`,
                borderRadius: t.radius,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  background: '#FFFFFF',
                  padding: '12px',
                  borderRadius: t.radius,
                  boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                  border: `1px solid ${t.border}`,
                }}
              >
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                    `upi://pay?pa=${settings.upi_id}&pn=${encodeURIComponent(settings.upi_payee)}&am=${totalPayable}&cu=INR`
                  )}`}
                  alt="UPI QR Code"
                  style={{ width: 190, height: 190, display: 'block' }}
                />
              </div>

              <div>
                <p style={{ fontWeight: 800, fontSize: 14, color: t.text, margin: '0 0 2px' }}>{settings.upi_payee}</p>
                <p style={{ fontSize: 12, color: t.textMuted, margin: 0 }}>
                  Scan with any app to pay <strong style={{ color: t.accent }}>₹{totalPayable.toLocaleString('en-IN')}</strong>
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: t.panel,
                  border: `1px solid ${t.border}`,
                  borderRadius: t.radius,
                  padding: '6px 10px',
                  maxWidth: 320,
                  width: '100%',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {settings.upi_id}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('upi_id', settings.upi_id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: t.radius,
                    border: 'none',
                    background: copiedKey === 'upi_id' ? '#10B981' : t.accent,
                    color: '#FFFFFF',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {copiedKey === 'upi_id' ? <Check size={12} /> : <Copy size={12} />}
                  {copiedKey === 'upi_id' ? 'COPIED' : 'COPY'}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: 11, letterSpacing: '0.08em', color: t.textMuted, fontWeight: 800, textTransform: 'uppercase' }}>
                Transaction / UTR Reference Number after scan
              </label>
              <input
                type="text"
                placeholder="Enter 12-digit transaction reference number"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  marginTop: 6,
                  border: `1px solid ${t.border}`,
                  borderRadius: t.radius,
                  background: t.panel,
                  color: t.text,
                  fontFamily: t.body,
                  fontSize: 13,
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                if (!utrNumber.trim()) {
                  alert('Please scan the QR code and enter your UTR / Transaction Reference number.');
                  return;
                }
                handleSubmitPayment('QR Code / UPI', utrNumber.trim());
              }}
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: t.radius,
                border: 'none',
                background: t.accent,
                color: t.onAccent || '#FFFFFF',
                fontWeight: 800,
                fontSize: 13,
                letterSpacing: '0.06em',
                fontFamily: t.body,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <CheckCircle2 size={16} /> {submitting ? 'VERIFYING...' : 'CONFIRM PAYMENT'}
            </button>
          </div>
        )}

        {/* BANK TRANSFER METHOD */}
        {method === 'bank' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                background: t.panel,
                border: `1px solid ${t.border}`,
                borderRadius: t.radius,
                overflow: 'hidden',
                fontSize: 12.5,
              }}
            >
              {[
                ['ACCOUNT NAME', settings.bank_acc_name, 'acc_name'],
                ['ACCOUNT NUMBER', settings.bank_acc_num, 'acc_num'],
                ['IFSC CODE', settings.bank_ifsc, 'ifsc'],
                ['BANK NAME', settings.bank_name, 'bank_name'],
                ['BRANCH', settings.bank_branch, 'branch'],
                ['ACCOUNT TYPE', 'CURRENT ACCOUNT', null],
              ].map(([lbl, val, copyId]) => (
                <div
                  key={lbl}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderBottom: `1px solid ${t.border}`,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted }}>{lbl}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, color: t.text, fontFamily: lbl.includes('NUMBER') || lbl.includes('IFSC') ? 'monospace' : t.body }}>
                      {val}
                    </span>
                    {copyId && (
                      <button
                        type="button"
                        onClick={() => handleCopy(copyId, val)}
                        style={{
                          padding: '3px 7px',
                          borderRadius: t.radius,
                          border: 'none',
                          background: copiedKey === copyId ? '#10B981' : t.accentSoft,
                          color: copiedKey === copyId ? '#fff' : t.text,
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {copiedKey === copyId ? 'COPIED' : 'COPY'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label style={{ fontSize: 11, letterSpacing: '0.08em', color: t.textMuted, fontWeight: 800, textTransform: 'uppercase' }}>
                NEFT / RTGS / IMPS Reference Number
              </label>
              <input
                type="text"
                placeholder="Enter bank transaction reference number"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  marginTop: 6,
                  border: `1px solid ${t.border}`,
                  borderRadius: t.radius,
                  background: t.panel,
                  color: t.text,
                  fontFamily: t.body,
                  fontSize: 13,
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                if (!utrNumber.trim()) {
                  alert('Please enter your Bank Transfer UTR / Transaction Reference Number.');
                  return;
                }
                handleSubmitPayment('Bank Transfer', utrNumber.trim());
              }}
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: t.radius,
                border: 'none',
                background: t.accent,
                color: t.onAccent || '#FFFFFF',
                fontWeight: 800,
                fontSize: 13,
                letterSpacing: '0.06em',
                fontFamily: t.body,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Landmark size={16} /> {submitting ? 'SUBMITTING...' : 'SUBMIT TRANSFER DETAILS'}
            </button>
          </div>
        )}

        {/* CARD METHOD */}
        {method === 'card' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Visual Card Mockup */}
            <div
              style={{
                background: `linear-gradient(135deg, ${t.heroFrom}, ${t.heroTo})`,
                borderRadius: t.radius,
                padding: '20px',
                color: t.heroText,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                border: `1px solid ${t.accent}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ width: 36, height: 26, background: 'linear-gradient(135deg, #FFD700, #FFA500)', borderRadius: 4 }} />
                <span style={{ fontSize: 11, letterSpacing: '0.12em', fontWeight: 800, color: t.accent }}>SECURE CARD PAY</span>
              </div>
              <div style={{ fontSize: 16, letterSpacing: '0.2em', fontFamily: 'monospace', fontWeight: 700 }}>
                •••• •••• •••• ••••
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: 11 }}>
                <div>
                  <span style={{ opacity: 0.7, fontSize: 9, display: 'block' }}>CARD HOLDER</span>
                  <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>{billingName || customerName}</span>
                </div>
                <div>
                  <span style={{ opacity: 0.7, fontSize: 9, display: 'block' }}>EXPIRES</span>
                  <span style={{ fontWeight: 700 }}>MM / YY</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, letterSpacing: '0.08em', color: t.textMuted, fontWeight: 800, textTransform: 'uppercase' }}>
                  Billing Name *
                </label>
                <input
                  type="text"
                  value={billingName}
                  onChange={(e) => setBillingName(e.target.value)}
                  placeholder="Full name as on card"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    marginTop: 6,
                    border: `1px solid ${t.border}`,
                    borderRadius: t.radius,
                    background: t.panel,
                    color: t.text,
                    fontFamily: t.body,
                    fontSize: 13,
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '0.08em', color: t.textMuted, fontWeight: 800, textTransform: 'uppercase' }}>
                    Billing Mobile *
                  </label>
                  <input
                    type="tel"
                    value={billingMobile}
                    onChange={(e) => setBillingMobile(e.target.value)}
                    placeholder="+91 98765 43210"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      marginTop: 6,
                      border: `1px solid ${t.border}`,
                      borderRadius: t.radius,
                      background: t.panel,
                      color: t.text,
                      fontFamily: t.body,
                      fontSize: 13,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, letterSpacing: '0.08em', color: t.textMuted, fontWeight: 800, textTransform: 'uppercase' }}>
                    Billing Email *
                  </label>
                  <input
                    type="email"
                    value={billingEmail}
                    onChange={(e) => setBillingEmail(e.target.value)}
                    placeholder="email@domain.com"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      marginTop: 6,
                      border: `1px solid ${t.border}`,
                      borderRadius: t.radius,
                      background: t.panel,
                      color: t.text,
                      fontFamily: t.body,
                      fontSize: 13,
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={() => triggerRazorpayCheckout(totalPayable, packageName)}
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: t.radius,
                border: 'none',
                background: t.accent,
                color: t.onAccent || '#FFFFFF',
                fontWeight: 800,
                fontSize: 13,
                letterSpacing: '0.06em',
                fontFamily: t.body,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Lock size={16} /> PAY ₹{totalPayable.toLocaleString('en-IN')} SECURELY
            </button>
          </div>
        )}
      </div>
    );
  };

  /* ---------------------------------------------------------------- */
  /* Render 1. HAVELI — classic split hero + two column               */
  /* ---------------------------------------------------------------- */
  const renderHaveli = () => (
    <div style={{ background: t.bg, fontFamily: t.body, color: t.text, minHeight: '100%', paddingBottom: 48 }}>
      <div
        style={{
          background: `linear-gradient(135deg, ${t.heroFrom}, ${t.heroTo})`,
          padding: '42px 20px 30px',
          textAlign: 'center',
        }}
      >
        <p style={{ color: t.heroText, opacity: 0.8, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
          Safe & Secure Payment · Kingsland Holidays
        </p>
        <h1 style={{ fontFamily: t.display, color: t.heroText, fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 700, margin: '0 0 10px' }}>
          Complete Your <span style={{ color: t.accent }}>Booking</span>
        </h1>
        <p style={{ color: t.heroText, opacity: 0.95, fontSize: 14, marginBottom: 16 }}>
          Mr./Ms. {customerName} — {packageName}
        </p>
        <div
          style={{
            display: 'inline-block',
            background: 'rgba(255,255,255,0.12)',
            border: `1px solid ${t.accent}`,
            color: t.heroText,
            borderRadius: 999,
            padding: '8px 22px',
            fontWeight: 800,
            fontSize: 18,
          }}
        >
          ₹{totalPayable.toLocaleString('en-IN')}.00 <span style={{ fontWeight: 400, fontSize: 11, opacity: 0.85 }}>AMOUNT DUE</span>
        </div>
      </div>

      <svg width="100%" height="24" viewBox="0 0 600 24" preserveAspectRatio="none" style={{ display: 'block' }}>
        <path d="M0,24 L0,12 Q30,0 60,12 Q90,24 120,12 Q150,0 180,12 Q210,24 240,12 Q270,0 300,12 Q330,24 360,12 Q390,0 420,12 Q450,24 480,12 Q510,0 540,12 Q570,24 600,12 L600,24 Z" fill={t.accent} />
      </svg>

      <div
        style={{
          maxWidth: 1000,
          margin: '0 auto',
          padding: '24px 16px 0',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
        }}
      >
        <Panel t={t} style={{ overflow: 'hidden' }}>
          {renderMethodTabs()}
          <div style={{ padding: '24px' }}>
            <h3 style={{ fontFamily: t.display, fontSize: 18, margin: '0 0 4px' }}>
              {METHODS.find((m) => m.key === method)?.label} Payment
            </h3>
            <p style={{ color: t.textMuted, fontSize: 12.5, margin: '0 0 18px' }}>
              Instant & verified transaction via Kingsland Holiday desk.
            </p>
            {renderMethodContent()}
          </div>
        </Panel>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Panel t={t} style={{ overflow: 'hidden' }}>
            <div style={{ background: `linear-gradient(135deg, ${t.heroFrom}, ${t.heroTo})`, color: t.heroText, padding: '14px 18px', fontFamily: t.display, fontSize: 15, fontWeight: 700 }}>
              Booking Summary
            </div>
            <div style={{ padding: 18 }}>{renderSummaryBlock()}</div>
          </Panel>

          <Panel t={t} style={{ padding: 18 }}>
            <p style={{ fontSize: 11, letterSpacing: '0.1em', color: t.textMuted, fontWeight: 800, marginTop: 0, marginBottom: 12 }}>
              WHY PAY WITH US
            </p>
            <WhyPayBlock t={t} />
          </Panel>

          <Panel t={t} style={{ padding: 18 }}>
            <p style={{ fontSize: 11, letterSpacing: '0.1em', color: t.textMuted, fontWeight: 800, marginTop: 0, marginBottom: 10 }}>
              ACCEPTED PAYMENT MODES
            </p>
            <AcceptedPayments t={t} />
          </Panel>
        </div>
      </div>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /* Render 2. INDIGO — vertical wizard / stepper single column       */
  /* ---------------------------------------------------------------- */
  const [indigoStep, setIndigoStep] = useState(1);
  const indigoSteps = ['Method', 'Details', 'Review & Pay'];

  const renderIndigo = () => (
    <div style={{ background: t.bg, fontFamily: t.body, color: t.text, minHeight: '100%', paddingBottom: 48 }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '36px 16px 0' }}>
        <p style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: t.textMuted, textAlign: 'center', marginBottom: 4 }}>
          Kingsland Holidays
        </p>
        <h1 style={{ fontFamily: t.display, textAlign: 'center', fontSize: 'clamp(20px, 3.5vw, 26px)', margin: '0 0 6px' }}>
          {packageName}
        </h1>
        <p style={{ textAlign: 'center', color: t.textMuted, fontSize: 13, marginBottom: 22 }}>
          Mr./Ms. {customerName} · Amount due <strong style={{ color: t.accent }}>₹{totalPayable.toLocaleString('en-IN')}</strong>
        </p>

        {/* Stepper Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
          {indigoSteps.map((s, i) => {
            const n = i + 1;
            const on = indigoStep === n;
            const done = indigoStep > n;
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  onClick={() => setIndigoStep(n)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: on || done ? t.accent : t.accentSoft,
                    color: on || done ? '#FFFFFF' : t.textMuted,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {done ? <Check size={14} /> : n}
                </div>
                <span style={{ fontSize: 12, color: on ? t.text : t.textMuted, fontWeight: on ? 800 : 500 }}>{s}</span>
                {i < indigoSteps.length - 1 && <div style={{ width: 22, height: 1, background: t.border, margin: '0 4px' }} />}
              </div>
            );
          })}
        </div>

        <Panel t={t} style={{ padding: 24, marginBottom: 18 }}>
          {indigoStep === 1 && (
            <>
              <h3 style={{ fontFamily: t.display, fontSize: 17, margin: '0 0 14px' }}>Choose a payment method</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
                {METHODS.map((m) => {
                  const Icon = m.icon;
                  const on = method === m.key;
                  return (
                    <button
                      key={m.key}
                      onClick={() => setMethod(m.key)}
                      style={{
                        padding: '16px 8px',
                        borderRadius: t.radius,
                        border: on ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
                        background: on ? t.accentSoft : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Icon size={20} color={on ? t.accent : t.textMuted} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: t.text }}>{m.label}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setIndigoStep(2)}
                style={{
                  marginTop: 20,
                  width: '100%',
                  padding: 14,
                  borderRadius: t.radius,
                  border: 'none',
                  background: t.accent,
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                Continue to Details <ChevronRight size={16} />
              </button>
            </>
          )}

          {indigoStep === 2 && (
            <>
              <button
                onClick={() => setIndigoStep(1)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'none',
                  border: 'none',
                  color: t.textMuted,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginBottom: 14,
                  padding: 0,
                }}
              >
                <ChevronLeft size={14} /> Back to method selection
              </button>
              <h3 style={{ fontFamily: t.display, fontSize: 17, margin: '0 0 14px' }}>
                Enter {METHODS.find((m) => m.key === method)?.label} Details
              </h3>
              {renderMethodContent()}
            </>
          )}

          {indigoStep === 3 && (
            <>
              <h3 style={{ fontFamily: t.display, fontSize: 17, margin: '0 0 14px' }}>Review & Confirm Payment</h3>
              {renderSummaryBlock()}
              <button
                disabled={submitting}
                onClick={() => {
                  if (method === 'card') {
                    triggerRazorpayCheckout(totalPayable, packageName);
                  } else {
                    handleSubmitPayment(method.toUpperCase());
                  }
                }}
                style={{
                  marginTop: 18,
                  width: '100%',
                  padding: 15,
                  borderRadius: t.radius,
                  border: 'none',
                  background: t.accent,
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                CONFIRM & PAY ₹{totalPayable.toLocaleString('en-IN')}
              </button>
            </>
          )}
        </Panel>

        {indigoStep !== 3 && (
          <div onClick={() => setIndigoStep(3)} style={{ cursor: 'pointer' }}>
            <Panel t={t} style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: t.textMuted, fontWeight: 600 }}>Total Payable Summary</span>
              <span style={{ fontWeight: 800, color: t.accent, display: 'flex', alignItems: 'center', gap: 4 }}>
                ₹{totalPayable.toLocaleString('en-IN')}.00 <ChevronDown size={14} />
              </span>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /* Render 3. SUNSET — fixed icon rail + stacked layout              */
  /* ---------------------------------------------------------------- */
  const renderSunset = () => (
    <div style={{ background: t.bg, fontFamily: t.body, color: t.text, display: 'flex', flexDirection: 'row', minHeight: '100%', flexWrap: 'wrap' }}>
      {/* Icon Rail */}
      <div
        style={{
          width: 'clamp(64px, 10vw, 76px)',
          background: t.heroFrom,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 28,
          gap: 16,
          flexShrink: 0,
        }}
      >
        {METHODS.map((m) => {
          const Icon = m.icon;
          const on = method === m.key;
          return (
            <button
              key={m.key}
              onClick={() => setMethod(m.key)}
              title={m.label}
              style={{
                width: 44,
                height: 44,
                borderRadius: t.radius,
                border: 'none',
                background: on ? t.accent : 'transparent',
                color: on ? '#2B1B3D' : t.heroText,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all .2s ease',
              }}
            >
              <Icon size={20} />
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, padding: '24px 16px 48px', minWidth: 280 }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div
            style={{
              background: `linear-gradient(120deg, ${t.heroFrom}, ${t.heroTo})`,
              borderRadius: t.radius,
              padding: '22px 24px',
              marginBottom: 20,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <p style={{ color: '#2B1B3D', opacity: 0.8, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: 700 }}>
                Kingsland Holidays
              </p>
              <h1 style={{ fontFamily: t.display, fontSize: 22, color: '#2B1B3D', margin: 0 }}>{packageName}</h1>
              <p style={{ fontSize: 12.5, color: '#2B1B3D', opacity: 0.9, margin: '4px 0 0', fontWeight: 600 }}>Mr./Ms. {customerName}</p>
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#2B1B3D', fontFamily: t.display }}>
              ₹{totalPayable.toLocaleString('en-IN')}
            </div>
          </div>

          <Panel t={t} style={{ padding: 24, marginBottom: 18 }}>
            <h3 style={{ fontFamily: t.display, fontSize: 17, margin: '0 0 4px' }}>
              {METHODS.find((m) => m.key === method)?.label} Payment
            </h3>
            <p style={{ color: t.textMuted, fontSize: 12.5, margin: '0 0 16px' }}>
              Select payment method from the rail, then enter your confirmation details.
            </p>
            {renderMethodContent()}
          </Panel>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <Panel t={t} style={{ padding: 18 }}>
              <p style={{ fontSize: 11, letterSpacing: '0.1em', color: t.textMuted, fontWeight: 800, marginTop: 0 }}>SUMMARY</p>
              {renderSummaryBlock(true)}
            </Panel>
            <Panel t={t} style={{ padding: 18 }}>
              <p style={{ fontSize: 11, letterSpacing: '0.1em', color: t.textMuted, fontWeight: 800, marginTop: 0 }}>WHY PAY WITH US</p>
              <WhyPayBlock t={t} />
              <div style={{ marginTop: 12 }}>
                <AcceptedPayments t={t} />
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /* Render 4. MARBLE — top ribbon + 3-column                         */
  /* ---------------------------------------------------------------- */
  const renderMarble = () => (
    <div style={{ background: t.bg, fontFamily: t.body, color: t.text, paddingBottom: 48 }}>
      <div
        style={{
          background: t.heroFrom,
          color: t.heroText,
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div>
          <span style={{ fontFamily: t.display, fontSize: 17, fontWeight: 700 }}>Kingsland Holidays</span>
          <span style={{ fontSize: 12, opacity: 0.85, marginLeft: 12 }}>
            {packageName} · {customerName}
          </span>
        </div>
        <div style={{ fontWeight: 800, fontSize: 18 }}>₹{totalPayable.toLocaleString('en-IN')}.00</div>
      </div>

      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '28px 16px 0',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
        }}
      >
        {/* Left: Method Selector Panel */}
        <Panel t={t} style={{ padding: 12, alignSelf: 'start' }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: t.textMuted, margin: '6px 8px 10px', textTransform: 'uppercase' }}>
            Payment Modes
          </p>
          {renderMethodTabs(true)}
        </Panel>

        {/* Center: Form Panel */}
        <Panel t={t} style={{ padding: 24 }}>
          <h3 style={{ fontFamily: t.display, fontSize: 18, margin: '0 0 4px' }}>
            {METHODS.find((m) => m.key === method)?.label} Payment Flow
          </h3>
          <p style={{ color: t.textMuted, fontSize: 12.5, margin: '0 0 18px' }}>
            Safe, encrypted 256-bit payment gateway.
          </p>
          {renderMethodContent()}
        </Panel>

        {/* Right: Booking Summary & Benefits */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Panel t={t} style={{ padding: 18 }}>
            <p style={{ fontSize: 11, letterSpacing: '0.1em', color: t.textMuted, fontWeight: 800, marginTop: 0 }}>BOOKING SUMMARY</p>
            {renderSummaryBlock()}
          </Panel>
          <Panel t={t} style={{ padding: 18 }}>
            <WhyPayBlock t={t} />
          </Panel>
          <Panel t={t} style={{ padding: 16 }}>
            <AcceptedPayments t={t} />
          </Panel>
        </div>
      </div>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /* Render 5. MINT — narrow mobile card + sticky pay bar             */
  /* ---------------------------------------------------------------- */
  const [mintShowSummary, setMintShowSummary] = useState(false);

  const renderMint = () => (
    <div style={{ background: t.bg, fontFamily: t.body, color: t.text, display: 'flex', justifyContent: 'center', minHeight: '100%' }}>
      <div style={{ width: '100%', maxWidth: 440, padding: '24px 16px 110px', position: 'relative' }}>
        <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: t.textMuted, marginBottom: 4, fontWeight: 700 }}>
          Kingsland Holidays Desk
        </p>
        <h1 style={{ fontFamily: t.display, fontSize: 'clamp(28px, 6vw, 36px)', fontWeight: 800, margin: '0 0 4px' }}>
          ₹{totalPayable.toLocaleString('en-IN')}
        </h1>
        <p style={{ fontSize: 12.5, color: t.textMuted, marginBottom: 18 }}>
          {packageName} · {customerName}
        </p>

        {/* Horizontal scroll pill tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, overflowX: 'auto', paddingBottom: 4 }}>
          {METHODS.map((m) => {
            const Icon = m.icon;
            const on = method === m.key;
            return (
              <button
                key={m.key}
                onClick={() => {
                  setMethod(m.key);
                  if (m.key === 'card') setShowCardFeePopup(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: on ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
                  background: on ? t.accentSoft : '#FFFFFF',
                  color: on ? t.accent : t.textMuted,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                <Icon size={14} /> {m.label}
              </button>
            );
          })}
        </div>

        <Panel t={t} style={{ padding: 20, marginBottom: 14 }}>
          {renderMethodContent(true)}
        </Panel>

        {/* Collapsible Summary Accordion */}
        <div onClick={() => setMintShowSummary((s) => !s)} style={{ cursor: 'pointer' }}>
          <Panel t={t} style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: t.text }}>Booking Summary & Security Benefits</span>
            <ChevronDown
              size={15}
              style={{
                transform: mintShowSummary ? 'rotate(180deg)' : 'none',
                transition: 'transform .2s',
              }}
            />
          </Panel>
          {mintShowSummary && (
            <Panel t={t} style={{ padding: 18, marginTop: 8 }}>
              {renderSummaryBlock(true)}
              <div style={{ height: 14 }} />
              <WhyPayBlock t={t} />
              <div style={{ marginTop: 12 }}>
                <AcceptedPayments t={t} />
              </div>
            </Panel>
          )}
        </div>
      </div>

      {/* Floating Bottom Pay Bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#FFFFFF',
          borderTop: `1px solid ${t.border}`,
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'center',
          zIndex: 40,
          boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ width: '100%', maxWidth: 440, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 600 }}>Total Payable</div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>₹{totalPayable.toLocaleString('en-IN')}.00</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: t.accent, fontSize: 12, fontWeight: 700 }}>
            <ShieldCheck size={16} /> 256-Bit Secured
          </div>
        </div>
      </div>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /* Render 6. MINIATURE — reversed 2-column ornate framed border     */
  /* ---------------------------------------------------------------- */
  const renderMiniature = () => (
    <div style={{ background: t.bg, fontFamily: t.body, color: t.text, padding: '24px 16px 48px', display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          width: '100%',
          maxWidth: 1000,
          border: `2px solid ${t.accent}`,
          borderRadius: t.radius,
          position: 'relative',
          padding: '24px 18px',
          background: t.panel,
        }}
      >
        <div style={{ position: 'absolute', top: 6, left: 6 }}>
          <OrnateCorner color={t.accent} />
        </div>
        <div style={{ position: 'absolute', top: 6, right: 6 }}>
          <OrnateCorner color={t.accent} rotate={90} />
        </div>
        <div style={{ position: 'absolute', bottom: 6, left: 6 }}>
          <OrnateCorner color={t.accent} rotate={-90} />
        </div>
        <div style={{ position: 'absolute', bottom: 6, right: 6 }}>
          <OrnateCorner color={t.accent} rotate={180} />
        </div>

        <div style={{ textAlign: 'center', padding: '10px 20px 18px', borderBottom: `1px solid ${t.border}`, marginBottom: 20 }}>
          <p style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.textMuted, margin: '0 0 6px', fontWeight: 700 }}>
            Kingsland Holidays · Jaipur
          </p>
          <h1 style={{ fontFamily: t.display, fontSize: 'clamp(20px, 3.5vw, 26px)', margin: '0 0 6px', letterSpacing: '0.02em' }}>
            {packageName}
          </h1>
          <p style={{ fontSize: 13, color: t.textMuted, margin: 0 }}>
            Mr./Ms. {customerName} · Amount due <strong style={{ color: t.accent }}>₹{totalPayable.toLocaleString('en-IN')}</strong>
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 24,
            padding: '0 6px',
          }}
        >
          {/* Left Column: Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Panel t={t} style={{ padding: 18 }}>
              <p style={{ fontSize: 11, letterSpacing: '0.1em', color: t.textMuted, fontWeight: 800, marginTop: 0 }}>BOOKING SUMMARY</p>
              {renderSummaryBlock()}
            </Panel>
            <Panel t={t} style={{ padding: 18 }}>
              <WhyPayBlock t={t} />
              <div style={{ marginTop: 12 }}>
                <AcceptedPayments t={t} />
              </div>
            </Panel>
          </div>

          {/* Right Column: Payment Form */}
          <Panel t={t} style={{ overflow: 'hidden' }}>
            {renderMethodTabs()}
            <div style={{ padding: 20 }}>{renderMethodContent()}</div>
          </Panel>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>


      {/* Credit Card Processing Fee Popup */}
      {showCardFeePopup && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 20,
              maxWidth: 420,
              width: '100%',
              padding: 28,
              textAlign: 'center',
              border: `2px solid ${t.accent}`,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: t.accentSoft,
                color: t.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <CreditCard size={28} />
            </div>
            <h3 style={{ fontFamily: t.display, fontSize: 20, margin: '0 0 8px', color: '#1C2B3A' }}>
              Credit Card Surcharge Notice
            </h3>
            <p style={{ fontSize: 13, color: '#5C7089', lineHeight: 1.5, margin: '0 0 20px' }}>
              Payment via Credit Card incurs a nominal gateway processing fee of <strong style={{ color: t.accent }}>{cardFeePercent}%</strong>. (UPI and Bank Transfers have ₹0 extra surcharge).
            </p>
            <button
              onClick={() => setShowCardFeePopup(false)}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: 12,
                border: 'none',
                background: t.accent,
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              I Understand & Proceed
            </button>
          </div>
        </div>
      )}

      {/* Verified Success Modal */}
      {isSuccess && confirmedDetails && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 24,
              maxWidth: 480,
              width: '100%',
              padding: 32,
              textAlign: 'center',
              border: '2px solid #10B981',
              boxShadow: '0 24px 48px rgba(0,0,0,0.25)',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#D1FAE5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <CheckCircle2 size={36} />
            </div>
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#059669' }}>
              PAYMENT SUBMITTED
            </span>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: '6px 0 16px' }}>
              ₹{confirmedDetails.amount.toLocaleString('en-IN')}.00
            </h2>
            <p style={{ fontSize: 14, color: '#4B5563', margin: '0 0 20px', fontWeight: 600 }}>
              Please wait for confirmation or connect with our expert.
            </p>

            <div style={{ background: '#F9FAFB', border: '1px dashed #D1D5DB', borderRadius: 14, padding: 16, textAlign: 'left', fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E5E7EB', paddingBottom: 8, marginBottom: 4 }}>
                <span style={{ color: '#6B7280', fontWeight: 600 }}>Payment Receipt</span>
                <strong style={{ color: '#111827' }}>#{confirmedDetails.txnId.substring(0, 8)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B7280' }}>Guest Name:</span>
                <strong style={{ color: '#111827' }}>{confirmedDetails.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B7280' }}>Package:</span>
                <strong style={{ color: '#111827' }}>{confirmedDetails.package}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B7280' }}>Transaction Ref / UTR:</span>
                <strong style={{ fontFamily: 'monospace', color: '#059669' }}>{confirmedDetails.txnId}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B7280' }}>Payment Mode:</span>
                <strong style={{ color: '#111827' }}>{confirmedDetails.mode}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6B7280' }}>Timestamp:</span>
                <strong style={{ color: '#111827' }}>{confirmedDetails.date}</strong>
              </div>
              
              <div style={{ borderTop: '1px dashed #D1D5DB', paddingTop: 8, marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6B7280', fontWeight: 600 }}>Amount Paid (Current Installment):</span>
                  <strong style={{ color: '#059669', fontSize: 14 }}>₹{confirmedDetails.amount.toLocaleString('en-IN')}.00</strong>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsSuccess(false)}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 14,
                border: 'none',
                background: '#111827',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Selected Theme Layout Render */}
      <div style={{ flex: 1 }}>
        {t.id === 'haveli' && renderHaveli()}
        {t.id === 'indigo' && renderIndigo()}
        {t.id === 'sunset' && renderSunset()}
        {t.id === 'marble' && renderMarble()}
        {t.id === 'mint' && renderMint()}
        {t.id === 'miniature' && renderMiniature()}
      </div>
    </div>
  );
};

export default PaymentPageView;
