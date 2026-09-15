import { describe, expect, it } from 'vitest';
import {
  expandExponent,
  formatCap,
  formatMultiplier,
  formatPrice,
  formatSupply,
  formatUtcTime,
} from '../src/format';

describe('formatCap', () => {
  it('uses T / B / M / K tiers from the handoff', () => {
    expect(formatCap(1_334_000_000_000)).toBe('$1.33T');
    expect(formatCap(98_700_000_000)).toBe('$98.7B');
    expect(formatCap(450_000_000)).toBe('$450M');
    expect(formatCap(820_000)).toBe('$820K');
    expect(formatCap(12)).toBe('$12');
  });
  it('never emits NaN', () => {
    expect(formatCap(null)).toBe('n/a');
    expect(formatCap(Number.NaN)).toBe('n/a');
    expect(formatCap(Number.POSITIVE_INFINITY)).toBe('n/a');
    expect(formatCap(-5)).toBe('n/a');
  });
});

describe('formatPrice', () => {
  it('≥ $1000: no decimals, thousands separators', () => {
    expect(formatPrice(67_412.55)).toBe('$67,413');
    expect(formatPrice(1000)).toBe('$1,000');
  });
  it('≥ $1: two decimals', () => {
    expect(formatPrice(142.184)).toBe('$142.18');
    expect(formatPrice(1)).toBe('$1.00');
  });
  it('≥ $0.01: three decimals', () => {
    expect(formatPrice(0.0834)).toBe('$0.083');
    expect(formatPrice(0.01)).toBe('$0.010');
  });
  it('sub-cent: two significant figures, no exponent', () => {
    expect(formatPrice(0.0012345)).toBe('$0.0012');
    expect(formatPrice(0.00000012345)).toBe('$0.00000012');
  });
  it('zero and bad input', () => {
    expect(formatPrice(0)).toBe('$0.00');
    expect(formatPrice(null)).toBe('n/a');
    expect(formatPrice(Number.NaN)).toBe('n/a');
  });
});

describe('formatMultiplier', () => {
  it('two significant figures below 10', () => {
    expect(formatMultiplier(4.2345)).toBe('4.2×');
    expect(formatMultiplier(1.05)).toBe('1.1×');
  });
  it('integer at 10 and above', () => {
    expect(formatMultiplier(12.7)).toBe('13×');
    expect(formatMultiplier(1234.5)).toBe('1,235×');
  });
  it('below 1 keeps two significant figures', () => {
    expect(formatMultiplier(0.3121)).toBe('0.31×');
    expect(formatMultiplier(0.0042)).toBe('0.0042×');
  });
  it('bad input', () => {
    expect(formatMultiplier(null)).toBe('n/a');
    expect(formatMultiplier(Number.POSITIVE_INFINITY)).toBe('n/a');
  });
});

describe('formatSupply', () => {
  it('formats with optional symbol', () => {
    expect(formatSupply(19_740_000, 'BTC')).toBe('19.7M BTC');
    expect(formatSupply(588_000_000, 'SOL')).toBe('588.0M SOL');
    expect(formatSupply(120_500_000_000)).toBe('120.50B');
    expect(formatSupply(21_000)).toBe('21,000');
    expect(formatSupply(null, 'X')).toBe('n/a');
  });
});

describe('formatUtcTime', () => {
  it('renders HH:MM UTC', () => {
    expect(formatUtcTime('2026-09-15T07:05:00.000Z')).toBe('07:05 UTC');
    expect(formatUtcTime('garbage')).toBe('n/a');
    expect(formatUtcTime(null)).toBe('n/a');
  });
});

describe('expandExponent', () => {
  it('expands negative and positive exponents', () => {
    expect(expandExponent('1.2e-7')).toBe('0.00000012');
    expect(expandExponent('1.2e+3')).toBe('1200');
    expect(expandExponent('0.0012')).toBe('0.0012');
  });
});
