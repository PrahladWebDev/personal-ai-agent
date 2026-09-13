import { Router } from 'express';
import { listAchievements, createAchievement, updateAchievement, deleteAchievement } from '../controllers/achievementsController';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', listAchievements);
router.post('/', requireAdmin, createAchievement);
router.put('/:id', requireAdmin, updateAchievement);
router.delete('/:id', requireAdmin, deleteAchievement);

export default router;
