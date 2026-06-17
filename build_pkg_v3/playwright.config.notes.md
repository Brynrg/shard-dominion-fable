# Drop into playwright.config.ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/liveness', timeout: 60_000,
  use: { headless: true, viewport: { width: 1280, height: 720 } },
  reporter: [['list'], ['html', { open: 'never' }]],
});
# Run a slice gate:  SLICE=S3 LIVE_URL=http://localhost:4317 npm run test:live
# The "frozen frame" check is byte-compare; if compression noise makes it flaky
# once the world is busy, swap to a pixel-delta count > 200.
