import express from 'express';
import { getAgencySettings, updateAgencySettings } from '../controllers/settingsController';

const router = express.Router();

router.get('/', (_req, res) => {
  try {
    const settings = getAgencySettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch settings' });
  }
});

router.post('/', (req, res) => {
  try {
    const updated = updateAgencySettings(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update settings' });
  }
});

router.put('/', (req, res) => {
  try {
    const updated = updateAgencySettings(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update settings' });
  }
});

export default router;
