import type { LoadedSnapshot } from '@cmc/core';
import { coinsPath, comparePath, hubPath } from './routes';

export const SITEMAP_CHUNK = 5000;
/** How many top assets each asset is compared against in the sitemap. */
export const SITEMAP_TOP_N = 20;

export interface SitemapUrl { loc: string; lastmod?: string | undefined }

/**
 * The indexable URL set: static pages, /coins, every hub, and every asset at
 * each of the top-20 market caps (A-at-B only; B-at-A pages exist and are
 * linked but aren't submitted). Order is stable so chunk N is the same
 * between requests for a given snapshot.
 */
export function buildUrlSet(snap: LoadedSnapshot, origin: string): SitemapUrl[] {
  const abs = (p: string) => new URL(p, origin).toString();
  const lastmod = snap.updatedAt ?? undefined;
  const urls: SitemapUrl[] = [
    { loc: abs('/'), lastmod },
    { loc: abs('/about') },
    { loc: abs('/privacy') },
    { loc: abs(coinsPath()), lastmod },
  ];
  for (const a of snap.assets) urls.push({ loc: abs(hubPath(a.slug)), lastmod });
  const top = snap.assets.slice(0, SITEMAP_TOP_N);
  for (const a of snap.assets) {
    for (const b of top) {
      if (a.id === b.id) continue;
      urls.push({ loc: abs(comparePath(a.slug, b.slug)), lastmod });
    }
  }
  return urls;
}

export function chunkCount(total: number): number {
  return Math.max(1, Math.ceil(total / SITEMAP_CHUNK));
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderUrlset(urls: SitemapUrl[]): string {
  const body = urls
    .map((u) => `<url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${esc(u.lastmod)}</lastmod>` : ''}</url>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

export function renderIndex(origin: string, chunks: number, lastmod?: string | null): string {
  const body = Array.from({ length: chunks }, (_, i) =>
    `<sitemap><loc>${esc(new URL(`/sitemap-${i + 1}.xml`, origin).toString())}</loc>${lastmod ? `<lastmod>${esc(lastmod)}</lastmod>` : ''}</sitemap>`,
  ).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`;
}

export const SITEMAP_CACHE = 'public, s-maxage=3600, stale-while-revalidate=86400';
