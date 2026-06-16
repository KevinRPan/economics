/* ───────────────────────────────────────────────────────────────────────────
   Shared recession-card logic — tokens, the verdict state machine, and copy.
   Ported verbatim from the prototype (RecessionCard.jsx) so the live card and
   the build-time OG image render identical verdicts. Plain .mjs so both the
   React island (TS) and the Node OG script can import it.
─────────────────────────────────────────────────────────────────────────── */

export const TRIGGER = 0.5;

// Card palette (prototype tokens).
export const C = {
  panel: "#0E1A1C",
  raised: "#13262A",
  line: "#27413F",
  text: "#EAF2F0",
  muted: "#86A39F",
  faint: "#5C7C79",
  clear: "#4FD1A8",
  watch: "#F2B544",
  tripped: "#FF6B5E",
  backdrop: "#081113",
};

// status: clear <0.30 · watch 0.30–0.49 · tripped ≥0.50
export function statusFor(v) {
  if (v >= TRIGGER) return { key: "tripped", label: "Triggered", accent: C.tripped };
  if (v >= 0.3) return { key: "watch", label: "Watch", accent: C.watch };
  return { key: "clear", label: "Clear", accent: C.clear };
}

// status × direction → honest copy in every data regime.
export function verdict(v, prev) {
  const s = statusFor(v);
  const rising = v > prev + 0.005;
  const cooling = v < prev - 0.005;
  let head, sub;
  if (s.key === "tripped") {
    head = "The rule just tripped.";
    sub = rising ? "Still climbing." : cooling ? "Easing, but past the line." : "Holding above the line.";
  } else if (s.key === "watch") {
    head = "Not yet — but watch it.";
    sub = rising ? "The gauge is climbing." : cooling ? "Backing off the line." : "Drifting near the middle.";
  } else {
    head = "No — the signal is calm.";
    sub = cooling ? "And it's cooling further." : rising ? "Ticking up, but low." : "Sitting comfortably low.";
  }
  return { ...s, head, sub, rising, cooling };
}

export function headroomFor(v) {
  return +(TRIGGER - v).toFixed(2);
}

// The one-line screenshot sentence.
export function takeawayFor(v) {
  const headroom = headroomFor(v);
  return headroom > 0
    ? `${headroom.toFixed(2)} pts of headroom before the recession line.`
    : `${Math.abs(headroom).toFixed(2)} pts past the line — the rule has fired.`;
}

// Track spans 0–0.80; clamp the marker so it stays on the rail.
export function markerPctFor(v) {
  return Math.max(2, Math.min(98, (v / 0.8) * 100));
}
export const TRIGGER_PCT = (TRIGGER / 0.8) * 100;
