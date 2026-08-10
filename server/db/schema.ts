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
  ];

  for (const mSql of migrations) {
    try {
      execSql(mSql);
    } catch (_e) {
      // Column already exists
    }
  }

  console.log('✅ Database schema & migrations initialized.');
}
