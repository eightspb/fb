#!/usr/bin/env node

/**
 * Скрипт для применения миграции к базе данных
 * Использование: node scripts/apply-migration.js migrations/006_fix_app_logs_rls.sql
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function applyMigration(migrationFile) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
  });

  try {
    // Читаем файл миграции
    const migrationPath = path.join(process.cwd(), migrationFile);
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Файл миграции не найден: ${migrationPath}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log(`📄 Применение миграции: ${migrationFile}`);
    console.log('─'.repeat(60));

    // Применяем миграцию
    const client = await pool.connect();
    try {
      await client.query(sql);
      console.log('✅ Миграция успешно применена');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Ошибка при применении миграции:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Получаем путь к миграции из аргументов
const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('❌ Не указан файл миграции');
  console.error('Использование: node scripts/apply-migration.js migrations/FILE.sql');
  process.exit(1);
}

applyMigration(migrationFile);
