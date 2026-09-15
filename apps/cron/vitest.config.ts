import { cloudflareTest } from '@cloudflare/vitest-pool-workers';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        bindings: { REFRESH_SECRET: 'test-secret', ASSET_LIMIT: '250', MIN_ASSETS: '5' },
      },
    }),
  ],
  test: {
    include: ['test/**/*.test.ts'],
  },
});
