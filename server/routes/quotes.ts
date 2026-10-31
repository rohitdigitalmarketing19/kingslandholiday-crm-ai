import { acceptBookingQuote } from '../services/bookingAcceptance';
import { updateLeadStatus } from '../controllers/leadsController';
import { HotelOptionValidationError } from '../../utils/hotelOptions';
import { Router, Request, Response } from 'express';
import { createQuote, updateQuote, deleteQuote } from '../controllers/quotesController';
const router = Router();

router.post('/:id/quotes/:qid/accept', (req,res) => {try {acceptBookingQuote(req.params.id,req.params.qid,res.locals.user.id);res.json(updateLeadStatus(req.params.id,'Closed Won'));}catch(error){res.status((error as any).status || 500).json({error:(error as Error).message});}});

router.post('/:id/quotes', (req: Request, res: Response) => {
  try { const lead = createQuote(req.params.id as string, req.body); if (!lead) return res.status(404).json({ error: 'Lead not found' }); res.status(201).json(lead); }
  catch (err) { if ((err as any).status) return res.status((err as any).status).json({error:(err as Error).message}); if (err instanceof HotelOptionValidationError) return res.status(400).json({ error: err.message }); console.error(err); res.status(500).json({ error: 'Failed to create quote' }); }
});

router.put('/:id/quotes/:qid', (req: Request, res: Response) => {
  try { const lead = updateQuote(req.params.id as string, req.params.qid as string, req.body, res.locals.user.id); if (!lead) return res.status(404).json({ error: 'Not found' }); res.json(lead); }
  catch (err) { if ((err as any).status) return res.status((err as any).status).json({error:(err as Error).message}); if (err instanceof HotelOptionValidationError) return res.status(400).json({ error: err.message }); console.error(err); res.status(500).json({ error: 'Failed to update quote' }); }
});

router.delete('/:id/quotes/:qid', (req: Request, res: Response) => {
  try { if (!deleteQuote(req.params.id as string, req.params.qid as string)) return res.status(404).json({ error: 'Quote not found' }); res.json({ success: true }); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete quote' }); }
});

export default router;
