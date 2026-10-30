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
}
export const INSERT_BOOKING_SNAPSHOT = 'INSERT INTO booking_snapshots(lead_id,quote_id,total_paise,total_minor,quote_json,snapshot_json,accepted_by,accepted_at,legacy) VALUES(?,?,?,?,?,?,?,?,?)';
export function snapshotValues(leadId: string,quoteId: string | null,amount: number,json: string,actor: string,time: string,legacy=0) {
  return [leadId,quoteId || '',amount,amount,json,json,actor,time,legacy];
}
