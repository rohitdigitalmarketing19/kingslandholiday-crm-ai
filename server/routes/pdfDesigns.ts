import { Router, Request, Response } from 'express';
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
