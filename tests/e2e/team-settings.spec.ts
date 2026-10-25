import { test, expect, type Page } from '@playwright/test';
let fixture: any;
test.beforeAll(async () => {
  fixture = await (await fetch('http://127.0.0.1:8109/__acceptance/config')).json();
});
test.beforeEach(async () => {
  expect((await fetch('http://127.0.0.1:8109/__acceptance/reset', { method: 'POST' })).ok).toBe(
    true,
  );
});
async function login(page: Page, role = 'admin') {
  await page.goto('/login');
  await page.getByLabel('Email address', { exact: true }).fill(fixture[role].email);
  await page.getByLabel('Password', { exact: true }).fill(fixture[role].password);
  await page.getByRole('button', { name: 'Sign in to workspace', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
}
test('admin member creation, recorder grants and suspension persist through the API', async ({
  page,
}) => {
  await login(page);
  await page.goto('/team');
  await page.getByRole('button', { name: 'Add team member', exact: true }).click();
  const name = 'API Member ' + Date.now(),
    email = 'member-' + Date.now() + '@acceptance.test';
  await page.getByLabel('Full name', { exact: true }).fill(name);
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page
    .getByLabel('Temporary password', { exact: true })
    .fill('member-ui-initial-password-123');
  const recorder = page
    .locator('fieldset')
    .filter({ has: page.locator('legend', { hasText: 'Acceptance recorder' }) });
  await recorder.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Save member', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: email })).toBeVisible();
  await page.reload();
  const row = page.getByRole('row').filter({ hasText: email });
  await expect(row).toContainText('active');
  await row.getByRole('button', { name: 'Suspend ' + name, exact: true }).click();
  await page.getByRole('button', { name: 'Suspend member', exact: true }).click();
  await expect(row).toContainText('suspended');
});
test('viewing preferences, real audit and platform monitoring read backend state', async ({
  page,
}) => {
  await login(page);
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Viewing preferences', exact: true }).click();
  await page.getByLabel('Appearance', { exact: true }).selectOption('light');
  await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Viewing preferences', exact: true }).click();
  await page.getByLabel('Appearance', { exact: true }).selectOption('dark');
  await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
  await page.goto('/activity');
  await expect(
    page.getByRole('cell', { name: 'fleet.bus_created', exact: true }).first(),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
  await login(page, 'platform');
  await page.goto('/health');
  await expect(page.getByRole('heading', { name: 'System health', exact: true })).toBeVisible();
  await expect(page.getByText('Backend memory', { exact: true })).toBeVisible();
});
