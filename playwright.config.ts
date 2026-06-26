// playwright.config.ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/liveness', timeout: 60_000,
  use: { headless: true, viewport: { width: 1280, height: 720 } },
  reporter: [['list'], ['html', { open: 'never' }]],
});