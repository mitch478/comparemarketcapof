import type { APIRoute } from 'astro';
import { loadSnapshot } from '../lib/data';
import { SITEMAP_CACHE, SITEMAP_CHUNK, buildUrlSet, chunkCount, renderUrlset } from '../lib/sitemap';

export const GET: APIRoute = async ({ params, site }) => {
  const n = Number(params.n);
  if (!Number.isInteger(n) || n < 1) return new Response(null, { status: 404 });
  const snap = await loadSnapshot();
  const urls = buildUrlSet(snap, site!.origin);
  if (n > chunkCount(urls.length)) return new Response(null, { status: 404 });
  const slice = urls.slice((n - 1) * SITEMAP_CHUNK, n * SITEMAP_CHUNK);
  return new Response(renderUrlset(slice), {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': SITEMAP_CACHE },
  });
};
