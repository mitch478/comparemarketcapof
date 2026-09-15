# comparemarketcapof.com

"What would the price of asset A be if it had the market cap of asset B?"

See `PLAN.md` for the phased plan and `DESIGN.md` for the visual system.

## Layout

- `apps/web` — Astro 7 on Cloudflare Workers (`@astrojs/cloudflare`), React island for the picker, Tailwind 4 + DaisyUI 5.
- `apps/cron` — Hono Worker: hourly Cron Trigger that refreshes the CoinGecko snapshot into KV, plus the JSON API.
- `packages/core` — shared types, `AssetProvider` interface, compare and format logic, KV keys.

## Commands

```
pnpm install
pnpm check            # typecheck + tests, all packages
pnpm --filter @cmc/web dev
pnpm --filter @cmc/cron dev
pnpm --filter @cmc/web run deploy
pnpm --filter @cmc/cron run deploy
```

Secrets and env vars are listed in `.env.example`. The full runbook lands in Phase 5.
