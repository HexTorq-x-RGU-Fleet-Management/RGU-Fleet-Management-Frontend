import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: 'http://127.0.0.1:3117',
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    ...(process.platform === 'win32' ? { channel: 'chrome' } : {}),
  },
  webServer: {
    command: 'node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3117',
    url: 'http://127.0.0.1:3117',
    reuseExistingServer: false,
    timeout: 90000,
    env: {
      NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:8109',
      RGU_BUILD_DIR: '.next-e2e',
      NEXT_PUBLIC_MAP_TILE_URL: 'http://127.0.0.1:8109/__acceptance/tile/{z}/{x}/{y}.png',
    },
  },
  reporter: 'list',
});
