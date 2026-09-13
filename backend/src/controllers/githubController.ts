import { Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { ok, fail } from '../utils/apiResponse';
import { pool } from '../database/pool';
import { syncGithubRepos } from '../github/githubService';
import { indexKnowledgeItem, deindexKnowledgeItem } from '../rag/indexer';
import { AuthedRequest } from '../middleware/auth';

export const syncGithub = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { username } = req.body as { username?: string };
  if (!username) return fail(res, 'GitHub username is required', 'MISSING_FIELD', 422);

  const result = await syncGithubRepos(username);
  return ok(res, result);
});

export const listGithubRepos = asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const { rows } = await pool.query('SELECT * FROM github_repositories ORDER BY repo_updated_at DESC');
  return ok(res, rows);
});

/**
 * Admin explicitly opts a repo into the AI's public knowledge base.
 * Nothing from GitHub becomes retrievable by the public chat until this
 * is called - see spec section "GitHub Sync": "Do NOT automatically
 * expose every repository."
 */
export const includeGithubRepo = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { id } = req.params;
  const { included } = req.body as { included: boolean };

  const { rows } = await pool.query(
    'UPDATE github_repositories SET is_included = $1 WHERE id = $2 RETURNING *',
    [included, id]
  );
  if (!rows[0]) return fail(res, 'Repository not found', 'NOT_FOUND', 404);
  const repo = rows[0];

  if (included) {
    const text = [
      `GitHub repository: ${repo.name}`,
      repo.description,
      repo.topics?.length ? `Topics: ${repo.topics.join(', ')}` : '',
      repo.languages ? `Languages: ${Object.keys(repo.languages).join(', ')}` : '',
      repo.readme ? `README:\n${String(repo.readme).slice(0, 4000)}` : '',
      `GitHub: ${repo.url}`,
      repo.homepage ? `Homepage: ${repo.homepage}` : '',
    ].filter(Boolean).join('\n');

    await indexKnowledgeItem({
      sourceType: 'project',
      sourceId: repo.id,
      name: repo.name,
      text,
      visibility: 'public',
    });
  } else {
    await deindexKnowledgeItem('project', repo.id);
  }

  return ok(res, repo);
});
