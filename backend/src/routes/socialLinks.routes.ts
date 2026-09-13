import { Router } from 'express';
import { listSocialLinks, createSocialLink, updateSocialLink, deleteSocialLink } from '../controllers/socialLinksController';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', listSocialLinks);
router.post('/', requireAdmin, createSocialLink);
router.put('/:id', requireAdmin, updateSocialLink);
router.delete('/:id', requireAdmin, deleteSocialLink);

export default router;
