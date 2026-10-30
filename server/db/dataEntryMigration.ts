import { execSql } from './connection';

// Additive and repeatable: no existing hotel, booking or contact data is changed.
export function migrateDataEntry() {
  execSql(`CREATE TABLE IF NOT EXISTS b2b_contacts (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL,
    city TEXT NOT NULL, state TEXT NOT NULL,
    quality TEXT NOT NULL CHECK(quality IN ('Partner','Potential','Not Active')),
    updated_at TEXT NOT NULL, updated_by TEXT NOT NULL, deleted_at TEXT NOT NULL DEFAULT '')`);
  execSql(`CREATE INDEX IF NOT EXISTS idx_b2b_contacts_quality ON b2b_contacts(quality, deleted_at)`);
  execSql(`CREATE TABLE IF NOT EXISTS b2b_contact_history (
    id TEXT PRIMARY KEY, contact_id TEXT NOT NULL REFERENCES b2b_contacts(id),
    actor TEXT NOT NULL, created_at TEXT NOT NULL, before_data TEXT NOT NULL, after_data TEXT NOT NULL)`);
  execSql(`CREATE TABLE IF NOT EXISTS public_entry_submissions (
    request_id TEXT NOT NULL, kind TEXT NOT NULL, record_id TEXT NOT NULL, created_at TEXT NOT NULL,
    PRIMARY KEY(request_id, kind))`);
}
