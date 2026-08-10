import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawPath = process.env.DATABASE_PATH || 'kingsland.db';
const dbPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);

const dbDir = path.dirname(dbPath);
try {
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
} catch (e) {
  console.warn('⚠️ Could not create db directory:', e);
}

let db: SqlJsDatabase;

/**
 * Initialize the sql.js database. Must be called before any queries.
 * sql.js is async to initialize (loading WASM), so we need this init step.
 */
export async function initDb(): Promise<SqlJsDatabase> {
  if (db) return db;

  const SQL = await initSqlJs();

  // Load existing database file if it exists
  if (fs.existsSync(dbPath)) {
    try {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
      console.log(`📂 Database loaded from persistent file: ${dbPath} (${fileBuffer.length} bytes)`);
    } catch (readErr) {
      console.error('⚠️ Failed to read database file, initializing fresh in-memory DB:', readErr);
      db = new SQL.Database();
    }
  } else {
    console.log(`📂 Initializing new database file at: ${dbPath}`);
    db = new SQL.Database();
  }

  // Enable foreign keys
  try {
    db.run('PRAGMA foreign_keys = ON;');
  } catch (_e) {}

  saveDb();
  return db;
}

/**
 * Save the in-memory database to disk.
 */
export function saveDb(): void {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (err) {
    console.error(`❌ ERROR: Failed to save database to ${dbPath}:`, err);
  }
}

/**
 * Get the database instance. Throws if not initialized.
 */
export function getDb(): SqlJsDatabase {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

/**
 * Helper to run a query that modifies data (INSERT, UPDATE, DELETE).
 * Automatically saves to disk after modification.
 */
export function runQuery(sql: string, params: any[] = []): { changes: number } {
  const d = getDb();
  d.run(sql, params);
  const changes = d.getRowsModified();
  saveDb();
  return { changes };
}

/**
 * Helper to get all rows from a SELECT query.
 */
export function queryAll(sql: string, params: any[] = []): any[] {
  const d = getDb();
  const stmt = d.prepare(sql);
  if (params.length > 0) stmt.bind(params);

  const results: any[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(row);
  }
  stmt.free();
  return results;
}

/**
 * Helper to get a single row from a SELECT query.
 */
export function queryOne(sql: string, params: any[] = []): any | null {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Helper to execute raw SQL (e.g. CREATE TABLE statements).
 */
export function execSql(sql: string): void {
  const d = getDb();
  d.run(sql);
  saveDb();
}

export default { initDb, getDb, saveDb, runQuery, queryAll, queryOne, execSql };
