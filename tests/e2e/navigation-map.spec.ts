import { test, expect } from '@playwright/test';
import { stubMapTiles } from './map-fixture';
test.beforeEach(async ({ page }) => stubMapTiles(page));
test('circular sidebar control stays centred on the edge and remembers collapse', async ({
  page,
}) => {
  await page.goto('/');
  const sidebar = page.getByRole('complementary', { name: 'Workspace sidebar' });
  let toggle = page.getByRole('button', { name: 'Collapse sidebar', exact: true });
  const edge = await sidebar.boundingBox(),
    button = await toggle.boundingBox();
  expect(Math.abs(button!.x + button!.width / 2 - edge!.width)).toBeLessThan(2);
  expect(Math.abs(button!.y + button!.height / 2 - 500)).toBeLessThan(2);
  await expect(toggle).toHaveCSS('border-radius', '50%');
  await toggle.click();
  await expect(sidebar).toHaveCSS('width', '76px');
  await page.reload();
  toggle = page.getByRole('button', { name: 'Expand sidebar', exact: true });
  await expect(toggle).toBeVisible();
  await expect(sidebar).toHaveCSS('width', '76px');
  await toggle.click();
  await expect(sidebar).toHaveCSS('width', '236px');
  const navigation = page.getByRole('navigation', { name: 'Main navigation' });
  const links = await navigation
    .getByRole('link')
    .evaluateAll((items) => items.map((e) => e.getAttribute('aria-label')));
  expect(links.indexOf('Recordings')).toBe(links.indexOf('Camera workspace') + 1);
  await expect(navigation.getByRole('link', { name: 'GPS & fuel', exact: true })).toHaveCount(0);
  await expect(navigation.getByRole('link', { name: 'Recorder library', exact: true })).toHaveCount(
    0,
  );
});
test('bus directory is compact and camera inventory lives inside Camera workspace', async ({
  page,
}) => {
  await page.goto('/buses');
  await expect(page.getByRole('heading', { name: 'Buses', exact: true })).toBeVisible();
  await expect(page.locator('.stat-card')).toHaveCount(0);
  await expect(page.locator('.fleet-source')).toHaveCount(0);
  await expect(page.locator('.workspace-switch')).toHaveCount(0);
  const first = page.locator('.bus-card').first();
  await expect(first).toBeVisible();
  expect((await first.boundingBox())!.y).toBeLessThan(270);
  await page.goto('/cameras');
  await page
    .getByRole('navigation', { name: 'Camera tools' })
    .getByRole('link', { name: 'Recorder library' })
    .click();
  await expect(page.locator('.recorder-card')).toHaveCount(5);
  await page.goto('/tracking');
  await expect(page).toHaveURL(/\/buses$/);
  await page.goto('/recorders');
  await expect(page).toHaveURL(/cameras\?view=recorders/);
});
test('real map renderer follows history while tile failure leaves telemetry usable', async ({
  page,
}) => {
  await page.goto('/buses?bus=bus-1');
  await expect(page.getByRole('region', { name: 'Tamil Nadu road map' })).toBeVisible();
  await expect(page.locator('.leaflet-tile-loaded').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Follow bus', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Follow bus', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Follow bus', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const coords = await page.locator('.map-coordinate strong').innerText();
  await page.getByRole('slider', { name: 'Journey timeline' }).fill('10');
  await expect(page.locator('.map-coordinate strong')).not.toHaveText(coords);
  await page.getByRole('button', { name: 'Tamil Nadu', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Follow bus', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await expect(page.locator('.leaflet-control-attribution')).toContainText('OpenStreetMap');
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
  await page.reload();
  await expect(page.getByText('Road tiles unavailable. GPS readings remain below.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry tiles' })).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Journey timeline' })).toBeEnabled();
});
test.describe('sidebar with smooth scrolling enabled', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('wheel over sidebar scrolls its own content and does not move the page', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 400 });
    await page.goto('/buses');
    const side = page.getByRole('complementary', { name: 'Workspace sidebar' });
    await expect.poll(() => side.evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(true);
    await side.hover();
    await page.mouse.wheel(0, 400);
    await expect.poll(() => side.evaluate((e) => e.scrollTop)).toBeGreaterThan(20);
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await side.evaluate((e) => {
      e.scrollTop = e.scrollHeight;
    });
    await page.mouse.wheel(0, 500);
    expect(await page.evaluate(() => scrollY)).toBe(0);
  });
});
