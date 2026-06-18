// Shape of src/data/recession.json (written by scripts/fetch-data.mjs).

export interface SeriesPoint {
  t: string;
  sahm: number;
}

export interface RegionData {
  code: string;
  slug: string;
  name: string;
  value: number;
  prev: number;
  computed: boolean;
  asOf: string;
  series: SeriesPoint[];
}

export interface RecessionData {
  meta: {
    trigger: number;
    asOf: string;
    asOfLabel: string;
    generatedAt: string;
    source: string;
    live: boolean;
    crossCheck: Record<string, number | null>;
  };
  regions: Record<string, RegionData>;
}
