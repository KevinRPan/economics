import { useState, useEffect, useMemo } from "react";
import { C } from "../../../lib/gauges.mjs";
import { evaluate } from "../../../lib/backtest.mjs";
import { encodeSignal, decodeSignal } from "../../../lib/signal-codec.mjs";
import { PRESETS } from "../../../lib/signal-presets.mjs";
import PresetChips from "./PresetChips";
import SignalBuilder from "./SignalBuilder";
import Scorecard from "./Scorecard";
import TimelineBar from "./TimelineBar";
import EventList from "./EventList";
import CaveatBox from "./CaveatBox";
import type { HistoriesData, Signal } from "../../../lib/dashboard-types";

export interface SignalLabProps {
  histories: HistoriesData;
  /** gauge ids on the user's board — offered first in the indicator picker */
  boardIds: string[];
  /** Optional pre-loaded signal (e.g. for static /signals/[preset] pages) */
  initialSignal?: Signal;
}

const STORAGE_KEY = "econ.signal.v1";

export default function SignalLab({
  histories,
  boardIds = [],
  initialSignal,
}: SignalLabProps) {
  // Initialize signal state: fallback order: initialSignal -> PRESETS[0].signal
  const defaultSig = initialSignal || PRESETS[0].signal;
  const [signal, setSignal] = useState<Signal>(defaultSig);

  // Client-side initialization from URL param (?s=) or localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const params = new URLSearchParams(window.location.search);
      const sParam = params.get("s");

      if (sParam) {
        const decoded = decodeSignal(sParam);
        if (decoded && decoded.conditions.length > 0) {
          setSignal(decoded);
          return;
        }
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const decoded = decodeSignal(stored);
        if (decoded && decoded.conditions.length > 0) {
          setSignal(decoded);
          return;
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Update URL (?s=) and localStorage when signal changes, preserving other query params
  function handleSignalChange(newSignal: Signal) {
    setSignal(newSignal);

    if (typeof window === "undefined") return;

    try {
      const encoded = encodeSignal(newSignal);
      localStorage.setItem(STORAGE_KEY, encoded);

      // Preserve existing query params like ?b=
      const url = new URL(window.location.href);
      url.searchParams.set("s", encoded);
      window.history.replaceState(null, "", url.toString());
    } catch {
      // ignore
    }
  }

  // Pure engine evaluation
  const result = useMemo(() => {
    return evaluate(signal, histories);
  }, [signal, histories]);

  return (
    <div
      style={{
        background: C.backdrop,
        color: C.text,
        padding: "24px 16px",
        fontFamily: "Inter, system-ui, sans-serif",
        minHeight: "100%",
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        {/* Curated Presets Bar */}
        <PresetChips currentSignal={signal} onSelectPreset={handleSignalChange} />

        {/* Responsive Grid: Desktop side-by-side, Mobile stacked */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 20,
            alignItems: "start",
          }}
        >
          {/* Left Column: Signal Builder + Caveat */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <SignalBuilder
              signal={signal}
              onChange={handleSignalChange}
              histories={histories}
              boardIds={boardIds}
            />
            <CaveatBox
              coverageStart={result.coverage.start}
              coverageEnd={result.coverage.end}
            />
          </div>

          {/* Right Column: Scorecard + Timeline + Event List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Scorecard signal={signal} result={result} />
            <TimelineBar result={result} windowMonths={signal.windowMonths} />
            <EventList
              events={result.events}
              target={signal.target}
              windowMonths={signal.windowMonths}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
