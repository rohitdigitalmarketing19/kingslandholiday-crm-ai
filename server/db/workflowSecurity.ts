import { migrateBookingSnapshotCompatibility, INSERT_BOOKING_SNAPSHOT, snapshotValues } from './bookingSnapshotCompatibility';
import { hashPassword } from '../middleware/auth';
import { execSql, queryAll, queryOne, runQuery } from './connection';
export function initializeWorkflowSecurity() {
  execSql(`CREATE TABLE IF NOT EXISTS workflow_events(id TEXT PRIMARY KEY,parent_id TEXT NOT NULL,event TEXT NOT NULL,before_json TEXT NOT NULL,after_json TEXT NOT NULL,actor TEXT NOT NULL,created_at TEXT NOT NULL)`);
  execSql(`CREATE TABLE IF NOT EXISTS auth_sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL, created_at TEXT NOT NULL)`);
  execSql(`CREATE TABLE IF NOT EXISTS booking_snapshots (lead_id TEXT PRIMARY KEY REFERENCES leads(id), quote_id TEXT, total_paise INTEGER NOT NULL CHECK(total_paise >= 0), quote_json TEXT NOT NULL, accepted_by TEXT NOT NULL, accepted_at TEXT NOT NULL, legacy INTEGER NOT NULL DEFAULT 0)`);
  execSql(`CREATE TABLE IF NOT EXISTS receipt_events (id TEXT PRIMARY KEY, request_key TEXT NOT NULL, lead_id TEXT NOT NULL DEFAULT '', amount_paise INTEGER NOT NULL, received_paise INTEGER NOT NULL, reference TEXT NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(request_key, reference))`);
  execSql(`CREATE TABLE IF NOT EXISTS razorpay_orders (
    order_id TEXT PRIMARY KEY,pay_key TEXT NOT NULL,principal_paise INTEGER NOT NULL CHECK(principal_paise>0),fee_paise INTEGER NOT NULL CHECK(fee_paise>=0),total_paise INTEGER NOT NULL CHECK(total_paise=principal_paise+fee_paise),request_paise INTEGER NOT NULL,baseline_paid_paise INTEGER NOT NULL,key_id TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'created',payment_id TEXT UNIQUE,created_at TEXT NOT NULL,paid_at TEXT
  )`);
  execSql('CREATE INDEX IF NOT EXISTS razorpay_order_request ON razorpay_orders(pay_key,created_at)');
  migrateBookingSnapshotCompatibility();
  for(const user of queryAll("SELECT id,password FROM users WHERE password != '' AND password NOT LIKE 'scrypt$%'"))runQuery('UPDATE users SET password=? WHERE id=?',[hashPassword(user.password),user.id]);
  for (const row of queryAll(`SELECT l.id AS lead_id, c.total_amount FROM ops_customers c JOIN leads l ON c.id = 'cust-' || l.id OR c.booking_id = l.trip_id`)) {
    if (queryOne('SELECT lead_id FROM booking_snapshots WHERE lead_id=?', [row.lead_id])) continue;
    const quote = queryOne('SELECT * FROM quotes WHERE lead_id=? ORDER BY created_at DESC LIMIT 1', [row.lead_id]);
    runQuery(INSERT_BOOKING_SNAPSHOT, snapshotValues(row.lead_id,quote?.id || null,Math.round(Number(row.total_amount || 0)*100),JSON.stringify(quote || {}),'legacy-migration',new Date().toISOString(),1));
  }
}
