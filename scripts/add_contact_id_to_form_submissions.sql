-- Миграция: добавление contact_id в form_submissions
-- Причина: API маршруты /api/conferences/register, /api/request-cp, /api/contact
-- вставляют contact_id, но колонки не существовало в схеме БД

ALTER TABLE form_submissions
  ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_form_submissions_contact_id ON form_submissions(contact_id);
