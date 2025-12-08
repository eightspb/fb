#!/bin/bash
set -e

echo "🔧 Полное восстановление базы данных Supabase (версия с исправлением владельцев)..."

cd /opt/fibroadenoma.net

# Выполняем SQL команды
docker exec -i fb-net-db psql -U supabase_admin -d postgres <<EOF
-- 1. Создаем схемы
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS graphql;
CREATE SCHEMA IF NOT EXISTS graphql_public;

-- 2. Настраиваем расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA extensions;

-- 3. Создаем функции
CREATE OR REPLACE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS \$\$
  select nullif(current_setting('request.jwt.claim.role', true), '')::text;
\$\$;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS \$\$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
\$\$;
CREATE OR REPLACE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS \$\$
  select nullif(current_setting('request.jwt.claim.email', true), '')::text;
\$\$;

-- 4. Создаем роли
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT;
  END IF;
  
  -- Даем service_role право обходить RLS (как в стандартном Supabase)
  ALTER ROLE service_role WITH BYPASSRLS;
END
\$\$;

-- 5. Создаем таблицы (чтобы они точно были)
-- Auth tables
CREATE TABLE IF NOT EXISTS auth.users (
    instance_id uuid,
    id uuid NOT NULL PRIMARY KEY,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone character varying(255),
    phone_confirmed_at timestamp with time zone,
    phone_change character varying(255),
    phone_change_token character varying(255),
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone,
    email_change_token_current character varying(255),
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255),
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone
);
CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
    instance_id uuid,
    id bigserial NOT NULL PRIMARY KEY,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);
CREATE TABLE IF NOT EXISTS auth.schema_migrations (
    version character varying(255) PRIMARY KEY
);

-- Storage tables
CREATE TABLE IF NOT EXISTS storage.buckets (
    id text NOT NULL PRIMARY KEY,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[]
);
CREATE TABLE IF NOT EXISTS storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    bucket_id text REFERENCES storage.buckets(id),
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED,
    version text
);
CREATE TABLE IF NOT EXISTS storage.migrations (
    id integer NOT NULL PRIMARY KEY,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT now()
);

-- 6. ИСПРАВЛЕНИЕ ПРАВ (Самая важная часть)

-- Передаем владение схемами админам сервисов
ALTER SCHEMA auth OWNER TO supabase_auth_admin;
ALTER SCHEMA storage OWNER TO supabase_storage_admin;

-- Передаем владение таблицами (чтобы сервисы могли их менять)
ALTER TABLE auth.users OWNER TO supabase_auth_admin;
ALTER TABLE auth.refresh_tokens OWNER TO supabase_auth_admin;
ALTER TABLE auth.schema_migrations OWNER TO supabase_auth_admin;

ALTER TABLE storage.buckets OWNER TO supabase_storage_admin;
ALTER TABLE storage.objects OWNER TO supabase_storage_admin;
ALTER TABLE storage.migrations OWNER TO supabase_storage_admin;

-- Даем права на extensions (нужно для uuid_generate и т.д.)
GRANT USAGE ON SCHEMA extensions TO supabase_auth_admin, supabase_storage_admin;

-- Настраиваем search_path
ALTER USER supabase_auth_admin SET search_path = auth, extensions, public;
ALTER USER supabase_storage_admin SET search_path = storage, extensions, public;

-- Права для API (anon/authenticated)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;

-- Права на функции
ALTER FUNCTION auth.role() OWNER TO supabase_auth_admin;
ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;
ALTER FUNCTION auth.email() OWNER TO supabase_auth_admin;

GRANT EXECUTE ON FUNCTION auth.role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.email() TO anon, authenticated, service_role;

-- Права на таблицы в public
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- 7. Storage Bucket и Policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('public_files', 'public_files', true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'public_files');

DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'public_files' 
    AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Service role full access" ON storage.objects;
CREATE POLICY "Service role full access" ON storage.objects FOR ALL USING (
    auth.role() = 'service_role'
);

EOF

echo "✅ Права и владельцы обновлены."

echo "🔄 Перезапуск сервисов..."
docker compose -f docker-compose.production.yml restart supabase-storage supabase-auth

echo "⏳ Ждем 10 секунд..."
sleep 10

echo "📊 Статус:"
docker ps | grep -E "(storage|auth)"

echo ""
echo "🔍 Логи (если что-то пошло не так):"
echo "--- Auth Logs ---"
docker logs fb-net-auth --tail 10
echo "--- Storage Logs ---"
docker logs fb-net-storage --tail 10
