import { test, expect, ADMIN_URL } from '../fixtures';

const BASE = ADMIN_URL;
const quickLinkTargets = [
  '/admin/requests',
  '/admin/contacts',
  '/admin/news',
  '/admin/conferences',
  '/admin/banner',
  '/admin/direct',
];

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
    await expect(adminPage.getByRole('heading', { name: 'Обзор' })).toBeVisible();
  });

  test('shows the dashboard heading', async ({ adminPage }) => {
    await expect(adminPage.locator('body')).toContainText('Панель управления сайтом fibroadenoma.net');
    await expect(adminPage.getByText('Быстрые переходы')).toBeVisible();
  });

  test('shows all quick links', async ({ adminPage }) => {
    for (const href of quickLinkTargets) {
      await expect(adminPage.locator(`a[href="${href}"]`).first()).toBeVisible();
    }
  });

  test('navigates to requests', async ({ adminPage }) => {
    await adminPage.locator('a[href="/admin/requests"]').first().click();
    await expect(adminPage).toHaveURL(/\/admin\/requests/, { timeout: 10000 });
    await expect(adminPage.getByRole('heading', { name: 'Заявки' })).toBeVisible();
  });

  test('navigates to contacts', async ({ adminPage }) => {
    await adminPage.locator('a[href="/admin/contacts"]').first().click();
    await expect(adminPage).toHaveURL(/\/admin\/contacts/, { timeout: 10000 });
    await expect(adminPage.getByRole('heading', { name: 'Контакты' })).toBeVisible();
  });

  test('navigates to news', async ({ adminPage }) => {
    await adminPage.locator('a[href="/admin/news"]').first().click();
    await expect(adminPage).toHaveURL(/\/admin\/news/, { timeout: 10000 });
  });

  test('navigates to conferences', async ({ adminPage }) => {
    await adminPage.locator('a[href="/admin/conferences"]').first().click();
    await expect(adminPage).toHaveURL(/\/admin\/conferences/, { timeout: 10000 });
  });
});
