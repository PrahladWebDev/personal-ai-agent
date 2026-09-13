import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status = 400, code = 'BAD_REQUEST') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const isApiError = err instanceof ApiError;
  const status = isApiError ? err.status : 500;
  const code = isApiError ? err.code : 'INTERNAL_ERROR';
  const message = isApiError ? err.message : 'Something went wrong';

  logger.error('Request error', {
    path: req.path,
    method: req.method,
    status,
    code,
    error: err instanceof Error ? err.message : String(err),
  });

  // Never leak stack traces or internal details in production.
  res.status(status).json({ success: false, message, code });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ success: false, message: 'Not found', code: 'NOT_FOUND' });
}
