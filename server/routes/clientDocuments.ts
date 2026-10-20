import { Router } from 'express';
import multer from 'multer';
import {
  uploadDocuments,
  listDocuments,
  getSignedDocumentToken,
  getDocumentFile,
  downloadAllZip,
  deleteDocument,
  updateDocument
} from '../controllers/clientDocumentsController';

const router = Router({ mergeParams: true });

// Setup multer memory storage with 10 MB limit per file (up to 10 files per request)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max per file
    files: 10 // Max 10 files per batch
  }
});

// Admin Document Endpoints for a Lead
router.post('/:leadId/documents', upload.array('files', 10), uploadDocuments);
router.get('/:leadId/documents', listDocuments);
router.get('/:leadId/documents/download-all', downloadAllZip);
router.get('/:leadId/documents/:docId/signed-token', getSignedDocumentToken);
router.get('/:leadId/documents/:docId/file', getDocumentFile);
router.put('/:leadId/documents/:docId', updateDocument);
router.delete('/:leadId/documents/:docId', deleteDocument);

export default router;
