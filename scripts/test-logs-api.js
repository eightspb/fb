#!/usr/bin/env node

/**
 * Тестовый скрипт для проверки API логов
 */

const { Pool } = require('pg');

async function testLogsAPI() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:54322/postgres',
  });

  console.log('🧪 Тестирование API логов...');
  console.log('─'.repeat(60));

  try {
    const client = await pool.connect();
    
    try {
      // Проверяем получение логов
      console.log('\n1️⃣ Проверка SELECT из app_logs...');
      
      const countResult = await client.query('SELECT COUNT(*) as total FROM app_logs');
      const total = parseInt(countResult.rows[0].total, 10);
      
      const logsResult = await client.query(
        'SELECT id, level, message, context, created_at FROM app_logs ORDER BY created_at DESC LIMIT 10'
      );
      
      console.log(`✅ Получено логов: ${logsResult.rows.length}`);
      console.log(`✅ Всего в БД: ${total}`);
      
      if (logsResult.rows.length > 0) {
        console.log('\n📋 Примеры логов:');
        logsResult.rows.slice(0, 3).forEach((log, index) => {
          console.log(`\n${index + 1}. [${log.level.toUpperCase()}] ${log.message.substring(0, 100)}${log.message.length > 100 ? '...' : ''}`);
          if (log.context) console.log(`   Контекст: ${log.context}`);
          console.log(`   Время: ${new Date(log.created_at).toLocaleString('ru-RU')}`);
        });
      } else {
        console.log('\n⚠️  В базе данных пока нет логов');
        console.log('   Создам тестовый лог...');
        
        await client.query(
          `INSERT INTO app_logs (level, message, context) VALUES ($1, $2, $3)`,
          ['info', 'Тестовый лог после исправления RLS', 'Test']
        );
        
        console.log('✅ Тестовый лог создан');
      }

      console.log('\n✅ Все проверки пройдены успешно!');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('\n❌ Ошибка при тестировании:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testLogsAPI();
