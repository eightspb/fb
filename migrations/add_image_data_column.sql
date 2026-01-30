-- Добавляем колонки для хранения бинарных данных изображений
ALTER TABLE news_images ADD COLUMN IF NOT EXISTS image_data BYTEA;
ALTER TABLE news_images ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- Индекс не нужен для bytea, но может пригодиться для mime_type если будем фильтровать, но пока не надо.

