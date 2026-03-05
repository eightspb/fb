-- Migration 014: Add contacts table
-- Separate CRM contacts table (distinct from form_submissions/requests)
-- Supports tags, speciality, import metadata

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  full_name TEXT NOT NULL,
  email     TEXT,
  phone     TEXT,

  -- Location & work
  city        TEXT,
  institution TEXT, -- clinic / hospital name
  speciality  TEXT, -- medical specialty

  -- Tagging & CRM
  tags   TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'archived'
    CHECK (status IN ('new', 'in_progress', 'processed', 'archived')),
  notes  TEXT,

  -- Import metadata
  import_source     TEXT DEFAULT 'tilda', -- 'tilda', 'form', 'manual'
  source_urls       TEXT[] DEFAULT '{}',  -- original landing page URLs
  tilda_request_ids TEXT[] DEFAULT '{}',  -- Tilda platform request IDs

  -- Extra
  metadata   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contacts_full_name  ON contacts(full_name);
CREATE INDEX IF NOT EXISTS idx_contacts_email      ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_phone      ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_tags       ON contacts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_contacts_status     ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_city       ON contacts(city);
CREATE INDEX IF NOT EXISTS idx_contacts_speciality ON contacts(speciality);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for postgres on contacts" ON contacts;
CREATE POLICY "Allow all for postgres on contacts" ON contacts
  FOR ALL TO postgres USING (true) WITH CHECK (true);

COMMENT ON TABLE contacts IS 'CRM contacts: doctors and medical professionals imported from Tilda and web forms';
COMMENT ON COLUMN contacts.tags IS 'Free-form tags for segmentation, e.g. tilda-import, conf-2024, mammalogist';
COMMENT ON COLUMN contacts.import_source IS 'Origin of the record: tilda | form | manual';
COMMENT ON COLUMN contacts.source_urls IS 'Landing page URLs the contact came from';
COMMENT ON COLUMN contacts.tilda_request_ids IS 'Tilda platform request IDs (may be multiple if same person submitted multiple times)';
