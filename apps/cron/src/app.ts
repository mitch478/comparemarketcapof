import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { KV_KEYS, SnapshotMeta } from '@cmc/core';
import './env';

export const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
} as const;

/** HTTP surface of the cron Worker. Routes are filled in during Phase 1 and Phase 5. */
export const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({ origin: '*', allowMethods: ['GET', 'OPTIONS'] }));

app.get('/', (c) => c.json({ ok: true, service: 'comparemarketcapof-cron', phase: 0 }));

app.get('/health', (c) => c.json({ ok: true }));

app.get('/v1/meta', async (c) => {
  const raw = await c.env.SNAPSHOT.get(KV_KEYS.snapshotMeta, 'json');
  const parsed = SnapshotMeta.safeParse(raw);
  if (!parsed.success) {
    return c.json({ updatedAt: null, count: 0, source: c.env.SNAPSHOT_SOURCE }, 200, CACHE_HEADERS);
  }
  return c.json(parsed.data, 200, CACHE_HEADERS);
});

app.notFound((c) => c.json({ error: 'not found' }, 404));
