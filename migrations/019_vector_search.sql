-- Migration 019: Vector search for contact notes
-- Requires pgvector extension (docker image: pgvector/pgvector:pg15)

-- Включить pgvector расширение
CREATE EXTENSION IF NOT EXISTS vector;

-- Таблица векторов заметок
CREATE TABLE IF NOT EXISTS contact_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES contact_notes(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  embedding vector(1536) NOT NULL,  -- размер для text-embedding-3-small
  model TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  content_hash TEXT NOT NULL,  -- md5 контента, чтобы не переиндексировать
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Уникальный индекс: одна заметка — один вектор
CREATE UNIQUE INDEX IF NOT EXISTS contact_embeddings_note_id_idx
  ON contact_embeddings(note_id);

-- Индекс на contact_id для быстрого удаления при удалении контакта
CREATE INDEX IF NOT EXISTS contact_embeddings_contact_id_idx
  ON contact_embeddings(contact_id);

-- Индекс для cosine similarity поиска (ivfflat)
-- Примечание: ivfflat требует минимум (lists * 10) строк для построения.
-- При малом количестве данных (<500 строк) PostgreSQL будет использовать seq scan,
-- что нормально для начальной загрузки. Индекс ускорит поиск при >500 записях.
CREATE INDEX IF NOT EXISTS contact_embeddings_vector_idx
  ON contact_embeddings USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- Функция поиска по cosine similarity
CREATE OR REPLACE FUNCTION search_notes(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.3,
  max_results int DEFAULT 20
)
RETURNS TABLE (
  note_id UUID,
  contact_id UUID,
  similarity float
) AS $$
  SELECT ce.note_id, ce.contact_id,
         1 - (ce.embedding <=> query_embedding) as similarity
  FROM contact_embeddings ce
  WHERE 1 - (ce.embedding <=> query_embedding) > similarity_threshold
  ORDER BY ce.embedding <=> query_embedding
  LIMIT max_results;
$$ LANGUAGE sql STABLE;

-- Трекинг миграции
INSERT INTO schema_migrations (version, name)
VALUES (19, '019_vector_search')
ON CONFLICT (version) DO NOTHING;
