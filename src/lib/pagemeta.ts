import { verdict, takeawayFor } from "./recession.mjs";
import { GAUGES, gaugeVerdict, fmt } from "./gauges.mjs";
import type { Gauge } from "./gauges.mjs";
import type { RegionData, GaugeReading } from "./types";

// Per-region static page meta: title, description, OG image path, canonical path.
export function pageMeta(r: RegionData) {
  const v = verdict(r.value, r.prev);
  const key = r.code === "national" ? "national" : r.code.toLowerCase();
  const path = r.code === "national" ? "/recession" : `/recession/${r.slug}`;
  return {
    title: `Are we in a recession? — ${r.name}`,
    description: `${r.name}: Sahm recession gauge at ${r.value.toFixed(2)} (trigger 0.50). ${v.head} ${takeawayFor(r.value)}`,
    ogImage: `/og/recession-${key}.png`,
    path,
  };
}

// Per-gauge static page meta for the market hype/mania/greed cards.
export function gaugePageMeta(gauge: Gauge, r: GaugeReading) {
  const v = gaugeVerdict(gauge, r.value, r.prev);
  return {
    title: `${gauge.headline} — ${fmt(gauge, r.value)}`,
    description: `${gauge.short} at ${fmt(gauge, r.value)}. ${v.head} ${gauge.takeaway(r.value)}`,
    ogImage: `/og/${gauge.id}.png`,
    path: `/${gauge.slug}`,
  };
}

export { GAUGES };
