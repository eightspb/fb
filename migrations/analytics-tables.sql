-- =====================================================
-- Таблицы для аналитики посещений сайта
-- Для обычного PostgreSQL (без Supabase)
-- =====================================================

-- Таблица активных сессий посетителей
CREATE TABLE IF NOT EXISTS visitor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL, -- UUID из cookie браузера
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

-- Индексы для visitor_sessions
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
  time_on_page INTEGER, -- секунды на странице (обновляется при уходе)
  
  -- UTM метки и источник
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  -- Устройство
  device_type TEXT, -- 'desktop', 'tablet', 'mobile'
  browser TEXT,
  os TEXT
);

-- Индексы для page_visits
CREATE INDEX IF NOT EXISTS idx_page_visits_visited_at ON page_visits(visited_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_visits_session_id ON page_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_page_path ON page_visits(page_path);
CREATE INDEX IF NOT EXISTS idx_page_visits_ip ON page_visits(ip_address);
CREATE INDEX IF NOT EXISTS idx_page_visits_country ON page_visits(country_code);

-- Кэш геолокации IP-адресов (чтобы не запрашивать ip-api.com повторно)
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

-- =====================================================
-- Функции для обслуживания (опционально)
-- =====================================================

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

-- =====================================================
-- Примечания:
-- 
-- 1. RLS (Row Level Security) не используется, так как все 
--    запросы идут от суперпользователя postgres
--
-- 2. Безопасность обеспечивается на уровне API:
--    - /api/analytics/track - публичный (для трекинга)
--    - /api/admin/analytics/* - требует JWT авторизации
--
-- 3. Для автоматической очистки можно настроить pg_cron:
--    SELECT cron.schedule('cleanup-sessions', '0 * * * *', 'SELECT cleanup_old_sessions()');
--    SELECT cron.schedule('cleanup-geo-cache', '0 0 * * 0', 'SELECT cleanup_old_geo_cache()');
-- =====================================================
