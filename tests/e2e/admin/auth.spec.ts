import { test as base, expect, type Page } from '@playwright/test';
import { test as authTest, ADMIN_URL, SITE_URL } from '../fixtures';

const ADMIN_BASE = ADMIN_URL;

async function openLogin(page: Page) {
  await page.goto(`${ADMIN_BASE}/admin/login`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
}

async function solveCaptcha(page: Page) {
  await page.getByText('Я не робот').click();
  await expect(page.locator('[data-testid="login-form"]')).toContainText('Проверка пройдена успешно');
  await page.waitForTimeout(150);
}

base.describe('Login page', () => {
  base.beforeEach(async ({ page }) => {
    await openLogin(page);
  });

  base('shows the login form', async ({ page }) => {
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-form"] button[type="submit"]')).toBeVisible();
    await expect(page.locator('body')).toContainText('fibroadenoma.net');
  });

  base('shows an error for an invalid password', async ({ page }) => {
    await page.locator('input[type="password"]').fill('wrong-password-12345');
    await solveCaptcha(page);

    await page.locator('[data-testid="login-form"] button[type="submit"]').click();

    await expect(page.locator('[data-testid="login-form"]')).toContainText('Неверный пароль');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  base('shows an error when captcha is not completed', async ({ page }) => {
    await page.locator('input[type="password"]').fill('admin123');
    await page.locator('[data-testid="login-form"] button[type="submit"]').click();

    await expect(page.locator('[data-testid="login-form"]')).toContainText('CAPTCHA');
  });
});

base.describe('Auth redirects', () => {
  const protectedRoutes = [
    '/admin',
    '/admin/requests',
    '/admin/contacts',
    '/admin/news',
    '/admin/conferences',
    '/admin/banner',
  ];

  for (const route of protectedRoutes) {
    base(`redirects ${route} to /admin/login`, async ({ page }) => {
      await page.goto(`${ADMIN_BASE}${route}`, { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/admin\/login/, { timeout: 10000 });
    });
  }
});

authTest.describe('Authenticated admin session', () => {
  authTest('sets the admin-session cookie', async ({ adminPage }) => {
    const cookies = await adminPage.context().cookies();
    const session = cookies.find((cookie) => cookie.name === 'admin-session');

    expect(session).toBeDefined();
    expect(session?.value.length).toBeGreaterThan(10);
  });

  authTest('opens the dashboard without redirecting to login', async ({ adminPage }) => {
    await adminPage.goto(`${ADMIN_BASE}/admin`, { waitUntil: 'domcontentloaded' });
    await expect(adminPage).not.toHaveURL(/\/admin\/login/);
    await expect(adminPage.getByRole('heading', { name: 'Обзор' })).toBeVisible();
  });

  authTest('returns authenticated: true from GET /api/admin/auth', async ({ adminPage }) => {
    const response = await adminPage.request.get(`${SITE_URL}/api/admin/auth`);

    expect(response.ok()).toBe(true);
    expect((await response.json()).authenticated).toBe(true);
  });

  authTest('keeps the session after reload', async ({ adminPage }) => {
    await adminPage.goto(`${ADMIN_BASE}/admin`, { waitUntil: 'domcontentloaded' });
    await adminPage.reload({ waitUntil: 'domcontentloaded' });
    await expect(adminPage).not.toHaveURL(/\/admin\/login/);
  });

  authTest('clears the session after DELETE /api/admin/auth', async ({ adminPage }) => {
    const response = await adminPage.request.delete(`${SITE_URL}/api/admin/auth`);

    expect(response.ok()).toBe(true);

    await adminPage.goto(`${ADMIN_BASE}/admin`, { waitUntil: 'domcontentloaded' });
    await expect(adminPage).toHaveURL(/\/admin\/login/, { timeout: 10000 });
  });
});
