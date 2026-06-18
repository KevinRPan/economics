// Types for the shared market-gauge logic (runtime lives in gauges.mjs).

export const C: {
  panel: string; raised: string; line: string; text: string; muted: string;
  faint: string; green: string; amber: string; red: string; cool: string;
  backdrop: string;
};

export interface Band {
  upTo: number;
  key: string;
  label: string;
  accent: string;
}

export interface Gauge {
  id: string;
  slug: string;
  eyebrow: string;
  headline: string;
  short: string;
  decimals: number;
  suffix?: string;
  scaleMin: number;
  scaleMax: number;
  keyLine: { value: number; label: string };
  chart: { domain: [number, number]; ticks: number[]; refLabel: string };
  bands: Band[];
  heads: Record<string, string>;
  subs: { rising: string; cooling: string; flat: string };
  takeaway(value: number): string;
  method: { blurb: string; bullets: string[]; footnote: string };
}

export interface GaugeVerdict {
  key: string;
  label: string;
  accent: string;
  head: string;
  sub: string;
  rising: boolean;
  cooling: boolean;
  band: Band;
}

export interface BandSegment {
  accent: string;
  start: number;
  end: number;
}

export const GAUGES: Record<string, Gauge>;
export const GAUGE_LIST: Gauge[];

export function bandFor(gauge: Gauge, value: number): Band;
export function gaugeVerdict(gauge: Gauge, value: number, prev: number): GaugeVerdict;
export function markerPct(gauge: Gauge, value: number): number;
export function pctOf(gauge: Gauge, value: number): number;
export function bandSegments(gauge: Gauge): BandSegment[];
export function fmt(gauge: Gauge, value: number): string;
