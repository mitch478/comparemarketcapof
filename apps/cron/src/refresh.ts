import { CoinGeckoProvider, KV_KEYS, Snapshot, toPickerAsset, type AssetProvider, type SnapshotMeta } from '@cmc/core';
import './env';

export interface RefreshResult {
  ok: boolean;
  trigger: string;
  count?: number;
  updatedAt?: string;
  durationMs: number;
  error?: string;
}

export function providerFor(env: Env): AssetProvider {
  return new CoinGeckoProvider({
    limit: Number(env.ASSET_LIMIT) || 500,
    apiKey: env.COINGECKO_API_KEY || undefined,
  });
}

/**
 * Fetch → validate → write. Any failure leaves KV untouched: the site keeps
 * serving the last good snapshot and the error goes to Workers logs.
 */
export async function refreshSnapshot(env: Env, trigger: string, provider: AssetProvider = providerFor(env)): Promise<RefreshResult> {
  const started = Date.now();
  try {
    const assets = await provider.fetchAll();
    const valid = Snapshot.safeParse(assets);
    if (!valid.success) throw new Error(`snapshot failed validation: ${valid.error.issues[0]?.message ?? 'unknown'}`);

    const min = Number(env.MIN_ASSETS) || 1;
    if (valid.data.length < min) throw new Error(`snapshot too small: ${valid.data.length} < MIN_ASSETS ${min}`);

    const updatedAt = new Date().toISOString();
    const meta: SnapshotMeta = { updatedAt, count: valid.data.length, source: provider.source };

    // Order matters: meta last, so a partial failure never advertises a snapshot that isn't there.
    await env.SNAPSHOT.put(KV_KEYS.snapshotCrypto, JSON.stringify(valid.data));
    await env.SNAPSHOT.put(KV_KEYS.snapshotPicker, JSON.stringify(valid.data.map(toPickerAsset)));
    await env.SNAPSHOT.put(KV_KEYS.snapshotMeta, JSON.stringify(meta));

    const result: RefreshResult = { ok: true, trigger, count: meta.count, updatedAt, durationMs: Date.now() - started };
    console.log('[refresh] ok', JSON.stringify(result));
    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const result: RefreshResult = { ok: false, trigger, error, durationMs: Date.now() - started };
    console.error('[refresh] FAILED — keeping last good snapshot', JSON.stringify(result));
    return result;
  }
}
