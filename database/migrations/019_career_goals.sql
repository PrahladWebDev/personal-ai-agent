-- Singleton table (like `profile`): career-direction info for the AI to answer with.
CREATE TABLE IF NOT EXISTS career_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_goal TEXT,
  target_roles TEXT[],
  currently_learning TEXT[],
  future_goals TEXT,
  preferred_work_type TEXT,
  preferred_project_types TEXT,
  professional_interests TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
