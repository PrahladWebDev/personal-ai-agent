import { Intent } from '../ai/intent';
import { StructuredSection } from './promptBuilder';
import * as kb from './knowledgeBase';

function fmtDate(d: string | null | undefined) {
  if (!d) return '';
  return String(d).slice(0, 10);
}

function projectLine(p: kb.UnifiedProject): string {
  const parts = [
    `- ${p.name}`,
    p.description ? `— ${p.description}` : '',
    p.technologies.length ? `(Technologies: ${p.technologies.join(', ')})` : '',
    p.githubUrl ? `[GitHub: ${p.githubUrl}]` : '',
    p.liveUrl ? `[Live demo: ${p.liveUrl}]` : '',
  ];
  return parts.filter(Boolean).join(' ');
}

/**
 * Builds the structured (non-vector) portion of the prompt context based
 * on which knowledge sections the classified intent says are relevant.
 * Every section that is included is either fully populated or explicitly
 * states it is empty - the model is never left to guess why a section is
 * missing (see promptBuilder rule 2).
 */
export async function buildStructuredContext(intent: Intent, question: string): Promise<StructuredSection[]> {
  const sections: StructuredSection[] = [];

  // --- Projects / GitHub (with exact counts when asked) ---
  if (intent.wantsProjects || intent.wantsGithub || intent.isBestOrStrongest) {
    const allProjects = await kb.getUnifiedProjects(false);

    let projects = allProjects;
    if (intent.technologyFilter) {
      projects = kb.filterProjectsByTechnology(allProjects, intent.technologyFilter);
    }
    if (intent.namedProjectQuery) {
      const needle = intent.namedProjectQuery.toLowerCase();
      const named = allProjects.filter((p) => p.name.toLowerCase().includes(needle));
      if (named.length) projects = named;
    }

    if (intent.wantsProjectCount || intent.wantsProjectList) {
      const counts = await kb.getProjectCounts(false);
      sections.push({
        title: 'EXACT DATA: Project Counts',
        content: [
          `Total unique projects (deduplicated across manually-added Projects and synced GitHub repositories): ${counts.totalUniqueProjects}`,
          `Portfolio projects (manually documented, some may also be on GitHub): ${counts.portfolioProjects}`,
          `GitHub-only repositories (synced from GitHub, not separately documented as a portfolio project): ${counts.githubOnlyRepositories}`,
          `Total GitHub repositories synced (including ones not exposed to the AI): ${counts.totalGithubRepositoriesSynced}`,
        ].join('\n'),
      });
    }

    sections.push({
      title: intent.technologyFilter
        ? `Projects using "${intent.technologyFilter}"`
        : intent.namedProjectQuery
        ? `Projects matching "${intent.namedProjectQuery}"`
        : 'Projects (portfolio + GitHub, deduplicated)',
      content: projects.length
        ? projects.map(projectLine).join('\n')
        : '(No matching projects were found.)',
    });
  }

  // --- Skills / Tech stack ---
  if (intent.wantsSkills) {
    const skills = await kb.getSkills(false);
    sections.push({
      title: 'Skills & Technologies',
      content: skills.length
        ? skills
            .map(
              (s: any) =>
                `- ${s.name}${s.category_name ? ` (${s.category_name})` : ''}${
                  s.experience_level ? `, level: ${s.experience_level}` : ''
                }${s.years_experience ? `, ${s.years_experience} yrs` : ''}`
            )
            .join('\n')
        : 'No skills are currently listed in the profile.',
    });
  }

  // --- Experience ---
  if (intent.wantsExperience) {
    const exp = await kb.getExperience(false);
    sections.push({
      title: 'Work Experience',
      content: exp.length
        ? exp
            .map((e: any) => {
              const range = `${fmtDate(e.start_date) || '?'} - ${e.is_current ? 'Present' : fmtDate(e.end_date) || '?'}`;
              return [
                `- ${e.role} at ${e.company} (${range})`,
                e.description ? `  ${e.description}` : '',
                e.technologies?.length ? `  Technologies: ${e.technologies.join(', ')}` : '',
                e.achievements?.length ? `  Achievements: ${e.achievements.join('; ')}` : '',
              ]
                .filter(Boolean)
                .join('\n');
            })
            .join('\n')
        : 'No work experience is currently listed in the profile.',
    });
  }

  // --- Education ---
  if (intent.wantsEducation) {
    const edu = await kb.getEducation(false);
    sections.push({
      title: 'Education',
      content: edu.length
        ? edu
            .map(
              (e: any) =>
                `- ${e.degree || ''}${e.field_of_study ? ` in ${e.field_of_study}` : ''} at ${e.institution} (${fmtDate(e.start_date) || '?'} - ${fmtDate(e.end_date) || '?'})${e.description ? `\n  ${e.description}` : ''}`
            )
            .join('\n')
        : 'No education history is currently listed in the profile.',
    });
  }

  // --- Certifications ---
  if (intent.wantsCertifications) {
    const certs = await kb.getCertifications(false);
    if (intent.wantsProjectCount || /how many/.test(question.toLowerCase())) {
      sections.push({ title: 'EXACT DATA: Certification Count', content: `Total certifications: ${certs.length}` });
    }
    sections.push({
      title: 'Certifications',
      content: certs.length
        ? certs
            .map(
              (c: any) =>
                `- ${c.name} — ${c.issuing_organization}${c.issue_date ? ` (issued ${fmtDate(c.issue_date)})` : ''}${c.expiration_date ? `, expires ${fmtDate(c.expiration_date)}` : ''}${c.credential_url ? ` [${c.credential_url}]` : ''}`
            )
            .join('\n')
        : "I don't currently have any certification information in my profile.",
    });
  }

  // --- Achievements (awards etc., separate from certifications) ---
  if (intent.wantsAchievements) {
    const achievements = (await kb.getAchievements(false)).filter((a: any) => a.category !== 'certification');
    sections.push({
      title: 'Achievements & Awards',
      content: achievements.length
        ? achievements.map((a: any) => `- ${a.title}${a.date ? ` (${fmtDate(a.date)})` : ''}${a.description ? `: ${a.description}` : ''}`).join('\n')
        : 'No additional achievements or awards are currently listed.',
    });
  }

  // --- Services ---
  if (intent.wantsServices) {
    const services = await kb.getServices(false);
    sections.push({
      title: 'Services Offered',
      content: services.length
        ? services
            .map(
              (s: any) =>
                `- ${s.name}: ${s.short_description || ''}${s.technologies?.length ? ` (Technologies: ${s.technologies.join(', ')})` : ''}${s.availability ? ` [Availability: ${s.availability}]` : ''}`
            )
            .join('\n')
        : "My profile doesn't currently contain information about services I offer.",
    });
  }

  // --- Personal / About ---
  if (intent.wantsPersonal) {
    const personal = await kb.getPersonalInfo(false);
    const profile = await kb.getProfile(false);
    const lines: string[] = [];
    if (profile) {
      lines.push(`${profile.name || ''} - ${profile.title || ''}`.trim());
      if (profile.short_bio) lines.push(profile.short_bio);
    }
    if (personal) {
      if (personal.short_introduction) lines.push(personal.short_introduction);
      if (personal.detailed_biography) lines.push(personal.detailed_biography);
      if (personal.interests) lines.push(`Interests: ${personal.interests}`);
      if (personal.hobbies) lines.push(`Hobbies: ${personal.hobbies}`);
      if (personal.languages?.length) lines.push(`Languages: ${personal.languages.join(', ')}`);
      if (personal.personal_goals) lines.push(`Personal goals: ${personal.personal_goals}`);
    }
    sections.push({
      title: 'Personal / About',
      content: lines.length ? lines.join('\n') : "I don't currently have personal/about information in my profile beyond the basics.",
    });
  }

  // --- Career goals ---
  if (intent.wantsCareer) {
    const career = await kb.getCareerGoals(false);
    sections.push({
      title: 'Career Goals',
      content: career
        ? [
            career.current_goal ? `Current goal: ${career.current_goal}` : '',
            career.target_roles?.length ? `Target roles: ${career.target_roles.join(', ')}` : '',
            career.currently_learning?.length ? `Currently learning: ${career.currently_learning.join(', ')}` : '',
            career.future_goals ? `Future goals: ${career.future_goals}` : '',
            career.preferred_work_type ? `Preferred work type: ${career.preferred_work_type}` : '',
          ]
            .filter(Boolean)
            .join('\n') || "I don't currently have career goal information in my profile."
        : "I don't currently have career goal information in my profile.",
    });
  }

  // --- Contact / social links ---
  if (intent.wantsContact || intent.wantsSocialLinks) {
    const [profile, links] = await Promise.all([kb.getProfile(false), kb.getSocialLinks(false)]);
    const lines: string[] = [];
    if (profile?.email) lines.push(`Email: ${profile.email}`);
    for (const l of links) lines.push(`${l.platform}: ${l.url}`);
    sections.push({
      title: 'Contact & Links',
      content: lines.length ? lines.join('\n') : "I don't currently have public contact information available.",
    });
  }

  return sections;
}
