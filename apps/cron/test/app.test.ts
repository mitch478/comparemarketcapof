import { SELF, env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { KV_KEYS } from '@cmc/core';

describe('cron worker http', () => {
  it('serves /health', async () => {
    const res = await SELF.fetch('https://example.com/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('/v1/meta reports an empty snapshot when KV is empty', async () => {
    const res = await SELF.fetch('https://example.com/v1/meta');
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('s-maxage=900');
    expect(await res.json()).toMatchObject({ updatedAt: null, count: 0 });
  });

  it('/v1/meta returns stored meta', async () => {
    await env.SNAPSHOT.put(
      KV_KEYS.snapshotMeta,
      JSON.stringify({ updatedAt: '2026-09-15T00:05:00.000Z', count: 500, source: 'coingecko' }),
    );
    const res = await SELF.fetch('https://example.com/v1/meta');
    expect(await res.json()).toEqual({ updatedAt: '2026-09-15T00:05:00.000Z', count: 500, source: 'coingecko' });
  });

  it('404s as JSON', async () => {
    const res = await SELF.fetch('https://example.com/nope');
    expect(res.status).toBe(404);
  });
});
