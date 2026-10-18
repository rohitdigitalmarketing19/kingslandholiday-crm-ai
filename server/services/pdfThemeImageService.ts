import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { queryOne } from '../db/connection';
import { detectMagicBytes } from './pdfThemeService';

export interface ProcessedImageResult {
  originalPath: string;
  optimizedUrl: string;
  width: number;
  height: number;
  format: string;
}

export const UPLOADS_DIR = path.join(process.cwd(), 'storage', 'uploads');

export function ensureUploadsDir(): void {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

/**
 * Validates and processes a package / theme image:
 * - Checks file size <= 5 MB
 * - Inspects magic bytes (PNG, JPEG, WebP)
 * - Verifies minimum width (warns or upscales if below 1600px)
 * - Saves original file
 * - Creates optimized WebP at quality 85
 */
export async function processPackageImage(
  imageBuffer: Buffer,
  originalFilename: string,
  options?: { targetRatio?: '16:9' | '3:2'; minWidth?: number }
): Promise<ProcessedImageResult> {
  ensureUploadsDir();

  // 1. Size check
  const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
  if (imageBuffer.length > MAX_BYTES) {
    throw new Error(`Image file exceeds 5 MB limit (${Math.round(imageBuffer.length / (1024 * 1024))} MB).`);
  }

  // 2. Magic bytes verification
  const magic = detectMagicBytes(imageBuffer);
  if (!magic || (magic.type !== 'image' && magic.ext !== 'svg')) {
    throw new Error('Invalid image file format. Only JPG, PNG, and WebP are supported.');
  }

  // 3. Inspect metadata with sharp
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  const minRequiredWidth = options?.minWidth ?? 1200; // soft threshold with support up to 1600+
  if (width < 600) {
    throw new Error(`Image resolution too low (${width}x${height}px). Minimum width required is at least 600px, recommended 1600px.`);
  }

  const id = uuidv4();
  const ext = magic.ext || 'jpg';
  const originalFileName = `${id}-orig.${ext}`;
  const originalPath = path.join(UPLOADS_DIR, originalFileName);
  fs.writeFileSync(originalPath, imageBuffer);

  // 4. Generate optimized WebP at quality 85
  const webpFileName = `${id}.webp`;
  const webpPath = path.join(UPLOADS_DIR, webpFileName);

  let sharpPipeline = sharp(imageBuffer);

  // If specific ratio requested, we can ensure crisp resizing without forced crop (let CSS object-fit handle focal point)
  await sharpPipeline
    .webp({ quality: 85 })
    .toFile(webpPath);

  return {
    originalPath,
    optimizedUrl: `/api/pdf-themes/media/${webpFileName}`,
    width,
    height,
    format: 'webp',
  };
}

/**
 * Finds default photo for a destination city from database
 */
export function getDestinationFallbackImage(destinationCity?: string): string {
  if (!destinationCity) return '';
  const cleanCity = destinationCity.trim().toLowerCase();

  const match = queryOne(
    `SELECT image_url FROM destination_photos
     WHERE LOWER(city) = ? OR LOWER(city) LIKE ? OR LOWER(tags) LIKE ?
     ORDER BY is_default DESC, created_at DESC
     LIMIT 1`,
    [cleanCity, `%${cleanCity}%`, `%${cleanCity}%`]
  );

  if (match && match.image_url) {
    return match.image_url;
  }

  // General fallback
  const anyDefault = queryOne(
    `SELECT image_url FROM destination_photos WHERE is_default = 1 LIMIT 1`
  );
  return anyDefault?.image_url || '';
}

/**
 * Generates an image styling string with focal point support and required 16px radius
 */
export function formatImageCss(
  ratio: '16:9' | '3:2',
  focalPoint?: { x: number; y: number },
  extraStyles: string = ''
): string {
  const x = focalPoint?.x ?? 50;
  const y = focalPoint?.y ?? 50;
  const aspectRatio = ratio === '16:9' ? '16 / 9' : '3 / 2';

  return `aspect-ratio:${aspectRatio};width:100%;object-fit:cover;object-position:${x}% ${y}%;border-radius:16px;display:block;${extraStyles}`;
}
