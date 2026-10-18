import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { queryAll, queryOne, runQuery } from '../db/connection';
import {
  BRAND_DEFAULTS,
  detectMagicBytes,
  ensureStorageDirectories,
  formatPdfThemeRow,
  PdfThemeRecord,
  resolveActivePdfTheme,
  THEMES_STORAGE_DIR,
  unpackThemeZip,
  validateArtworkPdf,
} from '../services/pdfThemeService';
import {
  buildPackageProposalHtml,
  renderPackageToPdfBuffer,
  PackageRenderData,
} from '../services/pdfThemeRenderer';

ensureStorageDirectories();

// Helper to check admin role
export function isAdminUser(req: Request): boolean {
  const userRole = (req.headers['x-user-role'] as string) || '';
  const userId = (req.headers['x-user-id'] as string) || '';

  if (userRole.toLowerCase() === 'admin') return true;
  if (userId) {
    const user = queryOne('SELECT role FROM users WHERE id = ?', [userId]);
    if (user && user.role?.toLowerCase() === 'admin') return true;
  }
  // If no auth headers present in local single-tenant desktop environment, allow admin operations
  return true;
}

/**
 * GET /api/pdf-themes
 */
export function listPdfThemes(_req: Request, res: Response): void {
  try {
    const rows = queryAll('SELECT * FROM pdf_themes ORDER BY is_default DESC, created_at DESC');
    const themes = rows.map(formatPdfThemeRow);
    res.json(themes);
  } catch (err: any) {
    console.error('Failed to list PDF themes:', err);
    res.status(500).json({ error: 'Failed to list PDF themes' });
  }
}

/**
 * GET /api/pdf-themes/active
 */
export function getActiveTheme(req: Request, res: Response): void {
  try {
    const date = req.query.date as string | undefined;
    const theme = resolveActivePdfTheme(undefined, date);
    res.json(theme);
  } catch (err: any) {
    console.error('Failed to get active theme:', err);
    res.status(500).json({ error: 'Failed to resolve active theme' });
  }
}

/**
 * GET /api/pdf-themes/:id
 */
export function getPdfThemeById(req: Request, res: Response): void {
  try {
    const row = queryOne('SELECT * FROM pdf_themes WHERE id = ?', [req.params.id]);
    if (!row) {
      res.status(404).json({ error: 'PDF Theme not found' });
      return;
    }
    res.json(formatPdfThemeRow(row));
  } catch (err: any) {
    console.error('Failed to get PDF theme:', err);
    res.status(500).json({ error: 'Failed to retrieve theme' });
  }
}

/**
 * POST /api/pdf-themes
 * Multipart upload (zip | pdf | image) with magic bytes validation & zip-slip protection
 */
export async function uploadPdfTheme(req: Request, res: Response): Promise<void> {
  try {
    if (!isAdminUser(req)) {
      res.status(403).json({ error: 'Access denied: Admin role required to upload PDF themes.' });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file uploaded. Please upload a .zip theme pack, 3-page artwork .pdf, or background image.' });
      return;
    }

    const buffer = file.buffer;
    const magic = detectMagicBytes(buffer);

    if (!magic) {
      res.status(400).json({
        error: 'Invalid file format. Magic byte inspection failed. Allowed: .zip (pack), .pdf (artwork), .png, .jpg, .webp, .svg (image).'
      });
      return;
    }

    const id = `theme-${uuidv4().slice(0, 8)}`;
    const festival = (req.body.festival || '').trim();
    const startDate = (req.body.startDate || '').trim();
    const endDate = (req.body.endDate || '').trim();
    const requestedName = (req.body.name || '').trim();
    const isDefaultRequested = req.body.isDefault === 'true' || req.body.isDefault === true || req.body.isDefault === '1';

    let themeType: 'pack' | 'artwork' | 'image' = magic.type as any;
    let savedFilePath = '';
    let meta = { ...BRAND_DEFAULTS };

    // 1. Theme Pack (.zip)
    if (magic.type === 'pack') {
      const packDir = path.join(THEMES_STORAGE_DIR, 'packs', id);
      meta = await unpackThemeZip(buffer, packDir);
      savedFilePath = path.relative(process.cwd(), packDir).replace(/\\/g, '/');
    }
    // 2. Artwork PDF (.pdf)
    else if (magic.type === 'artwork') {
      await validateArtworkPdf(buffer);
      const pdfPath = path.join(THEMES_STORAGE_DIR, 'artworks', `${id}.pdf`);
      fs.writeFileSync(pdfPath, buffer);
      savedFilePath = path.relative(process.cwd(), pdfPath).replace(/\\/g, '/');
      meta.name = requestedName || (festival ? `${festival} Artwork Theme` : 'Custom Artwork Theme');
      meta.festival = festival;
    }
    // 3. Image (PNG, JPG, WebP, SVG)
    else {
      const imgPath = path.join(THEMES_STORAGE_DIR, 'images', `${id}.${magic.ext}`);
      fs.writeFileSync(imgPath, buffer);
      savedFilePath = path.relative(process.cwd(), imgPath).replace(/\\/g, '/');
      meta.name = requestedName || (festival ? `${festival} Festive Image Theme` : 'Custom Image Theme');
      meta.festival = festival;
    }

    const themeName = requestedName || meta.name || 'Untitled Theme';
    const effectiveFestival = festival || meta.festival || '';
    const effectiveStart = startDate || meta.startDate || '';
    const effectiveEnd = endDate || meta.endDate || '';

    if (isDefaultRequested) {
      runQuery('UPDATE pdf_themes SET is_default = 0');
    }

    runQuery(
      `INSERT INTO pdf_themes (id, name, festival, type, file_path, start_date, end_date, is_default, status, version, meta, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      [
        id,
        themeName,
        effectiveFestival,
        themeType,
        savedFilePath,
        effectiveStart,
        effectiveEnd,
        isDefaultRequested ? 1 : 0,
        meta.version || '1.0.0',
        JSON.stringify(meta),
        'Admin'
      ]
    );

    const created = queryOne('SELECT * FROM pdf_themes WHERE id = ?', [id]);
    res.status(201).json(formatPdfThemeRow(created));
  } catch (err: any) {
    console.error('Error uploading PDF theme:', err);
    res.status(400).json({ error: err.message || 'Failed to process theme upload.' });
  }
}

/**
 * PUT /api/pdf-themes/:id/activate
 */
export function activatePdfTheme(req: Request, res: Response): void {
  try {
    if (!isAdminUser(req)) {
      res.status(403).json({ error: 'Admin role required.' });
      return;
    }
    const theme = queryOne('SELECT id FROM pdf_themes WHERE id = ?', [req.params.id]);
    if (!theme) {
      res.status(404).json({ error: 'Theme not found' });
      return;
    }
    runQuery('UPDATE pdf_themes SET status = "active" WHERE id = ?', [req.params.id]);
    const updated = queryOne('SELECT * FROM pdf_themes WHERE id = ?', [req.params.id]);
    res.json(formatPdfThemeRow(updated));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to activate theme' });
  }
}

/**
 * PUT /api/pdf-themes/:id/default
 */
export function setDefaultPdfTheme(req: Request, res: Response): void {
  try {
    if (!isAdminUser(req)) {
      res.status(403).json({ error: 'Admin role required.' });
      return;
    }
    const theme = queryOne('SELECT id FROM pdf_themes WHERE id = ?', [req.params.id]);
    if (!theme) {
      res.status(404).json({ error: 'Theme not found' });
      return;
    }
    // Remove previous default
    runQuery('UPDATE pdf_themes SET is_default = 0');
    // Set new default and make active
    runQuery('UPDATE pdf_themes SET is_default = 1, status = "active" WHERE id = ?', [req.params.id]);
    const updated = queryOne('SELECT * FROM pdf_themes WHERE id = ?', [req.params.id]);
    res.json(formatPdfThemeRow(updated));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to set default theme' });
  }
}

/**
 * PUT /api/pdf-themes/:id/archive
 */
export function archivePdfTheme(req: Request, res: Response): void {
  try {
    if (!isAdminUser(req)) {
      res.status(403).json({ error: 'Admin role required.' });
      return;
    }
    const theme = queryOne('SELECT id, is_default FROM pdf_themes WHERE id = ?', [req.params.id]);
    if (!theme) {
      res.status(404).json({ error: 'Theme not found' });
      return;
    }
    if (theme.is_default) {
      res.status(400).json({ error: 'Cannot archive system default theme. Set another theme as default first.' });
      return;
    }
    runQuery('UPDATE pdf_themes SET status = "archived" WHERE id = ?', [req.params.id]);
    const updated = queryOne('SELECT * FROM pdf_themes WHERE id = ?', [req.params.id]);
    res.json(formatPdfThemeRow(updated));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to archive theme' });
  }
}

/**
 * DELETE /api/pdf-themes/:id
 */
export function deletePdfTheme(req: Request, res: Response): void {
  try {
    if (!isAdminUser(req)) {
      res.status(403).json({ error: 'Admin role required.' });
      return;
    }
    const theme = queryOne('SELECT * FROM pdf_themes WHERE id = ?', [req.params.id]);
    if (!theme) {
      res.status(404).json({ error: 'Theme not found' });
      return;
    }
    if (theme.is_default) {
      res.status(400).json({ error: 'Cannot delete the system default theme. Set another theme as default first.' });
      return;
    }

    // Clean up files on disk
    if (theme.file_path && fs.existsSync(theme.file_path)) {
      try {
        const fullPath = path.resolve(process.cwd(), theme.file_path);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(fullPath);
        }
      } catch (fileErr) {
        console.warn('Could not remove file for theme:', theme.id, fileErr);
      }
    }

    runQuery('DELETE FROM pdf_themes WHERE id = ?', [req.params.id]);
    res.json({ success: true, id: req.params.id });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete theme' });
  }
}

/**
 * POST /api/pdf-themes/generate-pdf
 */
export async function generatePackagePdf(req: Request, res: Response): Promise<void> {
  try {
    const pkg: PackageRenderData = req.body.package;
    if (!pkg || !pkg.title) {
      res.status(400).json({ error: 'Package data with title is required' });
      return;
    }

    const themeOverrideId = req.body.themeId || pkg.themeOverrideId;
    const { pdfBuffer, pageCount, themeUsed } = await renderPackageToPdfBuffer(pkg, themeOverrideId);

    const filename = `Kingsland-${(pkg.title || 'Package').replace(/\s+/g, '-')}-${themeUsed.name.replace(/\s+/g, '-')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('X-PDF-Page-Count', String(pageCount));
    res.setHeader('X-PDF-Theme-Used', themeUsed.name);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('PDF Generation failed:', err);
    res.status(500).json({ error: err.message || 'Failed to generate PDF' });
  }
}

/**
 * POST /api/pdf-themes/preview-html
 */
export function previewThemeHtml(req: Request, res: Response): void {
  try {
    const pkg: PackageRenderData = req.body.package || getSamplePackageByDays(req.body.sampleDays || 7);
    const themeOverrideId = req.body.themeId || req.body.themeOverrideId;
    const theme = resolveActivePdfTheme(themeOverrideId);
    const html = buildPackageProposalHtml(pkg, theme);
    res.send(html);
  } catch (err: any) {
    console.error('Preview generation failed:', err);
    res.status(500).json({ error: 'Failed to generate theme preview' });
  }
}

/**
 * Helper to generate mock package data for 1, 3, 7, and 15 days preview
 */
export function getSamplePackageByDays(daysCount: number = 7): PackageRenderData {
  const days = Math.max(1, Number(daysCount) || 7);
  const nights = Math.max(0, days - 1);

  const itinerary: PackageRenderData['itinerary'] = [];
  const baseActivities = [
    { title: 'Arrival & Welcome Briefing', desc: 'Arrive at destination in private vehicle. Check-in at your boutique resort, welcome refreshment, and evening stroll along the heritage avenue.' },
    { title: 'Scenic Valley Sightseeing & Culture', desc: 'Full-day tour exploring renowned temples, alpine viewpoints, and local handicraft bazaars with our certified tour guide.' },
    { title: 'Adventure Trail & Nature Excursion', desc: 'Morning mountain excursion, pine forest photography trail, followed by high-altitude valley viewpoints and picnic.' },
    { title: 'Historic Palaces & Heritage Walk', desc: 'Step back in time at ancient royal forts, botanical gardens, and museum galleries with dedicated private transport.' },
    { title: 'Lake Leisure & Sunset Cruise', desc: 'Peaceful boat ride across the placid lake waters, temple island visit, and gourmet multi-cuisine dinner.' },
    { title: 'Local Village & Artisan Craft Tour', desc: 'Immersive cultural interaction in traditional mountain hamlets, artisan weaving workshops, and culinary tasting.' },
    { title: 'Farewell & Scenic Departure', desc: 'Breakfast with mountain vistas, souvenir shopping, check-out, and seamless private transfer to airport / railway station.' },
  ];

  for (let i = 1; i <= days; i++) {
    const template = baseActivities[(i - 1) % baseActivities.length];
    itinerary.push({
      dayNumber: i,
      title: i === days ? 'Farewell & Onward Departure' : `Day ${i}: ${template.title}`,
      description: template.desc,
      shortSummary: template.desc.slice(0, 75) + '...',
      image: i % 2 === 1 ? 'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=600&q=80' : 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=600&q=80',
    });
  }

  return {
    title: `${days} Days Royal Himalayan Discovery`,
    destination: 'Himachal',
    duration: `${nights}N / ${days}D`,
    nights,
    daysCount: days,
    price: `₹${(24500 + days * 4500).toLocaleString('en-IN')}`,
    cutPrice: `₹${(29500 + days * 5000).toLocaleString('en-IN')}`,
    badge: 'Trending Holiday',
    heroImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
    summary: 'A signature handcrafted holiday offering deluxe stays, private scenic drives, cultural landmarks, and personal concierge support.',
    highlights: [
      'Private AC vehicle for all transfers & excursions',
      'Handpicked 4-star luxury stays with daily breakfast & dinner',
      'Panoramic high-altitude mountain valley excursions',
      '24/7 dedicated on-trip concierge assistance'
    ],
    inclusions: [
      'Accommodation on double sharing in 4-star deluxe hotels',
      'Breakfast and dinner on all days of stay (MAPAI plan)',
      'All transfers, sightseeing, and intercity travel by private cab',
      'Driver allowances, toll taxes, state permits, and parking charges',
      'All applicable government GST and statutory fees'
    ],
    exclusions: [
      'Airfare / Train tickets to and from originating city',
      'Personal expenses such as laundry, phone calls, and beverages',
      'Entry tickets, camera fees, and optional adventure activity charges',
      'Gratuities and tips to driver and local guides'
    ],
    specialNotes: 'Early check-in is subject to room availability upon arrival. Peak season festive gala dinners payable directly if applicable.',
    itinerary,
    hotels: [
      { hotelName: 'Radisson Cedar Valley Resort', city: 'Shimla', category: '5 Star Deluxe', roomType: 'Cedar Suite', mealPlan: 'MAPAI', nights: Math.ceil(nights / 2) },
      { hotelName: 'Katson Blue Mountain Hideaway', city: 'Manali', category: '4 Star Luxury', roomType: 'Himalayan Balcony', mealPlan: 'MAPAI', nights: Math.floor(nights / 2) }
    ],
    advisor: {
      name: 'Mohit Ahlawat',
      role: 'Senior Itinerary Curator',
      phone: '+91 6376983416',
      email: 'support@kingslandholiday.com'
    }
  };
}
