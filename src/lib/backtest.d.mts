import type {
  MonthKey,
  MonthlySeries,
  TargetEvent,
  Signal,
  HistoriesData,
} from "./dashboard-types";

export interface BandSeriesResult {
  start: MonthKey;
  bands: (string | null)[];
}

export interface BacktestEventResult {
  event: TargetEvent;
  caught: boolean;
  leadMonths: number | null;
  firstFire: MonthKey | null;
}

export interface BacktestSummary {
  caught: number;
  total: number;
  avgLead: number | null;
  falseAlarms: number;
  pending: number;
}

export interface BacktestResult {
  activeMonths: MonthKey[];
  fires: MonthKey[];
  coverage: { start: MonthKey | null; end: MonthKey | null };
  events: BacktestEventResult[];
  falseAlarms: MonthKey[];
  pending: MonthKey[];
  summary: BacktestSummary;
  isFiringNow: boolean;
}

export function parseMonth(m: MonthKey): { year: number; month: number };
export function formatMonth(year: number, month: number): MonthKey;
export function addMonths(m: MonthKey, n: number): MonthKey;
export function diffMonths(m1: MonthKey, m2: MonthKey): number;

export function bandSeries(indicatorId: string, series: MonthlySeries): BandSeriesResult;
export function getBandAt(banded: BandSeriesResult, monthKey: MonthKey): string | null;

export function evaluate(signal: Signal, histories: HistoriesData): BacktestResult;
