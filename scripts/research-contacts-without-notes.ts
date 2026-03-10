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

const CONCURRENCY = 4;
const REQUEST_TIMEOUT_MS = 180_000; // 3 минуты — perplexity иногда долго думает
const LOG_FILE = '/tmp/research.log';
const TG_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '';

const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  logStream.write(line + '\n');
}

async function sendTelegram(text: string) {
  if (!TG_BOT_TOKEN || !TG_CHAT_ID) { log('TG: токены не найдены, пропускаю'); return; }
  try {
    const res = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT_ID, text }),
    });
    const json = await res.json() as { ok: boolean };
    log(`TG: ${json.ok ? 'отправлено' : 'ошибка: ' + JSON.stringify(json)}`);
  } catch (e) {
    log(`TG: исключение: ${e}`);
  }
}

function withHardTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
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

    // Delete previous ai_research notes (replace, not duplicate)
    await client.query(
      `DELETE FROM contact_notes WHERE contact_id = $1 AND source = 'ai_research'`,
      [contact.id]
    );

    await client.query(
      `INSERT INTO contact_notes (contact_id, title, content, source, metadata)
       VALUES ($1, $2, $3, 'ai_research', $4)`,
      [
        contact.id,
        `AI Исследование (${now})`,
        researchResult,
        JSON.stringify({ model: 'perplexity/sonar-pro', batch: true, timestamp: new Date().toISOString() }),
      ]
    );

    await client.query('UPDATE contacts SET updated_at = NOW() WHERE id = $1', [contact.id]);

    successCount++;
    doneCount++;
    log(`[${index + 1}/${total}] OK: ${contact.full_name} (${researchResult.length} symv) | progress: ${doneCount}/${total}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errorCount++;
    doneCount++;
    log(`[${index + 1}/${total}] ERR: ${contact.full_name}: ${message} | progress: ${doneCount}/${total}`);
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
  const startTime = Date.now();
  log(`=== Start (concurrency=${CONCURRENCY}, timeout=${REQUEST_TIMEOUT_MS / 1000}s) ===`);

  const client = await pool.connect();
  let contacts: Array<{
    id: string; full_name: string; city: string | null;
    institution: string | null; speciality: string | null;
    phone: string | null; email: string | null;
  }>;

  try {
    const result = await client.query(`
      SELECT c.id, c.full_name, c.city, c.institution, c.speciality, c.phone, c.email
      FROM contacts c
      WHERE NOT EXISTS (
        SELECT 1 FROM contact_notes cn
        WHERE cn.contact_id = c.id AND cn.source IN ('ai_research', 'ai_deep_research')
      )
        AND c.full_name IS NOT NULL
        AND TRIM(c.full_name) != ''
      ORDER BY c.created_at DESC
    `);
    contacts = result.rows;
  } finally {
    client.release();
  }

  log(`Contacts without notes: ${contacts.length}`);
  if (contacts.length === 0) {
    log('Nothing to do.');
    await sendTelegram('AI-исследование: все контакты уже обработаны.');
    await pool.end();
    logStream.end();
    return;
  }

  await runBatch(contacts, (contact, idx) => researchOne(contact, idx, contacts.length), CONCURRENCY);

  const elapsed = Math.round((Date.now() - startTime) / 60000);
  const summary = `AI-исследование контактов завершено!\n\nОК: ${successCount}\nОшибок: ${errorCount}\nВсего: ${contacts.length}\nВремя: ~${elapsed} мин.`;
  log(`\n=== Done === OK: ${successCount}, Errors: ${errorCount}`);
  await sendTelegram(summary);
  await pool.end();
  logStream.end();
}

main().catch(async e => {
  log(`FATAL: ${e}`);
  await sendTelegram(`AI-исследование: FATAL ERROR\n${e}`);
  process.exit(1);
});
