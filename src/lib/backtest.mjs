/* ───────────────────────────────────────────────────────────────────────────
   Signal Lab Backtest Engine
   Pure, deterministic backtesting engine for cross-indicator macro signals.
   Evaluates user signals against historical monthly series and target events.
─────────────────────────────────────────────────────────────────────────── */

import { GAUGES, bandFor } from "./gauges.mjs";
import { statusFor } from "./recession.mjs";

/**
 * Parses a "YYYY-MM" string into year and month (1..12).
 * @param {string} m
 * @returns {{ year: number, month: number }}
 */
export function parseMonth(m) {
  if (!m || typeof m !== "string" || !m.includes("-")) {
    return { year: 1970, month: 1 };
  }
  const [y, mon] = m.split("-").map((v) => parseInt(v, 10));
  return { year: y || 1970, month: mon || 1 };
}

/**
 * Formats year and month into "YYYY-MM".
 * @param {number} year
 * @param {number} month
 * @returns {string}
 */
export function formatMonth(year, month) {
  const y = Math.floor(year + (month - 1) / 12);
  const m = (((month - 1) % 12) + 12) % 12 + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

/**
 * Adds n months to a "YYYY-MM" string.
 * @param {string} m
 * @param {number} n
 * @returns {string}
 */
export function addMonths(m, n) {
  const { year, month } = parseMonth(m);
  return formatMonth(year, month + n);
}

/**
 * Returns difference in months: m2 - m1.
 * e.g. diffMonths("2007-01", "2008-01") === 12
 * @param {string} m1
 * @param {string} m2
 * @returns {number}
 */
export function diffMonths(m1, m2) {
  const p1 = parseMonth(m1);
  const p2 = parseMonth(m2);
  return (p2.year - p1.year) * 12 + (p2.month - p1.month);
}

/**
 * Maps a MonthlySeries to its band key per month.
 * @param {string} indicatorId - gauge id or "recession"
 * @param {import("./dashboard-types").MonthlySeries} series
 * @returns {{ start: string, bands: (string | null)[] }}
 */
export function bandSeries(indicatorId, series) {
  if (!series || !series.start || !Array.isArray(series.values)) {
    return { start: series?.start || "", bands: [] };
  }

  const isRecession = indicatorId === "recession";
  const gauge = GAUGES ? GAUGES[indicatorId] : null;

  const bands = series.values.map((v) => {
    if (v === null || v === undefined || Number.isNaN(v)) return null;
    if (isRecession) {
      return statusFor(v).key;
    }
    if (gauge && Array.isArray(gauge.bands)) {
      return bandFor(gauge, v).key;
    }
    return null;
  });

  return {
    start: series.start,
    bands,
  };
}

/**
 * Gets the band key for a specific month from a banded series.
 * @param {{ start: string, bands: (string | null)[] }} banded
 * @param {string} monthKey
 * @returns {string | null}
 */
export function getBandAt(banded, monthKey) {
  if (!banded || !banded.start || !Array.isArray(banded.bands) || !monthKey) return null;
  const idx = diffMonths(banded.start, monthKey);
  if (idx < 0 || idx >= banded.bands.length) return null;
  return banded.bands[idx];
}

/**
 * Evaluates a Signal against histories.
 *
 * @param {import("./dashboard-types").Signal} signal
 * @param {import("./dashboard-types").HistoriesData} histories
 * @returns {{
 *   activeMonths: string[],
 *   fires: string[],
 *   coverage: { start: string | null, end: string | null },
 *   events: { event: import("./dashboard-types").TargetEvent, caught: boolean, leadMonths: number | null, firstFire: string | null }[],
 *   falseAlarms: string[],
 *   pending: string[],
 *   summary: { caught: number, total: number, avgLead: number | null, falseAlarms: number, pending: number },
 *   isFiringNow: boolean,
 * }}
 */
export function evaluate(signal, histories) {
  const emptyResult = {
    activeMonths: [],
    fires: [],
    coverage: { start: null, end: null },
    events: [],
    falseAlarms: [],
    pending: [],
    summary: { caught: 0, total: 0, avgLead: null, falseAlarms: 0, pending: 0 },
    isFiringNow: false,
  };

  if (!signal || !histories) return emptyResult;

  const targetDef = histories.targets ? histories.targets[signal.target] : null;
  const conditions = Array.isArray(signal.conditions) ? signal.conditions : [];
  const holdMonths = Math.max(0, signal.holdMonths || 0);
  const windowMonths = Math.max(1, signal.windowMonths || 12);

  // Compute coverage overlap across all condition indicators AND target coverage
  let covStart = targetDef?.coverage?.start || null;
  let covEnd = targetDef?.coverage?.end || null;

  // If targetDef coverage is missing, attempt to derive from target events
  if (!covStart && targetDef?.events && targetDef.events.length > 0) {
    covStart = targetDef.events[0].start;
    covEnd = targetDef.events[targetDef.events.length - 1].end || targetDef.events[targetDef.events.length - 1].start;
  }

  for (const cond of conditions) {
    const series = histories.indicators ? histories.indicators[cond.indicator] : null;
    if (!series || !series.start || !Array.isArray(series.values) || series.values.length === 0) {
      // If a condition indicator is completely missing, no coverage
      return emptyResult;
    }
    const seriesEnd = addMonths(series.start, series.values.length - 1);
    if (!covStart || series.start > covStart) {
      covStart = series.start;
    }
    if (!covEnd || seriesEnd < covEnd) {
      covEnd = seriesEnd;
    }
  }

  // If no conditions, but target exists, coverage is target coverage
  if (conditions.length === 0 && (!covStart || !covEnd)) {
    return emptyResult;
  }

  if (!covStart || !covEnd || covStart > covEnd) {
    return emptyResult;
  }

  const coverage = { start: covStart, end: covEnd };

  // Pre-compute band series for each condition indicator
  const bandedSeriesMap = new Map();
  for (const cond of conditions) {
    const series = histories.indicators[cond.indicator];
    bandedSeriesMap.set(cond.indicator, bandSeries(cond.indicator, series));
  }

  // Iterate over each month in coverage
  const numMonths = diffMonths(covStart, covEnd) + 1;
  const activeMonths = [];
  const fires = [];

  let consecutiveHeld = 0;
  let isOn = false;

  for (let i = 0; i < numMonths; i++) {
    const month = addMonths(covStart, i);

    // Check if conditions match this month
    let matches = conditions.length > 0;
    if (matches) {
      for (const cond of conditions) {
        const banded = bandedSeriesMap.get(cond.indicator);
        const b = getBandAt(banded, month);
        if (!b || !Array.isArray(cond.bands) || !cond.bands.includes(b)) {
          matches = false;
          break;
        }
      }
    }

    if (matches) {
      consecutiveHeld++;
      // Signal turns on or stays on if conditions held for at least (holdMonths + 1) months
      if (consecutiveHeld >= holdMonths + 1) {
        activeMonths.push(month);
        if (!isOn) {
          isOn = true;
          fires.push(month);
        }
      }
    } else {
      consecutiveHeld = 0;
      isOn = false; // re-arms when signal switches off
    }
  }

  // isFiringNow: is the signal active in the latest month of coverage?
  const isFiringNow = activeMonths.length > 0 && activeMonths[activeMonths.length - 1] === covEnd;

  // Filter target events: only count events whose start lies inside coverage
  const allTargetEvents = targetDef?.events || [];
  const eventsInCoverage = allTargetEvents.filter(
    (e) => e.start >= coverage.start && e.start <= coverage.end
  );

  // Evaluate each event
  const events = eventsInCoverage.map((event) => {
    // A fire catches the event if it fires within windowMonths BEFORE event.start
    // i.e. 0 <= diffMonths(fire, event.start) <= windowMonths
    const qualifyingFires = fires.filter((f) => {
      const diff = diffMonths(f, event.start);
      return diff >= 0 && diff <= windowMonths;
    });

    if (qualifyingFires.length > 0) {
      const firstFire = qualifyingFires[0];
      const leadMonths = diffMonths(firstFire, event.start);
      return {
        event,
        caught: true,
        leadMonths,
        firstFire,
      };
    }

    return {
      event,
      caught: false,
      leadMonths: null,
      firstFire: null,
    };
  });

  // Evaluate false alarms and pending fires:
  // fires not followed by an event start within windowMonths
  // If window hasn't elapsed before coverage.end -> pending
  const falseAlarms = [];
  const pending = [];

  for (const f of fires) {
    // Check if followed by an event start within windowMonths (only events in coverage count)
    const followedByEvent = eventsInCoverage.some((e) => {
      const diff = diffMonths(f, e.start);
      return diff >= 0 && diff <= windowMonths;
    });

    if (!followedByEvent) {
      const windowEnd = addMonths(f, windowMonths);
      if (windowEnd > coverage.end) {
        pending.push(f);
      } else {
        falseAlarms.push(f);
      }
    }
  }

  // Summary statistics
  const caughtEvents = events.filter((e) => e.caught);
  const total = events.length;
  const caught = caughtEvents.length;

  let avgLead = null;
  if (caught > 0) {
    const totalLead = caughtEvents.reduce((sum, e) => sum + (e.leadMonths || 0), 0);
    avgLead = Math.round((totalLead / caught) * 10) / 10;
  }

  return {
    activeMonths,
    fires,
    coverage,
    events,
    falseAlarms,
    pending,
    summary: {
      caught,
      total,
      avgLead,
      falseAlarms: falseAlarms.length,
      pending: pending.length,
    },
    isFiringNow,
  };
}
