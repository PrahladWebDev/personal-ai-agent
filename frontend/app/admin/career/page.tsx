'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

interface AdminCareerGoals {
  id?: string;
  current_goal: string;
  target_roles: string[];
  currently_learning: string[];
  future_goals: string;
  preferred_work_type: string;
  preferred_project_types: string;
  professional_interests: string;
  visibility: 'public' | 'private';
}

const EMPTY: AdminCareerGoals = {
  current_goal: '', target_roles: [], currently_learning: [], future_goals: '',
  preferred_work_type: '', preferred_project_types: '', professional_interests: '', visibility: 'public',
};

export default function CareerGoalsPage() {
  const [form, setForm] = useState<AdminCareerGoals>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api.get<AdminCareerGoals | null>('/career/admin')
      .then((data) => {
        if (data) setForm({ ...EMPTY, ...data, target_roles: data.target_roles || [], currently_learning: data.currently_learning || [] });
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.put('/career', {
        currentGoal: form.current_goal,
        targetRoles: form.target_roles,
        currentlyLearning: form.currently_learning,
        futureGoals: form.future_goals,
        preferredWorkType: form.preferred_work_type,
        preferredProjectTypes: form.preferred_project_types,
        professionalInterests: form.professional_interests,
        visibility: form.visibility,
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
      <h1 className="text-xl font-semibold mb-1">Career Goals</h1>
      <p className="text-sm text-slate-500 mb-6">Lets the AI answer "what are your career goals" and similar questions accurately.</p>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        {message && <p className="text-sm text-brand">{message}</p>}

        <Field label="Current Career Goal">
          <textarea className="input" rows={2} value={form.current_goal} onChange={(e) => setForm({ ...form, current_goal: e.target.value })} />
        </Field>
        <Field label="Target Roles (comma-separated)">
          <input className="input" value={form.target_roles.join(', ')} onChange={(e) => setForm({ ...form, target_roles: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
        </Field>
        <Field label="Technologies Currently Learning (comma-separated)">
          <input className="input" value={form.currently_learning.join(', ')} onChange={(e) => setForm({ ...form, currently_learning: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
        </Field>
        <Field label="Future Goals">
          <textarea className="input" rows={2} value={form.future_goals} onChange={(e) => setForm({ ...form, future_goals: e.target.value })} />
        </Field>
        <Field label="Preferred Work Type">
          <input className="input" placeholder="e.g. Remote, full-time" value={form.preferred_work_type} onChange={(e) => setForm({ ...form, preferred_work_type: e.target.value })} />
        </Field>
        <Field label="Preferred Project Types">
          <input className="input" value={form.preferred_project_types} onChange={(e) => setForm({ ...form, preferred_project_types: e.target.value })} />
        </Field>
        <Field label="Professional Interests">
          <input className="input" value={form.professional_interests} onChange={(e) => setForm({ ...form, professional_interests: e.target.value })} />
        </Field>
        <Field label="Visibility">
          <select className="input" value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as any })}>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
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
