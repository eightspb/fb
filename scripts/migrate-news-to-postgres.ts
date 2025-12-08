/**
 * Скрипт для миграции данных новостей из news-data.ts в PostgreSQL напрямую
 * 
 * Этот скрипт использует прямое подключение к PostgreSQL через библиотеку pg
 * Работает с docker-compose.simple.yml (только PostgreSQL без Supabase API)
 * 
 * Использование:
 * npm run migrate:news:postgres
 * 
 * Требования:
 * - Установлен пакет pg: npm install pg
 * - Настроена переменная DATABASE_URL в .env.local
 */

import { Pool } from 'pg';
import { newsData } from '../src/lib/news-data';
import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

if (!databaseUrl) {
  console.error('❌ Ошибка: Не найдена переменная окружения DATABASE_URL');
  console.error('Создайте файл .env.local и добавьте:');
  console.error('DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
});

async function migrateNews() {
  console.log('🚀 Начало миграции данных новостей в PostgreSQL...\n');
  console.log(`📊 Подключение к: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}\n`);

  let successCount = 0;
  let errorCount = 0;

  const client = await pool.connect();

  try {
    for (const news of newsData) {
      try {
        console.log(`📰 Миграция: ${news.title}`);

        // 1. Создаем основную запись новости
        await client.query(
          `INSERT INTO news (id, title, short_description, full_description, date, year, category, location, author)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO UPDATE SET
             title = EXCLUDED.title,
             short_description = EXCLUDED.short_description,
             full_description = EXCLUDED.full_description,
             date = EXCLUDED.date,
             year = EXCLUDED.year,
             category = EXCLUDED.category,
             location = EXCLUDED.location,
             author = EXCLUDED.author,
             updated_at = NOW()`,
          [
            news.id,
            news.title,
            news.shortDescription,
            news.fullDescription,
            news.date,
            news.year,
            news.category || null,
            news.location || null,
            news.author || null,
          ]
        );

        // 2. Удаляем старые изображения, теги, видео и документы
        await client.query('DELETE FROM news_images WHERE news_id = $1', [news.id]);
        await client.query('DELETE FROM news_tags WHERE news_id = $1', [news.id]);
        await client.query('DELETE FROM news_videos WHERE news_id = $1', [news.id]);
        await client.query('DELETE FROM news_documents WHERE news_id = $1', [news.id]);

        // 3. Добавляем изображения
        if (news.images && news.images.length > 0) {
          for (let i = 0; i < news.images.length; i++) {
            await client.query(
              'INSERT INTO news_images (news_id, image_url, "order") VALUES ($1, $2, $3)',
              [news.id, news.images[i], i]
            );
          }
        }

        // 4. Добавляем теги
        if (news.tags && news.tags.length > 0) {
          for (const tag of news.tags) {
            await client.query(
              'INSERT INTO news_tags (news_id, tag) VALUES ($1, $2) ON CONFLICT (news_id, tag) DO NOTHING',
              [news.id, tag]
            );
          }
        }

        // 5. Добавляем видео
        if (news.videos && news.videos.length > 0) {
          for (let i = 0; i < news.videos.length; i++) {
            await client.query(
              'INSERT INTO news_videos (news_id, video_url, "order") VALUES ($1, $2, $3)',
              [news.id, news.videos[i], i]
            );
          }
        }

        // 6. Добавляем документы
        if (news.documents && news.documents.length > 0) {
          for (let i = 0; i < news.documents.length; i++) {
            await client.query(
              'INSERT INTO news_documents (news_id, document_url, "order") VALUES ($1, $2, $3)',
              [news.id, news.documents[i], i]
            );
          }
        }

        successCount++;
      } catch (error) {
        console.error(`  ❌ Ошибка при создании новости: ${error instanceof Error ? error.message : error}`);
        errorCount++;
      }
    }
  } finally {
    client.release();
  }

  await pool.end();

  console.log('\n' + '='.repeat(50));
  console.log('📊 Итоги миграции:');
  console.log('='.repeat(50));
  console.log(`  ✅ Успешно: ${successCount}`);
  console.log(`  ❌ Ошибок: ${errorCount}`);
  console.log(`  📰 Всего новостей: ${newsData.length}`);
  console.log('='.repeat(50));

  if (errorCount === 0) {
    console.log('\n🎉 Миграция завершена успешно!');
  } else {
    console.log('\n⚠️  Миграция завершена с ошибками. Проверьте логи выше.');
  }
}

migrateNews().catch((error) => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});


