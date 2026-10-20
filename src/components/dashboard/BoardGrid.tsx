import { useMemo } from "react";
import { C } from "../../lib/gauges.mjs";
import type { MarketsData, RecessionData } from "../../lib/types";
import { getTileData, type TileData } from "./board-utils";
import BoardTile from "./BoardTile";

interface BoardGridProps {
  boardIds: string[];
  markets: MarketsData;
  recession: RecessionData;
  verdicts: any;
  onOpenEdit: () => void;
  onOpenQuiz: () => void;
  onShare: () => void;
  copied: boolean;
  onResetBigPicture: () => void;
}

export default function BoardGrid({
  boardIds,
  markets,
  recession,
  verdicts,
  onOpenEdit,
  onOpenQuiz,
  onShare,
  copied,
  onResetBigPicture,
}: BoardGridProps) {
  const tiles = useMemo(() => {
    return boardIds
      .map((id) => getTileData(id, markets, recession, verdicts))
      .filter((t): t is TileData => t !== null);
  }, [boardIds, markets, recession, verdicts]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Board Header Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          paddingBottom: 4,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h2
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 20,
              fontWeight: 700,
              color: C.text,
              margin: 0,
            }}
          >
            The Board
          </h2>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 600,
              color: C.muted,
              background: C.raised,
              border: `1px solid ${C.line}`,
              borderRadius: 99,
              padding: "2px 8px",
            }}
          >
            {tiles.length} active
          </span>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onOpenEdit}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: C.panel,
              border: `1px solid ${C.line}`,
              borderRadius: 8,
              padding: "6px 11px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: C.text,
              cursor: "pointer",
              transition: "border-color .15s, background .15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = C.muted;
              e.currentTarget.style.background = C.raised;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = C.line;
              e.currentTarget.style.background = C.panel;
            }}
          >
            <span>⚙</span>
            <span>Edit board</span>
          </button>

          <button
            type="button"
            onClick={onOpenQuiz}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: C.panel,
              border: `1px solid ${C.line}`,
              borderRadius: 8,
              padding: "6px 11px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: C.text,
              cursor: "pointer",
              transition: "border-color .15s, background .15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = C.muted;
              e.currentTarget.style.background = C.raised;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = C.line;
              e.currentTarget.style.background = C.panel;
            }}
          >
            <span>✦</span>
            <span>Quiz / Topics</span>
          </button>

          <button
            type="button"
            onClick={onShare}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: copied ? `${C.green}22` : C.panel,
              border: `1px solid ${copied ? C.green : C.line}`,
              borderRadius: 8,
              padding: "6px 11px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: copied ? C.green : C.text,
              cursor: "pointer",
              transition: "all .15s",
            }}
            onMouseEnter={(e) => {
              if (!copied) {
                e.currentTarget.style.borderColor = C.muted;
                e.currentTarget.style.background = C.raised;
              }
            }}
            onMouseLeave={(e) => {
              if (!copied) {
                e.currentTarget.style.borderColor = C.line;
                e.currentTarget.style.background = C.panel;
              }
            }}
          >
            <span>{copied ? "✓" : "↗"}</span>
            <span>{copied ? "Link copied!" : "Share board"}</span>
          </button>
        </div>
      </div>

      {/* Grid of tiles */}
      {tiles.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 14,
          }}
        >
          {tiles.map((tile) => (
            <BoardTile key={tile.id} tile={tile} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div
          style={{
            background: C.panel,
            border: `1px dashed ${C.line}`,
            borderRadius: 14,
            padding: "40px 24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 20,
              fontWeight: 700,
              color: C.text,
              marginBottom: 8,
            }}
          >
            Your board has no active indicators.
          </div>
          <p
            style={{
              fontSize: 14,
              color: C.muted,
              maxWidth: 400,
              margin: "0 auto 20px",
              lineHeight: 1.5,
            }}
          >
            Pick indicators from the catalog or load the big picture preset to build your personal desk.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={onResetBigPicture}
              style={{
                background: C.green,
                color: C.backdrop,
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Load Big Picture Board
            </button>
            <button
              type="button"
              onClick={onOpenEdit}
              style={{
                background: C.raised,
                color: C.text,
                border: `1px solid ${C.line}`,
                borderRadius: 8,
                padding: "8px 16px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Browse Indicator Catalog
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
