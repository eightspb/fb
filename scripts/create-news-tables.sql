-- Создание таблиц для новостей

-- 1. Основная таблица новостей
CREATE TABLE IF NOT EXISTS news (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  short_description TEXT NOT NULL,
  full_description TEXT NOT NULL,
  date TEXT NOT NULL,
  year TEXT NOT NULL,
  category TEXT,
  location TEXT,
  author TEXT,
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Таблица изображений новостей
CREATE TABLE IF NOT EXISTS news_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id TEXT NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Таблица тегов новостей
CREATE TABLE IF NOT EXISTS news_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id TEXT NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Таблица видео новостей
CREATE TABLE IF NOT EXISTS news_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id TEXT NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Таблица документов новостей
CREATE TABLE IF NOT EXISTS news_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id TEXT NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  document_url TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_news_date ON news(date);
CREATE INDEX IF NOT EXISTS idx_news_year ON news(year);
CREATE INDEX IF NOT EXISTS idx_news_category ON news(category);
CREATE INDEX IF NOT EXISTS idx_news_status ON news(status);
CREATE INDEX IF NOT EXISTS idx_news_images_news_id ON news_images(news_id);
CREATE INDEX IF NOT EXISTS idx_news_tags_news_id ON news_tags(news_id);
CREATE INDEX IF NOT EXISTS idx_news_videos_news_id ON news_videos(news_id);
CREATE INDEX IF NOT EXISTS idx_news_documents_news_id ON news_documents(news_id);

-- Функция для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_news_updated_at ON news;
CREATE TRIGGER update_news_updated_at
  BEFORE UPDATE ON news
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS политики
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_documents ENABLE ROW LEVEL SECURITY;

-- Публичное чтение для всех
DROP POLICY IF EXISTS "Anyone can read news" ON news;
CREATE POLICY "Anyone can read news" ON news
  FOR SELECT USING (status = 'published' OR status IS NULL);

DROP POLICY IF EXISTS "Anyone can read news_images" ON news_images;
CREATE POLICY "Anyone can read news_images" ON news_images
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can read news_tags" ON news_tags;
CREATE POLICY "Anyone can read news_tags" ON news_tags
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can read news_videos" ON news_videos;
CREATE POLICY "Anyone can read news_videos" ON news_videos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can read news_documents" ON news_documents;
CREATE POLICY "Anyone can read news_documents" ON news_documents
  FOR SELECT USING (true);

-- Политики для аутентифицированных пользователей
DROP POLICY IF EXISTS "Authenticated users can insert news" ON news;
CREATE POLICY "Authenticated users can insert news" ON news
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update news" ON news;
CREATE POLICY "Authenticated users can update news" ON news
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete news" ON news;
CREATE POLICY "Authenticated users can delete news" ON news
  FOR DELETE USING (auth.role() = 'authenticated');

-- Политики для изображений
DROP POLICY IF EXISTS "Authenticated users can insert news_images" ON news_images;
CREATE POLICY "Authenticated users can insert news_images" ON news_images
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update news_images" ON news_images;
CREATE POLICY "Authenticated users can update news_images" ON news_images
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete news_images" ON news_images;
CREATE POLICY "Authenticated users can delete news_images" ON news_images
  FOR DELETE USING (auth.role() = 'authenticated');

-- Политики для тегов
DROP POLICY IF EXISTS "Authenticated users can insert news_tags" ON news_tags;
CREATE POLICY "Authenticated users can insert news_tags" ON news_tags
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update news_tags" ON news_tags;
CREATE POLICY "Authenticated users can update news_tags" ON news_tags
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete news_tags" ON news_tags;
CREATE POLICY "Authenticated users can delete news_tags" ON news_tags
  FOR DELETE USING (auth.role() = 'authenticated');

-- Политики для видео
DROP POLICY IF EXISTS "Authenticated users can insert news_videos" ON news_videos;
CREATE POLICY "Authenticated users can insert news_videos" ON news_videos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update news_videos" ON news_videos;
CREATE POLICY "Authenticated users can update news_videos" ON news_videos
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete news_videos" ON news_videos;
CREATE POLICY "Authenticated users can delete news_videos" ON news_videos
  FOR DELETE USING (auth.role() = 'authenticated');

-- Политики для документов
DROP POLICY IF EXISTS "Authenticated users can insert news_documents" ON news_documents;
CREATE POLICY "Authenticated users can insert news_documents" ON news_documents
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update news_documents" ON news_documents;
CREATE POLICY "Authenticated users can update news_documents" ON news_documents
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete news_documents" ON news_documents;
CREATE POLICY "Authenticated users can delete news_documents" ON news_documents
  FOR DELETE USING (auth.role() = 'authenticated');

