import { describe, it, expect } from "vitest";
import {
  GAUGES, GAUGE_LIST, bandFor, gaugeVerdict, bandSegments, markerPct, fmt, pctileLine,
} from "../src/lib/gauges.mjs";
import { statusFor, verdict } from "../src/lib/recession.mjs";

describe("bandFor", () => {
  const buffett = GAUGES.buffett;
  it("places a boundary value in the band above (upTo is exclusive)", () => {
    expect(bandFor(buffett, 110).key).toBe("fair");
    expect(bandFor(buffett, 109.99).key).toBe("cheap");
  });
  it("catches extremes in the first and last bands", () => {
    expect(bandFor(buffett, -50).key).toBe("cheap");
    expect(bandFor(buffett, 10_000).key).toBe("mania");
  });
  it("handles negative scales (yield curve)", () => {
    expect(bandFor(GAUGES.curve, -1).key).toBe("deep");
    expect(bandFor(GAUGES.curve, -0.2).key).toBe("inverted");
    expect(bandFor(GAUGES.curve, 0).key).toBe("flat"); // exactly 0 is not inverted
  });
});

describe("gaugeVerdict direction dead-band", () => {
  const vix = GAUGES.vix;
  it("reads flat within ±0.005", () => {
    expect(gaugeVerdict(vix, 16.0, 16.0).sub).toBe(vix.subs.flat);
    expect(gaugeVerdict(vix, 16.004, 16.0).sub).toBe(vix.subs.flat);
  });
  it("reads rising/cooling outside it", () => {
    expect(gaugeVerdict(vix, 16.1, 16.0).rising).toBe(true);
    expect(gaugeVerdict(vix, 15.9, 16.0).cooling).toBe(true);
  });
});

describe("rail geometry", () => {
  it("bandSegments tile the rail from 0 to 100 with no gaps", () => {
    for (const gauge of GAUGE_LIST) {
      const segs = bandSegments(gauge);
      expect(segs[0].start).toBe(0);
      expect(segs[segs.length - 1].end).toBe(100);
      for (let i = 1; i < segs.length; i++) expect(segs[i].start).toBe(segs[i - 1].end);
    }
  });
  it("markerPct clamps to the rail", () => {
    expect(markerPct(GAUGES.vix, -1000)).toBe(2);
    expect(markerPct(GAUGES.vix, 1000)).toBe(98);
  });
});

describe("gauge config integrity", () => {
  it.each(GAUGE_LIST.map((g) => [g.id, g]))("%s is fully wired", (_id, gauge) => {
    expect(gauge.slug).toBeTruthy();
    expect(["economy", "markets"]).toContain(gauge.group);
    expect(gauge.scaleMin).toBeLessThan(gauge.scaleMax);
    expect(gauge.keyLine.value).toBeGreaterThanOrEqual(gauge.scaleMin);
    expect(gauge.keyLine.value).toBeLessThanOrEqual(gauge.scaleMax);

    // bands: strictly ascending, ending at Infinity, each with copy + accent
    const upTos = gauge.bands.map((b) => b.upTo);
    expect(upTos[upTos.length - 1]).toBe(Infinity);
    for (let i = 1; i < upTos.length; i++) expect(upTos[i]).toBeGreaterThan(upTos[i - 1]);
    for (const band of gauge.bands) {
      expect(band.label).toBeTruthy();
      expect(band.accent).toMatch(/^#/);
      // a verdict head must exist for every band — a silent gap here would
      // ship a card with an empty verdict
      expect(gauge.heads[band.key], `${gauge.id} head for band "${band.key}"`).toBeTruthy();
    }
    for (const dir of ["rising", "cooling", "flat"]) expect(gauge.subs[dir]).toBeTruthy();

    // takeaway must produce the screenshot line (with a digit) on both sides
    // of the key line and at the extremes
    const probes = [gauge.scaleMin, gauge.keyLine.value - 0.1, gauge.keyLine.value + 0.1, gauge.scaleMax];
    for (const v of probes) {
      const line = gauge.takeaway(v);
      expect(typeof line).toBe("string");
      expect(line).toMatch(/\d/);
    }
    expect(fmt(gauge, gauge.keyLine.value)).toContain(gauge.suffix ?? "");
  });
});

describe("pctileLine", () => {
  it("phrases high readings as higher-than", () => {
    expect(pctileLine({ pctile: 96, sinceYear: 1997 })).toBe("Higher than 96% of all readings since 1997.");
  });
  it("phrases low readings as lower-than", () => {
    expect(pctileLine({ pctile: 12, sinceYear: 1990 })).toBe("Lower than 88% of all readings since 1990.");
  });
  it("returns null without percentile data (seed builds)", () => {
    expect(pctileLine({})).toBeNull();
    expect(pctileLine(null)).toBeNull();
  });
});

describe("recession verdict machine", () => {
  it("bands at 0.30 and 0.50", () => {
    expect(statusFor(0.29).key).toBe("clear");
    expect(statusFor(0.3).key).toBe("watch");
    expect(statusFor(0.5).key).toBe("tripped");
  });
  it("always yields head + sub copy", () => {
    for (const [v, prev] of [[0.1, 0.2], [0.4, 0.4], [0.6, 0.5]]) {
      const out = verdict(v, prev);
      expect(out.head).toBeTruthy();
      expect(out.sub).toBeTruthy();
    }
  });
});
