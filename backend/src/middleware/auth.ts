import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from './errorHandler';

export interface AuthedRequest extends Request {
  user?: { id: string; email: string; role: string };
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.session;
  if (!token) {
    return next(new ApiError('Authentication required', 401, 'UNAUTHENTICATED'));
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret) as { id: string; email: string; role: string };
    if (payload.role !== 'admin') {
      return next(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    }
    req.user = payload;
    next();
  } catch {
    return next(new ApiError('Invalid or expired session', 401, 'INVALID_SESSION'));
  }
}
