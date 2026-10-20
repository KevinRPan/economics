/* ───────────────────────────────────────────────────────────────────────────
   Build-Time Event Stream — the live-feeling newsroom pulse.

   Assembles a chronological feed of:
   1. Data Releases: latest reading per indicator, dated by asOf/calendar,
      with band context and 2–3 reporter reactions.
   2. Band Changes: transitions from verdicts.json history with reporter reactions.
   3. On-This-Day Factoids: historical comparisons and cycle extremes from histories.
   4. Upcoming Releases: next scheduled events from calendar.json.

   Runs entirely at build time. Never crashes on missing or partial inputs.
─────────────────────────────────────────────────────────────────────────── */

import { GAUGES } from "./gauges.mjs";
import { generateReactions } from "./reporters.mjs";

/** @typedef {import("./dashboard-types").StreamItem} StreamItem */

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const INDICATOR_META = {
  recession: { name: "Sahm Rule Recession Nowcast", short: "Sahm nowcast", slug: "recession", fmt: (v) => `${v.toFixed(2)} pts` },
  curve: { name: "Yield Curve (10y−3m)", short: "Yield curve", slug: "curve", fmt: (v) => `${v.toFixed(2)}%` },
  inflation: { name: "CPI Inflation", short: "CPI inflation", slug: "inflation", fmt: (v) => `${v.toFixed(1)}%` },
  wages: { name: "Real Wage Growth", short: "Real wages", slug: "wages", fmt: (v) => `${v.toFixed(1)}%` },
  housing: { name: "Housing Affordability", short: "Housing burden", slug: "housing", fmt: (v) => `${v.toFixed(1)}%` },
  stress: { name: "Credit Card Delinquency", short: "Card strain", slug: "stress", fmt: (v) => `${v.toFixed(1)}%` },
  mood: { name: "Market Mood Composite", short: "Market mood", slug: "mood", fmt: (v) => `${Math.round(v)}/100` },
  buffett: { name: "Buffett Indicator", short: "Buffett indicator", slug: "buffett", fmt: (v) => `${Math.round(v)}%` },
  vix: { name: "VIX Fear Gauge", short: "VIX volatility", slug: "vix", fmt: (v) => v.toFixed(1) },
  credit: { name: "High-Yield Credit Spread", short: "Credit spread", slug: "credit", fmt: (v) => `${v.toFixed(2)}%` },
  claims: { name: "Initial Jobless Claims", short: "Jobless claims", slug: "claims", fmt: (v) => `${Math.round(v)}k` },
  payrolls: { name: "Nonfarm Payrolls", short: "Payrolls", slug: "payrolls", fmt: (v) => `${v >= 0 ? "+" : ""}${Math.round(v)}k` },
  openings: { name: "Job Openings per Unemployed", short: "Job openings", slug: "openings", fmt: (v) => `${v.toFixed(2)} ratio` },
  quits: { name: "Quits Rate", short: "Quits rate", slug: "quits", fmt: (v) => `${v.toFixed(1)}%` },
  gdp: { name: "Real GDP (YoY)", short: "Real GDP", slug: "gdp", fmt: (v) => `${v.toFixed(1)}%` },
  indpro: { name: "Industrial Production", short: "Industrial output", slug: "indpro", fmt: (v) => `${v.toFixed(1)}%` },
  retail: { name: "Real Retail Sales", short: "Retail sales", slug: "retail", fmt: (v) => `${v.toFixed(1)}%` },
  permits: { name: "Building Permits", short: "Building permits", slug: "permits", fmt: (v) => `${Math.round(v)}k` },
  fedfunds: { name: "Effective Fed Funds Rate", short: "Fed funds", slug: "fedfunds", fmt: (v) => `${v.toFixed(2)}%` },
  corepce: { name: "Core PCE Inflation", short: "Core PCE", slug: "corepce", fmt: (v) => `${v.toFixed(1)}%` },
  breakeven: { name: "10-Year Breakeven Inflation", short: "10y breakeven", slug: "breakeven", fmt: (v) => `${v.toFixed(2)}%` },
  gas: { name: "Regular Gasoline", short: "Gas price", slug: "gas", fmt: (v) => `$${v.toFixed(2)}/gal` },
  oil: { name: "WTI Crude Oil", short: "Crude oil", slug: "oil", fmt: (v) => `$${v.toFixed(1)}/bbl` },
  dollar: { name: "Broad Dollar Index", short: "US Dollar", slug: "dollar", fmt: (v) => `${v.toFixed(1)}%` },
  savings: { name: "Personal Saving Rate", short: "Saving rate", slug: "savings", fmt: (v) => `${v.toFixed(1)}%` },
  sentiment: { name: "UMich Consumer Sentiment", short: "Consumer sentiment", slug: "sentiment", fmt: (v) => v.toFixed(1) },
  nfci: { name: "Chicago Fed Financial Conditions", short: "Financial conditions", slug: "nfci", fmt: (v) => v.toFixed(2) },
  cape: { name: "Shiller CAPE (P/E10)", short: "Shiller CAPE", slug: "cape", fmt: (v) => `${v.toFixed(1)}x` },
};

function formatValue(indicator, val) {
  if (val == null) return "—";
  const meta = INDICATOR_META[indicator];
  if (meta?.fmt) return meta.fmt(val);
  const gauge = GAUGES[indicator];
  if (gauge) {
    return val.toFixed(gauge.decimals ?? 1) + (gauge.suffix ?? "");
  }
  return typeof val === "number" ? val.toFixed(1) : String(val);
}

function getIndicatorName(indicator) {
  return INDICATOR_META[indicator]?.short || INDICATOR_META[indicator]?.name || GAUGES[indicator]?.short || indicator;
}

function getIndicatorSlug(indicator) {
  if (indicator === "recession") return "recession";
  return INDICATOR_META[indicator]?.slug || GAUGES[indicator]?.slug || indicator;
}

function toIsoDate(d) {
  if (!d) return new Date().toISOString().slice(0, 10);
  if (typeof d === "string") return d.slice(0, 10);
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

function parseUtcDate(isoStr) {
  const parts = isoStr.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
}

function formatWeekdayMonthDay(isoStr) {
  const d = parseUtcDate(isoStr);
  const dayName = DAYS[d.getUTCDay()];
  const monthName = MONTHS_SHORT[d.getUTCMonth()];
  const dayNum = d.getUTCDate();
  return { dayName, monthName, dayNum, formatted: `${dayName}, ${monthName} ${dayNum}` };
}

// Curated cycle milestones if histories data is sparse or missing
const FALLBACK_FACTOIDS = [
  {
    indicator: "curve",
    offsetDays: 1,
    title: "Yield Curve Inversion Milestone",
    body: "In March 2023, the 10y-3m yield curve inverted to -1.67%, marking the deepest inversion since the early 1980s Volcker tightening.",
  },
  {
    indicator: "inflation",
    offsetDays: 2,
    title: "CPI Inflation Cycle Peak",
    body: "In June 2022, year-over-year CPI hit 9.1%, the highest headline print in over four decades, prompting consecutive 75-basis-point Fed rate hikes.",
  },
  {
    indicator: "recession",
    offsetDays: 3,
    title: "Sahm Rule Historical Reliability",
    body: "The Sahm recession rule has triggered in all 10 US recessions since 1950, with zero false positives across seven decades of labor data.",
  },
  {
    indicator: "credit",
    offsetDays: 5,
    title: "Credit Market Stress Benchmark",
    body: "During the October 2008 Lehman collapse, US high-yield credit spreads spiked past 19.5%, compared to the long-run median of ~5.0%.",
  },
  {
    indicator: "housing",
    offsetDays: 7,
    title: "Housing Burden Historical Shift",
    body: "Between 2012 and 2020, median mortgage payments consumed roughly 18% of median household income, well below today's stretched 30%+ cost burden.",
  },
  {
    indicator: "buffett",
    offsetDays: 9,
    title: "Buffett Indicator Dot-Com Echo",
    body: "The ratio of corporate equities to GDP crested at 148% during the March 2000 tech peak — a level that today's market has comfortably eclipsed.",
  },
];

/**
 * Builds the newsroom event stream for the dashboard.
 *
 * @param {Object} params
 * @param {Object} [params.markets] - Baked markets data
 * @param {Object} [params.verdicts] - Verdicts history data
 * @param {Object} [params.calendar] - Scheduled calendar releases
 * @param {Object} [params.histories] - Monthly histories and target events
 * @param {string|Date} [params.now] - Current timestamp anchor
 * @returns {StreamItem[]} Chronological stream items, newest first
 */
export function buildStream({
  markets = {},
  verdicts = {},
  calendar = {},
  histories = {},
  now = new Date(),
} = {}) {
  const nowDateStr = toIsoDate(now);
  const items = [];

  const marketsGauges = markets?.gauges || {};
  const verdictCards = verdicts?.cards || {};

  // ── 1. RELEASE ITEMS ───────────────────────────────────────────────────────
  // Combine all known indicators that have readings in markets or verdicts
  const candidateIndicators = new Set([
    ...Object.keys(GAUGES),
    ...Object.keys(marketsGauges),
    ...Object.keys(verdictCards),
  ]);

  for (const ind of candidateIndicators) {
    const marketReading = marketsGauges[ind];
    const verdictReading = verdictCards[ind];
    const val = marketReading?.value ?? verdictReading?.value;
    if (val == null) continue;

    const prev = marketReading?.prev;
    const asOf = marketReading?.asOf || verdictReading?.asOf || nowDateStr;
    const bandLabel = verdictReading?.label || (GAUGES[ind] ? GAUGES[ind].bands?.find((b) => val < b.upTo)?.label : "");
    const bandKey = verdictReading?.key || (GAUGES[ind] ? GAUGES[ind].bands?.find((b) => val < b.upTo)?.key : "");
    const indName = getIndicatorName(ind);
    const slug = getIndicatorSlug(ind);
    const valFmt = formatValue(ind, val);

    let title = `${indName}: ${valFmt}`;
    let dir = "flat";
    if (prev != null) {
      const diff = val - prev;
      const prevFmt = formatValue(ind, prev);
      if (Math.abs(diff) >= 0.005) {
        dir = diff > 0 ? "up" : "down";
        title = `${indName}: ${valFmt}, ${dir} from ${prevFmt}`;
      } else {
        title = `${indName}: ${valFmt}, steady from ${prevFmt}`;
      }
    }
    if (bandLabel) {
      title += ` · ${bandLabel}`;
    }

    // Descriptive body
    let body = "";
    if (GAUGES[ind]?.heads?.[bandKey]) {
      body = GAUGES[ind].heads[bandKey];
    } else if (GAUGES[ind]?.takeaway) {
      body = GAUGES[ind].takeaway(val);
    } else if (marketReading?.description) {
      body = marketReading.description;
    } else {
      body = `Latest official reading recorded for ${indName} as of ${asOf}.`;
    }

    const itemId = `release-${ind}-${asOf}`;
    const reactions = generateReactions({
      id: itemId,
      kind: "release",
      indicator: ind,
      indicatorLabel: indName,
      value: valFmt,
      prevValue: prev != null ? formatValue(ind, prev) : undefined,
      bandKey,
      bandLabel,
      direction: dir,
    });

    items.push({
      id: itemId,
      kind: "release",
      date: asOf,
      indicator: ind,
      title,
      body,
      href: `/${slug}`,
      reactions,
    });
  }

  // ── 2. BAND-CHANGE ITEMS ───────────────────────────────────────────────────
  for (const [ind, card] of Object.entries(verdictCards)) {
    if (!Array.isArray(card?.history)) continue;
    const indName = getIndicatorName(ind);
    const slug = getIndicatorSlug(ind);

    for (const h of card.history) {
      if (!h?.date || !h?.to) continue;
      const itemId = `band-${ind}-${h.date}-${h.to}`;
      const title = `${indName}: Shifted from ${h.fromLabel || h.from} to ${h.label || h.to}`;
      const valFmt = h.value != null ? formatValue(ind, h.value) : undefined;

      let body = "";
      if (GAUGES[ind]?.heads?.[h.to]) {
        body = GAUGES[ind].heads[h.to];
      } else {
        body = `${indName} moved into the "${h.label || h.to}" zone at ${valFmt ?? "latest reading"}.`;
      }

      const reactions = generateReactions({
        id: itemId,
        kind: "band-change",
        indicator: ind,
        indicatorLabel: indName,
        value: valFmt,
        fromBand: h.fromLabel || h.from,
        toBand: h.label || h.to,
        bandKey: h.to,
      });

      items.push({
        id: itemId,
        kind: "band-change",
        date: h.date,
        indicator: ind,
        title,
        body,
        href: `/${slug}`,
        reactions,
      });
    }
  }

  // ── 3. UPCOMING ITEMS (FROM CALENDAR) ──────────────────────────────────────
  const rawReleases = Array.isArray(calendar)
    ? calendar
    : Array.isArray(calendar?.releases)
      ? calendar.releases
      : [];

  const nowDate = parseUtcDate(nowDateStr);

  // Filter future/imminent releases
  const upcomingReleases = rawReleases
    .filter((r) => r?.date && r.date >= nowDateStr)
    .slice(0, 14);

  for (const rel of upcomingReleases) {
    const relDate = parseUtcDate(rel.date);
    const diffDays = Math.round((relDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));
    const { dayName, monthName, dayNum } = formatWeekdayMonthDay(rel.date);
    const indName = getIndicatorName(rel.indicator);
    const slug = getIndicatorSlug(rel.indicator);

    let timingStr = `drops ${dayName} · ${monthName} ${dayNum}`;
    if (diffDays === 0) timingStr = `drops today (${rel.time || "08:30 ET"})`;
    else if (diffDays === 1) timingStr = `drops tomorrow (${dayName})`;
    else if (diffDays <= 6) timingStr = `drops ${dayName} · ${monthName} ${dayNum}`;

    const title = `${rel.name || indName} ${timingStr}`;
    const body = rel.description || `Scheduled for ${rel.time || "morning"} release by ${rel.agency || "official sources"} covering ${rel.period || "recent period"}.`;

    items.push({
      id: `upcoming-${rel.id || `${rel.indicator}-${rel.date}`}`,
      kind: "upcoming",
      date: rel.date,
      indicator: rel.indicator,
      title,
      body,
      href: `/${slug}`,
    });
  }

  // ── 4. ON-THIS-DAY FACTOIDS (FROM HISTORIES OR CURATED) ────────────────────
  let factoidsCount = 0;
  const historyIndicators = histories?.indicators || {};

  // If histories has series data, extract authentic historical comparison points
  for (const [ind, series] of Object.entries(historyIndicators)) {
    if (!series?.values || !Array.isArray(series.values) || series.values.length < 24) continue;
    if (factoidsCount >= 6) break;

    const validVals = series.values.filter((v) => v != null && typeof v === "number");
    if (validVals.length < 12) continue;

    const maxVal = Math.max(...validVals);
    const maxIdx = series.values.lastIndexOf(maxVal);
    const indName = getIndicatorName(ind);
    const slug = getIndicatorSlug(ind);

    if (maxIdx >= 0) {
      // Calculate date of max
      const startParts = (series.start || "2000-01").split("-").map(Number);
      const startYear = startParts[0];
      const startMo = startParts[1] || 1;
      const targetMoTotal = (startYear * 12 + (startMo - 1)) + maxIdx;
      const peakYear = Math.floor(targetMoTotal / 12);
      const peakMo = (targetMoTotal % 12) + 1;
      const peakMoName = MONTHS_SHORT[peakMo - 1];

      // Anchor factoid date near today (e.g. 1-4 days ago) so it appears in recent stream
      const factoidDate = new Date(nowDate.getTime());
      factoidDate.setUTCDate(factoidDate.getUTCDate() - (factoidsCount + 1));
      const factoidIso = toIsoDate(factoidDate);

      const peakValFmt = formatValue(ind, maxVal);
      const title = `On This Day in History: ${indName} Peak`;
      const body = `In ${peakMoName} ${peakYear}, ${indName} touched a historical extreme of ${peakValFmt}. Historical peaks often signal cycle inflection points.`;

      items.push({
        id: `factoid-${ind}-peak`,
        kind: "on-this-day",
        date: factoidIso,
        indicator: ind,
        title,
        body,
        href: `/${slug}`,
      });
      factoidsCount++;
    }
  }

  // Fill in any remaining factoids from curated cycle milestones
  for (let i = 0; i < FALLBACK_FACTOIDS.length && factoidsCount < 6; i++) {
    const f = FALLBACK_FACTOIDS[i];
    const factoidDate = new Date(nowDate.getTime());
    factoidDate.setUTCDate(factoidDate.getUTCDate() - (f.offsetDays || (factoidsCount + 1)));
    const factoidIso = toIsoDate(factoidDate);
    const slug = getIndicatorSlug(f.indicator);

    items.push({
      id: `factoid-fallback-${f.indicator}-${i}`,
      kind: "on-this-day",
      date: factoidIso,
      indicator: f.indicator,
      title: f.title,
      body: f.body,
      href: `/${slug}`,
    });
    factoidsCount++;
  }

  // ── DEDUPLICATE & SORT ─────────────────────────────────────────────────────
  const seenIds = new Set();
  const deduped = [];
  for (const it of items) {
    if (!it.id || seenIds.has(it.id)) continue;
    seenIds.add(it.id);
    deduped.push(it);
  }

  // Sort descending by date (newest first).
  // For identical dates, upcoming first, then release, then band-change, then factoids
  const kindPriority = { upcoming: 4, release: 3, "band-change": 2, "on-this-day": 1 };
  deduped.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date < b.date ? 1 : -1;
    }
    const pa = kindPriority[a.kind] || 0;
    const pb = kindPriority[b.kind] || 0;
    if (pa !== pb) return pb - pa;
    return a.title.localeCompare(b.title);
  });

  // Keep ~30–60 items
  return deduped.slice(0, 50);
}
