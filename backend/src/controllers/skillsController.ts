import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, fail } from '../utils/apiResponse';
import { pool } from '../database/pool';
import { indexKnowledgeItem, deindexKnowledgeItem } from '../rag/indexer';
import { AuthedRequest } from '../middleware/auth';

export const listSkillCategories = asyncHandler(async (_req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT id, name, display_order FROM skill_categories ORDER BY display_order ASC, name ASC`
  );
  return ok(res, rows);
});

export const listSkills = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = Boolean((req as AuthedRequest).user);
  const { rows } = await pool.query(
    `SELECT s.*, c.name AS category_name FROM skills s
     LEFT JOIN skill_categories c ON c.id = s.category_id
     ${isAdmin ? '' : "WHERE s.visibility = 'public'"}
     ORDER BY s.display_order ASC, s.name ASC`
  );
  return ok(res, rows);
});

export const createSkill = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { name, categoryId, description, experienceLevel, yearsExperience, visibility, displayOrder } = req.body;
  if (!name) return fail(res, 'Name is required', 'MISSING_FIELD', 422);

  const { rows } = await pool.query(
    `INSERT INTO skills (name, category_id, description, experience_level, years_experience, visibility, display_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [name, categoryId || null, description || null, experienceLevel || null, yearsExperience || null,
      visibility || 'public', displayOrder || 0]
  );
  const skill = rows[0];

  await indexEntity(skill);
  return ok(res, skill, 201);
});

export const updateSkill = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const { name, categoryId, description, experienceLevel, yearsExperience, visibility, displayOrder } = req.body;

  const { rows } = await pool.query(
    `UPDATE skills SET name=$1, category_id=$2, description=$3, experience_level=$4,
      years_experience=$5, visibility=$6, display_order=$7, updated_at=now()
     WHERE id=$8 RETURNING *`,
    [name, categoryId || null, description || null, experienceLevel || null, yearsExperience || null,
      visibility || 'public', displayOrder || 0, id]
  );
  if (!rows[0]) return fail(res, 'Skill not found', 'NOT_FOUND', 404);

  await indexEntity(rows[0]);
  return ok(res, rows[0]);
});

export const deleteSkill = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  await pool.query('DELETE FROM skills WHERE id = $1', [id]);
  await deindexKnowledgeItem('skill', id);
  return ok(res, { deleted: true });
});

async function indexEntity(skill: any) {
  const text = [
    `Skill: ${skill.name}`,
    skill.description,
    skill.experience_level ? `Experience level: ${skill.experience_level}` : '',
    skill.years_experience ? `Years of experience: ${skill.years_experience}` : '',
  ].filter(Boolean).join('\n');

  await indexKnowledgeItem({
    sourceType: 'skill',
    sourceId: skill.id,
    name: skill.name,
    text,
    visibility: skill.visibility,
  });
}
