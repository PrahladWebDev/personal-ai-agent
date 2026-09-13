-- Singleton table: admin-configurable behavior settings for the AI agent.
-- These control TONE and BEHAVIOR only - they are layered into the system
-- prompt but can never override the factual/safety rules that are always
-- prepended in code (see rag/promptBuilder.ts). This is enforced in code,
-- not just by convention: custom_instructions is appended as a clearly
-- separated, lower-priority block that the base rules explicitly outrank.
CREATE TABLE IF NOT EXISTS ai_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_introduction TEXT,
  response_style TEXT CHECK (response_style IN ('concise','detailed','friendly','formal','technical')) DEFAULT 'concise',
  fallback_response TEXT,
  include_github_links BOOLEAN NOT NULL DEFAULT true,
  include_project_links BOOLEAN NOT NULL DEFAULT true,
  include_contact_info BOOLEAN NOT NULL DEFAULT true,
  custom_instructions TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
