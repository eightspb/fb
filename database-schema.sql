-- Таблица заявок с форм (form_submissions)
CREATE TABLE IF NOT EXISTS form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  form_type TEXT NOT NULL, -- 'contact', 'cp', 'training', 'conference_registration'
  status TEXT DEFAULT 'new', -- new, processed, archived
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT,
  institution TEXT,
  city TEXT,
  page_url TEXT, -- where the form was submitted from
  metadata JSONB DEFAULT '{}'::jsonb -- for any extra fields
);

-- Индексы для form_submissions
CREATE INDEX IF NOT EXISTS idx_form_submissions_created_at ON form_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_status ON form_submissions(status);
CREATE INDEX IF NOT EXISTS idx_form_submissions_type ON form_submissions(form_type);

-- RLS для form_submissions (разрешаем INSERT для всех, SELECT/UPDATE/DELETE только для postgres)
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

-- Разрешаем публичную вставку (для форм на сайте)
DROP POLICY IF EXISTS "Allow public insert on form_submissions" ON form_submissions;
CREATE POLICY "Allow public insert on form_submissions" ON form_submissions
  FOR INSERT WITH CHECK (true);

-- Разрешаем всё для пользователя postgres (используется в API)
DROP POLICY IF EXISTS "Allow all for postgres" ON form_submissions;
CREATE POLICY "Allow all for postgres" ON form_submissions
  FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Таблица конференций
CREATE TABLE IF NOT EXISTS conferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE, -- URL-friendly идентификатор (например, 'sms-2026')
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  date_end TEXT, -- Дата окончания конференции
  description TEXT,
  type TEXT NOT NULL, -- 'Конференция', 'Мастер-класс', 'Выставка'
  location TEXT,
  speaker TEXT, -- Legacy field
  cme_hours INTEGER,
  program JSONB DEFAULT '[]', -- Array of strings
  materials JSONB DEFAULT '[]', -- Array of 'video', 'photo', 'doc'
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  cover_image TEXT, -- URL или base64 обложки
  speakers JSONB DEFAULT '[]', -- Массив спикеров с детальной информацией
  organizer_contacts JSONB DEFAULT '{}', -- Контакты организатора
  additional_info TEXT, -- Дополнительная информация
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для сортировки и поиска
CREATE INDEX IF NOT EXISTS idx_conferences_date ON conferences(date);
CREATE INDEX IF NOT EXISTS idx_conferences_date_end ON conferences(date_end);
CREATE INDEX IF NOT EXISTS idx_conferences_slug ON conferences(slug);

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_conferences_updated_at ON conferences;
CREATE TRIGGER update_conferences_updated_at
  BEFORE UPDATE ON conferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS для конференций
ALTER TABLE conferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read conferences" ON conferences;
CREATE POLICY "Anyone can read conferences" ON conferences
  FOR SELECT USING (true);

-- Политики для записи для аутентифицированных пользователей
CREATE POLICY "Authenticated users can insert conferences" ON conferences
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update conferences" ON conferences
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete conferences" ON conferences
  FOR DELETE USING (auth.role() = 'authenticated');

-- Также добавим политики для новостей, так как теперь у нас есть админ панель
CREATE POLICY "Authenticated users can insert news" ON news
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update news" ON news
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete news" ON news
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert news_images" ON news_images
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update news_images" ON news_images
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete news_images" ON news_images
  FOR DELETE USING (auth.role() = 'authenticated');

-- Индексы для новостей и связанных таблиц
CREATE INDEX IF NOT EXISTS idx_news_year ON news(year);
CREATE INDEX IF NOT EXISTS idx_news_status ON news(status);
CREATE INDEX IF NOT EXISTS idx_news_category ON news(category);
CREATE INDEX IF NOT EXISTS idx_news_date ON news(date);

CREATE INDEX IF NOT EXISTS idx_news_tags_news_id ON news_tags(news_id);
CREATE INDEX IF NOT EXISTS idx_news_images_news_id ON news_images(news_id);
CREATE INDEX IF NOT EXISTS idx_news_videos_news_id ON news_videos(news_id);
CREATE INDEX IF NOT EXISTS idx_news_documents_news_id ON news_documents(news_id);

-- Дополнительные поля для новостей
-- Точка фокуса изображения для карточек (CSS object-position)
ALTER TABLE news ADD COLUMN IF NOT EXISTS image_focal_point VARCHAR(50) DEFAULT 'center 30%';

-- =====================================================
-- Таблицы для аналитики посещений сайта
-- =====================================================

-- Таблица активных сессий посетителей
CREATE TABLE IF NOT EXISTS visitor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  
  -- Геолокация (из ip-api.com)
  country TEXT,
  country_code TEXT,
  region TEXT,
  city TEXT,
  
  -- Текущее состояние
  current_page TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  
  -- Статистика сессии
  page_views_count INTEGER DEFAULT 1,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Дополнительные данные
  screen_width INTEGER,
  screen_height INTEGER,
  language TEXT,
  timezone TEXT
);

CREATE INDEX IF NOT EXISTS idx_visitor_sessions_last_activity ON visitor_sessions(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_session_id ON visitor_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_ip ON visitor_sessions(ip_address);

-- Таблица истории всех посещений страниц
CREATE TABLE IF NOT EXISTS page_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  
  -- Геолокация
  country TEXT,
  country_code TEXT,
  region TEXT,
  city TEXT,
  
  -- Информация о странице
  page_path TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  
  -- Временные метки
  visited_at TIMESTAMPTZ DEFAULT NOW(),
  time_on_page INTEGER,
  
  -- UTM метки и источник
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  -- Устройство
  device_type TEXT,
  browser TEXT,
  os TEXT
);

CREATE INDEX IF NOT EXISTS idx_page_visits_visited_at ON page_visits(visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_visits_session_id ON page_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_page_path ON page_visits(page_path);
CREATE INDEX IF NOT EXISTS idx_page_visits_ip ON page_visits(ip_address);
CREATE INDEX IF NOT EXISTS idx_page_visits_country ON page_visits(country_code);

-- Кэш геолокации IP-адресов
CREATE TABLE IF NOT EXISTS ip_geolocation_cache (
  ip_address TEXT PRIMARY KEY,
  country TEXT,
  country_code TEXT,
  region TEXT,
  city TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  isp TEXT,
  cached_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_cache_cached_at ON ip_geolocation_cache(cached_at);

-- Функция для очистки старых сессий (старше 24 часов)
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM visitor_sessions WHERE last_activity_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Функция для очистки старого кэша геолокации (старше 30 дней)
CREATE OR REPLACE FUNCTION cleanup_old_geo_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM ip_geolocation_cache WHERE cached_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
