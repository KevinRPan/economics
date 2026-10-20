import { describe, it, expect } from "vitest";
import {
  TARGET_META,
  monthDiff,
  addMonths,
  mergeEpisodes,
  computeRecessions,
  computeBear,
  computeJoblessJump,
  computeInflationSpikes,
  computeHousingDrops,
  computeFedCuts,
} from "../src/lib/targets.mjs";

describe("TARGET_META", () => {
  it("contains metadata for all 6 target ids", () => {
    const ids = ["recession", "bear", "joblessjump", "inflation", "housing", "fedcuts"];
    expect(Object.keys(TARGET_META).sort()).toEqual(ids.sort());
    for (const id of ids) {
      expect(TARGET_META[id].id).toBe(id);
      expect(typeof TARGET_META[id].label).toBe("string");
      expect(typeof TARGET_META[id].short).toBe("string");
      expect(typeof TARGET_META[id].description).toBe("string");
      expect(TARGET_META[id].description.length).toBeGreaterThan(15);
    }
  });
});

describe("Month helpers", () => {
  it("computes monthDiff accurately across years", () => {
    expect(monthDiff("2020-01", "2020-01")).toBe(0);
    expect(monthDiff("2020-01", "2020-02")).toBe(1);
    expect(monthDiff("2020-01", "2020-07")).toBe(6);
    expect(monthDiff("2020-01", "2021-01")).toBe(12);
    expect(monthDiff("2021-01", "2020-01")).toBe(-12);
  });

  it("adds months across year boundaries", () => {
    expect(addMonths("2020-01", 1)).toBe("2020-02");
    expect(addMonths("2020-01", 12)).toBe("2021-01");
    expect(addMonths("2020-01", -1)).toBe("2019-12");
    expect(addMonths("2020-01", -12)).toBe("2019-01");
  });
});

describe("mergeEpisodes", () => {
  it("leaves empty or single episodes unchanged", () => {
    expect(mergeEpisodes([])).toEqual([]);
    expect(mergeEpisodes([{ start: "2020-01", end: "2020-03" }])).toEqual([
      { start: "2020-01", end: "2020-03" },
    ]);
  });

  it("merges adjacent episodes (0 months between)", () => {
    // 2020-01 to 2020-03, then 2020-04 to 2020-06
    const eps = [
      { start: "2020-01", end: "2020-03" },
      { start: "2020-04", end: "2020-06" },
    ];
    expect(mergeEpisodes(eps)).toEqual([{ start: "2020-01", end: "2020-06" }]);
  });

  it("merges episodes separated by < 6 months (5 intervening months)", () => {
    // End = 2020-01, Start = 2020-07. Intervening months: Feb, Mar, Apr, May, Jun (5 months)
    const eps = [
      { start: "2019-10", end: "2020-01" },
      { start: "2020-07", end: "2020-12" },
    ];
    expect(mergeEpisodes(eps)).toEqual([{ start: "2019-10", end: "2020-12" }]);
  });

  it("does not merge episodes separated by 6 months", () => {
    // End = 2020-01, Start = 2020-08. Intervening months: Feb, Mar, Apr, May, Jun, Jul (6 months)
    const eps = [
      { start: "2019-10", end: "2020-01" },
      { start: "2020-08", end: "2020-12" },
    ];
    expect(mergeEpisodes(eps)).toEqual([
      { start: "2019-10", end: "2020-01" },
      { start: "2020-08", end: "2020-12" },
    ]);
  });

  it("merges chained episodes", () => {
    const eps = [
      { start: "2020-01", end: "2020-03" },
      { start: "2020-06", end: "2020-08" }, // 2 months gap
      { start: "2020-11", end: "2021-02" }, // 2 months gap
    ];
    expect(mergeEpisodes(eps)).toEqual([{ start: "2020-01", end: "2021-02" }]);
  });

  it("handles ongoing episodes (end = null)", () => {
    const eps = [
      { start: "2019-01", end: "2019-05" },
      { start: "2020-01", end: null },
    ];
    expect(mergeEpisodes(eps)).toEqual([
      { start: "2019-01", end: "2019-05" },
      { start: "2020-01", end: null },
    ]);
  });
});

describe("computeRecessions", () => {
  it("identifies contiguous USREC=1 blocks", () => {
    const series = [
      { date: "2020-01", value: 0 },
      { date: "2020-02", value: 1 },
      { date: "2020-03", value: 1 },
      { date: "2020-04", value: 1 },
      { date: "2020-05", value: 0 },
      { date: "2020-06", value: 0 },
    ];
    expect(computeRecessions(series)).toEqual([{ start: "2020-02", end: "2020-04" }]);
  });

  it("handles ongoing recession at series end", () => {
    const series = [
      { date: "2020-01", value: 0 },
      { date: "2020-02", value: 1 },
      { date: "2020-03", value: 1 },
    ];
    expect(computeRecessions(series)).toEqual([{ start: "2020-02", end: null }]);
  });
});

describe("computeBear", () => {
  it("marks bear market when drop >= 20% from ATH, with peak as start and trough as end", () => {
    const series = [
      { date: "2020-01", value: 100 },
      { date: "2020-02", value: 120 }, // New ATH (peak)
      { date: "2020-03", value: 100 },
      { date: "2020-04", value: 90 }, // 90 / 120 = -25% (bear market confirmed)
      { date: "2020-05", value: 80 }, // Trough
      { date: "2020-06", value: 110 },
      { date: "2020-07", value: 125 }, // Recovery to new ATH
      { date: "2020-08", value: 130 },
    ];
    expect(computeBear(series)).toEqual([{ start: "2020-02", end: "2020-05" }]);
  });

  it("ignores drawdowns strictly less than 20%", () => {
    const series = [
      { date: "2020-01", value: 100 },
      { date: "2020-02", value: 85 }, // -15%
      { date: "2020-03", value: 105 },
    ];
    expect(computeBear(series)).toEqual([]);
  });
});

describe("computeJoblessJump", () => {
  it("starts when UNRATE climbs >= 1.0 pt above 12-mo low, ends when gap < 0.5", () => {
    const series = [
      { date: "2020-01", value: 4.0 },
      { date: "2020-02", value: 4.0 },
      { date: "2020-03", value: 4.0 },
      { date: "2020-04", value: 5.1 }, // gap = 1.1 >= 1.0 → episode starts
      { date: "2020-05", value: 5.5 }, // gap = 1.5
      { date: "2020-06", value: 4.7 }, // gap = 0.7
      { date: "2020-07", value: 4.4 }, // gap = 0.4 < 0.5 → episode ends (last month was 2020-06)
      { date: "2020-08", value: 4.2 },
    ];
    expect(computeJoblessJump(series)).toEqual([{ start: "2020-04", end: "2020-06" }]);
  });
});

describe("computeInflationSpikes", () => {
  it("starts when CPI YoY > 5%, ends when back below 4%", () => {
    const series = [
      { date: "2020-01", value: 3.2 },
      { date: "2020-02", value: 4.8 },
      { date: "2020-03", value: 5.4 }, // > 5.0 → starts
      { date: "2020-04", value: 6.2 },
      { date: "2020-05", value: 4.3 }, // >= 4.0 → still in episode
      { date: "2020-06", value: 3.7 }, // < 4.0 → ends (last month was 2020-05)
      { date: "2020-07", value: 3.1 },
    ];
    expect(computeInflationSpikes(series)).toEqual([{ start: "2020-03", end: "2020-05" }]);
  });
});

describe("computeHousingDrops", () => {
  it("starts when YoY < 0, ends when >= 0", () => {
    const series = [
      { date: "2020-01", value: 2.1 },
      { date: "2020-02", value: -0.4 }, // < 0 → starts
      { date: "2020-03", value: -1.2 },
      { date: "2020-04", value: 0.1 }, // >= 0 → ends (last month was 2020-03)
      { date: "2020-05", value: 1.5 },
    ];
    expect(computeHousingDrops(series)).toEqual([{ start: "2020-02", end: "2020-03" }]);
  });
});

describe("computeFedCuts", () => {
  it("tracks rate cut from 12-mo max to trough until reset", () => {
    // Generate contiguous months
    const series = [
      { date: "2020-01", value: 5.0 },
      { date: "2020-02", value: 5.0 },
      { date: "2020-03", value: 4.2 }, // gap = 0.8 >= 0.5 → starts
      { date: "2020-04", value: 3.5 },
      { date: "2020-05", value: 2.5 }, // trough
      { date: "2020-06", value: 2.5 },
      { date: "2020-07", value: 2.5 },
      { date: "2020-08", value: 2.5 },
      { date: "2020-09", value: 2.5 },
      { date: "2020-10", value: 2.5 },
      { date: "2020-11", value: 2.5 },
      { date: "2020-12", value: 2.5 },
      { date: "2021-01", value: 2.5 },
      { date: "2021-02", value: 2.5 }, // 2020-01 and 2020-02 (5.0) are now outside trailing 12-mo window
      { date: "2021-03", value: 2.5 }, // trailing 12m max is now 3.5 or less; gap <= 0.25 when max becomes 2.5
      { date: "2021-04", value: 2.5 },
      { date: "2021-05", value: 2.5 },
    ];
    const events = computeFedCuts(series);
    expect(events.length).toBe(1);
    expect(events[0].start).toBe("2020-03");
    expect(events[0].end).toBe("2020-05");
  });
});
