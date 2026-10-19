// Shared contracts for the /dashboard (board + signal lab + stream).
// These shapes are the seam between the build-time data scripts and the React
// islands — change them only in coordination across all consumers.

/** "YYYY-MM" month key. */
export type MonthKey = string;

/** One monthly, contiguous series. values[i] is the month `start + i`; null = no reading. */
export interface MonthlySeries {
  start: MonthKey;
  values: (number | null)[];
}

/** A dated episode of a backtest target (e.g. one recession). */
export interface TargetEvent {
  /** first month of the episode (the month a signal is trying to see coming) */
  start: MonthKey;
  /** last month of the episode, or null if still ongoing */
  end: MonthKey | null;
}

export interface TargetDef {
  id: TargetId;
  label: string; // "Recessions"
  short: string; // "recession"
  description: string; // one plain sentence on how episodes are defined
  coverage: { start: MonthKey; end: MonthKey };
  events: TargetEvent[];
}

export type TargetId = "recession" | "bear" | "joblessjump" | "inflation" | "housing" | "fedcuts";

/** src/data/histories.json — written by scripts/build-histories.mjs. */
export interface HistoriesData {
  meta: { generatedAt: string; live: boolean; through: MonthKey };
  /** keyed by gauge id (GAUGES) plus "recession" (Sahm value, bands from recession.mjs) */
  indicators: Record<string, MonthlySeries>;
  targets: Record<TargetId, TargetDef>;
}

/** A user-built cross-signal: AND of up to 3 band conditions, optionally held N months. */
export interface SignalCondition {
  indicator: string; // gauge id or "recession"
  bands: string[]; // band keys that count as "flashing", e.g. ["inverted","deep"]
}
export interface Signal {
  conditions: SignalCondition[]; // 1..3, combined with AND
  holdMonths: number; // 0 = fires the first month all conditions hold
  target: TargetId;
  windowMonths: number; // a fire within this many months BEFORE an event's start "catches" it (default 12)
}

/** One item in the dashboard's event stream (built at build time). */
export type StreamKind = "release" | "band-change" | "on-this-day" | "upcoming";
export interface ReporterReaction {
  persona: "bull" | "bear" | "wonk" | "mainstreet";
  text: string;
}
export interface StreamItem {
  id: string;
  kind: StreamKind;
  date: string; // ISO date the item is "about" (release date, change date, upcoming date)
  indicator?: string; // gauge id when relevant
  title: string;
  body?: string;
  href?: string; // click-in link (card page)
  reactions?: ReporterReaction[];
}
