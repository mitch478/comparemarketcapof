import { describe, expect, it } from 'vitest';
import { compare } from '../src/compare';
import { BTC, SOL, asset } from './helpers';

describe('compare', () => {
  it('SOL at BTC: implied price and multiplier from circulating supply', () => {
    const c = compare(SOL, BTC, '2026-09-15T00:00:00.000Z');
    expect(c.status).toBe('ok');
    expect(c.impliedPrice).toBeCloseTo(1_334_000_000_000 / 543_000_000, 6);
    expect(c.multiplier).toBeCloseTo(1_334_000_000_000 / 77_200_000_000, 6);
    expect(c.direction).toBe('up');
    expect(c.updatedAt).toBe('2026-09-15T00:00:00.000Z');
    expect(c.notes).toEqual([]);
  });

  it('FDV variant uses total supply and B fdv', () => {
    const c = compare(SOL, BTC);
    expect(c.impliedFdvPrice).toBeCloseTo(1_415_652_000_000 / 610_000_000, 6);
    expect(c.fdvMultiplier).toBeCloseTo(1_415_652_000_000 / 86_729_800_000, 6);
  });

  it('derives B fdv from price × total supply when fdv is null', () => {
    const b = asset({ ...BTC, fdv: null });
    const c = compare(SOL, b);
    expect(c.impliedFdvPrice).toBeCloseTo((67_412 * 21_000_000) / 610_000_000, 6);
  });

  it('BTC at SOL: multiplier below 1 → direction down', () => {
    const c = compare(BTC, SOL);
    expect(c.multiplier).toBeLessThan(1);
    expect(c.direction).toBe('down');
    expect(c.impliedPrice).toBeCloseTo(77_200_000_000 / 19_740_000, 6);
  });

  it('same asset → status same', () => {
    const c = compare(SOL, SOL);
    expect(c.status).toBe('same');
    expect(c.impliedPrice).toBeNull();
    expect(c.multiplier).toBe(1);
    expect(c.direction).toBe('flat');
  });

  it('missing circulating supply → no implied price, still has multiplier, has a note', () => {
    const a = asset({ ...SOL, circulatingSupply: null });
    const c = compare(a, BTC);
    expect(c.status).toBe('missing-supply');
    expect(c.impliedPrice).toBeNull();
    expect(c.multiplier).toBeGreaterThan(1);
    expect(c.notes[0]).toMatch(/Circulating supply for Solana/);
  });

  it('zero supply or zero market cap never yields Infinity/NaN', () => {
    const a = asset({ ...SOL, circulatingSupply: 0, marketCap: 0 });
    const c = compare(a, BTC);
    expect(c.impliedPrice).toBeNull();
    expect(c.multiplier).toBeNull();
    expect(c.direction).toBe('flat');
    for (const v of [c.impliedPrice, c.multiplier, c.impliedFdvPrice, c.fdvMultiplier]) {
      expect(v === null || Number.isFinite(v)).toBe(true);
    }
  });

  it('no FDV data → fdv fields null and a note, status still ok', () => {
    const a = asset({ ...SOL, totalSupply: null, fdv: null });
    const b = asset({ ...BTC, totalSupply: null, fdv: null });
    const c = compare(a, b);
    expect(c.status).toBe('ok');
    expect(c.impliedFdvPrice).toBeNull();
    expect(c.fdvMultiplier).toBeNull();
    expect(c.notes.join(' ')).toMatch(/Fully diluted/);
  });
});
