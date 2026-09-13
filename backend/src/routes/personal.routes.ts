import { Router } from 'express';
import { getPublicPersonalInfo, getAdminPersonalInfo, upsertPersonalInfo } from '../controllers/personalInfoController';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', getPublicPersonalInfo);
router.get('/admin', requireAdmin, getAdminPersonalInfo);
router.put('/', requireAdmin, upsertPersonalInfo);

export default router;
