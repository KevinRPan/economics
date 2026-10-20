import type { TargetId, TargetEvent, TargetDef, MonthKey } from "./dashboard-types.js";

export interface TargetMetaItem {
  id: TargetId;
  label: string;
  short: string;
  description: string;
}

export declare const TARGET_META: Record<TargetId, TargetMetaItem>;

export declare function parseMonth(str: string): [number, number];
export declare function formatMonth(y: number, m: number): MonthKey;
export declare function addMonths(monthKey: MonthKey, n: number): MonthKey;
export declare function monthDiff(a: MonthKey, b: MonthKey): number;
export declare function normalizeSeries(input: any): { date: MonthKey; value: number | null }[];
export declare function mergeEpisodes(episodes: TargetEvent[], minSeparation?: number): TargetEvent[];

export declare function computeRecessions(series: any): TargetEvent[];
export declare function computeBear(series: any): TargetEvent[];
export declare function computeJoblessJump(series: any): TargetEvent[];
export declare function computeInflationSpikes(series: any): TargetEvent[];
export declare function computeHousingDrops(series: any): TargetEvent[];
export declare function computeFedCuts(series: any): TargetEvent[];
export declare function computeTargetEvents(targetId: TargetId, series: any): TargetEvent[];
