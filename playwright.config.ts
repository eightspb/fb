import { defineConfig, devices } from '@playwright/test';
import { loadEnvConfig } from '@next/env';

const testProcessEnv = process.env as Record<string, string | undefined>;
testProcessEnv.NODE_ENV ??= 'test';

// Для Playwright используем test env, чтобы не зависеть от локального DevRemote/.env.local.
loadEnvConfig(process.cwd());

const SITE_PORT = process.env.PLAYWRIGHT_SITE_PORT || '3100';
const ADMIN_PORT = process.env.PLAYWRIGHT_ADMIN_PORT || '3101';
const SITE_URL = process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${SITE_PORT}`;
const ADMIN_URL = process.env.PLAYWRIGHT_ADMIN_URL || `http://localhost:${ADMIN_PORT}`;

process.env.PLAYWRIGHT_BASE_URL = SITE_URL;
process.env.PLAYWRIGHT_ADMIN_URL = ADMIN_URL;
process.env.NEXT_PUBLIC_SITE_URL ??= SITE_URL;

/**
 * Playwright конфигурация для E2E тестов
 * Testcontainers настраивается в отдельных файлах тестов
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Максимальное время выполнения одного теста */
  timeout: 90 * 1000,
  expect: {
    /* Timeout для expect assertions */
    timeout: 10 * 1000,
  },
  /* Запуск тестов в параллель */
  fullyParallel: false,
  /* Fail сборку если есть упавшие тесты */
  forbidOnly: !!process.env.CI,
  /* Retry только в CI */
  retries: process.env.CI ? 2 : 0,
  /* Оптимальное количество воркеров */
  workers: process.env.CI ? 1 : 2,
  /* Репортер для CI */
  reporter: process.env.CI
    ? [['html'], ['json', { outputFile: 'playwright-report/results.json' }]]
    : [['html'], ['list']],
  /* Общие настройки для всех проектов */
  use: {
    /* Base URL для тестов (site). Admin URL передаётся через PLAYWRIGHT_ADMIN_URL в fixtures.ts */
    baseURL: SITE_URL,
    /* Trace для отладки */
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    /* Скриншоты при ошибках */
    screenshot: 'only-on-failure',
    /* Видео при ошибках */
    video: 'retain-on-failure',
  },

  /* Конфигурация проектов для разных браузеров */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        actionTimeout: 10 * 1000,
        navigationTimeout: 30 * 1000,
      },
    },
    // Можно добавить другие браузеры для CI
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* Запуск site + admin серверов перед тестами */
  webServer: [
    {
      command: `ADMIN_APP_ORIGIN=${ADMIN_URL} NEXT_PUBLIC_SITE_URL=${SITE_URL} bunx next dev --turbopack -p ${SITE_PORT}`,
      url: SITE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: `ADMIN_API_ORIGIN=${SITE_URL} NEXT_PUBLIC_SITE_URL=${SITE_URL} bunx next dev apps/admin -p ${ADMIN_PORT}`,
      url: `${ADMIN_URL}/admin/login`,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
