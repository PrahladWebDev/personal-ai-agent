'use client';

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Settings</h1>
      <div className="space-y-4 max-w-xl text-sm">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <h2 className="font-medium mb-2">AI Configuration</h2>
          <p className="text-slate-500">
            The AI model and API key are configured via environment variables (<code>GROQ_MODEL</code>,{' '}
            <code>GROQ_API_KEY</code>) on the server, not from this dashboard, so credentials are never exposed
            to the browser. Edit <code>.env</code> on the VPS and restart the backend container to change them.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <h2 className="font-medium mb-2">Backups</h2>
          <p className="text-slate-500">
            Run <code>./scripts/backup-db.sh</code> on the VPS to create a compressed PostgreSQL dump under{' '}
            <code>./backups</code>. See the project README for the restore command.
          </p>
        </div>
      </div>
    </div>
  );
}
