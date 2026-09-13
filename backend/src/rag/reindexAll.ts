import { pool } from '../database/pool';
import { indexKnowledgeItem } from './indexer';
import * as kb from './knowledgeBase';

/**
 * Rebuilds embeddings for every structured knowledge section from the
 * current database state. Each admin CRUD endpoint already re-indexes
 * its own record on save (see indexKnowledgeItem calls in each
 * controller), so this is a safety net / manual "Re-index knowledge"
 * button for the admin dashboard - useful after bulk edits, a restored
 * backup, or if the vector index is ever suspected stale.
 *
 * Does NOT touch uploaded documents (they have their own
 * upload -> processDocument -> embed pipeline) or GitHub repositories
 * (re-run GitHub sync for those - see github/githubService.ts).
 */
export async function reindexAllKnowledge(): Promise<{ indexed: Record<string, number> }> {
  const counts: Record<string, number> = {};

  const profile = await kb.getProfile(true);
  if (profile) {
    const text = [
      `${profile.name} - ${profile.title}`,
      profile.short_bio,
      profile.long_bio,
      profile.current_focus ? `Current focus: ${profile.current_focus}` : '',
      profile.professional_interests ? `Professional interests: ${profile.professional_interests}` : '',
    ].filter(Boolean).join('\n\n');
    const { rows } = await pool.query('SELECT id FROM profile ORDER BY updated_at DESC LIMIT 1');
    if (rows[0]) {
      await indexKnowledgeItem({ sourceType: 'profile', sourceId: rows[0].id, name: profile.name, text, visibility: 'public' });
      counts.profile = 1;
    }
  }

  counts.skills = await reindexMany(await kb.getSkills(true), 'skill', (s) => ({
    id: s.id,
    name: s.name,
    visibility: s.visibility,
    text: [`Skill: ${s.name}`, s.category_name ? `Category: ${s.category_name}` : '', s.experience_level ? `Level: ${s.experience_level}` : '', s.description].filter(Boolean).join('\n'),
  }));

  counts.experience = await reindexMany(await kb.getExperience(true), 'experience', (e) => ({
    id: e.id,
    name: `${e.role} at ${e.company}`,
    visibility: e.visibility,
    text: [`${e.role} at ${e.company}`, e.description, e.technologies?.length ? `Technologies: ${e.technologies.join(', ')}` : '', e.achievements?.length ? `Achievements: ${e.achievements.join('; ')}` : ''].filter(Boolean).join('\n'),
  }));

  counts.education = await reindexMany(await kb.getEducation(true), 'education', (e) => ({
    id: e.id,
    name: e.institution,
    visibility: e.visibility,
    text: [`${e.degree || ''} ${e.field_of_study ? `in ${e.field_of_study}` : ''} at ${e.institution}`.trim(), e.description].filter(Boolean).join('\n'),
  }));

  counts.achievements = await reindexMany(await kb.getAchievements(true), 'achievement', (a) => ({
    id: a.id,
    name: a.title,
    visibility: a.visibility,
    text: [`${a.category ? a.category + ': ' : ''}${a.title}`, a.description, a.url ? `Link: ${a.url}` : ''].filter(Boolean).join('\n'),
  }));

  counts.certifications = await reindexMany(await kb.getCertifications(true), 'certification', (c) => ({
    id: c.id,
    name: c.name,
    visibility: c.visibility,
    text: [`Certification: ${c.name}`, `Issued by: ${c.issuing_organization}`, c.description, c.credential_url ? `Link: ${c.credential_url}` : ''].filter(Boolean).join('\n'),
  }));

  counts.services = await reindexMany(await kb.getServices(true), 'service', (s) => ({
    id: s.id,
    name: s.name,
    visibility: s.visibility,
    text: [`Service: ${s.name}`, s.short_description, s.detailed_description, s.technologies?.length ? `Technologies: ${s.technologies.join(', ')}` : ''].filter(Boolean).join('\n'),
  }));

  const personal = await kb.getPersonalInfo(true);
  if (personal) {
    const text = [personal.short_introduction, personal.detailed_biography, personal.interests ? `Interests: ${personal.interests}` : '', personal.hobbies ? `Hobbies: ${personal.hobbies}` : ''].filter(Boolean).join('\n\n');
    if (personal.visibility === 'public' && text.trim()) {
      await indexKnowledgeItem({ sourceType: 'personal', sourceId: personal.id, name: 'About Me', text, visibility: 'public' });
      counts.personal = 1;
    }
  }

  const career = await kb.getCareerGoals(true);
  if (career) {
    const text = [career.current_goal ? `Current goal: ${career.current_goal}` : '', career.future_goals].filter(Boolean).join('\n');
    if (career.visibility === 'public' && text.trim()) {
      await indexKnowledgeItem({ sourceType: 'career', sourceId: career.id, name: 'Career Goals', text, visibility: 'public' });
      counts.career = 1;
    }
  }

  const { rows: projects } = await pool.query('SELECT * FROM projects');
  let projectCount = 0;
  for (const p of projects) {
    const [{ rows: features }, { rows: technologies }] = await Promise.all([
      pool.query('SELECT feature FROM project_features WHERE project_id = $1', [p.id]),
      pool.query('SELECT technology FROM project_technologies WHERE project_id = $1', [p.id]),
    ]);
    const text = [
      `Project: ${p.name}`,
      p.short_description,
      p.detailed_description,
      technologies.length ? `Technologies: ${technologies.map((t: any) => t.technology).join(', ')}` : '',
      features.length ? `Key features: ${features.map((f: any) => f.feature).join('; ')}` : '',
      p.github_url ? `GitHub: ${p.github_url}` : '',
      p.live_url ? `Live demo: ${p.live_url}` : '',
    ].filter(Boolean).join('\n');
    await indexKnowledgeItem({ sourceType: 'project', sourceId: p.id, name: p.name, text, visibility: p.visibility });
    projectCount += 1;
  }
  counts.projects = projectCount;

  return { indexed: counts };
}

async function reindexMany<T extends { id: string; name: string; text: string; visibility: string }>(
  rows: any[],
  sourceType: 'skill' | 'experience' | 'education' | 'achievement' | 'certification' | 'service',
  mapFn: (row: any) => T
): Promise<number> {
  let n = 0;
  for (const row of rows) {
    const mapped = mapFn(row);
    if (!mapped.text.trim()) continue;
    await indexKnowledgeItem({
      sourceType,
      sourceId: mapped.id,
      name: mapped.name,
      text: mapped.text,
      visibility: mapped.visibility as 'public' | 'private',
    });
    n += 1;
  }
  return n;
}
