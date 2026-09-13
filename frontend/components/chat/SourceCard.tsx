import { FileText, Rocket, GraduationCap, Briefcase, Award, User, type LucideIcon } from 'lucide-react';
import type { Source } from '@/types';

const ICONS: Record<string, LucideIcon> = {
  document: FileText,
  project: Rocket,
  education: GraduationCap,
  experience: Briefcase,
  achievement: Award,
  profile: User,
};

const LABELS: Record<string, string> = {
  document: 'Uploaded Document',
  project: 'Project Knowledge',
  education: 'Education',
  experience: 'Work Experience',
  achievement: 'Achievement',
  skill: 'Skill',
  profile: 'Profile',
};

export function SourceCard({ source }: { source: Source }) {
  const Icon = ICONS[source.sourceType] || FileText;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm">
      <Icon size={16} className="text-brand shrink-0" />
      <div className="min-w-0">
        <div className="truncate font-medium">{source.label}</div>
        <div className="text-xs text-slate-500">{LABELS[source.sourceType] || source.sourceType}</div>
      </div>
    </div>
  );
}
