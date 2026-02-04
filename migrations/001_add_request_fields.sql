-- Миграция: Добавление новых полей для CRM функционала заявок
-- Дата: 2026-02-04

-- Добавляем поле updated_at
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Добавляем поле notes для заметок менеджера
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS notes TEXT;

-- Добавляем поле assigned_to для назначения ответственного
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS assigned_to TEXT;

-- Добавляем поле priority для приоритета
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';

-- Создаем функцию update_updated_at_column если её нет
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер для автообновления updated_at
DROP TRIGGER IF EXISTS update_form_submissions_updated_at ON form_submissions;
CREATE TRIGGER update_form_submissions_updated_at
  BEFORE UPDATE ON form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Добавляем индекс для приоритета
CREATE INDEX IF NOT EXISTS idx_form_submissions_priority ON form_submissions(priority);

-- Обновляем существующие записи - устанавливаем updated_at = created_at
UPDATE form_submissions SET updated_at = created_at WHERE updated_at IS NULL;
