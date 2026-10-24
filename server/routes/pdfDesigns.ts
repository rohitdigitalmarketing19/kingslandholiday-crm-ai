import { Router, Request, Response } from 'express';
import fs from 'fs';
import puppeteer from 'puppeteer-core';
import { v4 as uuidv4 } from 'uuid';
import { queryAll, queryOne, runQuery } from '../db/connection';
import { renderCompleteProposalHtml } from '../../services/quoteDesignRenderer';
import {
  getAllPdfDesigns,
  getActivePdfDesign,
  getPdfDesignById,
  savePdfDesign,
  setActivePdfDesign,
  deactivatePdfDesign,
  updateFieldMappings,
  deletePdfDesign,
} from '../controllers/pdfDesignsController';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  try {
    res.json(getAllPdfDesigns());
  } catch (err: any) {
    console.error('Error fetching PDF designs:', err);
    res.status(500).json({ error: 'Failed to fetch PDF designs' });
  }
});

router.get('/active', (_req: Request, res: Response) => {
  try {
    const design = getActivePdfDesign();
    res.json(design || null);
  } catch (err: any) {
    console.error('Error fetching active PDF design:', err);
    res.status(500).json({ error: 'Failed to fetch active PDF design' });
  }
});

// PARTNER BRANDS (HOTEL & WORKING/TRAVEL PARTNERS)
router.get('/partners/all', (_req: Request, res: Response) => {
  try {
    const partners = queryAll('SELECT * FROM partner_brands WHERE is_active = 1 ORDER BY sort_order ASC, created_at ASC');
    res.json(partners);
  } catch (err: any) {
    console.error('Error fetching partner brands:', err);
    res.status(500).json({ error: 'Failed to fetch partner brands' });
  }
});

router.post('/partners', (req: Request, res: Response) => {
  try {
    const { name, category = 'hotel', tagline = '', brand_color = '#b8860b', logo_url = '', svg_icon = '' } = req.body;
    if (!name) return res.status(400).json({ error: 'Partner name is required' });
    const id = `partner-${uuidv4().slice(0, 8)}`;
    runQuery(
      `INSERT INTO partner_brands (id, category, name, tagline, brand_color, logo_url, svg_icon, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, 99)`,
      [id, category, name, tagline, brand_color, logo_url, svg_icon]
    );
    const created = queryOne('SELECT * FROM partner_brands WHERE id = ?', [id]);
    res.status(201).json(created);
  } catch (err: any) {
    console.error('Error creating partner brand:', err);
    res.status(500).json({ error: 'Failed to create partner brand' });
  }
});

router.delete('/partners/:id', (req: Request, res: Response) => {
  try {
    runQuery('DELETE FROM partner_brands WHERE id = ?', [String(req.params.id)]);
    res.json({ success: true, id: req.params.id });
  } catch (err: any) {
    console.error('Error deleting partner brand:', err);
    res.status(500).json({ error: 'Failed to delete partner brand' });
  }
});

// DESTINATION PHOTOS (BY CITY NAME, TITLE & TAGS)
router.get('/photos/all', (req: Request, res: Response) => {
  try {
    const q = req.query.city ? String(req.query.city).trim().toLowerCase() : '';
    let photos;
    if (q) {
      photos = queryAll(
        `SELECT * FROM destination_photos WHERE LOWER(city) LIKE ? OR LOWER(title) LIKE ? OR LOWER(tags) LIKE ? ORDER BY is_default DESC, created_at DESC`,
        [`%${q}%`, `%${q}%`, `%${q}%`]
      );
      // If none found for specific query, return top photos
      if (!photos || photos.length === 0) {
        photos = queryAll('SELECT * FROM destination_photos ORDER BY is_default DESC, created_at DESC LIMIT 30');
      }
    } else {
      photos = queryAll('SELECT * FROM destination_photos ORDER BY is_default DESC, created_at DESC');
    }
    res.json(photos);
  } catch (err: any) {
    console.error('Error fetching destination photos:', err);
    res.status(500).json({ error: 'Failed to fetch destination photos' });
  }
});

router.post('/photos', (req: Request, res: Response) => {
  try {
    let { city = '', title = '', image_url, tags = '' } = req.body;
    if (!image_url) {
      return res.status(400).json({ error: 'Image is required' });
    }
    const cleanTitle = (title || '').trim();
    const cleanCity = (city || '').trim();
    const finalCity = cleanCity || cleanTitle || 'General';
    const finalTitle = cleanTitle || cleanCity || 'Destination Photo';
    const finalTags = (tags || '').trim() || `${finalCity} ${finalTitle}`;

    const id = `photo-${uuidv4().slice(0, 8)}`;
    runQuery(
      `INSERT INTO destination_photos (id, city, title, image_url, tags, is_default)
       VALUES (?, ?, ?, ?, ?, 0)`,
      [id, finalCity, finalTitle, image_url, finalTags]
    );
    const created = queryOne('SELECT * FROM destination_photos WHERE id = ?', [id]);
    res.status(201).json(created);
  } catch (err: any) {
    console.error('Error saving destination photo:', err);
    res.status(500).json({ error: 'Failed to save destination photo' });
  }
});

router.delete('/photos/:id', (req: Request, res: Response) => {
  try {
    runQuery('DELETE FROM destination_photos WHERE id = ?', [String(req.params.id)]);
    res.json({ success: true, id: req.params.id });
  } catch (err: any) {
    console.error('Error deleting photo:', err);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const design = getPdfDesignById(String(req.params.id));
    if (!design) return res.status(404).json({ error: 'Design not found' });
    res.json(design);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch PDF design' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const design = savePdfDesign(req.body);
    res.status(201).json(design);
  } catch (err: any) {
    console.error('Error saving PDF design:', err);
    res.status(500).json({ error: 'Failed to save PDF design' });
  }
});

router.patch('/:id/activate', (req: Request, res: Response) => {
  try {
    const design = setActivePdfDesign(String(req.params.id));
    res.json(design);
  } catch (err: any) {
    console.error('Error activating PDF design:', err);
    res.status(500).json({ error: 'Failed to activate PDF design' });
  }
});

router.patch('/:id/deactivate', (req: Request, res: Response) => {
  try {
    const design = deactivatePdfDesign(String(req.params.id));
    res.json(design);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to deactivate PDF design' });
  }
});

router.patch('/:id/mappings', (req: Request, res: Response) => {
  try {
    const { field_mappings } = req.body;
    const design = updateFieldMappings(String(req.params.id), JSON.stringify(field_mappings || []));
    res.json(design);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update field mappings' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    res.json(deletePdfDesign(String(req.params.id)));
  } catch (err: any) {
    console.error('Error deleting PDF design:', err);
    res.status(500).json({ error: 'Failed to delete PDF design' });
  }
});

// SERVER-SIDE CONTINUOUS CHROMIUM/PUPPETEER PDF RENDERER
router.post('/render-pdf', async (req: Request, res: Response) => {
  let browser: any = null;
  try {
    const { quoteData, designId = 'royal', partnerBrands, isB2B = false } = req.body;
    if (!quoteData) {
      return res.status(400).json({ error: 'quoteData is required' });
    }

    const htmlContent = renderCompleteProposalHtml(quoteData, designId, partnerBrands, isB2B);

    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..700&family=DM+Serif+Display&family=Hanken+Grotesk:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&family=Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,700&family=Nunito:wght@400;600;700;800&family=Outfit:wght@400;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;0,800;0,900;1,600&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `;

    const CHROME_PATHS = [
      process.env.CHROME_BIN,
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
    ].filter(Boolean) as string[];

    const executablePath = CHROME_PATHS.find(p => fs.existsSync(p));
    if (!executablePath) {
      return res.status(500).json({ error: 'Chromium/Chrome binary not found on server' });
    }

    browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.setContent(fullHtml, { waitUntil: ['load', 'networkidle0' as any] });

    // Wait for fonts and all images to complete loading
    await page.evaluate(async () => {
      if ((document as any).fonts && (document as any).fonts.ready) {
        await (document as any).fonts.ready;
      }
      const imgs = Array.from(document.querySelectorAll('img'));
      await Promise.all(
        imgs.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    res.setHeader('Content-Type', 'application/pdf');
    const clientName = (quoteData.client || 'Client').replace(/\s+/g, '-');
    const ref = (quoteData.ref || 'Quote').replace(/\s+/g, '-');
    res.setHeader('Content-Disposition', `attachment; filename="Kingsland-Proposal-${ref}-${clientName}.pdf"`);
    res.send(Buffer.from(pdfBuffer));
  } catch (err: any) {
    console.error('Server PDF Generation Error:', err);
    res.status(500).json({ error: err.message || 'Failed to render PDF' });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
});

export default router;
