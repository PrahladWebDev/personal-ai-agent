import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, fail } from '../utils/apiResponse';
import { pool } from '../database/pool';
import { indexKnowledgeItem, deindexKnowledgeItem } from '../rag/indexer';
import { AuthedRequest } from '../middleware/auth';

export const listServices = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = Boolean((req as AuthedRequest).user);
  const { rows } = await pool.query(
    `SELECT * FROM services ${isAdmin ? '' : "WHERE visibility = 'public'"}
     ORDER BY display_order ASC, created_at DESC`
  );
  return ok(res, rows);
});

export const createService = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const b = req.body;
  if (!b.name) return fail(res, 'Service name is required', 'MISSING_FIELD', 422);

  const { rows } = await pool.query(
    `INSERT INTO services
      (name, short_description, detailed_description, technologies, experience_level,
       availability, service_url, visibility, display_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [b.name, b.shortDescription || null, b.detailedDescription || null, b.technologies || [],
      b.experienceLevel || null, b.availability || 'available', b.serviceUrl || null,
      b.visibility || 'public', b.displayOrder || 0]
  );
  await indexEntity(rows[0]);
  return ok(res, rows[0], 201);
});

export const updateService = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const b = req.body;

  const { rows } = await pool.query(
    `UPDATE services SET name=$1, short_description=$2, detailed_description=$3, technologies=$4,
      experience_level=$5, availability=$6, service_url=$7, visibility=$8, display_order=$9,
      updated_at=now()
     WHERE id=$10 RETURNING *`,
    [b.name, b.shortDescription || null, b.detailedDescription || null, b.technologies || [],
      b.experienceLevel || null, b.availability || 'available', b.serviceUrl || null,
      b.visibility || 'public', b.displayOrder || 0, id]
  );
  if (!rows[0]) return fail(res, 'Service not found', 'NOT_FOUND', 404);

  await indexEntity(rows[0]);
  return ok(res, rows[0]);
});

export const deleteService = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  await pool.query('DELETE FROM services WHERE id = $1', [id]);
  await deindexKnowledgeItem('service', id);
  return ok(res, { deleted: true });
});

async function indexEntity(s: any) {
  const text = [
    `Service: ${s.name}`,
    s.short_description,
    s.detailed_description,
    s.technologies?.length ? `Technologies used: ${s.technologies.join(', ')}` : '',
    s.experience_level ? `Experience level: ${s.experience_level}` : '',
    s.availability ? `Availability: ${s.availability}` : '',
    s.service_url ? `More info: ${s.service_url}` : '',
  ].filter(Boolean).join('\n');

  await indexKnowledgeItem({
    sourceType: 'service',
    sourceId: s.id,
    name: s.name,
    text,
    visibility: s.visibility,
  });
}
