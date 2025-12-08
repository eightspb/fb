-- Таблица для отслеживания просмотров новостей
-- Отслеживаем только уникальных посетителей (по IP + user-agent fingerprint)

CREATE TABLE IF NOT EXISTS news_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id TEXT NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  visitor_fingerprint TEXT NOT NULL, -- Хеш от IP + User-Agent для уникальности
  ip_address INET, -- Опционально для аналитики
  user_agent TEXT, -- Опционально для аналитики
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Добавляем колонку для даты без времени для уникальности
  viewed_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Создаем уникальный индекс по комбинации (news_id, visitor_fingerprint, viewed_date)
-- Это обеспечит, что один посетитель может просмотреть новость только один раз в день
CREATE UNIQUE INDEX IF NOT EXISTS idx_news_views_unique_daily 
ON news_views(news_id, visitor_fingerprint, viewed_date);

-- Таблица для агрегированной статистики просмотров (оптимизация)
CREATE TABLE IF NOT EXISTS news_view_stats (
  news_id TEXT PRIMARY KEY REFERENCES news(id) ON DELETE CASCADE,
  total_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_news_views_news_id ON news_views(news_id);
CREATE INDEX IF NOT EXISTS idx_news_views_viewed_at ON news_views(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_views_visitor_fingerprint ON news_views(visitor_fingerprint);

-- Функция для обновления статистики просмотров
CREATE OR REPLACE FUNCTION update_news_view_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO news_view_stats (news_id, total_views, unique_visitors, last_viewed_at, updated_at)
  VALUES (
    NEW.news_id,
    1,
    1,
    NEW.viewed_at,
    NOW()
  )
  ON CONFLICT (news_id) DO UPDATE SET
    total_views = news_view_stats.total_views + 1,
    unique_visitors = (
      SELECT COUNT(DISTINCT visitor_fingerprint)
      FROM news_views
      WHERE news_id = NEW.news_id
    ),
    last_viewed_at = GREATEST(news_view_stats.last_viewed_at, NEW.viewed_at),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления статистики
DROP TRIGGER IF EXISTS trigger_update_view_stats ON news_views;
CREATE TRIGGER trigger_update_view_stats
  AFTER INSERT ON news_views
  FOR EACH ROW
  EXECUTE FUNCTION update_news_view_stats();

-- Row Level Security
ALTER TABLE news_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_view_stats ENABLE ROW LEVEL SECURITY;

-- Политики: все могут читать статистику, все могут создавать просмотры
DROP POLICY IF EXISTS "Anyone can read news_views" ON news_views;
CREATE POLICY "Anyone can read news_views" ON news_views
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert news_views" ON news_views;
CREATE POLICY "Anyone can insert news_views" ON news_views
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read news_view_stats" ON news_view_stats;
CREATE POLICY "Anyone can read news_view_stats" ON news_view_stats
  FOR SELECT USING (true);

-- Функция для получения статистики просмотров
CREATE OR REPLACE FUNCTION get_news_view_count(news_id_param TEXT)
RETURNS INTEGER AS $$
DECLARE
  view_count INTEGER;
BEGIN
  SELECT COALESCE(unique_visitors, 0) INTO view_count
  FROM news_view_stats
  WHERE news_id = news_id_param;
  
  RETURN COALESCE(view_count, 0);
END;
$$ LANGUAGE plpgsql;

