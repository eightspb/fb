import { defineConfig, devices } from '@playwright/test';
import { loadEnvConfig } from '@next/env';

// Загружаем .env, .env.local и т.д. как Next.js
loadEnvConfig(process.cwd());

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
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
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
      command: 'bun run dev:site',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'bun run dev:admin',
      url: 'http://localhost:3001/admin/login',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
