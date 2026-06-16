import { useState, useMemo, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip,
} from "recharts";
import {
  C, TRIGGER, TRIGGER_PCT, verdict, takeawayFor, markerPctFor,
} from "../lib/recession.mjs";
import type { RecessionData } from "../lib/types";

/* ───────────────────────────────────────────────────────────────────────────
   RECESSION CARD — ported verbatim from the prototype (RecessionCard.jsx).
   Now fed by baked FRED data (recession.json) instead of an embedded snapshot,
   with a real per-region URL and a "Share" that copies the static link.

   Signature: a "threshold track" measuring live distance to the 0.50 Sahm line.
   The card recolors by verdict (clear / watch / tripped).
─────────────────────────────────────────────────────────────────────────── */

interface Props {
  data: RecessionData;
  /** region code to show on load ("national" | "CA" | …) */
  initialRegion: string;
}

export default function RecessionCard({ data, initialRegion }: Props) {
  const [region, setRegion] = useState(initialRegion);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const regions = data.regions;
  const r = regions[region] ?? regions.national;
  const v = verdict(r.value, r.prev);
  const markerPct = markerPctFor(r.value);
  const takeaway = takeawayFor(r.value);

  // The card holds every region client-side; selecting one updates the URL to
  // its static path so direct loads and crawlers still get the right page + OG.
  function pathFor(code: string) {
    return code === "national" ? "/recession" : `/recession/${regions[code].slug}`;
  }
  function selectRegion(code: string) {
    setRegion(code);
    if (typeof window !== "undefined") {
      window.history.pushState({ region: code }, "", pathFor(code));
    }
  }
  // Keep the card in sync with browser back/forward.
  useEffect(() => {
    function onPop() {
      const seg = window.location.pathname.replace(/^\/recession\/?/, "").replace(/\/$/, "");
      const code = seg ? (seg.toUpperCase() in regions ? seg.toUpperCase() : "national") : "national";
      setRegion(code);
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [regions]);

  const chartData = useMemo(() => r.series.filter((d) => d.sahm != null).slice(-24), [r]);

  function share() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${pathFor(region)}`
        : `https://econ.kpan.dev${pathFor(region)}`;
    try {
      navigator.clipboard?.writeText(url);
    } catch {
      /* clipboard may be unavailable */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const fade = "@media (prefers-reduced-motion: reduce){*{transition:none!important}}";
  const nat = regions.national;

  return (
    <div style={{ background: C.backdrop, padding: 20, minHeight: "100%", fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{fade}</style>

      <div
        style={{
          maxWidth: 460, margin: "0 auto", background: C.panel,
          border: `1px solid ${C.line}`, borderRadius: 18, padding: "26px 24px 18px",
          boxShadow: "0 24px 60px -28px rgba(0,0,0,.8)", position: "relative", overflow: "hidden",
        }}
      >
        {/* ambient accent wash, tied to verdict */}
        <div
          style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: `radial-gradient(120% 60% at 88% -8%, ${v.accent}1f, transparent 60%)`,
            transition: "background .5s ease",
          }}
        />

        {/* eyebrow */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
          <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, letterSpacing: ".14em", color: C.faint, textTransform: "uppercase" }}>
            Sahm Rule · Recession Nowcast
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: v.accent, letterSpacing: ".04em" }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: v.accent, boxShadow: `0 0 10px ${v.accent}` }} />
            {v.label.toUpperCase()}
          </span>
        </div>

        {/* headline */}
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 27, lineHeight: 1.08, color: C.text, margin: "16px 0 4px", letterSpacing: "-.01em" }}>
          Are we in a recession?
        </h1>

        {/* verdict */}
        <div style={{ position: "relative", margin: "12px 0 22px" }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 21, color: v.accent, lineHeight: 1.1, transition: "color .35s ease" }}>
            {v.head}
          </div>
          <div style={{ fontSize: 14, color: C.muted, marginTop: 3 }}>{v.sub}</div>
        </div>

        {/* ── signature: threshold track ── */}
        <div style={{ position: "relative", marginBottom: 8 }}>
          <div style={{ position: "relative", height: 46 }}>
            {/* baseline */}
            <div style={{ position: "absolute", top: 28, left: 0, right: 0, height: 3, borderRadius: 3, background: C.raised }} />
            {/* filled portion up to marker */}
            <div style={{ position: "absolute", top: 28, left: 0, height: 3, borderRadius: 3, width: `${markerPct}%`, background: v.accent, transition: "width .5s cubic-bezier(.4,0,.2,1), background .35s" }} />
            {/* trigger wall */}
            <div style={{ position: "absolute", top: 16, bottom: 4, left: `${TRIGGER_PCT}%`, width: 2, background: C.tripped }} />
            <div style={{ position: "absolute", top: 2, left: `${TRIGGER_PCT}%`, transform: "translateX(-50%)", fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: C.tripped, whiteSpace: "nowrap" }}>
              TRIGGER 0.50
            </div>
            {/* current marker */}
            <div style={{ position: "absolute", top: 20, left: `${markerPct}%`, transform: "translateX(-50%)", transition: "left .5s cubic-bezier(.4,0,.2,1)" }}>
              <div style={{ width: 0, height: 0, margin: "0 auto", borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: `8px solid ${v.accent}` }} />
            </div>
            <div style={{ position: "absolute", top: 32, left: `${markerPct}%`, transform: "translateX(-50%)", fontFamily: "JetBrains Mono, monospace", fontWeight: 700, fontSize: 13, color: v.accent, transition: "left .5s cubic-bezier(.4,0,.2,1), color .35s", whiteSpace: "nowrap" }}>
              {r.value.toFixed(2)}
            </div>
          </div>
        </div>

        {/* takeaway sentence (screenshot line) */}
        <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 500, fontSize: 15.5, color: C.text, margin: "10px 0 20px", lineHeight: 1.35 }}>
          {takeaway}
        </p>

        {/* personalization */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <label style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>Where you live</label>
          <select
            value={region}
            onChange={(e) => selectRegion(e.target.value)}
            style={{ background: C.raised, color: C.text, border: `1px solid ${C.line}`, borderRadius: 9, padding: "7px 11px", fontSize: 13, fontFamily: "Inter, sans-serif", outline: "none", cursor: "pointer", appearance: "none", minWidth: 150 }}
          >
            {Object.values(regions).map((val) => (
              <option key={val.code} value={val.code} style={{ background: C.panel }}>
                {val.name}
              </option>
            ))}
          </select>
          {region !== "national" && (
            <span style={{ fontSize: 12, color: C.faint }}>
              vs US {nat.value.toFixed(2)}
              {r.value > nat.value ? " — closer to the line" : " — further from it"}
            </span>
          )}
        </div>

        {/* deep dive */}
        <button
          onClick={() => setOpen((o) => !o)}
          style={{ marginTop: 20, width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "transparent", border: "none", borderTop: `1px solid ${C.line}`, padding: "14px 0 4px", color: C.muted, fontSize: 12.5, fontFamily: "JetBrains Mono, monospace", letterSpacing: ".06em", cursor: "pointer" }}
        >
          <span>HOW THIS IS MEASURED</span>
          <span style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .25s" }}>▸</span>
        </button>

        {open && (
          <div style={{ paddingTop: 12 }}>
            <div style={{ height: 150, marginBottom: 14 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 6, right: 8, bottom: 0, left: -22 }}>
                  <XAxis dataKey="t" tick={{ fill: C.faint, fontSize: 9 }} interval={4} axisLine={{ stroke: C.line }} tickLine={false} />
                  <YAxis domain={[0, 0.7]} ticks={[0, 0.25, 0.5]} tick={{ fill: C.faint, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 12, color: C.text }} labelStyle={{ color: C.muted }} />
                  <ReferenceLine y={TRIGGER} stroke={C.tripped} strokeDasharray="4 4" label={{ value: "0.50 trigger", fill: C.tripped, fontSize: 9, position: "insideTopRight" }} />
                  <Line type="monotone" dataKey="sahm" stroke={v.accent} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.55, margin: "0 0 10px" }}>
              The <strong style={{ color: C.text }}>Sahm rule</strong> flags the start of a recession when the
              3-month average unemployment rate rises <strong style={{ color: C.text }}>0.50 pts</strong> above
              its lowest point in the prior 12 months. One series, no model — it has caught all 11 U.S. recessions
              since 1950, usually ~3 months in.
            </p>
            <ul style={{ fontSize: 12.5, color: C.faint, lineHeight: 1.6, margin: 0, paddingLeft: 18 }}>
              <li>It dates a downturn that's begun — it doesn't forecast one.</li>
              <li>Soft landings can trip it falsely: it brushed the line in 2024 with no recession.</li>
              <li>Unemployment gets revised each January, which can nudge past readings.</li>
            </ul>

            <div style={{ marginTop: 14, padding: 10, borderRadius: 9, background: C.raised, fontSize: 11.5, color: C.faint, fontFamily: "JetBrains Mono, monospace", lineHeight: 1.5 }}>
              national = FRED UNRATE (computed) · state = FRED {"{STATE}UR"} ·
              data {data.meta.live ? "live from FRED" : "illustrative seed"} · as of {data.meta.asOfLabel}
            </div>
          </div>
        )}

        {/* footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
          <span style={{ fontSize: 10.5, color: C.faint, fontFamily: "JetBrains Mono, monospace" }}>
            {data.meta.source} · as of {data.meta.asOfLabel} · {r.computed ? "computed" : "illustrative"}
          </span>
          <button
            onClick={share}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.raised, color: copied ? v.accent : C.text, border: `1px solid ${C.line}`, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer", transition: "color .2s" }}
          >
            {copied ? "Copied ✓" : "Share ↗"}
          </button>
        </div>
      </div>
    </div>
  );
}
