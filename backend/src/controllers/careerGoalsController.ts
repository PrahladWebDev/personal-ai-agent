import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok } from '../utils/apiResponse';
import { pool } from '../database/pool';
import { indexKnowledgeItem, deindexKnowledgeItem } from '../rag/indexer';
import { AuthedRequest } from '../middleware/auth';

export const getPublicCareerGoals = asyncHandler(async (_req: Request, res: Response) => {
  const { rows } = await pool.query('SELECT * FROM career_goals ORDER BY updated_at DESC LIMIT 1');
  const p = rows[0];
  if (!p || p.visibility !== 'public') return ok(res, null);
  const { visibility, id, ...publicFields } = p;
  return ok(res, publicFields);
});

export const getAdminCareerGoals = asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const { rows } = await pool.query('SELECT * FROM career_goals ORDER BY updated_at DESC LIMIT 1');
  return ok(res, rows[0] ?? null);
});

export const upsertCareerGoals = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const b = req.body;
  const { rows: existing } = await pool.query('SELECT id FROM career_goals LIMIT 1');

  const values = [
    b.currentGoal || null,
    b.targetRoles || [],
    b.currentlyLearning || [],
    b.futureGoals || null,
    b.preferredWorkType || null,
    b.preferredProjectTypes || null,
    b.professionalInterests || null,
    b.visibility || 'public',
  ];

  let row;
  if (existing[0]) {
    const { rows } = await pool.query(
      `UPDATE career_goals SET current_goal=$1, target_roles=$2, currently_learning=$3,
        future_goals=$4, preferred_work_type=$5, preferred_project_types=$6,
        professional_interests=$7, visibility=$8, updated_at=now()
       WHERE id=$9 RETURNING *`,
      [...values, existing[0].id]
    );
    row = rows[0];
  } else {
    const { rows } = await pool.query(
      `INSERT INTO career_goals (current_goal, target_roles, currently_learning, future_goals,
        preferred_work_type, preferred_project_types, professional_interests, visibility)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      values
    );
    row = rows[0];
  }

  if (row.visibility === 'public') {
    const text = [
      row.current_goal ? `Current career goal: ${row.current_goal}` : '',
      row.target_roles?.length ? `Target roles: ${row.target_roles.join(', ')}` : '',
      row.currently_learning?.length ? `Currently learning: ${row.currently_learning.join(', ')}` : '',
      row.future_goals ? `Future goals: ${row.future_goals}` : '',
      row.preferred_work_type ? `Preferred work type: ${row.preferred_work_type}` : '',
      row.preferred_project_types ? `Preferred project types: ${row.preferred_project_types}` : '',
      row.professional_interests ? `Professional interests: ${row.professional_interests}` : '',
    ].filter(Boolean).join('\n');

    await indexKnowledgeItem({
      sourceType: 'career',
      sourceId: row.id,
      name: 'Career Goals',
      text,
      visibility: 'public',
    });
  } else {
    await deindexKnowledgeItem('career', row.id);
  }

  return ok(res, row);
});
