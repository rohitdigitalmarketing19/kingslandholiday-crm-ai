import { Router } from 'express';
import { queryAll, queryOne } from '../db/connection';
import { rateLimiterMiddleware } from '../middleware/security';
import { saveB2BContact } from './b2bData';
import { saveHotelRate } from './hotelRates';

const router = Router();
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
router.get('/hotel-categories', (_req, res) => res.json(queryAll("SELECT name FROM masters_data WHERE category='Hotel Categories' AND is_enabled=1 ORDER BY name COLLATE NOCASE").map(row => row.name)));
router.post('/:kind(hotel-rates|b2b-data)', rateLimiterMiddleware(10, 60_000), (req, res, next) => {
  if (!req.body || typeof req.body.requestId !== 'string' || !/^[a-f0-9-]{36}$/i.test(req.body.requestId)) return res.status(400).json({ error: 'Reload the entry page and try again.' });
  if (req.body.website) return res.status(400).json({ error: 'Unable to accept this submission.' });
  const previous = queryOne('SELECT record_id FROM public_entry_submissions WHERE request_id=? AND kind=?', [req.body.requestId, req.params.kind]);
  if (previous) return res.json({ success: true, reference: previous.record_id });
  res.locals.actor = 'public-entry';
  res.locals.publicEntry = true;
  if (req.params.kind === 'hotel-rates') return saveHotelRate(req, res, next);
  return saveB2BContact(req, res, next);
});
export default router;
