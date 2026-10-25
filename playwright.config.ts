import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 31070,
  use: {
    baseURL: 'http://127.0.0.1:3107',
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    ...(process.platform === 'win32' ? { channel: 'chrome' } : {}),
  },
  webServer: {
    command: 'npm run start',
    url: 'http://127.0.0.1:3107',
    reuseExistingServer: false,
    timeout: 60000,
  },
  reporter: 'list',
});
