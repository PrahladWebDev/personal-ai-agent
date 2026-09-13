import { Router } from 'express';
import {
  listProjects, getProjectBySlug, createProject, updateProject, publishProject, deleteProject,
} from '../controllers/projectsController';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', listProjects);
router.get('/:slug', getProjectBySlug);
router.post('/', requireAdmin, createProject);
router.put('/:id', requireAdmin, updateProject);
router.patch('/:id/publish', requireAdmin, publishProject);
router.delete('/:id', requireAdmin, deleteProject);

export default router;
