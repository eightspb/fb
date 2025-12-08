-- Исправление: создание недостающих таблиц
-- Этот скрипт создаст таблицы, которые отсутствуют в базе данных

-- Таблица изображений новостей
CREATE TABLE IF NOT EXISTS news_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id TEXT NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица видео новостей
CREATE TABLE IF NOT EXISTS news_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id TEXT NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица документов новостей
CREATE TABLE IF NOT EXISTS news_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  news_id TEXT NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  document_url TEXT NOT NULL,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для недостающих таблиц
CREATE INDEX IF NOT EXISTS idx_news_images_news_id ON news_images(news_id);
CREATE INDEX IF NOT EXISTS idx_news_videos_news_id ON news_videos(news_id);
CREATE INDEX IF NOT EXISTS idx_news_documents_news_id ON news_documents(news_id);

-- Включение RLS для недостающих таблиц
ALTER TABLE news_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_documents ENABLE ROW LEVEL SECURITY;

-- Политики RLS для недостающих таблиц
DROP POLICY IF EXISTS "Anyone can read news_images" ON news_images;
CREATE POLICY "Anyone can read news_images" ON news_images
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can read news_videos" ON news_videos;
CREATE POLICY "Anyone can read news_videos" ON news_videos
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can read news_documents" ON news_documents;
CREATE POLICY "Anyone can read news_documents" ON news_documents
  FOR SELECT USING (true);


