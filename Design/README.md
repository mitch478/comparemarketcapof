# Handoff: Crypto Market Cap Comparison (mobile-first web app)

## Overview
A single-screen, mobile-first web app that lets users compare the market cap of two crypto coins from the top 20. Picking coin A and coin B shows the "flippening" projection — the price coin A would reach at coin B's current market cap, with the multiplier — plus each coin's price and market cap.

## About the Design Files
The file in this bundle (`Compare Market Cap.dc.html`) is a **design reference created in HTML** — a working prototype showing intended look and behavior, not production code to copy directly. Recreate this design in your target codebase's environment (React, Vue, etc.) using its established patterns. If no environment exists yet, choose an appropriate lightweight stack (e.g. React + Vite) and implement it there.

## Fidelity
**High-fidelity.** Built from the client's Figma mockup ("Landing Page 2" frame). Recreate colors, typography, spacing and shadows exactly as specified below.

## Screens / Views

### Compare screen (the only screen)
- Page background: `rgb(174,170,212)` lavender; content column max-width 430px, centered, 24px side padding, mobile-first and fluid.
- **Header bar**: full-width, background `#744AE3` (rgb(116,74,227)), padding 22px 16px, border-radius 0 0 3px 3px. Centered wordmark "Comparemarketcapof.app" — Bungee 20px, color `rgb(231,231,231)`, letter-spacing 0.5px.
- **Headline**: "Compare market cap of A and B crypto" — Bungee 36px, weight 400, line-height 1.15, black, left-aligned, margin-top 40px.
- **Subtitle**: "Easy way to compare market cap of crypto tokens — select the coins below" — Instrument Sans 20px, centered, black.
- **Compare card**: border-radius 12px, background `linear-gradient(180deg, #744AE3 1.8%, #BDB1EE 88%)`, box-shadow `17px 0 18px rgba(0,0,0,0.25)`, padding 44px 28px 36px, flex column centered.
  - **Coin picker pills (A and B)**: full-width buttons, height 55px, radius 10px, background `#744AE3`, shadow `10px 4px 4px rgba(0,0,0,0.25)`, text Instrument Sans 15px near-white (`rgb(246,246,246)` / white), letter-spacing 1px, "SYMBOL ▾".
  - **Dropdown** (opens under a pill): background `rgb(255,250,250)`, radius 10px, shadow `0 8px 24px rgba(0,0,0,0.35)`, max-height 264px scrollable, z-index above card. Rows: flex, gap 10px, padding 11px 14px, 1px bottom border `rgb(236,235,245)`; bold symbol (52px column), muted name `rgb(90,90,110)`, right-aligned cap label in `#744AE3` 13px. Hover row background `rgb(236,235,245)`.
  - **"VS"** between pills: Inter 33px black, 22px vertical margins.
  - **Projection block**: "If {A} reaches the current market cap of {B}" — Inter Bold 16px white, centered. Below it the projected price + multiplier, e.g. "$986 (x4.2)" — Inter Bold 36px, lime `rgb(217,255,29)`.
  - **Stat rows** (one per selected coin, 26px gap, margin-top 40px): 41×40px black circle (`rgb(14,14,14)`) with white bold 12px symbol; PRICE label 15px + bold 16px value; MARKET CAP label + value right-aligned.
  - **Buy button** (optional, flag-controlled): 139×42px, radius 10px, `#744AE3`, same 10px/4px shadow, Inter Bold 13px white "BUY {A}"; hover `rgb(96,56,205)`.
- **Footer note**: "Demo data — top 20 coins by market cap. Not financial advice." — 12px, 55% opacity, centered.

## Interactions & Behavior
- Tapping a pill toggles its dropdown; tapping the other pill closes the first and opens the second; picking a coin sets that side and closes the dropdown.
- Projection math: `multiplier = capB / capA`; `projectedPrice = priceA × multiplier`. Multiplier formatted "x{2 sig figs}" (integer when ≥10). Price formatting: ≥$1000 → no decimals with thousands separators; ≥$1 → 2 decimals; ≥$0.01 → 3 decimals; else 2 significant figures. Cap formatting: $X.XXT / $X.XB / $XM.
- No routing; single view. Hit targets ≥44px (pills 55px, rows ~40px — pad rows to 44px in production).
- Defaults: A = SOL, B = ETH.

## State Management
- `a`, `b`: selected coin symbols; `open`: which dropdown is open (`"a" | "b" | null`).
- Feature flags: `showBuyButton` (boolean, default true), `pickerSort` ("Market cap" | "A–Z").
- Data: static top-20 array in the prototype (symbol, name, price, cap). For production, swap for a live API (e.g. CoinGecko `/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20`) with the same shape.

## Design Tokens
- Colors: purple `#744AE3`; purple hover `rgb(96,56,205)`; gradient end `#BDB1EE`; lavender bg `#AEAAD4` (rgb(174,170,212)); off-white `rgb(255,250,250)`; row divider `rgb(236,235,245)`; near-black `rgb(14,14,14)` / `rgb(23,23,23)`; header text `rgb(231,231,231)`; lime accent `rgb(217,255,29)`.
- Type: Bungee (display/wordmark), Instrument Sans (UI), Inter (body/numbers) — all on Google Fonts. Sizes: 36/33/20/16/15/13/12.
- Radius: 12 (card), 10 (pills/buttons/dropdown), 3 (header bottom), 50% (coin circles).
- Shadows: card `17px 0 18px rgba(0,0,0,0.25)`; buttons `10px 4px 4px rgba(0,0,0,0.25)`; dropdown `0 8px 24px rgba(0,0,0,0.35)`.

## Assets
None — coin "logos" are plain black circles with the symbol text (per the Figma mockup). Real coin logos would come from a token-icon set or the API's image URLs.

## Files
- `Compare Market Cap.dc.html` — the full prototype (markup, styles, logic, static top-20 dataset).
