import { C } from "../../../lib/gauges.mjs";

interface CaveatBoxProps {
  coverageStart?: string | null;
  coverageEnd?: string | null;
}

export default function CaveatBox({ coverageStart, coverageEnd }: CaveatBoxProps) {
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
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          letterSpacing: ".12em",
          color: C.faint,
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        Why backtests can fool you
      </div>

      <ul
        style={{
          margin: 0,
          paddingLeft: 18,
          fontSize: 12.5,
          color: C.muted,
          lineHeight: 1.6,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <li>
          <strong style={{ color: C.text }}>Small sample sizes:</strong> Modern macroeconomic
          history only has a handful of recessions and crashes. High hit rates can easily occur by
          chance over few observations.
        </li>
        <li>
          <strong style={{ color: C.text }}>Revised data vs. real-time:</strong> This backtest uses
          today's cleaned, revised data. At the time, early data releases were noisier and arrived
          with publication lags.
        </li>
        <li>
          <strong style={{ color: C.text }}>Coverage limits:</strong> Backtest coverage{" "}
          {coverageStart && coverageEnd ? `(${coverageStart} → ${coverageEnd}) ` : ""}is strictly
          limited by the shortest indicator series in your combination.
        </li>
      </ul>
    </div>
  );
}
