-- Расширение таблицы conferences для поддержки спикеров и дополнительной информации
-- Миграция: extend_conferences.sql

-- Дата окончания мероприятия (для многодневных событий)
ALTER TABLE conferences ADD COLUMN IF NOT EXISTS date_end TEXT;

-- Обложка мероприятия (base64)
ALTER TABLE conferences ADD COLUMN IF NOT EXISTS cover_image TEXT;

-- Спикеры мероприятия (JSONB массив)
-- Структура каждого спикера:
-- {
--   "id": "uuid",
--   "name": "ФИО спикера",
--   "photo": "data:image/jpeg;base64,...",
--   "credentials": "Регалии, звания, должность",
--   "report_title": "Название доклада",
--   "report_time": "10:00" // может быть null
-- }
ALTER TABLE conferences ADD COLUMN IF NOT EXISTS speakers JSONB DEFAULT '[]';

-- Контакты организаторов (JSONB объект)
-- Структура:
-- {
--   "name": "Имя контактного лица",
--   "phone": "+7...",
--   "email": "email@example.com",
--   "additional": "Дополнительная информация"
-- }
ALTER TABLE conferences ADD COLUMN IF NOT EXISTS organizer_contacts JSONB DEFAULT '{}';

-- Дополнительная информация (произвольный текст)
ALTER TABLE conferences ADD COLUMN IF NOT EXISTS additional_info TEXT;

-- Индекс для поиска по спикерам (если потребуется)
CREATE INDEX IF NOT EXISTS idx_conferences_speakers ON conferences USING GIN (speakers);
