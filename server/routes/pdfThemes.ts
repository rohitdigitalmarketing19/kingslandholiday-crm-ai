import { Router } from 'express';
import multer from 'multer';
import {
  listPdfThemes,
  getActiveTheme,
  getPdfThemeById,
  uploadPdfTheme,
  activatePdfTheme,
  setDefaultPdfTheme,
  archivePdfTheme,
  deletePdfTheme,
  generatePackagePdf,
  previewThemeHtml,
} from '../controllers/pdfThemesController';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max buffer
});

// Theme Management
router.get('/', listPdfThemes);
router.get('/active', getActiveTheme);
router.get('/:id', getPdfThemeById);
router.post('/', upload.single('file'), uploadPdfTheme);
router.put('/:id/activate', activatePdfTheme);
router.put('/:id/default', setDefaultPdfTheme);
router.put('/:id/archive', archivePdfTheme);
router.delete('/:id', deletePdfTheme);

// PDF Generation & Previews
router.post('/generate-pdf', generatePackagePdf);
router.post('/preview-html', previewThemeHtml);

export default router;
