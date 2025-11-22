-- Create submission_financials table for sensitive data
CREATE TABLE IF NOT EXISTS submission_financials (
  submission_id UUID REFERENCES submissions(submission_id) ON DELETE CASCADE PRIMARY KEY,
  bank_details JSONB,
  budget NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE submission_financials ENABLE ROW LEVEL SECURITY;

-- Policies for submission_financials
-- 1. Admins and Managers can view financials
CREATE POLICY "Admins and Managers can view submission financials" ON submission_financials
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- 2. Admins and Managers can manage financials (update/delete)
CREATE POLICY "Admins and Managers can manage submission financials" ON submission_financials
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- 3. The user who created the submission should be able to view their own financials (if they submitted it)
-- But since submissions table stores client_id, we can use that.
-- However, submission_financials doesn't have client_id. We need a join policy or duplicate client_id?
-- RLS join performance can be tricky. 
-- Let's rely on the fact that usually ONLY admins need to see these details after submission.
-- Clients typically don't edit submissions after sending, or they view the *project* later.
-- If clients need to see it, we'd add:
CREATE POLICY "Clients can view own submission financials" ON submission_financials
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM submissions
      WHERE submissions.submission_id = submission_financials.submission_id
      AND submissions.client_id = auth.uid()
    )
  );

-- 4. Clients need to INSERT their financials when creating submission
-- But they insert into 'submissions' first, then 'submission_financials'.
-- They need INSERT permission.
CREATE POLICY "Clients can insert submission financials" ON submission_financials
  FOR INSERT
  WITH CHECK (
    -- Allow insert if they are the owner of the parent submission
    EXISTS (
      SELECT 1 FROM submissions
      WHERE submissions.submission_id = submission_financials.submission_id
      AND submissions.client_id = auth.uid()
    )
    -- OR if they are creating a new submission (tricky to check on insert before commit)
    -- Simpler: Allow authenticated users to insert, but we rely on application logic to link correctly?
    -- Better: use the check above, as we insert submission first.
  );


-- Migrate existing data
INSERT INTO submission_financials (submission_id, bank_details, budget)
SELECT 
  submission_id, 
  bank_details,
  budget
FROM submissions
WHERE bank_details IS NOT NULL OR budget IS NOT NULL
ON CONFLICT (submission_id) DO UPDATE SET
  bank_details = EXCLUDED.bank_details,
  budget = EXCLUDED.budget;

-- Drop columns from submissions table
ALTER TABLE submissions DROP COLUMN IF EXISTS bank_details;
-- We keep budget in submissions table? Similar to projects, user might want it visible.
-- Let's move it to be consistent. But if the RPC `get_pending_submissions` relies on it...
-- We need to update the RPC `get_pending_submissions` as well.

-- Update RPC function `get_pending_submissions` to NOT return bank details or Join if needed (for admins)
CREATE OR REPLACE FUNCTION get_pending_submissions()
RETURNS TABLE (
  submission_id UUID,
  client_id UUID,
  client_name TEXT,
  project_type TEXT,
  status TEXT,
  priority TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  budget NUMERIC -- Optional: return budget if needed for list view, but sourced from financials or kept?
  -- We will just return basic info.
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Check permissions: Only admin/manager
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'manager')
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    s.submission_id,
    s.client_id,
    s.client_name,
    s.project_type,
    s.status,
    s.priority,
    s.description,
    s.created_at,
    sf.budget
  FROM submissions s
  LEFT JOIN submission_financials sf ON s.submission_id = sf.submission_id
  WHERE s.status = 'received'
  ORDER BY s.created_at DESC;
END;
$$;

