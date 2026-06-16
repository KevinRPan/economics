/* ───────────────────────────────────────────────────────────────────────────
   Region registry — national + all 50 states.
   `fred` is the FRED series id for the seasonally-adjusted unemployment rate:
   national = UNRATE, each state = {CODE}UR (e.g. CAUR, TXUR). `slug` is the URL
   path segment used for static routing (/recession/{slug}).
─────────────────────────────────────────────────────────────────────────── */

export const NATIONAL = { code: "national", slug: "", name: "United States", fred: "UNRATE" };

export const STATES = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"],
  ["CA", "California"], ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"],
  ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"],
  ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"],
  ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"],
  ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"],
  ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"],
  ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"],
  ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"],
  ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"],
  ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"],
  ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"],
  ["WI", "Wisconsin"], ["WY", "Wyoming"],
].map(([code, name]) => ({
  code,
  slug: code.toLowerCase(),
  name,
  fred: `${code}UR`,
}));

// All regions, national first. The card holds every region client-side.
export const REGIONS = [NATIONAL, ...STATES];

// region code ("national" | "CA" | …) → slug used in the URL.
export function slugFor(code) {
  if (code === "national") return "";
  return code.toLowerCase();
}

// slug ("" | "ca") → region code.
export function codeForSlug(slug) {
  if (!slug) return "national";
  return slug.toUpperCase();
}
