import type { APIRoute } from 'astro';
import { compare } from '@cmc/core';
import { findAsset, loadSnapshot } from '../../../lib/data';
import { comparisonOgImage } from '../../../lib/og';

/** Dynamic Open Graph card for /[a]/with-the-market-cap-of/[b]. Edge-cached with the page. */
export const GET: APIRoute = async ({ params }) => {
  const snap = await loadSnapshot();
  const a = findAsset(snap, params.a);
  const b = findAsset(snap, params.b);
  if (!a || !b || a.id === b.id) return new Response(null, { status: 404 });
  try {
    return await comparisonOgImage(compare(a, b, snap.updatedAt));
  } catch (err) {
    console.error('og: render failed', err);
    return new Response(null, { status: 502, headers: { 'cache-control': 'no-store' } });
  }
};
