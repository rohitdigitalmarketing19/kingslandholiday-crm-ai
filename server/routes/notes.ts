import { Router, Request, Response } from 'express';
import { addNote, getNotes } from '../controllers/notesController';
const router = Router();

router.post('/:id/notes', (req: Request, res: Response) => {
  try { const { text, type } = req.body; if (!text) return res.status(400).json({ error: 'Text required' }); res.status(201).json(addNote(req.params.id as string, text, type || 'Note')); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Failed to add note' }); }
});

router.get('/:id/notes', (req: Request, res: Response) => {
  try { res.json(getNotes(req.params.id as string)); } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch notes' }); }
});

export default router;
