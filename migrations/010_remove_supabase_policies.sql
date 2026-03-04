-- Удаление Supabase-политик с auth.role() и замена на корректные PostgreSQL-политики
-- Эти политики использовали функцию auth.role() из Supabase, которая не работает в чистом Postgres.
-- Пользователь postgres является суперпользователем (BYPASSRLS) и обходил RLS автоматически,
-- но явные политики чище и безопаснее.

-- ============================================
-- conferences: удаляем Supabase-политики
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can insert conferences" ON conferences;
DROP POLICY IF EXISTS "Authenticated users can update conferences" ON conferences;
DROP POLICY IF EXISTS "Authenticated users can delete conferences" ON conferences;

-- Добавляем правильную политику для пользователя postgres (используется в API)
DROP POLICY IF EXISTS "Allow all for postgres on conferences" ON conferences;
CREATE POLICY "Allow all for postgres on conferences" ON conferences
  FOR ALL TO postgres USING (true) WITH CHECK (true);

-- ============================================
-- news: удаляем Supabase-политики
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can insert news" ON news;
DROP POLICY IF EXISTS "Authenticated users can update news" ON news;
DROP POLICY IF EXISTS "Authenticated users can delete news" ON news;

-- Добавляем правильную политику для пользователя postgres (используется в API)
DROP POLICY IF EXISTS "Allow all for postgres on news" ON news;
CREATE POLICY "Allow all for postgres on news" ON news
  FOR ALL TO postgres USING (true) WITH CHECK (true);

-- ============================================
-- news_images: удаляем Supabase-политики
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can insert news_images" ON news_images;
DROP POLICY IF EXISTS "Authenticated users can update news_images" ON news_images;
DROP POLICY IF EXISTS "Authenticated users can delete news_images" ON news_images;

-- Добавляем правильную политику для пользователя postgres (используется в API)
DROP POLICY IF EXISTS "Allow all for postgres on news_images" ON news_images;
CREATE POLICY "Allow all for postgres on news_images" ON news_images
  FOR ALL TO postgres USING (true) WITH CHECK (true);
