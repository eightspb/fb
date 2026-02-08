/**
 * E2E тесты с Testcontainers для работы с реальной БД
 * Тестирование интеграции с PostgreSQL через Docker контейнер
 */

import { test, expect } from '@playwright/test';
import { startTestDatabase, stopTestDatabase, getDatabaseUrl } from './testcontainers-setup';
import { Pool } from 'pg';

let pool: Pool | null = null;

test.describe('Database Integration Tests', () => {
  test.beforeAll(async () => {
    // Запускаем PostgreSQL контейнер
    await startTestDatabase();
    
    // Создаем connection pool
    pool = new Pool({
      connectionString: getDatabaseUrl(),
    });
  });

  test.afterAll(async () => {
    // Закрываем connection pool
    if (pool) {
      await pool.end();
      pool = null;
    }
    
    // Останавливаем контейнер
    await stopTestDatabase();
  });

  test('should connect to test database', async () => {
    expect(pool).not.toBeNull();
    
    const result = await pool!.query('SELECT NOW()');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].now).toBeDefined();
  });

  test('should create and read data', async () => {
    // Пример: создаем тестовую запись
    const insertResult = await pool!.query(
      'INSERT INTO form_submissions (name, email, message, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
      ['Test User', 'test@example.com', 'Test message']
    );

    expect(insertResult.rows).toHaveLength(1);
    const id = insertResult.rows[0].id;

    // Читаем созданную запись
    const selectResult = await pool!.query(
      'SELECT * FROM form_submissions WHERE id = $1',
      [id]
    );

    expect(selectResult.rows).toHaveLength(1);
    expect(selectResult.rows[0].name).toBe('Test User');
    expect(selectResult.rows[0].email).toBe('test@example.com');

    // Очищаем тестовые данные
    await pool!.query('DELETE FROM form_submissions WHERE id = $1', [id]);
  });

  test('should handle transactions correctly', async () => {
    const client = await pool!.connect();
    
    try {
      await client.query('BEGIN');
      
      const insertResult = await client.query(
        'INSERT INTO form_submissions (name, email, message, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
        ['Transaction Test', 'tx@example.com', 'Test']
      );
      
      const id = insertResult.rows[0].id;
      
      // Откатываем транзакцию
      await client.query('ROLLBACK');
      
      // Проверяем, что данные не сохранились
      const checkResult = await client.query(
        'SELECT * FROM form_submissions WHERE id = $1',
        [id]
      );
      
      expect(checkResult.rows).toHaveLength(0);
    } finally {
      client.release();
    }
  });
});
