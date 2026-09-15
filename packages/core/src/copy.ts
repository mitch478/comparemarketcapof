import type { Comparison } from './compare';
import { formatMultiplier, formatPrice } from './format';

/**
 * The sentences the page and the OG image and the API description share.
 * One source so HTML, JSON and images can never disagree.
 */
export interface ComparisonCopy {
  /** "Solana with the market cap of Bitcoin" */
  h1: string;
  /** "If SOL reached BTC's current market cap, one SOL would be worth" */
  resultLine: string;
  /** "$2,457" or "n/a" */
  impliedPriceText: string;
  /** "17× today's price" or "" */
  multiplierLine: string;
  /** <title> content, without the site suffix */
  title: string;
  /** meta description */
  description: string;
  /** Prefilled text for share-to-X */
  shareText: string;
}

export function comparisonCopy(c: Comparison): ComparisonCopy {
  const { a, b } = c;
  const h1 = `${a.name} with the market cap of ${b.name}`;
  const verb = c.direction === 'down' ? 'would drop to' : 'would be worth';
  const price = c.impliedPrice != null ? formatPrice(c.impliedPrice) : 'n/a';
  const mult = c.multiplier != null ? formatMultiplier(c.multiplier) : null;

  if (c.status === 'same') {
    return {
      h1,
      resultLine: `${a.name} already has its own market cap.`,
      impliedPriceText: formatPrice(a.price),
      multiplierLine: '1× today\'s price',
      title: `${a.name} market cap`,
      description: `${a.name} (${a.symbol}) current price and market cap.`,
      shareText: `${a.name} (${a.symbol}) is trading at ${formatPrice(a.price)}.`,
    };
  }

  const resultLine =
    c.status === 'ok'
      ? `If ${a.symbol} reached ${b.symbol}'s current market cap, one ${a.symbol} ${verb}`
      : `If ${a.symbol} reached ${b.symbol}'s current market cap, its price can't be implied`;

  const multiplierLine = mult ? `${mult} today's price` : '';
  const title = mult && c.status === 'ok'
    ? `${a.name} at ${b.name}'s market cap: ${price} (${mult})`
    : `${a.name} at ${b.name}'s market cap`;

  const description =
    c.status === 'ok'
      ? `If ${a.name} (${a.symbol}) had the market cap of ${b.name} (${b.symbol}), one ${a.symbol} ${verb} ${price}, ${mult} its price today. Based on circulating supply.`
      : `${a.name} (${a.symbol}) compared with the market cap of ${b.name} (${b.symbol}). ${c.notes[0] ?? ''}`.trim();

  const shareText =
    c.status === 'ok'
      ? `${a.symbol} with the market cap of ${b.symbol} ${verb} ${price} (${mult}).`
      : `${a.symbol} with the market cap of ${b.symbol}.`;

  return { h1, resultLine, impliedPriceText: price, multiplierLine, title, description, shareText };
}
