import { SELF, env } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KV_KEYS, CoinGeckoProvider, type Asset } from '@cmc/core';
import { refreshSnapshot } from '../src/refresh';
import page1 from '../../../packages/core/fixtures/coingecko-markets-page1.json';

beforeEach(async () => {
  for (const k of Object.values(KV_KEYS)) await env.SNAPSHOT.delete(k);
});
afterEach(() => vi.unstubAllGlobals());

function json(body: unknown, status = 200, statusText = 'OK'): Response {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, statusText, headers: { 'content-type': 'application/json' } });
}

/** A provider whose only network is the given fetch. No page delay. */
function provider(fetch: (url: string) => Response | Promise<Response>) {
  return new CoinGeckoProvider({
    limit: 250,
    sleep: async () => {},
    fetch: ((url: string | URL | Request) => Promise.resolve(fetch(String(url)))) as unknown as typeof globalThis.fetch,
  });
}

describe('refreshSnapshot', () => {
  it('writes snapshot, picker list and meta on success', async () => {
    const r = await refreshSnapshot(env, 'test', provider(() => json(page1)));
    expect(r.ok).toBe(true);
    expect(r.count).toBeGreaterThan(200);

    const assets = (await env.SNAPSHOT.get(KV_KEYS.snapshotCrypto, 'json')) as Asset[];
    expect(assets[0]).toMatchObject({ id: 'bitcoin', symbol: 'BTC' });
    const picker = (await env.SNAPSHOT.get(KV_KEYS.snapshotPicker, 'json')) as Record<string, unknown>[];
    expect(picker.length).toBe(assets.length);
    expect(picker[0]).not.toHaveProperty('price');
    const meta = (await env.SNAPSHOT.get(KV_KEYS.snapshotMeta, 'json')) as { count: number; source: string; updatedAt: string };
    expect(meta).toMatchObject({ count: assets.length, source: 'coingecko' });
    expect(meta.updatedAt).toBe(r.updatedAt);
  });

  it('keeps the last good snapshot when CoinGecko rate-limits', async () => {
    await env.SNAPSHOT.put(KV_KEYS.snapshotCrypto, JSON.stringify([{ keep: 'me' }]));
    await env.SNAPSHOT.put(KV_KEYS.snapshotMeta, JSON.stringify({ updatedAt: 'old', count: 1, source: 'coingecko' }));

    const r = await refreshSnapshot(env, 'test', provider(() => json('slow down', 429, 'Too Many Requests')));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/429/);
    expect(await env.SNAPSHOT.get(KV_KEYS.snapshotCrypto, 'json')).toEqual([{ keep: 'me' }]);
    expect(await env.SNAPSHOT.get(KV_KEYS.snapshotMeta, 'json')).toMatchObject({ updatedAt: 'old' });
  });

  it('keeps the last good snapshot on a malformed payload', async () => {
    await env.SNAPSHOT.put(KV_KEYS.snapshotCrypto, JSON.stringify([{ keep: 'me' }]));
    const r = await refreshSnapshot(env, 'test', provider(() => json({ error: 'weird' })));
    expect(r.ok).toBe(false);
    expect(await env.SNAPSHOT.get(KV_KEYS.snapshotCrypto, 'json')).toEqual([{ keep: 'me' }]);
  });

  it('refuses a suspiciously small snapshot (MIN_ASSETS)', async () => {
    await env.SNAPSHOT.put(KV_KEYS.snapshotCrypto, JSON.stringify([{ keep: 'me' }]));
    const r = await refreshSnapshot(env, 'test', provider(() => json(page1.slice(0, 2))));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/too small/);
    expect(await env.SNAPSHOT.get(KV_KEYS.snapshotCrypto, 'json')).toEqual([{ keep: 'me' }]);
  });
});

describe('POST /refresh with the right secret', () => {
  it('runs a refresh through the Worker and reports the result', async () => {
    // SELF runs the Worker in this isolate, so stubbing global fetch reaches the provider's outbound call.
    const outbound = vi.fn(async () => json(page1));
    vi.stubGlobal('fetch', outbound);
    const res = await SELF.fetch('https://example.com/refresh', { method: 'POST', headers: { 'x-refresh-secret': 'test-secret' } });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, trigger: 'manual' });
    expect(outbound).toHaveBeenCalledTimes(1);
    expect(String((outbound.mock.calls[0] as unknown as [string])[0])).toContain('api.coingecko.com/api/v3/coins/markets');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('returns 502 when the refresh fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json('nope', 500, 'Internal')));
    const res = await SELF.fetch('https://example.com/refresh', { method: 'POST', headers: { 'x-refresh-secret': 'test-secret' } });
    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({ ok: false });
  });
});
