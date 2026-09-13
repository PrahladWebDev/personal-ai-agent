'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { api, ApiError } from '@/lib/api';

export type FieldType = 'text' | 'textarea' | 'select' | 'checkbox' | 'number' | 'date' | 'tags';

export interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  // Alternative to `options` for a 'select' field whose choices come from the
  // API (e.g. a categories table) rather than being fixed at compile time.
  // The endpoint must return an array of objects with `id` and `name`.
  optionsEndpoint?: string;
  // Shown as the first, unselected option when the field isn't required.
  optionsPlaceholder?: string;
  required?: boolean;
  placeholder?: string;
}

export interface ResourceManagerProps {
  title: string;
  description?: string;
  endpoint: string; // e.g. "/skills"
  fields: FieldConfig[];
  columns: { key: string; label: string; render?: (row: any) => React.ReactNode }[];
}

function emptyForm(fields: FieldConfig[]) {
  const obj: Record<string, any> = {};
  for (const f of fields) {
    obj[f.key] = f.type === 'checkbox' ? false : f.type === 'tags' ? [] : '';
  }
  return obj;
}

export function ResourceManager({ title, description, endpoint, fields, columns }: ResourceManagerProps) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, any>>(emptyForm(fields));
  const [saving, setSaving] = useState(false);
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, { value: string; label: string }[]>>({});

  const fieldsWithOptionsEndpoint = fields.filter((f) => f.type === 'select' && f.optionsEndpoint);

  useEffect(() => {
    let cancelled = false;
    fieldsWithOptionsEndpoint.forEach(async (f) => {
      try {
        const data = await api.get<any[]>(f.optionsEndpoint!);
        if (cancelled) return;
        setDynamicOptions((prev) => ({
          ...prev,
          [f.key]: (data || []).map((item) => ({ value: item.id, label: item.name })),
        }));
      } catch {
        // Non-fatal: the select just falls back to no options (or `f.options`, if given).
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<any[]>(endpoint);
      setRows(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm(fields));
    setShowForm(true);
  }

  function openEdit(row: any) {
    setEditing(row);
    const next: Record<string, any> = {};
    for (const f of fields) {
      const camel = f.key;
      const snake = f.key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
      next[f.key] = row[camel] ?? row[snake] ?? (f.type === 'tags' ? [] : '');
    }
    setForm(next);
    setShowForm(true);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this item? This cannot be undone.')) return;
    try {
      await api.delete(`${endpoint}/${id}`);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const updated = await api.put<any>(`${endpoint}/${editing.id}`, form);
        setRows((prev) => prev.map((r) => (r.id === editing.id ? updated : r)));
      } else {
        const created = await api.post<any>(endpoint, form);
        setRows((prev) => [created, ...prev]);
      }
      setShowForm(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-brand text-white px-3 py-2 text-sm font-medium"
        >
          <Plus size={16} /> Add
        </button>
      </div>

      {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500">Nothing here yet. Click "Add" to create the first one.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900 text-left">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="px-4 py-2 font-medium text-slate-500">{c.label}</th>
                ))}
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800">
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-2">
                      {c.render ? c.render(row) : String(row[c.key] ?? '—')}
                    </td>
                  ))}
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(row)} className="text-slate-400 hover:text-brand">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(row.id)} className="text-slate-400 hover:text-red-500">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-lg bg-white dark:bg-slate-950 rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{editing ? 'Edit' : 'Add'} {title.replace(/s$/, '')}</h2>
              <button type="button" onClick={() => setShowForm(false)}>
                <X size={18} />
              </button>
            </div>

            {fields.map((f) => (
              <div key={f.key}>
                <label className="text-sm text-slate-500">{f.label}</label>
                {f.type === 'textarea' ? (
                  <textarea
                    required={f.required}
                    value={form[f.key] ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    rows={3}
                    placeholder={f.placeholder}
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
                  />
                ) : f.type === 'select' ? (
                  <select
                    value={form[f.key] ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    required={f.required}
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
                  >
                    {!f.required && (f.optionsEndpoint || f.optionsPlaceholder) && (
                      <option value="">{f.optionsPlaceholder || `No ${f.label.toLowerCase()}`}</option>
                    )}
                    {(f.optionsEndpoint ? dynamicOptions[f.key] || [] : f.options || []).map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : f.type === 'checkbox' ? (
                  <div className="mt-1">
                    <input
                      type="checkbox"
                      checked={Boolean(form[f.key])}
                      onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.checked }))}
                    />
                  </div>
                ) : f.type === 'tags' ? (
                  <input
                    value={Array.isArray(form[f.key]) ? form[f.key].join(', ') : ''}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, [f.key]: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))
                    }
                    placeholder="Comma-separated"
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
                  />
                ) : (
                  <input
                    type={f.type}
                    required={f.required}
                    value={form[f.key] ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
                  />
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-brand text-white py-2 text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
