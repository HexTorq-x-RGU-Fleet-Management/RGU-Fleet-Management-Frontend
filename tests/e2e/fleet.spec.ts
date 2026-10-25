import { test, expect } from '@playwright/test';
import { stubMapTiles } from './map-fixture';
test.beforeEach(async ({ page }) => stubMapTiles(page));
test('bus creation, unique mapping feedback, persistence and removal', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add bus', exact: true }).click();
  await page.getByLabel('Bus number', { exact: true }).fill('RGU 99');
  await page.getByLabel('Registration', { exact: true }).fill('TN 37 TEST 99');
  await page.getByLabel('Driver name', { exact: true }).fill('Test Driver');
  await page.getByLabel('GPS + fuel device', { exact: true }).fill('WE-TEST-99');
  await page.getByRole('button', { name: 'Save bus', exact: true }).click();
  await expect(page.locator('.bus-card')).toHaveCount(6);
  await page.reload();
  await page.getByRole('link', { name: 'Open RGU 99', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'RGU 99', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Remove bus', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { name: 'Remove bus', exact: true }).last().click();
  await expect(
    page.getByRole('heading', { name: 'One fleet. Every perspective.', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.bus-card')).toHaveCount(5);
});
test('history synchronizes GPS coordinates and fuel; stars filter the bus camera grid', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/buses?bus=bus-1');
  await expect(page.getByRole('slider', { name: 'Journey timeline' })).toBeVisible();
  const before = await page.getByTestId('cursor-time').innerText();
  const coords = await page.locator('.map-coordinate strong').innerText();
  await page.getByRole('slider', { name: 'Journey timeline' }).fill('20');
  await expect(page.getByTestId('cursor-time')).not.toHaveText(before);
  await expect(page.locator('.map-coordinate strong')).not.toHaveText(coords);
  await page.getByRole('tab', { name: 'Bus cameras', exact: true }).click();
  await expect(page.locator('.bus-camera-card')).toHaveCount(6);
  await page.getByRole('button', { name: 'Unstar Camera 1', exact: true }).click();
  await page.getByRole('link', { name: 'Open bus camera view', exact: true }).click();
  await expect(page.locator('.camera-tile')).toHaveCount(3);
  await expect(
    page.getByRole('button', { name: 'Select KPM 3 Camera 1', exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.camera-tile')).toHaveCount(3);
  expect(errors).toEqual([]);
});
test('offline cameras and unmapped telemetry have clear empty states', async ({ page }) => {
  await page.goto('/buses?bus=bus-5');
  await page.getByRole('tab', { name: 'Bus cameras', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'No available cameras', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Edit bus', exact: true }).click();
  await page.getByLabel('GPS + fuel device', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Save bus', exact: true }).click();
  await page.getByRole('tab', { name: 'GPS & fuel timeline', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'No telemetry device mapped', exact: true }),
  ).toBeVisible();
});
