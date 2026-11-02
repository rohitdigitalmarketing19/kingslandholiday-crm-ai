import { asyncRouter } from '../utils/asyncRouter';
import { Router, Request, Response } from 'express';
import { getAllAgents, createAgent, updateAgent, deleteAgent } from '../controllers/agentsController';
import { queryOne } from '../db/connection';
const router = asyncRouter(Router());
async function checkAdminAccess(req: Request, res: Response): Promise<boolean> {
    const userId = req.headers['x-user-id'] as string;
    if (userId) {
        const user = await queryOne('SELECT role, access_level FROM users WHERE id = ?', [userId]);
        if (user) {
            if (user.role !== 'Admin') {
                res.status(403).json({ error: 'Access Denied: Only Administrators can add or modify sales representatives.' });
                return false;
            }
            if (user.access_level === 'ViewOnly') {
                res.status(403).json({ error: 'Access Denied: Your account is set to View-Only mode.' });
                return false;
            }
        }
    }
    return true;
}
router.get('/', async (req: Request, res: Response) => {
    try {
        res.json(await getAllAgents());
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch agents' });
    }
});
router.post('/', async (req: Request, res: Response) => {
    if (!await checkAdminAccess(req, res))
        return;
    try {
        const { name, specialty, avatar, phone, email } = req.body;
        if (!name || !name.trim())
            return res.status(400).json({ error: 'Name required' });
        res.status(201).json(await createAgent({
            name: name.trim(),
            specialty: Array.isArray(specialty) ? specialty : [],
            avatar: avatar || '',
            phone: phone || '',
            email: email || '',
        }));
    }
    catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message || 'Failed to create agent' });
    }
});
router.put('/:id', async (req: Request, res: Response) => {
    if (!await checkAdminAccess(req, res))
        return;
    try {
        const updated = await updateAgent(req.params.id as string, req.body);
        res.json(updated);
    }
    catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message || 'Failed to update agent' });
    }
});
router.delete('/:id', async (req: Request, res: Response) => {
    if (!await checkAdminAccess(req, res))
        return;
    try {
        const r = await deleteAgent(req.params.id as string);
        if (!r.success)
            return res.status(400).json({ error: r.message });
        res.json({ success: true });
    }
    catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message || 'Failed to delete agent' });
    }
});
export default router;
