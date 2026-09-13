import { Router } from 'express';
import { getPublicCareerGoals, getAdminCareerGoals, upsertCareerGoals } from '../controllers/careerGoalsController';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', getPublicCareerGoals);
router.get('/admin', requireAdmin, getAdminCareerGoals);
router.put('/', requireAdmin, upsertCareerGoals);

export default router;
