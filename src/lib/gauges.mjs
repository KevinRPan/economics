/* ───────────────────────────────────────────────────────────────────────────
   Shared "market gauge" logic — tokens, band machine, verdict copy, and the
   config for each hype/mania/greed card. Plain .mjs so both the React island
   (TS) and the build-time OG script (Node) import the exact same definitions
   and render identical verdicts.

   Each gauge is one *derived* market metric with a banded scale (calm → mania),
   a key reference line, and honest per-band copy. The three v1 gauges are all
   FRED-native, so they reuse the same build-time fetch + seed fallback as the
   recession card — no runtime calls, no client-exposed key.
─────────────────────────────────────────────────────────────────────────── */

// Card palette — shared with the recession card so the feed feels like one site,
// plus a cool/blue accent for the "fear / cheap" end of two-sided gauges.
export const C = {
  panel: "#0E1A1C",
  raised: "#13262A",
  line: "#27413F",
  text: "#EAF2F0",
  muted: "#86A39F",
  faint: "#5C7C79",
  green: "#4FD1A8",
  amber: "#F2B544",
  red: "#FF6B5E",
  cool: "#5BA8D0",
  backdrop: "#081113",
};

const EPS = 0.005; // dead-band so tiny wiggles don't read as "rising"/"cooling"

// Find the band a value falls into (bands ordered low → high by `upTo`).
export function bandFor(gauge, value) {
  return gauge.bands.find((b) => value < b.upTo) ?? gauge.bands[gauge.bands.length - 1];
}

// status × direction → honest copy, driven by each gauge's `heads`/`subs`.
export function gaugeVerdict(gauge, value, prev) {
  const band = bandFor(gauge, value);
  const rising = value > prev + EPS;
  const cooling = value < prev - EPS;
  const dir = rising ? "rising" : cooling ? "cooling" : "flat";
  return {
    key: band.key,
    label: band.label,
    accent: band.accent,
    head: gauge.heads[band.key],
    sub: gauge.subs[dir],
    rising,
    cooling,
    band,
  };
}

// Position of a value on the 0–100 rail (clamped so the marker stays on track).
export function markerPct(gauge, value) {
  const { scaleMin, scaleMax } = gauge;
  const pct = ((value - scaleMin) / (scaleMax - scaleMin)) * 100;
  return Math.max(2, Math.min(98, pct));
}
export function pctOf(gauge, value) {
  const { scaleMin, scaleMax } = gauge;
  return Math.max(0, Math.min(100, ((value - scaleMin) / (scaleMax - scaleMin)) * 100));
}

// Coloured segments for the multi-band rail (start%→end% with each band accent).
export function bandSegments(gauge) {
  let lo = gauge.scaleMin;
  return gauge.bands.map((b) => {
    const hi = Math.min(b.upTo, gauge.scaleMax);
    const seg = { accent: b.accent, start: pctOf(gauge, lo), end: pctOf(gauge, hi) };
    lo = hi;
    return seg;
  });
}

export function fmt(gauge, value) {
  return value.toFixed(gauge.decimals) + (gauge.suffix ?? "");
}

// ── Gauge definitions ────────────────────────────────────────────────────────
// `series` numerator/denominator FRED ids + transform live in the fetch script;
// here we keep everything the card + OG image need to render and explain.

export const GAUGES = {
  // 1) Buffett Indicator — total US corporate equities (Fed Z.1) ÷ GDP.
  buffett: {
    id: "buffett",
    slug: "buffett",
    eyebrow: "Buffett Indicator · Market Cap ÷ GDP",
    headline: "Are stocks in a bubble?",
    short: "Buffett Indicator",
    decimals: 0,
    suffix: "%",
    scaleMin: 80,
    scaleMax: 260,
    keyLine: { value: 185, label: "FROTHY 185%" },
    chart: { domain: [80, 260], ticks: [120, 185, 260], refLabel: "185% frothy" },
    bands: [
      { upTo: 110, key: "cheap", label: "Undervalued", accent: C.cool },
      { upTo: 150, key: "fair", label: "Fair", accent: C.green },
      { upTo: 185, key: "elevated", label: "Elevated", accent: C.amber },
      { upTo: 220, key: "frothy", label: "Frothy", accent: C.amber },
      { upTo: Infinity, key: "mania", label: "Mania", accent: C.red },
    ],
    heads: {
      cheap: "Stocks look cheap vs the economy.",
      fair: "Valuations are in a normal range.",
      elevated: "Stocks are running ahead of the economy.",
      frothy: "This is froth — stocks are pricey vs GDP.",
      mania: "Mania territory — stocks dwarf the economy.",
    },
    subs: {
      rising: "And still climbing.",
      cooling: "But cooling off.",
      flat: "Holding around here.",
    },
    takeaway(v) {
      const d = Math.round(v - this.keyLine.value);
      return d >= 0
        ? `${Math.round(v)}% of GDP — ${d} pts above the frothy line.`
        : `${Math.round(v)}% of GDP — ${Math.abs(d)} pts below the frothy line.`;
    },
    method: {
      blurb:
        "The Buffett Indicator compares the total value of US stocks to the size of the economy (GDP). Warren Buffett once called market value ÷ GDP 'probably the best single measure of where valuations stand.' Above ~100% means stocks are worth more than a year of national output — and today's market sits far higher.",
      bullets: [
        "It's a valuation gauge, not a timer — markets can stay 'expensive' for years.",
        "Modern readings run structurally higher than last century (more global, higher-margin firms).",
        "Equities = total US corporate equities from the Fed's Z.1 accounts; GDP is quarterly, forward-filled.",
      ],
      footnote: "equities = FRED NCBEILQ027S (Fed Z.1) · GDP = FRED GDP",
    },
  },

  // 2) VIX — the options-market "fear gauge". Low = complacency/greed, high = fear.
  vix: {
    id: "vix",
    slug: "vix",
    eyebrow: "VIX · The Fear Gauge",
    headline: "Is the market too calm?",
    short: "VIX fear gauge",
    decimals: 1,
    suffix: "",
    scaleMin: 8,
    scaleMax: 45,
    keyLine: { value: 20, label: "AVG ~20" },
    chart: { domain: [8, 45], ticks: [10, 20, 35], refLabel: "~20 long-run avg" },
    bands: [
      { upTo: 13, key: "complacent", label: "Complacency", accent: C.amber },
      { upTo: 17, key: "calm", label: "Calm", accent: C.green },
      { upTo: 22, key: "normal", label: "Normal", accent: C.green },
      { upTo: 30, key: "anxious", label: "Anxious", accent: C.amber },
      { upTo: Infinity, key: "fear", label: "Fear", accent: C.red },
    ],
    heads: {
      complacent: "Unusually calm — maybe too calm.",
      calm: "Calm waters. Little fear priced in.",
      normal: "Volatility is about average.",
      anxious: "Nerves are starting to show.",
      fear: "Fear is spiking.",
    },
    subs: {
      rising: "Volatility is climbing.",
      cooling: "And it's settling down.",
      flat: "Holding steady.",
    },
    takeaway(v) {
      const d = +(v - this.keyLine.value).toFixed(1);
      return d <= 0
        ? `VIX ${v.toFixed(1)} — ${Math.abs(d).toFixed(1)} below its long-run average. Calm.`
        : `VIX ${v.toFixed(1)} — ${d.toFixed(1)} above its long-run average. Jittery.`;
    },
    method: {
      blurb:
        "The VIX is the market's expected volatility over the next 30 days, read off S&P 500 options. Traders call it the 'fear gauge': it spikes when investors scramble for protection and sinks when they're complacent. A persistently low VIX often means greed — risk feels free, until it isn't.",
      bullets: [
        "Low VIX = complacency, not safety — calm stretches can precede sharp shocks.",
        "It measures expected swings, not direction; it says nothing about whether stocks rise or fall.",
        "~20 is the rough long-run average; sub-13 is historically very calm, 30+ is real fear.",
      ],
      footnote: "FRED VIXCLS (CBOE Volatility Index, daily close)",
    },
  },

  // 3) High-yield credit spread — the bond market's "smart money" greed gauge.
  credit: {
    id: "credit",
    slug: "credit",
    eyebrow: "High-Yield Spread · Risk Appetite",
    headline: "Is the bond market greedy?",
    short: "Credit-spread gauge",
    decimals: 2,
    suffix: "%",
    scaleMin: 2,
    scaleMax: 12,
    keyLine: { value: 5, label: "NORM ~5%" },
    chart: { domain: [2, 12], ticks: [3, 5, 9], refLabel: "~5% long-run norm" },
    bands: [
      { upTo: 3.0, key: "reaching", label: "Reaching for yield", accent: C.amber },
      { upTo: 4.0, key: "riskon", label: "Risk-on", accent: C.green },
      { upTo: 5.5, key: "normal", label: "Normal", accent: C.green },
      { upTo: 8.0, key: "cautious", label: "Cautious", accent: C.amber },
      { upTo: Infinity, key: "stress", label: "Stress", accent: C.red },
    ],
    heads: {
      reaching: "Investors are barely paid to take risk — peak greed.",
      riskon: "Appetite for risk is healthy.",
      normal: "Spreads are around their long-run norm.",
      cautious: "The bond market is getting picky.",
      stress: "Credit stress — lenders want a big premium.",
    },
    subs: {
      rising: "Spreads are widening (less greedy).",
      cooling: "Spreads are tightening (greedier).",
      flat: "Holding around here.",
    },
    takeaway(v) {
      const d = +(v - this.keyLine.value).toFixed(2);
      return d <= 0
        ? `${v.toFixed(2)}% spread — ${Math.abs(d).toFixed(2)} pts tighter than the 5% norm. Risk-on.`
        : `${v.toFixed(2)}% spread — ${d.toFixed(2)} pts wider than the 5% norm. Cautious.`;
    },
    method: {
      blurb:
        "This is the extra yield investors demand to hold junk-rated US corporate bonds over Treasuries. Tight spreads mean lenders are happy to fund risky borrowers cheaply — a classic sign of greed and risk appetite. Spreads blow out when fear takes over and credit dries up.",
      bullets: [
        "Often called 'smart money' — credit markets tend to wobble before stocks do.",
        "Very tight spreads (sub-3%) mean investors are reaching for yield with little cushion.",
        "~5% is roughly the long-run median; 8%+ signals genuine credit stress.",
      ],
      footnote: "FRED BAMLH0A0HYM2 (ICE BofA US High Yield OAS)",
    },
  },
};

export const GAUGE_LIST = Object.values(GAUGES);
