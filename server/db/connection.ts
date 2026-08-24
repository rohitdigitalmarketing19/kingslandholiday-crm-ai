import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawPath = process.env.DATABASE_PATH || 'kingsland.db';
export const dbPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);

const dbDir = path.dirname(dbPath);
const rawBackupPath = process.env.BACKUP_PATH;
export const backupDir = rawBackupPath
  ? (path.isAbsolute(rawBackupPath) ? rawBackupPath : path.resolve(process.cwd(), rawBackupPath))
  : path.join(dbDir, 'backups');

try {
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
} catch (e) {
  console.warn('⚠️ Could not create db or backup directory:', e);
}

let db: SqlJsDatabase;
let lastBackupTime = 0;

/**
 * Creates a timestamped backup snapshot of the database.
 */
export function createBackupSnapshot(reason: string = 'auto'): string | null {
  if (!db) return null;
  try {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const data = db.export();
    const buffer = Buffer.from(data);
    if (buffer.length < 1000) return null; // Don't backup empty or invalid db

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `kingsland_backup_${reason}_${timestamp}.db`;
    const fullPath = path.join(backupDir, filename);

    fs.writeFileSync(fullPath, buffer);
    console.log(`🛡️ Database Snapshot Created: ${filename} (${buffer.length} bytes)`);

    // Clean up old backups keeping the most recent 30
    cleanupOldBackups();
    return filename;
  } catch (err) {
    console.error('⚠️ Failed to create database snapshot:', err);
    return null;
  }
}

/**
 * Keep the latest 30 backups to save disk space
 */
function cleanupOldBackups() {
  try {
    if (!fs.existsSync(backupDir)) return;
    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.db'))
      .map(f => ({
        name: f,
        time: fs.statSync(path.join(backupDir, f)).mtimeMs
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 30) {
      for (let i = 30; i < files.length; i++) {
        try {
          fs.unlinkSync(path.join(backupDir, files[i].name));
        } catch (_e) {}
      }
    }
  } catch (_e) {}
}

/**
 * List all available backup snapshots
 */
export function listBackupSnapshots() {
  try {
    if (!fs.existsSync(backupDir)) return [];
    return fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.db'))
      .map(f => {
        const stat = fs.statSync(path.join(backupDir, f));
        return {
          filename: f,
          sizeBytes: stat.size,
          sizeKb: Math.round(stat.size / 1024),
          createdAt: stat.mtime.toISOString(),
          formattedTime: stat.mtime.toLocaleString()
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (_e) {
    return [];
  }
}

/**
 * Restore from a specific backup snapshot or buffer
 */
export async function restoreDatabaseFromBuffer(buffer: Buffer): Promise<boolean> {
  const SQL = await initSqlJs();
  const testDb = new SQL.Database(buffer);
  
  // Verify it is a valid SQLite DB by running a test query
  testDb.exec('SELECT count(*) FROM sqlite_master;');
  
  // Create emergency pre-restore snapshot of current db before replacing
  if (db) {
    createBackupSnapshot('pre-restore');
  }

  db = testDb;
  fs.writeFileSync(dbPath, buffer);
  console.log(`✅ Database successfully restored from buffer (${buffer.length} bytes).`);
  return true;
}

/**
 * Restore from snapshot file in backups directory
 */
export async function restoreSnapshotByName(filename: string): Promise<boolean> {
  const safeName = path.basename(filename);
  const fullPath = path.join(backupDir, safeName);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Backup file ${safeName} does not exist.`);
  }
  const buffer = fs.readFileSync(fullPath);
  return restoreDatabaseFromBuffer(buffer);
}

/**
 * Initialize the sql.js database. Must be called before any queries.
 */
export async function initDb(): Promise<SqlJsDatabase> {
  if (db) return db;

  const SQL = await initSqlJs();

  // 1. Try loading existing database file if it exists and has content
  if (fs.existsSync(dbPath)) {
    try {
      const fileBuffer = fs.readFileSync(dbPath);
      if (fileBuffer.length > 500) {
        db = new SQL.Database(fileBuffer);
        console.log(`📂 Database loaded from persistent file: ${dbPath} (${fileBuffer.length} bytes)`);
      } else {
        throw new Error('Database file is empty or corrupted.');
      }
    } catch (readErr) {
      console.warn('⚠️ Database file could not be read cleanly. Checking backup snapshots...', readErr);
    }
  }

  // 2. If db not yet loaded, try restoring from latest backup snapshot!
  if (!db) {
    const snapshots = listBackupSnapshots();
    if (snapshots.length > 0) {
      const latestSnapshot = snapshots[0];
      try {
        const snapPath = path.join(backupDir, latestSnapshot.filename);
        const snapBuffer = fs.readFileSync(snapPath);
        db = new SQL.Database(snapBuffer);
        fs.writeFileSync(dbPath, snapBuffer);
        console.log(`🛡️ AUTO-RECOVERY: Successfully recovered database from latest snapshot: ${latestSnapshot.filename}`);
      } catch (snapErr) {
        console.error('⚠️ Could not restore from snapshot, creating fresh database:', snapErr);
        db = new SQL.Database();
      }
    } else {
      console.log(`📂 Initializing new database file at: ${dbPath}`);
      db = new SQL.Database();
    }
  }

  // Enable foreign keys
  try {
    db.run('PRAGMA foreign_keys = ON;');
  } catch (_e) {}

  saveDb();

  // Create an automatic startup backup snapshot
  createBackupSnapshot('startup');

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

    // Debounced automatic periodic backup (e.g. at most once every 10 minutes or upon significant writes)
    const now = Date.now();
    if (now - lastBackupTime > 10 * 60 * 1000) {
      lastBackupTime = now;
      createBackupSnapshot('auto');
    }
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

export default { 
  initDb, 
  getDb, 
  saveDb, 
  runQuery, 
  queryAll, 
  queryOne, 
  execSql, 
  createBackupSnapshot, 
  listBackupSnapshots, 
  restoreDatabaseFromBuffer, 
  restoreSnapshotByName 
};
