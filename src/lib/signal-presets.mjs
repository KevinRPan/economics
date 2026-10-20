/* ───────────────────────────────────────────────────────────────────────────
   Signal Presets
   Curated cross-indicator recipes for the Signal Lab.
   Each recipe includes id, slug, title, description, and a preconfigured Signal.
   Gracefully adapts if extended indicators are not yet present in GAUGES.
─────────────────────────────────────────────────────────────────────────── */

import { GAUGES } from "./gauges.mjs";

/**
 * Builds the list of curated preset recipes.
 * Checks GAUGES dynamically to gracefully use new indicators if loaded,
 * or fall back to core available gauges.
 *
 * @returns {Array<{
 *   id: string,
 *   slug: string,
 *   title: string,
 *   description: string,
 *   signal: import("./dashboard-types").Signal
 * }>}
 */
export function getPresets() {
  const hasCape = Boolean(GAUGES && GAUGES.cape);
  const hasClaims = Boolean(GAUGES && GAUGES.claims);
  const hasBreakeven = Boolean(GAUGES && GAUGES.breakeven);

  return [
    {
      id: "classic-recession",
      slug: "classic-recession",
      title: "Classic Recession",
      description: "Yield curve inverted while the Sahm recession rule picks up momentum.",
      signal: {
        conditions: [
          { indicator: "curve", bands: ["inverted", "deep"] },
          { indicator: "recession", bands: ["watch", "tripped"] },
        ],
        holdMonths: 0,
        target: "recession",
        windowMonths: 12,
      },
    },
    {
      id: "credit-cracks",
      slug: "credit-cracks",
      title: "Credit Cracks",
      description: "Inverted yield curve paired with widening corporate credit spreads signaling lender stress.",
      signal: {
        conditions: [
          { indicator: "curve", bands: ["inverted", "deep"] },
          { indicator: "credit", bands: ["cautious", "stress"] },
        ],
        holdMonths: 0,
        target: "recession",
        windowMonths: 12,
      },
    },
    {
      id: "bubble-watch",
      slug: "bubble-watch",
      title: "Bubble Watch",
      description: "Stretched market valuations paired with an unusually calm VIX fear gauge before a stock crash.",
      signal: {
        conditions: [
          hasCape
            ? { indicator: "cape", bands: ["expensive", "mania", "frothy", "elevated"].filter((k) => GAUGES.cape.bands.some((b) => b.key === k)) }
            : { indicator: "buffett", bands: ["frothy", "mania"] },
          { indicator: "vix", bands: ["complacent", "calm"] },
        ],
        holdMonths: 0,
        target: "bear",
        windowMonths: 12,
      },
    },
    {
      id: "layoff-alarm",
      slug: "layoff-alarm",
      title: "Layoff Alarm",
      description: "Rising household strain and delinquency combined with early labor market softening.",
      signal: {
        conditions: hasClaims
          ? [
              { indicator: "claims", bands: ["elevated", "high", "rising"].filter((k) => GAUGES.claims.bands.some((b) => b.key === k)) },
              { indicator: "recession", bands: ["watch", "tripped"] },
            ]
          : [
              { indicator: "stress", bands: ["rising", "stressed", "crisis"] },
              { indicator: "recession", bands: ["watch", "tripped"] },
            ],
        holdMonths: 0,
        target: "joblessjump",
        windowMonths: 12,
      },
    },
    {
      id: "inflation-brewing",
      slug: "inflation-brewing",
      title: "Inflation Brewing",
      description: "Consumer prices running hot while real wages slip behind inflation.",
      signal: {
        conditions: hasBreakeven
          ? [
              { indicator: "breakeven", bands: ["elevated", "high"].filter((k) => GAUGES.breakeven.bands.some((b) => b.key === k)) },
              { indicator: "inflation", bands: ["elevated", "high"] },
            ]
          : [
              { indicator: "inflation", bands: ["elevated", "high"] },
              { indicator: "wages", bands: ["falling", "slipping"] },
            ],
        holdMonths: 0,
        target: "inflation",
        windowMonths: 12,
      },
    },
    {
      id: "rate-cut-setup",
      slug: "rate-cut-setup",
      title: "Rate Cut Setup",
      description: "Deep yield-curve inversion held for multiple months pushing the Fed toward rate cuts.",
      signal: {
        conditions: [
          { indicator: "curve", bands: ["inverted", "deep"] },
        ],
        holdMonths: 2,
        target: "fedcuts",
        windowMonths: 12,
      },
    },
  ];
}

export const PRESETS = getPresets();

/**
 * Finds a preset by its ID.
 * @param {string} id
 * @returns {typeof PRESETS[number] | undefined}
 */
export function getPresetById(id) {
  return PRESETS.find((p) => p.id === id);
}

/**
 * Finds a preset by its URL slug.
 * @param {string} slug
 * @returns {typeof PRESETS[number] | undefined}
 */
export function getPresetBySlug(slug) {
  return PRESETS.find((p) => p.slug === slug);
}
