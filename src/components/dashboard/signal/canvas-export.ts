/* ───────────────────────────────────────────────────────────────────────────
   Canvas Export for Signal Lab
   Renders a 1200×630 share card to an HTML5 canvas client-side and triggers
   a PNG download.
─────────────────────────────────────────────────────────────────────────── */

import { C } from "../../../lib/gauges.mjs";
import type { Signal } from "../../../lib/dashboard-types";
import type { BacktestResult } from "../../../lib/backtest.d.mts";

export function exportSignalCard({
  signal,
  result,
  scorecardText,
  targetLabel,
}: {
  signal: Signal;
  result: BacktestResult;
  scorecardText: string;
  targetLabel: string;
}) {
  if (typeof document === "undefined") return;

  const width = 1200;
  const height = 630;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background panel
  ctx.fillStyle = C.panel;
  ctx.fillRect(0, 0, width, height);

  // Top accent bar
  ctx.fillStyle = result.isFiringNow ? C.red : C.green;
  ctx.fillRect(0, 0, width, 8);

  // Eyebrow
  ctx.font = "500 20px 'JetBrains Mono', monospace";
  ctx.fillStyle = C.faint;
  ctx.fillText("ECONOMICS DASHBOARD · SIGNAL LAB", 72, 80);

  // Target tag on right
  ctx.textAlign = "right";
  ctx.fillStyle = C.muted;
  ctx.fillText(`TARGET: ${targetLabel.toUpperCase()}`, width - 72, 80);
  ctx.textAlign = "left";

  // Scorecard Headline (wrap if needed)
  ctx.font = "700 48px 'Bricolage Grotesque', sans-serif";
  ctx.fillStyle = C.text;
  ctx.fillText(scorecardText, 72, 170);

  // Status badge line
  ctx.font = "600 22px 'JetBrains Mono', monospace";
  ctx.fillStyle = result.isFiringNow ? C.red : C.green;
  const statusText = result.isFiringNow ? "● FIRING NOW" : "○ CALM / NOT FIRING";
  ctx.fillText(statusText, 72, 230);

  // Divider line
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(72, 270);
  ctx.lineTo(width - 72, 270);
  ctx.stroke();

  // Signal Recipe Box
  ctx.fillStyle = C.raised;
  ctx.roundRect
    ? ctx.roundRect(72, 305, width - 144, 180, 14)
    : ctx.fillRect(72, 305, width - 144, 180);
  ctx.fill();

  ctx.font = "500 18px 'JetBrains Mono', monospace";
  ctx.fillStyle = C.muted;
  ctx.fillText("SIGNAL CONDITIONS (AND)", 100, 345);

  ctx.font = "500 22px Inter, sans-serif";
  ctx.fillStyle = C.text;
  if (signal.conditions.length === 0) {
    ctx.fillText("No conditions selected", 100, 390);
  } else {
    signal.conditions.forEach((c, idx) => {
      const bandsText = c.bands.length > 0 ? c.bands.join(", ") : "any band";
      ctx.fillText(`${idx + 1}. ${c.indicator.toUpperCase()} flashing: ${bandsText}`, 100, 390 + idx * 34);
    });
  }

  // Parameters
  ctx.font = "500 18px 'JetBrains Mono', monospace";
  ctx.fillStyle = C.faint;
  const holdText = signal.holdMonths > 0 ? `Hold: ${signal.holdMonths} mo` : "Hold: immediate";
  const winText = `Lead window: ${signal.windowMonths} mo`;
  const covText = result.coverage.start ? `Coverage: ${result.coverage.start} → ${result.coverage.end}` : "";
  ctx.fillText(`${holdText}  ·  ${winText}  ·  ${covText}`, 100, 460);

  // Footer branding
  ctx.font = "500 20px 'JetBrains Mono', monospace";
  ctx.fillStyle = C.faint;
  ctx.fillText("econ.kpan.dev · by Kevin Pan", 72, 570);

  ctx.textAlign = "right";
  ctx.fillText("Historical backtest on revised data", width - 72, 570);

  // Trigger download
  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.download = `signal-result-${signal.target}.png`;
  a.href = dataUrl;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
