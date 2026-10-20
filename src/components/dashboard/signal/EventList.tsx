import { C } from "../../../lib/gauges.mjs";
import type { BacktestEventResult } from "../../../lib/backtest.d.mts";
import type { TargetId } from "../../../lib/dashboard-types";
import { parseMonth } from "../../../lib/backtest.mjs";

interface EventListProps {
  events: BacktestEventResult[];
  target?: TargetId;
  windowMonths: number;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatMonthPretty(m: string | null): string {
  if (!m) return "";
  const { year, month } = parseMonth(m);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export default function EventList({ events, windowMonths }: EventListProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            letterSpacing: ".12em",
            color: C.faint,
            textTransform: "uppercase",
          }}
        >
          Target Episodes ({events.length})
        </span>
        <span style={{ fontSize: 11.5, color: C.faint }}>
          Window: {windowMonths} mo lead
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {events.map((res, idx) => {
          const { event, caught, leadMonths, firstFire } = res;
          const startLabel = formatMonthPretty(event.start);
          const endLabel = event.end ? formatMonthPretty(event.end) : "ongoing";

          return (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: C.raised,
                border: `1px solid ${C.line}`,
                borderRadius: 10,
                padding: "10px 14px",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.text,
                  }}
                >
                  {startLabel} – {endLabel}
                </div>
                <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>
                  {caught
                    ? `Fired in ${formatMonthPretty(firstFire)} (${leadMonths} mo lead)`
                    : `No fire within ${windowMonths} mo before start`}
                </div>
              </div>

              {/* Status Badge */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 10px",
                  borderRadius: 14,
                  fontSize: 11.5,
                  fontWeight: 600,
                  fontFamily: "Inter, sans-serif",
                  background: caught ? `${C.green}20` : `${C.muted}18`,
                  color: caught ? C.green : C.muted,
                  border: `1px solid ${caught ? C.green : C.line}`,
                }}
              >
                <span>{caught ? "✓" : "✗"}</span>
                <span>{caught ? "Caught" : "Missed"}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
