import { Router, Request, Response } from 'express';
import { createQuote, updateQuote, deleteQuote } from '../controllers/quotesController';
const router = Router();

router.post('/:id/quotes', (req: Request, res: Response) => {
  try { const lead = createQuote(req.params.id as string, req.body); if (!lead) return res.status(404).json({ error: 'Lead not found' }); res.status(201).json(lead); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create quote' }); }
});

router.put('/:id/quotes/:qid', (req: Request, res: Response) => {
  try { const lead = updateQuote(req.params.id as string, req.params.qid as string, req.body); if (!lead) return res.status(404).json({ error: 'Not found' }); res.json(lead); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Failed to update quote' }); }
});

router.delete('/:id/quotes/:qid', (req: Request, res: Response) => {
  try { if (!deleteQuote(req.params.id as string, req.params.qid as string)) return res.status(404).json({ error: 'Quote not found' }); res.json({ success: true }); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete quote' }); }
});

export default router;
