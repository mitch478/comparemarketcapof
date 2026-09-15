import { KV_KEYS } from './kv';
import { PickerList, Snapshot, SnapshotMeta, type Asset, type PickerAsset } from './types';

/** The subset of KVNamespace we use, so core tests don't need workerd. */
export interface SnapshotKV {
  get(key: string, type: 'text'): Promise<string | null>;
}

export interface LoadedSnapshot {
  assets: Asset[];
  byId: Map<string, Asset>;
  updatedAt: string | null;
  count: number;
  source: string | null;
}

export const EMPTY_SNAPSHOT: LoadedSnapshot = { assets: [], byId: new Map(), updatedAt: null, count: 0, source: null };

/** Module-scope cache: one parse per isolate per TTL, not one per request. */
const DEFAULT_TTL_MS = 60_000;
let cache: { value: LoadedSnapshot; expires: number; kv: SnapshotKV } | null = null;
let pickerCache: { value: PickerAsset[]; expires: number; kv: SnapshotKV } | null = null;

export function clearSnapshotCache(): void {
  cache = null;
  pickerCache = null;
}

/**
 * Read and parse the snapshot from KV. Never throws: a missing or malformed
 * snapshot yields EMPTY_SNAPSHOT so the site degrades instead of 500ing.
 */
export async function getSnapshot(kv: SnapshotKV, opts: { ttlMs?: number; now?: () => number } = {}): Promise<LoadedSnapshot> {
  const now = opts.now ?? Date.now;
  const ttl = opts.ttlMs ?? DEFAULT_TTL_MS;
  if (cache && cache.kv === kv && cache.expires > now()) return cache.value;

  let value = EMPTY_SNAPSHOT;
  try {
    const [rawAssets, rawMeta] = await Promise.all([kv.get(KV_KEYS.snapshotCrypto, 'text'), kv.get(KV_KEYS.snapshotMeta, 'text')]);
    const assets = rawAssets ? Snapshot.safeParse(JSON.parse(rawAssets)) : null;
    const meta = rawMeta ? SnapshotMeta.safeParse(JSON.parse(rawMeta)) : null;
    if (assets?.success) {
      const byId = new Map(assets.data.map((a) => [a.id, a]));
      value = {
        assets: assets.data,
        byId,
        updatedAt: meta?.success ? meta.data.updatedAt : null,
        count: assets.data.length,
        source: meta?.success ? meta.data.source : null,
      };
    } else if (rawAssets) {
      console.error('snapshot: stored snapshot failed validation', assets?.error.issues[0]);
    }
  } catch (err) {
    console.error('snapshot: failed to read KV', err);
  }

  cache = { value, expires: now() + ttl, kv };
  return value;
}

/** Trimmed picker list. Falls back to deriving from the full snapshot if the picker key is missing. */
export async function getPickerList(kv: SnapshotKV, opts: { ttlMs?: number; now?: () => number } = {}): Promise<PickerAsset[]> {
  const now = opts.now ?? Date.now;
  const ttl = opts.ttlMs ?? DEFAULT_TTL_MS;
  if (pickerCache && pickerCache.kv === kv && pickerCache.expires > now()) return pickerCache.value;

  let value: PickerAsset[] = [];
  try {
    const raw = await kv.get(KV_KEYS.snapshotPicker, 'text');
    const parsed = raw ? PickerList.safeParse(JSON.parse(raw)) : null;
    if (parsed?.success) value = parsed.data;
  } catch (err) {
    console.error('snapshot: failed to read picker list', err);
  }
  if (value.length === 0) {
    const snap = await getSnapshot(kv, opts);
    value = snap.assets.map((a) => ({ id: a.id, slug: a.slug, symbol: a.symbol, name: a.name, image: a.image, rank: a.rank, marketCap: a.marketCap }));
  }
  pickerCache = { value, expires: now() + ttl, kv };
  return value;
}
