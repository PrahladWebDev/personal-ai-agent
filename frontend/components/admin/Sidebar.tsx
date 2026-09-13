'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bot, LayoutDashboard, User, Sparkles, Briefcase, Rocket, FileText,
  Github, Link2, GraduationCap, Award, Settings, LogOut,
} from 'lucide-react';
import { logout } from '@/lib/auth';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/profile', label: 'Profile', icon: User },
  { href: '/admin/skills', label: 'Skills', icon: Sparkles },
  { href: '/admin/experience', label: 'Experience', icon: Briefcase },
  { href: '/admin/projects', label: 'Projects', icon: Rocket },
  { href: '/admin/education', label: 'Education', icon: GraduationCap },
  { href: '/admin/achievements', label: 'Achievements', icon: Award },
  { href: '/admin/social-links', label: 'Social Links', icon: Link2 },
  { href: '/admin/documents', label: 'Documents', icon: FileText },
  { href: '/admin/github', label: 'GitHub', icon: Github },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="w-60 shrink-0 border-r border-slate-200 dark:border-slate-800 h-screen sticky top-0 flex flex-col">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-200 dark:border-slate-800">
        <Bot size={20} className="text-brand" />
        <span className="font-semibold text-sm">Personal Agent</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-2 text-sm ${
                active
                  ? 'bg-brand/10 text-brand font-medium'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={async () => {
          await logout();
          router.push('/admin/login');
        }}
        className="flex items-center gap-3 px-4 py-3 text-sm text-slate-500 border-t border-slate-200 dark:border-slate-800 hover:text-red-500"
      >
        <LogOut size={16} /> Log out
      </button>
    </aside>
  );
}
