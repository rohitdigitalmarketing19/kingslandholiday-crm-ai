import { execSql } from './connection';

export function initializeDatabase(): void {
  // sql.js doesn't support multiple statements in one exec, so we split them
  const statements = [
    `CREATE TABLE IF NOT EXISTS agents (id TEXT PRIMARY KEY, name TEXT NOT NULL, specialty TEXT NOT NULL DEFAULT '[]', avatar TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, trip_id TEXT NOT NULL UNIQUE, name TEXT NOT NULL, phone TEXT DEFAULT '', email TEXT DEFAULT '', raw_inquiry TEXT DEFAULT '', summary TEXT DEFAULT '', score INTEGER DEFAULT 50, intent TEXT DEFAULT 'Information Seeking', destination TEXT DEFAULT '', budget_tier TEXT DEFAULT 'Mid', assigned_to TEXT DEFAULT '', source TEXT DEFAULT 'Website Form', status TEXT DEFAULT 'New', travel_date TEXT DEFAULT '', duration_days INTEGER DEFAULT 7, adults INTEGER DEFAULT 2, children INTEGER DEFAULT 0, child_ages TEXT DEFAULT '[]', other_info TEXT DEFAULT '', include_stay TEXT DEFAULT 'Yes', include_flight TEXT DEFAULT 'No', include_cab TEXT DEFAULT 'Yes', hotel_category TEXT DEFAULT '4/3 Star', english_driver INTEGER DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')), last_follow_up TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS quotes (id TEXT PRIMARY KEY, lead_id TEXT NOT NULL, package_title TEXT DEFAULT '', final_selling_price REAL DEFAULT 0, visa_cost REAL DEFAULT 0, flight_cost REAL DEFAULT 0, land_package_cost REAL DEFAULT 0, marketing_fees REAL DEFAULT 0, discount_percentage REAL DEFAULT 0, nights INTEGER DEFAULT 6, hotels_not_included INTEGER DEFAULT 0, flights_not_included INTEGER DEFAULT 0, cabs_not_included INTEGER DEFAULT 0, flight_details TEXT DEFAULT '', cab_details TEXT DEFAULT '', other_inclusions TEXT DEFAULT '', other_exclusions TEXT DEFAULT '', terms_and_conditions TEXT DEFAULT '', use_default_tc INTEGER DEFAULT 1, other_information TEXT DEFAULT '', working_agent_id TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS quote_hotels (id INTEGER PRIMARY KEY AUTOINCREMENT, quote_id TEXT NOT NULL, hotel_name TEXT DEFAULT '', city TEXT DEFAULT '', category TEXT DEFAULT '4 Star', room_type TEXT DEFAULT 'Standard Room', comments TEXT DEFAULT '', nights INTEGER DEFAULT 1, selected_night_indices TEXT DEFAULT '[]', sort_order INTEGER DEFAULT 0, FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS quote_inclusions (id INTEGER PRIMARY KEY AUTOINCREMENT, quote_id TEXT NOT NULL, category TEXT NOT NULL, sub_category TEXT DEFAULT NULL, included INTEGER DEFAULT 0, comments TEXT DEFAULT '', FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS quote_itinerary_days (id INTEGER PRIMARY KEY AUTOINCREMENT, quote_id TEXT NOT NULL, day_number INTEGER NOT NULL, title TEXT DEFAULT '', description TEXT DEFAULT '', FOREIGN KEY (quote_id) REFERENCES quotes(id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS lead_notes (id TEXT PRIMARY KEY, lead_id TEXT NOT NULL, text TEXT NOT NULL, type TEXT DEFAULT 'Note', timestamp TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS itinerary_templates (id TEXT PRIMARY KEY, title TEXT NOT NULL, destination TEXT NOT NULL, nights INTEGER DEFAULT 6, template_data TEXT DEFAULT '{}', created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS payment_links (id TEXT PRIMARY KEY, pay_key TEXT NOT NULL UNIQUE, lead_id TEXT DEFAULT '', package_name TEXT DEFAULT '', amount REAL DEFAULT 0, gst REAL DEFAULT 0, fee REAL DEFAULT 0, discount REAL DEFAULT 0, net_amount REAL DEFAULT 0, customer_name TEXT DEFAULT '', customer_phone TEXT DEFAULT '', duration TEXT DEFAULT '', hotels TEXT DEFAULT '', travelers TEXT DEFAULT '', status TEXT DEFAULT 'Pending', created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS payment_submissions (id TEXT PRIMARY KEY, pay_key TEXT DEFAULT '', lead_id TEXT DEFAULT '', customer_name TEXT DEFAULT '', mobile TEXT DEFAULT '', package_name TEXT DEFAULT '', amount_paid REAL DEFAULT 0, utr_number TEXT DEFAULT '', payment_mode TEXT DEFAULT 'UPI', receipt_url TEXT DEFAULT '', verification_status TEXT DEFAULT 'Pending Review', created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS payment_settings (id INTEGER PRIMARY KEY AUTOINCREMENT, key_id TEXT DEFAULT '', key_secret TEXT DEFAULT '', upi_id TEXT DEFAULT '', upi_payee TEXT DEFAULT '', bank_name TEXT DEFAULT '', bank_acc_num TEXT DEFAULT '', bank_ifsc TEXT DEFAULT '', bank_branch TEXT DEFAULT '', bank_acc_name TEXT DEFAULT '', support_phone TEXT DEFAULT '', card_fee_percentage REAL DEFAULT 2.5)`,
    `CREATE TABLE IF NOT EXISTS payment_installments (id TEXT PRIMARY KEY, lead_id TEXT NOT NULL, title TEXT NOT NULL, amount REAL DEFAULT 0, due_date TEXT DEFAULT '', payment_condition TEXT DEFAULT '', payment_status TEXT DEFAULT 'Pending', paid_amount REAL DEFAULT 0, pay_key TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE)`,
    `CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)`,
    `CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to)`,
    `CREATE INDEX IF NOT EXISTS idx_leads_trip_id ON leads(trip_id)`,
    `CREATE INDEX IF NOT EXISTS idx_quotes_lead_id ON quotes(lead_id)`,
    `CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON lead_notes(lead_id)`,
    `CREATE INDEX IF NOT EXISTS idx_quote_hotels_quote_id ON quote_hotels(quote_id)`,
    `CREATE INDEX IF NOT EXISTS idx_quote_inclusions_quote_id ON quote_inclusions(quote_id)`,
    `CREATE INDEX IF NOT EXISTS idx_quote_itinerary_quote_id ON quote_itinerary_days(quote_id)`,
    `CREATE INDEX IF NOT EXISTS idx_payment_links_pay_key ON payment_links(pay_key)`,
    `CREATE INDEX IF NOT EXISTS idx_payment_submissions_lead_id ON payment_submissions(lead_id)`,
    `CREATE INDEX IF NOT EXISTS idx_payment_installments_lead_id ON payment_installments(lead_id)`,
    `CREATE TABLE IF NOT EXISTS ops_customers (id TEXT PRIMARY KEY, booking_id TEXT NOT NULL UNIQUE, name TEXT NOT NULL, email TEXT DEFAULT '', phone TEXT DEFAULT '', destination TEXT DEFAULT '', start_date TEXT DEFAULT '', end_date TEXT DEFAULT '', pax_adults INTEGER DEFAULT 2, pax_children INTEGER DEFAULT 0, total_amount REAL DEFAULT 0, currency TEXT DEFAULT 'INR', assigned_ops_manager TEXT DEFAULT '', status TEXT DEFAULT 'Upcoming', notes TEXT DEFAULT '', special_requests TEXT DEFAULT '', emergency_contact TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS ops_customer_installments (id TEXT PRIMARY KEY, customer_id TEXT NOT NULL, installment_number INTEGER NOT NULL, title TEXT NOT NULL, amount REAL DEFAULT 0, due_date TEXT DEFAULT '', status TEXT DEFAULT 'Pending', paid_at TEXT DEFAULT '', payment_mode TEXT DEFAULT '', transaction_ref TEXT DEFAULT '', notes TEXT DEFAULT '', FOREIGN KEY (customer_id) REFERENCES ops_customers(id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS ops_vouchers (id TEXT PRIMARY KEY, booking_id TEXT NOT NULL, customer_id TEXT NOT NULL, customer_name TEXT DEFAULT '', hotel_name TEXT DEFAULT '', city TEXT DEFAULT '', check_in TEXT DEFAULT '', check_out TEXT DEFAULT '', nights INTEGER DEFAULT 1, room_type TEXT DEFAULT '', meal_plan TEXT DEFAULT '', supplier_name TEXT DEFAULT '', confirmation_number TEXT DEFAULT '', status TEXT DEFAULT 'Pending', due_date TEXT DEFAULT '', file_url TEXT DEFAULT '', file_name TEXT DEFAULT '', uploaded_at TEXT DEFAULT '', uploaded_by TEXT DEFAULT '', urgency TEXT DEFAULT 'Medium', created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (customer_id) REFERENCES ops_customers(id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS ops_itineraries (id TEXT PRIMARY KEY, booking_id TEXT NOT NULL UNIQUE, customer_id TEXT NOT NULL, customer_name TEXT DEFAULT '', destination TEXT DEFAULT '', start_date TEXT DEFAULT '', end_date TEXT DEFAULT '', readiness_air_tickets INTEGER DEFAULT 0, readiness_hotel_vouchers INTEGER DEFAULT 0, readiness_cab_assigned INTEGER DEFAULT 0, readiness_briefing_completed INTEGER DEFAULT 0, feedback_score INTEGER DEFAULT 0, feedback_comment TEXT DEFAULT '', review_collected INTEGER DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (customer_id) REFERENCES ops_customers(id) ON DELETE CASCADE)`,
    `CREATE TABLE IF NOT EXISTS ops_daily_activities (id TEXT PRIMARY KEY, itinerary_id TEXT NOT NULL, day_number INTEGER NOT NULL, day_date TEXT DEFAULT '', day_title TEXT DEFAULT '', time_slot TEXT DEFAULT '', title TEXT DEFAULT '', description TEXT DEFAULT '', location TEXT DEFAULT '', driver_name TEXT DEFAULT '', driver_phone TEXT DEFAULT '', cab_model TEXT DEFAULT '', cab_number TEXT DEFAULT '', guide_name TEXT DEFAULT '', guide_phone TEXT DEFAULT '', voucher_ref TEXT DEFAULT '', status TEXT DEFAULT 'Pending', notes TEXT DEFAULT '', FOREIGN KEY (itinerary_id) REFERENCES ops_itineraries(id) ON DELETE CASCADE)`,
    `CREATE INDEX IF NOT EXISTS idx_ops_customers_status ON ops_customers(status)`,
    `CREATE INDEX IF NOT EXISTS idx_ops_vouchers_status ON ops_vouchers(status)`,
    `CREATE INDEX IF NOT EXISTS idx_ops_vouchers_customer ON ops_vouchers(customer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ops_itineraries_customer ON ops_itineraries(customer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ops_activities_itinerary ON ops_daily_activities(itinerary_id)`,
    `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, phone TEXT DEFAULT '', role TEXT NOT NULL DEFAULT 'Sales', department TEXT DEFAULT 'Sales', status TEXT DEFAULT 'Active', permissions TEXT DEFAULT '[]', avatar TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')))`
  ];

  for (const sql of statements) {
    try {
      execSql(sql);
    } catch (_e) {
      // Ignore error if column already exists
    }
  }

  // Safe Column Migrations for ops_customers, payment_links, payment_installments
  const migrations = [
    `ALTER TABLE ops_customers ADD COLUMN driver_name TEXT DEFAULT ''`,
    `ALTER TABLE ops_customers ADD COLUMN driver_phone TEXT DEFAULT ''`,
    `ALTER TABLE ops_customers ADD COLUMN cab_model TEXT DEFAULT ''`,
    `ALTER TABLE ops_customers ADD COLUMN cab_number TEXT DEFAULT ''`,
    `ALTER TABLE ops_customers ADD COLUMN cab_pickup_location TEXT DEFAULT ''`,
    `ALTER TABLE ops_customers ADD COLUMN hotel_total_cost REAL DEFAULT 0`,
    `ALTER TABLE ops_customers ADD COLUMN hotel_payment_status TEXT DEFAULT 'Pending'`,
    `ALTER TABLE ops_customers ADD COLUMN hotel_payment_amount REAL DEFAULT 0`,
    `ALTER TABLE ops_customers ADD COLUMN hotel_payment_date TEXT DEFAULT ''`,
    `ALTER TABLE ops_customers ADD COLUMN hotel_payment_mode TEXT DEFAULT ''`,
    `ALTER TABLE ops_customers ADD COLUMN hotel_payment_ref TEXT DEFAULT ''`,
    `ALTER TABLE ops_customers ADD COLUMN hotel_payment_remarks TEXT DEFAULT ''`,
    `ALTER TABLE ops_customers ADD COLUMN cab_total_cost REAL DEFAULT 0`,
    `ALTER TABLE ops_customers ADD COLUMN cab_payment_status TEXT DEFAULT 'Pending'`,
    `ALTER TABLE ops_customers ADD COLUMN cab_payment_amount REAL DEFAULT 0`,
    `ALTER TABLE ops_customers ADD COLUMN cab_payment_date TEXT DEFAULT ''`,
    `ALTER TABLE ops_customers ADD COLUMN cab_payment_mode TEXT DEFAULT ''`,
    `ALTER TABLE ops_customers ADD COLUMN cab_payment_ref TEXT DEFAULT ''`,
    `ALTER TABLE ops_customers ADD COLUMN cab_payment_remarks TEXT DEFAULT ''`,
    `ALTER TABLE ops_customers ADD COLUMN ops_remarks TEXT DEFAULT ''`,
    `ALTER TABLE payment_links ADD COLUMN destination TEXT DEFAULT ''`,
    `ALTER TABLE payment_links ADD COLUMN travel_date TEXT DEFAULT ''`,
    `ALTER TABLE payment_links ADD COLUMN adults INTEGER DEFAULT 2`,
    `ALTER TABLE payment_links ADD COLUMN children INTEGER DEFAULT 0`,
    `ALTER TABLE payment_links ADD COLUMN customer_email TEXT DEFAULT ''`,
    `ALTER TABLE payment_links ADD COLUMN transaction_ref TEXT DEFAULT ''`,
    `ALTER TABLE payment_links ADD COLUMN payment_mode TEXT DEFAULT ''`,
    `ALTER TABLE payment_links ADD COLUMN paid_amount REAL DEFAULT 0`,
    `ALTER TABLE payment_links ADD COLUMN paid_at TEXT DEFAULT ''`,
    `ALTER TABLE payment_installments ADD COLUMN paid_at TEXT DEFAULT ''`,
    `ALTER TABLE payment_installments ADD COLUMN payment_mode TEXT DEFAULT ''`,
    `ALTER TABLE payment_installments ADD COLUMN transaction_ref TEXT DEFAULT ''`,
    `ALTER TABLE payment_installments ADD COLUMN comments TEXT DEFAULT ''`,
    `ALTER TABLE payment_installments ADD COLUMN notes TEXT DEFAULT ''`,
    `ALTER TABLE payment_submissions ADD COLUMN comments TEXT DEFAULT ''`,
    `ALTER TABLE payment_submissions ADD COLUMN notes TEXT DEFAULT ''`,
    `ALTER TABLE payment_links ADD COLUMN comments TEXT DEFAULT ''`,
    `ALTER TABLE payment_links ADD COLUMN notes TEXT DEFAULT ''`,
    `ALTER TABLE leads ADD COLUMN postponed_date TEXT DEFAULT ''`,
    `ALTER TABLE leads ADD COLUMN postponed_reason TEXT DEFAULT ''`,
    `ALTER TABLE leads ADD COLUMN follow_up_date TEXT DEFAULT ''`,
    `ALTER TABLE leads ADD COLUMN follow_up_time TEXT DEFAULT ''`,
    `ALTER TABLE leads ADD COLUMN follow_up_type TEXT DEFAULT 'Call'`,
    `ALTER TABLE leads ADD COLUMN follow_up_note TEXT DEFAULT ''`,
    `ALTER TABLE leads ADD COLUMN follow_up_completed INTEGER DEFAULT 0`,
    `ALTER TABLE leads ADD COLUMN accounts_remarks TEXT DEFAULT ''`,
    `ALTER TABLE leads ADD COLUMN review_requested_at TEXT DEFAULT ''`,
    `ALTER TABLE leads ADD COLUMN review_channel TEXT DEFAULT ''`,
    `ALTER TABLE ops_customers ADD COLUMN hotel_payments_json TEXT DEFAULT '[]'`,
    `ALTER TABLE ops_customers ADD COLUMN accounts_remarks TEXT DEFAULT ''`,
    `ALTER TABLE ops_customers ADD COLUMN review_requested_at TEXT DEFAULT ''`,
    `ALTER TABLE ops_customers ADD COLUMN review_channel TEXT DEFAULT ''`,
    `ALTER TABLE ops_vouchers ADD COLUMN total_cost REAL DEFAULT 0`,
    `ALTER TABLE ops_vouchers ADD COLUMN paid_amount REAL DEFAULT 0`,
    `ALTER TABLE ops_vouchers ADD COLUMN paid_at TEXT DEFAULT ''`,
    `ALTER TABLE ops_vouchers ADD COLUMN payment_mode TEXT DEFAULT ''`,
    `ALTER TABLE ops_vouchers ADD COLUMN payment_ref TEXT DEFAULT ''`,
    `ALTER TABLE ops_vouchers ADD COLUMN payment_remarks TEXT DEFAULT ''`,
    `ALTER TABLE ops_vouchers ADD COLUMN payment_status TEXT DEFAULT 'Pending'`,
    `ALTER TABLE ops_vouchers ADD COLUMN payment_logs_json TEXT DEFAULT '[]'`,
    `ALTER TABLE ops_customers ADD COLUMN cab_payment_logs_json TEXT DEFAULT '[]'`,
    `ALTER TABLE users ADD COLUMN access_level TEXT DEFAULT 'Editor'`,
    `ALTER TABLE users ADD COLUMN password TEXT DEFAULT 'kingsland123'`,
    `CREATE TABLE IF NOT EXISTS masters_data (id TEXT PRIMARY KEY, category TEXT NOT NULL, name TEXT NOT NULL, code TEXT DEFAULT '', description TEXT DEFAULT '', is_enabled INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE INDEX IF NOT EXISTS idx_masters_category ON masters_data(category)`,
    `CREATE TABLE IF NOT EXISTS pdf_designs (id TEXT PRIMARY KEY, title TEXT NOT NULL, theme_preset TEXT DEFAULT 'minimal_dark', primary_color TEXT DEFAULT '#c6f135', secondary_color TEXT DEFAULT '#161713', header_banner_url TEXT DEFAULT '', agency_stamp_url TEXT DEFAULT '', signature_url TEXT DEFAULT '', watermark_text TEXT DEFAULT 'KINGSLAND HOLIDAYS', font_family TEXT DEFAULT 'Inter', cover_style TEXT DEFAULT 'Modern Grid', is_active INTEGER DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS agency_settings (
      id TEXT PRIMARY KEY DEFAULT 'default_agency_settings',
      company_name TEXT DEFAULT 'Kingsland Holidays',
      tagline TEXT DEFAULT 'Desire to travel',
      phone TEXT DEFAULT '+91 6376983416',
      email TEXT DEFAULT 'support@kingslandholiday.com',
      website TEXT DEFAULT 'kingslandholiday.com',
      gst_number TEXT DEFAULT '',
      default_gst_percent REAL DEFAULT 5.00,
      place_of_supply TEXT DEFAULT 'Rajasthan (08)',
      address TEXT DEFAULT 'Plot No. 42, Kingsland Tower, MI Road, Jaipur, Rajasthan 302001',
      intro_about TEXT DEFAULT 'Founded in 2010, we are a trusted travel agency committed to creating memorable journeys for our clients. We specialise in personalised holiday packages, guided tours, and unique travel experiences across India and abroad. Your satisfaction is our priority — let us turn your travel dreams into reality!',
      established_year TEXT DEFAULT '2010',
      rating REAL DEFAULT 4.8,
      happy_customers TEXT DEFAULT '5000+',
      logo_url TEXT DEFAULT '',
      favicon_url TEXT DEFAULT '',
      default_payment_terms TEXT DEFAULT '50% advance to confirm the booking, balance 15 days before travel.',
      default_terms_conditions TEXT DEFAULT '1. Booking and Payment: All bookings are subject to availability and confirmation. Payment as per the payment schedule.\n2. Cancellation and Refunds: Cancellation charges apply as per the cancellation policy. Refunds, if applicable, are processed per our refund policy.\n3. Travel Documents: Guests must carry valid photo ID and any required permits. We are not liable for loss from inadequate or expired documents.\n4. Health and Safety: Participants are responsible for their health and safety and must comply with local laws and customs.\n5. Limitation of Liability: We act only as a booking agent for airlines, hotels, and operators, and are not liable for their acts or omissions. Our liability is limited to the amount paid for the booking.\n\nCancellation Policy (Land Package):\n- >30 days before travel: 25% cancellation fees\n- 16-30 days before travel: 40% cancellation fees\n- 7-15 days before travel: 55% cancellation fees\n- 3-6 days before travel: 70% cancellation fees\n- 0-2 days before travel / No Show: 100% cancellation fees\n- Non-refundable during peak periods (Diwali, Christmas, New Year, Long Weekends).',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `ALTER TABLE agency_settings ADD COLUMN favicon_url TEXT DEFAULT ''`,
    `ALTER TABLE agency_settings ADD COLUMN trip_id_prefix TEXT DEFAULT 'KL-'`,
    `ALTER TABLE agency_settings ADD COLUMN trip_id_next_number INTEGER DEFAULT 1001`,
    `ALTER TABLE agency_settings ADD COLUMN trip_id_digits INTEGER DEFAULT 4`,
    `ALTER TABLE agency_settings ADD COLUMN smtp_host TEXT DEFAULT 'smtp.gmail.com'`,
    `ALTER TABLE agency_settings ADD COLUMN smtp_port INTEGER DEFAULT 587`,
    `ALTER TABLE agency_settings ADD COLUMN smtp_user TEXT DEFAULT 'rohit.digitalmarketing19@gmail.com'`,
    `ALTER TABLE agency_settings ADD COLUMN smtp_pass TEXT DEFAULT ''`,
    `ALTER TABLE agency_settings ADD COLUMN smtp_from_name TEXT DEFAULT 'Kingsland Holidays'`,
    `ALTER TABLE pdf_designs ADD COLUMN pdf_file_data TEXT DEFAULT ''`,
    `ALTER TABLE pdf_designs ADD COLUMN page_count INTEGER DEFAULT 0`,
    `ALTER TABLE pdf_designs ADD COLUMN field_mappings TEXT DEFAULT '[]'`
  ];

  for (const mSql of migrations) {
    try {
      execSql(mSql);
    } catch (_e) {
      // Column or table already exists
    }
  }

  // Seed default Masters data if empty
  try {
    const defaultMasters = [
      // Destinations
      { id: 'dest-1', category: 'Destinations', name: 'Rajasthan' },
      { id: 'dest-2', category: 'Destinations', name: 'Sikkim' },
      { id: 'dest-3', category: 'Destinations', name: 'Darjeeling' },
      { id: 'dest-4', category: 'Destinations', name: 'Himachal' },
      { id: 'dest-5', category: 'Destinations', name: 'Kashmir' },
      { id: 'dest-6', category: 'Destinations', name: 'Goa' },
      { id: 'dest-7', category: 'Destinations', name: 'Kerala' },
      { id: 'dest-8', category: 'Destinations', name: 'Dubai' },
      { id: 'dest-9', category: 'Destinations', name: 'Bali' },
      { id: 'dest-10', category: 'Destinations', name: 'Maldives' },
      { id: 'dest-11', category: 'Destinations', name: 'Thailand' },
      { id: 'dest-12', category: 'Destinations', name: 'Vietnam' },
      // Hotel Categories
      { id: 'cat-1', category: 'Hotel Categories', name: '5 Star Luxury' },
      { id: 'cat-2', category: 'Hotel Categories', name: '4 Star Premium' },
      { id: 'cat-3', category: 'Hotel Categories', name: '3 Star Deluxe' },
      { id: 'cat-4', category: 'Hotel Categories', name: 'Heritage Haveli / Palace' },
      { id: 'cat-5', category: 'Hotel Categories', name: 'Boutique Nature Resort' },
      { id: 'cat-6', category: 'Hotel Categories', name: 'Luxury Glamping / Camp' },
      // Room Types
      { id: 'room-1', category: 'Room Types', name: 'Standard Room' },
      { id: 'room-2', category: 'Room Types', name: 'Deluxe Room' },
      { id: 'room-3', category: 'Room Types', name: 'Super Deluxe Room' },
      { id: 'room-4', category: 'Room Types', name: 'Executive Suite' },
      { id: 'room-5', category: 'Room Types', name: 'Pool Villa' },
      { id: 'room-6', category: 'Room Types', name: 'Family Suite (Quad)' },
      // Meal Plans
      { id: 'meal-1', category: 'Meal Plans', name: 'EP (European Plan - Room Only)' },
      { id: 'meal-2', category: 'Meal Plans', name: 'CP (Continental Plan - Room + Breakfast)' },
      { id: 'meal-3', category: 'Meal Plans', name: 'MAP (Modified American - Breakfast + Dinner)' },
      { id: 'meal-4', category: 'Meal Plans', name: 'AP (American Plan - All 3 Meals)' },
      // Transport Modes
      { id: 'trans-1', category: 'Transport Modes', name: 'Sedan (Dzire / Etios / Amaze - 4 Pax)' },
      { id: 'trans-2', category: 'Transport Modes', name: 'SUV (Innova Crysta - 6 Pax)' },
      { id: 'trans-3', category: 'Transport Modes', name: 'Tempo Traveller (12 to 17 Seater)' },
      { id: 'trans-4', category: 'Transport Modes', name: 'Luxury Urbania Coach' },
      { id: 'trans-5', category: 'Transport Modes', name: 'Self-Drive Vehicle' },
      // Tax Rates
      { id: 'tax-1', category: 'Tax Rates', name: '5% GST on Tour Package (Without ITC)' },
      { id: 'tax-2', category: 'Tax Rates', name: '18% GST on Standalone Service Fees' },
      { id: 'tax-3', category: 'Tax Rates', name: '12% Hotel Accommodation GST' },
      { id: 'tax-4', category: 'Tax Rates', name: '0% Exempt / Out of Scope' },
    ];

    for (const m of defaultMasters) {
      try {
        execSql(`INSERT OR IGNORE INTO masters_data (id, category, name, is_enabled, sort_order) VALUES ('${m.id}', '${m.category}', '${m.name.replace(/'/g, "''")}', 1, 0)`);
      } catch (_e) {}
    }
  } catch (_e) {}

  // Seed & Update default PDF designs with correct theme colors
  try {
    execSql(`INSERT OR IGNORE INTO pdf_designs (id, title, theme_preset, primary_color, secondary_color, watermark_text, cover_style, font_family, is_active)
      VALUES ('design-royal-gold', 'Royal Heritage & Gold', 'royal_gold', '#d4af37', '#1e1b18', 'KINGSLAND HOLIDAYS', 'Classic Serif', 'Playfair Display', 1)`);
    execSql(`INSERT OR IGNORE INTO pdf_designs (id, title, theme_preset, primary_color, secondary_color, watermark_text, cover_style, font_family, is_active)
      VALUES ('design-dark-luxury', 'Executive Matte Dark & Lime', 'minimal_dark', '#c6f135', '#161713', 'KINGSLAND HOLIDAYS', 'Modern Grid', 'Outfit', 0)`);
    execSql(`INSERT OR IGNORE INTO pdf_designs (id, title, theme_preset, primary_color, secondary_color, watermark_text, cover_style, font_family, is_active)
      VALUES ('design-royal-burgundy', 'Royal Burgundy & Gold', 'royal_burgundy', '#e11d48', '#881337', 'KINGSLAND HOLIDAYS', 'Classic Serif', 'Cinzel', 0)`);
    execSql(`INSERT OR IGNORE INTO pdf_designs (id, title, theme_preset, primary_color, secondary_color, watermark_text, cover_style, font_family, is_active)
      VALUES ('design-emerald-alpine', 'Alpine Emerald Clean', 'emerald_alpine', '#059669', '#064e3b', 'KINGSLAND HOLIDAYS', 'Split Minimal', 'Inter', 0)`);

    // Ensure existing rows get vibrant theme colors
    execSql(`UPDATE pdf_designs SET primary_color = '#d4af37', secondary_color = '#1e1b18', font_family = 'Playfair Display', theme_preset = 'royal_gold' WHERE LOWER(title) LIKE '%royal heritage%' OR (LOWER(title) LIKE '%gold%' AND LOWER(title) NOT LIKE '%burgundy%')`);
    execSql(`UPDATE pdf_designs SET primary_color = '#e11d48', secondary_color = '#881337', font_family = 'Cinzel', theme_preset = 'royal_burgundy' WHERE LOWER(title) LIKE '%burgundy%'`);
    execSql(`UPDATE pdf_designs SET primary_color = '#059669', secondary_color = '#064e3b', font_family = 'Inter', theme_preset = 'emerald_alpine' WHERE LOWER(title) LIKE '%emerald%' OR LOWER(title) LIKE '%alpine%'`);
  } catch (_e) {}

  // Seed default agency settings
  try {
    execSql(`INSERT OR IGNORE INTO agency_settings (id, company_name, tagline, phone, email, website, default_gst_percent, place_of_supply)
      VALUES ('default_agency_settings', 'Kingsland Holidays', 'Desire to travel', '+91 6376983416', 'support@kingslandholiday.com', 'kingslandholiday.com', 5.0, 'Rajasthan (08)')`);
  } catch (_e) {}


  // Clean up any legacy demo users from past seeds
  try {
    execSql(`DELETE FROM users WHERE id IN ('usr-sales-1', 'usr-ops-1', 'usr-acc-1') OR LOWER(email) IN ('sarah.sales@kingslandholidays.com', 'vikram.ops@kingslandholidays.com', 'accounts.kingsland@gmail.com')`);
  } catch (_e) {}

  console.log('✅ Database schema & migrations initialized.');
}
