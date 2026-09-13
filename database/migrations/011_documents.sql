CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf','docx','txt','md')),
  file_path TEXT NOT NULL,
  category TEXT CHECK (category IN ('resume','cv','project_doc','technical_doc','certificate','note','other')),
  status TEXT NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading','processing','embedding','ready','failed')),
  error_message TEXT,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public','private')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
