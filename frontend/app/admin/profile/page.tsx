'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

interface AdminProfile {
  id?: string;
  name: string;
  title: string;
  short_bio: string;
  long_bio: string;
  location: string;
  location_visibility: 'public' | 'private';
  email: string;
  email_visibility: 'public' | 'private';
  current_focus: string;
  professional_interests: string;
}

const EMPTY: AdminProfile = {
  name: '', title: '', short_bio: '', long_bio: '', location: '', location_visibility: 'private',
  email: '', email_visibility: 'private', current_focus: '', professional_interests: '',
};

export default function ProfilePage() {
  const [form, setForm] = useState<AdminProfile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api.get<AdminProfile | null>('/profile/admin')
      .then((data) => { if (data) setForm({ ...EMPTY, ...data }); })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await api.put('/profile', {
        name: form.name, title: form.title, shortBio: form.short_bio, longBio: form.long_bio,
        location: form.location, locationVisibility: form.location_visibility,
        email: form.email, emailVisibility: form.email_visibility,
        currentFocus: form.current_focus, professionalInterests: form.professional_interests,
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
      <h1 className="text-xl font-semibold mb-6">Profile</h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        {message && <p className="text-sm text-brand">{message}</p>}

        <Field label="Name">
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Professional Title">
          <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <Field label="Short Bio">
          <textarea className="input" rows={2} value={form.short_bio} onChange={(e) => setForm({ ...form, short_bio: e.target.value })} />
        </Field>
        <Field label="Long Bio">
          <textarea className="input" rows={5} value={form.long_bio} onChange={(e) => setForm({ ...form, long_bio: e.target.value })} />
        </Field>
        <Field label="Current Focus">
          <input className="input" value={form.current_focus} onChange={(e) => setForm({ ...form, current_focus: e.target.value })} />
        </Field>
        <Field label="Professional Interests">
          <input className="input" value={form.professional_interests} onChange={(e) => setForm({ ...form, professional_interests: e.target.value })} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Location">
            <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Field>
          <Field label="Location Visibility">
            <select className="input" value={form.location_visibility} onChange={(e) => setForm({ ...form, location_visibility: e.target.value as any })}>
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Email">
            <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Email Visibility">
            <select className="input" value={form.email_visibility} onChange={(e) => setForm({ ...form, email_visibility: e.target.value as any })}>
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </Field>
        </div>

        <button type="submit" disabled={saving} className="rounded-lg bg-brand text-white px-4 py-2 text-sm font-medium disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Profile'}
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
