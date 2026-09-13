CREATE TABLE IF NOT EXISTS profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  short_bio TEXT NOT NULL DEFAULT '',
  long_bio TEXT NOT NULL DEFAULT '',
  location TEXT,
  location_visibility TEXT NOT NULL DEFAULT 'private' CHECK (location_visibility IN ('public','private')),
  email TEXT,
  email_visibility TEXT NOT NULL DEFAULT 'private' CHECK (email_visibility IN ('public','private')),
  current_focus TEXT,
  professional_interests TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
