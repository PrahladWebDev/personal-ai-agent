import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, fail } from '../utils/apiResponse';
import { pool } from '../database/pool';
import { indexKnowledgeItem, deindexKnowledgeItem } from '../rag/indexer';
import { AuthedRequest } from '../middleware/auth';

export const listAchievements = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = Boolean((req as AuthedRequest).user);
  const { rows } = await pool.query(
    `SELECT * FROM achievements ${isAdmin ? '' : "WHERE visibility = 'public'"}
     ORDER BY display_order ASC, date DESC NULLS LAST`
  );
  return ok(res, rows);
});

export const createAchievement = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const b = req.body;
  if (!b.title) return fail(res, 'Title is required', 'MISSING_FIELD', 422);

  const { rows } = await pool.query(
    `INSERT INTO achievements (title, description, date, category, url, visibility, display_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [b.title, b.description || null, b.date || null, b.category || 'other', b.url || null,
      b.visibility || 'public', b.displayOrder || 0]
  );
  await indexEntity(rows[0]);
  return ok(res, rows[0], 201);
});

export const updateAchievement = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const b = req.body;

  const { rows } = await pool.query(
    `UPDATE achievements SET title=$1, description=$2, date=$3, category=$4, url=$5, visibility=$6, display_order=$7
     WHERE id=$8 RETURNING *`,
    [b.title, b.description || null, b.date || null, b.category || 'other', b.url || null,
      b.visibility || 'public', b.displayOrder || 0, id]
  );
  if (!rows[0]) return fail(res, 'Achievement not found', 'NOT_FOUND', 404);

  await indexEntity(rows[0]);
  return ok(res, rows[0]);
});

export const deleteAchievement = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  await pool.query('DELETE FROM achievements WHERE id = $1', [id]);
  await deindexKnowledgeItem('achievement', id);
  return ok(res, { deleted: true });
});

async function indexEntity(a: any) {
  const text = [
    `${a.category ? a.category + ': ' : ''}${a.title}`,
    a.date ? `Date: ${a.date}` : '',
    a.description,
    a.url ? `Link: ${a.url}` : '',
  ].filter(Boolean).join('\n');

  await indexKnowledgeItem({
    sourceType: 'achievement',
    sourceId: a.id,
    name: a.title,
    text,
    visibility: a.visibility,
  });
}
