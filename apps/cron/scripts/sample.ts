/**
 * Print a comparison computed from the LOCAL KV snapshot (seed it first).
 *
 *   pnpm --filter @cmc/cron sample -- solana bitcoin
 */
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { KV_KEYS, Snapshot, SnapshotMeta, compare, comparisonCopy, formatCap, formatMultiplier, formatPrice, formatSupply, formatUtcTime } from '@cmc/core';

const [aId = 'solana', bId = 'bitcoin'] = process.argv.slice(2).filter((x) => x !== '--');
const root = resolve(import.meta.dirname, '../../..');
const persistTo = join(root, '.wrangler/state');

function kvGet(key: string): string {
  return execFileSync('wrangler', ['kv', 'key', 'get', key, '--binding', 'SNAPSHOT', '--local', '--persist-to', persistTo], {
    cwd: resolve(import.meta.dirname, '..'),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
}

const assets = Snapshot.parse(JSON.parse(kvGet(KV_KEYS.snapshotCrypto)));
const meta = SnapshotMeta.parse(JSON.parse(kvGet(KV_KEYS.snapshotMeta)));
const byId = new Map(assets.map((a) => [a.id, a]));
const a = byId.get(aId);
const b = byId.get(bId);
if (!a || !b) {
  console.error(`unknown asset: ${!a ? aId : bId}. Try one of: ${assets.slice(0, 10).map((x) => x.id).join(', ')} …`);
  process.exit(1);
}

const c = compare(a, b, meta.updatedAt);
const t = comparisonCopy(c);
console.log(`\n${t.h1}\n${'─'.repeat(t.h1.length)}`);
console.log(t.resultLine);
console.log(`  ${t.impliedPriceText}   ${t.multiplierLine}`);
if (c.impliedFdvPrice != null) console.log(`  on fully diluted supply: ${formatPrice(c.impliedFdvPrice)} (${formatMultiplier(c.fdvMultiplier)})`);
for (const x of [a, b]) {
  console.log(`\n${x.name} (${x.symbol}) #${x.rank}  price ${formatPrice(x.price)}  cap ${formatCap(x.marketCap)}  circ ${formatSupply(x.circulatingSupply, x.symbol)}`);
}
if (c.notes.length) console.log(`\nnotes: ${c.notes.join(' ')}`);
console.log(`\n<title> ${t.title} | comparemarketcapof`);
console.log(`data as of ${formatUtcTime(c.updatedAt)} (${meta.source}, ${meta.count} assets)\n`);
