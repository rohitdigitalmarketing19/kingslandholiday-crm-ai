import { asyncRouter } from '../utils/asyncRouter';
import { Router, Request, Response } from 'express';
import { getAllLeads, getLeadById, createLead, updateLeadStatus, deleteLead, updateLeadAccounts, updateLeadTravelers, reassignLead } from '../controllers/leadsController';
const router = asyncRouter(Router());
router.get('/', async (req: Request, res: Response) => {
    try {
        res.json(await getAllLeads({ status: req.query.status as string, assignedTo: res.locals.allowedOwners || req.query.assignedTo as string, search: req.query.search as string }));
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
});
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const lead = await getLeadById(req.params.id as string);
        if (!lead)
            return res.status(404).json({ error: 'Lead not found' });
        res.json(lead);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch lead' });
    }
});
router.post('/', async (req: Request, res: Response) => {
    try {
        res.status(201).json(await createLead(req.body, res.locals.user.id));
    }
    catch (err) {
        console.error(err);
        res.status((err as any).status || 500).json({ error: (err as Error).message });
    }
});
router.patch('/:id/status', async (req: Request, res: Response) => {
    try {
        const { status, postponedDate, postponedReason, followUpDate, followUpTime, followUpType, followUpNote, followUpCompleted } = req.body;
        if (!status && followUpCompleted === undefined)
            return res.status(400).json({ error: 'Status or update data required' });
        const lead = await updateLeadStatus(req.params.id as string, status || 'Follow-up', {
            postponedDate, postponedReason, followUpDate, followUpTime, followUpType, followUpNote, followUpCompleted
        });
        if (!lead)
            return res.status(404).json({ error: 'Lead not found' });
        res.json(lead);
    }
    catch (err) {
        console.error(err);
        res.status((err as any).status || 500).json({ error: (err as any).status ? (err as Error).message : 'Failed to update status' });
    }
});
router.patch('/:id/accounts', async (req: Request, res: Response) => {
    try {
        const { accountsRemarks, reviewRequestedAt, reviewChannel } = req.body;
        const lead = await updateLeadAccounts(req.params.id as string, { accountsRemarks, reviewRequestedAt, reviewChannel });
        if (!lead)
            return res.status(404).json({ error: 'Lead not found' });
        res.json(lead);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update accounts details' });
    }
});
router.patch('/:id/travelers', async (req: Request, res: Response) => {
    try {
        const { adults, children, childAges, budgetTier, includeStay, includeFlight, includeCab, hotelCategory, otherInfo } = req.body;
        if (adults === undefined || children === undefined) {
            return res.status(400).json({ error: 'adults and children count are required' });
        }
        const lead = await updateLeadTravelers(req.params.id as string, Number(adults), Number(children), childAges || [], budgetTier, includeStay, includeFlight, includeCab, hotelCategory, otherInfo);
        if (!lead)
            return res.status(404).json({ error: 'Lead not found' });
        res.json(lead);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update travelers details' });
    }
});
router.patch('/:id/reassign', async (req: Request, res: Response) => {
    try {
        const { assignedTo } = req.body;
        if (!assignedTo)
            return res.status(400).json({ error: 'assignedTo is required' });
        const lead = await reassignLead(req.params.id as string, assignedTo);
        if (!lead)
            return res.status(404).json({ error: 'Lead not found' });
        res.json(lead);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to reassign lead' });
    }
});
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        if (!await deleteLead(req.params.id as string, res.locals.user?.id || 'system'))
            return res.status(404).json({ error: 'Lead not found' });
        res.json({ success: true });
    }
    catch (err) {
        console.error(err);
        res.status((err as any).status || 500).json({ error: (err as Error).message });
    }
});
export default router;
