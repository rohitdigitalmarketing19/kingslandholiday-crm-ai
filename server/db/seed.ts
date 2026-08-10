import { initDb, runQuery, queryOne } from './connection';
import { initializeDatabase } from './schema';

async function seed() {
  await initDb();
  initializeDatabase();

  const existing = queryOne('SELECT COUNT(*) as count FROM agents');
  if (existing && existing.count > 0) { console.log('⚠️  Database already initialized. Skipping seed.'); return; }

  console.log('🌱 Database initialized clean (no demo leads seeded).');
}

seed().catch(console.error);

