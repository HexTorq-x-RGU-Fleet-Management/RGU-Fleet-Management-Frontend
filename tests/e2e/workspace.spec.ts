import { test, expect } from '@playwright/test';
test('overview and search have no hydration or browser errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Everything in view.' })).toBeVisible();
  await expect(page.locator('.recorder-card')).toHaveCount(5);
  await page.getByRole('button', { name: 'Available', exact: true }).click();
  await expect(page.locator('.recorder-card')).toHaveCount(4);
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByPlaceholder('Search cameras, pages or locations').fill('KPM 3');
  await page.getByRole('button', { name: 'KPM 3 Main campus' }).click();
  await expect(page).toHaveURL(/cameras/);
  await expect(page.locator('.camera-tile')).toHaveCount(8);
  expect(errors).toEqual([]);
});
test('grid selection, single selection, focus, zoom and layout persistence', async ({ page }) => {
  await page.goto('/cameras');
  await expect(page.locator('.camera-tile')).toHaveCount(8);
  await page.getByRole('combobox', { name: 'Camera grid' }).selectOption('4');
  await expect(page.locator('.camera-tile')).toHaveCount(4);
  await page.getByRole('button', { name: 'Select KPM 3 Camera 2', exact: true }).click();
  await expect(page.locator('.camera-tile')).toHaveCount(4);
  await page.getByRole('button', { name: 'Expand Camera 2', exact: true }).click();
  await expect(page.locator('.camera-tile')).toHaveCount(1);
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(page.locator('.zoom-controls')).toContainText('1.25x');
  await page.getByRole('button', { name: 'Select KPM 3 Camera 2', exact: true }).click();
  await expect(page.locator('.zoom-controls')).toContainText('1.25x');
  await page.getByRole('button', { name: 'Back to cameras' }).click();
  await expect(page.locator('.camera-tile')).toHaveCount(4);
  await page.getByRole('button', { name: 'Layouts', exact: true }).click();
  await page.getByLabel('Layout name').fill('Campus morning');
  await page.getByRole('button', { name: 'Save current layout' }).click();
  await expect(page.getByText('Campus morning', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.reload();
  await page.getByRole('button', { name: 'Layouts', exact: true }).click();
  await expect(page.getByText('Campus morning', { exact: true })).toBeVisible();
});
test('preview members can be added, edited and suspended with React dialogs', async ({ page }) => {
  await page.goto('/team');
  await page.getByRole('button', { name: 'Add preview member' }).click();
  await page.getByLabel('Full name', { exact: true }).fill('Taylor Test');
  await page.getByLabel('Email address', { exact: true }).fill('taylor@example.test');
  await page.getByRole('checkbox', { name: 'KPM 3 Main campus' }).check();
  await page.getByRole('button', { name: 'Save preview member' }).click();
  await expect(page.getByRole('cell', { name: 'Taylor Test taylor@example.test' })).toBeVisible();
  await page.getByRole('button', { name: 'Suspend Taylor Test' }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Suspend member', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Taylor Test' })).toContainText('Suspended');
});
test('settings, theme and reduced motion persist after refresh', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  await page.getByRole('switch', { name: 'Reduce motion' }).click();
  await page.getByRole('button', { name: 'Save preferences' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('switch', { name: 'Reduce motion' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
});
test('preview roles protect administrative routes and approvals use confirmation', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('.profile-button').click();
  await page.getByRole('menuitem', { name: 'Team member', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Team & access' })).toHaveCount(0);
  await page.goto('/platform');
  await expect(
    page.getByRole('heading', { name: 'Platform owner access required.' }),
  ).toBeVisible();
  await page.locator('.profile-button').click();
  await page.getByRole('menuitem', { name: 'Platform owner', exact: true }).click();
  await page.goto('/platform');
  await page.getByRole('button', { name: 'Approve', exact: true }).first().click();
  await page.getByRole('button', { name: 'Approve workspace', exact: true }).click();
  await expect(page.getByText('Approved', { exact: true })).toBeVisible();
});
test('React login reports unconfigured backend without creating a fake session', async ({
  page,
}) => {
  page.on('dialog', () => {
    throw Error('Native JavaScript dialogs are forbidden');
  });
  await page.goto('/login');
  await page.getByLabel('Email address', { exact: true }).fill('viewer@example.test');
  await page.getByLabel('Password', { exact: true }).fill('test-password-only');
  await page.getByRole('button', { name: 'Sign in to workspace', exact: true }).click();
  await expect(
    page.getByText('The camera backend is not configured yet.', { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
});
test('snapshot and actual preview recording persist and can be deleted', async ({ page }) => {
  await page.goto('/cameras');
  const snapshot = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Snapshot', exact: true }).click();
  expect((await snapshot).suggestedFilename()).toContain('.jpg');
  await page.getByRole('button', { name: 'Record preview', exact: true }).click();
  await expect(page.getByRole('button', { name: /Stop 0:/ })).toBeVisible();
  await page.waitForTimeout(1800);
  await page.getByRole('button', { name: /Stop 0:/ }).click();
  await expect(page.getByText('Preview clip saved in Recordings.')).toBeVisible();
  await page.goto('/recordings');
  await expect(page.locator('.clip-card')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.clip-card')).toHaveCount(1);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  expect((await download).suggestedFilename()).toContain('.webm');
  await page.getByRole('button', { name: /Delete KPM/ }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.locator('.clip-card')).toHaveCount(0);
});
test('mobile navigation and core pages fit the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('link', { name: 'Camera workspace', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Camera workspace', exact: true }).click();
  await expect(page.locator('.camera-tile')).toHaveCount(8);
  for (const route of ['/', '/cameras', '/settings', '/recordings', '/login']) {
    await page.goto(route);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  }
});

test.describe('standard animation preference', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('GSAP entry and Framer reveal finish and Lenis scroll stays usable', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.stat-card').first()).toHaveCSS('opacity', '1');
    for (const card of await page.locator('.recorder-grid > div').all()) {
      await card.scrollIntoViewIfNeeded();
      await expect(card).toHaveCSS('opacity', '1');
    }
    await page.evaluate(() => scrollTo(0, 0));
  });
});
