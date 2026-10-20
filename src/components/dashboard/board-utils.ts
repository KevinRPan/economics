import { GAUGES, gaugeVerdict, fmt, pctileLine, C } from "../../lib/gauges.mjs";
import { verdict as recessionVerdict } from "../../lib/recession.mjs";
import { CATALOG } from "../../lib/board.mjs";
import type { MarketsData, RecessionData } from "../../lib/types";

export interface SparklineData {
  d: string;
  cx: number;
  cy: number;
  w: number;
  h: number;
}

export interface TileData {
  id: string;
  slug: string;
  href: string;
  eyebrow: string;
  headline: string;
  head: string;
  sub?: string;
  label: string;
  accent: string;
  value: string;
  asOf: string;
  since: string | null;
  pctileLine: string | null;
  series: number[];
  sparkline: SparklineData | null;
}

export interface BandChangeChip {
  id: string;
  name: string;
  slug: string;
  date: string;
  dateLabel: string;
  fromLabel: string;
  toLabel: string;
  accent: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function monthYear(iso?: string | null): string {
  if (!iso || typeof iso !== "string") return "";
  const parts = iso.split("-").map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return iso;
  const m = parts[1];
  const y = parts[0];
  if (m < 1 || m > 12) return iso;
  return `${MONTHS[m - 1]} ${y}`;
}

export function computeSparkline(values: number[], w = 84, h = 26, pad = 3): SparklineData | null {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [
    pad + (i / Math.max(1, values.length - 1)) * (w - 2 * pad),
    pad + (1 - (v - min) / span) * (h - 2 * pad),
  ]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const [cx, cy] = pts[pts.length - 1];
  return { d, cx: +cx.toFixed(1), cy: +cy.toFixed(1), w, h };
}

export function sinceLabel(id: string, verdicts: any): string | null {
  const card = verdicts?.cards?.[id];
  return card?.history?.length && card.since ? monthYear(card.since) : null;
}

/**
 * Extracts tile data for a single indicator id.
 * Gracefully returns null if data is missing.
 */
export function getTileData(
  id: string,
  markets: MarketsData,
  recession: RecessionData,
  verdicts: any
): TileData | null {
  if (!id) return null;

  if (id === "recession") {
    const nat = recession?.regions?.national;
    if (!nat || nat.value == null) return null;

    const rv = recessionVerdict(nat.value, nat.prev ?? nat.value);
    const series = nat.series
      ?.map((p) => p.sahm)
      .filter((v): v is number => typeof v === "number")
      .slice(-24) ?? [];

    return {
      id: "recession",
      slug: "recession",
      href: "/recession",
      eyebrow: "Sahm Rule · Recession Nowcast",
      headline: "Are we in a recession?",
      head: rv.head,
      sub: rv.sub,
      label: rv.label,
      accent: rv.accent,
      value: nat.value.toFixed(2),
      asOf: monthYear(nat.asOf),
      since: sinceLabel("recession", verdicts),
      pctileLine: null,
      series,
      sparkline: computeSparkline(series),
    };
  }

  const r = markets?.gauges?.[id];
  if (!r || r.value == null) return null;

  const gauge = (GAUGES as Record<string, any>)[id] || (CATALOG as Record<string, any>)[id];
  if (!gauge) return null;

  let head = "";
  let sub = "";
  let label = "Normal";
  let accent = C.green;

  if (gauge.bands && typeof gaugeVerdict === "function") {
    const v = gaugeVerdict(gauge, r.value, r.prev ?? r.value);
    head = v.head;
    sub = v.sub;
    label = v.label;
    accent = v.accent;
  } else {
    head = `${gauge.headline || id}: ${r.value}`;
    label = "Active";
    accent = C.cool;
  }

  const formattedValue = typeof fmt === "function" && gauge.decimals != null
    ? fmt(gauge, r.value)
    : String(r.value);

  const series = r.series?.map((p: any) => p.v).slice(-24) ?? [];

  return {
    id,
    slug: gauge.slug || id,
    href: `/${gauge.slug || id}`,
    eyebrow: gauge.eyebrow || id.toUpperCase(),
    headline: gauge.headline || `${gauge.eyebrow || id}?`,
    head,
    sub,
    label,
    accent,
    value: formattedValue,
    asOf: monthYear(r.asOf),
    since: sinceLabel(id, verdicts),
    pctileLine: pctileLine(r),
    series,
    sparkline: computeSparkline(series),
  };
}

/**
 * Extracts recent band changes from verdicts.json to show as breaking news chips.
 */
export function extractBreakingChanges(verdicts: any): BandChangeChip[] {
  if (!verdicts?.cards) return [];
  const chips: BandChangeChip[] = [];

  for (const [id, card] of Object.entries<any>(verdicts.cards)) {
    if (!Array.isArray(card?.history) || card.history.length === 0) continue;
    // Get latest change from history
    const latest = card.history[card.history.length - 1];
    if (!latest?.date) continue;

    const catalogEntry = (GAUGES as Record<string, any>)[id] || (CATALOG as Record<string, any>)[id] || {
      eyebrow: id,
      slug: id,
    };

    const shortName = catalogEntry.eyebrow ? catalogEntry.eyebrow.split("·")[0].trim() : id;

    // Pick accent color for the target band
    let accent = C.amber;
    if (latest.to === "normal" || latest.to === "clear" || latest.to === "gaining") {
      accent = C.green;
    } else if (latest.to === "tripped" || latest.to === "deep" || latest.to === "mania" || latest.to === "distressed") {
      accent = C.red;
    }

    const [, m, d] = latest.date.split("-");
    const dateLabel = m && d ? `${MONTHS[Number(m) - 1]} ${Number(d)}` : latest.date;

    chips.push({
      id,
      name: shortName,
      slug: catalogEntry.slug || (id === "recession" ? "recession" : id),
      date: latest.date,
      dateLabel,
      fromLabel: latest.fromLabel || latest.from || "prior",
      toLabel: latest.label || latest.to || "current",
      accent,
    });
  }

  // Sort by date descending
  return chips.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
}
