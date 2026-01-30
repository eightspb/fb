-- Create enum for form types
CREATE TYPE form_submission_type AS ENUM ('contact', 'cp', 'training', 'conference_registration');

-- Create table for form submissions
CREATE TABLE IF NOT EXISTS form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  form_type TEXT NOT NULL, -- using text instead of enum for flexibility if new forms are added
  status TEXT DEFAULT 'new', -- new, processed, archived
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT,
  institution TEXT,
  city TEXT,
  page_url TEXT, -- where the form was submitted from
  metadata JSONB DEFAULT '{}'::jsonb -- for any extra fields
);

-- Add indexes
CREATE INDEX idx_form_submissions_created_at ON form_submissions(created_at DESC);
CREATE INDEX idx_form_submissions_status ON form_submissions(status);
CREATE INDEX idx_form_submissions_type ON form_submissions(form_type);

-- Add RLS policies (Admin only)
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert" ON form_submissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow admin select" ON form_submissions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admin update" ON form_submissions
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow admin delete" ON form_submissions
  FOR DELETE TO authenticated USING (true);
