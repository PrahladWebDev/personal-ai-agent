import { Router } from 'express';
import { syncGithub, listGithubRepos, includeGithubRepo } from '../controllers/githubController';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/sync', requireAdmin, syncGithub);
router.get('/repositories', requireAdmin, listGithubRepos);
router.patch('/repositories/:id/include', requireAdmin, includeGithubRepo);

export default router;
