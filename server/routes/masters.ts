import { asyncRouter } from '../utils/asyncRouter';
import { Router, Request, Response } from 'express';
import { getAllMasters, addMasterItem, toggleMasterItem, updateMasterItem, deleteMasterItem, } from '../controllers/mastersController';
const router = asyncRouter(Router());
router.get('/', async (req: Request, res: Response) => {
    try {
        const category = req.query.category as string | undefined;
        res.json(await getAllMasters(category));
    }
    catch (err: any) {
        console.error('Error fetching masters:', err);
        res.status(500).json({ error: 'Failed to fetch masters' });
    }
});
router.post('/', async (req: Request, res: Response) => {
    try {
        const { category, name, code, description } = req.body;
        if (!category || !name) {
            return res.status(400).json({ error: 'Category and Name are required' });
        }
        const item = await addMasterItem({ category, name, code, description });
        res.status(201).json(item);
    }
    catch (err: any) {
        console.error('Error creating master item:', err);
        res.status(500).json({ error: 'Failed to create master item' });
    }
});
router.patch('/:id/toggle', async (req: Request, res: Response) => {
    try {
        const { isEnabled } = req.body;
        const item = await toggleMasterItem(req.params.id as string, isEnabled);
        res.json(item);
    }
    catch (err: any) {
        console.error('Error toggling master item:', err);
        res.status(500).json({ error: 'Failed to toggle master item' });
    }
});
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const item = await updateMasterItem(req.params.id as string, req.body);
        res.json(item);
    }
    catch (err: any) {
        console.error('Error updating master item:', err);
        res.status(500).json({ error: 'Failed to update master item' });
    }
});
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        res.json(await deleteMasterItem(req.params.id as string));
    }
    catch (err: any) {
        console.error('Error deleting master item:', err);
        res.status(500).json({ error: 'Failed to delete master item' });
    }
});
export default router;
