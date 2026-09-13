import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.chatRateLimitPerMin,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please slow down.', code: 'RATE_LIMITED' },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, try again later.', code: 'RATE_LIMITED' },
});

export const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});
