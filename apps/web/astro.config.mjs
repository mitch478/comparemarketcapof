// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://comparemarketcapof.com',
  trailingSlash: 'never',
  build: { format: 'file' },
  // Server-rendered by default; static pages opt in with `export const prerender = true`.
  output: 'server',
  // No sessions: nothing on the site is per-user.
  session: false,
  adapter: cloudflare({
    imageService: 'compile',
    // Share local KV state with apps/cron so `pnpm --filter @cmc/cron seed` feeds astro dev too.
    persistState: { path: '../../.wrangler/state' },
  }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    // Unique per build. The edge-cache key includes it so a new deploy never serves
    // HTML that references the previous deploy's hashed assets.
    define: { __BUILD_ID__: JSON.stringify(Date.now().toString(36)) },
  },
});
