// Types for the region registry (runtime lives in regions.mjs).

export interface Region {
  code: string;
  slug: string;
  name: string;
  fred: string;
}

export const NATIONAL: Region;
export const STATES: Region[];
export const REGIONS: Region[];

export function slugFor(code: string): string;
export function codeForSlug(slug: string): string;
