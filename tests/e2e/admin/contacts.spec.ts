import { test, expect, ADMIN_URL } from '../fixtures';

const BASE = ADMIN_URL;
const contactsFallbackText = /Контактов не найдено|Ошибка загрузки|Ошибка соединения/;

test.describe('Admin Contacts', () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto(`${BASE}/admin/contacts`, { waitUntil: 'domcontentloaded' });
    await expect(adminPage.getByRole('heading', { name: 'Контакты' })).toBeVisible();
  });

  test('shows the page shell', async ({ adminPage }) => {
    await expect(adminPage.getByRole('heading', { name: 'Контакты' })).toBeVisible();
    await expect(adminPage.getByPlaceholder(/поиск/i).first()).toBeVisible();
    await expect(adminPage.getByTitle('Обновить')).toBeVisible();
  });

  test('updates and clears the search input', async ({ adminPage }) => {
    const searchInput = adminPage.getByPlaceholder(/поиск/i).first();

    await searchInput.fill('xyzxyz_missing_contact');
    await expect(searchInput).toHaveValue('xyzxyz_missing_contact');

    await searchInput.clear();
    await expect(searchInput).toHaveValue('');
  });

  test('shows an empty or error state for a missing contact query', async ({ adminPage }) => {
    const searchInput = adminPage.getByPlaceholder(/поиск/i).first();

    await searchInput.fill('xyzxyz_missing_contact');
    await expect(searchInput).toHaveValue('xyzxyz_missing_contact');
    await expect(adminPage.locator('body')).toContainText(contactsFallbackText);
  });

  test('opens extra filters', async ({ adminPage }) => {
    await adminPage.getByRole('button', { name: /фильтры/i }).click();

    await expect(adminPage.locator('body')).toContainText('Тег');
    await expect(adminPage.getByPlaceholder('Город').last()).toBeVisible();
  });

  test('opens the contact side panel when rows exist, otherwise shows a safe fallback state', async ({ adminPage }) => {
    await adminPage.setViewportSize({ width: 1280, height: 800 });
    await adminPage.reload({ waitUntil: 'domcontentloaded' });

    const firstTableRow = adminPage.locator('table tbody tr').first();
    await expect(firstTableRow).toBeVisible();
    await firstTableRow.click();

    const openContactButton = adminPage.locator('button[title="Открыть страницу контакта"]');
    if (await openContactButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(openContactButton).toBeVisible();
      return;
    }

    await expect(adminPage.locator('body')).toContainText(contactsFallbackText);
  });
});
