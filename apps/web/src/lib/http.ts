/** Cloudflare caches SSR pages for the 15-minute snapshot window; browsers don't cache. */
export const PAGE_CACHE = 'public, s-maxage=900, stale-while-revalidate=3600';

export function cacheHeaders(headers: Headers, value = PAGE_CACHE): void {
  headers.set('Cache-Control', value);
  headers.set('Vary', 'Accept-Encoding');
}
