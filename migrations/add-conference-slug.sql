-- Миграция: Добавление колонки slug для конференций
-- Дата: 2026-02-04
-- Описание: Добавляет поле slug для человекочитаемых URL конференций

-- 1. Добавляем колонку slug (nullable для существующих записей)
ALTER TABLE conferences 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Создаем уникальный индекс для slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_conferences_slug 
ON conferences(slug) 
WHERE slug IS NOT NULL;

-- 3. Создаем индекс для быстрого поиска по slug
CREATE INDEX IF NOT EXISTS idx_conferences_slug_search 
ON conferences(slug);

-- 4. Генерируем slug для существующих конференций, у которых его нет
-- Используем функцию для транслитерации (если есть) или просто id
-- Примечание: для полной транслитерации лучше запустить скрипт из Node.js

-- Временная простая генерация slug из id для существующих записей
UPDATE conferences 
SET slug = 'conference-' || LEFT(id::text, 8)
WHERE slug IS NULL;

-- 5. Теперь делаем колонку NOT NULL (после заполнения всех записей)
-- ALTER TABLE conferences ALTER COLUMN slug SET NOT NULL;

-- Комментарий: После миграции рекомендуется:
-- 1. Обновить slug для существующих конференций через админ-панель
-- 2. Или запустить скрипт генерации slug из названий
