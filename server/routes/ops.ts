import { Router, Request, Response } from 'express';
import {
  getAllOpsCustomers,
  getOpsCustomerById,
  createOpsCustomer,
  updateOpsCustomer,
  deleteOpsCustomer,
  recordOpsPayment,
  updateOpsInstallment,
  getAllOpsVouchers,
  createOpsVoucher,
  updateOpsVoucher,
  uploadOpsVoucherFile,
  deleteOpsVoucher,
  getAllOpsItineraries,
  getOpsItineraryByBookingId,
  updateOpsItinerary,
  addOrUpdateOpsActivity,
  deleteOpsActivity,
  resetOpsData,
} from '../controllers/opsController';

const router = Router();

// --- Customers ---

router.get('/customers', (req: Request, res: Response) => {
  try {
    const customers = getAllOpsCustomers({
      status: req.query.status as string,
      search: req.query.search as string,
    });
    res.json(customers);
  } catch (err) {
    console.error('Error fetching ops customers:', err);
    res.status(500).json({ error: 'Failed to fetch operations customers' });
  }
});

router.get('/customers/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const customer = getOpsCustomerById(id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    console.error('Error fetching customer:', err);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

router.post('/customers', (req: Request, res: Response) => {
  try {
    const newCustomer = createOpsCustomer(req.body);
    res.status(201).json(newCustomer);
  } catch (err) {
    console.error('Error creating ops customer:', err);
    res.status(500).json({ error: 'Failed to create operations customer' });
  }
});

router.put('/customers/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const updated = updateOpsCustomer(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Customer not found' });
    res.json(updated);
  } catch (err) {
    console.error('Error updating ops customer:', err);
    res.status(500).json({ error: 'Failed to update operations customer' });
  }
});

router.delete('/customers/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const success = deleteOpsCustomer(id);
    if (!success) return res.status(404).json({ error: 'Customer not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting ops customer:', err);
    res.status(500).json({ error: 'Failed to delete operations customer' });
  }
});

router.post('/customers/:id/payments', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { installmentId, ...details } = req.body;
    if (!installmentId) return res.status(400).json({ error: 'installmentId is required' });
    const updatedCustomer = recordOpsPayment(id, installmentId, details);
    res.json(updatedCustomer);
  } catch (err) {
    console.error('Error recording ops payment:', err);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

router.patch('/customers/:id/installments/:installmentId', (req: Request, res: Response) => {
  try {
    const { id, installmentId } = req.params;
    const updatedCustomer = updateOpsInstallment(id as string, installmentId as string, req.body);
    res.json(updatedCustomer);
  } catch (err) {
    console.error('Error updating ops installment:', err);
    res.status(500).json({ error: 'Failed to update installment' });
  }
});

// --- Vouchers ---

router.get('/vouchers', (req: Request, res: Response) => {
  try {
    const vouchers = getAllOpsVouchers({
      status: req.query.status as string,
      search: req.query.search as string,
    });
    res.json(vouchers);
  } catch (err) {
    console.error('Error fetching vouchers:', err);
    res.status(500).json({ error: 'Failed to fetch vouchers' });
  }
});

router.post('/vouchers', (req: Request, res: Response) => {
  try {
    const voucher = createOpsVoucher(req.body);
    res.status(201).json(voucher);
  } catch (err) {
    console.error('Error creating voucher:', err);
    res.status(500).json({ error: 'Failed to create voucher' });
  }
});

router.put('/vouchers/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const voucher = updateOpsVoucher(id, req.body);
    if (!voucher) return res.status(404).json({ error: 'Voucher not found' });
    res.json(voucher);
  } catch (err) {
    console.error('Error updating voucher:', err);
    res.status(500).json({ error: 'Failed to update voucher' });
  }
});

router.post('/vouchers/:id/upload', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { confirmationNumber, fileName, fileUrl } = req.body;
    if (!confirmationNumber || !fileName) {
      return res.status(400).json({ error: 'confirmationNumber and fileName are required' });
    }
    const voucher = uploadOpsVoucherFile(id, confirmationNumber, fileName, fileUrl);
    res.json(voucher);
  } catch (err) {
    console.error('Error uploading voucher file:', err);
    res.status(500).json({ error: 'Failed to upload voucher' });
  }
});

router.delete('/vouchers/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const success = deleteOpsVoucher(id);
    if (!success) return res.status(404).json({ error: 'Voucher not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting voucher:', err);
    res.status(500).json({ error: 'Failed to delete voucher' });
  }
});

// --- Itineraries & Activities ---

router.get('/itineraries', (req: Request, res: Response) => {
  try {
    const itineraries = getAllOpsItineraries();
    res.json(itineraries);
  } catch (err) {
    console.error('Error fetching itineraries:', err);
    res.status(500).json({ error: 'Failed to fetch itineraries' });
  }
});

router.get('/itineraries/:bookingId', (req: Request, res: Response) => {
  try {
    const bookingId = req.params.bookingId as string;
    const itinerary = getOpsItineraryByBookingId(bookingId);
    if (!itinerary) return res.status(404).json({ error: 'Itinerary not found' });
    res.json(itinerary);
  } catch (err) {
    console.error('Error fetching itinerary:', err);
    res.status(500).json({ error: 'Failed to fetch itinerary' });
  }
});

router.put('/itineraries/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const updated = updateOpsItinerary(id, req.body);
    res.json(updated);
  } catch (err) {
    console.error('Error updating itinerary:', err);
    res.status(500).json({ error: 'Failed to update itinerary' });
  }
});

router.post('/itineraries/:id/activities', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    addOrUpdateOpsActivity(id, req.body);
    const updated = getOpsItineraryByBookingId(id);
    res.json(updated);
  } catch (err) {
    console.error('Error adding activity:', err);
    res.status(500).json({ error: 'Failed to add/update activity' });
  }
});

router.delete('/activities/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const success = deleteOpsActivity(id);
    if (!success) return res.status(404).json({ error: 'Activity not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting activity:', err);
    res.status(500).json({ error: 'Failed to delete activity' });
  }
});

// --- Reset Data ---

router.post('/reset', (req: Request, res: Response) => {
  try {
    const result = resetOpsData();
    res.json(result);
  } catch (err) {
    console.error('Error resetting ops data:', err);
    res.status(500).json({ error: 'Failed to reset operations data' });
  }
});

export default router;
