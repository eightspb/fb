-- Migration 005: Add email templates table for form email customization
-- This migration creates the email_templates table and inserts default templates for all forms

-- Таблица шаблонов писем для форм
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
