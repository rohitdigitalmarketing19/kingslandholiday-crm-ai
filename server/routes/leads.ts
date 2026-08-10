import { Router, Request, Response } from 'express';
import { getAllLeads, getLeadById, createLead, updateLeadStatus, deleteLead, updateLeadAccounts } from '../controllers/leadsController';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try { res.json(getAllLeads({ status: req.query.status as string, assignedTo: req.query.assignedTo as string, search: req.query.search as string })); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch leads' }); }
});

router.get('/:id', (req: Request, res: Response) => {
  try { const lead = getLeadById(req.params.id as string); if (!lead) return res.status(404).json({ error: 'Lead not found' }); res.json(lead); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch lead' }); }
});

router.post('/', (req: Request, res: Response) => {
  try { res.status(201).json(createLead(req.body)); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create lead' }); }
});

router.patch('/:id/status', (req: Request, res: Response) => {
  try {
    const { status, postponedDate, postponedReason, followUpDate, followUpTime, followUpType, followUpNote, followUpCompleted } = req.body;
    if (!status && followUpCompleted === undefined) return res.status(400).json({ error: 'Status or update data required' });
    const lead = updateLeadStatus(req.params.id as string, status || 'Follow-up', { 
      postponedDate, postponedReason, followUpDate, followUpTime, followUpType, followUpNote, followUpCompleted 
    });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json(lead);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.patch('/:id/accounts', (req: Request, res: Response) => {
  try {
    const { accountsRemarks, reviewRequestedAt, reviewChannel } = req.body;
    const lead = updateLeadAccounts(req.params.id as string, { accountsRemarks, reviewRequestedAt, reviewChannel });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json(lead);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update accounts details' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try { if (!deleteLead(req.params.id as string)) return res.status(404).json({ error: 'Lead not found' }); res.json({ success: true }); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete lead' }); }
});

export default router;
