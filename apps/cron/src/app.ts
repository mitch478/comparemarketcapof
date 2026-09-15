import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { KV_KEYS, SnapshotMeta } from '@cmc/core';
import './env';
import { refreshSnapshot } from './refresh';

export const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
} as const;

/** HTTP surface of the cron Worker. The public /v1 API is completed in Phase 5. */
export const app = new Hono<{ Bindings: Env }>();

app.use('/v1/*', cors({ origin: '*', allowMethods: ['GET', 'OPTIONS'] }));

app.get('/', (c) => c.json({ ok: true, service: 'comparemarketcapof-cron' }));

app.get('/health', (c) => c.json({ ok: true }));

app.get('/v1/meta', async (c) => {
  const raw = await c.env.SNAPSHOT.get(KV_KEYS.snapshotMeta, 'json');
  const parsed = SnapshotMeta.safeParse(raw);
  if (!parsed.success) {
    return c.json({ updatedAt: null, count: 0, source: c.env.SNAPSHOT_SOURCE }, 200, CACHE_HEADERS);
  }
  return c.json(parsed.data, 200, CACHE_HEADERS);
});

/** Force a snapshot refresh. Requires `x-refresh-secret` to match the REFRESH_SECRET secret. */
app.post('/refresh', async (c) => {
  const expected = c.env.REFRESH_SECRET;
  if (!expected) return c.json({ error: 'REFRESH_SECRET is not configured' }, 503);
  const given = c.req.header('x-refresh-secret') ?? '';
  if (!timingSafeEqual(given, expected)) return c.json({ error: 'unauthorized' }, 401);

  const result = await refreshSnapshot(c.env, 'manual');
  return c.json(result, result.ok ? 200 : 502, { 'Cache-Control': 'no-store' });
});

app.notFound((c) => c.json({ error: 'not found' }, 404));

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.byteLength !== bb.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < ab.byteLength; i++) diff |= ab[i]! ^ bb[i]!;
  return diff === 0;
}
