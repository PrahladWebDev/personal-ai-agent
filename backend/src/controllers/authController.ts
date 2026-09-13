import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, fail } from '../utils/apiResponse';
import { verifyCredentials, issueSessionToken } from '../auth/authService';
import { env } from '../config/env';
import { AuthedRequest } from '../middleware/auth';

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return fail(res, 'Email and password are required', 'MISSING_CREDENTIALS', 422);
  }

  const user = await verifyCredentials(email, password);
  if (!user) {
    return fail(res, 'Invalid email or password', 'INVALID_CREDENTIALS', 401);
  }

  const token = issueSessionToken(user);
  res.cookie('session', token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return ok(res, { id: user.id, email: user.email, role: user.role });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie('session');
  return ok(res, { loggedOut: true });
});

export const me = asyncHandler(async (req: AuthedRequest, res: Response) => {
  return ok(res, req.user ?? null);
});
