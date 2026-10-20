/* ───────────────────────────────────────────────────────────────────────────
   Build-time data layer for the gauge cards (markets + economy).

   With FRED observations reachable (or FRED_API_KEY set), this fetches the
   series behind each gauge over its FULL history, derives current value, prior
   value, 24-month history, and a full-history percentile rank, and writes
   src/data/markets.json. The browser never calls FRED and never sees a key.

   Without network / key, it writes a reproducible SEED (illustrative recent
   values so the site builds locally and in PRs). Each gauge is labelled
   honestly in the card + OG image as `computed` vs `illustrative`; seed
   readings carry no percentile.

   Run: node scripts/fetch-markets.mjs
─────────────────────────────────────────────────────────────────────────── */

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { monthLabel } from "./lib/series.mjs";
import { percentileRank } from "./lib/derive.mjs";
import { GAUGES } from "../src/lib/gauges.mjs";
import { computeAllIndicators, SEED_READINGS, getDecimals } from "./lib/indicators.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/data/markets.json");

const WINDOW = 24; // months of history kept for the deep-dive chart

// Turn a monthly [{date, value}] series into a gauge reading record.
function readingFrom(gaugeOrId, monthly, computed) {
  const id = typeof gaugeOrId === "string" ? gaugeOrId : gaugeOrId?.id;
  const gauge = (typeof gaugeOrId === "object" && gaugeOrId !== null) ? gaugeOrId : (GAUGES[id] || { id, slug: id, decimals: getDecimals(id) });
  const decimals = gauge.decimals ?? getDecimals(id) ?? 2;

  const round = (v) => {
    const p = 10 ** decimals;
    return Math.round(v * p) / p;
  };

  const pts = monthly.map((o) => ({ t: monthLabel(o.date), v: round(o.value), date: o.date }));
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2] || last;
  const reading = {
    id: gauge.id ?? id,
    slug: gauge.slug ?? id,
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

// ── live mode ─────────────────────────────────────────────────────────────--
async function buildLive() {
  const { monthly } = await computeAllIndicators();
  const gauges = {};

  for (const gauge of Object.values(GAUGES)) {
    const series = monthly[gauge.id];
    if (series?.length) {
      gauges[gauge.id] = readingFrom(gauge, series, true);
    } else {
      console.warn(`  ⚠ missing series for gauge ${gauge.id}`);
    }
  }

  // Find latest asOf among all gauges
  let asOf = "2000-01-01";
  for (const g of Object.values(gauges)) {
    if (g.asOf && g.asOf > asOf) asOf = g.asOf;
  }

  return { gauges, asOf, live: true };
}

// ── seed mode (no network) ──────────────────────────────────────────────────
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
    const seed = SEED_READINGS[gauge.id] || { value: 0, prev: 0, start: 0 };
    const { value, prev, start } = seed;
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
    console.log("▶ markets data — attempting live fetch from FRED & Shiller");
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
      source: "FRED / Shiller",
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
