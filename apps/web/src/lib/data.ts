import { env } from 'cloudflare:workers';
import { getPickerList, getSnapshot, type Asset, type LoadedSnapshot, type PickerAsset } from '@cmc/core';

/** One KV read per request (cached per isolate for 60s inside core). */
export function loadSnapshot(): Promise<LoadedSnapshot> {
  return getSnapshot(env.SNAPSHOT);
}

export function loadPickerList(): Promise<PickerAsset[]> {
  return getPickerList(env.SNAPSHOT);
}

/** Slugs are CoinGecko ids: lowercase, [a-z0-9-]. Anything else is a 404 before we touch data. */
export function isValidSlug(s: string | undefined): s is string {
  return typeof s === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(s);
}

export function findAsset(snap: LoadedSnapshot, slug: string | undefined): Asset | undefined {
  return isValidSlug(slug) ? snap.byId.get(slug) : undefined;
}

/** Top N by rank, excluding `exclude`. */
export function topAssets(snap: LoadedSnapshot, n: number, exclude?: string): Asset[] {
  const out: Asset[] = [];
  for (const a of snap.assets) {
    if (a.id === exclude) continue;
    out.push(a);
    if (out.length === n) break;
  }
  return out;
}

export const DEFAULT_A = 'solana';
export const DEFAULT_B = 'bitcoin';
