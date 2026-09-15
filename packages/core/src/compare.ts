import type { Asset } from './types';

/**
 * "A with the market cap of B".
 *
 *   impliedPrice = B.marketCap / A.circulatingSupply
 *   multiplier   = B.marketCap / A.marketCap
 *
 * Both use circulating supply. The FDV variant is offered when A has a total
 * supply and B has an FDV (or one can be derived from price × total supply).
 */
export type ComparisonStatus =
  | 'ok'
  /** A and B are the same asset — route layer redirects to the hub. */
  | 'same'
  /** A has no circulating supply, so no price can be implied. Multiplier may still exist. */
  | 'missing-supply';

export type Direction = 'up' | 'down' | 'flat';

export interface Comparison {
  status: ComparisonStatus;
  a: Asset;
  b: Asset;
  /** null when status !== 'ok' */
  impliedPrice: number | null;
  /** B.marketCap / A.marketCap; null only when A.marketCap is 0 */
  multiplier: number | null;
  direction: Direction;
  /** Implied price on fully diluted supply, when both sides have the data. */
  impliedFdvPrice: number | null;
  fdvMultiplier: number | null;
  /** Plain-English caveats for the page and API ("n/a" explanations). Empty when everything computed. */
  notes: string[];
  /** ISO 8601 — snapshot time */
  updatedAt: string | null;
}

function safeDiv(n: number, d: number | null | undefined): number | null {
  if (d == null || !Number.isFinite(d) || d <= 0 || !Number.isFinite(n)) return null;
  const r = n / d;
  return Number.isFinite(r) ? r : null;
}

export function compare(a: Asset, b: Asset, updatedAt: string | null = null): Comparison {
  const notes: string[] = [];

  if (a.id === b.id) {
    return { status: 'same', a, b, impliedPrice: null, multiplier: 1, direction: 'flat', impliedFdvPrice: null, fdvMultiplier: null, notes: [`${a.name} already has its own market cap.`], updatedAt };
  }

  const multiplier = safeDiv(b.marketCap, a.marketCap);
  const impliedPrice = safeDiv(b.marketCap, a.circulatingSupply);

  const bFdv = b.fdv ?? (b.totalSupply ? b.price * b.totalSupply : null);
  const aFdv = a.fdv ?? (a.totalSupply ? a.price * a.totalSupply : null);
  const impliedFdvPrice = bFdv != null ? safeDiv(bFdv, a.totalSupply) : null;
  const fdvMultiplier = bFdv != null && aFdv != null ? safeDiv(bFdv, aFdv) : null;

  let direction: Direction = 'flat';
  if (multiplier != null) direction = multiplier > 1 ? 'up' : multiplier < 1 ? 'down' : 'flat';

  let status: ComparisonStatus = 'ok';
  if (impliedPrice == null) {
    status = 'missing-supply';
    notes.push(`Circulating supply for ${a.name} is not available, so an implied price can't be calculated.`);
  }
  if (multiplier == null) notes.push(`Market cap for ${a.name} is not available.`);
  if (impliedFdvPrice == null && status === 'ok') {
    notes.push('Fully diluted figures are not available for this pair.');
  }

  return { status, a, b, impliedPrice, multiplier, direction, impliedFdvPrice, fdvMultiplier, notes, updatedAt };
}
