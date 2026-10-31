import { execSql, queryAll, runQuery } from './connection';
// The deployed schema used total_minor/snapshot_json. Keep both layouts readable
// and writable; never drop the table, replace rows, or change recorded amounts.
export function migrateBookingSnapshotCompatibility(): void {
  const columns=new Set(queryAll('PRAGMA table_info(booking_snapshots)').map(row=>row.name));
  for(const [name,type] of [['total_paise','INTEGER'],['quote_json','TEXT'],['total_minor','INTEGER'],['snapshot_json','TEXT'],['legacy','INTEGER NOT NULL DEFAULT 0']]) {
    if(!columns.has(name))execSql(`ALTER TABLE booking_snapshots ADD COLUMN ${name} ${type}`);
  }
  runQuery('UPDATE booking_snapshots SET total_paise=total_minor WHERE total_paise IS NULL AND total_minor IS NOT NULL');
  runQuery('UPDATE booking_snapshots SET quote_json=snapshot_json WHERE quote_json IS NULL AND snapshot_json IS NOT NULL');
  runQuery('UPDATE booking_snapshots SET total_minor=total_paise WHERE total_minor IS NULL AND total_paise IS NOT NULL');
  runQuery('UPDATE booking_snapshots SET snapshot_json=quote_json WHERE snapshot_json IS NULL AND quote_json IS NOT NULL');
  installBookingRevisionProtection();
}
export const INSERT_BOOKING_SNAPSHOT = 'INSERT INTO booking_snapshots(lead_id,quote_id,total_paise,total_minor,quote_json,snapshot_json,accepted_by,accepted_at,legacy) VALUES(?,?,?,?,?,?,?,?,?)';
export function snapshotValues(leadId: string,quoteId: string | null,amount: number,json: string,actor: string,time: string,legacy=0) {
  return [leadId,quoteId || '',amount,amount,json,json,actor,time,legacy];
}

// Existing deployed databases prohibit every snapshot update. Allow only a matching,
// audited commercial revision while the trip is open; retain delete/receipt guards.
export function installBookingRevisionProtection(): void {
  execSql('DROP TRIGGER IF EXISTS protect_booking_snapshots_update');
  execSql(`CREATE TRIGGER protect_booking_snapshots_update BEFORE UPDATE ON booking_snapshots
    WHEN NEW.lead_id IS NOT OLD.lead_id OR NEW.quote_id IS NOT OLD.quote_id
      OR NEW.accepted_by IS NOT OLD.accepted_by OR NEW.accepted_at IS NOT OLD.accepted_at
      OR NEW.total_paise IS NOT NEW.total_minor OR NEW.quote_json IS NOT NEW.snapshot_json
      OR EXISTS (SELECT 1 FROM ops_customers c JOIN leads l ON c.id='cust-' || l.id OR c.booking_id=l.trip_id WHERE l.id=OLD.lead_id AND lower(c.status)='completed')
      OR NOT EXISTS (SELECT 1 FROM workflow_events e WHERE e.parent_id=OLD.lead_id AND e.event='Booking amended'
        AND e.before_json=OLD.quote_json AND e.after_json=NEW.quote_json
        AND CAST(ROUND(json_extract(e.after_json,'$.final_selling_price')*100) AS INTEGER)=NEW.total_paise)
    BEGIN SELECT RAISE(ABORT, 'Booking changes require an audited revision before trip completion'); END`);
}
