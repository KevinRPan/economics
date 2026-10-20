/* ───────────────────────────────────────────────────────────────────────────
   Board logic — catalog, topics, quiz mapping, URL & storage persistence,
   and precedence resolution for /dashboard. Plain .mjs so tests and islands
   can import it directly.
─────────────────────────────────────────────────────────────────────────── */

import { GAUGES } from "./gauges.mjs";

export const BOARD_STORAGE_KEY = "econ.board.v1";
export const MAX_BOARD_SIZE = 12;

export const TOPICS = [
  { id: "jobs", label: "Jobs", desc: "Layoffs, wage growth, hiring pace" },
  { id: "prices", label: "Prices", desc: "Inflation, gas prices, dollar strength" },
  { id: "housing", label: "Housing", desc: "Mortgage rates, home prices, rent burden" },
  { id: "markets", label: "Markets", desc: "Stock valuations, volatility, credit risk" },
  { id: "growth", label: "Growth", desc: "Recession odds, GDP, manufacturing output" },
  { id: "fed", label: "The Fed", desc: "Interest rates, rate cuts, inflation targets" },
  { id: "households", label: "Households", desc: "Consumer sentiment, debt stress, savings" },
];

export const INDICATOR_TOPICS = {
  // Existing gauges + recession
  recession: "jobs",
  curve: "fed",
  inflation: "prices",
  wages: "jobs",
  housing: "housing",
  stress: "households",
  mood: "markets",
  buffett: "markets",
  vix: "markets",
  credit: "markets",
  // New indicators from BRIEF.md
  claims: "jobs",
  payrolls: "jobs",
  openings: "jobs",
  quits: "jobs",
  gdp: "growth",
  indpro: "growth",
  retail: "growth",
  permits: "housing",
  fedfunds: "fed",
  corepce: "fed",
  breakeven: "fed",
  gas: "prices",
  oil: "prices",
  dollar: "prices",
  savings: "households",
  sentiment: "households",
  nfci: "markets",
  cape: "markets",
};

// Fallback metadata for all 28 indicators so the board works even before
// Catalog Copy (A2) lands every new indicator definition in GAUGES.
export const FALLBACK_CATALOG = {
  recession: {
    id: "recession",
    slug: "recession",
    eyebrow: "Sahm Rule · Recession Nowcast",
    headline: "Are we in a recession?",
    topic: "jobs",
    group: "economy",
  },
  claims: {
    id: "claims",
    slug: "claims",
    eyebrow: "Initial Jobless Claims · Weekly Layoffs",
    headline: "Are layoffs spiking?",
    topic: "jobs",
    group: "economy",
  },
  payrolls: {
    id: "payrolls",
    slug: "payrolls",
    eyebrow: "Nonfarm Payrolls · Net Jobs Created",
    headline: "Is hiring slowing down?",
    topic: "jobs",
    group: "economy",
  },
  openings: {
    id: "openings",
    slug: "openings",
    eyebrow: "Job Openings Ratio · Openings Per Unemployed",
    headline: "Are jobs getting harder to find?",
    topic: "jobs",
    group: "economy",
  },
  quits: {
    id: "quits",
    slug: "quits",
    eyebrow: "Quits Rate · Worker Confidence",
    headline: "Are workers confident enough to quit?",
    topic: "jobs",
    group: "economy",
  },
  gdp: {
    id: "gdp",
    slug: "gdp",
    eyebrow: "Real GDP Growth · Economic Expansion",
    headline: "Is the economy still growing?",
    topic: "growth",
    group: "economy",
  },
  indpro: {
    id: "indpro",
    slug: "indpro",
    eyebrow: "Industrial Production · Factory & Mine Output",
    headline: "Is factory output holding up?",
    topic: "growth",
    group: "economy",
  },
  retail: {
    id: "retail",
    slug: "retail",
    eyebrow: "Real Retail Sales · Consumer Spending Volume",
    headline: "Are shoppers pulling back?",
    topic: "growth",
    group: "economy",
  },
  permits: {
    id: "permits",
    slug: "permits",
    eyebrow: "Building Permits · Future Home Construction",
    headline: "Is homebuilding cooling off?",
    topic: "housing",
    group: "economy",
  },
  fedfunds: {
    id: "fedfunds",
    slug: "fedfunds",
    eyebrow: "Fed Funds Rate · Benchmark Borrowing Cost",
    headline: "Is the Fed keeping rates high?",
    topic: "fed",
    group: "economy",
  },
  corepce: {
    id: "corepce",
    slug: "corepce",
    eyebrow: "Core PCE · The Fed's Preferred Inflation Gauge",
    headline: "Is underlying inflation under control?",
    topic: "fed",
    group: "economy",
  },
  breakeven: {
    id: "breakeven",
    slug: "breakeven",
    eyebrow: "10-Year Breakeven · Inflation Expectations",
    headline: "Do markets expect high inflation?",
    topic: "fed",
    group: "economy",
  },
  gas: {
    id: "gas",
    slug: "gas",
    eyebrow: "Regular Gasoline · Pump Prices",
    headline: "Are gas prices squeezing drivers?",
    topic: "prices",
    group: "economy",
  },
  oil: {
    id: "oil",
    slug: "oil",
    eyebrow: "WTI Crude Oil · Energy Benchmark",
    headline: "Is crude oil driving up costs?",
    topic: "prices",
    group: "economy",
  },
  dollar: {
    id: "dollar",
    slug: "dollar",
    eyebrow: "US Dollar Index · Greenback Strength",
    headline: "Is a strong dollar hurting trade?",
    topic: "prices",
    group: "economy",
  },
  savings: {
    id: "savings",
    slug: "savings",
    eyebrow: "Personal Saving Rate · Rainy-Day Cushion",
    headline: "Are families saving enough?",
    topic: "households",
    group: "economy",
  },
  sentiment: {
    id: "sentiment",
    slug: "sentiment",
    eyebrow: "Consumer Sentiment · Household Mood",
    headline: "Are consumers feeling optimistic?",
    topic: "households",
    group: "economy",
  },
  nfci: {
    id: "nfci",
    slug: "nfci",
    eyebrow: "Financial Conditions (NFCI) · Credit Tightness",
    headline: "Are financial conditions tightening?",
    topic: "markets",
    group: "markets",
  },
  cape: {
    id: "cape",
    slug: "cape",
    eyebrow: "Shiller CAPE · 10-Year P/E Ratio",
    headline: "Are stocks historically expensive?",
    topic: "markets",
    group: "markets",
  },
};

/**
 * Builds the full catalog of all board-able indicators:
 * every GAUGES entry + recession + fallback entries for new indicators.
 */
export function getCatalog(customGauges = GAUGES) {
  const catalog = { ...FALLBACK_CATALOG };
  for (const [id, gauge] of Object.entries(customGauges)) {
    catalog[id] = {
      id: gauge.id,
      slug: gauge.slug || id,
      eyebrow: gauge.eyebrow || catalog[id]?.eyebrow || id,
      headline: gauge.headline || catalog[id]?.headline || id,
      topic: gauge.topic || catalog[id]?.topic || INDICATOR_TOPICS[id] || "economy",
      group: gauge.group || catalog[id]?.group || "economy",
    };
  }
  return catalog;
}

export const CATALOG = getCatalog();

export function isValidIndicatorId(id, customCatalog = CATALOG) {
  return typeof id === "string" && Boolean(customCatalog[id]);
}

/**
 * 'Just show me the big picture' one-click board:
 * [recession, curve, inflation, claims, credit, mood, housing, sentiment]
 */
export const BIG_PICTURE_BOARD = [
  "recession",
  "curve",
  "inflation",
  "claims",
  "credit",
  "mood",
  "housing",
  "sentiment",
];

export const TOPIC_INDICATORS = {
  jobs: ["recession", "claims", "wages", "payrolls", "openings", "quits"],
  prices: ["inflation", "gas", "oil", "dollar"],
  housing: ["housing", "permits"],
  markets: ["credit", "mood", "vix", "buffett", "nfci", "cape"],
  growth: ["gdp", "indpro", "retail"],
  fed: ["curve", "fedfunds", "corepce", "breakeven"],
  households: ["sentiment", "stress", "savings"],
};

/**
 * Maps multi-selected topics from the onboarding quiz to 6–8 starter indicators.
 * If topics is empty, returns BIG_PICTURE_BOARD.
 */
export function buildStarterBoard(selectedTopics = [], customCatalog = CATALOG) {
  if (!Array.isArray(selectedTopics) || selectedTopics.length === 0) {
    return BIG_PICTURE_BOARD.filter((id) => isValidIndicatorId(id, customCatalog));
  }

  const chosenTopics = selectedTopics.filter((t) => TOPIC_INDICATORS[t]);
  if (chosenTopics.length === 0) {
    return BIG_PICTURE_BOARD.filter((id) => isValidIndicatorId(id, customCatalog));
  }

  const result = [];
  const seen = new Set();

  function add(id) {
    if (isValidIndicatorId(id, customCatalog) && !seen.has(id) && result.length < 8) {
      seen.add(id);
      result.push(id);
    }
  }

  // Round-robin through chosen topics to give balanced coverage
  let maxDepth = Math.max(...chosenTopics.map((t) => TOPIC_INDICATORS[t].length));
  for (let depth = 0; depth < maxDepth; depth++) {
    for (const topic of chosenTopics) {
      const id = TOPIC_INDICATORS[topic]?.[depth];
      if (id) add(id);
      if (result.length >= 8) break;
    }
    if (result.length >= 8) break;
  }

  // If fewer than 6, backfill from BIG_PICTURE_BOARD
  if (result.length < 6) {
    for (const id of BIG_PICTURE_BOARD) {
      add(id);
      if (result.length >= 6) break;
    }
  }

  return result;
}

/**
 * Encodes an array of board IDs into ?b= param string (comma-separated).
 * Validates, dedupes, caps at 12.
 */
export function encodeBoard(boardIds, customCatalog = CATALOG) {
  if (!Array.isArray(boardIds)) return "";
  const seen = new Set();
  const valid = [];
  for (const id of boardIds) {
    if (isValidIndicatorId(id, customCatalog) && !seen.has(id)) {
      seen.add(id);
      valid.push(id);
      if (valid.length >= MAX_BOARD_SIZE) break;
    }
  }
  return valid.join(",");
}

/**
 * Decodes a board parameter string or URL into validated, deduped indicator IDs (capped at 12).
 * Gracefully ignores unknown or malformed IDs.
 */
export function decodeBoard(input, customCatalog = CATALOG) {
  if (!input || typeof input !== "string") return [];
  let raw = input.trim();
  if (raw.includes("?")) {
    try {
      const q = raw.slice(raw.indexOf("?") + 1);
      const params = new URLSearchParams(q);
      const b = params.get("b");
      if (!b) return [];
      raw = b;
    } catch {
      return [];
    }
  } else if (raw.startsWith("b=")) {
    raw = raw.slice(2);
  }

  const parts = raw.split(",").map((s) => s.trim().toLowerCase());
  const seen = new Set();
  const result = [];
  for (const id of parts) {
    if (id && isValidIndicatorId(id, customCatalog) && !seen.has(id)) {
      seen.add(id);
      result.push(id);
      if (result.length >= MAX_BOARD_SIZE) break;
    }
  }
  return result;
}

/**
 * Reads the stored board from localStorage (key: econ.board.v1).
 * Returns string[] or null if absent/invalid.
 */
export function loadStoredBoard(storage = (typeof window !== "undefined" ? window.localStorage : null)) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(BOARD_STORAGE_KEY);
    if (!raw) return null;
    let list = [];
    if (raw.startsWith("[") && raw.endsWith("]")) {
      list = JSON.parse(raw);
    } else {
      list = raw.split(",");
    }
    const decoded = decodeBoard(list.join(","));
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
}

/**
 * Saves a validated board to localStorage.
 */
export function saveStoredBoard(boardIds, storage = (typeof window !== "undefined" ? window.localStorage : null)) {
  if (!storage || !Array.isArray(boardIds)) return false;
  try {
    const valid = decodeBoard(boardIds.join(","));
    storage.setItem(BOARD_STORAGE_KEY, JSON.stringify(valid));
    return true;
  } catch {
    return false;
  }
}

/**
 * Clears stored board in localStorage.
 */
export function clearStoredBoard(storage = (typeof window !== "undefined" ? window.localStorage : null)) {
  if (!storage) return false;
  try {
    storage.removeItem(BOARD_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * Precedence resolver: URL (?b=) > localStorage (econ.board.v1) > quiz / default.
 */
export function resolveInitialBoard({
  urlSearch,
  storedBoard,
  defaultBoard = BIG_PICTURE_BOARD,
  customCatalog = CATALOG,
}) {
  if (urlSearch) {
    const urlDecoded = decodeBoard(urlSearch, customCatalog);
    if (urlDecoded.length > 0) {
      return { board: urlDecoded, source: "url" };
    }
  }

  if (storedBoard && storedBoard.length > 0) {
    const storeDecoded = decodeBoard(storedBoard.join(","), customCatalog);
    if (storeDecoded.length > 0) {
      return { board: storeDecoded, source: "storage" };
    }
  }

  return { board: defaultBoard.filter((id) => isValidIndicatorId(id, customCatalog)), source: "quiz" };
}
