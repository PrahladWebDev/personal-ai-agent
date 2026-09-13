import { Response } from 'express';

export function ok(res: Response, data: unknown, status = 200) {
  return res.status(status).json({ success: true, data });
}

export function fail(res: Response, message: string, code: string, status = 400) {
  return res.status(status).json({ success: false, message, code });
}
