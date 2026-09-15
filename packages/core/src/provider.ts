import type { Asset, AssetType } from './types';

/**
 * A source of assets. The cron Worker calls `fetchAll()` and writes the result
 * to KV; nothing else talks to a provider. Adding stocks later means adding a
 * `StockProvider` that implements this and merging its output into the snapshot.
 */
export interface AssetProvider {
  readonly type: AssetType;
  /** Human-readable source name written into `snapshot:meta.source`. */
  readonly source: string;
  /** Fetch and validate every asset this provider knows about. Must throw on bad data — never return a partial list. */
  fetchAll(): Promise<Asset[]>;
}
