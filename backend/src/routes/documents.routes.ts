import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { listDocuments, uploadDocument, reprocessDocument, deleteDocument } from '../controllers/documentsController';
import { requireAdmin } from '../middleware/auth';
import { env } from '../config/env';

const ALLOWED_EXT = new Set(['.pdf', '.docx', '.txt', '.md']);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.resolve(__dirname, '../../uploads')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.maxUploadMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      return cb(new Error('Unsupported file type'));
    }
    cb(null, true);
  },
});

const router = Router();

router.get('/', requireAdmin, listDocuments);
router.post('/upload', requireAdmin, upload.single('file'), uploadDocument);
router.post('/:id/reprocess', requireAdmin, reprocessDocument);
router.delete('/:id', requireAdmin, deleteDocument);

export default router;
