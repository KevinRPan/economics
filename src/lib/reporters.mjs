/* ───────────────────────────────────────────────────────────────────────────
   Fictional Newsroom Desk — 4 recurring reporter personas.

   Provides distinct, entertaining, yet honest commentary on economic releases
   and band shifts:
   - bull: Chet Rally (Wall Street optimist, sees soft landings & upside)
   - bear: Doris Gloom (Hard-money skeptic, debt cycle analyst, cautious)
   - wonk: Dr. Priya Basis (Ex-Fed staffer, shares real teaching nuggets)
   - mainstreet: Sal from the Diner (Small business owner, eggs & payroll)

   Reactions are 100% templated & deterministic (no LLM, stable builds via
   hash of event id). Personas are strictly fictional, never invent facts,
   use only real numbers/labels passed in, and keep each reaction ≤ 150 chars.
─────────────────────────────────────────────────────────────────────────── */

export const REPORTERS = {
  bull: {
    id: "bull",
    name: "Chet Rally",
    title: "Perma-Bull · Wall Street optimist",
    bio: "Sees every dip as a buying opportunity and every rate cut as fuel.",
    avatar: "/reporters/bull.png",
    initials: "CR",
    accent: "#4FD1A8", // green / upbeat
  },
  bear: {
    id: "bear",
    name: "Doris Gloom",
    title: "Doom-Bear · Hard-money skeptic",
    bio: "Predicted 12 of the last 2 recessions. Distrusts easy credit.",
    avatar: "/reporters/bear.png",
    initials: "DG",
    accent: "#FF6B5E", // red / caution
  },
  wonk: {
    id: "wonk",
    name: "Dr. Priya Basis",
    title: "Policy Wonk · Former Fed staffer",
    bio: "Watches base effects, neutral rates (r*), and the second derivative.",
    avatar: "/reporters/wonk.png",
    initials: "PB",
    accent: "#5BA8D0", // cool / blue / analytical
  },
  mainstreet: {
    id: "mainstreet",
    name: "Sal from the Diner",
    title: "Main Street · Small-business owner",
    bio: "Measures the economy by egg crates, customer tabs, and foot traffic.",
    avatar: "/reporters/mainstreet.png",
    initials: "SD",
    accent: "#F2B544", // amber / pragmatic
  },
};

export const REPORTER_IDS = ["bull", "bear", "wonk", "mainstreet"];

// Deterministic 32-bit FNV-1a hash for stable builds
export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

// Classify band key / accent into severity: "calm" | "warning" | "stressed"
export function classifySeverity(bandKey = "", accent = "") {
  const k = bandKey.toLowerCase();
  if (accent === "#FF6B5E" || ["deep", "inverted", "high", "falling", "burdened", "extreme", "crisis", "mania", "fear", "stress", "tripped"].includes(k)) {
    return "stressed";
  }
  if (accent === "#F2B544" || ["flat", "target", "below", "cautious", "anxious", "stretched", "rising", "elevated", "greedy", "reaching", "watch"].includes(k)) {
    return "warning";
  }
  return "calm";
}

// Indicator-specific templates
const INDICATOR_TEMPLATES = {
  inflation: {
    bull: [
      (v) => `Disinflation stays alive at ${v}. That gives the Fed all the runway needed to ease policy.`,
      (v) => `${v} keeps real purchasing power expanding. Lower cost pressures mean margins hold.`,
      (v) => `Market shrugging off the noise at ${v}. Trend is our friend — soft landing stays on track.`,
    ],
    bear: [
      (v) => `Headline at ${v} ignores cumulative pain: prices are up over 20% since 2020.`,
      (v) => `At ${v}, sticky services and energy keep inflation well above the 2% holy grail.`,
      (v) => `Easy money is trying to declare victory at ${v}, but price stability is far from restored.`,
    ],
    wonk: [
      (v) => `Remember base effects: 12-month CPI at ${v} moves as old volatile monthly prints drop out.`,
      (v) => `At ${v}, watch supercore (services ex-housing) to isolate wage-driven momentum.`,
      (v) => `Policy lag is 12-18 months. Today's ${v} reflects rate moves made over a year ago.`,
    ],
    mainstreet: [
      (v) => `Tell my bacon supplier inflation is ${v}. My breakfast special price still can't come down.`,
      (v) => `At ${v}, folks still wince at the register. A cup of coffee shouldn't feel like a splurge.`,
      (v) => `Wholesale goods eased a little, but kitchen utilities and insurance at ${v} keep squeezing us.`,
    ],
  },
  claims: {
    bull: [
      (v) => `Claims at ${v} show labor resilience. Firings remain near historic lows.`,
      (v) => `Healthy turnover at ${v}. A gentle rebalancing without widespread job destruction.`,
      (v) => `${v} is goldilocks territory — not too tight to overheat, not weak enough to panic.`,
    ],
    bear: [
      (v) => `Claims at ${v} are the first tremor. Small business margins are cracking under rates.`,
      (v) => `Don't ignore continuing claims alongside ${v} — once workers lose jobs, finding one takes longer.`,
      (v) => `${v} is before corporate refinancing cliffs hit. Layoff waves usually lag earnings drops.`,
    ],
    wonk: [
      (v) => `At ${v}, always track the 4-week moving average to filter out seasonal holiday noise.`,
      (v) => `Initial claims at ${v} are high-frequency and non-revised, making them a pristine leading gauge.`,
      (v) => `Low claims (${v}) suggest low worker separation rates rather than rapid new hiring.`,
    ],
    mainstreet: [
      (v) => `Claims at ${v}? I put a help-wanted sign in my window and had 20 resumes by noon.`,
      (v) => `Claims at ${v}? Folks working two part-time shifts don't always file. Foot traffic tells the story.`,
      (v) => `At ${v}, good reliable cooks are still tough to find, but tip jars aren't as heavy as 2022.`,
    ],
  },
  curve: {
    bull: [
      (v) => `Curve at ${v} is normalizing. The steepener is classic early-cycle reflation fuel.`,
      (v) => `Un-inversion at ${v} lets banks lend profitably again. Financial plumbing is unblocking.`,
      (v) => `Yield curve at ${v} reflects rate cuts arriving right on time. Bullish for equities.`,
    ],
    bear: [
      (v) => `History lesson: curve at ${v} un-inverts right before recessions begin, not after.`,
      (v) => `A bull-steepener to ${v} driven by front-end panic cuts is not an economic all-clear.`,
      (v) => `The curve spent months deeply inverted. The delayed fallout at ${v} is just starting.`,
    ],
    wonk: [
      (v) => `The 10y-3m spread at ${v} combines expected short rate paths with the term premium.`,
      (v) => `Near-term forward spread (6-quarter ahead vs 3-month) corroborates the ${v} curve signal.`,
      (v) => `At ${v}, the lag between inversion and NBER cycle peaks historically averages 14 months.`,
    ],
    mainstreet: [
      (v) => `Spread at ${v} means little at the counter — but our equipment loan rate is still 8.25%.`,
      (v) => `Bank manager says lending might loosen at ${v}. We'll believe it when our credit line expands.`,
      (v) => `Whether the curve is ${v} or flat, ordinary folks just want monthly car payments to come down.`,
    ],
  },
  recession: {
    bull: [
      (v) => `Sahm indicator at ${v} keeps the economy out of the danger zone. Expansion continues!`,
      (v) => `No recession in sight at ${v}. Strong balance sheets and productivity carry the day.`,
      (v) => `Labor markets remain historically intact at ${v}. Stay invested and compound.`,
    ],
    bear: [
      (v) => `Sahm indicator at ${v} is creeping up. Once unemployment momentum starts, it cascades.`,
      (v) => `Even at ${v}, the buffer before triggering the 0.50 threshold is paper thin.`,
      (v) => `Downturns happen gradually then suddenly. A reading of ${v} is no guarantee of safety.`,
    ],
    wonk: [
      (v) => `The Sahm rule trigger at 0.50 pt (now ${v}) exploits non-linear firing feedback loops.`,
      (v) => `At ${v}, Sahm uses 3-month moving average of unemployment to filter monthly survey noise.`,
      (v) => `Claudia Sahm designed this indicator (${v}) as an empirical nowcast with zero false positives.`,
    ],
    mainstreet: [
      (v) => `Economists call it ${v}. At the diner, families are ordering waters instead of sodas.`,
      (v) => `At ${v}, everyday folks are watching their spending. Retail traffic is noticeably cautious.`,
      (v) => `Clear or watch at ${v}, my supplier bills are due on the 1st regardless of official labels.`,
    ],
  },
  housing: {
    bull: [
      (v) => `Housing burden at ${v} is supported by wage growth and massive home equity wealth.`,
      (v) => `Severe demographic undersupply makes housing resilient even at ${v} payment shares.`,
      (v) => `Any mortgage rate dip with affordability at ${v} will unleash pent-up buyer demand.`,
    ],
    bear: [
      (v) => `At ${v} of income, the median house is completely unaffordable for regular families.`,
      (v) => `Housing is frozen at ${v}. When affordability breaks, transaction volume collapses first.`,
      (v) => `Mortgage payments eating ${v} of wages guarantees consumer discretionary spending suffers.`,
    ],
    wonk: [
      (v) => `Payment burden of ${v} vs the 30% guideline measures macro debt service ratio pressure.`,
      (v) => `At ${v}, lock-in effects from 3% legacy mortgages distort inventory and price discovery.`,
      (v) => `Housing represents ~40% of core CPI basket; relief here at ${v} filters through with a lag.`,
    ],
    mainstreet: [
      (v) => `My head waitress can't buy at ${v} and her rent jumped $150. Housing is crushing young folks.`,
      (v) => `At ${v}, starter homes are a fairy tale. Kids in our town are staying in their parents' basements.`,
      (v) => `When housing takes ${v} of income, people don't eat dinner out on Thursday nights.`,
    ],
  },
};

// Generic templates by severity & direction
const GENERIC_RELEASE_TEMPLATES = {
  bull: {
    calm: [
      (v, name) => `${name} at ${v} shows steady underlying momentum. No reason to jump off the bull train.`,
      (v, name) => `Solid print for ${name} (${v}). Fundamentals continue to defy the doom-mongers.`,
      (v, name) => `${name} at ${v} is an encouraging sign. Corporate earnings power remains robust.`,
    ],
    warning: [
      (v, name) => `${name} reading of ${v} is just a temporary wobble. Secular tailwinds will prevail.`,
      (v, name) => `A cautious ${v} on ${name} actually keeps rate cuts on the table. Win-win for stocks.`,
      (v, name) => `Markets thrive on climbing walls of worry — ${name} at ${v} is just another brick.`,
    ],
    stressed: [
      (v, name) => `Panic over ${name} at ${v} is overdone. Great long-term entry points are born here.`,
      (v, name) => `Spike to ${v} on ${name} is backward-looking. Forward guidance looks much brighter.`,
      (v, name) => `${name} at ${v} creates volatility, and volatility creates opportunity for buyers.`,
    ],
  },
  bear: {
    calm: [
      (v, name) => `${name} at ${v} is the calm before the storm. Lagged effects haven't fully bitten yet.`,
      (v, name) => `Don't be lulled by ${name} at ${v}. Peak complacency always precedes the drawdown.`,
      (v, name) => `Surface stability in ${name} (${v}) masks deteriorating corporate credit cushions.`,
    ],
    warning: [
      (v, name) => `${name} at ${v} is flashing yellow. Cracks in the cycle are becoming undeniable.`,
      (v, name) => `Watch ${name} at ${v} carefully. Risk-reward for extended assets looks terrible here.`,
      (v, name) => `Warning bells at ${v} for ${name}. Debt-fueled expansions always hit an abrupt wall.`,
    ],
    stressed: [
      (v, name) => `${name} at ${v} confirms the macro thesis. Excesses are finally unwinding painfully.`,
      (v, name) => `Severe stress in ${name} (${v}). Liquidity drains quickly once confidence breaks down.`,
      (v, name) => `At ${v}, ${name} shows the bill has arrived. Capital preservation is priority one.`,
    ],
  },
  wonk: {
    calm: [
      (v, name) => `${name} at ${v} sits comfortably within historical distribution bounds. Low cycle variance.`,
      (v, name) => `Reading of ${v} on ${name} implies balanced aggregate supply and demand conditions.`,
      (v, name) => `Notice ${name} at ${v}: trend dispersion is tight and standard errors are low this cycle.`,
    ],
    warning: [
      (v, name) => `At ${v}, ${name} enters the upper quartile of historical volatility. Transmission lags matter.`,
      (v, name) => `${name} print of ${v} alters policy reaction probabilities at upcoming FOMC rounds.`,
      (v, name) => `Watch the cross-elasticity: ${name} at ${v} exerts indirect drag on credit availability.`,
    ],
    stressed: [
      (v, name) => `${name} at ${v} signals non-linear risk. Financial condition tightening accelerates here.`,
      (v, name) => `At ${v}, ${name} approaches critical stress thresholds where tail risk pricing shifts.`,
      (v, name) => `Empirical precedent: when ${name} touches ${v}, real activity metrics degrade within 2 quarters.`,
    ],
  },
  mainstreet: {
    calm: [
      (v, name) => `${name} at ${v} feels about right. Customers are paying cash and ordering usuals.`,
      (v, name) => `Things feel predictable with ${name} at ${v}. Steady business is good business.`,
      (v, name) => `At ${v} for ${name}, regular folks can plan next month's budget without white knuckles.`,
    ],
    warning: [
      (v, name) => `${name} at ${v}? Noticed folks skipping dessert and second coffees lately.`,
      (v, name) => `When ${name} hits ${v}, my delivery drivers talk about their utility bills rising.`,
      (v, name) => `Cautious vibe at ${v} on ${name}. Small businesses feel the pinch before spreadsheets do.`,
    ],
    stressed: [
      (v, name) => `${name} at ${v} hurts. Our card processing and vendor supplies take bigger bites daily.`,
      (v, name) => `At ${v} on ${name}, customers tighten their belts. You can feel the quiet in the dining room.`,
      (v, name) => `Numbers like ${v} for ${name} mean tough talks about hourly scheduling and overtime.`,
    ],
  },
};

// Band change templates
const BAND_CHANGE_TEMPLATES = {
  bull: [
    (name, _from, to) => `${name} shifting to ${to}? Markets love clarity. This opens up upside room!`,
    (name, from, to) => `From ${from} to ${to} on ${name} removes uncertainty. Dip buyers get rewarded here.`,
    (name, _from, to) => `Reclassification to ${to} for ${name} is backward-looking. Forward outlook is bright.`,
  ],
  bear: [
    (name, _from, to) => `${name} crossed into ${to}. The cycle is turning and risk is mispriced.`,
    (name, from, to) => `Leaving ${from} for ${to} on ${name} marks the start of the squeeze. Don't look away.`,
    (name, _from, to) => `A move to ${to} in ${name} confirms systemic friction. Downside protection is key.`,
  ],
  wonk: [
    (name, from, to) => `${name} transition (${from} → ${to}) shifts empirical regime probabilities in macro models.`,
    (name, _from, to) => `Crossing to ${to} on ${name} alters institutional risk-budgeting and balance sheet charges.`,
    (name, _from, to) => `Band shift to ${to} (${name}) reflects threshold effects in credit and liquidity spreads.`,
  ],
  mainstreet: [
    (name, from, to) => `From ${from} to ${to} for ${name}? Every time paper shifts, real costs creep up.`,
    (name, _from, to) => `Label change to ${to} on ${name}. All I know is our egg supplier bill went up again.`,
    (name, _from, to) => `${name} is in ${to} now. Hope that means loan rates ease up for the hardware store next door.`,
  ],
};

function clampLength(text, maxLen = 150) {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1).trim() + "…";
}

/**
 * Generate 2-3 deterministic reporter reactions for an event.
 * @param {Object} event
 * @param {string} event.id
 * @param {"release" | "band-change"} event.kind
 * @param {string} [event.indicator]
 * @param {string} [event.indicatorLabel]
 * @param {string|number} [event.value]
 * @param {string|number} [event.prevValue]
 * @param {string} [event.bandKey]
 * @param {string} [event.bandLabel]
 * @param {string} [event.accent]
 * @param {string} [event.fromBand]
 * @param {string} [event.toBand]
 * @param {string} [event.direction]
 * @returns {Array<{ persona: "bull"|"bear"|"wonk"|"mainstreet", text: string }>}
 */
export function generateReactions(event) {
  const { id = "event", kind = "release", indicator = "", indicatorLabel = indicator || "Indicator" } = event;
  const hash = hashString(id);

  // Pick 2 or 3 personas deterministically (rotating combinations)
  // Ensure balanced coverage across all 4 personas
  const count = (hash % 2 === 0) ? 2 : 3;
  const startIndex = hash % REPORTER_IDS.length;
  const selectedPersonas = [];
  for (let i = 0; i < count; i++) {
    selectedPersonas.push(REPORTER_IDS[(startIndex + i) % REPORTER_IDS.length]);
  }

  const reactions = [];
  const severity = classifySeverity(event.bandKey || event.toBand, event.accent);
  const valStr = event.value != null ? String(event.value) : "latest reading";
  const fromBand = event.fromBand || "Previous";
  const toBand = event.toBand || event.bandLabel || "New";

  for (const persona of selectedPersonas) {
    const personaHash = hashString(`${id}-${persona}`);
    let text = "";

    if (kind === "band-change") {
      const templates = BAND_CHANGE_TEMPLATES[persona] || BAND_CHANGE_TEMPLATES.wonk;
      const t = templates[personaHash % templates.length];
      text = t(indicatorLabel, fromBand, toBand);
    } else {
      // Check indicator-specific templates first
      const indGroup = INDICATOR_TEMPLATES[indicator];
      if (indGroup && indGroup[persona] && indGroup[persona].length > 0) {
        const t = indGroup[persona][personaHash % indGroup[persona].length];
        text = t(valStr);
      } else {
        // Fall back to generic release templates
        const severityGroup = GENERIC_RELEASE_TEMPLATES[persona]?.[severity] || GENERIC_RELEASE_TEMPLATES[persona]?.calm;
        const t = severityGroup[personaHash % severityGroup.length];
        text = t(valStr, indicatorLabel);
      }
    }

    reactions.push({
      persona,
      text: clampLength(text, 150),
    });
  }

  return reactions;
}
