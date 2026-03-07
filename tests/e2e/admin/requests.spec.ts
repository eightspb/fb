import type { Page } from '@playwright/test';
import { test, expect, ADMIN_URL } from '../fixtures';

const BASE = ADMIN_URL;
const requestsFallbackText = /Заявок не найдено|Ошибка загрузки заявок|Ошибка соединения/;

async function openRequests(adminPage: Page) {
  await adminPage.goto(`${BASE}/admin/requests`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await expect(adminPage.getByRole('heading', { name: 'Заявки' })).toBeVisible();
}

test.describe('Admin Requests', () => {
  test.beforeEach(async ({ adminPage }) => {
    await openRequests(adminPage);
  });

  test('shows the page shell', async ({ adminPage }) => {
    await expect(adminPage.getByRole('heading', { name: 'Заявки' })).toBeVisible();
    await expect(adminPage.getByTitle('Обновить')).toBeVisible();
    await expect(adminPage.getByRole('button', { name: 'Экспорт CSV' })).toBeVisible();
    await expect(adminPage.getByPlaceholder(/поиск по имени/i)).toBeVisible();
    await expect(adminPage.locator('select').first()).toBeVisible();
    await expect(adminPage.locator('select').nth(1)).toBeVisible();
  });

  test('updates and resets the search input', async ({ adminPage }) => {
    const searchInput = adminPage.getByPlaceholder(/поиск по имени/i);

    await searchInput.fill('xyzxyz_missing_request');
    await expect(searchInput).toHaveValue('xyzxyz_missing_request');

    const resetButton = adminPage.getByRole('button', { name: /сбросить/i });
    await expect(resetButton).toBeVisible();
    await resetButton.click();

    await expect(searchInput).toHaveValue('');
  });

  test('opens advanced filters', async ({ adminPage }) => {
    await adminPage.getByRole('button', { name: /фильтры/i }).click();

    await expect(adminPage.locator('body')).toContainText('Приоритет');
    await expect(adminPage.locator('body')).toContainText('Дата от');
    await expect(adminPage.locator('body')).toContainText('Дата до');
  });

  test('allows changing the type and status filters', async ({ adminPage }) => {
    const typeSelect = adminPage.locator('select').first();
    const statusSelect = adminPage.locator('select').nth(1);

    await typeSelect.selectOption('contact');
    await expect(typeSelect).toHaveValue('contact');

    await statusSelect.selectOption('new');
    await expect(statusSelect).toHaveValue('new');

    await expect(adminPage.getByRole('heading', { name: 'Заявки' })).toBeVisible();
  });

  test('renders desktop table headers', async ({ adminPage }) => {
    await adminPage.setViewportSize({ width: 1280, height: 800 });
    await adminPage.reload({ waitUntil: 'domcontentloaded' });

    await expect(adminPage.getByRole('columnheader', { name: 'Дата' })).toBeVisible();
    await expect(adminPage.getByRole('columnheader', { name: 'Тип' })).toBeVisible();
    await expect(adminPage.getByRole('columnheader', { name: 'Контакт' })).toBeVisible();
    await expect(adminPage.getByRole('columnheader', { name: 'Статус' })).toBeVisible();
  });

  test('keeps the page stable when sorting on desktop', async ({ adminPage }) => {
    await adminPage.setViewportSize({ width: 1280, height: 800 });
    await adminPage.reload({ waitUntil: 'domcontentloaded' });

    const dateHeader = adminPage.locator('th').filter({ hasText: 'Дата' });
    await dateHeader.click();
    await dateHeader.click();

    await expect(adminPage.getByRole('heading', { name: 'Заявки' })).toBeVisible();
  });

  test('opens request details when rows exist, otherwise shows a safe fallback state', async ({ adminPage }) => {
    await adminPage.setViewportSize({ width: 1280, height: 800 });
    await adminPage.reload({ waitUntil: 'domcontentloaded' });

    const quickViewButtons = adminPage.locator('button[title="Быстрый просмотр"]');
    if (await quickViewButtons.count()) {
      await quickViewButtons.first().click({ force: true });
      await expect(adminPage.locator('body')).toContainText('Открыть полную карточку');
      return;
    }

    await expect(adminPage.locator('body')).toContainText(requestsFallbackText);
  });
});
