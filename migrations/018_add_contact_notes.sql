-- Migration 018: Add contact_notes table for multiple notes per contact
-- Replaces single TEXT notes column on contacts with a separate table

CREATE TABLE IF NOT EXISTS contact_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  title VARCHAR(255),
  content TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'ai_research', 'ai_deep_research', 'import')),
  pinned BOOLEAN DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_notes_contact_id ON contact_notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_notes_created_at ON contact_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_notes_source ON contact_notes(source);
CREATE INDEX IF NOT EXISTS idx_contact_notes_pinned ON contact_notes(pinned) WHERE pinned = true;

-- Auto-update updated_at
DROP TRIGGER IF EXISTS update_contact_notes_updated_at ON contact_notes;
CREATE TRIGGER update_contact_notes_updated_at
  BEFORE UPDATE ON contact_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE contact_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for postgres on contact_notes" ON contact_notes;
CREATE POLICY "Allow all for postgres on contact_notes" ON contact_notes
  FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Migrate existing notes from contacts.notes into contact_notes
-- Only migrate non-empty notes
INSERT INTO contact_notes (contact_id, content, source, created_at, updated_at)
SELECT id, notes, 'import', created_at, updated_at
FROM contacts
WHERE notes IS NOT NULL AND TRIM(notes) <> '';

COMMENT ON TABLE contact_notes IS 'Multiple notes per contact: manual, AI research, deep research, imported';
COMMENT ON COLUMN contact_notes.source IS 'Origin: manual | ai_research | ai_deep_research | import';
COMMENT ON COLUMN contact_notes.metadata IS 'Extra data, e.g. AI model used, research JSON for deep research';
