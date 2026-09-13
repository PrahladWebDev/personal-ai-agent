import { Router } from 'express';
import { body } from 'express-validator';
import { login, logout, me } from '../controllers/authController';
import { validate } from '../middleware/validate';
import { requireAdmin } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimit';

const router = Router();

router.post(
  '/login',
  authRateLimiter,
  [body('email').isEmail(), body('password').isString().notEmpty()],
  validate,
  login
);
router.post('/logout', logout);
router.get('/me', requireAdmin, me);

export default router;
