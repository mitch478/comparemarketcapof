import type { APIRoute } from 'astro';
import { loadSnapshot } from '../lib/data';
import { SITEMAP_CACHE, buildUrlSet, chunkCount, renderIndex } from '../lib/sitemap';

export const GET: APIRoute = async ({ site }) => {
  const snap = await loadSnapshot();
  const origin = site!.origin;
  const total = buildUrlSet(snap, origin).length;
  return new Response(renderIndex(origin, chunkCount(total), snap.updatedAt), {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': SITEMAP_CACHE },
  });
};
