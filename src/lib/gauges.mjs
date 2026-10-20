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

// Topics for grouping gauges and driving the onboarding quiz.
export const TOPICS = [
  { id: "jobs", label: "Jobs" },
  { id: "prices", label: "Prices" },
  { id: "housing", label: "Housing" },
  { id: "growth", label: "Growth" },
  { id: "fed", label: "The Fed" },
  { id: "households", label: "Households" },
  { id: "markets", label: "Markets" },
];

export const TOPIC_LABELS = Object.fromEntries(TOPICS.map((t) => [t.id, t.label]));

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
    topic: "fed",
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
    topic: "prices",
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
    topic: "jobs",
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
    topic: "housing",
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
    topic: "households",
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
    topic: "markets",
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
    topic: "markets",
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
    topic: "markets",
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
    topic: "markets",
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

  // ── New gauges (v2 catalog) ────────────────────────────────────────────────
  // NOTE: These band thresholds and labels are DRAFTS for the owner's review.
  // They are calibrated from historical percentiles and standard macro benchmarks.

  // 10) Initial jobless claims — monthly average of weekly initial filings (thousands).
  //     Leading indicator for layoffs and labor market deterioration.
  claims: {
    id: "claims",
    slug: "claims",
    group: "economy",
    topic: "jobs",
    eyebrow: "Initial Jobless Claims · Weekly Layoffs",
    headline: "Are layoffs piling up?",
    short: "Jobless-claims gauge",
    decimals: 0,
    suffix: "k",
    scaleMin: 150,
    scaleMax: 600,
    keyLine: { value: 300, label: "NORMAL ~300k" },
    chart: { domain: [150, 600], ticks: [200, 300, 450], refLabel: "~300k normal" },
    bands: [
      { upTo: 220, key: "very_low", label: "Very low", accent: C.green },
      { upTo: 275, key: "healthy", label: "Healthy", accent: C.green },
      { upTo: 350, key: "rising", label: "Moderate", accent: C.amber },
      { upTo: 450, key: "elevated", label: "Elevated", accent: C.amber },
      { upTo: Infinity, key: "recessionary", label: "Recessionary", accent: C.red },
    ],
    heads: {
      very_low: "Layoffs are near historical lows.",
      healthy: "Layoffs are calm and healthy.",
      rising: "Layoffs are ticking up from low levels.",
      elevated: "Layoffs are running noticeably high.",
      recessionary: "Layoffs are at recession levels.",
    },
    subs: {
      rising: "And claims are climbing.",
      cooling: "And claims are easing.",
      flat: "Holding steady.",
    },
    takeaway(v) {
      const d = Math.abs(Math.round(v - 300));
      return v < 300
        ? `${Math.round(v)}k claims — ${d}k below the 300k caution line.`
        : `${Math.round(v)}k claims — ${d}k above the 300k caution line.`;
    },
    method: {
      blurb:
        "Initial jobless claims count first-time filings for state unemployment benefits each week, averaged over the month. Because claims report weekly with minimal lag, they provide the earliest reliable warning when employers begin cutting staff.",
      bullets: [
        "A measure of firings, not hiring — claims stay low if companies freeze hiring but avoid layoffs.",
        "Holiday shifts, severe storms, and seasonal plant retoolings can cause temporary weekly blips.",
        "Independent contractors, freelancers, and gig workers are typically excluded from state programs.",
      ],
      footnote: "FRED ICSA (initial claims, monthly average of weekly readings)",
    },
  },

  // 11) Nonfarm payrolls — 3-month average of monthly payroll changes (thousands).
  //     The core benchmark for net job creation.
  payrolls: {
    id: "payrolls",
    slug: "payrolls",
    group: "economy",
    topic: "jobs",
    eyebrow: "Nonfarm Payrolls · Monthly Job Growth",
    headline: "Is the economy adding jobs?",
    short: "Payrolls gauge",
    decimals: 0,
    suffix: "k",
    scaleMin: -300,
    scaleMax: 500,
    keyLine: { value: 0, label: "0 NET JOBS" },
    chart: { domain: [-300, 500], ticks: [-100, 0, 200], refLabel: "0 net jobs" },
    bands: [
      { upTo: -50, key: "shrinking", label: "Shrinking", accent: C.red },
      { upTo: 75, key: "stalling", label: "Stalling", accent: C.amber },
      { upTo: 175, key: "steady", label: "Steady", accent: C.green },
      { upTo: 300, key: "strong", label: "Strong", accent: C.green },
      { upTo: Infinity, key: "booming", label: "Booming", accent: C.cool },
    ],
    heads: {
      shrinking: "Employers are cutting jobs on net.",
      stalling: "Hiring has slowed to stall speed.",
      steady: "Job growth is pacing near population replacement.",
      strong: "Hiring is strong across the board.",
      booming: "Job gains are running at a boom pace.",
    },
    subs: {
      rising: "And job gains are speeding up.",
      cooling: "And job gains are slowing down.",
      flat: "Holding near this pace.",
    },
    takeaway(v) {
      const n = Math.round(v);
      return n >= 0
        ? `+${n}k jobs/mo (3-mo avg) — expanding payrolls.`
        : `-${Math.abs(n)}k jobs/mo (3-mo avg) — contracting payrolls.`;
    },
    method: {
      blurb:
        "This tracks the 3-month moving average of monthly nonfarm payroll changes from the Bureau of Labor Statistics establishment survey. The economy needs roughly 75k to 100k new jobs monthly just to keep up with population growth; anything below that points to a cooling labor market.",
      bullets: [
        "Initial monthly releases are based on partial employer responses and face regular revisions.",
        "A 3-month average smooths out weather disruptions, strike distortions, and seasonal noise.",
        "Counts payroll positions, not individual workers — multiple-job holders count once per job.",
      ],
      footnote: "FRED PAYEMS (3-month average of monthly change in thousands)",
    },
  },

  // 12) Job openings ratio — vacancies per officially unemployed jobseeker.
  //     Measures worker leverage and labor market tightness.
  openings: {
    id: "openings",
    slug: "openings",
    group: "economy",
    topic: "jobs",
    eyebrow: "Job Openings Ratio · Openings per Jobseeker",
    headline: "Are jobs easy to find?",
    short: "Job-openings ratio",
    decimals: 2,
    suffix: "x",
    scaleMin: 0.2,
    scaleMax: 2.2,
    keyLine: { value: 1.0, label: "1.0 PARITY" },
    chart: { domain: [0.2, 2.2], ticks: [0.5, 1.0, 1.6], refLabel: "1.0 parity line" },
    bands: [
      { upTo: 0.5, key: "scarce", label: "Scarce", accent: C.red },
      { upTo: 0.85, key: "slack", label: "Slack", accent: C.amber },
      { upTo: 1.2, key: "balanced", label: "Balanced", accent: C.green },
      { upTo: 1.6, key: "tight", label: "Tight", accent: C.green },
      { upTo: Infinity, key: "overheated", label: "Overheated", accent: C.amber },
    ],
    heads: {
      scarce: "Job openings are scarce for the unemployed.",
      slack: "Jobseekers outnumber available openings.",
      balanced: "Openings and jobseekers are roughly in balance.",
      tight: "Openings outnumber seekers — workers hold leverage.",
      overheated: "Severe labor shortages — openings far exceed seekers.",
    },
    subs: {
      rising: "And the market is tightening.",
      cooling: "And the cushion is shrinking.",
      flat: "Holding steady.",
    },
    takeaway(v) {
      const d = Math.abs(v - 1.0).toFixed(2);
      return v >= 1.0
        ? `${v.toFixed(2)} openings per unemployed person — ${d} above 1:1 parity.`
        : `${v.toFixed(2)} openings per unemployed person — ${d} below 1:1 parity.`;
    },
    method: {
      blurb:
        "This ratio divides total job vacancies from the JOLTS report by the number of unemployed workers actively seeking work. At 1.0, there is exactly one opening for every jobseeker. A reading well above 1.0 forces employers to raise pay to attract talent, while readings under 1.0 mean longer job hunts.",
      bullets: [
        "JOLTS data lags other employment figures by about a month.",
        "Online listings and ghost postings can inflate opening counts relative to actual hires.",
        "National parity can mask geographic or industry-specific mismatches in candidate skills.",
      ],
      footnote: "FRED JTSJOL ÷ UNEMPLOY",
    },
  },

  // 13) Quits rate — percentage of the workforce voluntarily resigning each month.
  //     Direct reflection of employee confidence in outside opportunities.
  quits: {
    id: "quits",
    slug: "quits",
    group: "economy",
    topic: "jobs",
    eyebrow: "Quits Rate · Voluntary Resignations",
    headline: "Are workers confident enough to quit?",
    short: "Quits-rate gauge",
    decimals: 1,
    suffix: "%",
    scaleMin: 1.0,
    scaleMax: 3.2,
    keyLine: { value: 2.2, label: "NORM ~2.2%" },
    chart: { domain: [1.0, 3.2], ticks: [1.5, 2.2, 2.8], refLabel: "~2.2% pre-pandemic norm" },
    bands: [
      { upTo: 1.6, key: "frozen", label: "Frozen", accent: C.red },
      { upTo: 2.0, key: "cautious", label: "Cautious", accent: C.amber },
      { upTo: 2.4, key: "normal", label: "Normal", accent: C.green },
      { upTo: 2.8, key: "confident", label: "Confident", accent: C.green },
      { upTo: Infinity, key: "boom", label: "Job-hopping boom", accent: C.cool },
    ],
    heads: {
      frozen: "Workers are hunkering down — quitting is frozen.",
      cautious: "Workers are cautious about switching jobs.",
      normal: "Quitting activity is near its historical norm.",
      confident: "Workers are confident enough to switch jobs.",
      boom: "A job-hopping boom — workers hold strong leverage.",
    },
    subs: {
      rising: "And worker mobility is picking up.",
      cooling: "And worker caution is growing.",
      flat: "Holding steady.",
    },
    takeaway(v) {
      const d = Math.abs(v - 2.2).toFixed(1);
      return v >= 2.2
        ? `${v.toFixed(1)}% quits rate — ${d} pts above the 2.2% norm.`
        : `${v.toFixed(1)}% quits rate — ${d} pts below the 2.2% norm.`;
    },
    method: {
      blurb:
        "The quits rate measures voluntary departures as a percentage of total employment. Workers rarely leave a paycheck unless they already have a better offer or feel confident they can find one quickly. A declining quits rate is an early sign that labor market dynamism is drying up.",
      bullets: [
        "Measures voluntary resignations only — layoffs and discharges are tracked separately.",
        "Lags payroll reports by about one month.",
        "High-turnover sectors like hospitality and food service disproportionately drive the aggregate rate.",
      ],
      footnote: "FRED JTSQUR (quits rate, total nonfarm)",
    },
  },

  // 14) Real GDP — inflation-adjusted output vs the same quarter a year ago.
  //     The broad scorecard of economic expansion or contraction.
  gdp: {
    id: "gdp",
    slug: "gdp",
    group: "economy",
    topic: "growth",
    eyebrow: "Real GDP · Output vs Year Ago",
    headline: "Is economic growth holding up?",
    short: "Real-GDP gauge",
    decimals: 1,
    suffix: "%",
    scaleMin: -3,
    scaleMax: 6,
    keyLine: { value: 2.5, label: "TREND ~2.5%" },
    chart: { domain: [-3, 6], ticks: [0, 2.5, 4.5], refLabel: "2.5% trend growth" },
    bands: [
      { upTo: 0, key: "contracting", label: "Contracting", accent: C.red },
      { upTo: 1.5, key: "sluggish", label: "Sluggish", accent: C.amber },
      { upTo: 2.5, key: "moderate", label: "Moderate", accent: C.green },
      { upTo: 3.5, key: "solid", label: "Solid", accent: C.green },
      { upTo: Infinity, key: "booming", label: "Booming", accent: C.cool },
    ],
    heads: {
      contracting: "Economic output is contracting year over year.",
      sluggish: "Growth has slowed to stall speed.",
      moderate: "Growth is tracking near long-term trend.",
      solid: "Output is expanding at a healthy clip.",
      booming: "Growth is running well above long-run potential.",
    },
    subs: {
      rising: "And momentum is building.",
      cooling: "And momentum is fading.",
      flat: "Holding near this pace.",
    },
    takeaway(v) {
      const d = Math.abs(v - 2.5).toFixed(1);
      return v >= 2.5
        ? `${v.toFixed(1)}% annual growth — ${d} pts above the 2.5% trend.`
        : `${v.toFixed(1)}% annual growth — ${d} pts below the 2.5% trend.`;
    },
    method: {
      blurb:
        "Real Gross Domestic Product measures the inflation-adjusted market value of all goods and services produced in the US, compared to the same quarter a year earlier. It is the broadest scorecard of economic activity, with 2.0% to 2.5% considered the economy's sustainable speed limit.",
      bullets: [
        "Reported quarterly and revised twice before annual comprehensive benchmark updates.",
        "Year-over-year figures forward-filled to monthly to maintain contiguous tracking.",
        "Headline growth can hide sharp divergence between consumer spending and business investment.",
      ],
      footnote: "FRED GDPC1 (real GDP, YoY %, forward-filled monthly)",
    },
  },

  // 15) Industrial production — factory, mining, and utility output vs a year ago.
  //     Cyclical barometer of physical goods output.
  indpro: {
    id: "indpro",
    slug: "indpro",
    group: "economy",
    topic: "growth",
    eyebrow: "Industrial Production · Factory & Mine Output",
    headline: "Is industrial activity expanding?",
    short: "Industrial-production gauge",
    decimals: 1,
    suffix: "%",
    scaleMin: -8,
    scaleMax: 8,
    keyLine: { value: 0, label: "0% BREAK-EVEN" },
    chart: { domain: [-8, 8], ticks: [-4, 0, 4], refLabel: "0% break-even" },
    bands: [
      { upTo: -3, key: "slump", label: "Slump", accent: C.red },
      { upTo: 0, key: "contracting", label: "Contracting", accent: C.amber },
      { upTo: 2.5, key: "modest", label: "Modest", accent: C.green },
      { upTo: 5.0, key: "robust", label: "Robust", accent: C.green },
      { upTo: Infinity, key: "surging", label: "Surging", accent: C.cool },
    ],
    heads: {
      slump: "Industrial output is in a deep slump.",
      contracting: "Factory and mine production is slipping.",
      modest: "Industrial activity is growing at a modest pace.",
      robust: "Production is expanding briskly.",
      surging: "Industrial output is surging at a cyclical high.",
    },
    subs: {
      rising: "And output is accelerating.",
      cooling: "And output is slowing.",
      flat: "Holding steady.",
    },
    takeaway(v) {
      const d = Math.abs(v).toFixed(1);
      return v >= 0
        ? `Output up ${v.toFixed(1)}% YoY — industrial sector is expanding.`
        : `Output down ${d}% YoY — industrial sector is contracting.`;
    },
    method: {
      blurb:
        "The Federal Reserve's industrial production index measures real output across US manufacturing, mining, and electric and gas utilities. Because factories adjust output rapidly when orders shift, this metric is one of the most reliable cyclical indicators of turnarounds and downturns.",
      bullets: [
        "Focuses on goods and materials, omitting the dominant services side of the economy.",
        "Unusual weather can trigger large swings in utility output for heating or air conditioning.",
        "Revisions are common as detailed industry shipment data becomes available.",
      ],
      footnote: "FRED INDPRO, year-over-year",
    },
  },

  // 16) Real retail sales — retail checkout receipts adjusted for CPI inflation.
  //     Tracks whether consumer buying volume is growing or shrinking.
  retail: {
    id: "retail",
    slug: "retail",
    group: "economy",
    topic: "growth",
    eyebrow: "Real Retail Sales · Inflation-Adjusted Shopping",
    headline: "Are consumers buying more goods?",
    short: "Real-retail gauge",
    decimals: 1,
    suffix: "%",
    scaleMin: -6,
    scaleMax: 8,
    keyLine: { value: 0, label: "0% BREAK-EVEN" },
    chart: { domain: [-6, 8], ticks: [-3, 0, 4], refLabel: "0% break-even" },
    bands: [
      { upTo: -2.5, key: "slump", label: "Slump", accent: C.red },
      { upTo: 0, key: "contracting", label: "Contracting", accent: C.amber },
      { upTo: 2.5, key: "moderate", label: "Moderate", accent: C.green },
      { upTo: 5.0, key: "strong", label: "Strong", accent: C.green },
      { upTo: Infinity, key: "booming", label: "Booming", accent: C.cool },
    ],
    heads: {
      slump: "Consumer goods purchases are down sharply.",
      contracting: "Real shopping volume is slipping year over year.",
      moderate: "Goods spending is growing at a moderate pace.",
      strong: "Shoppers are purchasing solid volume.",
      booming: "Retail shopping volume is booming.",
    },
    subs: {
      rising: "And retail volume is speeding up.",
      cooling: "And retail volume is tapering off.",
      flat: "Holding steady.",
    },
    takeaway(v) {
      const d = Math.abs(v).toFixed(1);
      return v >= 0
        ? `Real retail up ${v.toFixed(1)}% YoY — consumers taking home more goods.`
        : `Real retail down ${d}% YoY — purchases shrinking after inflation.`;
    },
    method: {
      blurb:
        "Real retail sales divides total monthly retail dollar receipts by headline CPI inflation. This reveals whether Americans are actually walking home with more physical items or merely spending more dollars to cover higher price tags. Because consumer spending drives most of the economy, real sales are a direct pulse of household demand.",
      bullets: [
        "Measures physical stores and restaurants, leaving out services like housing, healthcare, and airfare.",
        "Deflated with overall CPI, which may drift slightly from the exact mix of retail goods.",
        "Subject to holiday timing shifts and early Census bureau sample revisions.",
      ],
      footnote: "FRED RSAFS ÷ CPIAUCSL, year-over-year",
    },
  },

  // 17) Building permits — annualized authorized housing units (thousands).
  //     Leading indicator for residential construction and future housing supply.
  permits: {
    id: "permits",
    slug: "permits",
    group: "economy",
    topic: "housing",
    eyebrow: "Building Permits · New Housing Pipeline",
    headline: "Are homebuilders planning new homes?",
    short: "Building-permits gauge",
    decimals: 0,
    suffix: "k",
    scaleMin: 700,
    scaleMax: 2200,
    keyLine: { value: 1400, label: "NORM ~1,400k" },
    chart: { domain: [700, 2200], ticks: [1000, 1400, 1800], refLabel: "~1,400k historical norm" },
    bands: [
      { upTo: 1000, key: "slump", label: "Slump", accent: C.red },
      { upTo: 1300, key: "slow", label: "Slow", accent: C.amber },
      { upTo: 1550, key: "normal", label: "Normal", accent: C.green },
      { upTo: 1850, key: "active", label: "Active", accent: C.green },
      { upTo: Infinity, key: "boom", label: "Building boom", accent: C.cool },
    ],
    heads: {
      slump: "Permit authorizations are in a severe slump.",
      slow: "Homebuilders are tapping the brakes on new projects.",
      normal: "Permit filings are near historical norms.",
      active: "Homebuilders are actively authorizing new units.",
      boom: "Permit activity is running at a building-boom pace.",
    },
    subs: {
      rising: "And permit applications are picking up.",
      cooling: "And permit applications are slowing.",
      flat: "Holding steady.",
    },
    takeaway(v) {
      const d = Math.abs(Math.round(v - 1400));
      return v >= 1400
        ? `${Math.round(v)}k annualized permits — ${d}k above the 1,400k baseline.`
        : `${Math.round(v)}k annualized permits — ${d}k below the 1,400k baseline.`;
    },
    method: {
      blurb:
        "Building permits measure the number of new privately owned housing units authorized by local governments each month, expressed at a seasonally adjusted annual rate. Because permits must be secured before groundbreaking, this is the leading indicator for home construction and future housing supply.",
      bullets: [
        "Permits signal intent — builders can delay groundbreaking if mortgage rates surge.",
        "Includes multi-family apartment buildings, which get permitted in large, lumpy batches.",
        "Highly sensitive to prevailing mortgage rates and builder construction loan costs.",
      ],
      footnote: "FRED PERMIT (annual rate in thousands)",
    },
  },

  // 18) Fed funds rate — effective overnight central bank policy benchmark.
  //     The baseline interest rate anchoring US financial conditions.
  fedfunds: {
    id: "fedfunds",
    slug: "fedfunds",
    group: "economy",
    topic: "fed",
    eyebrow: "Fed Funds Rate · Overnight Policy Target",
    headline: "Is the Fed restricting the economy?",
    short: "Fed-funds gauge",
    decimals: 2,
    suffix: "%",
    scaleMin: 0,
    scaleMax: 8,
    keyLine: { value: 2.5, label: "NEUTRAL ~2.5%" },
    chart: { domain: [0, 8], ticks: [0, 2.5, 5], refLabel: "~2.5% neutral estimate" },
    bands: [
      { upTo: 0.5, key: "zero", label: "Near-zero", accent: C.cool },
      { upTo: 2.0, key: "stimulative", label: "Stimulative", accent: C.green },
      { upTo: 3.25, key: "neutral", label: "Neutral", accent: C.green },
      { upTo: 5.0, key: "restrictive", label: "Restrictive", accent: C.amber },
      { upTo: Infinity, key: "tight", label: "Very tight", accent: C.red },
    ],
    heads: {
      zero: "Rates are pinned near zero to stimulate borrowing.",
      stimulative: "Policy is accommodative, encouraging credit growth.",
      neutral: "The Fed's policy rate is near estimated neutral.",
      restrictive: "Policy is restrictive, leaning against inflation.",
      tight: "Rates are deeply restrictive to cool the economy.",
    },
    subs: {
      rising: "And the Fed is hiking.",
      cooling: "And the Fed is cutting.",
      flat: "Holding policy steady.",
    },
    takeaway(v) {
      const d = Math.abs(v - 2.5).toFixed(2);
      return v >= 2.5
        ? `${v.toFixed(2)}% policy rate — ${d} pts above the 2.5% neutral estimate.`
        : `${v.toFixed(2)}% policy rate — ${d} pts below the 2.5% neutral estimate.`;
    },
    method: {
      blurb:
        "The effective federal funds rate is the interest rate commercial banks charge each other to borrow reserves overnight. Guided by the Federal Reserve's target range, it ripples into prime rates, credit cards, auto loans, and corporate borrowing throughout the economy.",
      bullets: [
        "The neutral rate cannot be measured directly; economists estimate it around 2.5% to 3.0%.",
        "Rate moves work with long and variable lags, often taking 12 to 18 months to bite.",
        "Monthly average of daily effective rates (DFF) across all market trades.",
      ],
      footnote: "FRED DFF (effective federal funds rate, monthly average)",
    },
  },

  // 19) Core PCE inflation — consumer expenditure prices excluding food and energy.
  //     The Federal Reserve's official 2% inflation target metric.
  corepce: {
    id: "corepce",
    slug: "corepce",
    group: "economy",
    topic: "fed",
    eyebrow: "Core PCE Inflation · Fed's Official Target",
    headline: "Is core inflation near target?",
    short: "Core-PCE gauge",
    decimals: 1,
    suffix: "%",
    scaleMin: 0,
    scaleMax: 6,
    keyLine: { value: 2.0, label: "TARGET 2%" },
    chart: { domain: [0, 6], ticks: [1, 2, 4], refLabel: "2.0% Fed target" },
    bands: [
      { upTo: 1.5, key: "low", label: "Too low", accent: C.cool },
      { upTo: 2.2, key: "target", label: "On target", accent: C.green },
      { upTo: 3.0, key: "warm", label: "Warm", accent: C.amber },
      { upTo: 4.5, key: "elevated", label: "Elevated", accent: C.amber },
      { upTo: Infinity, key: "high", label: "High", accent: C.red },
    ],
    heads: {
      low: "Core inflation is running under the Fed's target.",
      target: "Core inflation is right around the 2% goal.",
      warm: "Underlying price pressure is warm.",
      elevated: "Core inflation is stubbornly above target.",
      high: "Underlying inflation is running far too hot.",
    },
    subs: {
      rising: "And core pressures are building.",
      cooling: "And core pressures are cooling.",
      flat: "Holding steady.",
    },
    takeaway(v) {
      const d = Math.abs(v - 2.0).toFixed(1);
      return v >= 2.0
        ? `${v.toFixed(1)}% core PCE — ${d} pts above the Fed's 2.0% target.`
        : `${v.toFixed(1)}% core PCE — ${d} pts below the Fed's 2.0% target.`;
    },
    method: {
      blurb:
        "Core PCE measures price changes in consumer expenditures excluding food and energy. It is the Federal Reserve's primary metric for its 2% inflation goal because stripping out food and fuel volatility reveals the durable underlying inflation trend.",
      bullets: [
        "Strips out groceries and gasoline, even though households pay for both every week.",
        "Uses a chained index that reflects shoppers switching to cheaper alternatives as prices rise.",
        "Typically runs 0.2 to 0.4 percentage points lower than the headline CPI index.",
      ],
      footnote: "FRED PCEPILFE (core PCE price index), year-over-year",
    },
  },

  // 20) 10-year breakeven — bond-market expected annual CPI inflation over 10 years.
  //     Measures financial market trust in long-term price stability.
  breakeven: {
    id: "breakeven",
    slug: "breakeven",
    group: "economy",
    topic: "fed",
    eyebrow: "10-Year Breakeven · Expected Inflation",
    headline: "Does the bond market trust the Fed?",
    short: "Inflation-expectations gauge",
    decimals: 2,
    suffix: "%",
    scaleMin: 1.0,
    scaleMax: 3.5,
    keyLine: { value: 2.0, label: "TARGET ~2%" },
    chart: { domain: [1.0, 3.5], ticks: [1.5, 2.0, 3.0], refLabel: "~2% target" },
    bands: [
      { upTo: 1.6, key: "depressed", label: "Depressed", accent: C.cool },
      { upTo: 2.1, key: "anchored", label: "Anchored", accent: C.green },
      { upTo: 2.5, key: "normal", label: "Normal", accent: C.green },
      { upTo: 3.0, key: "elevated", label: "Elevated", accent: C.amber },
      { upTo: Infinity, key: "unanchored", label: "Unanchored", accent: C.red },
    ],
    heads: {
      depressed: "Bond markets expect chronically weak inflation.",
      anchored: "Inflation expectations are well anchored near target.",
      normal: "Expected inflation is within historical norms.",
      elevated: "Bond traders expect above-target inflation over the decade.",
      unanchored: "Expectations are unmooring from the Fed's target.",
    },
    subs: {
      rising: "And expectations are edging up.",
      cooling: "And expectations are easing down.",
      flat: "Holding steady.",
    },
    takeaway(v) {
      const d = Math.abs(v - 2.0).toFixed(2);
      return v >= 2.0
        ? `${v.toFixed(2)}% expected inflation — ${d} pts above the 2.0% target.`
        : `${v.toFixed(2)}% expected inflation — ${d} pts below the 2.0% target.`;
    },
    method: {
      blurb:
        "The 10-year breakeven inflation rate is the yield spread between ordinary 10-year Treasury notes and inflation-protected TIPS. It reflects the average annual CPI inflation bond investors price in over the next decade. If breakevens pull far away from 2%, it signals fading market faith in the Fed.",
      bullets: [
        "Priced against CPI inflation, which tends to run 0.3 percentage points above the Fed's PCE goal.",
        "Can be distorted during liquidity panics when standard Treasuries are favored over TIPS.",
        "A market price of risk, not a direct poll of household or business expectations.",
      ],
      footnote: "FRED T10YIE (10-year breakeven inflation rate, monthly average)",
    },
  },

  // 21) Regular gasoline — national retail price per gallon ($/gal).
  //     High-visibility consumer price directly affecting household sentiment.
  gas: {
    id: "gas",
    slug: "gas",
    group: "economy",
    topic: "prices",
    eyebrow: "Gasoline Prices · Regular Pump Average",
    headline: "Is gas straining family budgets?",
    short: "Gas-price gauge",
    decimals: 2,
    suffix: "",
    scaleMin: 1.5,
    scaleMax: 5.5,
    keyLine: { value: 3.5, label: "$3.50 REF" },
    chart: { domain: [1.5, 5.5], ticks: [2.5, 3.5, 4.5], refLabel: "$3.50 reference line" },
    bands: [
      { upTo: 2.50, key: "cheap", label: "Cheap", accent: C.green },
      { upTo: 3.20, key: "moderate", label: "Moderate", accent: C.green },
      { upTo: 3.80, key: "elevated", label: "Elevated", accent: C.amber },
      { upTo: 4.50, key: "painful", label: "Painful", accent: C.amber },
      { upTo: Infinity, key: "extreme", label: "Extreme", accent: C.red },
    ],
    heads: {
      cheap: "Gas is cheap, leaving breathing room in budgets.",
      moderate: "Pump prices are in a manageable range.",
      elevated: "Gas prices are noticeably high.",
      painful: "Gas prices are eating heavily into disposable cash.",
      extreme: "Pump prices are in shock territory.",
    },
    subs: {
      rising: "And pump prices are climbing.",
      cooling: "And pump prices are coming down.",
      flat: "Holding steady at the pump.",
    },
    takeaway(v) {
      const d = Math.abs(v - 3.5).toFixed(2);
      return v >= 3.5
        ? `$${v.toFixed(2)}/gal — $${d} above the $3.50 baseline.`
        : `$${v.toFixed(2)}/gal — $${d} below the $3.50 baseline.`;
    },
    method: {
      blurb:
        "This tracks the US national retail price for a gallon of regular unleaded gasoline, averaged monthly. Because drivers confront pump prices every week, gas has a disproportionate impact on consumer morale, household cash flow, and public perception of inflation.",
      bullets: [
        "National average masks wide state variation from regional taxes and refinery constraints.",
        "Follows strong seasonal patterns, typically rising in spring as summer-grade fuel takes over.",
        "Tied closely to global crude oil prices and domestic refinery utilization capacity.",
      ],
      footnote: "FRED GASREGW (regular unleaded, monthly average)",
    },
  },

  // 22) Crude oil — West Texas Intermediate spot price ($/barrel).
  //     Primary global energy and chemical feedstock.
  oil: {
    id: "oil",
    slug: "oil",
    group: "economy",
    topic: "prices",
    eyebrow: "Crude Oil · WTI Benchmark",
    headline: "Is oil driving energy costs up?",
    short: "Oil-price gauge",
    decimals: 0,
    suffix: "",
    scaleMin: 30,
    scaleMax: 120,
    keyLine: { value: 75, label: "NORM ~$75" },
    chart: { domain: [30, 120], ticks: [50, 75, 100], refLabel: "~$75 historical norm" },
    bands: [
      { upTo: 50, key: "depressed", label: "Depressed", accent: C.cool },
      { upTo: 70, key: "moderate", label: "Moderate", accent: C.green },
      { upTo: 85, key: "normal", label: "Normal", accent: C.green },
      { upTo: 100, key: "elevated", label: "Elevated", accent: C.amber },
      { upTo: Infinity, key: "spike", label: "Spike", accent: C.red },
    ],
    heads: {
      depressed: "Crude oil prices are depressed.",
      moderate: "Oil prices are moderate.",
      normal: "Crude oil is trading near its historical norm.",
      elevated: "Elevated crude is pushing up transport and production costs.",
      spike: "Oil prices are spiking into dangerous territory.",
    },
    subs: {
      rising: "And crude is climbing.",
      cooling: "And crude is sliding.",
      flat: "Holding steady.",
    },
    takeaway(v) {
      const d = Math.abs(Math.round(v - 75));
      return v >= 75
        ? `$${Math.round(v)}/bbl — $${d} above the $75 norm.`
        : `$${Math.round(v)}/bbl — $${d} below the $75 norm.`;
    },
    method: {
      blurb:
        "West Texas Intermediate (WTI) is the primary US benchmark price for light, sweet crude oil, delivered at Cushing, Oklahoma. As the raw input for gasoline, diesel, jet fuel, and chemicals, crude price swings ripple rapidly through freight networks and headline inflation.",
      bullets: [
        "WTI measures US pipeline supply; Brent crude sets the global sea-freight benchmark.",
        "Vulnerable to geopolitical conflict, OPEC+ production quotas, and sudden weather shutdowns.",
        "High oil strains consumers but stimulates capital spending and hiring in domestic oil basins.",
      ],
      footnote: "FRED DCOILWTICO (spot crude, monthly average)",
    },
  },

  // 23) Trade-weighted dollar — broad currency index vs major trading partners (YoY %).
  //     Governs import prices, export competitiveness, and global credit conditions.
  dollar: {
    id: "dollar",
    slug: "dollar",
    group: "economy",
    topic: "prices",
    eyebrow: "Trade-Weighted Dollar · Currency Strength",
    headline: "Is the US dollar surging?",
    short: "Dollar-index gauge",
    decimals: 1,
    suffix: "%",
    scaleMin: -10,
    scaleMax: 15,
    keyLine: { value: 0, label: "0% BREAK-EVEN" },
    chart: { domain: [-10, 15], ticks: [-5, 0, 8], refLabel: "0% break-even" },
    bands: [
      { upTo: -5, key: "weak", label: "Weak", accent: C.amber },
      { upTo: 0, key: "soft", label: "Softening", accent: C.green },
      { upTo: 4, key: "stable", label: "Stable", accent: C.green },
      { upTo: 8, key: "strong", label: "Strong", accent: C.amber },
      { upTo: Infinity, key: "surging", label: "Surging", accent: C.red },
    ],
    heads: {
      weak: "The dollar has dropped sharply vs trading partners.",
      soft: "The dollar is drifting lower year over year.",
      stable: "Currency values are tracking in a balanced range.",
      strong: "A strong dollar cheapens imports but pinches exports.",
      surging: "A surging dollar strains global credit and exports.",
    },
    subs: {
      rising: "And the dollar is strengthening.",
      cooling: "And the dollar is softening.",
      flat: "Holding steady.",
    },
    takeaway(v) {
      const d = Math.abs(v).toFixed(1);
      return v >= 0
        ? `Dollar up ${v.toFixed(1)}% YoY — imports cheaper, exports tougher.`
        : `Dollar down ${d}% YoY — imports pricier, exports competitive.`;
    },
    method: {
      blurb:
        "The Federal Reserve's broad trade-weighted dollar index measures the value of the US dollar against a basket of currencies of major foreign trading partners. A rising dollar makes foreign goods cheaper for Americans while making US exports pricier abroad and tightening global financial conditions.",
      bullets: [
        "A two-sided gauge: a strong dollar dampens inflation but weighs on US factory exports.",
        "Currencies are weighted by their share of bilateral goods trade with the US.",
        "Tends to spike during global market panics as investors seek the ultimate safe haven.",
      ],
      footnote: "FRED DTWEXBGS (nominal broad dollar index, monthly average), YoY",
    },
  },

  // 24) Personal saving rate — personal savings as a percentage of disposable income.
  //     Measures family balance sheet resilience and rainy-day cushions.
  savings: {
    id: "savings",
    slug: "savings",
    group: "economy",
    topic: "households",
    eyebrow: "Personal Saving Rate · Paycheck Buffer",
    headline: "Are families saving a healthy cushion?",
    short: "Saving-rate gauge",
    decimals: 1,
    suffix: "%",
    scaleMin: 2,
    scaleMax: 15,
    keyLine: { value: 7, label: "NORM ~7%" },
    chart: { domain: [2, 15], ticks: [4, 7, 11], refLabel: "~7% historical norm" },
    bands: [
      { upTo: 3.5, key: "depleted", label: "Depleted", accent: C.red },
      { upTo: 5.5, key: "low", label: "Thin cushion", accent: C.amber },
      { upTo: 8.0, key: "normal", label: "Normal", accent: C.green },
      { upTo: 11.0, key: "solid", label: "Solid", accent: C.green },
      { upTo: Infinity, key: "high", label: "Precautionary", accent: C.cool },
    ],
    heads: {
      depleted: "Personal savings are dangerously thin.",
      low: "Households are saving less than typical.",
      normal: "The saving rate is near its historical norm.",
      solid: "Families are keeping a solid savings cushion.",
      high: "Savings are elevated — households are hunkering down.",
    },
    subs: {
      rising: "And households are stashing more away.",
      cooling: "And families are dipping into reserves.",
      flat: "Holding steady.",
    },
    takeaway(v) {
      const d = Math.abs(v - 7).toFixed(1);
      return v >= 7
        ? `${v.toFixed(1)}% of disposable income saved — ${d} pts above the ~7% norm.`
        : `${v.toFixed(1)}% of disposable income saved — ${d} pts below the ~7% norm.`;
    },
    method: {
      blurb:
        "The personal saving rate is the percentage of disposable (after-tax) personal income that households save instead of spending. A healthy rate provides a buffer against layoffs and emergencies, while a depressed rate indicates households are stretching budgets or depleting rainy-day funds.",
      bullets: [
        "Calculated as an accounting residual (income minus spending), making it subject to large revisions.",
        "Top-income earners account for the lion's share of aggregate savings dollars.",
        "A very high rate can signal caution rather than prosperity as worried families curtail spending.",
      ],
      footnote: "FRED PSAVERT (personal saving rate)",
    },
  },

  // 25) Consumer sentiment — University of Michigan monthly consumer survey index.
  //     Real-time barometer of household confidence and spending intentions.
  sentiment: {
    id: "sentiment",
    slug: "sentiment",
    group: "economy",
    topic: "households",
    eyebrow: "Consumer Sentiment · Michigan Survey",
    headline: "Do consumers feel confident?",
    short: "Consumer-sentiment gauge",
    decimals: 0,
    suffix: "",
    scaleMin: 50,
    scaleMax: 105,
    keyLine: { value: 80, label: "NORM ~80" },
    chart: { domain: [50, 105], ticks: [60, 80, 95], refLabel: "~80 historical norm" },
    bands: [
      { upTo: 60, key: "grim", label: "Grim", accent: C.red },
      { upTo: 72, key: "gloomy", label: "Gloomy", accent: C.amber },
      { upTo: 85, key: "average", label: "Average", accent: C.green },
      { upTo: 95, key: "upbeat", label: "Upbeat", accent: C.green },
      { upTo: Infinity, key: "euphoric", label: "Euphoric", accent: C.cool },
    ],
    heads: {
      grim: "Consumer morale is at recessionary lows.",
      gloomy: "Consumers are feeling cautious and anxious.",
      average: "Morale is in line with historical averages.",
      upbeat: "Americans feel upbeat about their finances.",
      euphoric: "Consumer confidence is in boom territory.",
    },
    subs: {
      rising: "And morale is improving.",
      cooling: "And morale is souring.",
      flat: "Holding steady.",
    },
    takeaway(v) {
      const d = Math.abs(Math.round(v - 80));
      return v >= 80
        ? `${Math.round(v)} sentiment index — ${d} pts above the 80 historical baseline.`
        : `${Math.round(v)} sentiment index — ${d} pts below the 80 historical baseline.`;
    },
    method: {
      blurb:
        "The University of Michigan Index of Consumer Sentiment surveys households across the nation on personal finances, business conditions, and buying climates. Because consumer spending drives most of the economy, sharp drops in sentiment often precede cutbacks in big-ticket purchases like cars and appliances.",
      bullets: [
        "Survey answers correlate strongly with daily gasoline prices and political polarization.",
        "Measures mood, not spending — people often continue spending even while expressing dissatisfaction.",
        "Published twice a month as a mid-month preliminary release followed by a final figure.",
      ],
      footnote: "FRED UMCSENT (consumer sentiment index)",
    },
  },

  // 26) Chicago Fed NFCI — National Financial Conditions Index (0 = historical average).
  //     Comprehensive measure of financial system risk, liquidity, and leverage.
  nfci: {
    id: "nfci",
    slug: "nfci",
    group: "markets",
    topic: "markets",
    eyebrow: "Chicago Fed NFCI · Financial Conditions",
    headline: "Is credit flowing easily?",
    short: "Financial-conditions gauge",
    decimals: 2,
    suffix: "",
    scaleMin: -1.0,
    scaleMax: 1.5,
    keyLine: { value: 0, label: "0 = HISTORIC AVG" },
    chart: { domain: [-1.0, 1.5], ticks: [-0.5, 0, 0.5], refLabel: "0 historical average" },
    bands: [
      { upTo: -0.50, key: "loose", label: "Very loose", accent: C.cool },
      { upTo: 0.00, key: "easy", label: "Accommodative", accent: C.green },
      { upTo: 0.30, key: "neutral", label: "Around average", accent: C.green },
      { upTo: 0.70, key: "tight", label: "Tight", accent: C.amber },
      { upTo: Infinity, key: "stress", label: "Financial stress", accent: C.red },
    ],
    heads: {
      loose: "Financial conditions are exceptionally loose.",
      easy: "Credit is flowing freely — conditions are accommodative.",
      neutral: "Financial conditions are tracking near historic averages.",
      tight: "Credit is tightening across financial markets.",
      stress: "Financial markets are experiencing severe stress.",
    },
    subs: {
      rising: "And credit conditions are tightening.",
      cooling: "And credit conditions are loosening.",
      flat: "Holding steady.",
    },
    takeaway(v) {
      const a = Math.abs(v).toFixed(2);
      return v <= 0
        ? `${v.toFixed(2)} NFCI — ${a} pts looser than the historical baseline.`
        : `+${v.toFixed(2)} NFCI — ${a} pts tighter than the historical baseline.`;
    },
    method: {
      blurb:
        "The Chicago Fed's National Financial Conditions Index (NFCI) synthesizes 105 indicators of risk, volatility, and credit availability across money markets, debt, and equity markets. Zero represents average historical conditions; positive readings indicate tighter-than-average financial conditions, while negative readings mean money is cheap and easily accessible.",
      bullets: [
        "A broad composite covering money markets, debt markets, equity markets, and the banking system.",
        "Negative numbers mean conditions are loose and stimulative; positive numbers mean restrictive.",
        "Sharp spikes above zero historically coincide with market liquidity freezes and credit crunches.",
      ],
      footnote: "FRED NFCI (Chicago Fed National Financial Conditions Index)",
    },
  },

  // 27) Shiller CAPE — Cyclically Adjusted Price-to-Earnings ratio (P/E10).
  //     Long-term valuation multiple smoothing corporate profits over 10 years.
  cape: {
    id: "cape",
    slug: "cape",
    group: "markets",
    topic: "markets",
    eyebrow: "Shiller CAPE · 10-Year P/E Multiple",
    headline: "Are stock valuations stretched?",
    short: "Shiller-CAPE gauge",
    decimals: 1,
    suffix: "x",
    scaleMin: 10,
    scaleMax: 45,
    keyLine: { value: 20, label: "MEDIAN ~20x" },
    chart: { domain: [10, 45], ticks: [15, 20, 32], refLabel: "~20x historical median" },
    bands: [
      { upTo: 15, key: "cheap", label: "Undervalued", accent: C.cool },
      { upTo: 22, key: "fair", label: "Fair value", accent: C.green },
      { upTo: 28, key: "elevated", label: "Elevated", accent: C.amber },
      { upTo: 35, key: "expensive", label: "Expensive", accent: C.amber },
      { upTo: Infinity, key: "mania", label: "Mania", accent: C.red },
    ],
    heads: {
      cheap: "Stock valuations are cheap relative to 10-year earnings.",
      fair: "Stock valuations sit near historical averages.",
      elevated: "Stocks are trading at an above-average multiple.",
      expensive: "Valuations are stretched well into expensive territory.",
      mania: "Valuations are at historic mania extremes.",
    },
    subs: {
      rising: "And multiples are expanding.",
      cooling: "And multiples are compressing.",
      flat: "Holding around here.",
    },
    takeaway(v) {
      const d = Math.abs(v - 20).toFixed(1);
      return v >= 20
        ? `${v.toFixed(1)}x CAPE — ${d} pts above the 20x historical median.`
        : `${v.toFixed(1)}x CAPE — ${d} pts below the 20x historical median.`;
    },
    method: {
      blurb:
        "The Shiller Cyclically Adjusted Price-to-Earnings (CAPE) ratio divides the S&P 500 price by its average inflation-adjusted earnings over the trailing ten years. Smoothing out corporate earnings over an entire business cycle provides a reliable long-term valuation compass.",
      bullets: [
        "A valuation gauge, not a market timer — stocks can stay richly valued for years before correcting.",
        "Modern accounting standards and higher corporate profit margins have lifted the long-run baseline.",
        "Historically, high starting CAPE multiples correlate with muted 10-year forward equity returns.",
      ],
      footnote: "Robert Shiller S&P 500 P/E10 (datahub s-and-p-500)",
    },
  },
};

export const GAUGE_LIST = Object.values(GAUGES);
