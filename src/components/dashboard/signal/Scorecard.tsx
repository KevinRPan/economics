import { useState } from "react";
import { C } from "../../../lib/gauges.mjs";
import { encodeSignal } from "../../../lib/signal-codec.mjs";
import { exportSignalCard } from "./canvas-export";
import type { Signal, TargetId } from "../../../lib/dashboard-types";
import type { BacktestResult } from "../../../lib/backtest.d.mts";
import { TARGET_OPTIONS } from "./SignalBuilder";

interface ScorecardProps {
  signal: Signal;
  result: BacktestResult;
}

const TARGET_NOUNS: Record<TargetId, string> = {
  recession: "recessions",
  bear: "stock crashes",
  joblessjump: "unemployment jumps",
  inflation: "inflation spikes",
  housing: "housing drops",
  fedcuts: "Fed cut cycles",
};

export function buildScorecardSentence(result: BacktestResult, target: TargetId): string {
  const { summary } = result;
  const noun = TARGET_NOUNS[target] || "events";

  if (summary.total === 0) {
    return `No ${noun} within data coverage`;
  }

  const parts: string[] = [
    `Caught ${summary.caught} of ${summary.total} ${noun}`,
  ];

  if (summary.avgLead !== null) {
    parts.push(`avg ${summary.avgLead} months early`);
  }

  const faNoun = summary.falseAlarms === 1 ? "false alarm" : "false alarms";
  parts.push(`${summary.falseAlarms} ${faNoun}`);

  if (summary.pending > 0) {
    parts.push(`${summary.pending} pending`);
  }

  return parts.join(" · ");
}

export default function Scorecard({ signal, result }: ScorecardProps) {
  const [copied, setCopied] = useState(false);

  const sentence = buildScorecardSentence(result, signal.target);
  const targetOpt = TARGET_OPTIONS.find((t) => t.id === signal.target);
  const targetLabel = targetOpt?.label || signal.target;

  async function handleShare() {
    const encoded = encodeSignal(signal);
    const url = new URL(typeof window !== "undefined" ? window.location.href : "https://econ.kpan.dev/dashboard");
    url.searchParams.set("s", encoded);
    const shareUrl = url.toString();

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Signal Lab — Econ Dashboard",
          text: sentence,
          url: shareUrl,
        });
        return;
      } catch {
        // Fall back to clipboard
      }
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // ignore
    }
  }

  function handleDownload() {
    exportSignalCard({
      signal,
      result,
      scorecardText: sentence,
      targetLabel,
    });
  }

  return (
    <div
      style={{
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderRadius: 16,
        padding: "24px 22px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient background wash */}
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 280,
          height: 180,
          background: result.isFiringNow
            ? `radial-gradient(ellipse at top right, ${C.red}18, transparent 70%)`
            : `radial-gradient(ellipse at top right, ${C.green}14, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Eyebrow & Firing Now status badge */}
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
          BACKTEST RESULTS · {targetLabel.toUpperCase()}
        </span>

        {/* Firing now badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "4px 10px",
            borderRadius: 20,
            background: result.isFiringNow ? `${C.red}20` : `${C.green}18`,
            border: `1px solid ${result.isFiringNow ? C.red : C.green}`,
            fontSize: 11.5,
            fontWeight: 600,
            fontFamily: "'JetBrains Mono', monospace",
            color: result.isFiringNow ? C.red : C.green,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: result.isFiringNow ? C.red : C.green,
              boxShadow: result.isFiringNow ? `0 0 8px ${C.red}` : "none",
            }}
          />
          {result.isFiringNow ? "FIRING NOW" : "CALM / NOT FIRING"}
        </div>
      </div>

      {/* Big Scorecard Sentence */}
      <h2
        style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontWeight: 700,
          fontSize: 24,
          lineHeight: 1.25,
          color: C.text,
          margin: "8px 0 16px",
          letterSpacing: "-.01em",
        }}
      >
        {sentence}
      </h2>

      {/* Action buttons: Share & Download Image */}
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button
          onClick={handleShare}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: C.raised,
            border: `1px solid ${copied ? C.green : C.line}`,
            color: copied ? C.green : C.text,
            borderRadius: 8,
            padding: "7px 14px",
            fontSize: 12.5,
            fontFamily: "Inter, sans-serif",
            fontWeight: 500,
            cursor: "pointer",
            transition: "all .15s ease",
          }}
        >
          {copied ? "Copied Link ✓" : "Share Signal ↗"}
        </button>

        <button
          onClick={handleDownload}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "transparent",
            border: `1px solid ${C.line}`,
            color: C.muted,
            borderRadius: 8,
            padding: "7px 14px",
            fontSize: 12.5,
            fontFamily: "Inter, sans-serif",
            fontWeight: 500,
            cursor: "pointer",
            transition: "all .15s ease",
          }}
        >
          Download Card ↓
        </button>
      </div>
    </div>
  );
}
