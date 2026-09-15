import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { COINGECKO_PAGE_SIZE, CoinGeckoMarketsPage, CoinGeckoProvider, mapCoinGeckoRow } from '../src/providers/coingecko';
import { Snapshot } from '../src/types';

const page1 = JSON.parse(readFileSync(decodeURIComponent(new URL('../fixtures/coingecko-markets-page1.json', import.meta.url).pathname), 'utf8')) as unknown[];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('CoinGecko fixture', () => {
  it('validates against the row schema', () => {
    expect(CoinGeckoMarketsPage.safeParse(page1).success).toBe(true);
    expect(page1.length).toBe(COINGECKO_PAGE_SIZE);
  });

  it('maps to valid Assets and skips rows without a rank', () => {
    const rows = CoinGeckoMarketsPage.parse(page1);
    const mapped = rows.map(mapCoinGeckoRow).filter((a) => a !== null);
    expect(Snapshot.safeParse(mapped).success).toBe(true);
    expect(mapped.length).toBeLessThanOrEqual(rows.length);
    expect(mapped[0]).toMatchObject({ id: 'bitcoin', symbol: 'BTC', type: 'crypto', rank: 1 });
    expect(mapped[0]!.image).toMatch(/^https:\/\//);
  });
});

describe('CoinGeckoProvider', () => {
  it('fetches multiple pages with a pause, dedupes, sorts by rank and trims to limit', async () => {
    const calls: string[] = [];
    const fetch = vi.fn(async (url: string | URL | Request) => {
      calls.push(String(url));
      const page = Number(new URL(String(url)).searchParams.get('page'));
      if (page === 1) return jsonResponse(page1);
      // page 2: re-send a duplicate of bitcoin plus one new coin with a lower rank
      return jsonResponse([page1[0], { ...(page1[1] as object), id: 'zzz-new', market_cap_rank: 999 }]);
    });
    const sleep = vi.fn(async () => {});
    const p = new CoinGeckoProvider({ limit: 300, fetch: fetch as unknown as typeof globalThis.fetch, sleep, apiKey: 'k', pageDelayMs: 1 });
    const assets = await p.fetchAll();
    expect(calls.length).toBe(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(new Set(assets.map((a) => a.id)).size).toBe(assets.length);
    expect(assets.length).toBeLessThanOrEqual(300);
    expect(assets.every((a, i) => i === 0 || a.rank >= assets[i - 1]!.rank)).toBe(true);
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)['x-cg-demo-api-key']).toBe('k');
  });

  it('stops after a short page', async () => {
    const fetch = vi.fn(async () => jsonResponse(page1.slice(0, 10)));
    const p = new CoinGeckoProvider({ limit: 1000, fetch: fetch as unknown as typeof globalThis.fetch, sleep: async () => {} });
    const assets = await p.fetchAll();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(assets.length).toBeLessThanOrEqual(10);
  });

  it('throws on HTTP error (rate limit) rather than returning a partial list', async () => {
    const fetch = vi.fn(async () => new Response('slow down', { status: 429, statusText: 'Too Many Requests' }));
    const p = new CoinGeckoProvider({ limit: 250, fetch: fetch as unknown as typeof globalThis.fetch });
    await expect(p.fetchAll()).rejects.toThrow(/429/);
  });

  it('throws on a malformed payload', async () => {
    const fetch = vi.fn(async () => jsonResponse([{ id: 'x', nope: true }]));
    const p = new CoinGeckoProvider({ limit: 250, fetch: fetch as unknown as typeof globalThis.fetch });
    await expect(p.fetchAll()).rejects.toThrow(/validation/);
  });
});
