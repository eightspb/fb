-- Migration 015: Link form_submissions to contacts
-- Adds contact_id FK so each form submission references a CRM contact

ALTER TABLE form_submissions
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_form_submissions_contact_id ON form_submissions(contact_id);

COMMENT ON COLUMN form_submissions.contact_id IS 'Reference to CRM contact. Populated on form submission via upsert by email.';
