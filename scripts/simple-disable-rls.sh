#!/bin/bash
set -e
cd /opt/fibroadenoma.net

echo "🕵️‍♂️ Текущий статус RLS:"
docker exec -i fb-net-db psql -U supabase_admin -d postgres -c "
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename IN ('objects', 'buckets');
"

echo "🔓 Отключаем RLS (без перезагрузки)..."
docker exec -i fb-net-db psql -U supabase_admin -d postgres <<EOF
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;
GRANT ALL ON SCHEMA storage TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO anon, authenticated, service_role;
EOF

echo "🕵️‍♂️ Проверка ПОСЛЕ отключения:"
docker exec -i fb-net-db psql -U supabase_admin -d postgres -c "
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename IN ('objects', 'buckets');
"

echo "👉 Теперь сразу запускайте миграцию!"











