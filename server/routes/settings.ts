import express from 'express';
import { getAgencySettings, updateAgencySettings, testSmtpConnection } from '../controllers/settingsController';

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

router.post('/test-email', async (req, res) => {
  try {
    const result = await testSmtpConnection(req.body);
    res.json(result);
  } catch (err: any) {
    console.error('Test email failed:', err);
    res.status(400).json({ error: err.message || 'Failed to send test email. Please check your SMTP settings and Gmail App Password.' });
  }
});

export default router;
