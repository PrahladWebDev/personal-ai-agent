import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, fail } from '../utils/apiResponse';
import { pool } from '../database/pool';
import { AuthedRequest } from '../middleware/auth';

// Social links are simple enough not to need vector indexing; the AI
// answers "where can I find his GitHub" style questions via a direct
// lookup in the RAG context builder (see aiController) instead, which
// guarantees it can never invent a link.

export const listSocialLinks = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = Boolean((req as AuthedRequest).user);
  const { rows } = await pool.query(
    `SELECT * FROM social_links ${isAdmin ? '' : "WHERE visibility = 'public'"} ORDER BY display_order ASC`
  );
  return ok(res, rows);
});

export const createSocialLink = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { platform, url, visibility, displayOrder } = req.body;
  if (!platform || !url) return fail(res, 'Platform and URL are required', 'MISSING_FIELD', 422);

  const { rows } = await pool.query(
    `INSERT INTO social_links (platform, url, visibility, display_order) VALUES ($1,$2,$3,$4) RETURNING *`,
    [platform, url, visibility || 'public', displayOrder || 0]
  );
  return ok(res, rows[0], 201);
});

export const updateSocialLink = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const { platform, url, visibility, displayOrder } = req.body;

  const { rows } = await pool.query(
    `UPDATE social_links SET platform=$1, url=$2, visibility=$3, display_order=$4 WHERE id=$5 RETURNING *`,
    [platform, url, visibility || 'public', displayOrder || 0, id]
  );
  if (!rows[0]) return fail(res, 'Social link not found', 'NOT_FOUND', 404);
  return ok(res, rows[0]);
});

export const deleteSocialLink = asyncHandler(async (req: AuthedRequest, res: Response) => {
  await pool.query('DELETE FROM social_links WHERE id = $1', [req.params.id]);
  return ok(res, { deleted: true });
});
