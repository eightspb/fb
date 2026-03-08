/**
 * Скрипт: AI-исследование контактов без заметок (параллельно)
 * Запуск на сервере: cd /opt/fb-net && bun scripts/research-contacts-without-notes.ts 2>&1 | tee /tmp/research.log
 */

import { Pool } from 'pg';
import { researchContactWithAI } from '../src/lib/openrouter';
import * as fs from 'fs';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
});

const AI_RESEARCH_HEADER = '── AI Исследование';
const CONCURRENCY = 3; // параллельных запросов одновременно
const REQUEST_TIMEOUT_MS = 120_000; // 2 минуты hard timeout на один запрос
const LOG_FILE = '/tmp/research.log';

// Логирование одновременно в stdout и файл
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  logStream.write(line + '\n');
}

// Hard timeout — защита от зависания HTTP-соединения
function withHardTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout ${ms / 1000}s: ${label}`)), ms)
    ),
  ]);
}

let doneCount = 0;
let successCount = 0;
let errorCount = 0;

async function researchOne(
  contact: {
    id: string; full_name: string; city: string | null;
    institution: string | null; speciality: string | null;
    phone: string | null; email: string | null;
  },
  index: number,
  total: number,
): Promise<void> {
  log(`[${index + 1}/${total}] Начинаю: ${contact.full_name}`);

  const client = await pool.connect();
  try {
    const researchResult = await withHardTimeout(
      researchContactWithAI({
        full_name: contact.full_name,
        city: contact.city,
        institution: contact.institution,
        speciality: contact.speciality,
        phone: contact.phone,
        email: contact.email,
      }),
      REQUEST_TIMEOUT_MS,
      contact.full_name,
    );

    const now = new Date().toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    const aiBlock = `${AI_RESEARCH_HEADER} (${now}) ──\n${researchResult}\n── конец исследования ──`;

    await client.query(
      'UPDATE contacts SET notes = $1, updated_at = NOW() WHERE id = $2',
      [aiBlock, contact.id],
    );

    successCount++;
    doneCount++;
    log(`[${index + 1}/${total}] ✓ ${contact.full_name} (${researchResult.length} симв.) | прогресс: ${doneCount}/${total}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errorCount++;
    doneCount++;
    log(`[${index + 1}/${total}] ✗ ${contact.full_name}: ${message} | прогресс: ${doneCount}/${total}`);
  } finally {
    client.release();
  }
}

async function runBatch<T>(items: T[], fn: (item: T, i: number) => Promise<void>, concurrency: number) {
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
}

async function main() {
  log(`=== Старт (concurrency=${CONCURRENCY}, timeout=${REQUEST_TIMEOUT_MS / 1000}s) ===`);
  log(`Лог пишется в: ${LOG_FILE}`);

  const client = await pool.connect();
  let contacts: Array<{
    id: string; full_name: string; city: string | null;
    institution: string | null; speciality: string | null;
    phone: string | null; email: string | null;
  }>;

  try {
    const result = await client.query(`
      SELECT id, full_name, city, institution, speciality, phone, email
      FROM contacts
      WHERE (notes IS NULL OR TRIM(notes) = '')
        AND full_name IS NOT NULL
        AND TRIM(full_name) != ''
      ORDER BY created_at DESC
    `);
    contacts = result.rows;
  } finally {
    client.release();
  }

  log(`Найдено контактов без заметок: ${contacts.length}`);
  if (contacts.length === 0) {
    log('Нечего делать.');
    await pool.end();
    logStream.end();
    return;
  }

  await runBatch(contacts, (contact, idx) => researchOne(contact, idx, contacts.length), CONCURRENCY);

  log(`\n=== Готово === Успешно: ${successCount}, Ошибок: ${errorCount}`);
  await pool.end();
  logStream.end();
}

main().catch(e => { log(`FATAL: ${e}`); process.exit(1); });
