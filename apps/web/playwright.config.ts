import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke test against `astro preview` (real workerd + shared local KV).
 * Seed first: `pnpm --filter @cmc/cron seed`.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'mobile-chromium', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: 'pnpm exec astro preview --port 4173',
    // Astro backgrounds the preview when it detects an AI-agent shell; force foreground so Playwright can own it.
    env: { ASTRO_PREVIEW_BACKGROUND: '0' },
    url: 'http://localhost:4173/about',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
