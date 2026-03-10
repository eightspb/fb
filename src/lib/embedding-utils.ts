/**
 * Утилита для автоматической индексации embedding при создании/обновлении заметки.
 * Fire-and-forget: не блокирует основной поток, ошибки логируются но не пробрасываются.
 */

import { Pool } from 'pg';
import { createHash } from 'crypto';
import { getEmbedding } from './openrouter';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

const EMBEDDING_TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout ${ms / 1000}s: ${label}`)), ms);
  });
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    timeoutPromise,
  ]);
}

/**
 * Индексирует embedding для одной заметки. Fire-and-forget — не бросает исключений.
 * Использует UPSERT: если embedding уже есть и content не изменился — пропускает.
 */
export async function indexNoteEmbedding(noteId: string, content: string, contactId: string): Promise<void> {
  try {
    const hash = createHash('md5').update(content).digest('hex');

    // Проверить: уже проиндексировано с тем же хешем?
    const existing = await pool.query(
      'SELECT content_hash FROM contact_embeddings WHERE note_id = $1',
      [noteId],
    );
    if (existing.rows[0]?.content_hash === hash) {
      return; // уже актуально
    }

    const embedding = await withTimeout(
      getEmbedding(content),
      EMBEDDING_TIMEOUT_MS,
      `note ${noteId}`,
    );
    const vectorStr = `[${embedding.join(',')}]`;

    await pool.query(`
      INSERT INTO contact_embeddings (note_id, contact_id, embedding, content_hash)
      VALUES ($1, $2, $3::vector, $4)
      ON CONFLICT (note_id) DO UPDATE
        SET embedding = $3::vector, content_hash = $4, created_at = NOW()
    `, [noteId, contactId, vectorStr, hash]);

    console.log(`[Embedding] Indexed note ${noteId.slice(0, 8)}... (${content.length} chars)`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Embedding] Failed to index note ${noteId.slice(0, 8)}...: ${message}`);
  }
}
