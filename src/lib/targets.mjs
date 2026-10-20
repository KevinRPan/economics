// @ts-check
/* ───────────────────────────────────────────────────────────────────────────
   Pure backtest target episode definitions for /dashboard Signal Lab.
   Ported from the backtest target specification in BRIEF.md.
   
   Every target episode has:
     start: MonthKey ("YYYY-MM") — first month (what signals try to anticipate)
     end: MonthKey | null — last month of the episode, or null if ongoing
   
   Merge rule: episodes separated by < 6 months merge into one.
─────────────────────────────────────────────────────────────────────────── */

/**
 * Metadata for all 6 backtest targets.
 * Written in plain, honest language following .claude/skills/content-designer/SKILL.md.
 */
export const TARGET_META = {
  recession: {
    id: "recession",
    label: "Recessions",
    short: "recession",
    description: "NBER-dated economic downturns across the US economy.",
  },
  bear: {
    id: "bear",
    label: "Stock crashes (20%+)",
    short: "stock crash",
    description: "S&P 500 drops 20% or more from its prior all-time high to its trough.",
  },
  joblessjump: {
    id: "joblessjump",
    label: "Unemployment jumps",
    short: "jobless jump",
    description: "Unemployment rate climbs 1.0 pt or more above its 12-month low.",
  },
  inflation: {
    id: "inflation",
    label: "Inflation spikes",
    short: "inflation spike",
    description: "Consumer price inflation rises above 5% year-over-year.",
  },
  housing: {
    id: "housing",
    label: "Home prices falling",
    short: "home price drop",
    description: "Case-Shiller national home price index falls year-over-year.",
  },
  fedcuts: {
    id: "fedcuts",
    label: "Fed starts cutting",
    short: "Fed rate cut",
    description: "Federal funds rate drops 0.5 pt or more below its 12-month high.",
  },
};

/**
 * Parse a "YYYY-MM" or "YYYY-MM-DD" string into [year, month] integers.
 * @param {string} str
 * @returns {[number, number]}
 */
export function parseMonth(str) {
  const [y, m] = str.slice(0, 7).split("-").map(Number);
  return [y, m];
}

/**
 * Format [year, month] as "YYYY-MM".
 * @param {number} y
 * @param {number} m
 * @returns {string}
 */
export function formatMonth(y, m) {
  return `${y}-${String(m).padStart(2, "0")}`;
}

/**
 * Add N months to a "YYYY-MM" string.
 * @param {string} monthKey
 * @param {number} n
 * @returns {string}
 */
export function addMonths(monthKey, n) {
  const [y, m] = parseMonth(monthKey);
  const total = y * 12 + (m - 1) + n;
  const newY = Math.floor(total / 12);
  const newM = (total % 12) + 1;
  return formatMonth(newY, newM);
}

/**
 * Difference in months: b - a.
 * E.g., monthDiff("2020-01", "2020-07") = 6.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function monthDiff(a, b) {
  const [y1, m1] = parseMonth(a);
  const [y2, m2] = parseMonth(b);
  return (y2 - y1) * 12 + (m2 - m1);
}

/**
 * Normalize an input series into an array of { date: "YYYY-MM", value: number | null }.
 * Supports:
 * - Array of { date: string, value: number | null }
 * - MonthlySeries object { start: string, values: (number | null)[] }
 * @param {any} input
 * @returns {{ date: string, value: number | null }[]}
 */
export function normalizeSeries(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((item) => ({
      date: item.date.slice(0, 7),
      value: item.value != null && Number.isFinite(+item.value) ? +item.value : null,
    }));
  }
  if (input.start && Array.isArray(input.values)) {
    return input.values.map((val, i) => ({
      date: addMonths(input.start, i),
      value: val != null && Number.isFinite(+val) ? +val : null,
    }));
  }
  return [];
}

/**
 * Merge episodes separated by < minSeparation months (default 6).
 * "Separated by < 6 months" means the number of intervening months between
 * episode A's end and episode B's start is < 6 (i.e. monthDiff(end, start) <= 6).
 *
 * @param {{ start: string, end: string | null }[]} episodes
 * @param {number} [minSeparation=6]
 * @returns {{ start: string, end: string | null }[]}
 */
export function mergeEpisodes(episodes, minSeparation = 6) {
  if (!episodes || episodes.length <= 1) return episodes ? [...episodes] : [];

  const sorted = [...episodes].sort((a, b) => a.start.localeCompare(b.start));
  const merged = [];

  let cur = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];

    // If current episode has no end date (ongoing), it subsumes everything after it
    if (cur.end == null) {
      break;
    }

    // Number of intervening months between cur.end and next.start
    // e.g. cur.end = "2020-01", next.start = "2020-07" → monthDiff = 6 → intervening = 5 (< 6) → merge
    const diff = monthDiff(cur.end, next.start);
    const intervening = diff - 1;

    if (intervening < minSeparation) {
      // Merge: keep cur.start, update cur.end to max(cur.end, next.end)
      if (next.end == null) {
        cur.end = null;
      } else if (cur.end != null && next.end > cur.end) {
        cur.end = next.end;
      }
    } else {
      merged.push(cur);
      cur = { ...next };
    }
  }

  merged.push(cur);
  return merged;
}

/**
 * 1. RECESSION: NBER recession months (USREC = 1); start = first recession month.
 * @param {any} series
 * @returns {{ start: string, end: string | null }[]}
 */
export function computeRecessions(series) {
  const obs = normalizeSeries(series);
  const raw = [];
  let inRecession = false;
  let curStart = null;
  let curEnd = null;

  for (let i = 0; i < obs.length; i++) {
    const { date, value } = obs[i];
    if (value === 1) {
      if (!inRecession) {
        inRecession = true;
        curStart = date;
      }
      curEnd = date;
    } else if (inRecession) {
      raw.push({ start: curStart, end: curEnd });
      inRecession = false;
      curStart = null;
      curEnd = null;
    }
  }

  if (inRecession && curStart) {
    raw.push({ start: curStart, end: null }); // Ongoing
  }

  return mergeEpisodes(raw);
}

/**
 * 2. BEAR: S&P 500 (Shiller, nominal monthly) falls ≥20% from its prior all-time high;
 * start = that prior PEAK month; end = trough month.
 * @param {any} series
 * @returns {{ start: string, end: string | null }[]}
 */
export function computeBear(series) {
  const obs = normalizeSeries(series).filter((o) => o.value != null);
  const raw = [];

  let ath = 0;
  let athDate = null;
  let inBear = false;
  let troughVal = Infinity;
  let troughDate = null;

  for (let i = 0; i < obs.length; i++) {
    const { date, value } = obs[i];

    if (value > ath) {
      if (inBear) {
        // Bear market ended with recovery to new all-time high
        raw.push({ start: athDate, end: troughDate });
        inBear = false;
      }
      ath = value;
      athDate = date;
      troughVal = value;
      troughDate = date;
    } else {
      const dd = (value - ath) / ath;
      if (dd <= -0.20) {
        inBear = true;
      }
      if (inBear && value < troughVal) {
        troughVal = value;
        troughDate = date;
      }
    }
  }

  if (inBear && athDate) {
    // If still in bear market at end of series, end is null (or troughDate if completed)
    raw.push({ start: athDate, end: null });
  }

  return mergeEpisodes(raw);
}

/**
 * 3. JOBLESS JUMP: UNRATE rises ≥1.0 pt above its trailing 12-month low;
 * start = first month crossing; ends when gap < 0.5.
 * @param {any} series
 * @returns {{ start: string, end: string | null }[]}
 */
export function computeJoblessJump(series) {
  const obs = normalizeSeries(series).filter((o) => o.value != null);
  const raw = [];
  let inEpisode = false;
  let curStart = null;
  let curEnd = null;

  for (let i = 0; i < obs.length; i++) {
    let lo = Infinity;
    for (let j = Math.max(0, i - 11); j <= i; j++) {
      lo = Math.min(lo, obs[j].value);
    }
    const gap = obs[i].value - lo;

    if (!inEpisode) {
      if (gap >= 1.0) {
        inEpisode = true;
        curStart = obs[i].date;
        curEnd = obs[i].date;
      }
    } else {
      if (gap < 0.5) {
        raw.push({ start: curStart, end: curEnd });
        inEpisode = false;
        curStart = null;
        curEnd = null;
      } else {
        curEnd = obs[i].date;
      }
    }
  }

  if (inEpisode && curStart) {
    raw.push({ start: curStart, end: null }); // Ongoing
  }

  return mergeEpisodes(raw);
}

/**
 * 4. INFLATION SPIKES: CPI YoY > 5%; start = first month above 5; ends when back below 4.
 * Accepts either:
 * - Monthly CPI YoY series directly
 * - Nominal CPI series (will compute YoY internally if values look like price indices)
 * @param {any} series
 * @returns {{ start: string, end: string | null }[]}
 */
export function computeInflationSpikes(series) {
  let obs = normalizeSeries(series).filter((o) => o.value != null);
  if (obs.length === 0) return [];

  // If input looks like price index (e.g. values > 30), compute YoY %
  if (obs.some((o) => o.value > 30)) {
    const byKey = new Map(obs.map((o) => [o.date, o.value]));
    const derived = [];
    for (const o of obs) {
      const prevKey = addMonths(o.date, -12);
      const prev = byKey.get(prevKey);
      if (prev != null && prev > 0) {
        derived.push({ date: o.date, value: ((o.value - prev) / prev) * 100 });
      }
    }
    obs = derived;
  }

  const raw = [];
  let inEpisode = false;
  let curStart = null;
  let curEnd = null;

  for (let i = 0; i < obs.length; i++) {
    const { date, value } = obs[i];
    if (!inEpisode) {
      if (value > 5.0) {
        inEpisode = true;
        curStart = date;
        curEnd = date;
      }
    } else {
      if (value < 4.0) {
        raw.push({ start: curStart, end: curEnd });
        inEpisode = false;
        curStart = null;
        curEnd = null;
      } else {
        curEnd = date;
      }
    }
  }

  if (inEpisode && curStart) {
    raw.push({ start: curStart, end: null }); // Ongoing
  }

  return mergeEpisodes(raw);
}

/**
 * 5. HOUSING DROPS: Case-Shiller national (CSUSHPINSA) YoY < 0; start = first negative month; ends when ≥ 0.
 * Accepts either:
 * - Monthly Case-Shiller YoY series directly
 * - Nominal Case-Shiller index (will compute YoY internally if values look like index levels)
 * @param {any} series
 * @returns {{ start: string, end: string | null }[]}
 */
export function computeHousingDrops(series) {
  let obs = normalizeSeries(series).filter((o) => o.value != null);
  if (obs.length === 0) return [];

  // If input looks like index level (e.g. values > 30), compute YoY %
  if (obs.some((o) => o.value > 30)) {
    const byKey = new Map(obs.map((o) => [o.date, o.value]));
    const derived = [];
    for (const o of obs) {
      const prevKey = addMonths(o.date, -12);
      const prev = byKey.get(prevKey);
      if (prev != null && prev > 0) {
        derived.push({ date: o.date, value: ((o.value - prev) / prev) * 100 });
      }
    }
    obs = derived;
  }

  const raw = [];
  let inEpisode = false;
  let curStart = null;
  let curEnd = null;

  for (let i = 0; i < obs.length; i++) {
    const { date, value } = obs[i];
    if (!inEpisode) {
      if (value < 0) {
        inEpisode = true;
        curStart = date;
        curEnd = date;
      }
    } else {
      if (value >= 0) {
        raw.push({ start: curStart, end: curEnd });
        inEpisode = false;
        curStart = null;
        curEnd = null;
      } else {
        curEnd = date;
      }
    }
  }

  if (inEpisode && curStart) {
    raw.push({ start: curStart, end: null }); // Ongoing
  }

  return mergeEpisodes(raw);
}

/**
 * 6. FED CUTS: Fed funds falls ≥0.5 pt below its trailing 12-month max;
 * start = first month crossing; new episode only after the rate rises back
 * to within 0.25 of a new 12-mo max.
 * @param {any} series
 * @returns {{ start: string, end: string | null }[]}
 */
export function computeFedCuts(series) {
  const obs = normalizeSeries(series).filter((o) => o.value != null);
  const raw = [];

  let inEpisode = false;
  let curStart = null;
  let troughVal = Infinity;
  let troughDate = null;
  let canStartNew = true;

  for (let i = 0; i < obs.length; i++) {
    let hi = -Infinity;
    for (let j = Math.max(0, i - 11); j <= i; j++) {
      hi = Math.max(hi, obs[j].value);
    }
    const gap = hi - obs[i].value;

    if (!inEpisode && canStartNew) {
      if (gap >= 0.5) {
        inEpisode = true;
        curStart = obs[i].date;
        troughVal = obs[i].value;
        troughDate = obs[i].date;
        canStartNew = false;
      }
    } else if (inEpisode) {
      if (obs[i].value < troughVal) {
        troughVal = obs[i].value;
        troughDate = obs[i].date;
      }
      // Reset condition: rate rises back to within 0.25 of trailing 12-mo max
      if (gap <= 0.25 && obs[i].date > curStart) {
        raw.push({ start: curStart, end: troughDate });
        inEpisode = false;
        canStartNew = true;
      }
    }
  }

  if (inEpisode && curStart) {
    // Cycle is currently ongoing
    raw.push({ start: curStart, end: null });
  }

  return mergeEpisodes(raw);
}

/**
 * Compute target events for any target ID.
 * @param {import("./dashboard-types.js").TargetId} targetId
 * @param {any} series
 * @returns {{ start: string, end: string | null }[]}
 */
export function computeTargetEvents(targetId, series) {
  switch (targetId) {
    case "recession":
      return computeRecessions(series);
    case "bear":
      return computeBear(series);
    case "joblessjump":
      return computeJoblessJump(series);
    case "inflation":
      return computeInflationSpikes(series);
    case "housing":
      return computeHousingDrops(series);
    case "fedcuts":
      return computeFedCuts(series);
    default:
      throw new Error(`Unknown target id: ${targetId}`);
  }
}
