import { Router, Request, Response } from 'express';
import { analyzeLeadInquiry, generateItinerary, draftFollowUpEmail } from '../controllers/aiController';

const router = Router();

router.post('/analyze-lead', async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers['x-gemini-api-key'] as string | undefined;
    res.json(await analyzeLeadInquiry(req.body, apiKey));
  } catch (err: any) {
    console.error('AI analysis error:', err);
    res.status(500).json({ error: 'AI analysis failed', message: err.message });
  }
});

router.post('/generate-itinerary', async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers['x-gemini-api-key'] as string | undefined;
    res.json(await generateItinerary(req.body, apiKey));
  } catch (err: any) {
    console.error('AI itinerary error:', err);
    res.status(500).json({ error: 'AI itinerary generation failed', message: err.message });
  }
});

router.post('/draft-email', async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers['x-gemini-api-key'] as string | undefined;
    const result = await draftFollowUpEmail(req.body, apiKey);
    res.json(result);
  } catch (err: any) {
    console.error('AI email error:', err);
    res.status(500).json({ error: 'AI email drafting failed', message: err.message });
  }
});

export default router;
