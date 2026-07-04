/* ───────────────────────────────────────────────────────────────────────────
   Derivation helpers for the gauge data layer — pure functions so they can be
   unit-tested without touching FRED. Used by scripts/fetch-markets.mjs.
─────────────────────────────────────────────────────────────────────────── */

// Year-over-year percent change of a monthly [{date, value}] series.
// Matches each month against the same month one year earlier (by key, not by
// index) so gaps in the source series can't misalign the comparison.
export function yoyPct(monthly) {
  const byKey = new Map(monthly.map((o) => [o.date.slice(0, 7), o.value]));
  return monthly
    .map((o) => {
      const [y, m] = o.date.split("-").map(Number);
      const base = byKey.get(`${y - 1}-${String(m).padStart(2, "0")}`);
      return base ? { date: o.date, value: (o.value / base - 1) * 100 } : null;
    })
    .filter(Boolean);
}

// Join two monthly series as a ÷ b on the months both cover.
export function ratioSeries(a, b) {
  const bByKey = new Map(b.map((o) => [o.date.slice(0, 7), o.value]));
  return a
    .map((o) => {
      const d = bByKey.get(o.date.slice(0, 7));
      return d ? { date: o.date, value: o.value / d } : null;
    })
    .filter(Boolean);
}

// Standard 30-year fixed monthly principal + interest payment.
export function mortgageMonthly(principal, annualRatePct, months = 360) {
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

// Percentile rank (0–100, ties count half) of `v` within `values`.
export function percentileRank(values, v) {
  if (!values.length) return null;
  let below = 0;
  let ties = 0;
  for (const x of values) {
    if (x < v) below++;
    else if (x === v) ties++;
  }
  return Math.round(((below + ties / 2) / values.length) * 100);
}
