import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      // Используем React 19
      jsxRuntime: 'automatic',
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'tests/e2e'],
    coverage: {
      provider: 'v8',
      all: false,
      reporter: ['text', 'json', 'html', 'lcov'],
      excludeAfterRemap: true,
      exclude: [
        'node_modules/',
        'tests/',
        '.tmp_push_fix_*/',
        '**/.tmp_push_fix_*/**',
        'coverage/',
        'playwright-report/',
        'test-results/',
        '**/*.d.ts',
        '**/*.config.{ts,js}',
        '**/types/**',
        '.next/',
        '**/.next/**',
        'apps/**/.next/**',
        '**/__mocks__/**',
        '**/coverage/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    // Timeout для тестов (30 секунд)
    testTimeout: 30000,
    // Hook timeout (10 секунд)
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
