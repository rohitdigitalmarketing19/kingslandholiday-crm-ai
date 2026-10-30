import { initializeWorkflowSecurity } from './workflowSecurity';
import { migrateHotelRateSeasons } from './hotelRateSeasonsMigration';
import { execSql, getDb, withDbPersistenceBatch } from './connection';

export function initializeDatabase(): void {
  withDbPersistenceBatch(()=>{
    const db=getDb();db.run('BEGIN');
    try {initializeDatabaseSchema();db.run('COMMIT');}
    catch(error){db.run('ROLLBACK');throw error;}
  });
}
function initializeDatabaseSchema(): void {
  // sql.js doesn't support multiple statements in one exec, so we split them
  const statements = [
    `CREATE TABLE IF NOT EXISTS hotel_rates (id TEXT PRIMARY KEY, name TEXT NOT NULL, city TEXT NOT NULL, category TEXT NOT NULL, seasonal_paise INTEGER NOT NULL CHECK(seasonal_paise >= 0), blackout_paise INTEGER NOT NULL CHECK(blackout_paise >= 0), blackout_dates TEXT NOT NULL DEFAULT '[]', pdf_name TEXT NOT NULL DEFAULT '', pdf_data TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL, updated_by TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS hotel_rate_history (id TEXT PRIMARY KEY, hotel_id TEXT NOT NULL REFERENCES hotel_rates(id), actor TEXT NOT NULL, created_at TEXT NOT NULL, before_data TEXT NOT NULL, after_data TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS agents (id TEXT PRIMARY KEY, name TEXT NOT NULL, specialty TEXT NOT NULL DEFAULT '[]', avatar TEXT DEFAULT '', phone TEXT DEFAULT '', email TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
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

  migrateHotelRateSeasons();

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
    `ALTER TABLE pdf_designs ADD COLUMN field_mappings TEXT DEFAULT '[]'`,
    `ALTER TABLE agents ADD COLUMN phone TEXT DEFAULT ''`,
    `ALTER TABLE agents ADD COLUMN email TEXT DEFAULT ''`,
    `ALTER TABLE quotes ADD COLUMN hotel_alternative TEXT DEFAULT NULL`,
    `ALTER TABLE quote_hotels ADD COLUMN meal_plan TEXT DEFAULT ''`,
    `ALTER TABLE quotes ADD COLUMN cover_image TEXT DEFAULT ''`,
    `ALTER TABLE quotes ADD COLUMN day_images TEXT DEFAULT '[]'`,
    `ALTER TABLE quote_itinerary_days ADD COLUMN image_url TEXT DEFAULT ''`,
    `CREATE TABLE IF NOT EXISTS destination_photos (id TEXT PRIMARY KEY, city TEXT NOT NULL, title TEXT DEFAULT '', image_url TEXT NOT NULL, tags TEXT DEFAULT '', is_default INTEGER DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE INDEX IF NOT EXISTS idx_dest_photos_city ON destination_photos(city)`,
    `CREATE TABLE IF NOT EXISTS partner_brands (id TEXT PRIMARY KEY, category TEXT NOT NULL DEFAULT 'hotel', name TEXT NOT NULL, tagline TEXT DEFAULT '', brand_color TEXT DEFAULT '#b8860b', logo_url TEXT DEFAULT '', svg_icon TEXT DEFAULT '', is_active INTEGER DEFAULT 1, sort_order INTEGER DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE INDEX IF NOT EXISTS idx_partner_brands_cat ON partner_brands(category)`,
    `CREATE TABLE IF NOT EXISTS pdf_themes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      festival TEXT DEFAULT '',
      type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      start_date TEXT DEFAULT '',
      end_date TEXT DEFAULT '',
      is_default INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      version TEXT DEFAULT '1.0.0',
      meta TEXT DEFAULT '{}',
      created_by TEXT DEFAULT 'Admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_pdf_themes_festival ON pdf_themes(festival)`,
    `CREATE INDEX IF NOT EXISTS idx_pdf_themes_status ON pdf_themes(status)`,
    `CREATE INDEX IF NOT EXISTS idx_pdf_themes_dates ON pdf_themes(start_date, end_date)`,
    `ALTER TABLE itinerary_templates ADD COLUMN theme_override_id TEXT DEFAULT NULL`,
    `ALTER TABLE itinerary_templates ADD COLUMN badge TEXT DEFAULT ''`,
    `ALTER TABLE quotes ADD COLUMN theme_override_id TEXT DEFAULT NULL`,
    `ALTER TABLE quotes ADD COLUMN badge TEXT DEFAULT ''`,
    `ALTER TABLE quotes ADD COLUMN show_detailed_itinerary INTEGER DEFAULT 1`,
    `CREATE TABLE IF NOT EXISTS client_documents (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      doc_type TEXT NOT NULL,
      traveller_id TEXT DEFAULT NULL,
      note TEXT DEFAULT '',
      original_filename TEXT NOT NULL,
      stored_path TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      uploaded_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT DEFAULT NULL,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_client_documents_lead_id ON client_documents(lead_id)`,
    `CREATE INDEX IF NOT EXISTS idx_client_documents_deleted_at ON client_documents(deleted_at)`,
    `CREATE TABLE IF NOT EXISTS client_document_audit_logs (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      lead_id TEXT NOT NULL,
      action TEXT NOT NULL,
      user_id TEXT DEFAULT '',
      user_name TEXT DEFAULT '',
      ip_address TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      details TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_client_doc_audit_lead ON client_document_audit_logs(lead_id)`,
    `CREATE INDEX IF NOT EXISTS idx_client_doc_audit_doc ON client_document_audit_logs(document_id)`,
    `CREATE TABLE IF NOT EXISTS client_detail_links (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      is_active INTEGER DEFAULT 1,
      expires_at TEXT DEFAULT NULL,
      submitted_at TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_client_links_lead ON client_detail_links(lead_id)`,
    `CREATE INDEX IF NOT EXISTS idx_client_links_token ON client_detail_links(token)`,
    `CREATE TABLE IF NOT EXISTS lead_travellers (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      mobile TEXT DEFAULT NULL,
      email TEXT DEFAULT NULL,
      is_primary INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_lead_travellers_lead ON lead_travellers(lead_id)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_travellers_mobile ON lead_travellers(lead_id, mobile) WHERE mobile IS NOT NULL AND mobile != ''`
  ];

  for (const mSql of migrations) {
    try {
      execSql(mSql);
    } catch (_e) {
      // Column or table already exists
    }
  }

  // Seed default Destination Photos & Partner Brands
  try {
    const defaultPartners = [
      { id: 'taj', category: 'hotel', name: 'Taj Hotels', tagline: 'IHCL Group', brand_color: '#B8860B', sort_order: 1 },
      { id: 'oberoi', category: 'hotel', name: 'Oberoi', tagline: 'Luxury Collection', brand_color: '#C49A45', sort_order: 2 },
      { id: 'itc', category: 'hotel', name: 'ITC Hotels', tagline: 'Responsible Luxury', brand_color: '#8C1D40', sort_order: 3 },
      { id: 'radisson', category: 'hotel', name: 'Radisson', tagline: 'Hotel Group', brand_color: '#1E5AA8', sort_order: 4 },
      { id: 'leela', category: 'hotel', name: 'The Leela', tagline: 'Palaces & Resorts', brand_color: '#8A5D28', sort_order: 5 },
      { id: 'marriott', category: 'hotel', name: 'Marriott', tagline: 'Bonvoy Network', brand_color: '#B8283B', sort_order: 6 },
      { id: 'makemytrip', category: 'travel', name: 'MakeMyTrip', tagline: 'Verified Seller', brand_color: '#D8232A', sort_order: 7 },
      { id: 'traveltriangle', category: 'travel', name: 'TravelTriangle', tagline: 'Certified Partner', brand_color: '#10967A', sort_order: 8 },
      { id: 'tripadvisor', category: 'travel', name: 'TripAdvisor', tagline: 'Traveller Reviewed', brand_color: '#00AF87', sort_order: 9 }
    ];

    for (const p of defaultPartners) {
      execSql(`INSERT OR IGNORE INTO partner_brands (id, category, name, tagline, brand_color, sort_order, is_active)
        VALUES ('${p.id}', '${p.category}', '${p.name}', '${p.tagline}', '${p.brand_color}', ${p.sort_order}, 1)`);
    }

    const defaultPhotos = [
      // Kashmir
      { id: 'img-kashmir-1', city: 'Kashmir', title: 'Dal Lake Shikara Sunrise', url: 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=800&q=80', tags: 'srinagar, dal lake, shikara' },
      { id: 'img-kashmir-2', city: 'Kashmir', title: 'Gulmarg Snow Peaks & Gondola', url: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80', tags: 'gulmarg, snow, mountains' },
      { id: 'img-kashmir-3', city: 'Kashmir', title: 'Pahalgam Pine Valley & River', url: 'https://images.unsplash.com/photo-1626014303757-646633789e5a?auto=format&fit=crop&w=800&q=80', tags: 'pahalgam, valley, river' },
      { id: 'img-kashmir-4', city: 'Kashmir', title: 'Sonamarg Meadow of Gold', url: 'https://images.unsplash.com/photo-1598091383021-15ddea10925d?auto=format&fit=crop&w=800&q=80', tags: 'sonamarg, glacier, meadows' },
      // Himachal / Manali / Shimla
      { id: 'img-manali-1', city: 'Manali', title: 'Solang Valley Snowy Slopes', url: 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=800&q=80', tags: 'solang valley, himachal, snow' },
      { id: 'img-manali-2', city: 'Manali', title: 'Hadimba Wooden Temple', url: 'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=800&q=80', tags: 'manali, temple, cedar' },
      { id: 'img-himachal-1', city: 'Himachal', title: 'Himalayan Mountain Vista', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80', tags: 'himachal, shimla, mountains' },
      { id: 'img-shimla-1', city: 'Shimla', title: 'The Ridge & Christ Church', url: 'https://images.unsplash.com/photo-1588714477688-cf28a50e94f7?auto=format&fit=crop&w=800&q=80', tags: 'shimla, ridge, heritage' },
      // Goa
      { id: 'img-goa-1', city: 'Goa', title: 'Palolem Palm Beach Sunset', url: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80', tags: 'goa, beach, sunset' },
      { id: 'img-goa-2', city: 'Goa', title: 'Calangute & Baga Shoreline', url: 'https://images.unsplash.com/photo-1587922546307-776227941871?auto=format&fit=crop&w=800&q=80', tags: 'baga, north goa, coastline' },
      // Kerala
      { id: 'img-kerala-1', city: 'Kerala', title: 'Alleppey Backwaters Houseboat', url: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80', tags: 'alleppey, backwaters, kerala' },
      { id: 'img-kerala-2', city: 'Kerala', title: 'Munnar Lush Tea Gardens', url: 'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=800&q=80', tags: 'munnar, tea plantations, hills' },
      // Rajasthan / Jaipur / Udaipur
      { id: 'img-jaipur-1', city: 'Jaipur', title: 'Hawa Mahal Palace of Winds', url: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80', tags: 'jaipur, hawa mahal, rajasthan' },
      { id: 'img-udaipur-1', city: 'Udaipur', title: 'Lake Pichola City Palace', url: 'https://images.unsplash.com/photo-1615836245337-f5b9b2303f10?auto=format&fit=crop&w=800&q=80', tags: 'udaipur, lake pichola, palace' },
      { id: 'img-rajasthan-1', city: 'Rajasthan', title: 'Thar Desert Sand Dunes', url: 'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=800&q=80', tags: 'jaisalmer, desert, camel safari' },
      // Ladakh
      { id: 'img-ladakh-1', city: 'Ladakh', title: 'Pangong Tso Blue Waters', url: 'https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=800&q=80', tags: 'ladakh, pangong, leh' },
      // Dubai & International
      { id: 'img-dubai-1', city: 'Dubai', title: 'Burj Khalifa & Downtown Skyline', url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80', tags: 'dubai, downtown, burj khalifa' },
      { id: 'img-bali-1', city: 'Bali', title: 'Ubud Emerald Rice Terraces', url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80', tags: 'bali, ubud, tropical' },
      { id: 'img-swiss-1', city: 'Switzerland', title: 'Alpine Peaks & Green Meadows', url: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=800&q=80', tags: 'switzerland, alps, europe' }
    ];

    for (const ph of defaultPhotos) {
      execSql(`INSERT OR IGNORE INTO destination_photos (id, city, title, image_url, tags, is_default)
        VALUES ('${ph.id}', '${ph.city}', '${ph.title.replace(/'/g, "''")}', '${ph.url}', '${ph.tags}', 1)`);
    }
  } catch (_e) {}

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

  // Seed & Synchronize the 5 authoritative quote designs from Kingsland-Quote-Designs.html
  try {
    // Remove obsolete legacy demo designs that do not match the reference designs
    execSql(`DELETE FROM pdf_designs WHERE id NOT IN ('royal', 'alpine', 'sunset', 'editorial', 'playful', 'design-royal-gold', 'design-alpine-teal', 'design-sunset-coral', 'design-editorial', 'design-playful-violet')`);

    // Ensure the 5 official designs exist
    execSql(`INSERT OR REPLACE INTO pdf_designs (id, title, theme_preset, primary_color, secondary_color, watermark_text, cover_style, font_family, is_active)
      VALUES ('royal', 'Royal Gold', 'royal', '#d4af37', '#12213f', 'KINGSLAND HOLIDAYS', 'Royal Heritage', 'Playfair Display', 1)`);
    execSql(`INSERT OR REPLACE INTO pdf_designs (id, title, theme_preset, primary_color, secondary_color, watermark_text, cover_style, font_family, is_active)
      VALUES ('alpine', 'Alpine Teal', 'alpine', '#0f4c4a', '#f2a93b', 'KINGSLAND HOLIDAYS', 'Alpine Split', 'DM Serif Display', 0)`);
    execSql(`INSERT OR REPLACE INTO pdf_designs (id, title, theme_preset, primary_color, secondary_color, watermark_text, cover_style, font_family, is_active)
      VALUES ('sunset', 'Sunset Coral', 'sunset', '#ff5e4d', '#231f2b', 'KINGSLAND HOLIDAYS', 'Sunset Waves', 'Outfit', 0)`);
    execSql(`INSERT OR REPLACE INTO pdf_designs (id, title, theme_preset, primary_color, secondary_color, watermark_text, cover_style, font_family, is_active)
      VALUES ('editorial', 'Editorial', 'editorial', '#111111', '#e5431f', 'KINGSLAND HOLIDAYS', 'High Contrast', 'Bricolage Grotesque', 0)`);
    execSql(`INSERT OR REPLACE INTO pdf_designs (id, title, theme_preset, primary_color, secondary_color, watermark_text, cover_style, font_family, is_active)
      VALUES ('playful', 'Playful Violet', 'playful', '#4a2fe0', '#ffb996', 'KINGSLAND HOLIDAYS', 'Playful Modern', 'Baloo 2', 0)`);

    // Ensure at least one design is active
    execSql(`UPDATE pdf_designs SET is_active = 1 WHERE id = 'royal' AND NOT EXISTS (SELECT 1 FROM pdf_designs WHERE is_active = 1)`);
  } catch (_e) {}

  // Seed default agency settings
  try {
    execSql(`INSERT OR IGNORE INTO agency_settings (id, company_name, tagline, phone, email, website, default_gst_percent, place_of_supply)
      VALUES ('default_agency_settings', 'Kingsland Holidays', 'Desire to travel', '+91 6376983416', 'support@kingslandholiday.com', 'kingslandholiday.com', 5.0, 'Rajasthan (08)')`);
  } catch (_e) {}


  // Seed default PDF Theme (Brand Defaults: Orange #FF6B35, Navy #14142B, Cream #FFF9F0, Rust #D9582B)
  try {
    const defaultMeta = JSON.stringify({
      name: "Brand Default",
      festival: "All Season",
      version: "1.0.0",
      colors: {
        primary: "#FF6B35",
        accent: "#D9582B",
        background: "#FFF9F0",
        text: "#14142B",
        navy: "#14142B"
      },
      fonts: {
        heading: "Playfair Display",
        body: "Nunito"
      },
      safeMargin: 12,
      imageRadius: 16
    });

    execSql(`INSERT OR IGNORE INTO pdf_themes (id, name, festival, type, file_path, start_date, end_date, is_default, status, version, meta, created_by)
      VALUES ('brand-default', 'Kingsland Brand Default', 'All Season', 'pack', 'storage/pdf-themes/brand-default', '', '', 1, 'active', '1.0.0', '${defaultMeta.replace(/'/g, "''")}', 'Admin')`);
  } catch (_e) {}

  console.log('✅ Database schema & migrations initialized.');
  initializeWorkflowSecurity();

}
