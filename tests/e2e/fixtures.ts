/**
 * Playwright fixtures: авторизованный контекст браузера.
 *
 * Логин через прямой POST к /api/admin/auth (без captcha — captcha только в UI).
 * Все тесты, которым нужна админка, используют `{ page }` из этого файла.
 */

import { test as base, expect, type Page } from '@playwright/test';

const SITE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const ADMIN_URL = process.env.PLAYWRIGHT_ADMIN_URL || 'http://localhost:3001';

async function loginViaApi(page: Page) {
  // Логинимся через API site (порт 3000) — там живёт /api/admin/auth
  const response = await page.request.post(`${SITE_URL}/api/admin/auth`, {
    data: { password: process.env.ADMIN_PASSWORD || 'admin123' },
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok()) {
    throw new Error(`Login failed: ${response.status()} ${await response.text()}`);
  }

  // Кука admin-session устанавливается на site (localhost:3000).
  // Admin app (localhost:3001) проксирует /api/* в site и разделяет cookies.
  // Ставим куку вручную на оба origin.
  const cookies = response.headers()['set-cookie'];
  if (!cookies) throw new Error('No set-cookie header in auth response');

  const match = cookies.match(/admin-session=([^;]+)/);
  if (!match) throw new Error('admin-session cookie not found');
  const cookieValue = match[1];

  for (const origin of [SITE_URL, ADMIN_URL]) {
    const url = new URL(origin);
    await page.context().addCookies([{
      name: 'admin-session',
      value: cookieValue,
      domain: url.hostname,
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    }]);
  }
}

type Fixtures = {
  adminPage: Page;
};

export const test = base.extend<Fixtures>({
  adminPage: async ({ page }, run) => {
    await loginViaApi(page);
    await run(page);
  },
});

export { expect };
export { ADMIN_URL, SITE_URL };
