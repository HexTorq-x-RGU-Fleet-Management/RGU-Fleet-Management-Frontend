import { test, expect, type Page } from '@playwright/test';
let fixture: any;
test.beforeAll(async () => {
  const response = await fetch('http://127.0.0.1:8109/__acceptance/config');
  if (!response.ok) throw Error('Start the isolated acceptance API from backend-windows first.');
  fixture = await response.json();
});
test.beforeEach(async () => {
  const response = await fetch('http://127.0.0.1:8109/__acceptance/reset', { method: 'POST' });
  expect(response.ok).toBe(true);
});
async function login(page: Page, role = 'admin') {
  await page.goto('/login');
  await page.getByLabel('Email address', { exact: true }).fill(fixture[role].email);
  await page.getByLabel('Password', { exact: true }).fill(fixture[role].password);
  await page.getByRole('button', { name: 'Sign in to workspace', exact: true }).click();
  await expect(page).toHaveURL(role === 'platform' ? /\/platform$/ : /\/$/);
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
}
test('unauthenticated access redirects; pending accounts cannot enter', async ({ page }) => {
  await page.goto('/buses');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('.bus-card')).toHaveCount(0);
  await page.getByLabel('Email address', { exact: true }).fill(fixture.pending.email);
  await page.getByLabel('Password', { exact: true }).fill(fixture.pending.password);
  await page.getByRole('button', { name: 'Sign in to workspace', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: 'Account menu' })).toHaveCount(0);
});
test('backend buses persist on refresh and never leak to another workspace', async ({ page }) => {
  await login(page);
  await page.goto('/buses');
  await expect(page.locator('.bus-card')).toHaveCount(1);
  await expect(page.locator('.stat-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Add bus', exact: true }).click();
  const name = 'API bus ' + Date.now();
  await page.getByLabel('Bus number', { exact: true }).fill(name);
  await page.getByLabel('Registration', { exact: true }).fill('TN TEST ' + Date.now());
  await page.getByLabel('Driver name', { exact: true }).fill('API test operator');
  await page.getByRole('button', { name: 'Save bus', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Open ' + name, exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link', { name: 'Open ' + name, exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('rgu-preview-v1'))).toBeNull();
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
  await login(page, 'beta');
  await page.goto('/buses');
  await expect(page.locator('.bus-card')).toHaveCount(0);
  await expect(page.getByText(name, { exact: true })).toHaveCount(0);
});
test('real API inventory and channel grants drive member UI, with no role switch', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'rgu-preview-v1',
      JSON.stringify({ role: 'superadmin', buses: [{ id: 'injected', busNumber: 'Injected' }] }),
    ),
  );
  await login(page, 'member');
  await page.goto('/cameras');
  await expect(page.locator('.camera-tile')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Record clip', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Snapshot', exact: true })).toBeDisabled();
  await expect(
    page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Team & access' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Account menu' }).click();
  await expect(page.getByRole('menuitem', { name: 'Platform owner', exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  const forbidden = await page.request.post('http://127.0.0.1:8109/api/live/start', {
    headers: { 'X-Hik-Local': '1' },
    data: {
      deviceId: fixture.onlineRecorder,
      channel: 2,
      quality: 'sd',
      delivery: 'mjpeg',
      slot: 5,
    },
  });
  expect(forbidden.status()).toBe(403);
  await page.goto('/platform');
  await expect(
    page.getByRole('heading', { name: 'Platform owner access required.' }),
  ).toBeVisible();
});
test('React plays backend H264 frames, selects without focusing, and saves server clips', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page);
  await page.goto('/cameras?recorder=' + fixture.onlineRecorder);
  await expect(page.locator('.camera-tile')).toHaveCount(2);
  await expect(page.locator('.tile-status').first()).toHaveText('Live', { timeout: 20000 });
  await expect(page.getByRole('combobox', { name: 'Playback preference' })).toHaveValue('smooth');
  await expect
    .poll(() =>
      page
        .locator('canvas.live-camera-canvas')
        .first()
        .evaluate((c: HTMLCanvasElement) => c.width),
    )
    .toBe(320);
  await page.request.post('http://127.0.0.1:8109/__acceptance/drop');
  await expect(page.locator('.tile-status').first()).not.toHaveText('Live');
  await expect(page.locator('.tile-status').first()).toHaveText('Live', { timeout: 15000 });
  await page.locator('.camera-tile').nth(1).click();
  await expect(page.locator('.camera-tile')).toHaveCount(2);
  await page.getByRole('button', { name: 'Expand Camera 2', exact: true }).click();
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(page.locator('.zoom-controls')).toContainText('1.25x');
  await page.getByRole('button', { name: 'Back to cameras', exact: true }).click();
  await page.getByRole('button', { name: 'Unmute', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mute', exact: true })).toBeVisible();
  await expect(page.locator('.tile-status').nth(1)).toHaveText('Live', { timeout: 15000 });
  const snapshot = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Snapshot', exact: true }).click();
  expect((await snapshot).suggestedFilename()).toContain('.jpg');
  await page.getByRole('button', { name: 'Record clip', exact: true }).click();
  await expect(page.getByRole('button', { name: /Stop 0:/ })).toBeVisible();
  await page.waitForTimeout(2200);
  await page.getByRole('button', { name: /Stop 0:/ }).click();
  await expect(page.getByText('Camera clip saved on the server.')).toBeVisible({ timeout: 15000 });
  await page.goto('/recordings');
  await expect(page.locator('.clip-card')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.clip-card')).toHaveCount(1);
  await page.getByRole('button', { name: /^Play / }).click();
  await expect
    .poll(
      () =>
        page
          .locator('video.clip-video')
          .evaluate((v: HTMLVideoElement) => v.readyState >= 2 && v.videoWidth > 0),
      { timeout: 15000 },
    )
    .toBe(true);
  await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.getByRole('button', { name: /^Delete camera-/ }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.locator('.clip-card')).toHaveCount(0);
  expect(errors).toEqual([]);
});
test('stored telemetry history and real-map renderer read only backend observations', async ({
  page,
}) => {
  await login(page);
  await page.goto('/buses?bus=' + fixture.busId);
  await expect(page.getByRole('slider', { name: 'Journey timeline' })).toBeVisible();
  await expect(page.getByText('Backend mock samples', { exact: true })).toBeVisible();
  const coords = await page.locator('.map-coordinate strong').innerText();
  await page.getByRole('slider', { name: 'Journey timeline' }).fill('20');
  await expect(page.locator('.map-coordinate strong')).not.toHaveText(coords);
  await expect(page.locator('.leaflet-tile-loaded').first()).toBeVisible();
  await page.getByRole('tab', { name: 'Bus cameras', exact: true }).click();
  await expect(page.locator('.bus-camera-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'Unstar Camera 2', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Star Camera 2', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Open bus camera view' }).click();
  await expect(page.locator('.camera-tile')).toHaveCount(1);
});
test('workspace signup, platform approval and temporary password recovery use actual APIs', async ({
  page,
}) => {
  const email = 'requested-' + Date.now() + '@acceptance.test',
    password = 'requested-ui-password-123';
  await page.goto('/login');
  await page.getByRole('button', { name: 'Request a new workspace' }).click();
  await page.getByLabel('Full name', { exact: true }).fill('Requested Admin');
  await page.getByLabel('Workspace name', { exact: true }).fill('Requested UI Workspace');
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Request workspace access', exact: true }).click();
  await expect(
    page.getByText('Your request is waiting for the superadmin’s approval.'),
  ).toBeVisible();
  await login(page, 'platform');
  const row = page.getByRole('row').filter({ hasText: email });
  await row.getByRole('button', { name: 'Approve', exact: true }).click();
  await page.getByRole('button', { name: 'approve workspace', exact: true }).click();
  await expect(row).toContainText('active');
  await row.getByRole('button', { name: 'Manage users' }).click();
  await page.getByRole('button', { name: 'Reset password', exact: true }).click();
  await page.getByLabel('Temporary password', { exact: true }).fill(password + '-temporary');
  await page.getByRole('button', { name: 'Set password', exact: true }).click();
  await expect(page.getByText('Temporary password set.', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password + '-temporary');
  await page.getByRole('button', { name: 'Sign in to workspace', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Set your own password' })).toBeVisible();
  await page.getByLabel('Current password', { exact: true }).fill(password + '-temporary');
  await page.getByLabel('New password', { exact: true }).fill(password + '-final');
  await page.getByRole('button', { name: 'Save new password', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'One fleet. Every perspective.' })).toBeVisible();
});
test('sidebar is compact, independently scrollable and mobile pages fit', async ({ page }) => {
  await login(page);
  await page.goto('/buses');
  const side = page.getByRole('complementary', { name: 'Workspace sidebar' }),
    toggle = page.getByRole('button', { name: 'Collapse sidebar', exact: true }),
    box = await toggle.boundingBox(),
    bounds = await side.boundingBox();
  expect(Math.abs(box!.x + box!.width / 2 - bounds!.width)).toBeLessThan(2);
  await toggle.click();
  await expect(side).toHaveCSS('width', '76px');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();
  await page.getByRole('button', { name: 'Expand sidebar' }).click();
  await page.setViewportSize({ width: 1440, height: 400 });
  await side.hover();
  await page.mouse.wheel(0, 400);
  await expect.poll(() => side.evaluate((e) => e.scrollTop)).toBeGreaterThan(20);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Camera workspace', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: /Acceptance recorder/, level: 1 })).toBeVisible();
  for (const route of ['/buses', '/settings', '/recordings', '/buses?bus=' + fixture.busId]) {
    await page.goto(route);
    await expect(page.getByRole('button', { name: 'Account menu' })).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  }
});
