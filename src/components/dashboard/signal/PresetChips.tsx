import { PRESETS } from "../../../lib/signal-presets.mjs";
import { encodeSignal } from "../../../lib/signal-codec.mjs";
import type { Signal } from "../../../lib/dashboard-types";
import { C } from "../../../lib/gauges.mjs";

interface PresetChipsProps {
  currentSignal: Signal;
  onSelectPreset: (signal: Signal) => void;
}

export default function PresetChips({ currentSignal, onSelectPreset }: PresetChipsProps) {
  const currentEncoded = encodeSignal(currentSignal);

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          letterSpacing: ".12em",
          color: C.faint,
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        Curated Recipes
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {PRESETS.map((preset) => {
          const isSelected = encodeSignal(preset.signal) === currentEncoded;
          return (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset.signal)}
              title={preset.description}
              style={{
                background: isSelected ? C.raised : "transparent",
                color: isSelected ? C.green : C.muted,
                border: `1px solid ${isSelected ? C.green : C.line}`,
                borderRadius: 20,
                padding: "6px 14px",
                fontSize: 12.5,
                fontWeight: isSelected ? 600 : 400,
                fontFamily: "Inter, system-ui, sans-serif",
                cursor: "pointer",
                transition: "all .15s ease",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: isSelected ? C.green : C.faint,
                }}
              />
              {preset.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}
