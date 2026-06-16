import { verdict, takeawayFor } from "./recession.mjs";
import type { RegionData } from "./types";

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
