-- Singleton table (like `profile`): the admin's "About Me" section.
CREATE TABLE IF NOT EXISTS personal_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_introduction TEXT,
  detailed_biography TEXT,
  current_focus TEXT,
  interests TEXT,
  hobbies TEXT,
  languages TEXT[],
  personal_goals TEXT,
  professional_interests TEXT,
  other_information TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
