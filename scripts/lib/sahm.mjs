/* Sahm computation — ported exactly from the prototype's computeSahm.
   3-month moving average of the unemployment rate, minus the minimum of those
   3-month averages over the trailing 12 months. Trigger at ≥ 0.50. */

export function computeSahm(unrate) {
  const ma3 = unrate.map((_, i) =>
    i < 2 ? null : +((unrate[i] + unrate[i - 1] + unrate[i - 2]) / 3).toFixed(4)
  );
  return ma3.map((v, i) => {
    if (v == null) return null;
    let lo = Infinity;
    for (let j = Math.max(0, i - 11); j <= i; j++) if (ma3[j] != null) lo = Math.min(lo, ma3[j]);
    return +(v - lo).toFixed(2);
  });
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "YYYY-MM-DD" → "Mon YY"
export function monthLabel(isoDate) {
  const [y, m] = isoDate.split("-").map(Number);
  return `${MONTH_LABELS[m - 1]} ${String(y).slice(2)}`;
}
