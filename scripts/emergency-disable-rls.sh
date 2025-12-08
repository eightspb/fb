#!/bin/bash
set -e
cd /opt/fibroadenoma.net

echo "🕵️‍♂️ Проверка статуса RLS..."

# Проверяем текущий статус
docker exec -i fb-net-db psql -U supabase_admin -d postgres -c "
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename IN ('objects', 'buckets');
"

echo "🔓 ПРИНУДИТЕЛЬНОЕ ОТКЛЮЧЕНИЕ RLS..."

docker exec -i fb-net-db psql -U supabase_admin -d postgres <<EOF
-- Отключаем RLS
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;

-- Убеждаемся, что bucket public_files существует и публичный
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('public_files', 'public_files', true, null, null)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Гранты всем на всё в storage
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA storage TO anon, authenticated, service_role;
EOF

echo "🕵️‍♂️ Проверка ПОСЛЕ отключения (должно быть false):"
docker exec -i fb-net-db psql -U supabase_admin -d postgres -c "
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename IN ('objects', 'buckets');
"

echo "✅ RLS отключен. Попробуйте миграцию снова."
