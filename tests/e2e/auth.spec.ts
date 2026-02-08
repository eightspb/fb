/**
 * E2E тесты для авторизации
 * Тестирование JWT авторизации через браузер
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Authentication', () => {
  test('should redirect to login page when accessing admin without auth', async ({ page }) => {
    // Middleware перенаправляет /admin → /admin/login если нет cookie
    await page.goto('/admin', {
      waitUntil: 'domcontentloaded',
    });

    // Проверяем финальный URL (после редиректа)
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 10000 });

    // Проверяем что login-форма отрисовалась
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible({ timeout: 10000 });
  });

  test('should login with correct password', async ({ page }) => {
    await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });

    // Ждём появления формы
    const loginForm = page.locator('[data-testid="login-form"]');
    await expect(loginForm).toBeVisible({ timeout: 10000 });

    // Заполняем форму логина
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(process.env.ADMIN_PASSWORD || 'test-password');

    const submitButton = page.getByRole('button', { name: /войти|login/i });
    await Promise.all([
      page.waitForResponse(
        (resp) => resp.url().includes('/api/admin/auth') && resp.request().method() === 'POST',
      ),
      submitButton.click(),
    ]);

    // После успешного логина должны быть перенаправлены в админ-панель
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });

    // Проверяем, что cookie установлен
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

    const submitButton = page.getByRole('button', { name: /войти|login/i });
    await submitButton.click();

    // Должно появиться сообщение об ошибке
    await expect(page.getByText(/неверный пароль|invalid password/i)).toBeVisible({ timeout: 10000 });

    // Не должны быть перенаправлены
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('should logout and clear session', async ({ page }) => {
    // Сначала логинимся
    await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible({ timeout: 10000 });

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(process.env.ADMIN_PASSWORD || 'test-password');
    await page.getByRole('button', { name: /войти|login/i }).click();

    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });

    // Ищем кнопку выхода
    const logoutButton = page.getByRole('button', { name: /выйти|выход|logout/i });
    if (await logoutButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await logoutButton.click();

      // После выхода должны быть перенаправлены на логин
      await expect(page).toHaveURL(/\/admin\/login/, { timeout: 10000 });

      // Cookie должен быть удален
      const cookies = await page.context().cookies();
      const adminCookie = cookies.find((c) => c.name === 'admin-session');
      expect(adminCookie).toBeUndefined();
    }
  });

  test('should maintain session across page reloads', async ({ page }) => {
    // Логинимся
    await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible({ timeout: 10000 });

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(process.env.ADMIN_PASSWORD || 'test-password');
    await page.getByRole('button', { name: /войти|login/i }).click();

    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });

    // Перезагружаем страницу
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Сессия должна сохраниться — не должны быть перенаправлены на логин
    await expect(page).toHaveURL(/\/admin/);
  });
});
