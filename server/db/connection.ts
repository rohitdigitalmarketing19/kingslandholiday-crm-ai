import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Cloud Configuration
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_API_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

export let supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    console.log(`☁️ Supabase Cloud Storage initialized for automatic database persistence & sync.`);
  } catch (err: any) {
    console.warn(`⚠️ Supabase client initialization failed:`, err.message);
  }
}

const SUPABASE_BUCKET = 'kingsland_crm_db';
const SUPABASE_FILE = 'kingsland.db';
let isSupabaseBucketChecked = false;

async function ensureSupabaseBucket(): Promise<boolean> {
  if (!supabase) return false;
  if (isSupabaseBucketChecked) return true;
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some(b => b.name === SUPABASE_BUCKET || b.id === SUPABASE_BUCKET);
    if (!exists) {
      await supabase.storage.createBucket(SUPABASE_BUCKET, { public: false });
    }
    isSupabaseBucketChecked = true;
    return true;
  } catch (_e: any) {
    isSupabaseBucketChecked = true;
    return false;
  }
}

/**
 * Downloads latest database binary from Supabase Cloud Storage
 */
export async function downloadFromSupabase(): Promise<Buffer | null> {
  if (!supabase) return null;
  try {
    await ensureSupabaseBucket();
    
    // 1. Try main bucket
    let { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .download(SUPABASE_FILE);

    // 2. Fallback bucket if primary fails
    if ((error || !data) && supabase) {
      const fallback = await supabase.storage.from('crm-backups').download(SUPABASE_FILE);
      if (fallback.data) {
        data = fallback.data;
        error = null;
      }
    }

    if (data && !error) {
      const arrBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrBuffer);
      if (buffer.length > 500) {
        console.log(`☁️ SUPABASE CLOUD: Successfully fetched latest database (${buffer.length} bytes)`);
        return buffer;
      }
    }
    return null;
  } catch (err: any) {
    console.warn(`⚠️ Could not download database snapshot from Supabase:`, err.message);
    return null;
  }
}

let syncTimeout: NodeJS.Timeout | null = null;

/**
 * Automatically debounces and uploads database binary snapshot to Supabase Cloud
 */
export function triggerSupabaseSync(buffer: Buffer) {
  if (!supabase || buffer.length < 500) return;
  if (syncTimeout) clearTimeout(syncTimeout);

  syncTimeout = setTimeout(async () => {
    try {
      await ensureSupabaseBucket();
      let res = await supabase!.storage
        .from(SUPABASE_BUCKET)
        .upload(SUPABASE_FILE, buffer, {
          upsert: true,
          contentType: 'application/x-sqlite3'
        });

      if (res.error) {
        // Fallback to secondary bucket name
        await supabase!.storage
          .from('crm-backups')
          .upload(SUPABASE_FILE, buffer, {
            upsert: true,
            contentType: 'application/x-sqlite3'
          });
      }
      console.log(`☁️ Supabase Cloud Auto-Sync: Database successfully backed up to Supabase (${buffer.length} bytes)`);
    } catch (e: any) {
      console.warn(`⚠️ Supabase Cloud Sync failed:`, e.message);
    }
  }, 2500); // 2.5s debounce
}

const rawPath = process.env.DATABASE_PATH || 'kingsland.db';
export let dbPath = path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);

const dbDir = path.dirname(dbPath);
const rawBackupPath = process.env.BACKUP_PATH;
export let backupDir = rawBackupPath
  ? (path.isAbsolute(rawBackupPath) ? rawBackupPath : path.resolve(process.cwd(), rawBackupPath))
  : path.join(dbDir, 'backups');

function ensureDir(dirPath: string): boolean {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return true;
  } catch (e: any) {
    console.warn(`⚠️ Could not create directory ${dirPath}:`, e.message);
    return false;
  }
}

// Initial directory check with safe fallback
if (!ensureDir(dbDir)) {
  console.warn(`⚠️ Configured DATABASE_PATH directory (${dbDir}) is not writable. Falling back to local data directory.`);
  const fallbackDir = path.resolve(process.cwd(), 'data');
  ensureDir(fallbackDir);
  dbPath = path.join(fallbackDir, 'kingsland.db');
  backupDir = path.join(fallbackDir, 'backups');
  ensureDir(backupDir);
} else {
  ensureDir(backupDir);
}

/**
 * Safely write buffer to file, ensuring parent directory exists with fallback
 */
export function safeWriteBuffer(targetPath: string, buffer: Buffer): string {
  const targetDir = path.dirname(targetPath);
  try {
    ensureDir(targetDir);
    fs.writeFileSync(targetPath, buffer);
    return targetPath;
  } catch (err: any) {
    console.warn(`⚠️ Write failed to ${targetPath} (${err.message}). Writing to local fallback...`);
    const fallbackPath = path.resolve(process.cwd(), 'kingsland.db');
    ensureDir(path.dirname(fallbackPath));
    fs.writeFileSync(fallbackPath, buffer);
    dbPath = fallbackPath;
    return fallbackPath;
  }
}

let db: SqlJsDatabase;
let lastBackupTime = 0;

/**
 * Creates a timestamped backup snapshot of the database.
 */
export function createBackupSnapshot(reason: string = 'auto'): string | null {
  if (!db) return null;
  try {
    ensureDir(backupDir);
    const data = db.export();
    const buffer = Buffer.from(data);
    if (buffer.length < 1000) return null;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `kingsland_backup_${reason}_${timestamp}.db`;
    const fullPath = path.join(backupDir, filename);

    safeWriteBuffer(fullPath, buffer);
    console.log(`🛡️ Database Snapshot Created: ${filename} (${buffer.length} bytes)`);

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
  
  testDb.exec('SELECT count(*) FROM sqlite_master;');
  
  if (db) {
    createBackupSnapshot('pre-restore');
  }

  db = testDb;
  safeWriteBuffer(dbPath, buffer);
  triggerSupabaseSync(buffer);
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

  // 1. Try loading from Supabase Cloud first if available and local is missing
  let loadedFromSupabase = false;
  if (!fs.existsSync(dbPath) || fs.statSync(dbPath).size < 500) {
    if (supabase) {
      console.log('☁️ Checking Supabase Cloud for latest database snapshot...');
      const cloudBuffer = await downloadFromSupabase();
      if (cloudBuffer && cloudBuffer.length > 500) {
        try {
          db = new SQL.Database(cloudBuffer);
          safeWriteBuffer(dbPath, cloudBuffer);
          console.log(`🛡️ AUTO-RECOVERY: Successfully restored database from Supabase Cloud (${cloudBuffer.length} bytes)!`);
          loadedFromSupabase = true;
        } catch (e: any) {
          console.warn('⚠️ Could not load database from Supabase buffer:', e.message);
        }
      }
    }
  }

  // 2. Try loading existing database file if not already loaded from Supabase
  if (!db && fs.existsSync(dbPath)) {
    try {
      const fileBuffer = fs.readFileSync(dbPath);
      if (fileBuffer.length > 500) {
        db = new SQL.Database(fileBuffer);
        console.log(`📂 Database loaded from persistent file: ${dbPath} (${fileBuffer.length} bytes)`);
        // Sync local file to Supabase if Supabase is connected
        triggerSupabaseSync(fileBuffer);
      } else {
        throw new Error('Database file is empty or corrupted.');
      }
    } catch (readErr) {
      console.warn('⚠️ Database file could not be read cleanly. Checking backup snapshots...', readErr);
    }
  }

  // 3. If db not yet loaded, try restoring from latest local backup snapshot
  if (!db) {
    const snapshots = listBackupSnapshots();
    if (snapshots.length > 0) {
      const latestSnapshot = snapshots[0];
      try {
        const snapPath = path.join(backupDir, latestSnapshot.filename);
        const snapBuffer = fs.readFileSync(snapPath);
        db = new SQL.Database(snapBuffer);
        safeWriteBuffer(dbPath, snapBuffer);
        triggerSupabaseSync(snapBuffer);
        console.log(`🛡️ AUTO-RECOVERY: Successfully recovered database from latest local snapshot: ${latestSnapshot.filename}`);
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

  createBackupSnapshot('startup');

  return db;
}

/**
 * Save the in-memory database to disk and automatically sync to Supabase Cloud.
 */
export function saveDb(): void {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    safeWriteBuffer(dbPath, buffer);

    // Auto-sync binary snapshot to Supabase Cloud in background
    triggerSupabaseSync(buffer);

    // Debounced automatic periodic local backup snapshot
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
