/* ───────────────────────────────────────────────────────────────────────────
   Shared indicator data fetcher and derivation engine.
   Shared between scripts/fetch-markets.mjs and scripts/build-histories.mjs.
─────────────────────────────────────────────────────────────────────────── */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { toMonthly, toMonthlyAvg, forwardFill, monthKey } from "./series.mjs";
import { yoyPct, ratioSeries, mortgageMonthly, ma3OfChange } from "./derive.mjs";
import { computeSahm } from "./sahm.mjs";
import { GAUGES, pctOf } from "../../src/lib/gauges.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHILLER_FALLBACK = resolve(__dirname, "../../src/data/shiller-fallback.csv");
const SHILLER_URL = "https://raw.githubusercontent.com/datasets/s-and-p-500/main/data/data.csv";

const API_KEY = process.env.FRED_API_KEY;
const FRED_BASE = "https://api.stlouisfed.org/fred/series/observations";

export const INDICATOR_DECIMALS = {
  buffett: 0,
  vix: 1,
  credit: 2,
  curve: 2,
  inflation: 1,
  wages: 1,
  housing: 1,
  stress: 1,
  mood: 0,
  claims: 0,
  payrolls: 0,
  openings: 2,
  quits: 1,
  gdp: 1,
  indpro: 1,
  retail: 1,
  permits: 0,
  fedfunds: 2,
  corepce: 1,
  breakeven: 2,
  gas: 2,
  oil: 0,
  dollar: 1,
  savings: 1,
  sentiment: 0,
  nfci: 2,
  cape: 1,
  recession: 2,
};

export function getDecimals(id) {
  return GAUGES[id]?.decimals ?? INDICATOR_DECIMALS[id] ?? 2;
}

export function roundVal(id, v) {
  if (v == null || !Number.isFinite(v)) return null;
  const d = getDecimals(id);
  const p = 10 ** d;
  return Math.round(v * p) / p;
}

// ── In-memory FRED cache ───────────────────────────────────────────────────
const fredCache = new Map();

export async function fredObservations(seriesId) {
  if (fredCache.has(seriesId)) {
    return fredCache.get(seriesId);
  }

  let obs = [];

  if (API_KEY) {
    try {
      const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${API_KEY}&file_type=json`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        obs = (json.observations || [])
          .filter((o) => o.value !== ".")
          .map((o) => ({ date: o.date, value: +o.value }));
        if (obs.length > 0) {
          fredCache.set(seriesId, obs);
          return obs;
        }
      }
    } catch {
      // Fall through to public CSV
    }
  }

  // Fallback to FRED's public CSV endpoint
  const csvUrl = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(seriesId)}`;
  const res = await fetch(csvUrl, {
    headers: { "User-Agent": "econ.kpan.dev/1.0" },
  });
  if (!res.ok) throw new Error(`FRED CSV ${seriesId} → ${res.status} ${res.statusText}`);
  const text = await res.text();
  const lines = text.trim().split("\n");
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const [date, valStr] = line.split(",");
    if (valStr && valStr !== "." && Number.isFinite(+valStr)) {
      obs.push({ date, value: +valStr });
    }
  }
  if (obs.length === 0) throw new Error(`FRED CSV ${seriesId} yielded 0 observations`);

  fredCache.set(seriesId, obs);
  return obs;
}

// ── Shiller S&P 500 & CAPE ──────────────────────────────────────────────────
export async function fetchShillerData() {
  let csvText = null;
  let source = "remote";
  try {
    const res = await fetch(SHILLER_URL, {
      headers: { "User-Agent": "econ.kpan.dev/1.0" },
    });
    if (res.ok) {
      csvText = await res.text();
    }
  } catch {
    // Fall back to committed copy
  }

  if (!csvText) {
    source = "fallback";
    csvText = await readFile(SHILLER_FALLBACK, "utf8");
  }

  const lines = csvText.trim().split("\n");
  const sp500 = [];
  const cape = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(",");
    const date = parts[0];
    const spVal = +parts[1];
    const peVal = +parts[9];

    if (Number.isFinite(spVal) && spVal > 0) {
      sp500.push({ date, value: spVal });
    }
    // CAPE ends when PE10 is 0 or missing
    if (Number.isFinite(peVal) && peVal > 0) {
      cape.push({ date, value: peVal });
    }
  }

  // Check freshness and extend SP500 with FRED SP500 if available
  try {
    const fredSp = await fredObservations("SP500");
    const fredMonthly = toMonthly(fredSp);
    const lastShillerMonth = sp500[sp500.length - 1]?.date.slice(0, 7);
    for (const obs of fredMonthly) {
      const m = obs.date.slice(0, 7);
      if (m > lastShillerMonth) {
        sp500.push({ date: obs.date, value: obs.value });
      }
    }
  } catch {
    // Keep Shiller as is
  }

  return { sp500, cape, source };
}

// ── Seed values for offline / mock builds ──────────────────────────────────
export const SEED_READINGS = {
  // Existing 9
  buffett: { value: 225, prev: 221, start: 175 },
  vix: { value: 16.5, prev: 15.2, start: 19 },
  credit: { value: 3.2, prev: 3.05, start: 4.6 },
  curve: { value: 0.55, prev: 0.4, start: -1.1 },
  inflation: { value: 2.7, prev: 2.9, start: 3.7 },
  wages: { value: 1.0, prev: 0.8, start: -0.4 },
  housing: { value: 31.8, prev: 31.9, start: 29.2 },
  stress: { value: 3.2, prev: 3.1, start: 2.6 },
  mood: { value: 72, prev: 69, start: 48 },
  // New 18
  claims: { value: 220, prev: 225, start: 215 },
  payrolls: { value: 165, prev: 180, start: 220 },
  openings: { value: 1.15, prev: 1.20, start: 1.55 },
  quits: { value: 2.1, prev: 2.1, start: 2.4 },
  gdp: { value: 2.8, prev: 3.0, start: 2.1 },
  indpro: { value: 1.1, prev: 0.8, start: 0.2 },
  retail: { value: 0.9, prev: 0.5, start: -0.4 },
  permits: { value: 1475, prev: 1450, start: 1520 },
  fedfunds: { value: 4.83, prev: 5.33, start: 5.33 },
  corepce: { value: 2.7, prev: 2.8, start: 3.5 },
  breakeven: { value: 2.28, prev: 2.25, start: 2.35 },
  gas: { value: 3.20, prev: 3.35, start: 3.65 },
  oil: { value: 72.5, prev: 74.0, start: 82.0 },
  dollar: { value: -0.8, prev: 1.2, start: 2.5 },
  savings: { value: 4.6, prev: 4.8, start: 4.2 },
  sentiment: { value: 68.9, prev: 67.5, start: 63.0 },
  nfci: { value: -0.55, prev: -0.52, start: -0.40 },
  cape: { value: 34.2, prev: 33.8, start: 29.5 },
  // Plus recession Sahm
  recession: { value: 0.43, prev: 0.43, start: 0.15 },
};

// ── Compute all indicators (live or seed) ───────────────────────────────────
export async function computeAllIndicators() {
  const monthly = {}; // indicator id → [{ date: "YYYY-MM-DD", value: number }]
  const targetSeries = {}; // target id → [{ date: "YYYY-MM", value: number }]

  // 1. Shiller data (CAPE + SP500 for bear target)
  const shiller = await fetchShillerData();
  monthly.cape = shiller.cape;
  targetSeries.bear = shiller.sp500;

  // 2. Simple level series from FRED
  const simpleFred = [
    ["vix", "VIXCLS"],
    ["credit", "BAMLH0A0HYM2"],
    ["curve", "T10Y3M"],
    ["stress", "DRCCLACBS"],
    ["quits", "JTSQUR"],
    ["permits", "PERMIT"],
    ["fedfunds", "FEDFUNDS"],
    ["breakeven", "T10YIE"],
    ["oil", "DCOILWTICO"],
    ["savings", "PSAVERT"],
    ["sentiment", "UMCSENT"],
    ["nfci", "NFCI"],
  ];
  for (const [id, code] of simpleFred) {
    try {
      monthly[id] = toMonthly(await fredObservations(code));
    } catch (err) {
      console.error(`  ✗ ${id} (${code}): ${err.message}`);
    }
  }

  // Also feed target_fedcuts from fedfunds
  if (monthly.fedfunds) {
    targetSeries.fedcuts = monthly.fedfunds;
  }

  // 3. Weekly series averaged to monthly
  try {
    const claimsRaw = toMonthlyAvg(await fredObservations("ICSA"));
    // ICSA on FRED is in exact counts (e.g. 210,000); scale to thousands
    monthly.claims = claimsRaw.map((o) => ({ date: o.date, value: o.value / 1000 }));
  } catch (err) {
    console.error(`  ✗ claims (ICSA): ${err.message}`);
  }

  try {
    monthly.gas = toMonthlyAvg(await fredObservations("GASREGW"));
  } catch (err) {
    console.error(`  ✗ gas (GASREGW): ${err.message}`);
  }

  // 4. CPI feeds inflation, wages, retail, and inflation target
  let cpi = null;
  try {
    cpi = toMonthly(await fredObservations("CPIAUCSL"));
    monthly.inflation = yoyPct(cpi);
    targetSeries.inflation = monthly.inflation;
  } catch (err) {
    console.error(`  ✗ inflation (CPIAUCSL): ${err.message}`);
  }

  // 5. Wages: AHETPI ÷ CPIAUCSL YoY
  if (cpi) {
    try {
      const ahe = toMonthly(await fredObservations("AHETPI"));
      monthly.wages = yoyPct(ratioSeries(ahe, cpi));
    } catch (err) {
      console.error(`  ✗ wages (AHETPI ÷ CPIAUCSL): ${err.message}`);
    }
  }

  // 6. Retail: RSAFS ÷ CPIAUCSL YoY
  if (cpi) {
    try {
      const rsafs = toMonthly(await fredObservations("RSAFS"));
      monthly.retail = yoyPct(ratioSeries(rsafs, cpi));
    } catch (err) {
      console.error(`  ✗ retail (RSAFS ÷ CPIAUCSL): ${err.message}`);
    }
  }

  // 7. Payrolls: 3-month avg of monthly change of PAYEMS
  try {
    const payems = toMonthly(await fredObservations("PAYEMS"));
    monthly.payrolls = ma3OfChange(payems);
  } catch (err) {
    console.error(`  ✗ payrolls (PAYEMS): ${err.message}`);
  }

  // 8. Openings: JTSJOL ÷ UNEMPLOY
  try {
    const openings = toMonthly(await fredObservations("JTSJOL"));
    const unemployed = toMonthly(await fredObservations("UNEMPLOY"));
    monthly.openings = ratioSeries(openings, unemployed);
  } catch (err) {
    console.error(`  ✗ openings (JTSJOL ÷ UNEMPLOY): ${err.message}`);
  }

  // 9. Core PCE YoY %
  try {
    const corepce = toMonthly(await fredObservations("PCEPILFE"));
    monthly.corepce = yoyPct(corepce);
  } catch (err) {
    console.error(`  ✗ corepce (PCEPILFE): ${err.message}`);
  }

  // 10. Broad dollar index YoY %
  try {
    const dollar = toMonthly(await fredObservations("DTWEXBGS"));
    monthly.dollar = yoyPct(dollar);
  } catch (err) {
    console.error(`  ✗ dollar (DTWEXBGS): ${err.message}`);
  }

  // 11. Industrial production YoY %
  try {
    const indpro = toMonthly(await fredObservations("INDPRO"));
    monthly.indpro = yoyPct(indpro);
  } catch (err) {
    console.error(`  ✗ indpro (INDPRO): ${err.message}`);
  }

  // 12. Real GDP YoY % forward-filled
  try {
    const gdpQuarterly = toMonthly(await fredObservations("GDPC1"));
    const gdpYoY = yoyPct(gdpQuarterly);
    // Grid = months covered by industrial production or inflation
    const grid = monthly.indpro || monthly.inflation || gdpQuarterly;
    const filledMap = forwardFill(grid, gdpYoY);
    monthly.gdp = grid
      .map((g) => {
        const k = monthKey(g.date);
        const val = filledMap.get(k);
        return val != null ? { date: g.date, value: val } : null;
      })
      .filter(Boolean);
  } catch (err) {
    console.error(`  ✗ gdp (GDPC1): ${err.message}`);
  }

  // 13. Buffett indicator: NCBEILQ027S ÷ GDP * 100
  try {
    const equities = toMonthly(await fredObservations("NCBEILQ027S"));
    const gdpNominal = toMonthly(await fredObservations("GDP"));
    const gdpByMonth = forwardFill(equities, gdpNominal);
    monthly.buffett = equities
      .map((e) => {
        const g = gdpByMonth.get(monthKey(e.date));
        return g ? { date: e.date, value: (e.value / 1000 / g) * 100 } : null;
      })
      .filter(Boolean);
  } catch (err) {
    console.error(`  ✗ buffett (NCBEILQ027S ÷ GDP): ${err.message}`);
  }

  // 14. Housing affordability: 30-yr payment on median home
  try {
    const rate = toMonthly(await fredObservations("MORTGAGE30US"));
    const price = toMonthly(await fredObservations("MSPUS"));
    const income = toMonthly(await fredObservations("MEHOINUSA646N"));
    const priceBy = forwardFill(rate, price);
    const incomeBy = forwardFill(rate, income);
    monthly.housing = rate
      .map((o) => {
        const p = priceBy.get(monthKey(o.date));
        const inc = incomeBy.get(monthKey(o.date));
        if (!p || !inc) return null;
        const payment = mortgageMonthly(p * 0.8, o.value);
        return { date: o.date, value: (payment / (inc / 12)) * 100 };
      })
      .filter(Boolean);
  } catch (err) {
    console.error(`  ✗ housing: ${err.message}`);
  }

  // 15. Market mood composite
  if (monthly.buffett && monthly.vix && monthly.credit && GAUGES.buffett && GAUGES.vix && GAUGES.credit) {
    const buffettBy = forwardFill(monthly.vix, monthly.buffett);
    const creditBy = forwardFill(monthly.vix, monthly.credit);
    monthly.mood = monthly.vix
      .map((o) => {
        const k = monthKey(o.date);
        const b = buffettBy.get(k);
        const c = creditBy.get(k);
        if (b == null || c == null) return null;
        const score =
          (pctOf(GAUGES.buffett, b) + (100 - pctOf(GAUGES.vix, o.value)) + (100 - pctOf(GAUGES.credit, c))) / 3;
        return { date: o.date, value: score };
      })
      .filter(Boolean);
  }

  // 16. Unemployment rate (UNRATE) → "recession" Sahm indicator & joblessjump target
  try {
    const unrate = toMonthly(await fredObservations("UNRATE"));
    targetSeries.joblessjump = unrate;
    const rates = unrate.map((o) => o.value);
    const sahmVals = computeSahm(rates);
    monthly.recession = unrate
      .map((o, i) => (sahmVals[i] != null ? { date: o.date, value: sahmVals[i] } : null))
      .filter(Boolean);
  } catch (err) {
    console.error(`  ✗ UNRATE (recession & joblessjump): ${err.message}`);
  }

  // 17. Target-only series: USREC (recessions)
  try {
    const usrec = toMonthly(await fredObservations("USREC"));
    targetSeries.recession = usrec;
  } catch (err) {
    console.error(`  ✗ USREC (recession target): ${err.message}`);
  }

  // 18. Target-only series: CSUSHPINSA (housing price drops)
  try {
    const csHomePrice = toMonthly(await fredObservations("CSUSHPINSA"));
    targetSeries.housing = yoyPct(csHomePrice);
  } catch (err) {
    console.error(`  ✗ CSUSHPINSA (housing target): ${err.message}`);
  }

  // Determine latest through date
  let through = "2000-01";
  for (const s of Object.values(monthly)) {
    if (s?.length) {
      const lastDate = s[s.length - 1].date.slice(0, 7);
      if (lastDate > through) through = lastDate;
    }
  }

  return { monthly, targetSeries, through, live: true };
}
