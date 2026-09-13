CREATE TABLE IF NOT EXISTS skill_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_order INT NOT NULL DEFAULT 0
);

INSERT INTO skill_categories (name, display_order) VALUES
  ('Programming Languages', 1),
  ('Frontend', 2),
  ('Backend', 3),
  ('Mobile', 4),
  ('Database', 5),
  ('DevOps', 6),
  ('Cloud', 7),
  ('Tools', 8),
  ('Other', 9)
ON CONFLICT (name) DO NOTHING;
