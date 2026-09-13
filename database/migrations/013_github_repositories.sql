CREATE TABLE IF NOT EXISTS github_repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id BIGINT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  description TEXT,
  readme TEXT,
  languages JSONB DEFAULT '{}',
  topics TEXT[],
  url TEXT NOT NULL,
  homepage TEXT,
  stars INT DEFAULT 0,
  forks INT DEFAULT 0,
  is_included BOOLEAN NOT NULL DEFAULT false,
  linked_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  repo_created_at TIMESTAMPTZ,
  repo_updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
