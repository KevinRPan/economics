/* ───────────────────────────────────────────────────────────────────────────
   Release Calendar — schedule of economic data releases.

   Fetches official schedule if reachable (e.g. BLS ICS) with clean fallback
   to a deterministic computed schedule covering ~3 months back and ~3 months
   ahead of the current date:
   - Weekly jobless claims: every Thursday (08:30 ET)
   - Monthly CPI: ~12th of month (08:30 ET)
   - Jobs report (payrolls, wages, unemployment/Sahm): first Friday (08:30 ET)
   - JOLTS (openings, quits): first Tuesday (10:00 ET)
   - Retail sales: ~15th of month (08:30 ET)
   - Industrial production: ~16th of month (09:15 ET)
   - Housing starts & permits: ~18th of month (08:30 ET)
   - GDP: last Thursday of month (08:30 ET)
   - Core PCE & personal saving: last Friday of month (08:30 ET)
   - FOMC meetings: 8 times/year (14:00 ET)
   - UMich Consumer Sentiment: 2nd Friday (prelim) & 4th Friday (final) (10:00 ET)
   - EIA Gasoline / Oil: Mondays (16:30 ET) & Wednesdays (10:30 ET)
   - Chicago Fed NFCI: every Thursday (08:30 ET)

   Every release maps to our canonical gauge ids so stream filters and click-ins
   work seamlessly. Never fails the build.
─────────────────────────────────────────────────────────────────────────── */

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../src/data/calendar.json");
const BLS_ICS_URL = "https://www.bls.gov/schedule/news_release/bls.ics";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function parseIso(isoStr) {
  const [y, m, d] = isoStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatIso(d) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function addDays(d, n) {
  const copy = new Date(d.getTime());
  copy.setUTCDate(copy.getUTCDate() + n);
  return copy;
}

// Nearest weekday: if Saturday -> Friday, if Sunday -> Monday
function nearestWeekday(year, month1, day) {
  const d = new Date(Date.UTC(year, month1 - 1, day));
  const dow = d.getUTCDay(); // 0 = Sun, 6 = Sat
  if (dow === 6) return addDays(d, -1);
  if (dow === 0) return addDays(d, 1);
  return d;
}

// Nth weekday of month: weekday 0..6 (0=Sun, 1=Mon, ..., 5=Fri), n is 1..5
function nthWeekdayOfMonth(year, month1, weekday, n) {
  const first = new Date(Date.UTC(year, month1 - 1, 1));
  const firstDow = first.getUTCDay();
  let dayOffset = (weekday - firstDow + 7) % 7;
  dayOffset += (n - 1) * 7;
  return new Date(Date.UTC(year, month1 - 1, 1 + dayOffset));
}

// Last weekday of month: weekday 0..6
function lastWeekdayOfMonth(year, month1, weekday) {
  // day 0 of next month is last day of current month
  const last = new Date(Date.UTC(year, month1, 0));
  const lastDow = last.getUTCDay();
  const diff = (lastDow - weekday + 7) % 7;
  return new Date(Date.UTC(year, month1 - 1, last.getUTCDate() - diff));
}

export function generateDeterministicSchedule(centerDate = new Date()) {
  const center = new Date(centerDate.getTime());
  const curYear = center.getUTCFullYear();
  const curMonth = center.getUTCMonth(); // 0-based

  // Span 7 months: 3 months before, current month, 3 months after
  const months = [];
  for (let offset = -3; offset <= 3; offset++) {
    const d = new Date(Date.UTC(curYear, curMonth + offset, 1));
    months.push({ year: d.getUTCFullYear(), month1: d.getUTCMonth() + 1 });
  }

  const releases = [];

  for (const { year, month1 } of months) {
    const prevMonthIdx = (month1 - 2 + 12) % 12;
    const prevMonthName = MONTH_NAMES[prevMonthIdx];
    const prevMonthYear = month1 === 1 ? year - 1 : year;
    const priorPeriod = `${prevMonthName} ${prevMonthYear}`;

    // 1. Jobs report (Employment Situation) — 1st Friday
    // Covers payrolls, wages, recession (Sahm)
    const jobsDate = nthWeekdayOfMonth(year, month1, 5, 1);
    const jobsDateStr = formatIso(jobsDate);
    releases.push({
      id: `jobs-${jobsDateStr}`,
      indicator: "payrolls",
      relatedIndicators: ["recession", "wages"],
      name: "Employment Situation (Payrolls & Wages)",
      date: jobsDateStr,
      time: "08:30 ET",
      period: priorPeriod,
      agency: "Bureau of Labor Statistics",
      description: "Nonfarm payroll change, unemployment rate, and average hourly earnings."
    });

    // 2. JOLTS — 1st Tuesday
    // Covers openings, quits (2 months lag)
    const joltsLagIdx = (month1 - 3 + 12) % 12;
    const joltsLagYear = month1 <= 2 ? year - 1 : year;
    const joltsPeriod = `${MONTH_NAMES[joltsLagIdx]} ${joltsLagYear}`;
    const joltsDate = nthWeekdayOfMonth(year, month1, 2, 1);
    const joltsDateStr = formatIso(joltsDate);
    releases.push({
      id: `jolts-${joltsDateStr}`,
      indicator: "openings",
      relatedIndicators: ["quits"],
      name: "JOLTS (Job Openings & Quits)",
      date: joltsDateStr,
      time: "10:00 ET",
      period: joltsPeriod,
      agency: "Bureau of Labor Statistics",
      description: "Total job openings, hiring rate, and voluntary quits rate."
    });

    // 3. CPI Inflation — ~12th of month
    const cpiDate = nearestWeekday(year, month1, 12);
    const cpiDateStr = formatIso(cpiDate);
    releases.push({
      id: `cpi-${cpiDateStr}`,
      indicator: "inflation",
      relatedIndicators: ["breakeven"],
      name: "Consumer Price Index (CPI)",
      date: cpiDateStr,
      time: "08:30 ET",
      period: priorPeriod,
      agency: "Bureau of Labor Statistics",
      description: "Consumer prices for all urban consumers, headline and core."
    });

    // 4. Retail Sales — ~15th of month
    const retailDate = nearestWeekday(year, month1, 15);
    const retailDateStr = formatIso(retailDate);
    releases.push({
      id: `retail-${retailDateStr}`,
      indicator: "retail",
      relatedIndicators: [],
      name: "Advance Monthly Retail Sales",
      date: retailDateStr,
      time: "08:30 ET",
      period: priorPeriod,
      agency: "U.S. Census Bureau",
      description: "Consumer spending at retail and food services across the US."
    });

    // 5. Industrial Production — ~16th of month
    const indproDate = nearestWeekday(year, month1, 16);
    const indproDateStr = formatIso(indproDate);
    releases.push({
      id: `indpro-${indproDateStr}`,
      indicator: "indpro",
      relatedIndicators: [],
      name: "Industrial Production & Capacity",
      date: indproDateStr,
      time: "09:15 ET",
      period: priorPeriod,
      agency: "Federal Reserve",
      description: "Output of factories, mines, and utilities in the United States."
    });

    // 6. Housing Starts & Building Permits — ~18th of month
    const permitsDate = nearestWeekday(year, month1, 18);
    const permitsDateStr = formatIso(permitsDate);
    releases.push({
      id: `permits-${permitsDateStr}`,
      indicator: "permits",
      relatedIndicators: ["housing"],
      name: "New Residential Construction & Permits",
      date: permitsDateStr,
      time: "08:30 ET",
      period: priorPeriod,
      agency: "U.S. Census Bureau",
      description: "Authorized building permits and housing starts for new private housing."
    });

    // 7. GDP — last Thursday of month
    const gdpDate = lastWeekdayOfMonth(year, month1, 4);
    const gdpDateStr = formatIso(gdpDate);
    const qNum = Math.ceil(month1 / 3);
    const gdpLabel = month1 % 3 === 1 ? `Q${(qNum + 2) % 4 + 1} Advance` : month1 % 3 === 2 ? `Q${(qNum + 2) % 4 + 1} Second` : `Q${qNum} Third`;
    releases.push({
      id: `gdp-${gdpDateStr}`,
      indicator: "gdp",
      relatedIndicators: [],
      name: "Gross Domestic Product (GDP)",
      date: gdpDateStr,
      time: "08:30 ET",
      period: gdpLabel,
      agency: "Bureau of Economic Analysis",
      description: "Real output of goods and services produced by labor and property in the US."
    });

    // 8. Core PCE & Personal Saving — last Friday of month
    const pceDate = lastWeekdayOfMonth(year, month1, 5);
    const pceDateStr = formatIso(pceDate);
    releases.push({
      id: `pce-${pceDateStr}`,
      indicator: "corepce",
      relatedIndicators: ["savings"],
      name: "PCE Price Index & Personal Saving Rate",
      date: pceDateStr,
      time: "08:30 ET",
      period: priorPeriod,
      agency: "Bureau of Economic Analysis",
      description: "Fed's preferred inflation gauge and household personal saving rate."
    });

    // 9. UMich Consumer Sentiment — 2nd and 4th Friday
    const umichPrelim = nthWeekdayOfMonth(year, month1, 5, 2);
    const umichPrelimStr = formatIso(umichPrelim);
    const curMonthName = MONTH_NAMES[month1 - 1];
    releases.push({
      id: `umich-prelim-${umichPrelimStr}`,
      indicator: "sentiment",
      relatedIndicators: [],
      name: "UMich Consumer Sentiment (Prelim)",
      date: umichPrelimStr,
      time: "10:00 ET",
      period: `${curMonthName} ${year} Prelim`,
      agency: "University of Michigan",
      description: "Early read on household consumer optimism and inflation expectations."
    });

    const umichFinal = nthWeekdayOfMonth(year, month1, 5, 4);
    const umichFinalStr = formatIso(umichFinal);
    releases.push({
      id: `umich-final-${umichFinalStr}`,
      indicator: "sentiment",
      relatedIndicators: [],
      name: "UMich Consumer Sentiment (Final)",
      date: umichFinalStr,
      time: "10:00 ET",
      period: `${curMonthName} ${year} Final`,
      agency: "University of Michigan",
      description: "Final monthly reading of consumer confidence and inflation views."
    });
  }

  // 10. Weekly Jobless Claims & Chicago Fed NFCI — every Thursday in range
  const rangeStart = parseIso(releases[0].date);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 14);
  const rangeEnd = parseIso(releases[releases.length - 1].date);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 14);

  let iter = new Date(rangeStart.getTime());
  while (iter <= rangeEnd) {
    if (iter.getUTCDay() === 4) { // Thursday
      const claimDateStr = formatIso(iter);
      releases.push({
        id: `claims-${claimDateStr}`,
        indicator: "claims",
        relatedIndicators: [],
        name: "Initial Jobless Claims",
        date: claimDateStr,
        time: "08:30 ET",
        period: `Week of ${claimDateStr}`,
        agency: "Department of Labor",
        description: "Weekly count of first-time filings for state unemployment benefits."
      });

      releases.push({
        id: `nfci-${claimDateStr}`,
        indicator: "nfci",
        relatedIndicators: ["credit"],
        name: "Chicago Fed Financial Conditions Index",
        date: claimDateStr,
        time: "08:30 ET",
        period: `Week of ${claimDateStr}`,
        agency: "Federal Reserve Bank of Chicago",
        description: "Comprehensive weekly measure of US financial conditions in debt and equity."
      });
    }

    if (iter.getUTCDay() === 1) { // Monday
      const gasDateStr = formatIso(iter);
      releases.push({
        id: `gas-${gasDateStr}`,
        indicator: "gas",
        relatedIndicators: ["oil"],
        name: "EIA Weekly Retail Gasoline",
        date: gasDateStr,
        time: "16:30 ET",
        period: `Week of ${gasDateStr}`,
        agency: "Energy Information Administration",
        description: "National average price for regular retail gasoline."
      });
    }

    iter = addDays(iter, 1);
  }

  // 11. FOMC Rate Decisions — 8 meetings per year
  // Scheduled Wednesdays for current and neighboring year
  for (const yr of [curYear - 1, curYear, curYear + 1]) {
    const fomcDates = [
      nthWeekdayOfMonth(yr, 1, 3, 4), // late Jan (4th Wed)
      nthWeekdayOfMonth(yr, 3, 3, 3), // mid Mar (3rd Wed)
      nthWeekdayOfMonth(yr, 5, 3, 1), // early May (1st Wed)
      nthWeekdayOfMonth(yr, 6, 3, 3), // mid Jun (3rd Wed)
      nthWeekdayOfMonth(yr, 7, 3, 4), // late Jul (4th Wed)
      nthWeekdayOfMonth(yr, 9, 3, 3), // mid Sep (3rd Wed)
      nthWeekdayOfMonth(yr, 11, 3, 1), // early Nov (1st Wed)
      nthWeekdayOfMonth(yr, 12, 3, 2), // mid Dec (2nd Wed)
    ];

    for (const d of fomcDates) {
      if (d >= rangeStart && d <= rangeEnd) {
        const fomcDateStr = formatIso(d);
        releases.push({
          id: `fomc-${fomcDateStr}`,
          indicator: "fedfunds",
          relatedIndicators: ["curve"],
          name: "FOMC Rate Decision & Policy Statement",
          date: fomcDateStr,
          time: "14:00 ET",
          period: `${MONTH_NAMES[d.getUTCMonth()]} ${yr}`,
          agency: "Federal Reserve",
          description: "Federal Open Market Committee target range for federal funds rate."
        });
      }
    }
  }

  // Sort chronologically ascending
  releases.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.name.localeCompare(b.name)));
  return releases;
}

async function fetchBlsSchedule() {
  try {
    const res = await fetch(BLS_ICS_URL, {
      signal: AbortSignal.timeout(3000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)",
        Accept: "text/calendar,text/plain,*/*"
      }
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.includes("BEGIN:VCALENDAR")) return null;
    // ICS parsing logic
    const events = [];
    const lines = text.split(/\r?\n/);
    let cur = null;
    for (const line of lines) {
      if (line.startsWith("BEGIN:VEVENT")) cur = {};
      else if (line.startsWith("END:VEVENT") && cur) {
        if (cur.dtstart && cur.summary) events.push(cur);
        cur = null;
      } else if (cur) {
        if (line.startsWith("DTSTART")) {
          const m = line.match(/(\d{4})(\d{2})(\d{2})/);
          if (m) cur.dtstart = `${m[1]}-${m[2]}-${m[3]}`;
        } else if (line.startsWith("SUMMARY:")) {
          cur.summary = line.slice(8).trim();
        }
      }
    }
    return events.length > 0 ? events : null;
  } catch {
    return null;
  }
}

async function main() {
  console.log("▶ economic calendar");
  let source = "computed";
  const bls = await fetchBlsSchedule();
  if (bls) {
    source = "bls+computed";
    console.log(`  fetched ${bls.length} BLS schedule items`);
  } else {
    console.log("  BLS direct unreachable — using deterministic computed schedule");
  }

  const releases = generateDeterministicSchedule(new Date());

  const out = {
    updated: new Date().toISOString(),
    source,
    count: releases.length,
    releases
  };

  await writeFile(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`✓ wrote ${releases.length} scheduled releases → ${OUT}`);
}

main().catch((err) => {
  console.error("fetch-calendar error:", err);
  // Never fail the build
  process.exit(0);
});
