-- Миграция: Добавление таблицы для информационного баннера
-- Дата: 2026-02-19

-- Создание таблицы site_banner (singleton - только одна запись)
CREATE TABLE IF NOT EXISTS site_banner (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN DEFAULT false,
  message TEXT NOT NULL DEFAULT '',
  style TEXT DEFAULT 'static' CHECK (style IN ('static', 'marquee')),
  bg_color TEXT DEFAULT '#3b82f6',
  text_color TEXT DEFAULT '#ffffff',
  font_size TEXT DEFAULT '14px',
  font_weight TEXT DEFAULT 'normal' CHECK (font_weight IN ('normal', 'medium', 'bold')),
  dismissible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_site_banner_updated_at ON site_banner;
CREATE TRIGGER update_site_banner_updated_at
  BEFORE UPDATE ON site_banner
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Вставка начальной записи (singleton pattern)
INSERT INTO site_banner (
  enabled,
  message,
  style,
  bg_color,
  text_color,
  font_size,
  font_weight,
  dismissible
) VALUES (
  false,
  'Добро пожаловать на наш сайт!',
  'static',
  '#3b82f6',
  '#ffffff',
  '14px',
  'normal',
  true
)
ON CONFLICT (id) DO NOTHING;

-- RLS политики (публичное чтение, админ может изменять)
ALTER TABLE site_banner ENABLE ROW LEVEL SECURITY;

-- Разрешаем всем читать баннер
DROP POLICY IF EXISTS "Anyone can read site_banner" ON site_banner;
CREATE POLICY "Anyone can read site_banner" ON site_banner
  FOR SELECT USING (true);

-- Разрешаем всё для пользователя postgres (используется в API)
DROP POLICY IF EXISTS "Allow all for postgres on site_banner" ON site_banner;
CREATE POLICY "Allow all for postgres on site_banner" ON site_banner
  FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Индекс для быстрого поиска активного баннера
CREATE INDEX IF NOT EXISTS idx_site_banner_enabled ON site_banner(enabled) WHERE enabled = true;

-- Комментарии для документации
COMMENT ON TABLE site_banner IS 'Информационный баннер для отображения в верхней части сайта (singleton)';
COMMENT ON COLUMN site_banner.enabled IS 'Включен/выключен баннер';
COMMENT ON COLUMN site_banner.message IS 'Текст сообщения для отображения';
COMMENT ON COLUMN site_banner.style IS 'Стиль отображения: static (статичный) или marquee (бегущая строка)';
COMMENT ON COLUMN site_banner.bg_color IS 'Цвет фона в формате HEX (#rrggbb)';
COMMENT ON COLUMN site_banner.text_color IS 'Цвет текста в формате HEX (#rrggbb)';
COMMENT ON COLUMN site_banner.font_size IS 'Размер шрифта (например: 14px, 16px)';
COMMENT ON COLUMN site_banner.font_weight IS 'Толщина шрифта: normal, medium, bold';
COMMENT ON COLUMN site_banner.dismissible IS 'Можно ли закрыть баннер пользователю';
