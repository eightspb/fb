-- Миграция: Добавление поля status в таблицу news
-- Выполнить для существующих баз данных

-- Добавляем поле status, если его еще нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'news' AND column_name = 'status'
  ) THEN
    ALTER TABLE news ADD COLUMN status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published'));
    
    -- Обновляем существующие записи на published
    UPDATE news SET status = 'published' WHERE status IS NULL;
    
    RAISE NOTICE 'Поле status успешно добавлено в таблицу news';
  ELSE
    RAISE NOTICE 'Поле status уже существует в таблице news';
  END IF;
END $$;

-- Создаем индекс для быстрого поиска по статусу
CREATE INDEX IF NOT EXISTS idx_news_status ON news(status);

