import type { Page } from '@playwright/test';
// Deterministic tile protocol fixture. Browser tests do not bulk-fetch public tiles.
export async function stubMapTiles(page: Page) {
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#e7ece8"/><path d="M0 80H256M90 0V256" stroke="#fff" stroke-width="8"/></svg>',
    }),
  );
}
