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

// Historical-context line: where today's reading sits in the metric's full
// FRED history. Null when the reading has no percentile (seed data).
export function pctileLine(r) {
  if (r == null || r.pctile == null || r.sinceYear == null) return null;
  return r.pctile >= 50
    ? `Higher than ${r.pctile}% of all readings since ${r.sinceYear}.`
    : `Lower than ${100 - r.pctile}% of all readings since ${r.sinceYear}.`;
}

// ── Gauge definitions ────────────────────────────────────────────────────────
// `series` numerator/denominator FRED ids + transform live in the fetch script;
// here we keep everything the card + OG image need to render and explain.

export const GAUGES = {
  // ── The economy ────────────────────────────────────────────────────────────

  // 1) Yield curve — 10-year minus 3-month Treasury spread. Inversion is the
  //    classic forward recession signal (pairs with the Sahm nowcast card).
  curve: {
    id: "curve",
    slug: "curve",
    group: "economy",
    eyebrow: "Yield Curve · 10-Year minus 3-Month",
    headline: "Is a recession being predicted?",
    short: "Yield-curve gauge",
    decimals: 2,
    suffix: "%",
    scaleMin: -2,
    scaleMax: 4,
    keyLine: { value: 0, label: "0 = INVERTED" },
    chart: { domain: [-2, 4], ticks: [-1, 0, 2], refLabel: "0 — inversion line" },
    bands: [
      { upTo: -0.5, key: "deep", label: "Deeply inverted", accent: C.red },
      { upTo: 0, key: "inverted", label: "Inverted", accent: C.red },
      { upTo: 0.75, key: "flat", label: "Flat", accent: C.amber },
      { upTo: 2, key: "normal", label: "Normal", accent: C.green },
      { upTo: Infinity, key: "steep", label: "Steep", accent: C.green },
    ],
    heads: {
      deep: "Deeply inverted — a strong historical warning.",
      inverted: "Inverted — the classic recession signal is on.",
      flat: "Flat — no clear signal either way.",
      normal: "A normal upward slope. No warning here.",
      steep: "Steep — the curve looks early-cycle.",
    },
    subs: {
      rising: "And steepening.",
      cooling: "And flattening.",
      flat: "Holding around here.",
    },
    takeaway(v) {
      const a = Math.abs(v).toFixed(2);
      return v < 0
        ? `10-yr yields ${a} pts below 3-mo bills — the curve is inverted.`
        : `10-yr yields ${a} pts above 3-mo bills — no inversion warning.`;
    },
    method: {
      blurb:
        "Normally, lending to the government for 10 years pays more than lending for 3 months. When that flips — short rates above long — the curve is 'inverted': bond investors expect rate cuts ahead, which usually means a downturn. An inverted curve has preceded every US recession since the late 1960s.",
      bullets: [
        "It's a warning, not a timer — recessions typically follow 6–18 months later, with wide misses.",
        "Un-inverting isn't the all-clear: the curve often normalizes just before the downturn arrives.",
        "Roughly one false alarm in ~60 years — still the best-known forward signal there is.",
      ],
      footnote: "FRED T10Y3M (10-year minus 3-month Treasury yield)",
    },
  },

  // 2) CPI inflation — consumer prices vs a year ago, against the 2% target.
  inflation: {
    id: "inflation",
    slug: "inflation",
    group: "economy",
    eyebrow: "CPI Inflation · Prices vs a Year Ago",
    headline: "Is inflation under control?",
    short: "Inflation gauge",
    decimals: 1,
    suffix: "%",
    scaleMin: -2,
    scaleMax: 10,
    keyLine: { value: 2, label: "TARGET 2%" },
    chart: { domain: [-2, 10], ticks: [0, 2, 6], refLabel: "2% target" },
    bands: [
      { upTo: 0, key: "deflation", label: "Deflation", accent: C.cool },
      { upTo: 2, key: "below", label: "Below target", accent: C.green },
      { upTo: 3, key: "target", label: "Near target", accent: C.green },
      { upTo: 5, key: "elevated", label: "Elevated", accent: C.amber },
      { upTo: Infinity, key: "high", label: "Far above target", accent: C.red },
    ],
    heads: {
      deflation: "Prices are falling — rare, and rarely good news.",
      below: "Inflation is running below the Fed's target.",
      target: "Inflation is close to the 2% target.",
      elevated: "Inflation is running above target.",
      high: "Inflation is far above target.",
    },
    subs: {
      rising: "And ticking up.",
      cooling: "And easing.",
      flat: "Holding around here.",
    },
    takeaway(v) {
      const d = Math.abs(v - 2).toFixed(1);
      return v >= 2
        ? `${v.toFixed(1)}% — ${d} pts above the Fed's 2% goal.`
        : `${v.toFixed(1)}% — ${d} pts below the Fed's 2% goal.`;
    },
    method: {
      blurb:
        "This is CPI inflation: how much consumer prices rose versus a year ago. The Fed aims for about 2% — enough to grease the economy without eating paychecks. Above roughly 4%, inflation starts dominating household budgets and Fed policy.",
      bullets: [
        "The Fed's official 2% target uses a related gauge (PCE) that usually runs a bit cooler than CPI.",
        "The yearly rate hides momentum — one hot month shows up here for a full year.",
        "Falling inflation means prices rise more slowly — it doesn't mean prices fall.",
      ],
      footnote: "FRED CPIAUCSL (CPI, all urban consumers), year-over-year",
    },
  },

  // 3) Real wages — average hourly pay for rank-and-file workers, deflated by
  //    CPI, year over year. Positive = paychecks beating prices.
  wages: {
    id: "wages",
    slug: "wages",
    group: "economy",
    eyebrow: "Real Wages · Pay vs Prices",
    headline: "Are paychecks beating inflation?",
    short: "Real-wage gauge",
    decimals: 1,
    suffix: "%",
    scaleMin: -4,
    scaleMax: 4,
    keyLine: { value: 0, label: "BREAK-EVEN 0" },
    chart: { domain: [-4, 4], ticks: [-2, 0, 2], refLabel: "0 — break-even" },
    bands: [
      { upTo: -1.5, key: "falling", label: "Falling behind", accent: C.red },
      { upTo: 0, key: "slipping", label: "Slipping", accent: C.amber },
      { upTo: 1, key: "holding", label: "Holding even", accent: C.green },
      { upTo: 2.5, key: "gaining", label: "Gaining", accent: C.green },
      { upTo: Infinity, key: "surging", label: "Surging", accent: C.cool },
    ],
    heads: {
      falling: "Paychecks are losing to inflation.",
      slipping: "Pay is just barely trailing prices.",
      holding: "Pay is roughly keeping up with prices.",
      gaining: "Paychecks are outrunning inflation.",
      surging: "Real pay is growing unusually fast.",
    },
    subs: {
      rising: "And the trend is improving.",
      cooling: "But the trend is fading.",
      flat: "Holding steady.",
    },
    takeaway(v) {
      const a = Math.abs(v).toFixed(1);
      return v >= 0
        ? `Real pay is up ${a}% in a year — ahead of prices.`
        : `Real pay is down ${a}% in a year — behind prices.`;
    },
    method: {
      blurb:
        "This takes the average hourly wage of rank-and-file workers and strips out inflation. Positive means the typical paycheck buys more than a year ago; negative means prices are winning. It's the cleanest single read on whether workers are getting ahead.",
      bullets: [
        "It's an average, not a median — big swings at the top can move it.",
        "Covers production and nonsupervisory workers — about 80% of private employment.",
        "Hiring and layoff waves shift who's counted, which can nudge it at turning points.",
      ],
      footnote: "FRED AHETPI ÷ CPIAUCSL, year-over-year",
    },
  },

  // 4) Housing affordability — est. mortgage payment on the median-priced US
  //    home as a share of median household income, vs the 30% burden rule.
  housing: {
    id: "housing",
    slug: "housing",
    group: "economy",
    eyebrow: "Housing Affordability · Payment vs Paycheck",
    headline: "Is the typical house affordable?",
    short: "Housing-affordability gauge",
    decimals: 1,
    suffix: "%",
    scaleMin: 10,
    scaleMax: 50,
    keyLine: { value: 30, label: "BURDEN 30%" },
    chart: { domain: [10, 50], ticks: [20, 30, 40], refLabel: "30% cost-burdened line" },
    bands: [
      { upTo: 20, key: "affordable", label: "Affordable", accent: C.green },
      { upTo: 25, key: "manageable", label: "Manageable", accent: C.green },
      { upTo: 30, key: "stretched", label: "Stretched", accent: C.amber },
      { upTo: 38, key: "burdened", label: "Cost-burdened", accent: C.red },
      { upTo: Infinity, key: "extreme", label: "Extreme", accent: C.red },
    ],
    heads: {
      affordable: "A median house fits easily in a median budget.",
      manageable: "Housing takes a manageable share of pay.",
      stretched: "Buyers are stretching past comfort.",
      burdened: "The median home breaks the 30% rule.",
      extreme: "House payments overwhelm the median paycheck.",
    },
    subs: {
      rising: "Payments are taking a bigger bite.",
      cooling: "The bite is easing.",
      flat: "Holding around here.",
    },
    takeaway(v) {
      const d = Math.abs(v - 30).toFixed(1);
      return v >= 30
        ? `${v.toFixed(1)}% of income for the median home — ${d} pts past the 30% line.`
        : `${v.toFixed(1)}% of income for the median home — under the 30% line.`;
    },
    method: {
      blurb:
        "This estimates the monthly mortgage payment on the median-priced US home — 20% down, 30-year fixed at today's rate — as a share of median household income. Budget rules flag housing above 30% of income as 'cost-burdened', and that's the line this gauge watches.",
      bullets: [
        "A national blend — affordability differs hugely by metro.",
        "Ignores taxes, insurance, and the down payment itself, so real budgets are tighter than this.",
        "Median income arrives with a lag — the newest months reuse the latest annual figure.",
      ],
      footnote: "FRED MSPUS · MORTGAGE30US · MEHOINUSA646N",
    },
  },

  // 5) Card delinquencies — share of credit-card balances 30+ days past due.
  //    Cards are the first bill households skip, so this reads family strain.
  stress: {
    id: "stress",
    slug: "stress",
    group: "economy",
    eyebrow: "Card Delinquencies · Household Strain",
    headline: "Are households falling behind?",
    short: "Household-strain gauge",
    decimals: 1,
    suffix: "%",
    scaleMin: 1,
    scaleMax: 7,
    keyLine: { value: 3, label: "NORM ~3%" },
    chart: { domain: [1, 7], ticks: [2, 3, 5], refLabel: "~3% long-run norm" },
    bands: [
      { upTo: 2, key: "healthy", label: "Healthy", accent: C.green },
      { upTo: 3, key: "normal", label: "Normal", accent: C.green },
      { upTo: 4, key: "rising", label: "Rising strain", accent: C.amber },
      { upTo: 5.5, key: "stressed", label: "Stressed", accent: C.red },
      { upTo: Infinity, key: "crisis", label: "Crisis", accent: C.red },
    ],
    heads: {
      healthy: "Households are keeping up with their cards.",
      normal: "Delinquencies are around their long-run norm.",
      rising: "More households are missing card payments.",
      stressed: "A growing share of households can't keep up.",
      crisis: "Delinquencies are at crisis levels.",
    },
    subs: {
      rising: "And still climbing.",
      cooling: "And starting to ease.",
      flat: "Holding around here.",
    },
    takeaway(v) {
      const d = Math.abs(v - 3).toFixed(1);
      return v >= 3
        ? `${v.toFixed(1)}% of card balances are past due — ${d} pts above the ~3% norm.`
        : `${v.toFixed(1)}% of card balances are past due — ${d} pts below the ~3% norm.`;
    },
    method: {
      blurb:
        "This is the share of credit-card balances at least 30 days past due at US banks. Cards are usually the first bill households skip when money gets tight, so this series picks up strain in family budgets before it shows in bigger loans.",
      bullets: [
        "Quarterly and a bit lagged — it confirms strain more than it predicts it.",
        "The long-run norm is roughly 3%; the 2009 peak was near 7%.",
        "Bank-reported cards only — buy-now-pay-later debt isn't counted.",
      ],
      footnote: "FRED DRCCLACBS (card delinquency rate, all US banks)",
    },
  },

  // ── The markets ────────────────────────────────────────────────────────────

  // 6) Market mood — equal-weight composite of the three market gauges, each
  //    scored 0–100 toward greed on its own scale (VIX and spreads inverted).
  mood: {
    id: "mood",
    slug: "mood",
    group: "markets",
    eyebrow: "Market Mood · Composite of 3 Gauges",
    headline: "Is the market running on greed?",
    short: "Market-mood composite",
    decimals: 0,
    suffix: "",
    scaleMin: 0,
    scaleMax: 100,
    keyLine: { value: 50, label: "NEUTRAL 50" },
    chart: { domain: [0, 100], ticks: [25, 50, 75], refLabel: "50 — neutral" },
    bands: [
      { upTo: 25, key: "fear", label: "Fear", accent: C.cool },
      { upTo: 45, key: "wary", label: "Wary", accent: C.green },
      { upTo: 60, key: "neutral", label: "Neutral", accent: C.green },
      { upTo: 80, key: "greedy", label: "Greedy", accent: C.amber },
      { upTo: Infinity, key: "mania", label: "Mania", accent: C.red },
    ],
    heads: {
      fear: "Fear is in charge.",
      wary: "Caution outweighs greed.",
      neutral: "Neither fear nor greed has the upper hand.",
      greedy: "Greed is running the market.",
      mania: "All three gauges point to mania.",
    },
    subs: {
      rising: "And greed is building.",
      cooling: "And cooling off.",
      flat: "Holding around here.",
    },
    takeaway(v) {
      const d = Math.abs(Math.round(v - 50));
      return v >= 50
        ? `${Math.round(v)} of 100 — ${d} pts into the greedy half.`
        : `${Math.round(v)} of 100 — ${d} pts into the fearful half.`;
    },
    method: {
      blurb:
        "One number blending the three market gauges — valuations (Buffett Indicator), options-market fear (VIX), and credit risk appetite (high-yield spreads) — each scored 0–100 toward greed and averaged. High readings mean stocks are expensive while fear is cheap: the classic mania cocktail.",
      bullets: [
        "A mood ring, not a timing tool — markets can stay greedy for years.",
        "Equal-weighted by design; no backtested magic here.",
        "Each component is scored against its own typical range — see the three cards for details.",
      ],
      footnote: "composite of buffett · vix · credit (equal weights)",
    },
  },

  // 7) Buffett Indicator — total US corporate equities (Fed Z.1) ÷ GDP.
  buffett: {
    id: "buffett",
    slug: "buffett",
    group: "markets",
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

  // 8) VIX — the options-market "fear gauge". Low = complacency/greed, high = fear.
  vix: {
    id: "vix",
    slug: "vix",
    group: "markets",
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

  // 9) High-yield credit spread — the bond market's "smart money" greed gauge.
  credit: {
    id: "credit",
    slug: "credit",
    group: "markets",
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
