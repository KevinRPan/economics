import { useMemo } from "react";
import { C } from "../../lib/gauges.mjs";
import type { MarketsData, RecessionData } from "../../lib/types";
import { getTileData, type TileData } from "./board-utils";

interface DeskTickerProps {
  boardIds: string[];
  markets: MarketsData;
  recession: RecessionData;
  verdicts: any;
}

export default function DeskTicker({ boardIds, markets, recession, verdicts }: DeskTickerProps) {
  const items = useMemo(() => {
    return boardIds
      .map((id) => getTileData(id, markets, recession, verdicts))
      .filter((t): t is TileData => t !== null);
  }, [boardIds, markets, recession, verdicts]);

  if (items.length === 0) return null;

  return (
    <div
      style={{
        background: "rgba(14, 26, 28, 0.85)",
        backdropFilter: "blur(8px)",
        borderBottom: `1px solid ${C.line}`,
        borderTop: `1px solid ${C.line}`,
        padding: "6px 16px",
        overflow: "hidden",
        position: "relative",
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Ticker Lead */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            color: C.green,
            fontWeight: 700,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: C.green,
              boxShadow: `0 0 8px ${C.green}`,
            }}
          />
          <span>BOARD WIRE</span>
        </div>

        <span style={{ color: C.line, flexShrink: 0 }}>|</span>

        {/* Scrollable ticker items */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            overflowX: "auto",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            whiteSpace: "nowrap",
            paddingRight: 16,
          }}
        >
          {items.map((item) => {
            const shortName = item.eyebrow.split("·")[0].trim();
            return (
              <a
                key={item.id}
                href={item.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  textDecoration: "none",
                  color: C.text,
                  transition: "opacity .2s",
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: item.accent,
                  }}
                />
                <span style={{ color: C.muted, fontWeight: 500 }}>{shortName}</span>
                <span style={{ fontWeight: 700, color: item.accent }}>{item.value}</span>
                <span
                  style={{
                    fontSize: 9.5,
                    letterSpacing: ".05em",
                    textTransform: "uppercase",
                    padding: "1px 5px",
                    borderRadius: 3,
                    background: `${item.accent}22`,
                    color: item.accent,
                  }}
                >
                  {item.label}
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
