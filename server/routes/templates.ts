import { Router, Request, Response } from 'express';
import { getAllTemplates, createTemplate, deleteTemplate } from '../controllers/templatesController';
const router = Router();

router.get('/', (req: Request, res: Response) => { try { res.json(getAllTemplates(req.query.search as string)); } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch templates' }); } });

router.post('/', (req: Request, res: Response) => {
  try { const { title, destination, nights, templateData } = req.body; if (!title || !destination) return res.status(400).json({ error: 'Title and destination required' }); res.status(201).json(createTemplate({ title, destination, nights: nights || 6, templateData })); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create template' }); }
});

router.delete('/:id', (req: Request, res: Response) => {
  try { if (!deleteTemplate(req.params.id as string)) return res.status(404).json({ error: 'Template not found' }); res.json({ success: true }); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete template' }); }
});

export default router;
