-- Инициализация Supabase Storage
-- Создание bucket для публичных файлов

-- Включаем расширение storage (если еще не включено)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Создаем bucket 'public_files' если его еще нет
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public_files',
  'public_files',
  true, -- публичный bucket
  52428800, -- 50MB лимит
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Политики доступа для bucket 'public_files'
-- Разрешаем всем читать файлы
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'public_files');

-- Разрешаем аутентифицированным пользователям загружать файлы
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'public_files' AND
  auth.role() = 'authenticated'
);

-- Разрешаем аутентифицированным пользователям обновлять свои файлы
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'public_files' AND
  auth.role() = 'authenticated'
);

-- Разрешаем аутентифицированным пользователям удалять файлы
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'public_files' AND
  auth.role() = 'authenticated'
);

