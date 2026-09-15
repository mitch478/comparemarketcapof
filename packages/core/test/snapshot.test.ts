import { beforeEach, describe, expect, it } from 'vitest';
import { KV_KEYS } from '../src/kv';
import { clearSnapshotCache, getPickerList, getSnapshot, type SnapshotKV } from '../src/snapshot';
import { BTC, SOL } from './helpers';

function fakeKV(store: Record<string, string>): SnapshotKV & { reads: number } {
  const kv = {
    reads: 0,
    async get(key: string) {
      kv.reads++;
      return store[key] ?? null;
    },
  };
  return kv;
}

describe('getSnapshot', () => {
  beforeEach(() => clearSnapshotCache());

  it('parses assets and meta', async () => {
    const kv = fakeKV({
      [KV_KEYS.snapshotCrypto]: JSON.stringify([BTC, SOL]),
      [KV_KEYS.snapshotMeta]: JSON.stringify({ updatedAt: '2026-09-15T01:00:00.000Z', count: 2, source: 'coingecko' }),
    });
    const s = await getSnapshot(kv);
    expect(s.count).toBe(2);
    expect(s.byId.get('solana')?.symbol).toBe('SOL');
    expect(s.updatedAt).toBe('2026-09-15T01:00:00.000Z');
  });

  it('caches within the TTL and re-reads after it', async () => {
    const kv = fakeKV({ [KV_KEYS.snapshotCrypto]: JSON.stringify([BTC]) });
    let t = 0;
    const now = () => t;
    await getSnapshot(kv, { ttlMs: 100, now });
    await getSnapshot(kv, { ttlMs: 100, now });
    expect(kv.reads).toBe(2); // one round of two keys
    t = 101;
    await getSnapshot(kv, { ttlMs: 100, now });
    expect(kv.reads).toBe(4);
  });

  it('empty KV → EMPTY_SNAPSHOT, never throws', async () => {
    const s = await getSnapshot(fakeKV({}));
    expect(s.count).toBe(0);
    expect(s.updatedAt).toBeNull();
  });

  it('malformed JSON or invalid shape → empty, never throws', async () => {
    expect((await getSnapshot(fakeKV({ [KV_KEYS.snapshotCrypto]: '{not json' }))).count).toBe(0);
    clearSnapshotCache();
    expect((await getSnapshot(fakeKV({ [KV_KEYS.snapshotCrypto]: JSON.stringify([{ id: 'x' }]) }))).count).toBe(0);
  });
});

describe('getPickerList', () => {
  beforeEach(() => clearSnapshotCache());

  it('reads the picker key when present', async () => {
    const kv = fakeKV({ [KV_KEYS.snapshotPicker]: JSON.stringify([{ id: 'bitcoin', slug: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', image: null, rank: 1, marketCap: 5 }]) });
    const list = await getPickerList(kv);
    expect(list).toHaveLength(1);
    expect(kv.reads).toBe(1);
  });

  it('falls back to deriving from the full snapshot', async () => {
    const kv = fakeKV({ [KV_KEYS.snapshotCrypto]: JSON.stringify([BTC, SOL]) });
    const list = await getPickerList(kv);
    expect(list.map((p) => p.symbol)).toEqual(['BTC', 'SOL']);
    expect(list[0]).not.toHaveProperty('price');
  });
});
