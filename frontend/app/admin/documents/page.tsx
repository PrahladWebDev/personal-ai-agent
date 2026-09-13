'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Upload, RefreshCcw, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { DocumentItem } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  uploading: 'bg-slate-100 text-slate-600',
  processing: 'bg-amber-100 text-amber-700',
  embedding: 'bg-amber-100 text-amber-700',
  ready: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
};

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('resume');
  const [visibility, setVisibility] = useState<'public' | 'private'>('private');

  const load = useCallback(async () => {
    try {
      setDocs(await api.get<DocumentItem[]>('/documents'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load documents');
    }
  }, []);

  useEffect(() => {
    load();
    // Poll while any document is still processing so status updates live.
    const interval = setInterval(() => {
      setDocs((current) => {
        if (current.some((d) => ['uploading', 'processing', 'embedding'].includes(d.status))) {
          load();
        }
        return current;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title || file.name);
      formData.append('category', category);
      formData.append('visibility', visibility);
      await api.post('/documents/upload', formData);
      setTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this document and its indexed knowledge?')) return;
    await api.delete(`/documents/${id}`);
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }

  async function handleReprocess(id: string) {
    await api.post(`/documents/${id}/reprocess`);
    load();
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Documents</h1>

      <form onSubmit={handleUpload} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 mb-8 space-y-3 max-w-xl">
        <div>
          <label className="text-sm text-slate-500 block mb-1">File (PDF, DOCX, TXT, or MD)</label>
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.md" required className="text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-sm"
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-sm">
            <option value="resume">Resume</option>
            <option value="cv">CV</option>
            <option value="project_doc">Project Documentation</option>
            <option value="technical_doc">Technical Documentation</option>
            <option value="certificate">Certificate</option>
            <option value="note">Personal Note</option>
            <option value="other">Other</option>
          </select>
        </div>
        <select value={visibility} onChange={(e) => setVisibility(e.target.value as any)} className="rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-sm">
          <option value="private">Private (never used by public chat)</option>
          <option value="public">Public (AI can reference it)</option>
        </select>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button type="submit" disabled={uploading} className="flex items-center gap-2 rounded-lg bg-brand text-white px-4 py-2 text-sm font-medium disabled:opacity-50">
          <Upload size={16} /> {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </form>

      <div className="space-y-2">
        {docs.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm">
            <div>
              <div className="font-medium">{d.title}</div>
              <div className="text-xs text-slate-400">{d.file_type.toUpperCase()} · {d.category} · {d.visibility}</div>
              {d.status === 'failed' && d.error_message && <div className="text-xs text-red-500 mt-1">{d.error_message}</div>}
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 rounded-full text-xs ${STATUS_COLORS[d.status]}`}>{d.status}</span>
              {d.status === 'failed' && (
                <button onClick={() => handleReprocess(d.id)} className="text-slate-400 hover:text-brand"><RefreshCcw size={16} /></button>
              )}
              <button onClick={() => handleDelete(d.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
        {docs.length === 0 && <p className="text-sm text-slate-500">No documents uploaded yet.</p>}
      </div>
    </div>
  );
}
