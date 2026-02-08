/**
 * Настройка Testcontainers для E2E тестов
 * Создает PostgreSQL контейнер для тестирования с реальной БД
 */

import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';

let container: StartedPostgreSqlContainer | null = null;

/**
 * Запускает PostgreSQL контейнер для тестов
 */
export async function startTestDatabase(): Promise<StartedPostgreSqlContainer> {
  if (container) {
    return container;
  }

  console.log('🐳 Запуск PostgreSQL контейнера для тестов...');

  container = await new PostgreSqlContainer('postgres:15')
    .withDatabase('test_db')
    .withUsername('test_user')
    .withPassword('test_password')
    .withExposedPorts(5432)
    .start();

  const connectionString = container.getConnectionUri();
  console.log(`✅ PostgreSQL контейнер запущен: ${connectionString}`);

  // Применяем минимальную схему для e2e тестов
  try {
    console.log('📦 Применение тестовой схемы...');
    const client = new Client({ connectionString });
    await client.connect();
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
      CREATE TABLE IF NOT EXISTS form_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        message TEXT
      );
    `);
    await client.end();
    console.log('✅ Тестовая схема применена');
  } catch (error) {
    console.warn('⚠️ Не удалось применить тестовую схему:', error);
  }

  // Устанавливаем переменную окружения для тестов
  process.env.DATABASE_URL = connectionString;

  return container;
}

/**
 * Останавливает PostgreSQL контейнер
 */
export async function stopTestDatabase(): Promise<void> {
  if (container) {
    console.log('🛑 Остановка PostgreSQL контейнера...');
    await container.stop();
    container = null;
    console.log('✅ Контейнер остановлен');
  }
}

/**
 * Получает connection string для текущего контейнера
 */
export function getDatabaseUrl(): string {
  if (!container) {
    throw new Error('Database container is not started. Call startTestDatabase() first.');
  }
  return container.getConnectionUri();
}
