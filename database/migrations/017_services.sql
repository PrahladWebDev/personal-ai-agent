CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_description TEXT,
  detailed_description TEXT,
  technologies TEXT[],
  experience_level TEXT CHECK (experience_level IN ('beginner','intermediate','advanced','expert')),
  availability TEXT CHECK (availability IN ('available','limited','unavailable')),
  service_url TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_services_visibility ON services(visibility);
