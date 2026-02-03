#!/bin/bash
# Скрипт для создания таблицы form_submissions на сервере
# Запускать на сервере: bash scripts/fix-form-submissions.sh

set -e

echo "🔧 Создание таблицы form_submissions..."

docker exec -i fb-net-db psql -U supabase_admin -d postgres << 'EOF'
-- Таблица заявок с форм (form_submissions)
CREATE TABLE IF NOT EXISTS form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  form_type TEXT NOT NULL,
  status TEXT DEFAULT 'new',
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT,
  institution TEXT,
  city TEXT,
  page_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_form_submissions_created_at ON form_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_status ON form_submissions(status);
CREATE INDEX IF NOT EXISTS idx_form_submissions_type ON form_submissions(form_type);

-- Отключаем RLS для простоты (postgres и так суперпользователь)
ALTER TABLE form_submissions DISABLE ROW LEVEL SECURITY;

-- Даем права
GRANT ALL ON form_submissions TO postgres;
GRANT ALL ON form_submissions TO anon;
GRANT ALL ON form_submissions TO authenticated;

SELECT 'Таблица form_submissions успешно создана!' as result;
SELECT count(*) as total_submissions FROM form_submissions;
EOF

echo "✅ Готово!"
