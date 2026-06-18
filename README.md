# econ.kpan.dev

A dynamic economic-data site optimized for **learning + shareability**. The atomic
unit isn't a dashboard — it's a feed of self-contained **insight cards**. Each card
takes one *derived* metric, contextualizes it, answers "so what / why should I care,"
and is built to be screenshotted and shared.

This repo is the first card — **the Recession card** (the Sahm rule) — built as the
first instance of a reusable card system. It's a project under the personal portfolio
at [kpan.dev](https://kpan.dev).

## How it works

Fully **static**, hosted on Cloudflare Pages. No runtime server, no serverless
functions, no client-exposed keys. All data and share images are generated **at build
time** and refreshed by a scheduled rebuild.

- **Astro + React islands + TypeScript** — Astro static-renders one HTML page per
  region (correct OG meta, fast loads, good crawler unfurls); the React card hydrates
  as a `client:load` island.
- **Tailwind** for page layout; the card's palette/fonts are ported as tokens.
- **Recharts** for the deep-dive history chart.
- **Satori + resvg** pre-render one OG/share PNG per region at build time.
- Fonts (bundled via `@fontsource`, no runtime Google Fonts call): Bricolage
  Grotesque (display), Inter (body), JetBrains Mono (data readouts).

### Data layer (build-time, no runtime calls)

`scripts/fetch-data.mjs` is the entire data layer. With `FRED_API_KEY` set it:

- Fetches national unemployment (`UNRATE`) and per-state rates (`{STATE}UR`, e.g.
  `CAUR`) for all 50 states.
- Computes the **Sahm value** for each region — 3-month moving average of the
  unemployment rate minus the minimum of those 3-month averages over the trailing
  12 months; trigger at **≥ 0.50**.
- Cross-checks the national figure against FRED's `SAHMREALTIME` / `SAHMCURRENT`
  (displays the computed value; logs if they diverge).
- Writes `src/data/recession.json`.

**Without a key**, it writes a reproducible **seed** (national computed from the
prototype snapshot; states illustrative) so the site still builds locally and in PRs.
The card and OG images label each region honestly as `computed` vs `illustrative`.

The browser never calls FRED and never sees the key.

## Routing

Regions are **path segments** so each gets its own static HTML page with correct OG
meta:

- National → `/recession`
- Per state → `/recession/{state}` (e.g. `/recession/ca`)

`getStaticPaths` generates all 51 pages at build. The card holds every region's data
client-side for instant switching; selecting a state updates the URL to its static
path (so direct loads and crawlers still get the right page + OG image).

## Develop

```bash
npm install
npm run data     # write src/data/recession.json (seed unless FRED_API_KEY is set)
npm run dev      # http://localhost:4321/recession
```

Full production build (regenerates data + OG images, then builds the site):

```bash
FRED_API_KEY=… npm run build   # runs: prebuild (data + og) → astro build
npm run preview
```

| Script | What it does |
| --- | --- |
| `npm run data` | Fetch FRED + compute Sahm → `src/data/recession.json` |
| `npm run og` | Render per-region OG PNGs → `public/og/` |
| `npm run build` | `prebuild` (data + og) then `astro build` |

## Deploy — Cloudflare Pages

- Connect this repo to a Cloudflare Pages project; custom domain `econ.kpan.dev`.
- Build command `npm run build`, output directory `dist`. (`npm run build` runs the
  `prebuild` data + OG step automatically.)
- Set `FRED_API_KEY` in the Pages **build environment** (build-time only).
- **Scheduled refresh:** `.github/workflows/refresh.yml` pings a Cloudflare Pages
  **deploy hook** monthly so data stays fresh. Add the hook URL as the GitHub secret
  `CLOUDFLARE_DEPLOY_HOOK_URL`.

## Market gauges — hype / mania / greed cards

Cards #2–#4 are a small **reusable gauge engine** sharing one component, one OG
template, and one data script. Each is a single *derived* market metric on a banded
scale (calm → mania) with honest per-band copy. All three are FRED-native, so they
reuse the same build-time fetch + seed fallback as the recession card — no runtime
calls, no client-exposed key.

| Card | Question | Metric | FRED series |
| --- | --- | --- | --- |
| `/buffett` | Are stocks in a bubble? | Market cap ÷ GDP (%) | `WILL5000PRFC` ÷ `GDP` |
| `/vix` | Is the market too calm? | VIX (the "fear gauge") | `VIXCLS` |
| `/credit` | Is the bond market greedy? | High-yield credit spread | `BAMLH0A0HYM2` |

`scripts/fetch-markets.mjs` fetches each series, resamples to a monthly grid
(`scripts/lib/series.mjs`), derives current / prior / 24-month history, and writes
`src/data/markets.json`. Without a key it writes an illustrative **seed** so the site
still builds; each gauge is labelled `computed` vs `illustrative`. Gauge config (bands,
copy, scales) lives in `src/lib/gauges.mjs` so the React island and the build-time OG
image render identical verdicts.

The home page (`/`) is a **feed** listing every card with a live one-line verdict.

## Adding more cards

Each gauge is a new entry in `GAUGES` (`src/lib/gauges.mjs`) plus a FRED series in
`scripts/fetch-markets.mjs` — the component, OG template, route (`/[gauge]`), and feed
entry all pick it up automatically. The recession card remains its own template under
`src/pages/recession/`. Shared verdict/token logic lives in `src/lib/`.

## Project layout

```
scripts/
  fetch-data.mjs      build-time FRED fetch + Sahm → src/data/recession.json
  fetch-markets.mjs   FRED fetch for the gauges → src/data/markets.json
  gen-og.mjs          Satori + resvg → public/og/recession-{region}.png
  gen-og-markets.mjs  Satori + resvg → public/og/{gauge}.png
  lib/sahm.mjs        computeSahm (ported from the prototype)
  lib/series.mjs      monthly resample + forward-fill helpers
src/
  components/RecessionCard.tsx   the recession card (hydrated island)
  components/GaugeCard.tsx       reusable gauge card for buffett / vix / credit
  lib/recession.mjs              recession tokens + verdict state machine + copy
  lib/gauges.mjs                 gauge config: bands, verdict copy, scales, tokens
  lib/regions.mjs                national + 50 states (names, FRED ids, slugs)
  lib/pagemeta.ts / types.ts     per-page meta + data types
  layouts/CardLayout.astro       static page shell (OG/Twitter meta, footer)
  pages/index.astro              / — the card feed
  pages/recession/index.astro    /recession (national)
  pages/recession/[state].astro  /recession/{state} (getStaticPaths)
  pages/[gauge].astro            /buffett · /vix · /credit (getStaticPaths)
  data/recession.json            generated (seed committed)
  data/markets.json              generated (seed committed)
```
