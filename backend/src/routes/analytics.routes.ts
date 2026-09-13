import { Router } from 'express';
import { getDashboardStats } from '../controllers/analyticsController';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/dashboard', requireAdmin, getDashboardStats);

export default router;
