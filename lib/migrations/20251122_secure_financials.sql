-- Create project_financials table for sensitive data
CREATE TABLE IF NOT EXISTS project_financials (
  project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE PRIMARY KEY,
  bank_details JSONB,
  budget NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE project_financials ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Admins and Managers can view financials
CREATE POLICY "Admins and Managers can view financials" ON project_financials
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- 2. Admins and Managers can insert/update financials
CREATE POLICY "Admins and Managers can manage financials" ON project_financials
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Migrate existing data
-- We handle both stringified JSON (from projects.bank_details) and regular JSON
INSERT INTO project_financials (project_id, bank_details, budget)
SELECT 
  project_id, 
  CASE 
    WHEN bank_details IS NULL THEN NULL
    -- If it's already a valid JSON string, cast it to JSONB
    ELSE bank_details::jsonb 
  END,
  budget
FROM projects
WHERE bank_details IS NOT NULL OR budget IS NOT NULL
ON CONFLICT (project_id) DO UPDATE SET
  bank_details = EXCLUDED.bank_details,
  budget = EXCLUDED.budget;

-- Drop columns from projects table to remove sensitive data exposure
ALTER TABLE projects DROP COLUMN IF EXISTS bank_details;
-- We might want to keep budget in projects for general visibility, or move it entirely. 
-- Usually budget is sensitive, but sometimes team members need to know it.
-- For now, let's KEEP budget in projects as a "visible budget" and financials as "secure details".
-- The user specifically mentioned bank_details being the issue.
-- So we will NOT drop budget from projects, but we WILL drop bank_details.

