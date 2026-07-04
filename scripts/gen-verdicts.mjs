/* ───────────────────────────────────────────────────────────────────────────
   Verdict-change history — the site's memory.

   A band transition (Calm → Anxious, Frothy → Mania, Clear → Watch) is the
   single most newsworthy thing a card can do, but each build starts from
   scratch. This script gives builds continuity:

   1. Compute the current verdict band for every card (recession + gauges).
   2. Fetch the PREVIOUS deploy's /data/verdicts.json from the live site
      (falling back to the committed src/data/verdicts.json when offline).
   3. Where the band changed, append a dated entry to that card's history.
   4. Write src/data/verdicts.json — served back at /data/verdicts.json by an
      Astro endpoint, read by the feed ("since …" chips) and the RSS feed.

   Changes are only recorded from LIVE data; seed builds carry the previous
   history through untouched so illustrative values never enter the record.

   Runs after fetch-data + fetch-markets (see the `data` npm script).
─────────────────────────────────────────────────────────────────────────── */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { verdict as recessionVerdict } from "../src/lib/recession.mjs";
import { GAUGES, gaugeVerdict } from "../src/lib/gauges.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/data/verdicts.json");
const LIVE_URL = "https://econ.kpan.dev/data/verdicts.json";

async function loadJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

// Previous verdict state: prefer the live site's copy (the actual previous
// deploy); fall back to the committed file; start fresh if neither works.
async function loadPrevious() {
  try {
    const res = await fetch(LIVE_URL, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const json = await res.json();
      if (json?.cards) {
        console.log("  previous verdicts: live site");
        return json;
      }
    }
  } catch {
    /* offline / first deploy — fall through */
  }
  try {
    const json = await loadJson(OUT);
    console.log("  previous verdicts: committed file");
    return json;
  } catch {
    console.log("  previous verdicts: none (fresh start)");
    return null;
  }
}

function currentCards(recession, markets) {
  const cards = {};
  const nat = recession.regions.national;
  const rv = recessionVerdict(nat.value, nat.prev);
  cards.recession = { key: rv.key, label: rv.label, value: nat.value, asOf: recession.meta.asOf };
  for (const gauge of Object.values(GAUGES)) {
    const r = markets.gauges[gauge.id];
    if (!r) continue;
    const v = gaugeVerdict(gauge, r.value, r.prev);
    cards[gauge.id] = { key: v.key, label: v.label, value: r.value, asOf: r.asOf };
  }
  return cards;
}

async function main() {
  console.log("▶ verdict history");
  const recession = await loadJson(resolve(__dirname, "../src/data/recession.json"));
  const markets = await loadJson(resolve(__dirname, "../src/data/markets.json"));
  const live = Boolean(recession.meta.live || markets.meta.live);
  const previous = await loadPrevious();

  const cards = {};
  let changes = 0;
  for (const [id, cur] of Object.entries(currentCards(recession, markets))) {
    const prev = previous?.cards?.[id];
    if (!prev) {
      cards[id] = { ...cur, since: cur.asOf, history: [] };
    } else if (live && prev.key !== cur.key) {
      changes++;
      cards[id] = {
        ...cur,
        since: cur.asOf,
        history: [
          ...(prev.history ?? []),
          { date: cur.asOf, from: prev.key, fromLabel: prev.label, to: cur.key, label: cur.label, value: cur.value },
        ],
      };
    } else if (!live) {
      // Seed build: preserve the previous (live) record untouched so
      // illustrative values never overwrite real state.
      cards[id] = prev;
    } else {
      // Same band: fresh reading, same memory.
      cards[id] = { ...cur, since: prev.since ?? cur.asOf, history: prev.history ?? [] };
    }
  }

  const out = { updated: new Date().toISOString(), live, cards };
  await writeFile(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`✓ wrote ${Object.keys(cards).length} card verdicts → ${OUT} (${changes} band change${changes === 1 ? "" : "s"})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
