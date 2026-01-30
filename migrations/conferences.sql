-- Таблица конференций
CREATE TABLE IF NOT EXISTS conferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'Конференция', 'Мастер-класс', 'Выставка'
  location TEXT,
  speaker TEXT,
  cme_hours INTEGER,
  program JSONB DEFAULT '[]', -- Array of strings
  materials JSONB DEFAULT '[]', -- Array of 'video', 'photo', 'doc'
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для сортировки по дате (хотя это TEXT, но лучше иметь индекс)
CREATE INDEX IF NOT EXISTS idx_conferences_date ON conferences(date);













