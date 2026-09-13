import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, fail } from '../utils/apiResponse';
import { pool } from '../database/pool';
import { indexKnowledgeItem, deindexKnowledgeItem } from '../rag/indexer';
import { AuthedRequest } from '../middleware/auth';

export const listEducation = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = Boolean((req as AuthedRequest).user);
  const { rows } = await pool.query(
    `SELECT * FROM education ${isAdmin ? '' : "WHERE visibility = 'public'"}
     ORDER BY display_order ASC, start_date DESC NULLS LAST`
  );
  return ok(res, rows);
});

export const createEducation = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const b = req.body;
  if (!b.institution) return fail(res, 'Institution is required', 'MISSING_FIELD', 422);

  const { rows } = await pool.query(
    `INSERT INTO education (institution, degree, field_of_study, start_date, end_date, description, visibility, display_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [b.institution, b.degree || null, b.fieldOfStudy || null, b.startDate || null, b.endDate || null,
      b.description || null, b.visibility || 'public', b.displayOrder || 0]
  );
  await indexEntity(rows[0]);
  return ok(res, rows[0], 201);
});

export const updateEducation = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const b = req.body;

  const { rows } = await pool.query(
    `UPDATE education SET institution=$1, degree=$2, field_of_study=$3, start_date=$4, end_date=$5,
      description=$6, visibility=$7, display_order=$8, updated_at=now()
     WHERE id=$9 RETURNING *`,
    [b.institution, b.degree || null, b.fieldOfStudy || null, b.startDate || null, b.endDate || null,
      b.description || null, b.visibility || 'public', b.displayOrder || 0, id]
  );
  if (!rows[0]) return fail(res, 'Education not found', 'NOT_FOUND', 404);

  await indexEntity(rows[0]);
  return ok(res, rows[0]);
});

export const deleteEducation = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  await pool.query('DELETE FROM education WHERE id = $1', [id]);
  await deindexKnowledgeItem('education', id);
  return ok(res, { deleted: true });
});

async function indexEntity(edu: any) {
  const text = [
    `${edu.degree ?? ''} ${edu.field_of_study ? 'in ' + edu.field_of_study : ''} - ${edu.institution}`,
    `${edu.start_date ?? ''} - ${edu.end_date ?? ''}`,
    edu.description,
  ].filter(Boolean).join('\n');

  await indexKnowledgeItem({
    sourceType: 'education',
    sourceId: edu.id,
    name: edu.institution,
    text,
    visibility: edu.visibility,
  });
}
