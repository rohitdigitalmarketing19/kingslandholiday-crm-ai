import { Router, Request, Response } from 'express';
import { getAllAgents, createAgent, deleteAgent } from '../controllers/agentsController';
const router = Router();

router.get('/', (req: Request, res: Response) => { try { res.json(getAllAgents()); } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch agents' }); } });

router.post('/', (req: Request, res: Response) => {
  try { const { name, specialty } = req.body; if (!name) return res.status(400).json({ error: 'Name required' }); res.status(201).json(createAgent({ name, specialty: specialty || [] })); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create agent' }); }
});

router.delete('/:id', (req: Request, res: Response) => {
  try { const r = deleteAgent(req.params.id as string); if (!r.success) return res.status(400).json({ error: r.message }); res.json({ success: true }); }
  catch (err) { console.error(err); res.status(500).json({ error: 'Failed to delete agent' }); }
});

export default router;
