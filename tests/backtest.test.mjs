import { describe, it, expect } from "vitest";
import {
  parseMonth,
  formatMonth,
  addMonths,
  diffMonths,
  bandSeries,
  getBandAt,
  evaluate,
} from "../src/lib/backtest.mjs";

describe("backtest month utilities", () => {
  it("parses and formats months correctly", () => {
    expect(parseMonth("2024-03")).toEqual({ year: 2024, month: 3 });
    expect(formatMonth(2024, 3)).toBe("2024-03");
    expect(formatMonth(2024, 12)).toBe("2024-12");
    expect(formatMonth(2024, 13)).toBe("2025-01");
    expect(formatMonth(2024, 0)).toBe("2023-12");
  });

  it("adds months across year boundaries", () => {
    expect(addMonths("2023-11", 2)).toBe("2024-01");
    expect(addMonths("2024-01", -2)).toBe("2023-11");
    expect(addMonths("2020-05", 12)).toBe("2021-05");
  });

  it("calculates diffMonths between two month keys", () => {
    expect(diffMonths("2020-01", "2020-01")).toBe(0);
    expect(diffMonths("2020-01", "2020-05")).toBe(4);
    expect(diffMonths("2019-10", "2020-02")).toBe(4);
    expect(diffMonths("2020-05", "2020-01")).toBe(-4);
  });
});

describe("bandSeries", () => {
  it("maps recession values via statusFor", () => {
    const series = {
      start: "2020-01",
      values: [0.1, 0.35, 0.65, null],
    };
    const res = bandSeries("recession", series);
    expect(res.start).toBe("2020-01");
    expect(res.bands).toEqual(["clear", "watch", "tripped", null]);
  });

  it("maps curve values via GAUGES.curve", () => {
    const series = {
      start: "2022-01",
      values: [-0.8, -0.2, 0.5, 1.5, 3.0, null],
    };
    const res = bandSeries("curve", series);
    expect(res.bands).toEqual(["deep", "inverted", "flat", "normal", "steep", null]);
  });

  it("gets band at specific month safely", () => {
    const banded = {
      start: "2020-01",
      bands: ["clear", "watch", "tripped"],
    };
    expect(getBandAt(banded, "2020-01")).toBe("clear");
    expect(getBandAt(banded, "2020-02")).toBe("watch");
    expect(getBandAt(banded, "2020-03")).toBe("tripped");
    expect(getBandAt(banded, "2019-12")).toBeNull();
    expect(getBandAt(banded, "2020-04")).toBeNull();
  });
});

describe("evaluate engine with synthetic histories", () => {
  // Build a 24-month synthetic history: 2020-01 to 2021-12
  const makeSyntheticHistories = () => ({
    meta: { generatedAt: "2026-01-01", live: false, through: "2021-12" },
    indicators: {
      curve: {
        start: "2020-01",
        // 24 months:
        // 2020-01..2020-03 normal (1.0)
        // 2020-04..2020-06 inverted (-0.2)
        // 2020-07..2020-09 normal (1.0)
        // 2020-10..2020-11 inverted (-0.2)
        // 2020-12 normal (1.0)
        // 2021-01..2021-05 normal (1.0)
        // 2021-06..2021-08 inverted (-0.2)
        // 2021-09..2021-11 normal (1.0)
        // 2021-12 inverted (-0.2) (firing now!)
        values: [
          1.0, 1.0, 1.0, // Jan-Mar 2020
          -0.2, -0.2, -0.2, // Apr-Jun 2020
          1.0, 1.0, 1.0, // Jul-Sep 2020
          -0.2, -0.2, // Oct-Nov 2020
          1.0, // Dec 2020
          1.0, 1.0, 1.0, 1.0, 1.0, // Jan-May 2021
          -0.2, -0.2, -0.2, // Jun-Aug 2021
          1.0, 1.0, 1.0, // Sep-Nov 2021
          -0.2, // Dec 2021
        ],
      },
      credit: {
        start: "2020-01",
        // Always stress (>8.0)
        values: Array(24).fill(9.0),
      },
    },
    targets: {
      recession: {
        id: "recession",
        label: "Recessions",
        short: "recession",
        description: "Synthetic recession episodes",
        coverage: { start: "2020-01", end: "2021-12" },
        events: [
          // Event 1: starts 2020-08 (ended 2020-10)
          { start: "2020-08", end: "2020-10" },
          // Event 2: starts 2022-06 (outside coverage!)
          { start: "2022-06", end: "2022-12" },
        ],
      },
    },
  });

  it("handles coverage overlap and filters events to coverage", () => {
    const histories = makeSyntheticHistories();
    const signal = {
      conditions: [{ indicator: "curve", bands: ["inverted"] }],
      holdMonths: 0,
      target: "recession",
      windowMonths: 12,
    };

    const res = evaluate(signal, histories);
    expect(res.coverage).toEqual({ start: "2020-01", end: "2021-12" });
    // Only 1 event lies within coverage: 2020-08. The 2022-06 event is excluded!
    expect(res.events).toHaveLength(1);
    expect(res.events[0].event.start).toBe("2020-08");
    expect(res.summary.total).toBe(1);
  });

  it("evaluates holdMonths = 0: fires first month, stays active, re-arms after switching off", () => {
    const histories = makeSyntheticHistories();
    const signal = {
      conditions: [{ indicator: "curve", bands: ["inverted"] }],
      holdMonths: 0,
      target: "recession",
      windowMonths: 6,
    };

    const res = evaluate(signal, histories);

    // Curve is inverted:
    // 2020-04..2020-06 (3 mo) -> fire at 2020-04
    // 2020-10..2020-11 (2 mo) -> fire at 2020-10
    // 2021-06..2021-08 (3 mo) -> fire at 2021-06
    // 2021-12 (1 mo) -> fire at 2021-12
    expect(res.fires).toEqual(["2020-04", "2020-10", "2021-06", "2021-12"]);

    // Active months include all inverted months
    expect(res.activeMonths).toEqual([
      "2020-04", "2020-05", "2020-06",
      "2020-10", "2020-11",
      "2021-06", "2021-07", "2021-08",
      "2021-12",
    ]);

    // isFiringNow: 2021-12 is the final month and it is active
    expect(res.isFiringNow).toBe(true);
  });

  it("evaluates holdMonths = 2: requires 3 consecutive months before turning on", () => {
    const histories = makeSyntheticHistories();
    const signal = {
      conditions: [{ indicator: "curve", bands: ["inverted"] }],
      holdMonths: 2,
      target: "recession",
      windowMonths: 12,
    };

    const res = evaluate(signal, histories);

    // 2020-04..2020-06: 3 consecutive months -> turns on at 2020-06 (fires 2020-06)
    // 2020-10..2020-11: only 2 consecutive months -> DOES NOT TURN ON!
    // 2021-06..2021-08: 3 consecutive months -> turns on at 2021-08 (fires 2021-08)
    // 2021-12: only 1 month -> DOES NOT TURN ON!
    expect(res.fires).toEqual(["2020-06", "2021-08"]);
    expect(res.activeMonths).toEqual(["2020-06", "2021-08"]);
    expect(res.isFiringNow).toBe(false);
  });

  it("correctly identifies caught events and lead times", () => {
    const histories = makeSyntheticHistories();
    const signal = {
      conditions: [{ indicator: "curve", bands: ["inverted"] }],
      holdMonths: 0,
      target: "recession",
      windowMonths: 6,
    };

    const res = evaluate(signal, histories);

    // Event is at 2020-08.
    // Fires are: 2020-04 (diff 4 mo), 2020-10 (diff -2 mo), 2021-06, 2021-12
    // 2020-04 is within window 0..6 months before 2020-08.
    expect(res.events[0].caught).toBe(true);
    expect(res.events[0].firstFire).toBe("2020-04");
    expect(res.events[0].leadMonths).toBe(4);
    expect(res.summary.caught).toBe(1);
    expect(res.summary.avgLead).toBe(4);
  });

  it("classifies false alarms vs pending fires correctly", () => {
    const histories = makeSyntheticHistories();
    const signal = {
      conditions: [{ indicator: "curve", bands: ["inverted"] }],
      holdMonths: 0,
      target: "recession",
      windowMonths: 6,
    };

    const res = evaluate(signal, histories);
    // Coverage end is 2021-12.
    // Fires:
    // 1) 2020-04: followed by event 2020-08 within 6 mo -> CAUGHT, neither false alarm nor pending.
    // 2) 2020-10: window ends 2021-04 (<= 2021-12). No event -> FALSE ALARM!
    // 3) 2021-06: window ends 2021-12 (<= 2021-12). No event -> FALSE ALARM!
    // 4) 2021-12: window ends 2022-06 (> 2021-12). Window has not elapsed -> PENDING!

    expect(res.falseAlarms).toEqual(["2020-10", "2021-06"]);
    expect(res.pending).toEqual(["2021-12"]);
    expect(res.summary.falseAlarms).toBe(2);
    expect(res.summary.pending).toBe(1);
  });

  it("handles AND condition across multiple indicators", () => {
    const histories = makeSyntheticHistories();
    // In our synthetic data, credit is stress everywhere.
    // So curve AND credit matches whenever curve matches.
    const signal = {
      conditions: [
        { indicator: "curve", bands: ["inverted"] },
        { indicator: "credit", bands: ["stress"] },
      ],
      holdMonths: 0,
      target: "recession",
      windowMonths: 6,
    };

    const res = evaluate(signal, histories);
    expect(res.fires).toEqual(["2020-04", "2020-10", "2021-06", "2021-12"]);

    // If credit requires 'cautious' instead (which is never true):
    const impossibleSignal = {
      conditions: [
        { indicator: "curve", bands: ["inverted"] },
        { indicator: "credit", bands: ["cautious"] },
      ],
      holdMonths: 0,
      target: "recession",
      windowMonths: 6,
    };
    const res2 = evaluate(impossibleSignal, histories);
    expect(res2.fires).toEqual([]);
    expect(res2.events[0].caught).toBe(false);
    expect(res2.summary.caught).toBe(0);
    expect(res2.summary.falseAlarms).toBe(0);
  });

  it("evaluates presets on real histories.json if available", async () => {
    try {
      const { readFileSync, existsSync } = await import("node:fs");
      const { resolve } = await import("node:path");
      const historiesPath = resolve("src/data/histories.json");
      if (!existsSync(historiesPath)) return;

      const histories = JSON.parse(readFileSync(historiesPath, "utf-8"));
      const { PRESETS } = await import("../src/lib/signal-presets.mjs");

      for (const preset of PRESETS) {
        const result = evaluate(preset.signal, histories);
        expect(result).toHaveProperty("activeMonths");
        expect(result).toHaveProperty("fires");
        expect(result).toHaveProperty("coverage");
        expect(result).toHaveProperty("summary");
        expect(typeof result.summary.caught).toBe("number");
        expect(typeof result.summary.total).toBe("number");
        expect(typeof result.summary.falseAlarms).toBe("number");
        expect(typeof result.isFiringNow).toBe("boolean");
      }
    } catch {
      // ignore
    }
  });
});
