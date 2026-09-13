'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

interface AdminAiInstructions {
  id?: string;
  ai_introduction: string;
  response_style: 'concise' | 'detailed' | 'friendly' | 'formal' | 'technical';
  fallback_response: string;
  include_github_links: boolean;
  include_project_links: boolean;
  include_contact_info: boolean;
  custom_instructions: string;
}

const EMPTY: AdminAiInstructions = {
  ai_introduction: '', response_style: 'concise', fallback_response: '',
  include_github_links: true, include_project_links: true, include_contact_info: true,
  custom_instructions: '',
};

export default function AiInstructionsPage() {
  const [form, setForm] = useState<AdminAiInstructions>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api.get<AdminAiInstructions | null>('/ai-instructions')
      .then((data) => { if (data) setForm({ ...EMPTY, ...data }); })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.put('/ai-instructions', {
        aiIntroduction: form.ai_introduction,
        responseStyle: form.response_style,
        fallbackResponse: form.fallback_response,
        includeGithubLinks: form.include_github_links,
        includeProjectLinks: form.include_project_links,
        includeContactInfo: form.include_contact_info,
        customInstructions: form.custom_instructions,
      });
      setMessage('Saved.');
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">AI Instructions</h1>
      <p className="text-sm text-slate-500 mb-6">
        Controls tone and presentation only. These settings can never override the AI's core
        rules — it will still never invent facts or reveal private data, no matter what's set here.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        {message && <p className="text-sm text-brand">{message}</p>}

        <Field label="AI Introduction">
          <textarea className="input" rows={2} placeholder="How the AI should introduce itself, e.g. a friendly framing sentence" value={form.ai_introduction} onChange={(e) => setForm({ ...form, ai_introduction: e.target.value })} />
        </Field>
        <Field label="Response Style">
          <select className="input" value={form.response_style} onChange={(e) => setForm({ ...form, response_style: e.target.value as any })}>
            <option value="concise">Concise</option>
            <option value="detailed">Detailed</option>
            <option value="friendly">Friendly</option>
            <option value="formal">Formal</option>
            <option value="technical">Technical</option>
          </select>
        </Field>
        <Field label="Fallback Response">
          <textarea className="input" rows={2} placeholder="What to say when there's no relevant information" value={form.fallback_response} onChange={(e) => setForm({ ...form, fallback_response: e.target.value })} />
        </Field>

        <div className="space-y-2">
          <Checkbox label="Include GitHub links in answers" checked={form.include_github_links} onChange={(v) => setForm({ ...form, include_github_links: v })} />
          <Checkbox label="Include project/live-demo links in answers" checked={form.include_project_links} onChange={(v) => setForm({ ...form, include_project_links: v })} />
          <Checkbox label="Include contact information in answers" checked={form.include_contact_info} onChange={(v) => setForm({ ...form, include_contact_info: v })} />
        </div>

        <Field label="Custom Instructions">
          <textarea className="input" rows={3} placeholder="Any additional notes for the AI's behavior (cannot override factual/safety rules)" value={form.custom_instructions} onChange={(e) => setForm({ ...form, custom_instructions: e.target.value })} />
        </Field>

        <button type="submit" disabled={saving} className="rounded-lg bg-brand text-white px-4 py-2 text-sm font-medium disabled:opacity-50">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm text-slate-500 block mb-1">{label}</label>
      {children}
    </div>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
