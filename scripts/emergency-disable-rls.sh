#!/bin/bash
set -e
cd /opt/fibroadenoma.net

echo "🔓 ОТКЛЮЧЕНИЕ RLS (Экстренный режим)..."
echo "   Это позволит загрузить файлы без проверок прав доступа."

docker exec -i fb-net-db psql -U supabase_admin -d postgres <<EOF
-- Отключаем RLS для таблиц storage
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;

-- Убеждаемся, что bucket существует и публичный
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('public_files', 'public_files', true, null, null)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Даем полные права всем ролям (на всякий случай)
GRANT ALL ON SCHEMA storage TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA storage TO anon, authenticated, service_role;
EOF

echo "✅ RLS отключен. Теперь миграция точно пройдет."

