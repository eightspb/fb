-- Миграция: Добавление поля image_focal_point для настройки позиционирования изображений
-- Дата: 2026-02-04

-- Добавляем колонку для хранения точки фокуса изображения
-- Значения: 'top', 'center', 'bottom', 'center 20%', 'center 30%', 'center 40%' и т.д.
-- По умолчанию 'center 30%' - оптимально для фотографий с людьми
ALTER TABLE news ADD COLUMN IF NOT EXISTS image_focal_point VARCHAR(50) DEFAULT 'center 30%';

-- Комментарий для документации
COMMENT ON COLUMN news.image_focal_point IS 'CSS object-position для главного изображения карточки. Примеры: top, center, bottom, center 30%';
