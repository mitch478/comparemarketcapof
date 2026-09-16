import type { APIRoute } from 'astro';
import { defaultOgImage } from '../../lib/og';

export const GET: APIRoute = async () => {
  try {
    return await defaultOgImage();
  } catch (err) {
    console.error('og: default render failed', err);
    return new Response(null, { status: 502, headers: { 'cache-control': 'no-store' } });
  }
};
