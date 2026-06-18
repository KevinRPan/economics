/* ───────────────────────────────────────────────────────────────────────────
   Series helpers for the market-gauge data layer.

   FRED market series are daily (VIX, credit spread) or quarterly (GDP), so we
   downsample to one point per month and forward-fill lower-frequency series
   onto a monthly grid. Keeps the deep-dive chart light and aligns the Buffett
   ratio (daily index ÷ quarterly GDP) onto a common timeline.
─────────────────────────────────────────────────────────────────────────── */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function monthKey(date) {
  return date.slice(0, 7); // "YYYY-MM"
}
export function monthLabel(date) {
  const [y, m] = date.split("-").map(Number);
  return `${MONTHS[m - 1]} ${String(y).slice(2)}`;
}

// Collapse [{date, value}] (chronological) to the last observation of each month.
export function toMonthly(obs) {
  const byMonth = new Map();
  for (const o of obs) byMonth.set(monthKey(o.date), o); // later obs overwrites → last wins
  return [...byMonth.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// Forward-fill a (sparse) monthly series onto the months present in `grid`.
// Returns a Map<monthKey, value> carrying the most recent prior value forward.
export function forwardFill(grid, monthly) {
  const sorted = [...monthly].sort((a, b) => a.date.localeCompare(b.date));
  const out = new Map();
  let i = 0;
  let cur = null;
  for (const g of grid) {
    const k = monthKey(g.date);
    while (i < sorted.length && monthKey(sorted[i].date) <= k) cur = sorted[i++].value;
    if (cur != null) out.set(k, cur);
  }
  return out;
}
