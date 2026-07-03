import { describe, it, expect } from "vitest";
import { computeSahm } from "../scripts/lib/sahm.mjs";

describe("computeSahm", () => {
  it("is null until a 3-month average exists", () => {
    const s = computeSahm([4, 4, 4, 4]);
    expect(s[0]).toBeNull();
    expect(s[1]).toBeNull();
    expect(s[2]).toBe(0);
  });

  it("reads 0 when unemployment is flat", () => {
    const s = computeSahm(Array(24).fill(4.0));
    expect(s.slice(2).every((v) => v === 0)).toBe(true);
  });

  it("fires at exactly +0.5 over the trailing low", () => {
    // 12 flat months at 4.0, then three at 4.5: the 3-mo average ends at 4.5
    // while the trailing-12 minimum of 3-mo averages is still 4.0.
    const s = computeSahm([...Array(12).fill(4.0), 4.5, 4.5, 4.5]);
    expect(s[s.length - 1]).toBe(0.5);
  });

  it("uses the minimum over the trailing 12 averages only", () => {
    // An old low (3.0) more than 12 averages back must not count.
    const unrate = [...Array(3).fill(3.0), ...Array(14).fill(4.0), 4.0];
    const s = computeSahm(unrate);
    // By the end, every 3-mo average in the window is 4.0 → spread 0.
    expect(s[s.length - 1]).toBe(0);
  });
});
