/* ───────────────────────────────────────────────────────────────────────────
   Build-time history compilation for /dashboard Signal Lab & Backtester.
   Writes src/data/histories.json matching HistoriesData in src/lib/dashboard-types.ts:
     - Full monthly contiguous history for every gauge id (9 existing + 18 new + "recession" Sahm)
     - All 6 backtest targets with coverage and merged episodes
     - Compact JSON (no pretty-print, target < ~600KB)
     - Illustrative seed fallback when offline (meta.live = false)
─────────────────────────────────────────────────────────────────────────── */

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { TARGET_META, computeTargetEvents, monthDiff, addMonths } from "../src/lib/targets.mjs";
import { computeAllIndicators, roundVal, SEED_READINGS } from "./lib/indicators.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/data/histories.json");

/**
 * Convert a sorted array of [{ date, value }] to a contiguous MonthlySeries:
 * { start: "YYYY-MM", values: (number | null)[] }
 * covering from start through maxMonth.
 */
function toContiguousSeries(id, pts, maxMonth) {
  if (!pts || pts.length === 0) {
    return { start: maxMonth, values: [] };
  }

  const startMonth = pts[0].date.slice(0, 7);
  const endMonth = maxMonth || pts[pts.length - 1].date.slice(0, 7);
  const totalMonths = monthDiff(startMonth, endMonth) + 1;
  const values = new Array(Math.max(0, totalMonths)).fill(null);

  for (const pt of pts) {
    const m = pt.date.slice(0, 7);
    const idx = monthDiff(startMonth, m);
    if (idx >= 0 && idx < totalMonths) {
      values[idx] = roundVal(id, pt.value);
    }
  }

  return { start: startMonth, values };
}

/**
 * Illustrative seed fallback when FRED / remote data is unavailable.
 */
function buildSeed() {
  const now = new Date();
  const through = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const WINDOW = 60; // 5 years of monthly seed points
  const startMonth = addMonths(through, -WINDOW + 1);

  const indicators = {};
  for (const [id, seed] of Object.entries(SEED_READINGS)) {
    const values = [];
    for (let i = 0; i < WINDOW; i++) {
      let v;
      if (i === WINDOW - 1) v = seed.value;
      else if (i === WINDOW - 2) v = seed.prev;
      else v = seed.start + ((seed.prev - seed.start) * i) / (WINDOW - 2);
      values.push(roundVal(id, v));
    }
    indicators[id] = { start: startMonth, values };
  }

  const targets = {};
  const targetIds = ["recession", "bear", "joblessjump", "inflation", "housing", "fedcuts"];
  for (const tid of targetIds) {
    const meta = TARGET_META[tid];
    targets[tid] = {
      id: tid,
      label: meta.label,
      short: meta.short,
      description: meta.description,
      coverage: { start: startMonth, end: through },
      events: [
        { start: addMonths(through, -36), end: addMonths(through, -32) },
      ],
    };
  }

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      live: false,
      through,
    },
    indicators,
    targets,
  };
}

async function main() {
  console.log("▶ build-histories — compiling indicator histories and backtest targets");
  let data;

  try {
    const result = await computeAllIndicators();
    const { monthly, targetSeries, through, live } = result;

    const indicators = {};
    for (const [id, pts] of Object.entries(monthly)) {
      indicators[id] = toContiguousSeries(id, pts, through);
    }

    const targets = {};
    const targetIds = ["recession", "bear", "joblessjump", "inflation", "housing", "fedcuts"];

    for (const tid of targetIds) {
      const meta = TARGET_META[tid];
      const pts = targetSeries[tid] || [];
      const events = computeTargetEvents(tid, pts);
      const coverage = {
        start: pts.length > 0 ? pts[0].date.slice(0, 7) : through,
        end: pts.length > 0 ? pts[pts.length - 1].date.slice(0, 7) : through,
      };

      targets[tid] = {
        id: tid,
        label: meta.label,
        short: meta.short,
        description: meta.description,
        coverage,
        events,
      };
    }

    data = {
      meta: {
        generatedAt: new Date().toISOString(),
        live,
        through,
      },
      indicators,
      targets,
    };
    console.log(`  live compilation succeeded (${Object.keys(indicators).length} indicators through ${through})`);
  } catch (err) {
    console.warn(`  live compilation failed (${err.message}), falling back to seed`);
    data = buildSeed();
  }

  const json = JSON.stringify(data); // Compact JSON
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, json);

  const kb = (Buffer.byteLength(json, "utf8") / 1024).toFixed(1);
  console.log(`✓ wrote histories.json (${kb} KB) → ${OUT}`);

  console.log("\nTarget episodes summary:");
  for (const [id, def] of Object.entries(data.targets)) {
    console.log(`  • ${id} (${def.label}): ${def.events.length} episodes (coverage: ${def.coverage.start} → ${def.coverage.end})`);
    if (def.events.length > 0) {
      const sample = def.events.slice(-3).map((e) => `${e.start}→${e.end ?? "now"}`).join(", ");
      console.log(`    latest: ${sample}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
