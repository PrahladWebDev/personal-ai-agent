'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { DashboardStats } from '@/types';

const CARDS: { key: keyof DashboardStats; label: string }[] = [
  { key: 'projects', label: 'Total Projects (deduplicated)' },
  { key: 'portfolioProjects', label: 'Portfolio Projects' },
  { key: 'githubOnlyRepositories', label: 'GitHub-Only Repos' },
  { key: 'skills', label: 'Skills' },
  { key: 'certifications', label: 'Certifications' },
  { key: 'services', label: 'Services' },
  { key: 'documents', label: 'Documents' },
  { key: 'githubRepositories', label: 'GitHub Repositories Synced' },
  { key: 'knowledgeChunks', label: 'Knowledge Chunks' },
  { key: 'questionsToday', label: 'Questions Today' },
  { key: 'questionsThisMonth', label: 'Questions This Month' },
  { key: 'totalConversations', label: 'Total Conversations' },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [reindexing, setReindexing] = useState(false);
  const [reindexMessage, setReindexMessage] = useState<string | null>(null);

  useEffect(() => {
    api.get<DashboardStats>('/analytics/dashboard').then(setStats).catch(() => undefined);
  }, []);

  async function handleReindex() {
    setReindexing(true);
    setReindexMessage(null);
    try {
      const result = await api.post<{ indexed: Record<string, number> }>('/ai/knowledge/reindex');
      const total = Object.values(result.indexed).reduce((a, b) => a + b, 0);
      setReindexMessage(`Re-indexed ${total} knowledge items across ${Object.keys(result.indexed).length} sections.`);
      const refreshed = await api.get<DashboardStats>('/analytics/dashboard');
      setStats(refreshed);
    } catch (err) {
      setReindexMessage(err instanceof ApiError ? err.message : 'Re-index failed');
    } finally {
      setReindexing(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="text-right">
          <button
            onClick={handleReindex}
            disabled={reindexing}
            className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            {reindexing ? 'Re-indexing…' : 'Re-index Knowledge'}
          </button>
          {reindexMessage && <p className="text-xs text-slate-500 mt-1 max-w-xs">{reindexMessage}</p>}
        </div>
      </div>

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
