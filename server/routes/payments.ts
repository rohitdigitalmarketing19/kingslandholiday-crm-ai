import { createRazorpayOrder, verifyRazorpayPayment, reconcileRazorpayOrder } from '../services/razorpay';
import { paymentOverview } from '../services/paymentOverview';
import { queryOne } from '../db/connection';
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
  updateInstallmentComment,
  confirmPaymentLink,
} from '../controllers/paymentsController';

const router = Router();
router.post('/razorpay/orders',async(req,res)=>{try{if(!Number.isSafeInteger(req.body.expectedPrincipalPaise) || req.body.expectedPrincipalPaise<=0)return res.status(400).json({error:'Invalid expected payment amount.'});res.status(201).json(await createRazorpayOrder(req.body.payKey,req.body.expectedPrincipalPaise));}catch(error){res.status((error as any).status || 500).json({error:(error as any).status ? (error as Error).message : 'Could not start Razorpay checkout.'});}});
router.post('/razorpay/verify',async(req,res)=>{try{res.json(await verifyRazorpayPayment(req.body));}catch(error){res.status((error as any).status || 500).json({error:(error as any).status ? (error as Error).message : 'Could not verify Razorpay payment. Contact your travel expert if you were debited.'});}});
router.post('/razorpay/reconcile',async(req,res)=>{try{res.json(await reconcileRazorpayOrder(req.body.payKey,req.body.orderId));}catch(error){res.status((error as any).status || 500).json({error:(error as any).status ? (error as Error).message : 'Could not check payment status.'});}});
router.get('/overview',(req,res)=>{try{res.json(paymentOverview(req.query.leadId as string | undefined,res.locals.allowedOwners));}catch(error){console.error(error);res.status(500).json({error:'Could not load payment overview.'});}});

// Settings (Razorpay API Credentials & Bank/UPI setup)
router.get('/settings', (req: Request, res: Response) => {
  try {
    const {key_secret,...safe}=getPaymentSettings();res.json({...safe,key_secret:'',has_key_secret:!!key_secret});
  } catch (err: any) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.post('/settings', (req: Request, res: Response) => {
  if(res.locals.user?.role!=='Admin')return res.status(403).json({error:'Administrator access required.'});
  try {
    const {key_secret,...safe}=savePaymentSettings(req.body);res.json({...safe,key_secret:'',has_key_secret:!!key_secret});
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
    res.status((err as any).status || 500).json({error:(err as any).status ? (err as Error).message : 'Failed to save installments'});
  }
});

router.patch('/installments/:id/status', (req: Request, res: Response) => {
  try {
    const { status, paidAmount, paymentMode, transactionRef, comments, notes } = req.body;
    res.json(updateInstallmentStatus(req.params.id as string, status, paidAmount, paymentMode, transactionRef, comments || notes, res.locals.user?.id));
  } catch (err: any) {
    console.error('Error updating installment status:', err);
    res.status((err as any).status || 500).json({error:(err as any).status ? (err as Error).message : 'Failed to update installment status'});
  }
});

router.patch('/installments/:id/comment', (req: Request, res: Response) => {
  try {
    const { comment, comments, notes } = req.body;
    res.json(updateInstallmentComment(req.params.id as string, comment || comments || notes || ''));
  } catch (err: any) {
    console.error('Error updating installment comment:', err);
    res.status(500).json({ error: 'Failed to update installment comment' });
  }
});

router.post('/confirm', (req: Request, res: Response) => {
  try {
    const { payKey, id, refNumber, paymentMode, amount, comments, notes } = req.body;
    res.json(confirmPaymentLink(payKey || id, refNumber, paymentMode, amount, comments || notes, res.locals.user?.id));
  } catch (err: any) {
    console.error('Error confirming payment:', err);
    res.status((err as any).status || 500).json({ error: (err as any).status ? (err as Error).message : 'Failed to confirm payment' });
  }
});

router.patch('/links/:key/status', (req: Request, res: Response) => {
  try {
    const { status, paidAmount, paymentMode, transactionRef } = req.body;
    res.json(confirmPaymentLink(req.params.key as string, transactionRef, paymentMode, paidAmount, undefined, res.locals.user?.id));
  } catch (err: any) {
    console.error('Error updating payment link status:', err);
    res.status((err as any).status || 500).json({error:(err as any).status ? (err as Error).message : 'Failed to update link status'});
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
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Failed to create payment link' });
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
    const link=queryOne('SELECT * FROM payment_links WHERE pay_key=?',[req.body.payKey || '']);
    const inst=queryOne('SELECT * FROM payment_installments WHERE pay_key=?',[req.body.payKey || '']);
    if(!link && !inst)return res.status(400).json({error:'A valid payment request is required.'});
    if(!Number.isFinite(Number(req.body.amountPaid)) || Number(req.body.amountPaid)<=0 || Number(req.body.amountPaid)>Number(inst?.amount ?? link.net_amount))return res.status(400).json({error:'Invalid submitted amount.'});
    res.status(201).json(createPaymentSubmission({...req.body,leadId:inst?.lead_id || link.lead_id}));
  } catch (err: any) {
    console.error('Error creating payment submission:', err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Failed to submit payment' });
  }
});

router.patch('/submissions/:id/verify', (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    const sub = updatePaymentVerificationStatus(req.params.id as string, status, res.locals.user?.id);
    if (!sub) return res.status(404).json({ error: 'Submission not found' });
    res.json(sub);
  } catch (err: any) {
    console.error('Error updating payment status:', err);
    res.status((err as any).status || 500).json({error:(err as any).status ? (err as Error).message : 'Failed to update status'});
  }
});

export default router;
