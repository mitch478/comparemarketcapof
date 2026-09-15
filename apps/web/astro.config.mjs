// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://comparemarketcapof.com',
  // Server-rendered by default; static pages opt in with `export const prerender = true`.
  output: 'server',
  adapter: cloudflare({
    imageService: 'compile',
    // Share local KV state with apps/cron so `pnpm --filter @cmc/cron seed` feeds astro dev too.
    persistState: { path: '../../.wrangler/state' },
  }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
