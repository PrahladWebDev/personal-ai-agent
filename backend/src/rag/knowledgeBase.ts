import { pool } from '../database/pool';

/**
 * Structured, deterministic access to every admin-managed knowledge
 * section. This is the "exact database query" half of the hybrid
 * retrieval system (see retrieveRelevantChunks() for the semantic half).
 *
 * Anything that needs an exact number or a complete list (counts, "list
 * all X") MUST go through here, never through vector similarity - vector
 * search only returns the top-K most similar chunks and will silently
 * omit items, which is exactly wrong for "how many" questions.
 *
 * Every function here defaults to public-only. `includePrivate` is only
 * ever set from the authenticated admin debug endpoint - the public chat
 * always calls these with includePrivate=false.
 */

export interface UnifiedProject {
  id: string;
  name: string;
  description: string | null;
  technologies: string[];
  githubUrl: string | null;
  liveUrl: string | null;
  documentationUrl: string | null;
  stars: number | null;
  forks: number | null;
  status: string | null;
  source: 'manual' | 'github' | 'manual+github';
  updatedAt: string | null;
}

function vis(includePrivate: boolean) {
  return includePrivate ? '' : "AND visibility = 'public'";
}

export async function getProfile(includePrivate = false) {
  const { rows } = await pool.query('SELECT * FROM profile ORDER BY updated_at DESC LIMIT 1');
  const p = rows[0];
  if (!p) return null;
  if (includePrivate) return p;
  return {
    name: p.name,
    title: p.title,
    short_bio: p.short_bio,
    long_bio: p.long_bio,
    location: p.location_visibility === 'public' ? p.location : null,
    email: p.email_visibility === 'public' ? p.email : null,
    current_focus: p.current_focus,
    professional_interests: p.professional_interests,
  };
}

export async function getSkills(includePrivate = false) {
  const { rows } = await pool.query(
    `SELECT s.*, c.name AS category_name FROM skills s
     LEFT JOIN skill_categories c ON c.id = s.category_id
     WHERE 1=1 ${vis(includePrivate)}
     ORDER BY c.display_order ASC NULLS LAST, s.display_order ASC`
  );
  return rows;
}

export async function getExperience(includePrivate = false) {
  const { rows } = await pool.query(
    `SELECT * FROM experience WHERE 1=1 ${vis(includePrivate)}
     ORDER BY display_order ASC, start_date DESC NULLS LAST`
  );
  return rows;
}

export async function getEducation(includePrivate = false) {
  const { rows } = await pool.query(
    `SELECT * FROM education WHERE 1=1 ${vis(includePrivate)}
     ORDER BY display_order ASC, start_date DESC NULLS LAST`
  );
  return rows;
}

export async function getAchievements(includePrivate = false) {
  const { rows } = await pool.query(
    `SELECT * FROM achievements WHERE 1=1 ${vis(includePrivate)}
     ORDER BY display_order ASC, date DESC NULLS LAST`
  );
  return rows;
}

export async function getCertifications(includePrivate = false) {
  const { rows } = await pool.query(
    `SELECT * FROM certifications WHERE 1=1 ${vis(includePrivate)}
     ORDER BY display_order ASC, issue_date DESC NULLS LAST`
  );
  return rows;
}

export async function getServices(includePrivate = false) {
  const { rows } = await pool.query(
    `SELECT * FROM services WHERE 1=1 ${vis(includePrivate)}
     ORDER BY display_order ASC`
  );
  return rows;
}

export async function getPersonalInfo(includePrivate = false) {
  const { rows } = await pool.query('SELECT * FROM personal_info ORDER BY updated_at DESC LIMIT 1');
  const p = rows[0];
  if (!p) return null;
  if (!includePrivate && p.visibility !== 'public') return null;
  return p;
}

export async function getCareerGoals(includePrivate = false) {
  const { rows } = await pool.query('SELECT * FROM career_goals ORDER BY updated_at DESC LIMIT 1');
  const p = rows[0];
  if (!p) return null;
  if (!includePrivate && p.visibility !== 'public') return null;
  return p;
}

export async function getAiInstructions() {
  const { rows } = await pool.query('SELECT * FROM ai_instructions ORDER BY updated_at DESC LIMIT 1');
  return rows[0] ?? null;
}

export async function getSocialLinks(includePrivate = false) {
  const { rows } = await pool.query(
    `SELECT * FROM social_links WHERE 1=1 ${vis(includePrivate)} ORDER BY display_order ASC`
  );
  return rows;
}

/**
 * Manually-created Projects + opted-in GitHub repositories, deduplicated
 * so a manual project that documents a synced repo (matched by
 * github_url / linked_project_id / full_name) is never counted or listed
 * twice. This is what every "how many projects" / "list all projects"
 * question is answered from.
 */
export async function getUnifiedProjects(includePrivate = false): Promise<UnifiedProject[]> {
  const [{ rows: projects }, { rows: repos }] = await Promise.all([
    pool.query(`SELECT * FROM projects WHERE 1=1 ${vis(includePrivate)} ORDER BY display_order ASC`),
    pool.query(
      `SELECT * FROM github_repositories WHERE is_included = true ORDER BY repo_updated_at DESC`
    ),
  ]);

  const ids = projects.map((p: any) => p.id);
  const { rows: techRows } = ids.length
    ? await pool.query('SELECT * FROM project_technologies WHERE project_id = ANY($1)', [ids])
    : { rows: [] as any[] };

  const usedRepoIds = new Set<string>();
  const unified: UnifiedProject[] = [];

  for (const p of projects) {
    const technologies = techRows.filter((t: any) => t.project_id === p.id).map((t: any) => t.technology);
    let matchedRepo = repos.find((r: any) => r.id === p.github_repo_id);
    if (!matchedRepo && p.github_url) {
      matchedRepo = repos.find(
        (r: any) => r.url === p.github_url || p.github_url.includes(r.full_name)
      );
    }
    if (matchedRepo) usedRepoIds.add(matchedRepo.id);

    unified.push({
      id: p.id,
      name: p.name,
      description: p.short_description || p.detailed_description,
      technologies: matchedRepo
        ? Array.from(new Set([...technologies, ...Object.keys(matchedRepo.languages || {})]))
        : technologies,
      githubUrl: p.github_url || matchedRepo?.url || null,
      liveUrl: p.live_url,
      documentationUrl: p.documentation_url,
      stars: matchedRepo?.stars ?? null,
      forks: matchedRepo?.forks ?? null,
      status: p.status,
      source: matchedRepo ? 'manual+github' : 'manual',
      updatedAt: p.updated_at,
    });
  }

  for (const r of repos) {
    if (usedRepoIds.has(r.id)) continue;
    unified.push({
      id: r.id,
      name: r.name,
      description: r.description,
      technologies: [...(r.topics || []), ...Object.keys(r.languages || {})],
      githubUrl: r.url,
      liveUrl: r.homepage || null,
      documentationUrl: null,
      stars: r.stars,
      forks: r.forks,
      status: null,
      source: 'github',
      updatedAt: r.repo_updated_at,
    });
  }

  return unified;
}

/** Filters the unified project list by a technology keyword (case-insensitive substring match). */
export function filterProjectsByTechnology(projects: UnifiedProject[], tech: string): UnifiedProject[] {
  const needle = tech.toLowerCase();
  return projects.filter((p) => p.technologies.some((t) => t.toLowerCase().includes(needle)));
}

export async function getProjectCounts(includePrivate = false) {
  const unified = await getUnifiedProjects(includePrivate);
  const { rows: repoCountRows } = await pool.query('SELECT COUNT(*) FROM github_repositories');
  const manual = unified.filter((p) => p.source !== 'github').length;
  const githubOnly = unified.filter((p) => p.source === 'github').length;
  return {
    totalUniqueProjects: unified.length,
    portfolioProjects: manual,
    githubOnlyRepositories: githubOnly,
    totalGithubRepositoriesSynced: Number(repoCountRows[0].count),
  };
}

export async function getExactCounts(includePrivate = false) {
  const [projects, skills, certifications, services, achievements] = await Promise.all([
    getProjectCounts(includePrivate),
    getSkills(includePrivate),
    getCertifications(includePrivate),
    getServices(includePrivate),
    getAchievements(includePrivate),
  ]);
  return {
    projects,
    skillsCount: skills.length,
    certificationsCount: certifications.length,
    servicesCount: services.length,
    achievementsCount: achievements.length,
  };
}
