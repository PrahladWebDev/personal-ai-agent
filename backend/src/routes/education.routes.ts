import { Router } from 'express';
import { listEducation, createEducation, updateEducation, deleteEducation } from '../controllers/educationController';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', listEducation);
router.post('/', requireAdmin, createEducation);
router.put('/:id', requireAdmin, updateEducation);
router.delete('/:id', requireAdmin, deleteEducation);

export default router;
