import { describe, it, expect } from "vitest";
import { monthKey, monthLabel, toMonthly, toMonthlyAvg, forwardFill } from "../scripts/lib/series.mjs";

describe("monthKey / monthLabel", () => {
  it("keys by YYYY-MM", () => {
    expect(monthKey("2026-05-14")).toBe("2026-05");
  });
  it("labels as Mon YY", () => {
    expect(monthLabel("2026-05-01")).toBe("May 26");
    expect(monthLabel("1999-12-31")).toBe("Dec 99");
  });
});

describe("toMonthly", () => {
  it("keeps the last observation of each month", () => {
    const obs = [
      { date: "2026-01-02", value: 10 },
      { date: "2026-01-30", value: 12 },
      { date: "2026-02-27", value: 14 },
    ];
    expect(toMonthly(obs)).toEqual([
      { date: "2026-01-30", value: 12 },
      { date: "2026-02-27", value: 14 },
    ]);
  });
  it("returns chronological order even from shuffled input", () => {
    const obs = [
      { date: "2026-03-31", value: 3 },
      { date: "2026-01-31", value: 1 },
      { date: "2026-02-28", value: 2 },
    ];
    expect(toMonthly(obs).map((o) => o.value)).toEqual([1, 2, 3]);
  });
});

describe("toMonthlyAvg", () => {
  it("averages observations within each month", () => {
    const obs = [
      { date: "2026-01-07", value: 10 },
      { date: "2026-01-14", value: 20 },
      { date: "2026-01-21", value: 30 },
      { date: "2026-02-04", value: 40 },
    ];
    const res = toMonthlyAvg(obs);
    expect(res).toHaveLength(2);
    expect(res[0].date).toBe("2026-01-21");
    expect(res[0].value).toBe(20);
    expect(res[1].date).toBe("2026-02-04");
    expect(res[1].value).toBe(40);
  });
});

describe("forwardFill", () => {
  const grid = ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"].map((date) => ({ date, value: 0 }));
  it("carries the most recent prior value forward", () => {
    const sparse = [
      { date: "2026-01-15", value: 100 },
      { date: "2026-03-15", value: 200 },
    ];
    const filled = forwardFill(grid, sparse);
    expect(filled.get("2026-01")).toBe(100);
    expect(filled.get("2026-02")).toBe(100);
    expect(filled.get("2026-03")).toBe(200);
    expect(filled.get("2026-04")).toBe(200);
  });
  it("leaves months before the first observation unset", () => {
    const sparse = [{ date: "2026-03-15", value: 200 }];
    const filled = forwardFill(grid, sparse);
    expect(filled.has("2026-01")).toBe(false);
    expect(filled.has("2026-02")).toBe(false);
    expect(filled.get("2026-03")).toBe(200);
  });
});
