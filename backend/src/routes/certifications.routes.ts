import { Router } from 'express';
import {
  listCertifications, createCertification, updateCertification, deleteCertification,
} from '../controllers/certificationsController';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', listCertifications);
router.post('/', requireAdmin, createCertification);
router.put('/:id', requireAdmin, updateCertification);
router.delete('/:id', requireAdmin, deleteCertification);

export default router;
