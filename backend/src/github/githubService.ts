import { pool } from '../database/pool';
import { env } from '../config/env';
import { ApiError } from '../middleware/errorHandler';
import { indexKnowledgeItem, deindexKnowledgeItem } from '../rag/indexer';

const GITHUB_API = 'https://api.github.com';

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  forks_count: number;
  topics: string[];
  language: string | null;
  created_at: string;
  updated_at: string;
  fork: boolean;
  private: boolean;
}

function authHeaders(): Record<string, string> {
  return env.githubToken
    ? { Authorization: `Bearer ${env.githubToken}`, Accept: 'application/vnd.github+json' }
    : { Accept: 'application/vnd.github+json' };
}

/** Builds the same indexable text used by githubController.includeGithubRepo,
 * prioritizing README / description / topics / languages over any raw
 * binary or generated content (which is never fetched in the first place -
 * see fetchReadme/fetchLanguages, both metadata-only GitHub API calls). */
function buildRepoIndexText(repo: {
  name: string;
  description: string | null;
  topics: string[] | null;
  languages: Record<string, number> | null;
  readme: string | null;
  url: string;
  homepage: string | null;
}): string {
  return [
    `GitHub repository: ${repo.name}`,
    repo.description,
    repo.topics?.length ? `Topics: ${repo.topics.join(', ')}` : '',
    repo.languages ? `Languages: ${Object.keys(repo.languages).join(', ')}` : '',
    repo.readme ? `README:\n${String(repo.readme).slice(0, 4000)}` : '',
    `GitHub: ${repo.url}`,
    repo.homepage ? `Homepage: ${repo.homepage}` : '',
  ].filter(Boolean).join('\n');
}

/**
 * Fetches public, non-fork repos for a username, along with README and
 * language breakdown, and upserts them into github_repositories.
 *
 * `is_included` (whether a repo is exposed as public AI knowledge)
 * defaults to TRUE for newly-discovered repos, so a sync makes them
 * usable knowledge immediately without a separate manual step - see
 * spec section "GitHub Sync": "Do not make repositories invisible to
 * the AI by default." An admin can still explicitly exclude a specific
 * repo via PATCH /github/repositories/:id/include; that choice is
 * preserved across re-syncs (we only default new rows to included, we
 * never flip an existing row's flag back to true here).
 */
export async function syncGithubRepos(username: string): Promise<{ synced: number; indexed: number }> {
  const reposRes = await fetch(`${GITHUB_API}/users/${username}/repos?per_page=100&sort=updated`, {
    headers: authHeaders(),
  });

  if (!reposRes.ok) {
    throw new ApiError(`GitHub API error (${reposRes.status})`, 502, 'GITHUB_API_ERROR');
  }

  const repos = (await reposRes.json()) as GitHubRepo[];
  let synced = 0;
  let indexed = 0;

  for (const repo of repos) {
    if (repo.fork || repo.private) continue;

    const [readme, languages, { rows: existingRows }] = await Promise.all([
      fetchReadme(repo.full_name),
      fetchLanguages(repo.full_name),
      pool.query('SELECT id, is_included FROM github_repositories WHERE github_id = $1', [repo.id]),
    ]);

    const isNewRepo = existingRows.length === 0;
    const isIncluded = isNewRepo ? true : existingRows[0].is_included;

    const { rows } = await pool.query(
      `INSERT INTO github_repositories
        (github_id, name, full_name, description, readme, languages, topics, url, homepage, stars, forks, is_included, repo_created_at, repo_updated_at, synced_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, now())
       ON CONFLICT (github_id) DO UPDATE SET
        description = EXCLUDED.description,
        readme = EXCLUDED.readme,
        languages = EXCLUDED.languages,
        topics = EXCLUDED.topics,
        stars = EXCLUDED.stars,
        forks = EXCLUDED.forks,
        repo_updated_at = EXCLUDED.repo_updated_at,
        synced_at = now()
       RETURNING *`,
      [
        repo.id,
        repo.name,
        repo.full_name,
        repo.description,
        readme,
        JSON.stringify(languages),
        repo.topics || [],
        repo.html_url,
        repo.homepage,
        repo.stargazers_count,
        repo.forks_count,
        isIncluded,
        repo.created_at,
        repo.updated_at,
      ]
    );
    const saved = rows[0];
    synced += 1;

    // Keep document_chunks in sync with the repo's current include state
    // and latest content every time we sync - this is what makes a
    // re-sync refresh AI knowledge for repos that already exist, not
    // just brand new ones (spec: "Existing repositories should also be
    // able to become AI knowledge after running sync again.").
    if (saved.is_included) {
      await indexKnowledgeItem({
        sourceType: 'project',
        sourceId: saved.id,
        name: saved.name,
        text: buildRepoIndexText(saved),
        visibility: 'public',
      });
      indexed += 1;
    } else {
      await deindexKnowledgeItem('project', saved.id);
    }
  }

  return { synced, indexed };
}

async function fetchReadme(fullName: string): Promise<string | null> {
  const res = await fetch(`${GITHUB_API}/repos/${fullName}/readme`, {
    headers: { ...authHeaders(), Accept: 'application/vnd.github.raw+json' },
  });
  if (!res.ok) return null;
  return res.text();
}

async function fetchLanguages(fullName: string): Promise<Record<string, number>> {
  const res = await fetch(`${GITHUB_API}/repos/${fullName}/languages`, { headers: authHeaders() });
  if (!res.ok) return {};
  return (await res.json()) as Record<string, number>;
}
