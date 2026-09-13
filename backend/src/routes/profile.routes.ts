import { Router } from 'express';
import { getPublicProfile, getAdminProfile, upsertProfile } from '../controllers/profileController';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', getPublicProfile);
router.get('/admin', requireAdmin, getAdminProfile);
router.put('/', requireAdmin, upsertProfile);

export default router;
