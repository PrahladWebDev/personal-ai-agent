'use client';

import { useEffect, useState } from 'react';
import { RefreshCcw, Star, GitFork } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { GithubRepo } from '@/types';

export default function GithubPage() {
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [username, setUsername] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setRepos(await api.get<GithubRepo[]>('/github/repositories'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load repositories');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSync(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setSyncing(true);
    setError(null);
    try {
      await api.post('/github/sync', { username: username.trim() });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function toggleInclude(id: string, included: boolean) {
    const updated = await api.patch<GithubRepo>(`/github/repositories/${id}/include`, { included });
    setRepos((prev) => prev.map((r) => (r.id === id ? updated : r)));
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">GitHub</h1>
      <p className="text-sm text-slate-500 mb-6">
        Sync your public repositories, then choose which ones become part of the AI&apos;s public knowledge.
        Nothing is exposed automatically.
      </p>

      <form onSubmit={handleSync} className="flex gap-2 mb-8 max-w-md">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="GitHub username"
          className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-sm"
        />
        <button type="submit" disabled={syncing} className="flex items-center gap-2 rounded-lg bg-brand text-white px-4 py-2 text-sm font-medium disabled:opacity-50">
          <RefreshCcw size={16} /> {syncing ? 'Syncing…' : 'Sync GitHub'}
        </button>
      </form>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      <div className="space-y-2">
        {repos.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm">
            <div>
              <a href={r.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">{r.name}</a>
              <p className="text-xs text-slate-400 mt-0.5">{r.description}</p>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                <span className="flex items-center gap-1"><Star size={12} /> {r.stars}</span>
                <span className="flex items-center gap-1"><GitFork size={12} /> {r.forks}</span>
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={r.is_included} onChange={(e) => toggleInclude(r.id, e.target.checked)} />
              Include in AI knowledge
            </label>
          </div>
        ))}
        {repos.length === 0 && <p className="text-sm text-slate-500">No repositories synced yet.</p>}
      </div>
    </div>
  );
}
