-- =====================================================
-- Миграция: Добавление недостающих колонок в таблицу conferences
-- Дата: 2026-02-04
-- =====================================================

-- Добавляем колонку date_end (дата окончания конференции)
ALTER TABLE conferences ADD COLUMN IF NOT EXISTS date_end TEXT;

-- Добавляем колонку cover_image (обложка конференции)
ALTER TABLE conferences ADD COLUMN IF NOT EXISTS cover_image TEXT;

-- Добавляем колонку speakers (массив спикеров в формате JSON)
ALTER TABLE conferences ADD COLUMN IF NOT EXISTS speakers JSONB DEFAULT '[]'::jsonb;

-- Добавляем колонку organizer_contacts (контакты организатора в формате JSON)
ALTER TABLE conferences ADD COLUMN IF NOT EXISTS organizer_contacts JSONB DEFAULT '{}'::jsonb;

-- Добавляем колонку additional_info (дополнительная информация)
ALTER TABLE conferences ADD COLUMN IF NOT EXISTS additional_info TEXT;

-- Создаем индекс для date_end
CREATE INDEX IF NOT EXISTS idx_conferences_date_end ON conferences(date_end);

-- Комментарии к новым колонкам
COMMENT ON COLUMN conferences.date_end IS 'Дата окончания конференции в формате YYYY-MM-DD';
COMMENT ON COLUMN conferences.cover_image IS 'URL или base64 обложки конференции';
COMMENT ON COLUMN conferences.speakers IS 'Массив спикеров с информацией: имя, фото, должность, доклад, время';
COMMENT ON COLUMN conferences.organizer_contacts IS 'Контактная информация организатора: имя, телефон, email';
COMMENT ON COLUMN conferences.additional_info IS 'Дополнительная информация о конференции';
