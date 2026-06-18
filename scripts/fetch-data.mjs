/* ───────────────────────────────────────────────────────────────────────────
   Build-time data layer for econ.kpan.dev — the ENTIRE data layer.

   With a FRED key (CI secret FRED_API_KEY), this fetches national + 50-state
   unemployment, computes the Sahm value for each region, cross-checks the
   national figure against FRED's own SAHMREALTIME / SAHMCURRENT, and writes
   src/data/recession.json. The browser never calls FRED and never sees the key.

   Without a key, it writes a reproducible SEED from the prototype's embedded
   snapshot (national computed from the snapshot; states illustrative) so the
   site still builds locally and in PRs. The footer labels each region honestly
   as `computed` vs `illustrative`.

   Run: FRED_API_KEY=… node scripts/fetch-data.mjs
─────────────────────────────────────────────────────────────────────────── */

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { computeSahm, monthLabel } from "./lib/sahm.mjs";
import { REGIONS } from "../src/lib/regions.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/data/recession.json");
const API_KEY = process.env.FRED_API_KEY;
const FRED = "https://api.stlouisfed.org/fred/series/observations";

const SERIES_WINDOW = 24; // months of Sahm history kept for the deep-dive chart

// ── FRED fetch helpers ──────────────────────────────────────────────────────
async function fredObservations(seriesId) {
  const url = `${FRED}?series_id=${seriesId}&api_key=${API_KEY}&file_type=json&observation_start=2018-01-01`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRED ${seriesId} → ${res.status} ${res.statusText}`);
  const json = await res.json();
  // [{ date, rate }] in chronological order, missing values ('.') dropped.
  return (json.observations || [])
    .filter((o) => o.value !== ".")
    .map((o) => ({ date: o.date, rate: +o.value }));
}

// Build a region record from a monthly unemployment-rate series.
function regionFromRates(region, obs, computed) {
  const rates = obs.map((o) => o.rate);
  const sahm = computeSahm(rates);
  // last two non-null Sahm readings
  const pts = obs
    .map((o, i) => ({ t: monthLabel(o.date), sahm: sahm[i], date: o.date }))
    .filter((p) => p.sahm != null);
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2] || last;
  return {
    code: region.code,
    slug: region.slug,
    name: region.name,
    value: last.sahm,
    prev: prev.sahm,
    computed,
    asOf: last.date,
    series: pts.slice(-SERIES_WINDOW).map(({ t, sahm }) => ({ t, sahm })),
  };
}

// ── live mode ───────────────────────────────────────────────────────────────
async function buildLive() {
  const regions = {};
  let asOf = null;
  for (const region of REGIONS) {
    try {
      const obs = await fredObservations(region.fred);
      const rec = regionFromRates(region, obs, true);
      regions[region.code] = rec;
      if (region.code === "national") asOf = rec.asOf;
    } catch (err) {
      console.error(`  ✗ ${region.code} (${region.fred}): ${err.message}`);
    }
  }

  // Cross-check the computed national figure against FRED's published Sahm.
  const crossCheck = {};
  for (const id of ["SAHMREALTIME", "SAHMCURRENT"]) {
    try {
      const obs = await fredObservations(id);
      const latest = obs[obs.length - 1];
      crossCheck[id] = latest ? latest.rate : null;
    } catch (err) {
      console.error(`  ✗ cross-check ${id}: ${err.message}`);
    }
  }
  const nat = regions.national;
  if (nat) {
    for (const [id, val] of Object.entries(crossCheck)) {
      if (val == null) continue;
      const diff = Math.abs(val - nat.value);
      const flag = diff > 0.1 ? "⚠ DIVERGES" : "ok";
      console.log(`  cross-check ${id}=${val} vs computed=${nat.value} → ${flag} (Δ${diff.toFixed(2)})`);
    }
  }

  return { regions, asOf, live: true, crossCheck };
}

// ── seed mode (no key) ──────────────────────────────────────────────────────
// National snapshot from the prototype (FRED UNRATE, illustrative Jan'23–Mar'26).
const SEED_MONTHS = (() => {
  const out = [];
  for (const y of [2023, 2024, 2025]) for (let m = 1; m <= 12; m++) out.push(`${y}-${String(m).padStart(2, "0")}-01`);
  for (let m = 1; m <= 3; m++) out.push(`2026-${String(m).padStart(2, "0")}-01`);
  return out;
})();
const SEED_UNRATE = [
  3.5, 3.6, 3.5, 3.4, 3.7, 3.6, 3.5, 3.8, 3.8, 3.8, 3.7, 3.7, // 2023
  3.7, 3.9, 3.8, 3.9, 4.0, 4.1, 4.3, 4.2, 4.1, 4.1, 4.2, 4.1, // 2024
  4.0, 4.0, 4.1, 4.1, 4.2, 4.3, 4.4, 4.4, 4.4, 4.5, 4.4, 4.3, // 2025
  4.2, 4.3, 4.3, // 2026
];

// Illustrative state readings (prod = state-level Sahm). A few notable ones are
// pinned to the prototype; the rest are deterministic so the feed looks live.
const SEED_PINNED = {
  CA: [0.45, 0.4], WA: [0.52, 0.44], NV: [0.58, 0.51], TX: [0.17, 0.21],
  NY: [0.24, 0.28], FL: [0.11, 0.14], IL: [0.34, 0.3], MI: [0.41, 0.38],
};
function seedValue(code) {
  if (SEED_PINNED[code]) return SEED_PINNED[code];
  // deterministic pseudo-value in [0.05, 0.60] from the state code
  let h = 0;
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) % 997;
  const value = +(0.05 + (h % 56) / 100).toFixed(2);
  const prev = +Math.max(0, value - ((h % 7) - 3) / 100).toFixed(2);
  return [value, prev];
}
// A gentle 24-pt series converging to (prev, value) so the chart has a shape.
function seedSeries(value, prev, dates) {
  const n = dates.length;
  const start = Math.max(0, Math.min(value, prev) - 0.08);
  return dates.map((d, i) => {
    let s;
    if (i === n - 1) s = value;
    else if (i === n - 2) s = prev;
    else s = start + ((prev - start) * i) / (n - 2);
    return { t: monthLabel(d), sahm: +s.toFixed(2) };
  });
}

function buildSeed() {
  const natObs = SEED_MONTHS.map((date, i) => ({ date, rate: SEED_UNRATE[i] }));
  const regions = {};
  const seedDates = SEED_MONTHS.slice(-SERIES_WINDOW);
  for (const region of REGIONS) {
    if (region.code === "national") {
      regions.national = regionFromRates(region, natObs, true); // computed from snapshot
    } else {
      const [value, prev] = seedValue(region.code);
      regions[region.code] = {
        code: region.code,
        slug: region.slug,
        name: region.name,
        value,
        prev,
        computed: false, // illustrative
        asOf: SEED_MONTHS[SEED_MONTHS.length - 1],
        series: seedSeries(value, prev, seedDates),
      };
    }
  }
  return { regions, asOf: SEED_MONTHS[SEED_MONTHS.length - 1], live: false, crossCheck: {} };
}

// ── main ────────────────────────────────────────────────────────────────────
function asOfLabel(iso) {
  const [y, m] = iso.split("-").map(Number);
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[m - 1]} ${y}`;
}

async function main() {
  const mode = API_KEY ? "LIVE (FRED)" : "SEED (no FRED_API_KEY — illustrative)";
  console.log(`▶ recession data — ${mode}`);
  const { regions, asOf, live, crossCheck } = API_KEY ? await buildLive() : buildSeed();

  const out = {
    meta: {
      trigger: 0.5,
      asOf,
      asOfLabel: asOfLabel(asOf),
      generatedAt: new Date().toISOString(),
      source: "BLS / FRED",
      live,
      crossCheck,
    },
    regions,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`✓ wrote ${Object.keys(regions).length} regions → ${OUT} (as of ${out.meta.asOfLabel})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
