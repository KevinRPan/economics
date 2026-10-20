import { describe, it, expect, beforeEach } from "vitest";
import {
  BOARD_STORAGE_KEY,
  TOPICS,
  BIG_PICTURE_BOARD,
  CATALOG,
  isValidIndicatorId,
  buildStarterBoard,
  encodeBoard,
  decodeBoard,
  loadStoredBoard,
  saveStoredBoard,
  clearStoredBoard,
  resolveInitialBoard,
} from "../src/lib/board.mjs";

describe("board catalog", () => {
  it("includes recession and all GAUGES keys", () => {
    expect(CATALOG.recession).toBeDefined();
    expect(CATALOG.recession.id).toBe("recession");
    expect(CATALOG.recession.topic).toBe("jobs");
    expect(CATALOG.recession.slug).toBe("recession");

    expect(CATALOG.curve).toBeDefined();
    expect(CATALOG.inflation).toBeDefined();
    expect(CATALOG.wages).toBeDefined();
    expect(CATALOG.housing).toBeDefined();
    expect(CATALOG.stress).toBeDefined();
    expect(CATALOG.mood).toBeDefined();
    expect(CATALOG.buffett).toBeDefined();
    expect(CATALOG.vix).toBeDefined();
    expect(CATALOG.credit).toBeDefined();
  });

  it("every catalog indicator has id, slug, eyebrow, headline, topic, group", () => {
    for (const [id, item] of Object.entries(CATALOG)) {
      expect(item.id).toBe(id);
      expect(typeof item.slug).toBe("string");
      expect(typeof item.eyebrow).toBe("string");
      expect(typeof item.headline).toBe("string");
      expect(typeof item.topic).toBe("string");
      expect(typeof item.group).toBe("string");
    }
  });

  it("has valid topics for all indicators", () => {
    const validTopicIds = new Set(TOPICS.map((t) => t.id));
    for (const item of Object.values(CATALOG)) {
      expect(validTopicIds.has(item.topic)).toBe(true);
    }
  });

  it("identifies valid and invalid indicator ids", () => {
    expect(isValidIndicatorId("recession")).toBe(true);
    expect(isValidIndicatorId("curve")).toBe(true);
    expect(isValidIndicatorId("claims")).toBe(true);
    expect(isValidIndicatorId("non_existent_gauge")).toBe(false);
    expect(isValidIndicatorId(null)).toBe(false);
    expect(isValidIndicatorId("")).toBe(false);
  });
});

describe("BIG_PICTURE_BOARD", () => {
  it("contains the expected 8 indicators", () => {
    expect(BIG_PICTURE_BOARD).toEqual([
      "recession",
      "curve",
      "inflation",
      "claims",
      "credit",
      "mood",
      "housing",
      "sentiment",
    ]);
    for (const id of BIG_PICTURE_BOARD) {
      expect(isValidIndicatorId(id)).toBe(true);
    }
  });
});

describe("buildStarterBoard (quiz mapping)", () => {
  it("returns BIG_PICTURE_BOARD when no topics are selected", () => {
    const result = buildStarterBoard([]);
    expect(result).toEqual(BIG_PICTURE_BOARD);
  });

  it("builds 6-8 indicators for single topic (jobs)", () => {
    const result = buildStarterBoard(["jobs"]);
    expect(result.length).toBeGreaterThanOrEqual(6);
    expect(result.length).toBeLessThanOrEqual(8);
    // Jobs indicators like recession, claims, wages should be present
    expect(result).toContain("recession");
    expect(result).toContain("claims");
  });

  it("builds 6-8 indicators covering multiple selected topics", () => {
    const result = buildStarterBoard(["prices", "housing", "fed"]);
    expect(result.length).toBeGreaterThanOrEqual(6);
    expect(result.length).toBeLessThanOrEqual(8);
    // Should have inflation (prices), housing (housing), curve (fed)
    expect(result).toContain("inflation");
    expect(result).toContain("housing");
    expect(result).toContain("curve");
  });

  it("deduplicates indicators and caps at 8", () => {
    const allTopics = TOPICS.map((t) => t.id);
    const result = buildStarterBoard(allTopics);
    expect(result.length).toBe(8);
    const unique = new Set(result);
    expect(unique.size).toBe(8);
  });
});

describe("encodeBoard and decodeBoard", () => {
  it("encodes an array of indicator ids to comma-separated string", () => {
    const ids = ["recession", "curve", "inflation"];
    expect(encodeBoard(ids)).toBe("recession,curve,inflation");
  });

  it("deduplicates and filters unknown ids on encode", () => {
    const ids = ["recession", "bogus", "curve", "recession", "inflation"];
    expect(encodeBoard(ids)).toBe("recession,curve,inflation");
  });

  it("caps encode at MAX_BOARD_SIZE (12)", () => {
    const fifteen = [
      "recession", "curve", "inflation", "claims", "payrolls", "openings",
      "quits", "gdp", "indpro", "retail", "permits", "fedfunds",
      "corepce", "gas", "oil"
    ];
    const encoded = encodeBoard(fifteen);
    const parts = encoded.split(",");
    expect(parts.length).toBe(12);
  });

  it("decodes simple comma-separated string", () => {
    const res = decodeBoard("recession,curve,inflation");
    expect(res).toEqual(["recession", "curve", "inflation"]);
  });

  it("decodes query string ?b=...", () => {
    expect(decodeBoard("?b=curve,credit")).toEqual(["curve", "credit"]);
  });

  it("decodes full URL", () => {
    expect(decodeBoard("https://econ.kpan.dev/dashboard?b=vix,mood,housing")).toEqual([
      "vix", "mood", "housing"
    ]);
  });

  it("filters out invalid ids and deduplicates on decode", () => {
    const res = decodeBoard("recession,fake_id,recession,curve");
    expect(res).toEqual(["recession", "curve"]);
  });

  it("caps decoded board at 12", () => {
    const list = [
      "recession", "curve", "inflation", "claims", "payrolls", "openings",
      "quits", "gdp", "indpro", "retail", "permits", "fedfunds",
      "corepce", "gas", "oil"
    ].join(",");
    const res = decodeBoard(list);
    expect(res.length).toBe(12);
  });

  it("handles empty or garbage input gracefully", () => {
    expect(decodeBoard("")).toEqual([]);
    expect(decodeBoard(null)).toEqual([]);
    expect(decodeBoard("????")).toEqual([]);
    expect(decodeBoard("invalid1,invalid2")).toEqual([]);
  });
});

describe("localStorage persistence", () => {
  let mockStorage;

  beforeEach(() => {
    const store = new Map();
    mockStorage = {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    };
  });

  it("saves and loads board using econ.board.v1", () => {
    const board = ["recession", "curve", "credit"];
    saveStoredBoard(board, mockStorage);
    expect(mockStorage.getItem(BOARD_STORAGE_KEY)).toBe(JSON.stringify(board));

    const loaded = loadStoredBoard(mockStorage);
    expect(loaded).toEqual(board);
  });

  it("clears stored board", () => {
    saveStoredBoard(["curve"], mockStorage);
    clearStoredBoard(mockStorage);
    expect(loadStoredBoard(mockStorage)).toBeNull();
  });

  it("returns null if storage has invalid data", () => {
    mockStorage.setItem(BOARD_STORAGE_KEY, "nonsense,garbage");
    expect(loadStoredBoard(mockStorage)).toBeNull();
  });
});

describe("resolveInitialBoard precedence", () => {
  it("prefers URL over localStorage and quiz", () => {
    const res = resolveInitialBoard({
      urlSearch: "?b=vix,mood",
      storedBoard: ["recession", "curve"],
    });
    expect(res.source).toBe("url");
    expect(res.board).toEqual(["vix", "mood"]);
  });

  it("uses localStorage when URL is absent or empty", () => {
    const res = resolveInitialBoard({
      urlSearch: "",
      storedBoard: ["recession", "wages"],
    });
    expect(res.source).toBe("storage");
    expect(res.board).toEqual(["recession", "wages"]);
  });

  it("falls back to quiz/default when neither URL nor localStorage exists", () => {
    const res = resolveInitialBoard({
      urlSearch: "",
      storedBoard: null,
    });
    expect(res.source).toBe("quiz");
    expect(res.board).toEqual(BIG_PICTURE_BOARD);
  });
});
