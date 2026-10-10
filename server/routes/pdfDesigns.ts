import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { queryAll, queryOne, runQuery } from '../db/connection';
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

export default router;
