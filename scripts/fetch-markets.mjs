/* ───────────────────────────────────────────────────────────────────────────
   Build-time data layer for the market hype/mania/greed gauges.

   With FRED_API_KEY set, this fetches the three FRED series behind the gauges,
   resamples them to a monthly grid, derives each gauge's current value, prior
   value, and 24-month history, and writes src/data/markets.json. The browser
   never calls FRED and never sees the key — same contract as the recession card.

   Without a key, it writes a reproducible SEED (illustrative recent values so
   the site builds locally and in PRs). Each gauge is labelled honestly in the
   card + OG image as `computed` vs `illustrative`.

   Run: FRED_API_KEY=… node scripts/fetch-markets.mjs
─────────────────────────────────────────────────────────────────────────── */

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { toMonthly, forwardFill, monthLabel, monthKey } from "./lib/series.mjs";
import { GAUGES } from "../src/lib/gauges.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/data/markets.json");
const API_KEY = process.env.FRED_API_KEY;
const FRED = "https://api.stlouisfed.org/fred/series/observations";

const WINDOW = 24; // months of history kept for the deep-dive chart

async function fredObservations(seriesId) {
  const url = `${FRED}?series_id=${seriesId}&api_key=${API_KEY}&file_type=json&observation_start=2019-01-01`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED ${seriesId} → ${res.status} ${res.statusText}`);
  const json = await res.json();
  return (json.observations || [])
    .filter((o) => o.value !== ".")
    .map((o) => ({ date: o.date, value: +o.value }));
}

// Turn a monthly [{date, value}] series into a gauge reading record.
function readingFrom(gauge, monthly, computed) {
  const pts = monthly.map((o) => ({ t: monthLabel(o.date), v: round(gauge, o.value), date: o.date }));
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2] || last;
  return {
    id: gauge.id,
    slug: gauge.slug,
    value: last.v,
    prev: prev.v,
    computed,
    asOf: last.date,
    series: pts.slice(-WINDOW).map(({ t, v }) => ({ t, v })),
  };
}

function round(gauge, v) {
  const p = 10 ** gauge.decimals;
  return Math.round(v * p) / p;
}

// ── live mode ─────────────────────────────────────────────────────────────--
async function buildLive() {
  const gauges = {};

  // Simple level gauges: VIX, credit spread.
  for (const [id, series] of [["vix", "VIXCLS"], ["credit", "BAMLH0A0HYM2"]]) {
    try {
      const monthly = toMonthly(await fredObservations(series));
      gauges[id] = readingFrom(GAUGES[id], monthly, true);
    } catch (err) {
      console.error(`  ✗ ${id} (${series}): ${err.message}`);
    }
  }

  // Buffett: total US corporate equities (Fed Z.1) ÷ GDP, as a percent.
  // NCBEILQ027S is in $ millions and GDP in $ billions, so scale the numerator
  // down by 1000 before the ratio. (The Wilshire 5000 series this used to read,
  // WILL5000PRFC, was pulled from FRED on 2024-06-03, so we use the maintained
  // Z.1 corporate-equities measure instead.)
  try {
    const equities = toMonthly(await fredObservations("NCBEILQ027S")); // quarterly, $ millions
    const gdp = toMonthly(await fredObservations("GDP")); // quarterly, $ billions
    const gdpByMonth = forwardFill(equities, gdp);
    const ratio = equities
      .map((e) => {
        const g = gdpByMonth.get(monthKey(e.date));
        return g ? { date: e.date, value: (e.value / 1000 / g) * 100 } : null;
      })
      .filter(Boolean);
    gauges.buffett = readingFrom(GAUGES.buffett, ratio, true);
  } catch (err) {
    console.error(`  ✗ buffett (NCBEILQ027S ÷ GDP): ${err.message}`);
  }

  const asOf = gauges.vix?.asOf ?? gauges.credit?.asOf ?? gauges.buffett?.asOf;
  return { gauges, asOf, live: true };
}

// ── seed mode (no key) ───────────────────────────────────────────────────────
// Illustrative recent readings + a gentle 24-pt shape so the chart renders.
const SEED = {
  buffett: { value: 225, prev: 221, start: 175 },
  vix: { value: 16.5, prev: 15.2, start: 19 },
  credit: { value: 3.2, prev: 3.05, start: 4.6 },
};

function seedDates() {
  // last 24 months ending at the current month
  const now = new Date();
  const out = [];
  for (let i = WINDOW - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`);
  }
  return out;
}

function buildSeed() {
  const dates = seedDates();
  const n = dates.length;
  const gauges = {};
  for (const gauge of Object.values(GAUGES)) {
    const { value, prev, start } = SEED[gauge.id];
    const monthly = dates.map((date, i) => {
      let v;
      if (i === n - 1) v = value;
      else if (i === n - 2) v = prev;
      else v = start + ((prev - start) * i) / (n - 2);
      return { date, value: v };
    });
    gauges[gauge.id] = readingFrom(gauge, monthly, false); // illustrative
  }
  return { gauges, asOf: dates[dates.length - 1], live: false };
}

// ── main ──────────────────────────────────────────────────────────────────--
function asOfLabel(iso) {
  const [y, m] = iso.split("-").map(Number);
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[m - 1]} ${y}`;
}

async function main() {
  const mode = API_KEY ? "LIVE (FRED)" : "SEED (no FRED_API_KEY — illustrative)";
  console.log(`▶ markets data — ${mode}`);
  const { gauges, asOf, live } = API_KEY ? await buildLive() : buildSeed();

  const out = {
    meta: {
      asOf,
      asOfLabel: asOfLabel(asOf),
      generatedAt: new Date().toISOString(),
      source: "FRED",
      live,
    },
    gauges,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`✓ wrote ${Object.keys(gauges).length} gauges → ${OUT} (as of ${out.meta.asOfLabel})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
