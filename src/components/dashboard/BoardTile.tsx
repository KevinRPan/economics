import { useState } from "react";
import { C } from "../../lib/gauges.mjs";
import type { TileData } from "./board-utils";

interface BoardTileProps {
  tile: TileData;
}

export default function BoardTile({ tile }: BoardTileProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href={tile.href}
      style={{
        display: "block",
        textDecoration: "none",
        background: C.panel,
        border: `1px solid ${hovered ? tile.accent + "77" : C.line}`,
        borderRadius: 14,
        padding: "16px 18px",
        position: "relative",
        overflow: "hidden",
        transform: hovered ? "translateY(-1.5px)" : "none",
        boxShadow: hovered
          ? `0 12px 24px -10px rgba(0,0,0,0.6), 0 0 16px ${tile.accent}15`
          : "0 4px 12px -4px rgba(0,0,0,0.4)",
        transition: "border-color .18s ease, transform .18s ease, box-shadow .18s ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Ambient accent wash */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: `radial-gradient(110% 55% at 92% -8%, ${tile.accent}18, transparent 65%)`,
          transition: "opacity .3s",
          opacity: hovered ? 1 : 0.7,
        }}
      />

      {/* Eyebrow & Status Badge */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          position: "relative",
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            letterSpacing: ".12em",
            textTransform: "uppercase",
            color: C.faint,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {tile.eyebrow}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            fontWeight: 700,
            color: tile.accent,
            background: `${tile.accent}18`,
            border: `1px solid ${tile.accent}33`,
            borderRadius: 99,
            padding: "2px 7px",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: tile.accent,
              boxShadow: `0 0 5px ${tile.accent}`,
            }}
          />
          {tile.label.toUpperCase()}
        </span>
      </div>

      {/* Headline Question */}
      <div
        style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontWeight: 700,
          fontSize: 17,
          lineHeight: 1.25,
          color: C.text,
          margin: "10px 0 10px",
          position: "relative",
        }}
      >
        {tile.headline}
      </div>

      {/* Value Readout & Sparkline */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          margin: "4px 0 8px",
          position: "relative",
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            fontSize: 22,
            color: tile.accent,
            whiteSpace: "nowrap",
            letterSpacing: "-.02em",
          }}
        >
          {tile.value}
        </div>

        {tile.sparkline && (
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
            <svg
              width={tile.sparkline.w}
              height={tile.sparkline.h}
              viewBox={`0 0 ${tile.sparkline.w} ${tile.sparkline.h}`}
              aria-hidden="true"
              style={{ overflow: "visible" }}
            >
              <path
                d={tile.sparkline.d}
                fill="none"
                stroke={tile.accent}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.85"
              />
              <circle
                cx={tile.sparkline.cx}
                cy={tile.sparkline.cy}
                r="2.5"
                fill={tile.accent}
              />
            </svg>
          </div>
        )}
      </div>

      {/* Verdict Head */}
      <div
        style={{
          fontSize: 13,
          lineHeight: 1.4,
          color: tile.accent,
          fontWeight: 500,
          marginBottom: 10,
          position: "relative",
        }}
      >
        {tile.head}
      </div>

      {/* Percentile line if present */}
      {tile.pctileLine && (
        <div
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 11.5,
            color: C.muted,
            lineHeight: 1.35,
            marginBottom: 8,
            position: "relative",
          }}
        >
          {tile.pctileLine}
        </div>
      )}

      {/* As-Of date & since regime change */}
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          letterSpacing: ".04em",
          color: C.faint,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: `1px solid ${C.line}44`,
          paddingTop: 8,
          marginTop: 4,
          position: "relative",
        }}
      >
        <span>
          as of {tile.asOf}
          {tile.since ? ` · ${tile.label.toLowerCase()} since ${tile.since}` : ""}
        </span>
        <span
          style={{
            color: hovered ? tile.accent : C.faint,
            transition: "color .15s",
          }}
        >
          View card →
        </span>
      </div>
    </a>
  );
}
