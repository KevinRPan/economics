import { useMemo } from "react";
import { C, GAUGES } from "../../../lib/gauges.mjs";
import type {
  Signal,
  SignalCondition,
  TargetId,
  HistoriesData,
} from "../../../lib/dashboard-types";

export const TARGET_OPTIONS: { id: TargetId; label: string; short: string; desc: string }[] = [
  { id: "recession", label: "Recessions", short: "Recession", desc: "NBER recession periods" },
  { id: "bear", label: "Stock crashes (20%+)", short: "Bear market", desc: "S&P 500 falls ≥20% from peak" },
  { id: "joblessjump", label: "Unemployment jumps", short: "Jobless jump", desc: "Unemployment rises ≥1.0 pt from 12-mo low" },
  { id: "inflation", label: "Inflation spikes", short: "Inflation spike", desc: "CPI inflation surges above 5% YoY" },
  { id: "housing", label: "Home prices falling", short: "Housing drop", desc: "Case-Shiller national price index YoY < 0" },
  { id: "fedcuts", label: "Fed starts cutting", short: "Fed cuts", desc: "Fed funds rate falls ≥0.5 pt from 12-mo max" },
];

interface SignalBuilderProps {
  signal: Signal;
  onChange: (newSignal: Signal) => void;
  histories?: HistoriesData;
  boardIds: string[];
}

export function getIndicatorMeta(id: string) {
  if (id === "recession") {
    return {
      id: "recession",
      name: "Sahm Rule",
      eyebrow: "Sahm Rule · Unemployment Momentum",
      bands: [
        { key: "clear", label: "Clear (<0.3)", accent: C.green },
        { key: "watch", label: "Watch (0.3–0.5)", accent: C.amber },
        { key: "tripped", label: "Triggered (≥0.5)", accent: C.red },
      ],
    };
  }

  const gauge = GAUGES ? GAUGES[id] : null;
  if (gauge && Array.isArray(gauge.bands)) {
    return {
      id: gauge.id,
      name: gauge.short || gauge.id,
      eyebrow: gauge.eyebrow || gauge.id,
      bands: gauge.bands.map((b: any) => ({
        key: b.key,
        label: b.label,
        accent: b.accent,
      })),
    };
  }

  return {
    id,
    name: id,
    eyebrow: id,
    bands: [],
  };
}

export default function SignalBuilder({
  signal,
  onChange,
  histories,
  boardIds,
}: SignalBuilderProps) {
  // Available indicator IDs: prioritize boardIds first, then catalog
  const availableIndicators = useMemo(() => {
    const set = new Set<string>();
    // Core indicators
    set.add("recession");
    if (GAUGES) {
      Object.keys(GAUGES).forEach((k) => set.add(k));
    }
    if (histories?.indicators) {
      Object.keys(histories.indicators).forEach((k) => set.add(k));
    }

    const all = Array.from(set);
    const boardSet = new Set(boardIds || []);

    const onBoard = all.filter((id) => boardSet.has(id));
    const others = all.filter((id) => !boardSet.has(id));

    return [...onBoard, ...others];
  }, [histories, boardIds]);

  function updateCondition(idx: number, patch: Partial<SignalCondition>) {
    const updated = signal.conditions.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    onChange({ ...signal, conditions: updated });
  }

  function removeCondition(idx: number) {
    const updated = signal.conditions.filter((_, i) => i !== idx);
    onChange({ ...signal, conditions: updated });
  }

  function addCondition() {
    if (signal.conditions.length >= 3) return;
    // Pick first unused indicator
    const used = new Set(signal.conditions.map((c) => c.indicator));
    const nextInd = availableIndicators.find((id) => !used.has(id)) || availableIndicators[0] || "curve";
    const meta = getIndicatorMeta(nextInd);
    const defaultBands = meta.bands.slice(0, 1).map((b) => b.key);

    onChange({
      ...signal,
      conditions: [...signal.conditions, { indicator: nextInd, bands: defaultBands }],
    });
  }

  function toggleBand(condIdx: number, bandKey: string) {
    const cond = signal.conditions[condIdx];
    const has = cond.bands.includes(bandKey);
    let nextBands: string[];
    if (has) {
      nextBands = cond.bands.filter((b) => b !== bandKey);
    } else {
      nextBands = [...cond.bands, bandKey];
    }
    updateCondition(condIdx, { bands: nextBands });
  }

  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderRadius: 16,
        padding: 22,
      }}
    >
      <div
        style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontWeight: 700,
          fontSize: 18,
          color: C.text,
          marginBottom: 16,
        }}
      >
        Build a Cross-Signal
      </div>

      {/* Conditions list (up to 3) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {signal.conditions.map((cond, idx) => {
          const meta = getIndicatorMeta(cond.indicator);
          const isBoard = boardIds.includes(cond.indicator);

          return (
            <div
              key={idx}
              style={{
                background: C.raised,
                border: `1px solid ${C.line}`,
                borderRadius: 12,
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      fontWeight: 600,
                      color: C.faint,
                    }}
                  >
                    IF {idx > 0 ? "AND " : ""}
                  </span>
                  <select
                    value={cond.indicator}
                    onChange={(e) => {
                      const nextInd = e.target.value;
                      const nextMeta = getIndicatorMeta(nextInd);
                      updateCondition(idx, {
                        indicator: nextInd,
                        bands: nextMeta.bands.slice(0, 1).map((b) => b.key),
                      });
                    }}
                    style={{
                      background: C.panel,
                      color: C.text,
                      border: `1px solid ${C.line}`,
                      borderRadius: 8,
                      padding: "4px 10px",
                      fontSize: 13,
                      fontFamily: "Inter, sans-serif",
                      cursor: "pointer",
                    }}
                  >
                    {availableIndicators.map((id) => {
                      const m = getIndicatorMeta(id);
                      const onB = boardIds.includes(id);
                      return (
                        <option key={id} value={id}>
                          {onB ? "★ " : ""}
                          {m.name}
                        </option>
                      );
                    })}
                  </select>
                  {isBoard && (
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 10,
                        color: C.green,
                        letterSpacing: ".06em",
                      }}
                    >
                      BOARD
                    </span>
                  )}
                </div>

                {signal.conditions.length > 1 && (
                  <button
                    onClick={() => removeCondition(idx)}
                    title="Remove indicator"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: C.faint,
                      cursor: "pointer",
                      fontSize: 16,
                      padding: "2px 6px",
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Band chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    color: C.faint,
                    alignSelf: "center",
                    marginRight: 4,
                  }}
                >
                  is:
                </span>
                {meta.bands.map((b) => {
                  const active = cond.bands.includes(b.key);
                  return (
                    <button
                      key={b.key}
                      onClick={() => toggleBand(idx, b.key)}
                      style={{
                        background: active ? `${b.accent}24` : "transparent",
                        border: `1px solid ${active ? b.accent : C.line}`,
                        color: active ? b.accent : C.muted,
                        borderRadius: 14,
                        padding: "3px 10px",
                        fontSize: 11.5,
                        fontFamily: "Inter, sans-serif",
                        fontWeight: active ? 600 : 400,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        transition: "all .15s ease",
                      }}
                    >
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background: b.accent,
                          opacity: active ? 1 : 0.4,
                        }}
                      />
                      {b.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add condition button */}
      {signal.conditions.length < 3 && (
        <button
          onClick={addCondition}
          style={{
            marginTop: 10,
            width: "100%",
            background: "transparent",
            border: `1px dashed ${C.line}`,
            borderRadius: 10,
            padding: "8px 12px",
            color: C.muted,
            fontSize: 12.5,
            fontFamily: "Inter, sans-serif",
            cursor: "pointer",
            transition: "all .15s ease",
          }}
        >
          + Add another indicator (AND)
        </button>
      )}

      {/* Hold months stepper */}
      <div
        style={{
          marginTop: 20,
          paddingTop: 16,
          borderTop: `1px solid ${C.line}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>
            Must hold for
          </div>
          <div style={{ fontSize: 11.5, color: C.faint }}>
            Consecutive months before signal fires
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => onChange({ ...signal, holdMonths: Math.max(0, signal.holdMonths - 1) })}
            disabled={signal.holdMonths <= 0}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: C.raised,
              border: `1px solid ${C.line}`,
              color: signal.holdMonths <= 0 ? C.faint : C.text,
              cursor: signal.holdMonths <= 0 ? "default" : "pointer",
              fontSize: 14,
            }}
          >
            −
          </button>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 13,
              fontWeight: 600,
              color: C.green,
              minWidth: 70,
              textAlign: "center",
            }}
          >
            {signal.holdMonths === 0 ? "0 mo (now)" : `${signal.holdMonths} mo`}
          </span>
          <button
            onClick={() => onChange({ ...signal, holdMonths: Math.min(6, signal.holdMonths + 1) })}
            disabled={signal.holdMonths >= 6}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: C.raised,
              border: `1px solid ${C.line}`,
              color: signal.holdMonths >= 6 ? C.faint : C.text,
              cursor: signal.holdMonths >= 6 ? "default" : "pointer",
              fontSize: 14,
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* Target selector */}
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 13, color: C.text, fontWeight: 500, marginBottom: 8 }}>
          Backtest against target
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {TARGET_OPTIONS.map((t) => {
            const isSelected = signal.target === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onChange({ ...signal, target: t.id })}
                style={{
                  background: isSelected ? `${C.green}18` : C.raised,
                  border: `1px solid ${isSelected ? C.green : C.line}`,
                  color: isSelected ? C.green : C.muted,
                  borderRadius: 8,
                  padding: "8px 10px",
                  fontSize: 12,
                  fontFamily: "Inter, sans-serif",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all .15s ease",
                }}
              >
                <div style={{ fontWeight: isSelected ? 600 : 500 }}>{t.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Window slider (6..24 mo) */}
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>
            Lead window
          </div>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12.5,
              fontWeight: 600,
              color: C.green,
            }}
          >
            within {signal.windowMonths} months
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: C.faint, marginBottom: 8 }}>
          Counts if the signal fires within this window before an episode starts
        </div>
        <input
          type="range"
          min={6}
          max={24}
          step={1}
          value={signal.windowMonths}
          onChange={(e) => onChange({ ...signal, windowMonths: parseInt(e.target.value, 10) })}
          style={{
            width: "100%",
            accentColor: C.green,
            cursor: "pointer",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace",
            color: C.faint,
            marginTop: 4,
          }}
        >
          <span>6 mo</span>
          <span>12 mo (default)</span>
          <span>24 mo</span>
        </div>
      </div>
    </div>
  );
}
