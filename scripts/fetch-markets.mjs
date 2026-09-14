/* ───────────────────────────────────────────────────────────────────────────
   Build-time data layer for the gauge cards (markets + economy).

   With FRED_API_KEY set, this fetches the FRED series behind each gauge over
   its FULL history, resamples to a monthly grid, derives current value, prior
   value, 24-month history, and a full-history percentile rank, and writes
   src/data/markets.json. The browser never calls FRED and never sees the key —
   same contract as the recession card.

   Without a key, it writes a reproducible SEED (illustrative recent values so
   the site builds locally and in PRs). Each gauge is labelled honestly in the
   card + OG image as `computed` vs `illustrative`; seed readings carry no
   percentile.

   Run: FRED_API_KEY=… node scripts/fetch-markets.mjs
─────────────────────────────────────────────────────────────────────────── */

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { toMonthly, forwardFill, monthLabel, monthKey } from "./lib/series.mjs";
import { yoyPct, ratioSeries, mortgageMonthly, percentileRank } from "./lib/derive.mjs";
import { GAUGES, pctOf } from "../src/lib/gauges.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/data/markets.json");
const API_KEY = process.env.FRED_API_KEY;
const FRED = "https://api.stlouisfed.org/fred/series/observations";

const WINDOW = 24; // months of history kept for the deep-dive chart

async function fredObservations(seriesId) {
  // Full history — the percentile context needs every reading, not just 2019+.
  if (API_KEY) {
    try {
      const url = `${FRED}?series_id=${seriesId}&api_key=${API_KEY}&file_type=json`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const obs = (json.observations || [])
          .filter((o) => o.value !== ".")
          .map((o) => ({ date: o.date, value: +o.value }));
        if (obs.length > 0) return obs;
      }
    } catch (err) {
      // Fall through to public CSV
    }
  }

  // Fallback to FRED's public CSV endpoint
  const csvUrl = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`;
  const res = await fetch(csvUrl, {
    headers: { "User-Agent": "econ.kpan.dev/1.0" },
  });
  if (!res.ok) throw new Error(`FRED CSV ${seriesId} → ${res.status} ${res.statusText}`);
  const text = await res.text();
  const lines = text.trim().split("\n");
  const obs = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const [date, valStr] = line.split(",");
    if (valStr && valStr !== "." && Number.isFinite(+valStr)) {
      obs.push({ date, value: +valStr });
    }
  }
  if (obs.length === 0) throw new Error(`FRED CSV ${seriesId} yielded 0 observations`);
  return obs;
}

// Turn a monthly [{date, value}] series into a gauge reading record.
function readingFrom(gauge, monthly, computed) {
  const pts = monthly.map((o) => ({ t: monthLabel(o.date), v: round(gauge, o.value), date: o.date }));
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2] || last;
  const reading = {
    id: gauge.id,
    slug: gauge.slug,
    value: last.v,
    prev: prev.v,
    computed,
    asOf: last.date,
    series: pts.slice(-WINDOW).map(({ t, v }) => ({ t, v })),
  };
  if (computed && monthly.length >= 12) {
    // Where today sits in the metric's full history (ties count half).
    reading.pctile = percentileRank(monthly.map((o) => o.value), monthly[monthly.length - 1].value);
    reading.sinceYear = +monthly[0].date.slice(0, 4);
  }
  return reading;
}

function round(gauge, v) {
  const p = 10 ** gauge.decimals;
  return Math.round(v * p) / p;
}

// ── live mode ─────────────────────────────────────────────────────────────--
async function buildLive() {
  const monthly = {}; // gauge id → full-history monthly [{date, value}]

  // Simple level gauges — one FRED series each, downsampled to monthly.
  const SIMPLE = [
    ["vix", "VIXCLS"],
    ["credit", "BAMLH0A0HYM2"],
    ["curve", "T10Y3M"],
    ["stress", "DRCCLACBS"],
  ];
  for (const [id, series] of SIMPLE) {
    try {
      monthly[id] = toMonthly(await fredObservations(series));
    } catch (err) {
      console.error(`  ✗ ${id} (${series}): ${err.message}`);
    }
  }

  // CPI feeds both the inflation gauge (YoY) and the real-wage deflator.
  let cpi = null;
  try {
    cpi = toMonthly(await fredObservations("CPIAUCSL"));
    monthly.inflation = yoyPct(cpi);
  } catch (err) {
    console.error(`  ✗ inflation (CPIAUCSL): ${err.message}`);
  }

  // Real wages: nominal hourly earnings ÷ CPI, year over year.
  if (cpi) {
    try {
      const ahe = toMonthly(await fredObservations("AHETPI"));
      monthly.wages = yoyPct(ratioSeries(ahe, cpi));
    } catch (err) {
      console.error(`  ✗ wages (AHETPI ÷ CPIAUCSL): ${err.message}`);
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
    monthly.buffett = equities
      .map((e) => {
        const g = gdpByMonth.get(monthKey(e.date));
        return g ? { date: e.date, value: (e.value / 1000 / g) * 100 } : null;
      })
      .filter(Boolean);
  } catch (err) {
    console.error(`  ✗ buffett (NCBEILQ027S ÷ GDP): ${err.message}`);
  }

  // Housing affordability: 30-yr payment on the median home (20% down) as a
  // share of median household income. Weekly mortgage rate sets the monthly
  // grid; quarterly price and annual income are forward-filled onto it.
  try {
    const rate = toMonthly(await fredObservations("MORTGAGE30US")); // weekly, %
    const price = toMonthly(await fredObservations("MSPUS")); // quarterly, $
    const income = toMonthly(await fredObservations("MEHOINUSA646N")); // annual, $
    const priceBy = forwardFill(rate, price);
    const incomeBy = forwardFill(rate, income);
    monthly.housing = rate
      .map((o) => {
        const p = priceBy.get(monthKey(o.date));
        const inc = incomeBy.get(monthKey(o.date));
        if (!p || !inc) return null;
        const payment = mortgageMonthly(p * 0.8, o.value);
        return { date: o.date, value: (payment / (inc / 12)) * 100 };
      })
      .filter(Boolean);
  } catch (err) {
    console.error(`  ✗ housing (MSPUS · MORTGAGE30US · MEHOINUSA646N): ${err.message}`);
  }

  // Market mood: equal-weight composite of the three market gauges, each
  // scored 0–100 toward greed on its own card scale (VIX + spreads inverted:
  // low fear and tight credit read as greed). Monthly grid = VIX; the
  // quarterly Buffett ratio is forward-filled onto it.
  if (monthly.buffett && monthly.vix && monthly.credit) {
    const buffettBy = forwardFill(monthly.vix, monthly.buffett);
    const creditBy = forwardFill(monthly.vix, monthly.credit);
    monthly.mood = monthly.vix
      .map((o) => {
        const k = monthKey(o.date);
        const b = buffettBy.get(k);
        const c = creditBy.get(k);
        if (b == null || c == null) return null;
        const score =
          (pctOf(GAUGES.buffett, b) + (100 - pctOf(GAUGES.vix, o.value)) + (100 - pctOf(GAUGES.credit, c))) / 3;
        return { date: o.date, value: score };
      })
      .filter(Boolean);
  } else {
    console.error("  ✗ mood: needs buffett + vix + credit — skipped");
  }

  const gauges = {};
  for (const [id, series] of Object.entries(monthly)) {
    if (series?.length) gauges[id] = readingFrom(GAUGES[id], series, true);
  }
  const asOf = gauges.vix?.asOf ?? gauges.credit?.asOf ?? gauges.curve?.asOf ?? gauges.buffett?.asOf;
  return { gauges, asOf, live: true };
}

// ── seed mode (no key) ───────────────────────────────────────────────────────
// Illustrative recent readings + a gentle 24-pt shape so the chart renders.
const SEED = {
  buffett: { value: 225, prev: 221, start: 175 },
  vix: { value: 16.5, prev: 15.2, start: 19 },
  credit: { value: 3.2, prev: 3.05, start: 4.6 },
  curve: { value: 0.55, prev: 0.4, start: -1.1 },
  inflation: { value: 2.7, prev: 2.9, start: 3.7 },
  wages: { value: 1.0, prev: 0.8, start: -0.4 },
  housing: { value: 31.8, prev: 31.9, start: 29.2 },
  stress: { value: 3.2, prev: 3.1, start: 2.6 },
  mood: { value: 72, prev: 69, start: 48 },
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
  let result;
  try {
    console.log("▶ markets data — attempting live fetch from FRED");
    result = await buildLive();
    console.log("  live fetch succeeded!");
  } catch (err) {
    console.warn(`  live fetch failed (${err.message}), falling back to seed`);
    result = buildSeed();
  }
  const { gauges, asOf, live } = result;

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
