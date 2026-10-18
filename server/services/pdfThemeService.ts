import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { PDFDocument } from 'pdf-lib';
import { v4 as uuidv4 } from 'uuid';
import { queryAll, queryOne, runQuery } from '../db/connection';

export interface ThemeColors {
  primary: string;
  accent: string;
  background: string;
  text: string;
  navy?: string;
  rust?: string;
  cream?: string;
}

export interface ThemeFonts {
  heading: string;
  body: string;
}

export interface ThemeJsonMeta {
  name: string;
  festival?: string;
  version?: string;
  startDate?: string;
  endDate?: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  safeMargin?: number;
  imageRadius?: number;
  badgeStripColor?: string;
  flameIconColor?: string;
  [key: string]: any;
}

export interface PdfThemeRecord {
  id: string;
  name: string;
  festival: string;
  type: 'pack' | 'artwork' | 'image';
  filePath: string;
  startDate: string;
  endDate: string;
  isDefault: boolean;
  status: 'draft' | 'active' | 'archived';
  version: string;
  meta: ThemeJsonMeta;
  createdBy: string;
  createdAt: string;
}

// Default Brand Styling
export const BRAND_DEFAULTS: ThemeJsonMeta = {
  name: 'Kingsland Brand Default',
  festival: 'All Season',
  version: '1.0.0',
  colors: {
    primary: '#FF6B35',   // Brand Orange
    accent: '#D9582B',    // Rust Title Color
    background: '#FFF9F0',// Warm Cream
    text: '#14142B',      // Deep Navy
    navy: '#14142B',
    rust: '#D9582B',
    cream: '#FFF9F0',
  },
  fonts: {
    heading: 'Playfair Display',
    body: 'Nunito',
  },
  safeMargin: 12,
  imageRadius: 16,
};

// Storage Root for Themes (outside public web root)
export const THEMES_STORAGE_DIR = path.join(process.cwd(), 'storage', 'pdf-themes');

export function ensureStorageDirectories(): void {
  const dirs = [
    THEMES_STORAGE_DIR,
    path.join(THEMES_STORAGE_DIR, 'packs'),
    path.join(THEMES_STORAGE_DIR, 'artworks'),
    path.join(THEMES_STORAGE_DIR, 'images'),
    path.join(THEMES_STORAGE_DIR, 'thumbnails'),
  ];
  for (const d of dirs) {
    if (!fs.existsSync(d)) {
      fs.mkdirSync(d, { recursive: true });
    }
  }
}

/**
 * Checks file type by inspecting MAGIC BYTES (not trusting file extension alone)
 */
export function detectMagicBytes(buffer: Buffer): { type: string; ext: string } | null {
  if (buffer.length < 4) return null;

  // 1. ZIP: PK\x03\x04
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return { type: 'pack', ext: 'zip' };
  }

  // 2. PDF: %PDF- (\x25\x50\x44\x46\x2D)
  if (buffer.length >= 5 && buffer.toString('utf-8', 0, 5) === '%PDF-') {
    return { type: 'artwork', ext: 'pdf' };
  }

  // 3. PNG: \x89PNG\r\n\x1a\n
  if (buffer.length >= 8 &&
      buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
      buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a) {
    return { type: 'image', ext: 'png' };
  }

  // 4. JPEG: \xFF\xD8\xFF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { type: 'image', ext: 'jpg' };
  }

  // 5. WEBP: RIFF....WEBP
  if (buffer.length >= 12 &&
      buffer.toString('utf-8', 0, 4) === 'RIFF' &&
      buffer.toString('utf-8', 8, 12) === 'WEBP') {
    return { type: 'image', ext: 'webp' };
  }

  // 6. SVG: XML text containing <svg
  const snippet = buffer.toString('utf-8', 0, Math.min(1024, buffer.length)).trim().toLowerCase();
  if (snippet.includes('<svg') || (snippet.includes('<?xml') && snippet.includes('<svg'))) {
    return { type: 'image', ext: 'svg' };
  }

  return null;
}

/**
 * Validates and sanitizes HTML / SVG strings:
 * Rejects <script>, inline on* handlers, iframes, and external URLs (http://, https://, //)
 */
export function validateAndSanitizeThemeMarkup(content: string, filename: string): void {
  const lower = content.toLowerCase();

  // Reject <script> tags
  if (/<script\b/i.test(content) || lower.includes('</script>')) {
    throw new Error(`Security Violation: File "${filename}" contains prohibited <script> tag.`);
  }

  // Reject inline on* event attributes (onclick, onload, onerror, etc.)
  if (/\bon\w+\s*=/i.test(content)) {
    throw new Error(`Security Violation: File "${filename}" contains prohibited inline event handler (on*).`);
  }

  // Reject <iframe> tags
  if (/<iframe\b/i.test(content) || lower.includes('</iframe>')) {
    throw new Error(`Security Violation: File "${filename}" contains prohibited <iframe> tag.`);
  }

  // Reject external remote URLs to prevent data exfiltration and SSRF
  // Note: Local assets / relative paths and data: URIs are allowed.
  if (/https?:\/\//i.test(content) || /\/\/[a-z0-9]/i.test(content)) {
    throw new Error(`Security Violation: File "${filename}" contains external remote URL. Only local package assets are permitted.`);
  }

  // Reject javascript: pseudo-protocol
  if (/javascript:/i.test(content)) {
    throw new Error(`Security Violation: File "${filename}" contains prohibited javascript: URI.`);
  }
}

/**
 * Safely extracts a ZIP theme pack with strict ZIP-SLIP prevention and size/file count limits
 */
export async function unpackThemeZip(
  zipBuffer: Buffer,
  targetDir: string
): Promise<ThemeJsonMeta> {
  const MAX_ZIP_FILES = 200;
  const MAX_UNCOMPRESSED_SIZE = 50 * 1024 * 1024; // 50 MB
  const ALLOWED_EXTENSIONS = new Set([
    '.json', '.html', '.css', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.woff2', '.woff', '.ttf'
  ]);

  const zip = new AdmZip(zipBuffer);
  const zipEntries = zip.getEntries();

  if (zipEntries.length > MAX_ZIP_FILES) {
    throw new Error(`Theme ZIP exceeds allowed file count limit (maximum ${MAX_ZIP_FILES} files, found ${zipEntries.length}).`);
  }

  let totalUncompressedSize = 0;
  for (const entry of zipEntries) {
    totalUncompressedSize += entry.header.size;
  }
  if (totalUncompressedSize > MAX_UNCOMPRESSED_SIZE) {
    throw new Error(`Theme ZIP uncompressed size (${Math.round(totalUncompressedSize / (1024 * 1024))} MB) exceeds maximum allowed 50 MB.`);
  }

  fs.mkdirSync(targetDir, { recursive: true });

  // 1. Verify all entries for Zip-Slip and allowed extensions before extraction
  for (const entry of zipEntries) {
    if (entry.isDirectory) continue;

    const entryName = entry.entryName.replace(/\\/g, '/');
    const normalizedTarget = path.resolve(targetDir);
    const resolvedPath = path.resolve(targetDir, entryName);

    // Zip-Slip protection: ensure destination stays strictly inside targetDir
    if (
      entryName.includes('../') ||
      entryName.includes('/..') ||
      entryName.startsWith('/') ||
      (!resolvedPath.startsWith(normalizedTarget + path.sep) && resolvedPath !== normalizedTarget)
    ) {
      throw new Error(`Malicious ZIP rejected: path traversal detected in entry "${entry.entryName}".`);
    }

    const ext = path.extname(entryName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new Error(`Prohibited file type in ZIP: "${entry.entryName}". Allowed extensions: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}`);
    }

    // Inspect content if HTML or SVG
    if (ext === '.html' || ext === '.svg') {
      const textContent = entry.getData().toString('utf-8');
      validateAndSanitizeThemeMarkup(textContent, entry.entryName);
    }
  }

  // 2. Extract entries safely
  zip.extractAllTo(targetDir, true);

  // 3. Verify required files: theme.json, cover.html, page.html, styles.css
  const themeJsonPath = path.join(targetDir, 'theme.json');
  if (!fs.existsSync(themeJsonPath)) {
    throw new Error('Invalid Theme Pack: Missing required "theme.json" file at root of zip.');
  }

  let rawMeta: any;
  try {
    rawMeta = JSON.parse(fs.readFileSync(themeJsonPath, 'utf-8'));
  } catch (err: any) {
    throw new Error(`Failed to parse theme.json: ${err.message}`);
  }

  if (!rawMeta.name) {
    throw new Error('Invalid theme.json: "name" field is required.');
  }

  const meta: ThemeJsonMeta = {
    name: String(rawMeta.name || 'Custom Theme'),
    festival: String(rawMeta.festival || 'General'),
    version: String(rawMeta.version || '1.0.0'),
    startDate: rawMeta.startDate ? String(rawMeta.startDate) : '',
    endDate: rawMeta.endDate ? String(rawMeta.endDate) : '',
    colors: {
      primary: rawMeta.colors?.primary || BRAND_DEFAULTS.colors.primary,
      accent: rawMeta.colors?.accent || BRAND_DEFAULTS.colors.accent,
      background: rawMeta.colors?.background || BRAND_DEFAULTS.colors.background,
      text: rawMeta.colors?.text || BRAND_DEFAULTS.colors.text,
      navy: rawMeta.colors?.navy || BRAND_DEFAULTS.colors.navy,
      rust: rawMeta.colors?.rust || BRAND_DEFAULTS.colors.rust,
      cream: rawMeta.colors?.cream || BRAND_DEFAULTS.colors.cream,
    },
    fonts: {
      heading: rawMeta.fonts?.heading || BRAND_DEFAULTS.fonts.heading,
      body: rawMeta.fonts?.body || BRAND_DEFAULTS.fonts.body,
    },
    safeMargin: Number(rawMeta.safeMargin) || BRAND_DEFAULTS.safeMargin,
    imageRadius: Number(rawMeta.imageRadius) || BRAND_DEFAULTS.imageRadius,
    badgeStripColor: rawMeta.badgeStripColor || '#14142B',
    flameIconColor: rawMeta.flameIconColor || '#FF6B35',
  };

  return meta;
}

/**
 * Validates an Artwork PDF: must be exactly 3 pages (Cover, Inner, Closing)
 */
export async function validateArtworkPdf(pdfBuffer: Buffer): Promise<number> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(pdfBuffer);
  } catch (err: any) {
    throw new Error(`Invalid PDF file: ${err.message}`);
  }

  const pageCount = doc.getPageCount();
  if (pageCount !== 3) {
    throw new Error(`Artwork PDF rejected: It must have exactly 3 pages (Page 1: Cover, Page 2: Inner content background, Page 3: Closing). Received ${pageCount} pages.`);
  }

  return pageCount;
}

/**
 * Formats a raw database row into a structured PdfThemeRecord
 */
export function formatPdfThemeRow(row: any): PdfThemeRecord {
  let meta: ThemeJsonMeta = { ...BRAND_DEFAULTS };
  try {
    meta = typeof row.meta === 'string' ? JSON.parse(row.meta) : (row.meta || BRAND_DEFAULTS);
  } catch (_e) {
    meta = { ...BRAND_DEFAULTS };
  }

  return {
    id: row.id,
    name: row.name,
    festival: row.festival || '',
    type: row.type as 'pack' | 'artwork' | 'image',
    filePath: row.file_path,
    startDate: row.start_date || '',
    endDate: row.end_date || '',
    isDefault: Boolean(row.is_default),
    status: (row.status || 'active') as 'draft' | 'active' | 'archived',
    version: row.version || '1.0.0',
    meta,
    createdBy: row.created_by || 'Admin',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

/**
 * Theme Selection Engine:
 * 1. If package has themeOverrideId and it's valid, use it.
 * 2. Otherwise, check active theme whose date range (startDate <= today <= endDate) includes today.
 * 3. Otherwise, use the default theme (is_default = 1).
 * 4. Fallback to Brand Defaults if not found.
 */
export function resolveActivePdfTheme(
  themeOverrideId?: string | null,
  targetDate?: string
): PdfThemeRecord {
  const today = (targetDate || new Date().toISOString().split('T')[0]).trim();

  // 1. Check Package theme override
  if (themeOverrideId && themeOverrideId.trim()) {
    const override = queryOne(
      'SELECT * FROM pdf_themes WHERE id = ? AND status != "archived" LIMIT 1',
      [themeOverrideId.trim()]
    );
    if (override) {
      return formatPdfThemeRow(override);
    }
  }

  // 2. Active festival theme matching current date range
  const activeFestivalTheme = queryOne(
    `SELECT * FROM pdf_themes
     WHERE status = 'active'
       AND start_date != ''
       AND end_date != ''
       AND start_date <= ?
       AND end_date >= ?
     ORDER BY is_default DESC, created_at DESC
     LIMIT 1`,
    [today, today]
  );
  if (activeFestivalTheme) {
    return formatPdfThemeRow(activeFestivalTheme);
  }

  // 3. System default theme
  const defaultTheme = queryOne(
    `SELECT * FROM pdf_themes
     WHERE is_default = 1 AND status != 'archived'
     LIMIT 1`
  );
  if (defaultTheme) {
    return formatPdfThemeRow(defaultTheme);
  }

  // 4. Any active theme
  const fallbackAny = queryOne(
    `SELECT * FROM pdf_themes
     WHERE status = 'active'
     ORDER BY created_at DESC
     LIMIT 1`
  );
  if (fallbackAny) {
    return formatPdfThemeRow(fallbackAny);
  }

  // 5. Ultimate In-memory Fallback
  return {
    id: 'brand-default',
    name: BRAND_DEFAULTS.name,
    festival: BRAND_DEFAULTS.festival || '',
    type: 'pack',
    filePath: 'storage/pdf-themes/brand-default',
    startDate: '',
    endDate: '',
    isDefault: true,
    status: 'active',
    version: '1.0.0',
    meta: BRAND_DEFAULTS,
    createdBy: 'System',
    createdAt: new Date().toISOString(),
  };
}
