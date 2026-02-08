/**
 * E2E тесты для форм
 * Тестирование отправки форм с интеграцией Telegram и Email
 */

import { test, expect } from '@playwright/test';

test.describe('Contact Forms', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should submit contact form successfully', async ({ page }) => {
    // Перехватываем запрос к API
    let apiRequest: any = null;
    await page.route('**/api/contact', async (route) => {
      apiRequest = route.request();
      await route.fulfill({
        status: 200,
        json: { success: true, message: 'Сообщение отправлено' },
      });
    });

    // Находим форму контактов (может быть на главной странице или отдельной странице)
    // Адаптируйте селекторы под вашу структуру
    const nameInput = page.locator('input[name="name"], input[placeholder*="имя" i]').first();
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    const messageInput = page.locator('textarea[name="message"], textarea[placeholder*="сообщение" i]').first();
    const submitButton = page.getByRole('button', { name: /отправить|send/i });

    if (await nameInput.isVisible()) {
      await nameInput.fill('Test User');
      await emailInput.fill('test@example.com');
      await messageInput.fill('Test message');
      
      await submitButton.click();
      
      // Ждем успешного ответа
      await expect(page.getByText(/отправлено|success/i)).toBeVisible({ timeout: 10000 });
      
      // Проверяем, что запрос был отправлен
      expect(apiRequest).not.toBeNull();
    }
  });

  test('should validate required fields', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /отправить|send/i });
    
    if (await submitButton.isVisible()) {
      // Пытаемся отправить пустую форму
      await submitButton.click();
      
      // Должны появиться сообщения об ошибках валидации
      // Адаптируйте под вашу реализацию валидации
      const errorMessages = page.locator('[role="alert"], .error, [class*="error"]');
      const count = await errorMessages.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should handle form submission errors gracefully', async ({ page }) => {
    // Мокаем ошибку сервера
    await page.route('**/api/contact', async (route) => {
      await route.fulfill({
        status: 500,
        json: { error: 'Внутренняя ошибка сервера' },
      });
    });

    const nameInput = page.locator('input[name="name"]').first();
    const emailInput = page.locator('input[name="email"]').first();
    const messageInput = page.locator('textarea[name="message"]').first();
    const submitButton = page.getByRole('button', { name: /отправить|send/i });

    if (await nameInput.isVisible()) {
      await nameInput.fill('Test User');
      await emailInput.fill('test@example.com');
      await messageInput.fill('Test message');
      
      await submitButton.click();
      
      // Должно появиться сообщение об ошибке
      await expect(page.getByText(/ошибка|error/i)).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Conference Registration Form', () => {
  test('should register for conference', async ({ page }) => {
    // Переходим на страницу конференции
    await page.goto('/conferences/sms3');
    
    // Перехватываем запрос регистрации
    let registrationRequest: any = null;
    await page.route('**/api/conferences/register', async (route) => {
      registrationRequest = route.request();
      await route.fulfill({
        status: 200,
        json: { success: true, message: 'Регистрация успешна' },
      });
    });

    // Ищем форму регистрации
    const registerButton = page.getByRole('button', { name: /зарегистрироваться|register/i });
    
    if (await registerButton.isVisible()) {
      await registerButton.click();
      
      // Заполняем форму (адаптируйте под вашу структуру)
      const nameInput = page.locator('input[name="name"]').first();
      const emailInput = page.locator('input[name="email"]').first();
      
      if (await nameInput.isVisible()) {
        await nameInput.fill('Test User');
        await emailInput.fill('test@example.com');
        
        const submitButton = page.getByRole('button', { name: /отправить|submit/i });
        await submitButton.click();
        
        // Ждем подтверждения
        await expect(page.getByText(/успешно|success/i)).toBeVisible({ timeout: 10000 });
        expect(registrationRequest).not.toBeNull();
      }
    }
  });
});
