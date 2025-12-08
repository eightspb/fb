/**
 * Скрипт для исправления путей к изображениям в формате DD.MM.YYYY на YYYY.MM.DD
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Определяем URL подключения
// Если DATABASE_URL содержит имя Docker сервиса, заменяем на localhost для локального запуска
let databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres';

// Если URL содержит имя Docker сервиса (supabase:5432), заменяем на localhost:54322
if (databaseUrl.includes('supabase:5432')) {
  databaseUrl = databaseUrl.replace('supabase:5432', 'localhost:54322');
}

console.log(`📊 Подключение к: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}\n`);

const pool = new Pool({
  connectionString: databaseUrl,
});

function convertDateFormat(path: string): string {
  // Преобразуем пути типа /images/trainings/14.10.2025/... в /images/trainings/2025.10.14/...
  return path.replace(
    /(\/images\/trainings\/)(\d{2})\.(\d{2})\.(\d{4})(\/)/g,
    (match, prefix, day, month, year, suffix) => {
      return `${prefix}${year}.${month}.${day}${suffix}`;
    }
  );
}

async function fixImagePaths() {
  console.log('🔧 Исправление путей к изображениям...\n');

  // Проверка подключения
  try {
    const testClient = await pool.connect();
    await testClient.query('SELECT 1');
    testClient.release();
  } catch (error: any) {
    console.error('❌ Ошибка подключения к базе данных:', error.message);
    console.error('\n💡 Убедитесь, что:');
    console.error('   1. Docker контейнер PostgreSQL запущен: npm run docker:up');
    console.error('   2. Переменная DATABASE_URL правильно настроена в .env.local');
    console.error(`   3. URL подключения: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}`);
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    // Получаем все изображения с путями в старом формате
    const result = await client.query(`
      SELECT id, image_url 
      FROM news_images 
      WHERE image_url LIKE '%trainings/%/%'
    `);

    let updatedCount = 0;
    let errorCount = 0;

    for (const row of result.rows) {
      const oldPath = row.image_url;
      const newPath = convertDateFormat(oldPath);

      if (oldPath !== newPath) {
        try {
          await client.query(
            'UPDATE news_images SET image_url = $1 WHERE id = $2',
            [newPath, row.id]
          );
          console.log(`✅ ${oldPath} → ${newPath}`);
          updatedCount++;
        } catch (error) {
          console.error(`❌ Ошибка при обновлении ${oldPath}:`, error);
          errorCount++;
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Итоги:');
    console.log(`  ✅ Обновлено: ${updatedCount}`);
    console.log(`  ❌ Ошибок: ${errorCount}`);
    console.log(`  📁 Всего проверено: ${result.rows.length}`);
    console.log('='.repeat(50));
  } finally {
    client.release();
    await pool.end();
  }
}

fixImagePaths().catch((error) => {
  console.error('❌ Критическая ошибка:', error);
  process.exit(1);
});

