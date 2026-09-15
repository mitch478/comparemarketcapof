import { z } from 'zod';
import type { AssetProvider } from '../provider';
import type { Asset } from '../types';

/** Raw row from GET /coins/markets. Only the fields we consume; everything else is passed through untouched. */
export const CoinGeckoMarketRow = z.object({
  id: z.string().min(1),
  symbol: z.string().min(1),
  name: z.string().min(1),
  image: z.string().nullable(),
  current_price: z.number().nullable(),
  market_cap: z.number().nullable(),
  market_cap_rank: z.number().int().nullable(),
  fully_diluted_valuation: z.number().nullable(),
  circulating_supply: z.number().nullable(),
  total_supply: z.number().nullable(),
  ath: z.number().nullable(),
  ath_date: z.string().nullable(),
  last_updated: z.string().nullable(),
});
export type CoinGeckoMarketRow = z.infer<typeof CoinGeckoMarketRow>;
export const CoinGeckoMarketsPage = z.array(CoinGeckoMarketRow);

export const COINGECKO_PAGE_SIZE = 250;

/**
 * Map one CoinGecko row to an Asset. Returns null when the row can't be compared
 * (no price, no market cap, or no rank) — those are skipped, not failed.
 */
export function mapCoinGeckoRow(row: CoinGeckoMarketRow): Asset | null {
  if (row.current_price == null || row.market_cap == null || row.market_cap_rank == null) return null;
  if (row.current_price < 0 || row.market_cap <= 0) return null;
  const nonNeg = (n: number | null) => (n != null && n >= 0 ? n : null);
  return {
    type: 'crypto',
    id: row.id,
    slug: row.id,
    symbol: row.symbol.toUpperCase(),
    name: row.name,
    image: row.image && /^https?:\/\//.test(row.image) ? row.image : null,
    price: row.current_price,
    marketCap: row.market_cap,
    circulatingSupply: nonNeg(row.circulating_supply),
    totalSupply: nonNeg(row.total_supply),
    fdv: nonNeg(row.fully_diluted_valuation),
    rank: row.market_cap_rank,
    ath: nonNeg(row.ath),
    athDate: row.ath_date,
    lastUpdated: row.last_updated,
  };
}

export interface CoinGeckoProviderOptions {
  /** How many assets to fetch, rounded up to whole pages of 250. */
  limit: number;
  /** Optional Demo API key (sent as x-cg-demo-api-key). */
  apiKey?: string | undefined;
  /** Pause between page requests. Free tier allows ~30 req/min. */
  pageDelayMs?: number;
  baseUrl?: string;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export class CoinGeckoProvider implements AssetProvider {
  readonly type = 'crypto' as const;
  readonly source = 'coingecko';
  private readonly opts: Required<CoinGeckoProviderOptions>;

  constructor(opts: CoinGeckoProviderOptions) {
    this.opts = {
      limit: opts.limit,
      apiKey: opts.apiKey ?? '',
      pageDelayMs: opts.pageDelayMs ?? 2500,
      baseUrl: opts.baseUrl ?? 'https://api.coingecko.com/api/v3',
      fetch: opts.fetch ?? globalThis.fetch.bind(globalThis),
      sleep: opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms))),
    };
  }

  pageUrl(page: number): string {
    const u = new URL(`${this.opts.baseUrl}/coins/markets`);
    u.searchParams.set('vs_currency', 'usd');
    u.searchParams.set('order', 'market_cap_desc');
    u.searchParams.set('per_page', String(COINGECKO_PAGE_SIZE));
    u.searchParams.set('page', String(page));
    u.searchParams.set('sparkline', 'false');
    return u.toString();
  }

  /** Fetch every page up to `limit`. Throws on any HTTP or schema failure so a partial list is never returned. */
  async fetchAll(): Promise<Asset[]> {
    const pages = Math.max(1, Math.ceil(this.opts.limit / COINGECKO_PAGE_SIZE));
    const seen = new Set<string>();
    const out: Asset[] = [];
    let skipped = 0;

    for (let page = 1; page <= pages; page++) {
      if (page > 1) await this.opts.sleep(this.opts.pageDelayMs);
      const headers: Record<string, string> = { accept: 'application/json', 'user-agent': 'comparemarketcapof.com cron (+https://comparemarketcapof.com)' };
      if (this.opts.apiKey) headers['x-cg-demo-api-key'] = this.opts.apiKey;
      const res = await this.opts.fetch(this.pageUrl(page), { headers });
      if (!res.ok) {
        const body = (await res.text().catch(() => "")).slice(0, 200).replace(/\s+/g, " ");
        const diag = ["cf-cache-status", "cf-ray", "retry-after", "content-type"]
          .map((h) => `${h}=${res.headers.get(h) ?? "-"}`)
          .join(" ");
        throw new Error(`coingecko: page ${page} responded ${res.status} ${res.statusText} [${diag}] ${body}`);
      }
      const parsed = CoinGeckoMarketsPage.safeParse(await res.json());
      if (!parsed.success) {
        throw new Error(`coingecko: page ${page} failed validation: ${parsed.error.issues[0]?.message ?? 'unknown'}`);
      }
      for (const row of parsed.data) {
        if (seen.has(row.id)) continue;
        const asset = mapCoinGeckoRow(row);
        if (!asset) { skipped++; continue; }
        seen.add(row.id);
        out.push(asset);
      }
      if (parsed.data.length < COINGECKO_PAGE_SIZE) break; // last page
    }

    if (skipped > 0) console.warn(`coingecko: skipped ${skipped} rows without price/market cap/rank`);
    out.sort((a, b) => a.rank - b.rank);
    return out.slice(0, this.opts.limit);
  }
}
