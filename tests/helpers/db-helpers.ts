/**
 * Вспомогательные функции для работы с БД в тестах
 */

import { Pool } from 'pg';

let pool: Pool | null = null;

/**
 * Получает connection pool для тестов
 */
export function getTestPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || 'postgresql://test_user:test_password@localhost:54323/test_db';
    pool = new Pool({
      connectionString,
      max: 5,
    });
  }
  return pool;
}

/**
 * Очищает тестовые данные из БД
 */
export async function cleanupTestData(): Promise<void> {
  const testPool = getTestPool();
  
  // Удаляем тестовые данные (адаптируйте под вашу схему)
  await testPool.query('DELETE FROM form_submissions WHERE email LIKE $1', ['test%@example.com']);
  await testPool.query('DELETE FROM conference_registrations WHERE email LIKE $1', ['test%@example.com']);
  await testPool.query('DELETE FROM news WHERE title LIKE $1', ['%TEST%']);
}

/**
 * Закрывает connection pool
 */
export async function closeTestPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Выполняет транзакцию с автоматическим откатом
 */
export async function withTransaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const testPool = getTestPool();
  const client = await testPool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('ROLLBACK'); // Всегда откатываем в тестах
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
