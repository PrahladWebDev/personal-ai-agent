import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, fail } from '../utils/apiResponse';
import { pool } from '../database/pool';
import { indexKnowledgeItem, deindexKnowledgeItem } from '../rag/indexer';
import { AuthedRequest } from '../middleware/auth';

export const listExperience = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = Boolean((req as AuthedRequest).user);
  const { rows } = await pool.query(
    `SELECT * FROM experience ${isAdmin ? '' : "WHERE visibility = 'public'"}
     ORDER BY display_order ASC, start_date DESC NULLS LAST`
  );
  return ok(res, rows);
});

export const createExperience = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const b = req.body;
  if (!b.company || !b.role) return fail(res, 'Company and role are required', 'MISSING_FIELD', 422);

  const { rows } = await pool.query(
    `INSERT INTO experience (company, role, start_date, end_date, is_current, description,
      responsibilities, technologies, achievements, visibility, display_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [b.company, b.role, b.startDate || null, b.endDate || null, Boolean(b.isCurrent), b.description || null,
      b.responsibilities || [], b.technologies || [], b.achievements || [], b.visibility || 'public', b.displayOrder || 0]
  );
  await indexEntity(rows[0]);
  return ok(res, rows[0], 201);
});

export const updateExperience = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const b = req.body;

  const { rows } = await pool.query(
    `UPDATE experience SET company=$1, role=$2, start_date=$3, end_date=$4, is_current=$5,
      description=$6, responsibilities=$7, technologies=$8, achievements=$9, visibility=$10,
      display_order=$11, updated_at=now()
     WHERE id=$12 RETURNING *`,
    [b.company, b.role, b.startDate || null, b.endDate || null, Boolean(b.isCurrent), b.description || null,
      b.responsibilities || [], b.technologies || [], b.achievements || [], b.visibility || 'public',
      b.displayOrder || 0, id]
  );
  if (!rows[0]) return fail(res, 'Experience not found', 'NOT_FOUND', 404);

  await indexEntity(rows[0]);
  return ok(res, rows[0]);
});

export const deleteExperience = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  await pool.query('DELETE FROM experience WHERE id = $1', [id]);
  await deindexKnowledgeItem('experience', id);
  return ok(res, { deleted: true });
});

async function indexEntity(exp: any) {
  const text = [
    `${exp.role} at ${exp.company}`,
    `${exp.start_date ?? ''} - ${exp.is_current ? 'Present' : exp.end_date ?? ''}`,
    exp.description,
    exp.responsibilities?.length ? `Responsibilities: ${exp.responsibilities.join('; ')}` : '',
    exp.technologies?.length ? `Technologies: ${exp.technologies.join(', ')}` : '',
    exp.achievements?.length ? `Achievements: ${exp.achievements.join('; ')}` : '',
  ].filter(Boolean).join('\n');

  await indexKnowledgeItem({
    sourceType: 'experience',
    sourceId: exp.id,
    name: `${exp.role} at ${exp.company}`,
    text,
    visibility: exp.visibility,
  });
}
