import { execSql, queryAll } from './connection';

// Additive migration: existing rates and attachments remain unchanged.
export function migrateHotelRateSeasons(): void {
  const columns = new Set(queryAll('PRAGMA table_info(hotel_rates)').map(row => row.name));
  const additions = [
    ['deleted_at', "TEXT NOT NULL DEFAULT ''"],
    ['off_season_paise', 'INTEGER DEFAULT NULL CHECK(off_season_paise IS NULL OR off_season_paise >= 0)'],
    ['off_season_start_date', "TEXT NOT NULL DEFAULT ''"],
    ['season_start_date', "TEXT NOT NULL DEFAULT ''"],
    ['contact_number', "TEXT NOT NULL DEFAULT ''"],
  ];
  for (const [name, definition] of additions) {
    if (!columns.has(name)) execSql(`ALTER TABLE hotel_rates ADD COLUMN ${name} ${definition}`);
  }
}
