/* ───────────────────────────────────────────────────────────────────────────
   Signal Codec
   Compact URL-safe encoder and decoder for user-built Signals.
   Example: curve:inverted+deep.credit:cautious+stress~h2~t:recession~w12
─────────────────────────────────────────────────────────────────────────── */

/** @type {readonly import("./dashboard-types").TargetId[]} */
export const VALID_TARGETS = [
  "recession",
  "bear",
  "joblessjump",
  "inflation",
  "housing",
  "fedcuts",
];

export const DEFAULT_SIGNAL = {
  conditions: [],
  holdMonths: 0,
  target: "recession",
  windowMonths: 12,
};

/**
 * Encodes a Signal object into a compact URL-safe string.
 * @param {import("./dashboard-types").Signal} signal
 * @returns {string}
 */
export function encodeSignal(signal) {
  if (!signal) return "";

  const conditions = Array.isArray(signal.conditions) ? signal.conditions : [];
  const condParts = conditions
    .filter((c) => c && c.indicator)
    .slice(0, 3)
    .map((c) => {
      const bands = Array.isArray(c.bands) ? c.bands : [];
      return `${c.indicator}:${bands.join("+")}`;
    });

  const condStr = condParts.join(".");
  const hold = Math.max(0, Math.min(6, signal.holdMonths ?? 0));
  const target = VALID_TARGETS.includes(signal.target) ? signal.target : "recession";
  const windowMonths = Math.max(1, Math.min(60, signal.windowMonths ?? 12));

  return `${condStr}~h${hold}~t:${target}~w${windowMonths}`;
}

/**
 * Decodes a URL-safe string into a Signal object.
 * Robust against invalid, malformed, or partially-encoded strings.
 * @param {string | null | undefined} str
 * @returns {import("./dashboard-types").Signal}
 */
export function decodeSignal(str) {
  if (!str || typeof str !== "string") {
    return { ...DEFAULT_SIGNAL, conditions: [] };
  }

  const trimmed = str.trim();
  if (!trimmed) {
    return { ...DEFAULT_SIGNAL, conditions: [] };
  }

  const parts = trimmed.split("~");
  const condPart = parts[0] || "";

  let holdMonths = 0;
  /** @type {import("./dashboard-types").TargetId} */
  let target = "recession";
  let windowMonths = 12;

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;

    if (part.startsWith("h")) {
      const num = parseInt(part.replace(/^h:?/, ""), 10);
      if (!Number.isNaN(num)) {
        holdMonths = Math.max(0, Math.min(6, num));
      }
    } else if (part.startsWith("t:") || part.startsWith("t=")) {
      const tVal = part.replace(/^t[:=]/, "").trim();
      if (VALID_TARGETS.includes(/** @type {any} */ (tVal))) {
        target = /** @type {import("./dashboard-types").TargetId} */ (tVal);
      }
    } else if (part.startsWith("w")) {
      const num = parseInt(part.replace(/^w:?/, ""), 10);
      if (!Number.isNaN(num)) {
        windowMonths = Math.max(1, Math.min(60, num));
      }
    }
  }

  /** @type {import("./dashboard-types").SignalCondition[]} */
  const conditions = [];

  if (condPart && !condPart.startsWith("t:") && !condPart.startsWith("h") && !condPart.startsWith("w")) {
    const condSegments = condPart.split(".");
    for (const seg of condSegments) {
      if (conditions.length >= 3) break;
      const colonIdx = seg.indexOf(":");
      if (colonIdx === -1) continue;

      const indicator = seg.slice(0, colonIdx).trim();
      const rawBands = seg.slice(colonIdx + 1);

      if (!indicator) continue;

      // In URLs, "+" may arrive as "+" or decoded as " " or comma
      const bands = rawBands
        .split(/[+,\s]+/)
        .map((b) => b.trim())
        .filter(Boolean);

      conditions.push({ indicator, bands });
    }
  }

  return {
    conditions,
    holdMonths,
    target,
    windowMonths,
  };
}
