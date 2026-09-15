import { z } from 'zod';

/** Asset classes the site can compare. Stocks are phase 2 — the type exists so the model doesn't change later. */
export const AssetType = z.enum(['crypto', 'stock']);
export type AssetType = z.infer<typeof AssetType>;

/**
 * One asset in the snapshot. Field names are provider-neutral so a stock
 * provider can populate the same shape (fdv/ath may be null for stocks).
 */
export const Asset = z.object({
  type: AssetType,
  /** Provider id, e.g. CoinGecko id "bitcoin". */
  id: z.string().min(1),
  /** URL slug used in routes. For crypto this is the CoinGecko id. */
  slug: z.string().min(1),
  symbol: z.string().min(1),
  name: z.string().min(1),
  image: z.string().url().nullable(),
  /** USD */
  price: z.number().nonnegative(),
  /** USD */
  marketCap: z.number().nonnegative(),
  circulatingSupply: z.number().nonnegative().nullable(),
  totalSupply: z.number().nonnegative().nullable(),
  /** Fully diluted valuation, USD */
  fdv: z.number().nonnegative().nullable(),
  rank: z.number().int().positive(),
  ath: z.number().nonnegative().nullable(),
  /** ISO 8601 */
  athDate: z.string().nullable(),
  /** ISO 8601 — when the provider last updated this asset */
  lastUpdated: z.string().nullable(),
});
export type Asset = z.infer<typeof Asset>;

export const Snapshot = z.array(Asset);
export type Snapshot = z.infer<typeof Snapshot>;

export const SnapshotMeta = z.object({
  /** ISO 8601 — when the snapshot was written to KV */
  updatedAt: z.string(),
  count: z.number().int().nonnegative(),
  source: z.string(),
});
export type SnapshotMeta = z.infer<typeof SnapshotMeta>;

/** The slice of an asset the search picker needs. Stored separately so the island never loads the full snapshot. */
export const PickerAsset = Asset.pick({ id: true, slug: true, symbol: true, name: true, image: true, rank: true, marketCap: true });
export type PickerAsset = z.infer<typeof PickerAsset>;
export const PickerList = z.array(PickerAsset);

export function toPickerAsset(a: Asset): PickerAsset {
  return { id: a.id, slug: a.slug, symbol: a.symbol, name: a.name, image: a.image, rank: a.rank, marketCap: a.marketCap };
}
