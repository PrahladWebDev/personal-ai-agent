/**
 * Lightweight, dependency-free intent classifier. This decides WHICH
 * structured knowledge sections to pull into the prompt (see
 * rag/knowledgeBase.ts) and whether the question needs an exact
 * database count/list rather than semantic retrieval.
 *
 * This is intentionally keyword/pattern based rather than an extra LLM
 * call: it needs to be fast, free, and - most importantly - reliable for
 * the "exact numbers" requirement (an LLM classifier could itself
 * hallucinate a category). Multiple flags can be true at once: "what's
 * he best at" should pull skills + projects + github + experience, not
 * just one bucket (see spec section "Multi-source questions").
 */

export interface Intent {
  wantsProjects: boolean;
  wantsProjectCount: boolean;
  wantsProjectList: boolean;
  wantsGithub: boolean;
  technologyFilter: string | null;
  namedProjectQuery: string | null;
  wantsSkills: boolean;
  wantsExperience: boolean;
  wantsEducation: boolean;
  wantsCertifications: boolean;
  wantsAchievements: boolean;
  wantsServices: boolean;
  wantsPersonal: boolean;
  wantsCareer: boolean;
  wantsContact: boolean;
  wantsSocialLinks: boolean;
  isGeneralAbout: boolean;
  isBestOrStrongest: boolean;
}

const COUNT_WORDS = /\bhow many\b|\bnumber of\b|\bcount of\b|\btotal\b/i;
const LIST_WORDS = /\blist\b|\ball (of )?(his|your|my|the)\b|\bshow me\b|\bwhich\b|\bwhat (projects|apps|things)\b/i;

const TECH_KEYWORDS = [
  'react', 'react native', 'next.js', 'nextjs', 'node', 'node.js', 'nodejs', 'java', 'javascript',
  'typescript', 'python', 'django', 'flask', 'express', 'vue', 'angular', 'flutter', 'swift',
  'kotlin', 'android', 'ios', 'mobile', 'go', 'golang', 'rust', 'c#', 'c++', '.net', 'dotnet',
  'php', 'laravel', 'ruby', 'rails', 'graphql', 'rest', 'api', 'docker', 'kubernetes', 'aws',
  'azure', 'gcp', 'firebase', 'mongodb', 'postgres', 'postgresql', 'mysql', 'redis', 'tailwind',
  'sql', 'nosql', 'devops', 'machine learning', 'ml', 'ai', 'blockchain',
];

function findTechnologyMention(q: string): string | null {
  const lower = q.toLowerCase();
  for (const tech of TECH_KEYWORDS) {
    if (lower.includes(tech)) return tech;
  }
  return null;
}

/** Pulls a likely project name out of "tell me about the X project" style questions. */
function findNamedProjectQuery(q: string): string | null {
  const match = q.match(/(?:about|regarding)\s+(?:the\s+|his\s+|your\s+|my\s+)?([a-z0-9][a-z0-9\s\-]{1,40}?)\s*(?:project|app|repo|repository)?\??$/i);
  if (match && match[1] && match[1].trim().length > 1 && !/^he|him|his$/i.test(match[1].trim())) {
    return match[1].trim();
  }
  return null;
}

export function classifyIntent(rawQuestion: string): Intent {
  const q = rawQuestion.toLowerCase();

  const wantsProjects =
    /\bproject(s)?\b|\bapp(s)?\b|\bbuilt\b|\bbuild\b|\bmade\b|\bdeveloped\b|\bportfolio\b|\bwardrobe\b|\bdemo\b/.test(q);
  const wantsGithub = /\bgithub\b|\brepo(s|sitory|sitories)?\b/.test(q);
  const technologyFilter = findTechnologyMention(q);
  const namedProjectQuery = wantsProjects ? findNamedProjectQuery(q) : null;

  const wantsSkills =
    /\bskill(s)?\b|\btech(nology|nologies|stack)?\b|\bprogramming language(s)?\b|\bwhat.*(know|use|working with)\b|\bframeworks?\b/.test(q);

  const wantsExperience =
    /\bexperience\b|\bwork(ed)?\b|\bcompan(y|ies)\b|\bjob(s)?\b|\bemployer(s)?\b|\bcareer background\b|\bworked with\b/.test(q);

  const wantsEducation = /\beducation\b|\bstudy\b|\bstudied\b|\bstudent\b|\bdegree\b|\buniversity\b|\bcollege\b|\bschool\b/.test(q);

  const wantsCertifications = /\bcertif(ication|icate|ied)\b|\bcredential\b/.test(q);

  const wantsAchievements = /\bachievement(s)?\b|\baward(s)?\b|\bhonou?r(s)?\b/.test(q);

  const wantsServices = /\bservice(s)?\b|\bfreelance\b|\bhire\b|\bavailable for work\b|\boffer\b|\bwhat (can|do) (he|you) (build|do|offer)\b/.test(q);

  const wantsPersonal = /\bhobb(y|ies)\b|\binterest(s)?\b|\babout (him|you|yourself)\b|\btell me about\b(?!.*project)|\bwho (is he|are you)\b|\blanguage(s)? (does|do) (he|you) speak\b/.test(q);

  const wantsCareer = /\bcareer goal(s)?\b|\bfuture plans\b|\bwhat.*(learning|want to (do|become))\b|\bcurrently learning\b|\btarget role\b/.test(q);

  const wantsContact = /\bcontact\b|\bemail\b|\breach (him|you|out)\b|\bhire (him|you)\b|\blinkedin\b/.test(q);

  const wantsSocialLinks = /\bgithub\b|\blinkedin\b|\btwitter\b|\bx\.com\b|\bsocial\b|\blink(s)?\b/.test(q);

  const isGeneralAbout = /^(tell me about (him|you|yourself)|who (is he|are you)|about (him|you))\.?\??$/.test(q.trim());

  const isBestOrStrongest = /\bbest\b|\bstrongest\b|\bmost (skilled|experienced|proficient)\b|\bexpert(ise)? (in|at)\b|\bwhat (is he|are you) (best|good) at\b/.test(q);

  return {
    wantsProjects,
    wantsProjectCount: wantsProjects && COUNT_WORDS.test(q),
    wantsProjectList: wantsProjects && (LIST_WORDS.test(q) || COUNT_WORDS.test(q)),
    wantsGithub,
    technologyFilter: wantsProjects || wantsGithub ? technologyFilter : null,
    namedProjectQuery,
    wantsSkills: wantsSkills || isBestOrStrongest,
    wantsExperience: wantsExperience || isBestOrStrongest || isGeneralAbout,
    wantsEducation,
    wantsCertifications,
    wantsAchievements: wantsAchievements || wantsCertifications,
    wantsServices,
    wantsPersonal: wantsPersonal || isGeneralAbout,
    wantsCareer,
    wantsContact,
    wantsSocialLinks: wantsSocialLinks || wantsContact,
    isGeneralAbout,
    isBestOrStrongest,
  };
}
