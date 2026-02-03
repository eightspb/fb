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

-- Индекс для сортировки по дате
CREATE INDEX IF NOT EXISTS idx_conferences_date ON conferences(date);

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
