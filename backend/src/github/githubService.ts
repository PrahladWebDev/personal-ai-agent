import { pool } from '../database/pool';
import { env } from '../config/env';
import { ApiError } from '../middleware/errorHandler';

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

/**
 * Fetches public, non-fork repos for a username, along with README and
 * language breakdown, and upserts them into github_repositories.
 * `is_included` (whether a repo becomes part of the AI's public
 * knowledge) always defaults to false - the admin must explicitly opt
 * each repo in via the dashboard (see section "GitHub Sync" in spec).
 */
export async function syncGithubRepos(username: string): Promise<{ synced: number }> {
  const reposRes = await fetch(`${GITHUB_API}/users/${username}/repos?per_page=100&sort=updated`, {
    headers: authHeaders(),
  });

  if (!reposRes.ok) {
    throw new ApiError(`GitHub API error (${reposRes.status})`, 502, 'GITHUB_API_ERROR');
  }

  const repos = (await reposRes.json()) as GitHubRepo[];
  let synced = 0;

  for (const repo of repos) {
    if (repo.fork || repo.private) continue;

    const [readme, languages] = await Promise.all([
      fetchReadme(repo.full_name),
      fetchLanguages(repo.full_name),
    ]);

    await pool.query(
      `INSERT INTO github_repositories
        (github_id, name, full_name, description, readme, languages, topics, url, homepage, stars, forks, repo_created_at, repo_updated_at, synced_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now())
       ON CONFLICT (github_id) DO UPDATE SET
        description = EXCLUDED.description,
        readme = EXCLUDED.readme,
        languages = EXCLUDED.languages,
        topics = EXCLUDED.topics,
        stars = EXCLUDED.stars,
        forks = EXCLUDED.forks,
        repo_updated_at = EXCLUDED.repo_updated_at,
        synced_at = now()`,
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
        repo.created_at,
        repo.updated_at,
      ]
    );
    synced += 1;
  }

  return { synced };
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
