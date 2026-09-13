import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, fail } from '../utils/apiResponse';
import { pool } from '../database/pool';
import { indexKnowledgeItem, deindexKnowledgeItem } from '../rag/indexer';
import { AuthedRequest } from '../middleware/auth';

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export const listProjects = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = Boolean((req as AuthedRequest).user);
  const { rows: projects } = await pool.query(
    `SELECT * FROM projects ${isAdmin ? '' : "WHERE visibility = 'public'"}
     ORDER BY display_order ASC, created_at DESC`
  );

  const ids = projects.map((p) => p.id);
  const [features, technologies] = await Promise.all([
    ids.length ? pool.query('SELECT * FROM project_features WHERE project_id = ANY($1)', [ids]) : { rows: [] },
    ids.length ? pool.query('SELECT * FROM project_technologies WHERE project_id = ANY($1)', [ids]) : { rows: [] },
  ]);

  const withRelations = projects.map((p) => ({
    ...p,
    features: features.rows.filter((f) => f.project_id === p.id).map((f) => f.feature),
    technologies: technologies.rows.filter((t) => t.project_id === p.id).map((t) => t.technology),
  }));

  return ok(res, withRelations);
});

export const getProjectBySlug = asyncHandler(async (req: Request, res: Response) => {
  const isAdmin = Boolean((req as AuthedRequest).user);
  const { rows } = await pool.query(
    `SELECT * FROM projects WHERE slug = $1 ${isAdmin ? '' : "AND visibility = 'public'"}`,
    [req.params.slug]
  );
  if (!rows[0]) return fail(res, 'Project not found', 'NOT_FOUND', 404);
  return ok(res, rows[0]);
});

export const createProject = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const b = req.body;
  if (!b.name) return fail(res, 'Name is required', 'MISSING_FIELD', 422);

  const slug = b.slug ? slugify(b.slug) : slugify(b.name);

  const { rows } = await pool.query(
    `INSERT INTO projects (name, slug, short_description, detailed_description, problem, solution,
      architecture, contribution, challenges, challenge_solutions, github_url, live_url,
      documentation_url, screenshots, status, visibility, display_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
    [b.name, slug, b.shortDescription || null, b.detailedDescription || null, b.problem || null,
      b.solution || null, b.architecture || null, b.contribution || null, b.challenges || null,
      b.challengeSolutions || null, b.githubUrl || null, b.liveUrl || null, b.documentationUrl || null,
      b.screenshots || [], b.status || 'draft', b.visibility || 'private', b.displayOrder || 0]
  );
  const project = rows[0];

  await syncRelations(project.id, b.features || [], b.technologies || []);
  await indexEntity(project, b.features || [], b.technologies || []);

  return ok(res, project, 201);
});

export const updateProject = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const b = req.body;
  const slug = b.slug ? slugify(b.slug) : undefined;

  const { rows } = await pool.query(
    `UPDATE projects SET name=$1, slug=COALESCE($2, slug), short_description=$3, detailed_description=$4,
      problem=$5, solution=$6, architecture=$7, contribution=$8, challenges=$9, challenge_solutions=$10,
      github_url=$11, live_url=$12, documentation_url=$13, screenshots=$14, status=$15, visibility=$16,
      display_order=$17, updated_at=now()
     WHERE id=$18 RETURNING *`,
    [b.name, slug, b.shortDescription || null, b.detailedDescription || null, b.problem || null,
      b.solution || null, b.architecture || null, b.contribution || null, b.challenges || null,
      b.challengeSolutions || null, b.githubUrl || null, b.liveUrl || null, b.documentationUrl || null,
      b.screenshots || [], b.status || 'draft', b.visibility || 'private', b.displayOrder || 0, id]
  );
  if (!rows[0]) return fail(res, 'Project not found', 'NOT_FOUND', 404);
  const project = rows[0];

  await syncRelations(project.id, b.features || [], b.technologies || []);
  await indexEntity(project, b.features || [], b.technologies || []);

  return ok(res, project);
});

export const publishProject = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const { visibility } = req.body as { visibility: 'public' | 'private' };

  const { rows } = await pool.query(
    `UPDATE projects SET visibility = $1, updated_at = now() WHERE id = $2 RETURNING *`,
    [visibility, id]
  );
  if (!rows[0]) return fail(res, 'Project not found', 'NOT_FOUND', 404);

  const [{ rows: features }, { rows: technologies }] = await Promise.all([
    pool.query('SELECT feature FROM project_features WHERE project_id = $1', [id]),
    pool.query('SELECT technology FROM project_technologies WHERE project_id = $1', [id]),
  ]);
  await indexEntity(rows[0], features.map((f) => f.feature), technologies.map((t) => t.technology));

  return ok(res, rows[0]);
});

export const deleteProject = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  await pool.query('DELETE FROM projects WHERE id = $1', [id]);
  await deindexKnowledgeItem('project', id);
  return ok(res, { deleted: true });
});

async function syncRelations(projectId: string, features: string[], technologies: string[]) {
  await pool.query('DELETE FROM project_features WHERE project_id = $1', [projectId]);
  await pool.query('DELETE FROM project_technologies WHERE project_id = $1', [projectId]);

  for (let i = 0; i < features.length; i++) {
    await pool.query(
      'INSERT INTO project_features (project_id, feature, display_order) VALUES ($1,$2,$3)',
      [projectId, features[i], i]
    );
  }
  for (const tech of technologies) {
    await pool.query('INSERT INTO project_technologies (project_id, technology) VALUES ($1,$2)', [projectId, tech]);
  }
}

async function indexEntity(project: any, features: string[], technologies: string[]) {
  const text = [
    `Project: ${project.name}`,
    project.short_description,
    project.problem ? `Problem: ${project.problem}` : '',
    project.solution ? `Solution: ${project.solution}` : '',
    project.detailed_description,
    project.architecture ? `Architecture: ${project.architecture}` : '',
    project.contribution ? `Contribution: ${project.contribution}` : '',
    project.challenges ? `Challenges: ${project.challenges}` : '',
    project.challenge_solutions ? `How challenges were solved: ${project.challenge_solutions}` : '',
    technologies.length ? `Technologies: ${technologies.join(', ')}` : '',
    features.length ? `Key features: ${features.join('; ')}` : '',
    project.github_url ? `GitHub: ${project.github_url}` : '',
    project.live_url ? `Live demo: ${project.live_url}` : '',
    project.documentation_url ? `Documentation: ${project.documentation_url}` : '',
  ].filter(Boolean).join('\n');

  await indexKnowledgeItem({
    sourceType: 'project',
    sourceId: project.id,
    name: project.name,
    text,
    visibility: project.visibility,
  });
}
