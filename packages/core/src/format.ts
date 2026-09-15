/**
 * Number formatting ported from the design prototype (Design/Compare Market Cap.dc.html)
 * with the handoff's rules, plus the brief's overrides (sub-cent prices use 2 significant
 * figures; multiplier uses a trailing ×).
 *
 * Every function is total: NaN / Infinity / null never reach the page as text.
 */

const NA = 'n/a';

function finite(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

/** Market cap / FDV: $1.23T, $12.3B, $450M, $820K. */
export function formatCap(n: number | null | undefined): string {
  if (!finite(n) || n < 0) return NA;
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(0) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + n.toFixed(0);
}

/**
 * Prices:
 *  ≥ $1000 → no decimals, thousands separators ($67,412)
 *  ≥ $1    → 2 decimals ($142.18)
 *  ≥ $0.01 → 3 decimals ($0.083)
 *  else    → 2 significant figures ($0.0000012)
 */
export function formatPrice(n: number | null | undefined): string {
  if (!finite(n) || n < 0) return NA;
  if (n === 0) return '$0.00';
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (n >= 1) return '$' + n.toFixed(2);
  if (n >= 0.01) return '$' + n.toFixed(3);
  // toPrecision can produce exponent notation for very small numbers; expand it.
  return '$' + expandExponent(n.toPrecision(2));
}

/** Multiplier: 2 significant figures, integer when ≥ 10, trailing ×. 4.2× / 12× / 0.31× */
export function formatMultiplier(n: number | null | undefined): string {
  if (!finite(n) || n < 0) return NA;
  if (n >= 10) return Math.round(n).toLocaleString('en-US') + '×';
  return expandExponent(n.toPrecision(2)) + '×';
}

/** Supply counts: 19.7M BTC, 588M SOL, 1.2B — no currency sign. */
export function formatSupply(n: number | null | undefined, symbol?: string): string {
  if (!finite(n) || n < 0) return NA;
  let s: string;
  if (n >= 1e12) s = (n / 1e12).toFixed(2) + 'T';
  else if (n >= 1e9) s = (n / 1e9).toFixed(2) + 'B';
  else if (n >= 1e6) s = (n / 1e6).toFixed(1) + 'M';
  else s = n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return symbol ? `${s} ${symbol}` : s;
}

/** "HH:MM UTC" for the "data as of" stamp. */
export function formatUtcTime(iso: string | null | undefined): string {
  if (!iso) return NA;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NA;
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm} UTC`;
}

/** Turn "1.2e-7" into "0.00000012". Leaves plain decimals untouched. */
export function expandExponent(s: string): string {
  if (!/e/i.test(s)) return s;
  const [mantissa, expStr] = s.toLowerCase().split('e') as [string, string];
  const exp = Number(expStr);
  const negative = mantissa.startsWith('-');
  const digits = mantissa.replace('-', '').replace('.', '');
  const pointIndex = mantissa.replace('-', '').indexOf('.');
  const intLen = pointIndex === -1 ? digits.length : pointIndex;
  const newPoint = intLen + exp;
  let out: string;
  if (newPoint <= 0) out = '0.' + '0'.repeat(-newPoint) + digits;
  else if (newPoint >= digits.length) out = digits + '0'.repeat(newPoint - digits.length);
  else out = digits.slice(0, newPoint) + '.' + digits.slice(newPoint);
  return (negative ? '-' : '') + out;
}
