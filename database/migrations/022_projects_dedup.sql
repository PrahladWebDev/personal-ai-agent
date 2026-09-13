-- Support de-duplicating a manually-created project against a synced
-- GitHub repository by URL, in addition to the existing explicit
-- github_repo_id / linked_project_id link columns.
CREATE INDEX IF NOT EXISTS idx_projects_github_url ON projects(github_url) WHERE github_url IS NOT NULL;
