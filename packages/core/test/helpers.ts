import type { Asset } from '../src/types';

export function asset(over: Partial<Asset> & Pick<Asset, 'id'>): Asset {
  return {
    type: 'crypto',
    slug: over.id,
    symbol: over.id.slice(0, 3).toUpperCase(),
    name: over.id[0]!.toUpperCase() + over.id.slice(1),
    image: null,
    price: 1,
    marketCap: 1_000_000,
    circulatingSupply: 1_000_000,
    totalSupply: 1_000_000,
    fdv: 1_000_000,
    rank: 1,
    ath: null,
    athDate: null,
    lastUpdated: null,
    ...over,
  };
}

export const SOL = asset({ id: 'solana', symbol: 'SOL', name: 'Solana', price: 142.18, marketCap: 77_200_000_000, circulatingSupply: 543_000_000, totalSupply: 610_000_000, fdv: 86_729_800_000, rank: 5 });
export const BTC = asset({ id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', price: 67_412, marketCap: 1_334_000_000_000, circulatingSupply: 19_740_000, totalSupply: 21_000_000, fdv: 1_415_652_000_000, rank: 1 });
