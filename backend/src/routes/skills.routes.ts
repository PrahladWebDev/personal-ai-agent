import { Router } from 'express';
import { listSkills, listSkillCategories, createSkill, updateSkill, deleteSkill } from '../controllers/skillsController';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// NOTE: must be registered before any '/:id'-style route is ever added,
// otherwise Express would try to match "categories" as an :id param.
router.get('/categories', requireAdmin, listSkillCategories);
router.get('/', listSkills);
router.post('/', requireAdmin, createSkill);
router.put('/:id', requireAdmin, updateSkill);
router.delete('/:id', requireAdmin, deleteSkill);

export default router;
