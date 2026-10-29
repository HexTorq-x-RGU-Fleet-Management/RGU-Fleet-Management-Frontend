import { test, expect, type Page } from '@playwright/test';

let fixture: any;

test.beforeAll(async () => {
  const response = await fetch('http://127.0.0.1:8109/__acceptance/config');
  if (!response.ok) throw Error('Start the isolated acceptance API from the selected backend first.');
  fixture = await response.json();
});

test.beforeEach(async () => {
  expect((await fetch('http://127.0.0.1:8109/__acceptance/reset', { method: 'POST' })).ok).toBe(
    true,
  );
});

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email address', { exact: true }).fill(fixture.admin.email);
  await page.getByLabel('Password', { exact: true }).fill(fixture.admin.password);
  await page.getByRole('button', { name: 'Sign in to workspace', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
}

test('all public workspace routes fit phone and tablet viewports', async ({ page }) => {
  const routes = [
    '/',
    '/buses',
    '/cameras',
    '/recordings',
    '/team',
    '/activity',
    '/settings',
    '/platform',
    '/health',
    '/tracking',
  ];

  for (const viewport of [
    { width: 320, height: 720 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
  ]) {
    await page.setViewportSize(viewport);
    await login(page);

    for (const route of routes) {
      await page.goto(route);
      await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
        true,
      );
    }
  }
});

test('mobile navigation opens, closes, and keeps the larger logo contained', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.getByRole('button', { name: 'Open navigation' }).click();

  const sidebar = page.getByRole('complementary', { name: 'Workspace sidebar' });
  const logo = sidebar.locator('.brand-symbol');
  await expect(logo).toHaveCSS('width', '48px');
  expect((await logo.boundingBox())!.width).toBe(48);
  expect(await sidebar.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);

  await page.getByLabel('Close navigation').click();
  await expect(sidebar).not.toHaveClass(/sidebar-open/);
});
