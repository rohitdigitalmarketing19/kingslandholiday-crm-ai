import { queryOne, runQuery } from '../db/connection';
import nodemailer from 'nodemailer';

export function getAgencySettings() {
  const row = queryOne('SELECT * FROM agency_settings WHERE id = "default_agency_settings" LIMIT 1');
  if (row) {
    return {
      ...row,
      trip_id_prefix: row.trip_id_prefix || 'KL-',
      trip_id_next_number: row.trip_id_next_number !== undefined && row.trip_id_next_number !== null ? Number(row.trip_id_next_number) : 1001,
      trip_id_digits: row.trip_id_digits !== undefined && row.trip_id_digits !== null ? Number(row.trip_id_digits) : 4,
      smtp_host: row.smtp_host || 'smtp.gmail.com',
      smtp_port: row.smtp_port !== undefined && row.smtp_port !== null ? Number(row.smtp_port) : 587,
      smtp_user: row.smtp_user || 'rohit.digitalmarketing19@gmail.com',
      smtp_pass: row.smtp_pass || '',
      smtp_from_name: row.smtp_from_name || 'Kingsland Holidays'
    };
  }
  return {
    id: 'default_agency_settings',
    company_name: 'Kingsland Holidays',
    tagline: 'Desire to travel',
    phone: '+91 6376983416',
    email: 'support@kingslandholiday.com',
    website: 'kingslandholiday.com',
    gst_number: '',
    default_gst_percent: 5.0,
    place_of_supply: 'Rajasthan (08)',
    address: 'Plot No. 42, Kingsland Tower, MI Road, Jaipur, Rajasthan 302001',
    intro_about: 'Founded in 2010, we are a trusted travel agency committed to creating memorable journeys for our clients. We specialise in personalised holiday packages, guided tours, and unique travel experiences across India. Your satisfaction is our priority — let us turn your travel dreams into reality!',
    established_year: '2010',
    rating: 4.8,
    happy_customers: '5000+',
    logo_url: '',
    favicon_url: '',
    trip_id_prefix: 'KL-',
    trip_id_next_number: 1001,
    trip_id_digits: 4,
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: 'rohit.digitalmarketing19@gmail.com',
    smtp_pass: '',
    smtp_from_name: 'Kingsland Holidays',
    default_payment_terms: '50% advance to confirm the booking, balance 15 days before travel.',
    default_terms_conditions: `1. Booking and Payment: All bookings are subject to availability and confirmation. Payment as per the payment schedule.
2. Cancellation and Refunds: Cancellation charges apply as per the cancellation policy. Refunds, if applicable, are processed per our refund policy.
3. Travel Documents: Guests must carry valid photo ID and any required permits. We are not liable for loss from inadequate or expired documents.
4. Health and Safety: Participants are responsible for their health and safety and must comply with local laws and customs.
5. Limitation of Liability: We act only as a booking agent for airlines, hotels, and operators, and are not liable for their acts or omissions. Our liability is limited to the amount paid for the booking.`
  };
}

export function updateAgencySettings(data: {
  company_name?: string;
  tagline?: string;
  phone?: string;
  email?: string;
  website?: string;
  gst_number?: string;
  default_gst_percent?: number;
  place_of_supply?: string;
  address?: string;
  intro_about?: string;
  established_year?: string;
  rating?: number;
  happy_customers?: string;
  logo_url?: string;
  favicon_url?: string;
  trip_id_prefix?: string;
  trip_id_next_number?: number;
  trip_id_digits?: number;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_pass?: string;
  smtp_from_name?: string;
  default_payment_terms?: string;
  default_terms_conditions?: string;
}) {
  const now = new Date().toISOString();
  const current = getAgencySettings();
  
  const prefix = data.trip_id_prefix !== undefined ? data.trip_id_prefix.trim() : (current.trip_id_prefix || 'KL-');
  const nextNum = data.trip_id_next_number !== undefined ? Number(data.trip_id_next_number) : (current.trip_id_next_number || 1001);
  const digits = data.trip_id_digits !== undefined ? Number(data.trip_id_digits) : (current.trip_id_digits || 4);
  const smtpHost = data.smtp_host !== undefined ? data.smtp_host.trim() : (current.smtp_host || 'smtp.gmail.com');
  const smtpPort = data.smtp_port !== undefined ? Number(data.smtp_port) : (current.smtp_port || 587);
  const smtpUser = data.smtp_user !== undefined ? data.smtp_user.trim() : (current.smtp_user || 'rohit.digitalmarketing19@gmail.com');
  const smtpPass = data.smtp_pass !== undefined ? data.smtp_pass.trim() : (current.smtp_pass || '');
  const smtpFromName = data.smtp_from_name !== undefined ? data.smtp_from_name.trim() : (current.smtp_from_name || 'Kingsland Holidays');

  runQuery(
    `INSERT INTO agency_settings (
      id, company_name, tagline, phone, email, website, gst_number,
      default_gst_percent, place_of_supply, address, intro_about,
      established_year, rating, happy_customers, logo_url, favicon_url,
      trip_id_prefix, trip_id_next_number, trip_id_digits,
      smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name,
      default_payment_terms, default_terms_conditions, updated_at
    ) VALUES (
      'default_agency_settings', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
    ON CONFLICT(id) DO UPDATE SET
      company_name = excluded.company_name,
      tagline = excluded.tagline,
      phone = excluded.phone,
      email = excluded.email,
      website = excluded.website,
      gst_number = excluded.gst_number,
      default_gst_percent = excluded.default_gst_percent,
      place_of_supply = excluded.place_of_supply,
      address = excluded.address,
      intro_about = excluded.intro_about,
      established_year = excluded.established_year,
      rating = excluded.rating,
      happy_customers = excluded.happy_customers,
      logo_url = excluded.logo_url,
      favicon_url = excluded.favicon_url,
      trip_id_prefix = excluded.trip_id_prefix,
      trip_id_next_number = excluded.trip_id_next_number,
      trip_id_digits = excluded.trip_id_digits,
      smtp_host = excluded.smtp_host,
      smtp_port = excluded.smtp_port,
      smtp_user = excluded.smtp_user,
      smtp_pass = excluded.smtp_pass,
      smtp_from_name = excluded.smtp_from_name,
      default_payment_terms = excluded.default_payment_terms,
      default_terms_conditions = excluded.default_terms_conditions,
      updated_at = excluded.updated_at`,
    [
      data.company_name || 'Kingsland Holidays',
      data.tagline || '',
      data.phone || '',
      data.email || '',
      data.website || '',
      data.gst_number || '',
      Number(data.default_gst_percent) || 5.0,
      data.place_of_supply || 'Rajasthan (08)',
      data.address || '',
      data.intro_about || '',
      data.established_year || '2010',
      Number(data.rating) || 4.8,
      data.happy_customers || '5000+',
      data.logo_url || '',
      data.favicon_url || '',
      prefix,
      nextNum,
      digits,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpFromName,
      data.default_payment_terms || '',
      data.default_terms_conditions || '',
      now
    ]
  );

  return getAgencySettings();
}

export async function testSmtpConnection(params: {
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_pass?: string;
  smtp_from_name?: string;
  to_email: string;
}) {
  const settings = getAgencySettings();
  const host = (params.smtp_host || settings.smtp_host || process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = Number(params.smtp_port || settings.smtp_port || process.env.SMTP_PORT || 587);
  const user = (params.smtp_user || settings.smtp_user || process.env.SMTP_USER || process.env.EMAIL_USER || 'rohit.digitalmarketing19@gmail.com').trim();
  const rawPass = params.smtp_pass !== undefined ? params.smtp_pass : (settings.smtp_pass || process.env.SMTP_PASS || process.env.EMAIL_PASS || '');
  const pass = rawPass.replace(/\s+/g, '');
  const fromName = params.smtp_from_name || settings.smtp_from_name || 'Kingsland Holidays';

  if (!user || !pass) {
    throw new Error('SMTP Username or Gmail App Password is missing. Please enter your Gmail address and 16-digit App Password in Settings.');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });

  // Verify connection first
  await transporter.verify();

  // Send a test verification email
  const info = await transporter.sendMail({
    from: `"${fromName}" <${user}>`,
    to: params.to_email,
    subject: `🧪 Test Email from Kingsland Holidays CRM`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background-color: #ffffff; color: #0f172a;">
        <h2 style="color: #4f46e5; margin-top: 0;">✅ SMTP Connection Verified!</h2>
        <p style="color: #334155; font-size: 14px;">Your Kingsland Holidays CRM email sending configuration is active and working properly.</p>
        <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 12px; margin: 16px 0; font-size: 12px; color: #64748b;">
          <div><strong>SMTP Host:</strong> ${host}:${port}</div>
          <div><strong>Sender Account:</strong> ${user}</div>
          <div><strong>Timestamp:</strong> ${new Date().toLocaleString()}</div>
        </div>
        <p style="font-size: 12px; color: #94a3b8;">Emails for login links, OTP security codes, and new user credentials will be delivered reliably from this account.</p>
      </div>
    `
  });

  return {
    success: true,
    message: `Test email sent successfully to ${params.to_email}! Message ID: ${info.messageId}`
  };
}

/**
 * Helper to generate the next sequential Trip ID using current agency format settings
 */
export function generateNextTripId(): string {
  const settings = getAgencySettings();
  const prefix = settings.trip_id_prefix || 'KL-';
  const minDigits = settings.trip_id_digits || 4;
  let nextNum = Number(settings.trip_id_next_number) || 1001;

  // Check leads table for highest sequence with this prefix to prevent duplicates
  const allMatching = queryOne(
    `SELECT trip_id FROM leads WHERE trip_id LIKE ? ORDER BY length(trip_id) DESC, trip_id DESC LIMIT 10`,
    [`${prefix}%`]
  );

  if (allMatching && allMatching.trip_id) {
    const rawSuffix = allMatching.trip_id.slice(prefix.length);
    const parsedNum = parseInt(rawSuffix, 10);
    if (!isNaN(parsedNum) && parsedNum >= nextNum) {
      nextNum = parsedNum + 1;
    }
  }

  // Format with minimum padding
  const formattedNum = String(nextNum).padStart(minDigits, '0');
  const generatedTripId = `${prefix}${formattedNum}`;

  // Advance next number in DB
  runQuery(
    `UPDATE agency_settings SET trip_id_next_number = ? WHERE id = 'default_agency_settings'`,
    [nextNum + 1]
  );

  return generatedTripId;
}

