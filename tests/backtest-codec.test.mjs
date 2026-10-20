import { describe, it, expect } from "vitest";
import { encodeSignal, decodeSignal, DEFAULT_SIGNAL } from "../src/lib/signal-codec.mjs";
import { PRESETS } from "../src/lib/signal-presets.mjs";

describe("signal codec", () => {
  it("encodes a signal to a compact string", () => {
    const signal = {
      conditions: [
        { indicator: "curve", bands: ["inverted", "deep"] },
        { indicator: "credit", bands: ["cautious", "stress"] },
      ],
      holdMonths: 2,
      target: "recession",
      windowMonths: 12,
    };
    const encoded = encodeSignal(signal);
    expect(encoded).toBe("curve:inverted+deep.credit:cautious+stress~h2~t:recession~w12");
  });

  it("decodes a compact string correctly", () => {
    const str = "curve:inverted+deep.credit:cautious+stress~h2~t:recession~w12";
    const decoded = decodeSignal(str);
    expect(decoded).toEqual({
      conditions: [
        { indicator: "curve", bands: ["inverted", "deep"] },
        { indicator: "credit", bands: ["cautious", "stress"] },
      ],
      holdMonths: 2,
      target: "recession",
      windowMonths: 12,
    });
  });

  it("handles URL-decoded spaces or commas in band lists", () => {
    // When browser URLSearchParams decodes "+", it turns into space
    const strWithSpaces = "curve:inverted deep.credit:cautious stress~h2~t:recession~w12";
    const decoded1 = decodeSignal(strWithSpaces);
    expect(decoded1.conditions[0].bands).toEqual(["inverted", "deep"]);
    expect(decoded1.conditions[1].bands).toEqual(["cautious", "stress"]);

    const strWithCommas = "curve:inverted,deep.credit:cautious,stress~h0~t:bear~w6";
    const decoded2 = decodeSignal(strWithCommas);
    expect(decoded2.conditions[0].bands).toEqual(["inverted", "deep"]);
    expect(decoded2.conditions[1].bands).toEqual(["cautious", "stress"]);
    expect(decoded2.target).toBe("bear");
    expect(decoded2.windowMonths).toBe(6);
  });

  it("handles roundtrip encode and decode for all presets", () => {
    for (const preset of PRESETS) {
      const encoded = encodeSignal(preset.signal);
      const decoded = decodeSignal(encoded);
      expect(decoded).toEqual(preset.signal);
    }
  });

  it("is robust against bad or malformed input", () => {
    expect(decodeSignal(null)).toEqual(DEFAULT_SIGNAL);
    expect(decodeSignal(undefined)).toEqual(DEFAULT_SIGNAL);
    expect(decodeSignal("")).toEqual(DEFAULT_SIGNAL);
    expect(decodeSignal("    ")).toEqual(DEFAULT_SIGNAL);
    expect(decodeSignal("total-garbage-text-without-colons")).toEqual(DEFAULT_SIGNAL);

    // Invalid target falls back to "recession"
    const decodedBadTarget = decodeSignal("curve:inverted~t:fake-target~h1~w10");
    expect(decodedBadTarget.target).toBe("recession");

    // Clamps holdMonths
    const decodedClamp = decodeSignal("curve:inverted~h99~w100");
    expect(decodedClamp.holdMonths).toBe(6);
    expect(decodedClamp.windowMonths).toBe(60);
  });
});
