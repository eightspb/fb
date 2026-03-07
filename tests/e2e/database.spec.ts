/**
 * E2E tests for database integration via Testcontainers.
 */

import { test, expect } from '@playwright/test';
import { startTestDatabase, stopTestDatabase, getDatabaseUrl } from './testcontainers-setup';
import { Pool } from 'pg';

let pool: Pool | null = null;
let startupError: string | null = null;

test.describe('Database Integration Tests', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    try {
      await startTestDatabase();
    } catch (error) {
      startupError = error instanceof Error ? error.message : 'Testcontainers runtime is unavailable';
      return;
    }

    pool = new Pool({
      connectionString: getDatabaseUrl(),
    });
  });

  test.afterAll(async () => {
    if (pool) {
      await pool.end();
      pool = null;
    }

    await stopTestDatabase();
  });

  test('should connect to test database', async () => {
    test.skip(!!startupError, startupError ?? undefined);
    expect(pool).not.toBeNull();

    const result = await pool!.query('SELECT NOW()');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].now).toBeDefined();
  });

  test('should create and read data', async () => {
    test.skip(!!startupError, startupError ?? undefined);

    const insertResult = await pool!.query(
      'INSERT INTO form_submissions (name, email, message, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
      ['Test User', 'test@example.com', 'Test message'],
    );

    expect(insertResult.rows).toHaveLength(1);
    const id = insertResult.rows[0].id;

    const selectResult = await pool!.query(
      'SELECT * FROM form_submissions WHERE id = $1',
      [id],
    );

    expect(selectResult.rows).toHaveLength(1);
    expect(selectResult.rows[0].name).toBe('Test User');
    expect(selectResult.rows[0].email).toBe('test@example.com');

    await pool!.query('DELETE FROM form_submissions WHERE id = $1', [id]);
  });

  test('should handle transactions correctly', async () => {
    test.skip(!!startupError, startupError ?? undefined);
    const client = await pool!.connect();

    try {
      await client.query('BEGIN');

      const insertResult = await client.query(
        'INSERT INTO form_submissions (name, email, message, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id',
        ['Transaction Test', 'tx@example.com', 'Test'],
      );

      const id = insertResult.rows[0].id;

      await client.query('ROLLBACK');

      const checkResult = await client.query(
        'SELECT * FROM form_submissions WHERE id = $1',
        [id],
      );

      expect(checkResult.rows).toHaveLength(0);
    } finally {
      client.release();
    }
  });
});
