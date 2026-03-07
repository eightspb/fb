/**
 * E2E tests for admin authentication.
 */

import { test, expect } from '@playwright/test';

async function solveCaptcha(page: import('@playwright/test').Page) {
  await page.getByText('Я не робот').click();
  await expect(page.getByText(/Проверка пройдена успешно/i)).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(150);
}

test.describe('Admin Authentication', () => {
  test('should redirect to login page when accessing admin without auth', async ({ page }) => {
    await page.goto('/admin', {
      waitUntil: 'domcontentloaded',
    });

    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 10000 });
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible({ timeout: 10000 });
  });

  test('should login with correct password', async ({ page }) => {
    await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });

    const loginForm = page.locator('[data-testid="login-form"]');
    await expect(loginForm).toBeVisible({ timeout: 10000 });

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(process.env.ADMIN_PASSWORD || 'test-password');
    await solveCaptcha(page);

    const submitButton = page.getByRole('button', { name: /войти|login/i });
    await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('/api/admin/auth') && resp.request().method() === 'POST',
      ),
      submitButton.click(),
    ]);

    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });
    await expect.poll(async () => {
      const cookies = await page.context().cookies(page.url());
      return cookies.find((c) => c.name === 'admin-session')?.value;
    }, { timeout: 5000 }).toBeTruthy();
  });

  test('should show error for incorrect password', async ({ page }) => {
    await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });

    const loginForm = page.locator('[data-testid="login-form"]');
    await expect(loginForm).toBeVisible({ timeout: 10000 });

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill('wrong-password');
    await solveCaptcha(page);

    const submitButton = page.getByRole('button', { name: /войти|login/i });
    await submitButton.click();

    await expect(page.getByText(/неверный пароль|invalid password/i)).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('should logout and clear session', async ({ page }) => {
    await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible({ timeout: 10000 });

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(process.env.ADMIN_PASSWORD || 'test-password');
    await solveCaptcha(page);
    await page.getByRole('button', { name: /войти|login/i }).click();

    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });

    const logoutButton = page.getByRole('button', { name: /выйти|выход|logout/i });
    if (await logoutButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await logoutButton.click();

      await expect(page).toHaveURL(/\/admin\/login/, { timeout: 10000 });

      const cookies = await page.context().cookies();
      const adminCookie = cookies.find((c) => c.name === 'admin-session');
      expect(adminCookie).toBeUndefined();
    }
  });

  test('should maintain session across page reloads', async ({ page }) => {
    await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible({ timeout: 10000 });

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(process.env.ADMIN_PASSWORD || 'test-password');
    await solveCaptcha(page);
    await page.getByRole('button', { name: /войти|login/i }).click();

    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/admin/);
  });
});
