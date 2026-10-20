import { useMemo } from "react";
import { C } from "../../../lib/gauges.mjs";
import { diffMonths, addMonths, parseMonth } from "../../../lib/backtest.mjs";
import type { BacktestResult } from "../../../lib/backtest.d.mts";

interface TimelineBarProps {
  result: BacktestResult;
  windowMonths?: number;
}

export default function TimelineBar({ result }: TimelineBarProps) {
  const { coverage, events, fires, activeMonths, falseAlarms, pending } = result;

  const totalMonths = useMemo(() => {
    if (!coverage.start || !coverage.end) return 0;
    return diffMonths(coverage.start, coverage.end) + 1;
  }, [coverage]);

  // Convert month key to 0..100% position
  function getPct(m: string): number {
    if (!coverage.start || totalMonths <= 0) return 0;
    const diff = diffMonths(coverage.start, m);
    return Math.max(0, Math.min(100, (diff / totalMonths) * 100));
  }

  // Generate Year tick marks
  const yearTicks = useMemo(() => {
    if (!coverage.start || !coverage.end || totalMonths <= 0) return [];
    const startY = parseMonth(coverage.start).year;
    const endY = parseMonth(coverage.end).year;

    // Pick a step: 5 years or 10 years
    const spanYears = endY - startY;
    const step = spanYears > 30 ? 10 : spanYears > 10 ? 5 : 2;

    const ticks: { year: number; pct: number }[] = [];
    const firstTick = Math.ceil(startY / step) * step;

    for (let y = firstTick; y <= endY; y += step) {
      const m = `${y}-01`;
      if (m >= coverage.start && m <= coverage.end) {
        ticks.push({ year: y, pct: getPct(m) });
      }
    }
    return ticks;
  }, [coverage, totalMonths]);

  // Group activeMonths into contiguous spans
  const activeSpans = useMemo(() => {
    if (!activeMonths || activeMonths.length === 0) return [];
    const spans: { start: string; end: string }[] = [];
    let curStart = activeMonths[0];
    let curEnd = activeMonths[0];

    for (let i = 1; i < activeMonths.length; i++) {
      const nextMonth = activeMonths[i];
      if (diffMonths(curEnd, nextMonth) === 1) {
        curEnd = nextMonth;
      } else {
        spans.push({ start: curStart, end: curEnd });
        curStart = nextMonth;
        curEnd = nextMonth;
      }
    }
    spans.push({ start: curStart, end: curEnd });
    return spans;
  }, [activeMonths]);

  if (!coverage.start || !coverage.end || totalMonths <= 0) {
    return (
      <div
        style={{
          background: C.panel,
          border: `1px solid ${C.line}`,
          borderRadius: 16,
          padding: 20,
          color: C.faint,
          fontSize: 13,
          textAlign: "center",
        }}
      >
        No overlapping data available for this indicator combination.
      </div>
    );
  }

  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderRadius: 16,
        padding: 20,
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: ".12em",
            color: C.faint,
            textTransform: "uppercase",
          }}
        >
          Timeline ({coverage.start} → {coverage.end})
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 12, fontSize: 11, color: C.muted }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 10, height: 10, background: `${C.amber}33`, borderRadius: 2 }} />
            Target Episode
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 10, height: 10, background: `${C.green}44`, borderRadius: 2 }} />
            Signal Active
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green }} />
            Fire (Hit)
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.red }} />
            False Alarm
          </span>
        </div>
      </div>

      {/* The Timeline Track Container */}
      <div
        style={{
          position: "relative",
          height: 80,
          background: C.raised,
          borderRadius: 8,
          border: `1px solid ${C.line}`,
          overflow: "hidden",
        }}
      >
        {/* Shaded Target Episodes */}
        {events.map((e, idx) => {
          const sPct = getPct(e.event.start);
          const endMonth = e.event.end || coverage.end;
          const ePct = getPct(addMonths(endMonth!, 1));
          const width = Math.max(0.6, ePct - sPct);

          return (
            <div
              key={idx}
              title={`Target episode: ${e.event.start} – ${e.event.end || "ongoing"}`}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `${sPct}%`,
                width: `${width}%`,
                background: `${C.amber}24`,
                borderLeft: `1px solid ${C.amber}66`,
                borderRight: `1px solid ${C.amber}66`,
                pointerEvents: "auto",
              }}
            />
          );
        })}

        {/* Signal Active Spans */}
        {activeSpans.map((span, idx) => {
          const sPct = getPct(span.start);
          const ePct = getPct(addMonths(span.end, 1));
          const width = Math.max(0.6, ePct - sPct);

          return (
            <div
              key={idx}
              title={`Signal active: ${span.start} – ${span.end}`}
              style={{
                position: "absolute",
                top: 32,
                height: 18,
                left: `${sPct}%`,
                width: `${width}%`,
                background: `${C.green}44`,
                borderRadius: 2,
              }}
            />
          );
        })}

        {/* Fire Markers */}
        {fires.map((fireMonth) => {
          const pct = getPct(fireMonth);
          const isFalseAlarm = falseAlarms.includes(fireMonth);
          const isPending = pending.includes(fireMonth);

          const color = isFalseAlarm ? C.red : isPending ? C.amber : C.green;

          return (
            <div
              key={fireMonth}
              title={`Fire at ${fireMonth} (${isFalseAlarm ? "False alarm" : isPending ? "Pending" : "Hit"})`}
              style={{
                position: "absolute",
                top: 18,
                left: `${pct}%`,
                transform: "translateX(-50%)",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: color,
                boxShadow: `0 0 6px ${color}`,
                zIndex: 3,
              }}
            />
          );
        })}
      </div>

      {/* Year labels axis */}
      <div style={{ position: "relative", height: 20, marginTop: 6 }}>
        {yearTicks.map((t) => (
          <div
            key={t.year}
            style={{
              position: "absolute",
              left: `${t.pct}%`,
              transform: "translateX(-50%)",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: C.faint,
            }}
          >
            {t.year}
          </div>
        ))}
      </div>
    </div>
  );
}
