# DESIGN.md — comparemarketcapof.app

Source of truth for the visual system. Derived from `Design/README.md` (Figma handoff)
with the overrides in the build brief, which win wherever they conflict. Tokens live in
`apps/web/src/styles/global.css` (`@theme`) — change them there, then here.

## Style

**Flat neo-brutalist.** Solid colours, hard offset shadows, 2px near-black borders,
no gradients anywhere, no blurred shadows.

## Colour

| Token | Light | Dark (`prefers-color-scheme: dark`) | Use |
|---|---|---|---|
| `paper` | `rgb(255,250,250)` | `rgb(14,14,14)` | Page background (not the lavender from the mock) |
| `ink` | `rgb(14,14,14)` | `rgb(246,246,246)` | Text, borders, hard shadows |
| `purple` | `#744AE3` | same | Compare card, buttons, pills, header bar |
| `purple-hover` | `rgb(96,56,205)` | same | Hover on purple controls |
| `lime` | `rgb(217,255,29)` | same | **Implied price only.** Nothing else is lime. |
| `on-purple` | `rgb(246,246,246)` | same | Text on purple surfaces |
| `muted` | `rgb(90,90,110)` | `rgb(170,170,190)` | Secondary text |
| `divider` | `rgb(236,235,245)` | `rgb(40,40,52)` | Row dividers |

Contrast: `ink` on `paper` and `on-purple` on `purple` both clear AA. `lime` on
`purple` is decorative-large-text (64px) and clears AA large-text; never use lime at
small sizes.

## Type

| Face | Use |
|---|---|
| **Bungee** | Wordmark and the H1 only |
| **Instrument Sans** | UI: pickers, buttons, labels, nav |
| **Inter** | Body and **all numbers** |

Every numeric element carries `font-feature-settings: "tnum"` (class `num`) so digits
don't shift width when values refresh.

Scale (px): **64** hero implied price (48 on mobile) / **24** H1 / 20 / 16 / 15 / 13 / 12.

## Shape and depth

| | Radius | Border | Shadow |
|---|---|---|---|
| Compare card | 12px | 2px `ink` | `8px 8px 0 ink` |
| Buttons, pills, dropdown | 10px | 2px `ink` | `6px 6px 0 ink` |
| Header bar | 0 0 3px 3px | — | — |
| Logos | 50% | 2px `ink` | — |

## Comparison page hierarchy (top to bottom)

1. **H1** — the dynamic sentence: "Solana with the market cap of Bitcoin". Bungee 24.
2. **Compare card** — picker A, "VS", picker B.
3. **Result line** (white, Inter 16): "If SOL reached BTC's current market cap, one SOL would be worth" — or "would drop to" when the multiplier is below 1.
4. **Implied price** — 64px lime, tabular figures. The single most important element on the page.
5. **Multiplier** — 20px white, own line: "17× today's price" / "0.31× today's price".
6. **Stat rows** per coin: real logo from the API, price, market cap, circulating supply. Plus an FDV variant line when both assets have a total supply, and a "based on circulating supply" note.
7. **Share row** — copy link, share to X, download image.
8. **`<AffiliateSlot>`** — renders nothing until a partner is configured.
9. **Internal-linking blocks** — "More comparisons for A", "Other assets at B's market cap", "Reverse this comparison".
10. **Data stamp** — "data as of HH:MM UTC" on every comparison.

## Removed from the mock

- The `BUY {A}` button and anything like it.
- The "Demo data" footer.
- The `showBuyButton` flag.
- Gradient card fill and blurred shadows.
- Black-circle placeholder logos.

## Picker

Searchable combobox over all 500 assets. Type-ahead on symbol and name; each row shows
rank, logo, name, symbol and market cap; rows ≥ 44px tall; fully keyboard navigable
(arrow keys, Enter, Escape) and announced to screen readers; closes on selection and on
outside tap. Default pair on the home page: **SOL → BTC**.

## Number formatting

Implemented in `packages/core/src/format.ts` with tests.

- Market cap: `$1.33T` / `$98.7B` / `$450M` / `$820K`.
- Price: ≥ $1000 no decimals with separators; ≥ $1 two decimals; ≥ $0.01 three decimals; below that two significant figures, never exponent notation.
- Multiplier: two significant figures with a trailing `×` (`4.2×`, `0.31×`); integer at 10 and above (`17×`).
- Never `NaN`, never `undefined`: missing data renders `n/a` with an explanation.
