import { waitUntil } from 'cloudflare:workers';
import { defineMiddleware } from 'astro:middleware';

/**
 * Edge cache for server-rendered pages.
 *
 * Cloudflare does not cache Worker-generated responses on `s-maxage` alone, so
 * we use the Cache API explicitly: GET → cache hit? serve it; miss → render,
 * store a copy in the background, serve. TTL comes from the page's own
 * Cache-Control (s-maxage), so pages keep declaring their window in one place.
 *
 * Entries are keyed by build id (see astro.config.mjs) so a deploy can't serve stale HTML.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { request } = context;
  if (request.method !== 'GET') return next();
  const url = new URL(request.url);
  if (url.search) return next(); // nothing indexable has query params; don't cache variants
  if (url.pathname.startsWith('/_astro/')) return next(); // immutable assets, handled by the assets layer

  const cache = (caches as unknown as { default: Cache }).default;
  // Key is namespaced by build id: hashed asset URLs change per deploy, so cached
  // HTML from an older build would 404 its own CSS/JS. Old entries simply expire.
  const key = new Request(`${url.origin}/__edge-cache/${__BUILD_ID__}${url.pathname}`, { method: 'GET' });

  try {
    const hit = await cache.match(key);
    if (hit) {
      const res = new Response(hit.body, hit);
      res.headers.set('x-edge-cache', 'HIT');
      return res;
    }
  } catch {
    // Cache API unavailable (workers.dev, some previews) — fall through to render.
  }

  const response = await next();
  const cc = response.headers.get('cache-control') ?? '';
  if (response.status === 200 && /s-maxage=\d+/.test(cc) && !/no-store|private/.test(cc)) {
    try {
      waitUntil(cache.put(key, response.clone()));
    } catch {
      // no execution context (e.g. prerender) — skip
    }
  }
  response.headers.set('x-edge-cache', 'MISS');
  return response;
});
