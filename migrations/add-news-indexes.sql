-- Indexes for news and related tables
CREATE INDEX IF NOT EXISTS idx_news_year ON news(year);
CREATE INDEX IF NOT EXISTS idx_news_status ON news(status);
CREATE INDEX IF NOT EXISTS idx_news_category ON news(category);
CREATE INDEX IF NOT EXISTS idx_news_date ON news(date);

CREATE INDEX IF NOT EXISTS idx_news_tags_news_id ON news_tags(news_id);
CREATE INDEX IF NOT EXISTS idx_news_images_news_id ON news_images(news_id);
CREATE INDEX IF NOT EXISTS idx_news_videos_news_id ON news_videos(news_id);
CREATE INDEX IF NOT EXISTS idx_news_documents_news_id ON news_documents(news_id);
