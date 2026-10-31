import { execSql } from './connection';
export function migrateInvoices(){
 execSql('CREATE TABLE IF NOT EXISTS invoice_sequences(year TEXT PRIMARY KEY,last_number INTEGER NOT NULL)');
 execSql('CREATE TABLE IF NOT EXISTS invoice_documents(id TEXT PRIMARY KEY,invoice_number TEXT NOT NULL UNIQUE,document_type TEXT NOT NULL,customer_id TEXT NOT NULL,lead_id TEXT NOT NULL REFERENCES leads(id),request_id TEXT NOT NULL UNIQUE,snapshot_json TEXT NOT NULL,actor TEXT NOT NULL,created_at TEXT NOT NULL)');
 execSql('CREATE INDEX IF NOT EXISTS invoice_documents_lead ON invoice_documents(lead_id,created_at)');
 execSql("CREATE TRIGGER IF NOT EXISTS invoice_documents_no_update BEFORE UPDATE ON invoice_documents BEGIN SELECT RAISE(ABORT,'Issued invoices are immutable'); END");
 execSql("CREATE TRIGGER IF NOT EXISTS invoice_documents_no_delete BEFORE DELETE ON invoice_documents BEGIN SELECT RAISE(ABORT,'Issued invoices cannot be deleted'); END");
}
