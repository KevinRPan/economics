// Types for the shared recession logic (runtime lives in recession.mjs).

export const TRIGGER: number;
export const TRIGGER_PCT: number;

export const C: {
  panel: string; raised: string; line: string; text: string; muted: string;
  faint: string; clear: string; watch: string; tripped: string; backdrop: string;
};

export type StatusKey = "clear" | "watch" | "tripped";
export interface Status {
  key: StatusKey;
  label: string;
  accent: string;
}
export interface Verdict extends Status {
  head: string;
  sub: string;
  rising: boolean;
  cooling: boolean;
}

export function statusFor(v: number): Status;
export function verdict(v: number, prev: number): Verdict;
export function headroomFor(v: number): number;
export function takeawayFor(v: number): string;
export function markerPctFor(v: number): number;
