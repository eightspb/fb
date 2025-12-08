#!/bin/bash
set -e
cd /opt/fibroadenoma.net

echo "🛡️ ФИНАЛЬНАЯ НАСТРОЙКА ПРАВ И RLS..."

# 1. Выдаем супер-права (BYPASSRLS) сервисным ролям
# Это позволяет им игнорировать любые политики RLS, даже если они включены.
docker exec -i fb-net-db psql -U supabase_admin -d postgres <<EOF
ALTER ROLE service_role WITH BYPASSRLS;
ALTER ROLE supabase_storage_admin WITH BYPASSRLS;
ALTER ROLE postgres WITH BYPASSRLS;
EOF
echo "✅ Ролям выдан BYPASSRLS."

# 2. Еще раз отключаем RLS на таблицах
docker exec -i fb-net-db psql -U supabase_admin -d postgres <<EOF
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;
GRANT ALL ON SCHEMA storage TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO anon, authenticated, service_role;
EOF
echo "✅ RLS отключен на таблицах storage."

# 3. ПРОВЕРКА СОСТОЯНИЯ (Debug)
echo "🔎 Диагностика:"
docker exec -i fb-net-db psql -U supabase_admin -d postgres -c "
SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname IN ('service_role', 'supabase_storage_admin');
"
docker exec -i fb-net-db psql -U supabase_admin -d postgres -c "
SELECT tablename, rowsecurity, schemaname FROM pg_tables WHERE schemaname = 'storage';
"

echo "👉 Если rolbypassrls = t и rowsecurity = f, то ошибка 403 НЕВОЗМОЖНА со стороны БД."
echo "👉 Теперь пробуйте ./migrate-images-docker.sh"

