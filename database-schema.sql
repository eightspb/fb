-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

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

-- =====================================================
-- Таблица шаблонов писем для форм
-- =====================================================

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_type TEXT NOT NULL, -- 'contact', 'cp', 'training', 'conference_registration'
  email_type TEXT NOT NULL CHECK (email_type IN ('admin', 'user')), -- Тип письма: администратору или пользователю
  subject TEXT NOT NULL, -- Тема письма
  html_body TEXT NOT NULL, -- HTML тело письма
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(form_type, email_type) -- Уникальность по комбинации формы и типа письма
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_email_templates_form_type ON email_templates(form_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_email_type ON email_templates(email_type);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_email_templates_updated_at();

-- RLS для email_templates
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Разрешаем чтение для всех (для публичных API)
DROP POLICY IF EXISTS "Anyone can read email templates" ON email_templates;
CREATE POLICY "Anyone can read email templates" ON email_templates
  FOR SELECT USING (true);

-- Разрешаем всё для пользователя postgres (используется в API)
DROP POLICY IF EXISTS "Allow all for postgres on email_templates" ON email_templates;
CREATE POLICY "Allow all for postgres on email_templates" ON email_templates
  FOR ALL TO postgres USING (true) WITH CHECK (true);

-- Вставляем шаблоны по умолчанию для каждой формы
-- Контактная форма - администратору
INSERT INTO email_templates (form_type, email_type, subject, html_body)
VALUES (
  'contact',
  'admin',
  'Новое сообщение с сайта от {{name}}',
  '<h2>Новое сообщение с сайта</h2>
<p><strong>Имя:</strong> {{name}}</p>
<p><strong>Email:</strong> {{email}}</p>
<p><strong>Телефон:</strong> {{phone}}</p>
<p><strong>Сообщение:</strong></p>
<p>{{message}}</p>
<p><strong>Дата:</strong> {{date}}</p>'
) ON CONFLICT (form_type, email_type) DO NOTHING;

-- =====================================================
-- Таблица логов приложения для админ панели
-- =====================================================

CREATE TABLE IF NOT EXISTS app_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug')),
  message TEXT NOT NULL,
  context TEXT, -- Контекст лога (например, 'API', 'Auth', 'Database')
  metadata JSONB, -- Дополнительные данные в формате JSON
  ip_address TEXT,
  user_agent TEXT,
  path TEXT, -- Путь запроса
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_app_logs_created_at ON app_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_logs_level ON app_logs(level);
CREATE INDEX IF NOT EXISTS idx_app_logs_context ON app_logs(context);
CREATE INDEX IF NOT EXISTS idx_app_logs_path ON app_logs(path);

-- RLS для app_logs отключен, так как доступ контролируется через admin-session cookie в API
-- ALTER TABLE app_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_logs DISABLE ROW LEVEL SECURITY;

-- Удаляем старые политики
DROP POLICY IF EXISTS "Allow insert on app_logs" ON app_logs;
DROP POLICY IF EXISTS "Allow read for postgres on app_logs" ON app_logs;

-- Функция для очистки старых логов (старше 30 дней)
CREATE OR REPLACE FUNCTION cleanup_old_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM app_logs WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Контактная форма - пользователю
INSERT INTO email_templates (form_type, email_type, subject, html_body)
VALUES (
  'contact',
  'user',
  'Ваше сообщение получено | ЗЕНИТ МЕД',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Здравствуйте, {{name}}!</h2>
  <p>Мы получили ваше сообщение и свяжемся с вами в ближайшее время.</p>
  <br>
  <p>С уважением,<br>Команда ЗЕНИТ МЕД</p>
  <p><a href="https://zenitmed.ru">zenitmed.ru</a></p>
</div>'
) ON CONFLICT (form_type, email_type) DO NOTHING;

-- Запрос КП - администратору
INSERT INTO email_templates (form_type, email_type, subject, html_body)
VALUES (
  'cp',
  'admin',
  'Новый запрос КП: {{name}} ({{institution}})',
  '<h2>Новый запрос коммерческого предложения</h2>
<p><strong>ФИО:</strong> {{name}}</p>
<p><strong>Телефон:</strong> {{phone}}</p>
<p><strong>Email:</strong> {{email}}</p>
<p><strong>Город:</strong> {{city}}</p>
<p><strong>Медицинское учреждение:</strong> {{institution}}</p>
<p><strong>Дата:</strong> {{date}}</p>'
) ON CONFLICT (form_type, email_type) DO NOTHING;

-- Запрос КП - пользователю
INSERT INTO email_templates (form_type, email_type, subject, html_body)
VALUES (
  'cp',
  'user',
  'Ваш запрос получен | ЗЕНИТ МЕД',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Здравствуйте, {{name}}!</h2>
  <p>Мы получили ваш запрос на коммерческое предложение.</p>
  <p>Наш менеджер свяжется с вами в ближайшее время для уточнения деталей.</p>
  <br>
  <p>С уважением,<br>Команда ЗЕНИТ МЕД</p>
  <p><a href="https://zenitmed.ru">zenitmed.ru</a></p>
</div>'
) ON CONFLICT (form_type, email_type) DO NOTHING;

-- Заявка на обучение - администратору
INSERT INTO email_templates (form_type, email_type, subject, html_body)
VALUES (
  'training',
  'admin',
  'Запись на обучение: {{name}} ({{institution}})',
  '<h2>Новая заявка на обучение</h2>
<p><strong>ФИО:</strong> {{name}}</p>
<p><strong>Телефон:</strong> {{phone}}</p>
<p><strong>Email:</strong> {{email}}</p>
<p><strong>Город:</strong> {{city}}</p>
<p><strong>Медицинское учреждение:</strong> {{institution}}</p>
<p><strong>Дата:</strong> {{date}}</p>'
) ON CONFLICT (form_type, email_type) DO NOTHING;

-- Заявка на обучение - пользователю
INSERT INTO email_templates (form_type, email_type, subject, html_body)
VALUES (
  'training',
  'user',
  'Заявка на обучение получена | ЗЕНИТ МЕД',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Здравствуйте, {{name}}!</h2>
  <p>Мы получили вашу заявку на обучение.</p>
  <p>Наш менеджер свяжется с вами в ближайшее время для уточнения деталей.</p>
  <br>
  <p>С уважением,<br>Команда ЗЕНИТ МЕД</p>
  <p><a href="https://zenitmed.ru">zenitmed.ru</a></p>
</div>'
) ON CONFLICT (form_type, email_type) DO NOTHING;

-- Регистрация на конференцию - администратору
INSERT INTO email_templates (form_type, email_type, subject, html_body)
VALUES (
  'conference_registration',
  'admin',
  'Регистрация на конференцию: {{name}}',
  '<h2>Новая регистрация на конференцию</h2>
<p><strong>Конференция:</strong> {{conference}}</p>
<p><strong>ФИО:</strong> {{name}}</p>
<p><strong>Email:</strong> {{email}}</p>
<p><strong>Телефон:</strong> {{phone}}</p>
{{#if institution}}<p><strong>Учреждение:</strong> {{institution}}</p>{{/if}}
<p><strong>Нужен сертификат:</strong> {{certificate}}</p>
<p><strong>Дата регистрации:</strong> {{date}}</p>'
) ON CONFLICT (form_type, email_type) DO NOTHING;

-- Регистрация на конференцию - пользователю
INSERT INTO email_templates (form_type, email_type, subject, html_body)
VALUES (
  'conference_registration',
  'user',
  'Регистрация на конференцию получена | Компания ЗЕНИТ',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2>Здравствуйте, {{name}}!</h2>
  <p>Мы получили вашу регистрацию на конференцию "{{conference}}".</p>
  <p>Благодарим за регистрацию и ждём вас!</p>
  <br>
  <p>С уважением,<br>Компания ЗЕНИТ</p>
  <p><a href="{{siteUrl}}">{{siteHostname}}</a></p>
</div>'
) ON CONFLICT (form_type, email_type) DO NOTHING;
