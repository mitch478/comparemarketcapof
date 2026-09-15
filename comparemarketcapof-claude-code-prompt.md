# comparemarketcapof.app — build brief

You are building **comparemarketcapof.app**, a free, fast, SEO-first tool that answers one question:
**"What would the price of asset A be if it had the market cap of asset B?"**

Version 1 is **crypto only**. Stocks are phase 2 — design the data model so adding them later is a new provider, not a rewrite.

Work in phases (defined at the end). **Stop after Phase 0 and wait for my approval of the rendered design before building the real pages.**

---

## 1. Stack (non-negotiable)

Monorepo (pnpm workspaces) with two Workers:

- `apps/web` — **Astro** (latest stable) with the `@astrojs/cloudflare` adapter, running on **Cloudflare Workers** (not Pages). Output mode: server, with per-route prerendering where noted. Uses `@astrojs/react` for the single interactive island (the asset picker). TypeScript `strict`. Tailwind CSS.
- `apps/cron` — a minimal **Hono** (or plain) Worker with a **Cron Trigger** that refreshes the CoinGecko snapshot into KV. This Worker also serves the JSON API (see Routes). No UI.
- `packages/core` — shared TypeScript: asset types, the `AssetProvider` interface, `compare.ts`, `format.ts`, KV key constants. Both apps import from here.

Cloudflare services: **KV** (snapshot, shared binding across both Workers), **Cron Triggers**, **Workers Builds** for git-push deploys, existing Cloudflare zone for the custom domain. Bindings defined in each app's `wrangler.jsonc`; read them in Astro via `import { env } from 'cloudflare:workers'`. Local dev: `wrangler dev` for the cron Worker, `astro dev` for the site (with a seeded local KV, see Phase 1).

- No database. No auth. No cookie banner (Plausible or Umami for analytics — cookieless).
- Tests: Vitest for `packages/core` and the cron Worker (use `@cloudflare/vitest-pool-workers` for the Worker). Playwright smoke test for home → pick pair → comparison page.
- OG images: use `workers-og` (Satori + resvg built for Workers) in an Astro endpoint route. **In Phase 0, prove it renders under the Cloudflare adapter with a throwaway route.**
- Sitemaps and robots via Astro endpoint routes (`src/pages/sitemap-[n].xml.ts`, `robots.txt.ts`), not the `@astrojs/sitemap` integration — the URL set is data-driven, not file-driven.

## 2. Data layer

**Source:** CoinGecko public API, free tier. Endpoint `/coins/markets` with `vs_currency=usd`, ordered by market cap, top **500** assets (two pages of 250). To start off but we need to capture all of the coins. This snapshot only needs to happens once a day. 

Rules:
- **Only the cron Worker talks to CoinGecko.** Its `scheduled()` handler runs every 15 minutes, fetches both pages, validates the shape (zod), and writes to KV: `snapshot:crypto` (the full array) and `snapshot:meta` (`{ updatedAt, count, source }`). Also expose a `POST /refresh` route on the cron Worker protected by a secret header so a snapshot can be forced manually.
- If a refresh fails (rate limit, bad payload), **do not overwrite KV** — keep the last good snapshot, log the failure via `console.error` (Workers observability is on), and move on. The site must never 500 because of an upstream failure.
- The Astro app reads KV only, once per request, via a `getSnapshot()` helper in `packages/core` that also returns `updatedAt`. Cache the parsed snapshot in module scope with a short TTL so a burst of requests on one isolate doesn't re-parse 500 assets each time.
- Store per asset: `id`, `slug`, `symbol`, `name`, `image`, `price`, `marketCap`, `circulatingSupply`, `totalSupply`, `fdv`, `rank`, `ath`, `athDate`, `lastUpdated`.
- Define the `AssetProvider` interface in `packages/core` so a `StockProvider` can drop in later. Asset has `type: 'crypto' | 'stock'`.
- Show a visible "data as of HH:MM UTC" stamp on every comparison.

## 3. Core calculation

For "A with the market cap of B":

```
impliedPrice = B.marketCap / A.circulatingSupply
multiplier   = B.marketCap / A.marketCap
```

- Use **circulating** supply consistently. State that on the page ("based on circulating supply").
- Also show the FDV variant as a secondary figure when both assets have a total supply.
- Handle: A === B (redirect to A's hub page), missing supply (show "n/a" with explanation, never NaN), multiplier < 1 (A is already bigger — phrase copy accordingly: "would drop to").
- Put this logic in `packages/core/compare.ts` with full Vitest coverage, including formatting helpers (compact numbers: $1.2B, 3.4×; sensible decimals for sub-cent prices).

## 4. Routes and URL design (this IS the product)

Every ordered pair is its own page. A-at-B and B-at-A are different pages with different meaning — both valid, no canonical collapse.

- `/` — home: two asset pickers (searchable, keyboard-friendly, shows rank + logo), live result, and a "Popular comparisons" grid.
- `/[a]/with-the-market-cap-of/[b]` — the comparison page. Example: `/solana/with-the-market-cap-of/bitcoin`. Use CoinGecko ids as slugs. Unknown slug → 404, not a crash.
- `/[a]` — asset hub page: current stats, then links to A-at-{top 20} and {top 20}-at-A. This exists purely for internal linking; keep it useful, not thin.
- `/coins` — top-500 index table (rank, name, price, market cap), each row linking to the hub page.

Rendering: comparison and hub pages are **server-rendered on demand** from KV, with `Cache-Control: public, s-maxage=900, stale-while-revalidate=3600` so Cloudflare's cache serves them for the 15-minute window. Do not prerender pair pages at build time — the numbers go stale and the build gets huge. Prerender only static pages (about, privacy). The home page is server-rendered too (it shows live numbers).

**JSON API** (served by the cron Worker on `api.comparemarketcapof.app`, CORS open, same cache headers):
- `GET /v1/assets` — the snapshot, trimmed to fields needed by the picker.
- `GET /v1/compare/:a/:b` — the full computed comparison as JSON. This is the same object the Astro page renders; build the page from it so the API and the HTML can never disagree.
- `GET /v1/meta` — `updatedAt`, asset count.
Add an `llms.txt` at the site root describing the site and the API.

## 5. SEO

- Per-page `<title>`, meta description and OG tags from a shared `<Seo>` component. Title pattern: `Solana at Bitcoin's market cap: $X,XXX (12.3×) | comparemarketcapof`. Description written in plain English with the numbers in it.
- Canonical URLs, no query params in indexable URLs.
- JSON-LD: `WebPage` + `BreadcrumbList` on comparison pages; `Dataset`-style metadata is overkill — skip it. Do **not** fabricate `FAQPage` markup.
- Sitemaps: a `sitemap-index.xml` pointing at chunked `sitemap-[n].xml` endpoints (≤5,000 URLs each), generated from the KV snapshot at request time and cached for an hour. Include: all hub pages, all top-500-at-top-20 comparisons (~10k URLs), `/coins`. Exclude anything outside that set.
- Internal linking blocks on every comparison page: "More comparisons for A", "Other assets at B's market cap", "Reverse this comparison".
- Core Web Vitals: LCP < 1.5s on mobile for the comparison page. No client-side data fetching on the critical path.

## 6. OG images and sharing

- Dynamic OG image per comparison page via a `workers-og` endpoint route (`/og/[a]/[b].png`): both logos, the implied price large, the multiplier, the site name. Same cache headers as the page.
- Share row on the comparison page: copy link, share to X (pre-filled text with the headline numbers and the URL), download image.

## 7. Affiliate slots (disabled by default)

- Build an `<AffiliateSlot placement="..." />` component driven by a single config file (`config/affiliates.ts`).
- Slots: one below the result on comparison pages, one on hub pages. Render nothing if the slot has no active partner.
- When active: `rel="sponsored nofollow"`, visible "Sponsored" label, and a short disclosure line. Support region gating via `request.cf.country` (or the `CF-IPCountry` header) so UK and non-UK can show different creatives or nothing.
- Do not add any partner links yourself. Ship with all slots empty.

## 8. Design

The direction is decided. Two reference files are in `/design/`:
- `design/DESIGN-HANDOFF.md` — token spec (colours, type, radius, shadows) and behaviour notes from the Figma mock.
- `design/compare-market-cap-prototype.dc.html` — an HTML prototype of the compare screen. Design reference only; do not copy the markup or its custom elements.

Build to the handoff spec **with these overrides**, which take precedence wherever they conflict:

**Style: flat neo-brutalist.** Solid colours, hard offset shadows, no gradients anywhere.
- Page background: off-white `rgb(255,250,250)`. Not the lavender.
- Compare card: solid purple `#744AE3`, 12px radius, 2px near-black border, hard shadow `8px 8px 0 rgb(14,14,14)`. No gradient fill.
- Buttons and pills: keep the handoff's purple, radius and hard shadow style, but make shadows solid (`6px 6px 0 rgb(14,14,14)`) rather than blurred.
- Accent lime `rgb(217,255,29)` is reserved for the implied price only. Nothing else is lime.
- Dark mode via `prefers-color-scheme`: near-black page, purple card, same lime. Derive the rest sensibly.

**Type.**
- Bungee for the wordmark and the H1 only. Instrument Sans for UI. Inter for body and all numbers, with `font-feature-settings: "tnum"` on every numeric element so digits don't shift width on refresh.
- Type scale: 64 (hero price, mobile 48) / 24 (H1) / 20 / 16 / 15 / 13 / 12.

**Hierarchy on the comparison page (top to bottom).**
1. H1: the dynamic sentence, e.g. "Solana with the market cap of Ethereum". Not the generic headline from the mock.
2. Compare card: picker A, "VS", picker B — as in the mock.
3. Result line in white: "If SOL reached ETH's current market cap, one SOL would be worth" (or "would drop to" when multiplier < 1).
4. Implied price: 64px lime, tabular figures. **This is the single most important element on the page.**
5. Multiplier on its own line beneath, 20px white: "4.2× today's price". Below 1: "0.31× today's price".
6. Stat rows for each coin as in the mock (price, market cap, plus circulating supply), using real logos from the API — not black circles with text.
7. Share row (copy link, share to X, download image).
8. `<AffiliateSlot>` — empty.
9. Internal-linking blocks.

**Remove from the mock:** the `BUY {A}` button (do not build it or a variant of it), the "Demo data" footer, the `showBuyButton` flag.

**Picker.** The mock's dropdown is a top-20 list. Production is a searchable combobox over all 500 assets: type-ahead on symbol and name, rank + logo + market cap per row, keyboard navigable, rows ≥44px tall, closes on selection and on outside tap. Default pair on the home page: SOL → BTC.

**Keep from the prototype:** the `fmtCap` / `fmtPrice` / multiplier-formatting rules in the handoff (with the sub-cent case using 2 significant figures). Port them into `packages/core/format.ts` with tests.

## 9. Engineering standards

- Lint + typecheck + tests pass on every phase before you report done.
- Small, focused commits with conventional commit messages.
- Env vars documented in `.env.example`. Never commit secrets.
- Error and empty states designed, not defaulted.
- Accessibility: pickers usable by keyboard and screen reader; colour contrast AA.

## 10. Phases

**Phase 0 — Scaffold + design tokens.** Monorepo with `apps/web` (Astro + Cloudflare adapter + React island support), `apps/cron` (Hono Worker with a Cron Trigger stub), `packages/core`. `wrangler.jsonc` for each app with the shared KV binding and the cron schedule. Deploy both to `*.workers.dev` URLs so the pipeline is proven. The `workers-og` spike (see Stack). Tooling, CI config, provider interface stub. Translate the Design section into `DESIGN.md` plus Tailwind theme tokens, and render a static comparison-page mock at `/dev/design` using hard-coded SOL/BTC numbers so I can check it on a phone. **STOP and ask for approval.**

**Phase 1 — Data + logic.** Cron Worker: CoinGecko fetch, validation, KV write, failure handling, `POST /refresh`, tests. `packages/core`: `compare.ts`, `format.ts`, `getSnapshot()`, tests. A `pnpm seed` script that writes a fixture snapshot into local KV so `astro dev` works offline. Verify with a CLI script that prints a sample comparison from KV.

**Phase 2 — Pages.** Home, comparison, hub, `/coins`. Real data, approved design.

**Phase 3 — SEO.** Metadata, JSON-LD, sitemaps, robots, internal linking blocks, Lighthouse run with results pasted into the PR description.

**Phase 4 — OG + share.** Dynamic OG images, share row.

**Phase 5 — API, affiliate slots, analytics, deploy.** JSON API routes on the cron Worker, `llms.txt`, empty affiliate slots wired up, Plausible/Umami, custom domains bound (`comparemarketcapof.app` → web, `api.comparemarketcapof.app` → cron), Cron Trigger verified in production, README with runbook (bindings, secrets, how to force a snapshot refresh, how to roll back a deploy).

**Phase 6 — MCP server.** Expose `compare` and `search_assets` as tools over the Workers MCP transport on the cron Worker, reading the same KV snapshot. Test it from Claude Code.

**Phase 7 (later, do not start) — Stocks.** `StockProvider`, mixed-type comparisons, licensing review.

At the end of each phase, give me: what was built, what you decided that I didn't specify, and anything you'd flag as a risk.
