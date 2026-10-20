import { Router } from 'express';
import {
  getClientDetailsForLead,
  generateClientDetailsLink,
  toggleClientDetailsLink,
  updateTravellersByAdmin,
  getPublicClientDetails,
  submitPublicClientDetails
} from '../controllers/clientDetailsController';
import { rateLimiterMiddleware } from '../middleware/security';

const router = Router({ mergeParams: true });

// Admin Lead Client Details endpoints
router.get('/:leadId/client-details', getClientDetailsForLead);
router.post('/:leadId/client-details/generate-link', generateClientDetailsLink);
router.patch('/:leadId/client-details/toggle-link', toggleClientDetailsLink);
router.put('/:leadId/client-details/travellers', updateTravellersByAdmin);

export const publicClientDetailsRouter = Router();

// Public rate limiter: max 40 requests per 10 minutes per IP
publicClientDetailsRouter.use(rateLimiterMiddleware(40, 10 * 60 * 1000));
publicClientDetailsRouter.get('/:token', getPublicClientDetails);
publicClientDetailsRouter.post('/:token', submitPublicClientDetails);

export default router;
