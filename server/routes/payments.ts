import { Router, Request, Response } from 'express';
import {
  createPaymentLink,
  getPaymentLinkByKey,
  getAllPaymentLinks,
  createPaymentSubmission,
  getAllPaymentSubmissions,
  clearAllPaymentSubmissions,
  updatePaymentVerificationStatus,
  getPaymentSettings,
  savePaymentSettings,
  getLeadInstallments,
  saveInstallmentSchedule,
  updateInstallmentStatus,
  confirmPaymentLink,
} from '../controllers/paymentsController';

const router = Router();

// Settings (Razorpay API Credentials & Bank/UPI setup)
router.get('/settings', (req: Request, res: Response) => {
  try {
    res.json(getPaymentSettings());
  } catch (err: any) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.post('/settings', (req: Request, res: Response) => {
  try {
    res.json(savePaymentSettings(req.body));
  } catch (err: any) {
    console.error('Error saving settings:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Installments & EMI Schedule
router.get('/installments', (req: Request, res: Response) => {
  try {
    const leadId = req.query.leadId as string;
    if (!leadId) return res.status(400).json({ error: 'leadId is required' });
    res.json(getLeadInstallments(leadId));
  } catch (err: any) {
    console.error('Error fetching installments:', err);
    res.status(500).json({ error: 'Failed to fetch installments' });
  }
});

router.post('/installments', (req: Request, res: Response) => {
  try {
    const { leadId, installments } = req.body;
    if (!leadId || !Array.isArray(installments)) {
      return res.status(400).json({ error: 'leadId and installments array are required' });
    }
    res.json(saveInstallmentSchedule(leadId, installments));
  } catch (err: any) {
    console.error('Error saving installments:', err);
    res.status(500).json({ error: 'Failed to save installments' });
  }
});

router.patch('/installments/:id/status', (req: Request, res: Response) => {
  try {
    const { status, paidAmount, paymentMode, transactionRef } = req.body;
    res.json(updateInstallmentStatus(req.params.id as string, status, paidAmount, paymentMode, transactionRef));
  } catch (err: any) {
    console.error('Error updating installment status:', err);
    res.status(500).json({ error: 'Failed to update installment status' });
  }
});

router.post('/confirm', (req: Request, res: Response) => {
  try {
    const { payKey, id, refNumber, paymentMode, amount } = req.body;
    res.json(confirmPaymentLink(payKey || id, refNumber, paymentMode, amount));
  } catch (err: any) {
    console.error('Error confirming payment:', err);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

router.patch('/links/:key/status', (req: Request, res: Response) => {
  try {
    const { status, paidAmount, paymentMode, transactionRef } = req.body;
    res.json(confirmPaymentLink(req.params.key as string, transactionRef, paymentMode, paidAmount));
  } catch (err: any) {
    console.error('Error updating payment link status:', err);
    res.status(500).json({ error: 'Failed to update link status' });
  }
});

// Links
router.get('/links', (req: Request, res: Response) => {
  try {
    const leadId = req.query.leadId as string | undefined;
    res.json(getAllPaymentLinks(leadId));
  } catch (err: any) {
    console.error('Error fetching payment links:', err);
    res.status(500).json({ error: 'Failed to fetch payment links' });
  }
});

router.get('/links/:key', (req: Request, res: Response) => {
  try {
    const link = getPaymentLinkByKey(req.params.key as string);
    if (!link) return res.status(404).json({ error: 'Payment link not found or expired' });
    res.json(link);
  } catch (err: any) {
    console.error('Error fetching payment link:', err);
    res.status(500).json({ error: 'Failed to fetch payment link' });
  }
});

router.post('/links', (req: Request, res: Response) => {
  try {
    res.status(201).json(createPaymentLink(req.body));
  } catch (err: any) {
    console.error('Error creating payment link:', err);
    res.status(500).json({ error: 'Failed to create payment link' });
  }
});

// Submissions
router.get('/submissions', (req: Request, res: Response) => {
  try {
    const leadId = req.query.leadId as string | undefined;
    res.json(getAllPaymentSubmissions(leadId));
  } catch (err: any) {
    console.error('Error fetching payment submissions:', err);
    res.status(500).json({ error: 'Failed to fetch payment submissions' });
  }
});

router.delete('/submissions', (req: Request, res: Response) => {
  try {
    res.json(clearAllPaymentSubmissions());
  } catch (err: any) {
    console.error('Error clearing payment submissions:', err);
    res.status(500).json({ error: 'Failed to clear payment submissions' });
  }
});

router.post('/submissions', (req: Request, res: Response) => {
  try {
    res.status(201).json(createPaymentSubmission(req.body));
  } catch (err: any) {
    console.error('Error creating payment submission:', err);
    res.status(500).json({ error: 'Failed to submit payment' });
  }
});

router.patch('/submissions/:id/verify', (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    const sub = updatePaymentVerificationStatus(req.params.id as string, status);
    if (!sub) return res.status(404).json({ error: 'Submission not found' });
    res.json(sub);
  } catch (err: any) {
    console.error('Error updating payment status:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

export default router;
