import { describe, expect, it } from 'vitest';
import { compare } from '../src/compare';
import { comparisonCopy } from '../src/copy';
import { BTC, SOL, asset } from './helpers';

describe('comparisonCopy', () => {
  it('up case', () => {
    const t = comparisonCopy(compare(SOL, BTC));
    expect(t.h1).toBe('Solana with the market cap of Bitcoin');
    expect(t.resultLine).toBe("If SOL reached BTC's current market cap, one SOL would be worth");
    expect(t.impliedPriceText).toBe('$2,457');
    expect(t.multiplierLine).toBe("17× today's price");
    expect(t.title).toBe("Solana at Bitcoin's market cap: $2,457 (17×)");
    expect(t.description).toMatch(/one SOL would be worth \$2,457, 17× its price today/);
    expect(t.shareText).toMatch(/\$2,457 \(17×\)/);
  });

  it('down case uses "would drop to"', () => {
    const t = comparisonCopy(compare(BTC, SOL));
    expect(t.resultLine).toMatch(/would drop to$/);
    expect(t.multiplierLine).toMatch(/^0\.058× today's price$/);
  });

  it('missing supply never prints NaN or undefined', () => {
    const t = comparisonCopy(compare(asset({ ...SOL, circulatingSupply: null }), BTC));
    const all = Object.values(t).join(' ');
    expect(all).not.toMatch(/NaN|undefined|null/);
    expect(t.impliedPriceText).toBe('n/a');
    expect(t.title).toBe("Solana at Bitcoin's market cap");
  });

  it('same asset', () => {
    const t = comparisonCopy(compare(SOL, SOL));
    expect(t.resultLine).toMatch(/already has its own market cap/);
  });
});
