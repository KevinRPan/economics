import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip,
} from "recharts";
import {
  C, GAUGES, gaugeVerdict, markerPct, bandSegments, fmt,
} from "../lib/gauges.mjs";
import type { MarketsData } from "../lib/types";

/* ───────────────────────────────────────────────────────────────────────────
   GAUGE CARD — the reusable hype/mania/greed card.

   One component drives all three market gauges (Buffett Indicator, VIX, credit
   spread). It reads its config from src/lib/gauges.mjs by `gaugeId` and its live
   reading from baked markets.json — so the React island and the build-time OG
   image render identical verdicts, exactly like the recession card.

   Signature: a banded rail showing where today's reading sits between "calm" and
   "mania", recoloured by the verdict band.
─────────────────────────────────────────────────────────────────────────── */

interface Props {
  data: MarketsData;
  gaugeId: string;
}

export default function GaugeCard({ data, gaugeId }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const gauge = GAUGES[gaugeId];
  const r = data.gauges[gaugeId];
  const v = gaugeVerdict(gauge, r.value, r.prev);
  const pct = markerPct(gauge, r.value);
  const linePct = markerPct(gauge, gauge.keyLine.value);
  const segments = bandSegments(gauge);
  const takeaway = gauge.takeaway(r.value);

  const chartData = useMemo(() => r.series.slice(-24), [r]);

  function share() {
    const path = `/${gauge.slug}`;
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${path}`
        : `https://econ.kpan.dev${path}`;
    try {
      navigator.clipboard?.writeText(url);
    } catch {
      /* clipboard may be unavailable */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const fade = "@media (prefers-reduced-motion: reduce){*{transition:none!important}}";

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
            {gauge.eyebrow}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: v.accent, letterSpacing: ".04em" }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: v.accent, boxShadow: `0 0 10px ${v.accent}` }} />
            {v.label.toUpperCase()}
          </span>
        </div>

        {/* headline */}
        <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 27, lineHeight: 1.08, color: C.text, margin: "16px 0 4px", letterSpacing: "-.01em" }}>
          {gauge.headline}
        </h1>

        {/* verdict */}
        <div style={{ position: "relative", margin: "12px 0 22px" }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 21, color: v.accent, lineHeight: 1.1, transition: "color .35s ease" }}>
            {v.head}
          </div>
          <div style={{ fontSize: 14, color: C.muted, marginTop: 3 }}>{v.sub}</div>
        </div>

        {/* ── signature: banded rail ── */}
        <div style={{ position: "relative", marginBottom: 8 }}>
          <div style={{ position: "relative", height: 46 }}>
            {/* coloured band segments */}
            {segments.map((s, i) => (
              <div
                key={i}
                style={{
                  position: "absolute", top: 28, height: 3,
                  left: `${s.start}%`, width: `${Math.max(0, s.end - s.start)}%`,
                  background: s.accent, opacity: 0.32,
                  borderRadius: i === 0 ? "3px 0 0 3px" : i === segments.length - 1 ? "0 3px 3px 0" : 0,
                }}
              />
            ))}
            {/* key reference line */}
            <div style={{ position: "absolute", top: 16, bottom: 4, left: `${linePct}%`, width: 2, background: C.muted }} />
            <div style={{ position: "absolute", top: 2, left: `${linePct}%`, transform: "translateX(-50%)", fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: C.muted, whiteSpace: "nowrap" }}>
              {gauge.keyLine.label}
            </div>
            {/* current marker */}
            <div style={{ position: "absolute", top: 20, left: `${pct}%`, transform: "translateX(-50%)", transition: "left .5s cubic-bezier(.4,0,.2,1)" }}>
              <div style={{ width: 0, height: 0, margin: "0 auto", borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: `8px solid ${v.accent}` }} />
            </div>
            <div style={{ position: "absolute", top: 32, left: `${pct}%`, transform: "translateX(-50%)", fontFamily: "JetBrains Mono, monospace", fontWeight: 700, fontSize: 13, color: v.accent, transition: "left .5s cubic-bezier(.4,0,.2,1), color .35s", whiteSpace: "nowrap" }}>
              {fmt(gauge, r.value)}
            </div>
          </div>
        </div>

        {/* takeaway sentence (screenshot line) */}
        <p style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 500, fontSize: 15.5, color: C.text, margin: "10px 0 20px", lineHeight: 1.35 }}>
          {takeaway}
        </p>

        {/* deep dive */}
        <button
          onClick={() => setOpen((o) => !o)}
          style={{ marginTop: 4, width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "transparent", border: "none", borderTop: `1px solid ${C.line}`, padding: "14px 0 4px", color: C.muted, fontSize: 12.5, fontFamily: "JetBrains Mono, monospace", letterSpacing: ".06em", cursor: "pointer" }}
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
                  <YAxis domain={gauge.chart.domain} ticks={gauge.chart.ticks} tick={{ fill: C.faint, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: C.raised, border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 12, color: C.text }} labelStyle={{ color: C.muted }} />
                  <ReferenceLine y={gauge.keyLine.value} stroke={C.muted} strokeDasharray="4 4" label={{ value: gauge.chart.refLabel, fill: C.muted, fontSize: 9, position: "insideTopRight" }} />
                  <Line type="monotone" dataKey="v" stroke={v.accent} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.55, margin: "0 0 10px" }}>
              {gauge.method.blurb}
            </p>
            <ul style={{ fontSize: 12.5, color: C.faint, lineHeight: 1.6, margin: 0, paddingLeft: 18 }}>
              {gauge.method.bullets.map((b: string, i: number) => (
                <li key={i}>{b}</li>
              ))}
            </ul>

            <div style={{ marginTop: 14, padding: 10, borderRadius: 9, background: C.raised, fontSize: 11.5, color: C.faint, fontFamily: "JetBrains Mono, monospace", lineHeight: 1.5 }}>
              {gauge.method.footnote} · data {data.meta.live ? "live from FRED" : "illustrative seed"} · as of {data.meta.asOfLabel}
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

      {/* feed nav back to the other cards */}
      <div style={{ maxWidth: 460, margin: "14px auto 0", textAlign: "center" }}>
        <a href="/" style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, letterSpacing: ".06em", color: C.faint, textDecoration: "none" }}>
          ← all cards
        </a>
      </div>
    </div>
  );
}
