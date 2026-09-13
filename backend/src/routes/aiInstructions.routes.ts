import { Router } from 'express';
import { getAdminAiInstructions, upsertAiInstructions } from '../controllers/aiInstructionsController';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// Admin-only in both directions - these are never fetched by the public
// chat widget, only read server-side when building the AI prompt.
router.get('/', requireAdmin, getAdminAiInstructions);
router.put('/', requireAdmin, upsertAiInstructions);

export default router;
