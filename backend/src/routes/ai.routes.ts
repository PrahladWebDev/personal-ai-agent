import { Router } from 'express';
import { chat, searchKnowledge } from '../controllers/aiController';
import { requireAdmin } from '../middleware/auth';
import { chatRateLimiter } from '../middleware/rateLimit';

const router = Router();

router.post('/chat', chatRateLimiter, chat);
router.post('/knowledge/search', requireAdmin, searchKnowledge);

export default router;
