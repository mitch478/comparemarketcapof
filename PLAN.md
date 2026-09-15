# PLAN.md — comparemarketcapof.com working plan

Rules for every phase:
- Work stops at the end of each phase. Nathan tests, then says "go" (or asks for changes) before the next phase starts.
- Each phase ends with: what was built, decisions I made that weren't specified, risks, and exactly how to test it.
- `pnpm check` (typecheck + tests) is green before a phase is reported done.
- Small conventional commits. Nothing is pushed to a remote until one exists and Nathan says so.

Stack decisions already locked in (from the brief plus what's installed and verified):
- pnpm 12 workspace: `apps/web` (Astro 7.3 + `@astrojs/cloudflare` 14 + React island + Tailwind 4), `apps/cron` (Hono 4 Worker), `packages/core` (shared TS).
- **DaisyUI 5** on Tailwind 4 for components (buttons, combobox scaffolding, tables, badges, toasts). A custom DaisyUI theme (`cmc`) carries the neo-brutalist tokens; hard offset shadows and 2px borders are applied as utilities on top, since DaisyUI's own shadows are soft.
- Vitest 4 + `@cloudflare/vitest-pool-workers` (plugin API) for the cron Worker; plain Vitest for core; Playwright for the web smoke test.
- Wrangler `compatibility_date` pinned to `2026-08-20` (the newest the local test runtime supports).
- KV namespace `SNAPSHOT` (id `7a4189d9beec418fa3343aaadbfee257`) already created on the MCSLTD.io account.

---

## Phase 0 — Scaffold, tokens, design mock  ← DONE 2026-09-15, awaiting Nathan's test

Done and verified:
- [x] Git repo, workspace, `.gitignore`, `.env.example`, base tsconfig, CI workflow.
- [x] `packages/core`: `Asset`/`Snapshot` zod schemas, `AssetProvider` interface, KV key constants, `format.ts` (cap, price, multiplier, supply, UTC stamp). 14 tests pass.
- [x] `apps/cron`: Hono app (`/`, `/health`, `/v1/meta`), `scheduled()` stub, daily cron trigger, KV binding, generated `Env` types. 4 Worker tests pass in workerd.
- [x] `apps/web`: Astro config, Tailwind theme tokens, base layout, `/dev/design` mock page, `/og/dev.png` workers-og spike route.
- [x] `DESIGN.md`.

Also done: adapter-14 config fix, DaisyUI 5 theme, mock rebuilt on DaisyUI, build green, both Workers deployed, committed.

Live: https://comparemarketcapof-web.mcsltd.workers.dev and https://comparemarketcapof-cron.mcsltd.workers.dev

How Nathan tests: open the two workers.dev URLs on a phone; check `/dev/design` in light and dark mode; confirm `/og/dev.png` renders; confirm `/health` and `/v1/meta` on the cron Worker.

---

## Phase 1 — Data + logic  ← DONE 2026-09-15, awaiting Nathan's test

Built: `CoinGeckoProvider` (paginated, deduped, validated, throws on any failure), `refreshSnapshot` (fetch → validate → MIN_ASSETS guard → KV write, meta last; failure leaves KV untouched), `POST /refresh` with timing-safe secret check, `compare.ts` + `copy.ts` (shared sentences for page/API/OG), cached `getSnapshot()` / `getPickerList()`, `pnpm seed` and `pnpm sample` scripts, 49 tests.

Production data live since 2026-09-15 07:37 UTC: `COINGECKO_API_KEY` secret set, manual refresh returned 498 assets in 2.8s. Keyless requests from Workers get 429 (shared egress quota), so the key is required in prod.


- `apps/cron`: `CoinGeckoProvider` implementing `AssetProvider` (all pages of `/coins/markets`, not just 500 — paginate until empty, respect free-tier rate limits with a delay between pages), zod validation, KV write of `snapshot:crypto` + `snapshot:meta`, never overwrite on failure, `console.error` on failure, `POST /refresh` guarded by `x-refresh-secret`.
- `packages/core`: `compare.ts` (implied price, multiplier, FDV variant, A===B, missing supply, <1 multiplier), `getSnapshot()` with module-scope TTL cache, tests for everything including edge cases.
- `pnpm seed`: writes a fixture snapshot into local KV so `astro dev` works offline.
- `scripts/sample.ts`: prints a sample comparison from KV.
- Decided 2026-09-15: refresh **hourly** (`0 * * * *`). Coin count is a config var `ASSET_LIMIT` (start 500, target 2,000; 250 per CoinGecko page with a pause between pages). Use a free CoinGecko Demo API key (~10k calls/month, 30/min). `POST /refresh` for manual runs. A trimmed picker list is stored under a second KV key so the search island never loads the full snapshot.

How Nathan tests: run `pnpm seed`, run the sample script, hit `POST /refresh` locally with the secret and see KV update, run `pnpm test`.

---

## Phase 2 — Pages  ← DONE 2026-09-15, awaiting Nathan's test

Built: home, comparison, hub, /coins, about, privacy, 404; React picker island (searchable combobox, lazy list via `/api/picker.json`, keyboard + ARIA); shared components (CompareCard, StatRows, LinkBlock, ShareRow, DataStamp, Seo); cache headers on SSR pages; A===B → 302 to hub; invalid slug → 404 before touching data; sessions disabled; Playwright smoke (3 tests, mobile viewport).

Carried to Phase 3: Worker-generated responses are NOT cached by Cloudflare's CDN on `s-maxage` alone — add a Cache API layer in middleware so the 15-minute window actually holds. Self-host fonts. Delete `/dev/design`.


- Home `/` (SOL → BTC default, live result, popular grid), comparison `/[a]/with-the-market-cap-of/[b]`, hub `/[a]`, index `/coins`.
- React island: searchable combobox over all assets (DaisyUI dropdown/menu primitives, ≥44px rows, keyboard + screen reader).
- `Cache-Control: public, s-maxage=900, stale-while-revalidate=3600` on dynamic pages; static pages prerendered.
- 404 for unknown slugs; A===B redirects to the hub.
- Playwright smoke: home → pick pair → comparison page.

How Nathan tests: `astro dev` against seeded KV, click through on desktop and phone, keyboard-only picker test.

---

## Phase 3 — SEO

- `<Seo>` component: title pattern, description with numbers, OG tags, canonical.
- JSON-LD `WebPage` + `BreadcrumbList` on comparison pages.
- `sitemap-index.xml` + chunked `sitemap-[n].xml` from KV (≤5,000 URLs each), `robots.txt`.
- Internal-linking blocks on comparison pages.
- Lighthouse run, results recorded in the phase report.

How Nathan tests: view source on a comparison page, fetch the sitemaps, run Lighthouse on mobile.

---

## Phase 4 — OG + share

- `/og/[a]/[b].png` via workers-og with both logos, implied price, multiplier, site name; same cache headers.
- Share row: copy link, share to X with prefilled text, download image.

How Nathan tests: paste a comparison URL into a social preview debugger; use each share button on a phone.

---

## Phase 5 — API, affiliate slots, analytics, deploy

- Cron Worker routes: `GET /v1/assets`, `GET /v1/compare/:a/:b`, `GET /v1/meta`; CORS open; page built from the same compare object.
- `llms.txt`.
- `<AffiliateSlot>` driven by `config/affiliates.ts`, shipped empty, region gating via `CF-IPCountry`.
- **Umami** (free plan) — cookieless script tag in the base layout.
- Custom domains: `comparemarketcapof.com` → web, `api.comparemarketcapof.com` → cron. Cron Trigger verified in production.
- README runbook: bindings, secrets, forcing a refresh, rolling back.

How Nathan tests: hit the API from a browser, confirm domains resolve, check analytics dashboard receives a pageview.

---

## Phase 6 — MCP server

- `compare` and `search_assets` tools over the Workers MCP transport on the cron Worker, reading the same KV.
- Tested from Claude Code.

---

## Phase 7 — Stocks (not started; parked)
