import { describe, it, expect } from "vitest";
import { buildStream } from "../src/lib/stream.mjs";
import { REPORTERS, REPORTER_IDS, generateReactions } from "../src/lib/reporters.mjs";
import { generateDeterministicSchedule } from "../scripts/fetch-calendar.mjs";

const FIXTURE_MARKETS = {
  meta: { asOf: "2026-09-10", live: true },
  gauges: {
    curve: { id: "curve", value: 0.89, prev: 0.84, asOf: "2026-09-11" },
    inflation: { id: "inflation", value: 3.4, prev: 3.7, asOf: "2026-08-01" },
    vix: { id: "vix", value: 17.8, prev: 14.9, asOf: "2026-09-10" },
    claims: { id: "claims", value: 231, prev: 224, asOf: "2026-09-17" },
  },
};

const FIXTURE_VERDICTS = {
  updated: "2026-09-14T00:00:00Z",
  cards: {
    curve: {
      key: "normal",
      label: "Normal",
      value: 0.89,
      asOf: "2026-09-11",
      history: [
        {
          date: "2026-09-11",
          from: "flat",
          fromLabel: "Flat",
          to: "normal",
          label: "Normal",
          value: 0.89,
        },
      ],
    },
    inflation: {
      key: "elevated",
      label: "Elevated",
      value: 3.4,
      asOf: "2026-08-01",
      history: [
        {
          date: "2026-05-01",
          from: "target",
          fromLabel: "Near target",
          to: "elevated",
          label: "Elevated",
          value: 4.2,
        },
      ],
    },
  },
};

const FIXTURE_CALENDAR = {
  releases: [
    {
      id: "cpi-2026-10-22",
      indicator: "inflation",
      name: "Consumer Price Index (CPI)",
      date: "2026-10-22",
      time: "08:30 ET",
      period: "Sep 2026",
      agency: "Bureau of Labor Statistics",
      description: "Consumer prices for all urban consumers.",
    },
    {
      id: "claims-2026-10-22",
      indicator: "claims",
      name: "Initial Jobless Claims",
      date: "2026-10-22",
      time: "08:30 ET",
      period: "Week of Oct 17",
      agency: "Department of Labor",
      description: "Weekly count of first-time filings.",
    },
  ],
};

const FIXTURE_HISTORIES = {
  meta: { generatedAt: "2026-09-14T00:00:00Z", live: true, through: "2026-08" },
  indicators: {
    inflation: {
      start: "1980-01",
      values: [14.8, 14.2, 14.0, 13.5, 3.4, 3.2],
    },
    curve: {
      start: "2020-01",
      values: [0.2, 0.5, -0.5, -1.2, 0.89],
    },
  },
  targets: {},
};

describe("reporters config", () => {
  it("defines all 4 expected personas with complete profile metadata", () => {
    expect(Object.keys(REPORTERS).sort()).toEqual(["bear", "bull", "mainstreet", "wonk"].sort());
    for (const id of REPORTER_IDS) {
      const rep = REPORTERS[id];
      expect(rep.id).toBe(id);
      expect(rep.name).toBeTruthy();
      expect(rep.title).toBeTruthy();
      expect(rep.bio).toBeTruthy();
      expect(rep.avatar).toMatch(/^\/reporters\/[a-z]+\.png$/);
      expect(rep.initials).toMatch(/^[A-Z]{2}$/);
      expect(rep.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("generates 2 or 3 reactions per event strictly <= 150 chars", () => {
    const testCases = [
      { id: "test-rel-1", kind: "release", indicator: "inflation", value: "3.4%", bandKey: "elevated" },
      { id: "test-rel-2", kind: "release", indicator: "claims", value: "231k", bandKey: "normal" },
      { id: "test-rel-3", kind: "release", indicator: "curve", value: "0.89%", bandKey: "normal" },
      { id: "test-rel-4", kind: "release", indicator: "recession", value: "0.00 pts", bandKey: "clear" },
      { id: "test-rel-5", kind: "release", indicator: "unknown", value: "99", bandKey: "calm" },
      { id: "test-band-1", kind: "band-change", indicator: "curve", fromBand: "Flat", toBand: "Normal" },
      { id: "test-band-2", kind: "band-change", indicator: "inflation", fromBand: "Near target", toBand: "Elevated" },
    ];

    for (const tc of testCases) {
      const reactions = generateReactions(tc);
      expect(reactions.length).toBeGreaterThanOrEqual(2);
      expect(reactions.length).toBeLessThanOrEqual(3);
      for (const r of reactions) {
        expect(REPORTER_IDS).toContain(r.persona);
        expect(r.text.length).toBeGreaterThan(10);
        expect(r.text.length).toBeLessThanOrEqual(150);
        expect(r.text).not.toContain("undefined");
        expect(r.text).not.toContain("NaN");
      }
    }
  });

  it("is 100% deterministic given the same event id", () => {
    const event = { id: "stable-1", kind: "release", indicator: "inflation", value: "3.4%" };
    const r1 = generateReactions(event);
    const r2 = generateReactions(event);
    expect(r1).toEqual(r2);
  });
});

describe("buildStream", () => {
  it("builds a chronological stream sorted newest first", () => {
    const stream = buildStream({
      markets: FIXTURE_MARKETS,
      verdicts: FIXTURE_VERDICTS,
      calendar: FIXTURE_CALENDAR,
      histories: FIXTURE_HISTORIES,
      now: "2026-10-20",
    });

    expect(stream.length).toBeGreaterThan(0);
    expect(stream.length).toBeLessThanOrEqual(60);

    // Verify ordering newest first
    for (let i = 1; i < stream.length; i++) {
      expect(stream[i].date <= stream[i - 1].date).toBe(true);
    }
  });

  it("contains release, band-change, upcoming, and on-this-day kinds", () => {
    const stream = buildStream({
      markets: FIXTURE_MARKETS,
      verdicts: FIXTURE_VERDICTS,
      calendar: FIXTURE_CALENDAR,
      histories: FIXTURE_HISTORIES,
      now: "2026-10-20",
    });

    const kinds = new Set(stream.map((s) => s.kind));
    expect(kinds.has("release")).toBe(true);
    expect(kinds.has("band-change")).toBe(true);
    expect(kinds.has("upcoming")).toBe(true);
    expect(kinds.has("on-this-day")).toBe(true);
  });

  it("attaches 2-3 reporter reactions to release and band-change items", () => {
    const stream = buildStream({
      markets: FIXTURE_MARKETS,
      verdicts: FIXTURE_VERDICTS,
      calendar: FIXTURE_CALENDAR,
      now: "2026-10-20",
    });

    for (const item of stream) {
      if (item.kind === "release" || item.kind === "band-change") {
        expect(item.reactions).toBeDefined();
        expect(item.reactions.length).toBeGreaterThanOrEqual(2);
        expect(item.reactions.length).toBeLessThanOrEqual(3);
        for (const r of item.reactions) {
          expect(REPORTER_IDS).toContain(r.persona);
          expect(r.text.length).toBeLessThanOrEqual(150);
        }
      }
      expect(item.href).toMatch(/^\/[a-z0-9-]+$/);
    }
  });

  it("is completely resilient to missing or empty data structures", () => {
    expect(() => buildStream({})).not.toThrow();
    expect(() => buildStream({ markets: null, verdicts: null, calendar: null, histories: null })).not.toThrow();
    expect(() => buildStream({ markets: { gauges: {} }, verdicts: { cards: {} } })).not.toThrow();

    const emptyStream = buildStream({});
    expect(Array.isArray(emptyStream)).toBe(true);
    expect(emptyStream.length).toBeGreaterThan(0); // Curated factoids fallback
  });
});

describe("calendar generation", () => {
  it("generates deterministic schedule with expected recurring indicators", () => {
    const schedule = generateDeterministicSchedule(new Date("2026-10-20"));
    expect(schedule.length).toBeGreaterThan(50);

    const indicators = new Set(schedule.map((r) => r.indicator));
    expect(indicators.has("claims")).toBe(true);
    expect(indicators.has("payrolls")).toBe(true);
    expect(indicators.has("inflation")).toBe(true);
    expect(indicators.has("openings")).toBe(true);
    expect(indicators.has("retail")).toBe(true);
    expect(indicators.has("permits")).toBe(true);
    expect(indicators.has("gdp")).toBe(true);
    expect(indicators.has("corepce")).toBe(true);
    expect(indicators.has("fedfunds")).toBe(true);
    expect(indicators.has("sentiment")).toBe(true);

    // Jobless claims releases are on Thursdays
    const claims = schedule.filter((r) => r.indicator === "claims");
    for (const c of claims) {
      const d = new Date(c.date + "T00:00:00Z");
      expect(d.getUTCDay()).toBe(4); // Thursday
    }

    // Jobs reports are on Fridays
    const jobs = schedule.filter((r) => r.indicator === "payrolls");
    for (const j of jobs) {
      const d = new Date(j.date + "T00:00:00Z");
      expect(d.getUTCDay()).toBe(5); // Friday
    }
  });
});
