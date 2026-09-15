/**
 * Seed the LOCAL KV store with the committed CoinGecko fixture so `astro dev`
 * and `wrangler dev` work offline. Both apps persist local state to
 * <repo>/.wrangler/state so they share one KV.
 *
 *   pnpm --filter @cmc/cron seed
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { CoinGeckoMarketsPage, KV_KEYS, mapCoinGeckoRow, toPickerAsset, type SnapshotMeta } from '@cmc/core';

const root = resolve(import.meta.dirname, '../../..');
const persistTo = join(root, '.wrangler/state');
const fixture = join(root, 'packages/core/fixtures/coingecko-markets-page1.json');

const rows = CoinGeckoMarketsPage.parse(JSON.parse(readFileSync(fixture, 'utf8')));
const assets = rows.map(mapCoinGeckoRow).filter((a) => a !== null);
const meta: SnapshotMeta = { updatedAt: new Date().toISOString(), count: assets.length, source: 'fixture:coingecko' };

const tmp = mkdtempSync(join(tmpdir(), 'cmc-seed-'));
const files: Array<[string, unknown]> = [
  [KV_KEYS.snapshotCrypto, assets],
  [KV_KEYS.snapshotPicker, assets.map(toPickerAsset)],
  [KV_KEYS.snapshotMeta, meta],
];
for (const [key, value] of files) {
  const path = join(tmp, key.replace(':', '_') + '.json');
  writeFileSync(path, JSON.stringify(value));
  execFileSync('wrangler', ['kv', 'key', 'put', key, '--binding', 'SNAPSHOT', '--local', '--persist-to', persistTo, '--path', path], {
    cwd: resolve(import.meta.dirname, '..'),
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  console.log(`seeded ${key}`);
}
console.log(`\n${assets.length} assets written to local KV at ${persistTo}`);
