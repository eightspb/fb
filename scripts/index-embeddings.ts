/**
 * Скрипт: Индексация embeddings для семантического поиска по заметкам контактов
 * Запуск: bun scripts/index-embeddings.ts
 * На сервере: cd /opt/fb-net && bun scripts/index-embeddings.ts 2>&1 | tee /tmp/embeddings.log
 */

import { Pool } from 'pg';
import { createHash } from 'crypto';
import { getEmbedding } from '../src/lib/openrouter';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

const CONCURRENCY = 3;
const REQUEST_TIMEOUT_MS = 30_000; // 30 секунд на один embedding

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

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

let doneCount = 0;
let successCount = 0;
let skipCount = 0;
let errorCount = 0;

async function indexNote(
  noteId: string,
  content: string,
  contactId: string,
  index: number,
  total: number,
): Promise<void> {
  const hash = createHash('md5').update(content).digest('hex');

  // Проверить: уже проиндексировано с тем же хешем?
  const existing = await pool.query(
    'SELECT content_hash FROM contact_embeddings WHERE note_id = $1',
    [noteId],
  );
  if (existing.rows[0]?.content_hash === hash) {
    skipCount++;
    doneCount++;
    return;
  }

  const embedding = await withTimeout(
    getEmbedding(content),
    REQUEST_TIMEOUT_MS,
    `note ${noteId}`,
  );
  const vectorStr = `[${embedding.join(',')}]`;

  await pool.query(`
    INSERT INTO contact_embeddings (note_id, contact_id, embedding, content_hash)
    VALUES ($1, $2, $3::vector, $4)
    ON CONFLICT (note_id) DO UPDATE
      SET embedding = $3::vector, content_hash = $4, created_at = NOW()
  `, [noteId, contactId, vectorStr, hash]);

  successCount++;
  doneCount++;
  log(`[${index + 1}/${total}] OK: note ${noteId.slice(0, 8)}... (${content.length} chars) | progress: ${doneCount}/${total}`);
}

async function runBatch<T>(items: T[], fn: (item: T, i: number) => Promise<void>, concurrency: number) {
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      try {
        await fn(items[idx], idx);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errorCount++;
        doneCount++;
        log(`[${idx + 1}/${items.length}] ERR: ${message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
}

async function main() {
  const startTime = Date.now();
  log(`=== Indexing embeddings (concurrency=${CONCURRENCY}) ===`);

  // Получить заметки, которые нужно проиндексировать:
  // 1. Нет в contact_embeddings
  // 2. Или content_hash не совпадает (заметка обновлена)
  const { rows: notes } = await pool.query(`
    SELECT cn.id, cn.content, cn.contact_id
    FROM contact_notes cn
    LEFT JOIN contact_embeddings ce ON ce.note_id = cn.id
    WHERE ce.id IS NULL
       OR ce.content_hash != md5(cn.content)
    ORDER BY cn.created_at DESC
  `);

  log(`Найдено ${notes.length} заметок для индексации`);

  if (notes.length === 0) {
    log('Все заметки уже проиндексированы.');
    await pool.end();
    return;
  }

  await runBatch(
    notes,
    (note, i) => indexNote(
      note.id as string,
      note.content as string,
      note.contact_id as string,
      i,
      notes.length,
    ),
    CONCURRENCY,
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`=== Готово за ${elapsed}s: ${successCount} indexed, ${skipCount} skipped, ${errorCount} errors ===`);
  await pool.end();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
