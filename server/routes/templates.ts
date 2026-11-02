import { asyncRouter } from '../utils/asyncRouter';
import { Router, Request, Response } from 'express';
import { getAllTemplates, createTemplate, deleteTemplate, updateTemplate } from '../controllers/templatesController';
const router = asyncRouter(Router());
router.get('/', async (req: Request, res: Response) => { try {
    res.json(await getAllTemplates(req.query.search as string));
}
catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch templates' });
} });
router.post('/', async (req: Request, res: Response) => {
    try {
        const { title, destination, nights, templateData } = req.body;
        if (!title || !destination)
            return res.status(400).json({ error: 'Title and destination required' });
        res.status(201).json(await createTemplate({ title, destination, nights: nights || 6, templateData }));
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create template' });
    }
});
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const updated = await updateTemplate(req.params.id as string, req.body);
        if (!updated)
            return res.status(404).json({ error: 'Template not found' });
        res.json(updated);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update template' });
    }
});
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        if (!await deleteTemplate(req.params.id as string))
            return res.status(404).json({ error: 'Template not found' });
        res.json({ success: true });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete template' });
    }
});
export default router;
