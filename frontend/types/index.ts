export interface Profile {
  id?: string;
  name: string;
  title: string;
  shortBio?: string;
  short_bio?: string;
  longBio?: string;
  long_bio?: string;
  location?: string;
  location_visibility?: 'public' | 'private';
  email?: string;
  email_visibility?: 'public' | 'private';
  currentFocus?: string;
  current_focus?: string;
  professionalInterests?: string;
  professional_interests?: string;
}

export interface Source {
  sourceType: string;
  sourceId: string | null;
  label: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  isStreaming?: boolean;
}

export interface Skill {
  id: string;
  name: string;
  category_id?: string | null;
  category_name?: string | null;
  description?: string;
  experience_level?: string;
  years_experience?: number;
  visibility: 'public' | 'private';
  display_order: number;
}

export interface ExperienceItem {
  id: string;
  company: string;
  role: string;
  start_date?: string;
  end_date?: string;
  is_current: boolean;
  description?: string;
  responsibilities?: string[];
  technologies?: string[];
  achievements?: string[];
  visibility: 'public' | 'private';
  display_order: number;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  short_description?: string;
  detailed_description?: string;
  problem?: string;
  solution?: string;
  architecture?: string;
  contribution?: string;
  challenges?: string;
  challenge_solutions?: string;
  github_url?: string;
  live_url?: string;
  documentation_url?: string;
  status: string;
  visibility: 'public' | 'private';
  features?: string[];
  technologies?: string[];
  display_order: number;
}

export interface DocumentItem {
  id: string;
  title: string;
  file_name: string;
  file_type: string;
  category?: string;
  status: 'uploading' | 'processing' | 'embedding' | 'ready' | 'failed';
  error_message?: string;
  visibility: 'public' | 'private';
  created_at: string;
}

export interface GithubRepo {
  id: string;
  github_id: number;
  name: string;
  full_name: string;
  description?: string;
  url: string;
  homepage?: string;
  stars: number;
  forks: number;
  is_included: boolean;
  repo_updated_at: string;
}

export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  visibility: 'public' | 'private';
  display_order: number;
}

export interface DashboardStats {
  projects: number;
  skills: number;
  documents: number;
  githubRepositories: number;
  knowledgeChunks: number;
  questionsToday: number;
  questionsThisMonth: number;
  totalConversations: number;
  mostCommonQuestions: { question: string; count: string }[];
}
