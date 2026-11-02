import { asyncRouter } from '../utils/asyncRouter';
import { Router, Request, Response } from 'express';
import { getAllOpsCustomers, getOpsCustomerById, createOpsCustomer, updateOpsCustomer, deleteOpsCustomer, recordOpsPayment, updateOpsInstallment, getAllOpsVouchers, createOpsVoucher, updateOpsVoucher, uploadOpsVoucherFile, deleteOpsVoucher, getAllOpsItineraries, getOpsItineraryByBookingId, updateOpsItinerary, addOrUpdateOpsActivity, deleteOpsActivity, resetOpsData, } from '../controllers/opsController';
const router = asyncRouter(Router());
// --- Customers ---
router.get('/customers', async (req: Request, res: Response) => {
    try {
        const customers = await getAllOpsCustomers({
            status: req.query.status as string,
            search: req.query.search as string,
        });
        res.json(customers);
    }
    catch (err) {
        console.error('Error fetching ops customers:', err);
        res.status((err as any).status || 500).json({ error: (err as any).status ? (err as Error).message : 'Failed to fetch operations customers' });
    }
});
router.get('/customers/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const customer = await getOpsCustomerById(id);
        if (!customer)
            return res.status(404).json({ error: 'Customer not found' });
        res.json(customer);
    }
    catch (err) {
        console.error('Error fetching customer:', err);
        res.status((err as any).status || 500).json({ error: (err as any).status ? (err as Error).message : 'Failed to fetch customer' });
    }
});
router.post('/customers', async (req: Request, res: Response) => {
    try {
        const newCustomer = await createOpsCustomer(req.body);
        res.status(201).json(newCustomer);
    }
    catch (err) {
        console.error('Error creating ops customer:', err);
        res.status((err as any).status || 500).json({ error: (err as any).status ? (err as Error).message : 'Failed to create operations customer' });
    }
});
router.put('/customers/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const updated = await updateOpsCustomer(id, req.body, res.locals.user?.id);
        if (!updated)
            return res.status(404).json({ error: 'Customer not found' });
        res.json(updated);
    }
    catch (err) {
        console.error('Error updating ops customer:', err);
        res.status((err as any).status || 500).json({ error: (err as Error).message });
    }
});
router.delete('/customers/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const success = await deleteOpsCustomer(id);
        if (!success)
            return res.status(404).json({ error: 'Customer not found' });
        res.json({ success: true });
    }
    catch (err) {
        console.error('Error deleting ops customer:', err);
        res.status((err as any).status || 500).json({ error: (err as any).status ? (err as Error).message : 'Failed to delete operations customer' });
    }
});
router.post('/customers/:id/payments', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { installmentId, ...details } = req.body;
        if (!installmentId)
            return res.status(400).json({ error: 'installmentId is required' });
        const updatedCustomer = await recordOpsPayment(id, installmentId, details, res.locals.user?.id);
        res.json(updatedCustomer);
    }
    catch (err) {
        console.error('Error recording ops payment:', err);
        res.status((err as any).status || 500).json({ error: (err as any).status ? (err as Error).message : 'Failed to record payment' });
    }
});
router.patch('/customers/:id/installments/:installmentId', async (req: Request, res: Response) => {
    try {
        const { id, installmentId } = req.params;
        const updatedCustomer = await updateOpsInstallment(id as string, installmentId as string, req.body, res.locals.user?.id);
        res.json(updatedCustomer);
    }
    catch (err) {
        console.error('Error updating ops installment:', err);
        res.status((err as any).status || 500).json({ error: (err as any).status ? (err as Error).message : 'Failed to update installment' });
    }
});
// --- Vouchers ---
router.get('/vouchers', async (req: Request, res: Response) => {
    try {
        const vouchers = await getAllOpsVouchers({
            status: req.query.status as string,
            search: req.query.search as string,
        });
        res.json(vouchers);
    }
    catch (err) {
        console.error('Error fetching vouchers:', err);
        res.status((err as any).status || 500).json({ error: (err as any).status ? (err as Error).message : 'Failed to fetch vouchers' });
    }
});
router.post('/vouchers', async (req: Request, res: Response) => {
    try {
        const voucher = await createOpsVoucher(req.body);
        res.status(201).json(voucher);
    }
    catch (err) {
        console.error('Error creating voucher:', err);
        res.status((err as any).status || 500).json({ error: (err as any).status ? (err as Error).message : 'Failed to create voucher' });
    }
});
router.put('/vouchers/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const voucher = await updateOpsVoucher(id, req.body, res.locals.user?.id);
        if (!voucher)
            return res.status(404).json({ error: 'Voucher not found' });
        res.json(voucher);
    }
    catch (err) {
        console.error('Error updating voucher:', err);
        res.status((err as any).status || 500).json({ error: (err as any).status ? (err as Error).message : 'Failed to update voucher' });
    }
});
router.post('/vouchers/:id/upload', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const { confirmationNumber, fileName, fileUrl } = req.body;
        if (!confirmationNumber || !fileName) {
            return res.status(400).json({ error: 'confirmationNumber and fileName are required' });
        }
        const voucher = await uploadOpsVoucherFile(id, confirmationNumber, fileName, fileUrl);
        res.json(voucher);
    }
    catch (err) {
        console.error('Error uploading voucher file:', err);
        res.status((err as any).status || 500).json({ error: (err as any).status ? (err as Error).message : 'Failed to upload voucher' });
    }
});
router.delete('/vouchers/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const success = await deleteOpsVoucher(id);
        if (!success)
            return res.status(404).json({ error: 'Voucher not found' });
        res.json({ success: true });
    }
    catch (err) {
        console.error('Error deleting voucher:', err);
        res.status((err as any).status || 500).json({ error: (err as any).status ? (err as Error).message : 'Failed to delete voucher' });
    }
});
// --- Itineraries & Activities ---
router.get('/itineraries', async (req: Request, res: Response) => {
    try {
        const itineraries = await getAllOpsItineraries();
        res.json(itineraries);
    }
    catch (err) {
        console.error('Error fetching itineraries:', err);
        res.status((err as any).status || 500).json({ error: (err as any).status ? (err as Error).message : 'Failed to fetch itineraries' });
    }
});
router.get('/itineraries/:bookingId', async (req: Request, res: Response) => {
    try {
        const bookingId = req.params.bookingId as string;
        const itinerary = await getOpsItineraryByBookingId(bookingId);
        if (!itinerary)
            return res.status(404).json({ error: 'Itinerary not found' });
        res.json(itinerary);
    }
    catch (err) {
        console.error('Error fetching itinerary:', err);
        res.status((err as any).status || 500).json({ error: (err as any).status ? (err as Error).message : 'Failed to fetch itinerary' });
    }
});
router.put('/itineraries/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const updated = await updateOpsItinerary(id, req.body);
        res.json(updated);
    }
    catch (err) {
        console.error('Error updating itinerary:', err);
        res.status((err as any).status || 500).json({ error: (err as any).status ? (err as Error).message : 'Failed to update itinerary' });
    }
});
router.post('/itineraries/:id/activities', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        await addOrUpdateOpsActivity(id, req.body);
        const updated = await getOpsItineraryByBookingId(id);
        res.json(updated);
    }
    catch (err) {
        console.error('Error adding activity:', err);
        res.status((err as any).status || 500).json({ error: (err as any).status ? (err as Error).message : 'Failed to add/update activity' });
    }
});
router.delete('/activities/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const success = await deleteOpsActivity(id);
        if (!success)
            return res.status(404).json({ error: 'Activity not found' });
        res.json({ success: true });
    }
    catch (err) {
        console.error('Error deleting activity:', err);
        res.status((err as any).status || 500).json({ error: (err as any).status ? (err as Error).message : 'Failed to delete activity' });
    }
});
// --- Reset Data ---
router.post('/reset', async (req: Request, res: Response) => {
    try {
        const result = await resetOpsData();
        res.json(result);
    }
    catch (err) {
        console.error('Error resetting ops data:', err);
        res.status((err as any).status || 500).json({ error: (err as any).status ? (err as Error).message : 'Failed to reset operations data' });
    }
});
export default router;
