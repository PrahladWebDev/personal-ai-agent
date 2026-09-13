CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  short_description TEXT,
  detailed_description TEXT,
  problem TEXT,
  solution TEXT,
  architecture TEXT,
  contribution TEXT,
  challenges TEXT,
  challenge_solutions TEXT,
  github_url TEXT,
  live_url TEXT,
  documentation_url TEXT,
  screenshots TEXT[],
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_progress','completed','archived')),
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public','private')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','github')),
  github_repo_id UUID,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_projects_visibility ON projects(visibility);

CREATE TABLE IF NOT EXISTS project_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS project_technologies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  technology TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_project_tech_project ON project_technologies(project_id);
