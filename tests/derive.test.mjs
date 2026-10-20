import { describe, it, expect } from "vitest";
import { yoyPct, ratioSeries, mortgageMonthly, percentileRank, diffSeries, ma3OfChange } from "../scripts/lib/derive.mjs";

function months(startYear, startMonth, values) {
  return values.map((value, i) => {
    const m = startMonth - 1 + i;
    const y = startYear + Math.floor(m / 12);
    return { date: `${y}-${String((m % 12) + 1).padStart(2, "0")}-01`, value };
  });
}

describe("yoyPct", () => {
  it("computes percent change vs the same month a year earlier", () => {
    const series = months(2020, 1, [...Array(12).fill(100), ...Array(12).fill(110)]);
    const yoy = yoyPct(series);
    expect(yoy).toHaveLength(12); // first year has no base
    expect(yoy[0].date).toBe("2021-01-01");
    yoy.forEach((o) => expect(o.value).toBeCloseTo(10, 10));
  });

  it("matches by month key, so gaps can't misalign the comparison", () => {
    const series = [
      { date: "2020-01-01", value: 100 },
      { date: "2020-03-01", value: 100 }, // Feb missing
      { date: "2021-01-01", value: 105 },
      { date: "2021-02-01", value: 999 }, // no Feb 2020 base → excluded
    ];
    const yoy = yoyPct(series);
    expect(yoy).toEqual([{ date: "2021-01-01", value: 5.000000000000004 }]);
  });
});

describe("ratioSeries", () => {
  it("joins on common months and divides", () => {
    const a = months(2020, 1, [10, 20, 30]);
    const b = [months(2020, 1, [2])[0], months(2020, 3, [3])[0]]; // Feb missing
    expect(ratioSeries(a, b)).toEqual([
      { date: "2020-01-01", value: 5 },
      { date: "2020-03-01", value: 10 },
    ]);
  });
});

describe("mortgageMonthly", () => {
  it("matches the standard amortization formula", () => {
    // $320,000 at 6% for 30 years → $1,918.56/mo (standard calculator value)
    expect(mortgageMonthly(320000, 6)).toBeCloseTo(1918.56, 1);
  });
  it("degrades to simple division at 0%", () => {
    expect(mortgageMonthly(360000, 0)).toBeCloseTo(1000, 10);
  });
});

describe("percentileRank", () => {
  it("ranks with ties counting half", () => {
    expect(percentileRank([1, 2, 3, 4], 3)).toBe(63); // (2 + 0.5) / 4
  });
  it("tops out at 100 for a record high", () => {
    expect(percentileRank([1, 2, 3], 10)).toBe(100);
  });
  it("returns null for an empty history", () => {
    expect(percentileRank([], 5)).toBeNull();
  });
});

describe("diffSeries and ma3OfChange", () => {
  it("computes monthly difference", () => {
    const s = [
      { date: "2020-01-01", value: 100 },
      { date: "2020-02-01", value: 105 },
      { date: "2020-03-01", value: 103 },
    ];
    expect(diffSeries(s)).toEqual([
      { date: "2020-02-01", value: 5 },
      { date: "2020-03-01", value: -2 },
    ]);
  });

  it("computes 3-month average of change", () => {
    const s = [
      { date: "2020-01-01", value: 100 },
      { date: "2020-02-01", value: 110 }, // +10
      { date: "2020-03-01", value: 130 }, // +20
      { date: "2020-04-01", value: 160 }, // +30 -> sum = 60 / 3 = 20
    ];
    expect(ma3OfChange(s)).toEqual([
      { date: "2020-04-01", value: 20 },
    ]);
  });
});
