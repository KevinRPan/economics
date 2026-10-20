import { useMemo } from "react";
import { C } from "../../lib/gauges.mjs";
import { extractBreakingChanges, type BandChangeChip } from "./board-utils";

interface BreakingChipsProps {
  verdicts: any;
}

export default function BreakingChips({ verdicts }: BreakingChipsProps) {
  const chips = useMemo<BandChangeChip[]>(() => {
    return extractBreakingChanges(verdicts);
  }, [verdicts]);

  if (chips.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
        padding: "10px 0 16px",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: ".12em",
          textTransform: "uppercase",
          color: C.amber,
          background: "rgba(242, 181, 68, 0.12)",
          border: "1px solid rgba(242, 181, 68, 0.28)",
          borderRadius: 4,
          padding: "3px 7px",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 11 }}>⚡</span>
        <span>RECENT REGIME SHIFTS</span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          overflowX: "auto",
          scrollbarWidth: "none",
          paddingBottom: 2,
        }}
      >
        {chips.map((chip) => (
          <a
            key={`${chip.id}-${chip.date}`}
            href={`/${chip.slug}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              textDecoration: "none",
              background: C.panel,
              border: `1px solid ${C.line}`,
              borderRadius: 20,
              padding: "4px 11px",
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 11.5,
              color: C.text,
              whiteSpace: "nowrap",
              transition: "border-color .15s, background .15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = chip.accent;
              e.currentTarget.style.background = C.raised;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = C.line;
              e.currentTarget.style.background = C.panel;
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: chip.accent,
                boxShadow: `0 0 6px ${chip.accent}`,
              }}
            />
            <span style={{ fontWeight: 600 }}>{chip.name}:</span>
            <span style={{ color: C.muted, textDecoration: "line-through", opacity: 0.8 }}>
              {chip.fromLabel}
            </span>
            <span style={{ color: C.faint }}>→</span>
            <span style={{ color: chip.accent, fontWeight: 600 }}>{chip.toLabel}</span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: C.faint,
                marginLeft: 2,
              }}
            >
              ({chip.dateLabel})
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
