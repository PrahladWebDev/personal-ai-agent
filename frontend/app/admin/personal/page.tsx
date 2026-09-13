'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

interface AdminPersonalInfo {
  id?: string;
  short_introduction: string;
  detailed_biography: string;
  current_focus: string;
  interests: string;
  hobbies: string;
  languages: string[];
  personal_goals: string;
  professional_interests: string;
  other_information: string;
  visibility: 'public' | 'private';
}

const EMPTY: AdminPersonalInfo = {
  short_introduction: '', detailed_biography: '', current_focus: '', interests: '', hobbies: '',
  languages: [], personal_goals: '', professional_interests: '', other_information: '', visibility: 'public',
};

export default function PersonalInfoPage() {
  const [form, setForm] = useState<AdminPersonalInfo>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api.get<AdminPersonalInfo | null>('/personal/admin')
      .then((data) => { if (data) setForm({ ...EMPTY, ...data, languages: data.languages || [] }); })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.put('/personal', {
        shortIntroduction: form.short_introduction,
        detailedBiography: form.detailed_biography,
        currentFocus: form.current_focus,
        interests: form.interests,
        hobbies: form.hobbies,
        languages: form.languages,
        personalGoals: form.personal_goals,
        professionalInterests: form.professional_interests,
        otherInformation: form.other_information,
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
      <h1 className="text-xl font-semibold mb-1">Personal / About Me</h1>
      <p className="text-sm text-slate-500 mb-6">
        Background info the AI can draw on for "tell me about him", hobbies, interests, and languages.
        Only fill in what you're comfortable making public — nothing here is required.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        {message && <p className="text-sm text-brand">{message}</p>}

        <Field label="Short Introduction">
          <textarea className="input" rows={2} value={form.short_introduction} onChange={(e) => setForm({ ...form, short_introduction: e.target.value })} />
        </Field>
        <Field label="Detailed Biography">
          <textarea className="input" rows={5} value={form.detailed_biography} onChange={(e) => setForm({ ...form, detailed_biography: e.target.value })} />
        </Field>
        <Field label="Current Focus">
          <input className="input" value={form.current_focus} onChange={(e) => setForm({ ...form, current_focus: e.target.value })} />
        </Field>
        <Field label="Interests">
          <input className="input" value={form.interests} onChange={(e) => setForm({ ...form, interests: e.target.value })} />
        </Field>
        <Field label="Hobbies">
          <input className="input" value={form.hobbies} onChange={(e) => setForm({ ...form, hobbies: e.target.value })} />
        </Field>
        <Field label="Languages (comma-separated)">
          <input
            className="input"
            value={form.languages.join(', ')}
            onChange={(e) => setForm({ ...form, languages: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
          />
        </Field>
        <Field label="Personal Goals">
          <textarea className="input" rows={2} value={form.personal_goals} onChange={(e) => setForm({ ...form, personal_goals: e.target.value })} />
        </Field>
        <Field label="Professional Interests">
          <input className="input" value={form.professional_interests} onChange={(e) => setForm({ ...form, professional_interests: e.target.value })} />
        </Field>
        <Field label="Other Information">
          <textarea className="input" rows={2} value={form.other_information} onChange={(e) => setForm({ ...form, other_information: e.target.value })} />
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
