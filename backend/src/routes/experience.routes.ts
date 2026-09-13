import { Router } from 'express';
import { listExperience, createExperience, updateExperience, deleteExperience } from '../controllers/experienceController';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', listExperience);
router.post('/', requireAdmin, createExperience);
router.put('/:id', requireAdmin, updateExperience);
router.delete('/:id', requireAdmin, deleteExperience);

export default router;
