'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { DashboardStats } from '@/types';

const CARDS: { key: keyof DashboardStats; label: string }[] = [
  { key: 'projects', label: 'Projects' },
  { key: 'skills', label: 'Skills' },
  { key: 'documents', label: 'Documents' },
  { key: 'githubRepositories', label: 'GitHub Repositories' },
  { key: 'knowledgeChunks', label: 'Knowledge Chunks' },
  { key: 'questionsToday', label: 'Questions Today' },
  { key: 'questionsThisMonth', label: 'Questions This Month' },
  { key: 'totalConversations', label: 'Total Conversations' },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api.get<DashboardStats>('/analytics/dashboard').then(setStats).catch(() => undefined);
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {CARDS.map((c) => (
          <div key={c.key} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-2xl font-semibold">{stats ? (stats[c.key] as number) : '—'}</div>
            <div className="text-xs text-slate-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="font-medium mb-3">Most Common Questions</h2>
        {stats?.mostCommonQuestions?.length ? (
          <ul className="space-y-2">
            {stats.mostCommonQuestions.map((q, i) => (
              <li key={i} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2 text-sm">
                <span>{q.question}</span>
                <span className="text-slate-400">{q.count}×</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No questions asked yet.</p>
        )}
      </div>
    </div>
  );
}
