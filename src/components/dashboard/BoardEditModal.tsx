import { useState, useMemo } from "react";
import { C } from "../../lib/gauges.mjs";
import {
  CATALOG,
  TOPICS,
  MAX_BOARD_SIZE,
} from "../../lib/board.mjs";

interface BoardEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardIds: string[];
  onUpdateBoard: (ids: string[]) => void;
  onOpenQuiz: () => void;
  onShare: () => void;
  copied: boolean;
  onResetBigPicture: () => void;
}

export default function BoardEditModal({
  isOpen,
  onClose,
  boardIds,
  onUpdateBoard,
  onOpenQuiz,
  onShare,
  copied,
  onResetBigPicture,
}: BoardEditModalProps) {
  const [activeTopic, setActiveTopic] = useState<string>("all");

  const catalogList = useMemo(() => {
    return Object.values(CATALOG);
  }, []);

  if (!isOpen) return null;

  function moveUp(index: number) {
    if (index <= 0) return;
    const next = [...boardIds];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    onUpdateBoard(next);
  }

  function moveDown(index: number) {
    if (index >= boardIds.length - 1) return;
    const next = [...boardIds];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    onUpdateBoard(next);
  }

  function remove(id: string) {
    onUpdateBoard(boardIds.filter((item) => item !== id));
  }

  function add(id: string) {
    if (boardIds.includes(id) || boardIds.length >= MAX_BOARD_SIZE) return;
    onUpdateBoard([...boardIds, id]);
  }

  const filteredCatalog = activeTopic === "all"
    ? catalogList
    : catalogList.filter((item) => item.topic === activeTopic);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(4, 9, 10, 0.8)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        overflowY: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: C.panel,
          border: `1px solid ${C.line}`,
          borderRadius: 18,
          maxWidth: 680,
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          boxShadow: "0 24px 64px -16px rgba(0,0,0,0.85)",
          color: C.text,
          overflow: "hidden",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: `1px solid ${C.line}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10.5,
                letterSpacing: ".14em",
                textTransform: "uppercase",
                color: C.faint,
                marginBottom: 4,
              }}
            >
              CUSTOMIZE DESK
            </div>
            <h2
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: 22,
                fontWeight: 700,
                color: C.text,
                margin: 0,
              }}
            >
              Organize Indicators
            </h2>
            <div
              style={{
                fontSize: 12.5,
                color: C.muted,
                marginTop: 4,
              }}
            >
              Reorder your active board or add up to {MAX_BOARD_SIZE} indicators from the full catalog.
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 600,
                color: boardIds.length >= MAX_BOARD_SIZE ? C.amber : C.green,
                background: C.raised,
                border: `1px solid ${C.line}`,
                borderRadius: 99,
                padding: "3px 9px",
                whiteSpace: "nowrap",
              }}
            >
              {boardIds.length} / {MAX_BOARD_SIZE} slots
            </span>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: C.faint,
                fontSize: 20,
                cursor: "pointer",
                padding: 4,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div
          style={{
            padding: "20px 24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {/* Section 1: Active Board Arrangement */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <h3
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  color: C.faint,
                  margin: 0,
                }}
              >
                Current Board ({boardIds.length})
              </h3>
              {boardIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => onUpdateBoard([])}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: C.faint,
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10.5,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Clear all
                </button>
              )}
            </div>

            {boardIds.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {boardIds.map((id, index) => {
                  const entry = (CATALOG as Record<string, any>)[id] || { eyebrow: id, headline: id, topic: "macro" };
                  return (
                    <div
                      key={id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: C.raised,
                        border: `1px solid ${C.line}`,
                        borderRadius: 8,
                        padding: "8px 12px",
                        gap: 10,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 11,
                            color: C.faint,
                            width: 18,
                            flexShrink: 0,
                          }}
                        >
                          #{index + 1}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: "'Bricolage Grotesque', sans-serif",
                              fontWeight: 700,
                              fontSize: 14,
                              color: C.text,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {entry.eyebrow}
                          </div>
                          <div
                            style={{
                              fontSize: 11.5,
                              color: C.muted,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {entry.headline}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => moveUp(index)}
                          disabled={index === 0}
                          style={{
                            background: C.panel,
                            border: `1px solid ${C.line}`,
                            color: index === 0 ? C.line : C.text,
                            borderRadius: 6,
                            padding: "4px 8px",
                            cursor: index === 0 ? "default" : "pointer",
                            fontSize: 12,
                          }}
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveDown(index)}
                          disabled={index === boardIds.length - 1}
                          style={{
                            background: C.panel,
                            border: `1px solid ${C.line}`,
                            color: index === boardIds.length - 1 ? C.line : C.text,
                            borderRadius: 6,
                            padding: "4px 8px",
                            cursor: index === boardIds.length - 1 ? "default" : "pointer",
                            fontSize: 12,
                          }}
                          title="Move down"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(id)}
                          style={{
                            background: "rgba(255, 107, 94, 0.1)",
                            border: "1px solid rgba(255, 107, 94, 0.25)",
                            color: C.red,
                            borderRadius: 6,
                            padding: "4px 8px",
                            cursor: "pointer",
                            fontSize: 12,
                            marginLeft: 4,
                          }}
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  background: C.raised,
                  border: `1px dashed ${C.line}`,
                  borderRadius: 8,
                  padding: "16px",
                  textAlign: "center",
                  fontSize: 12.5,
                  color: C.muted,
                }}
              >
                No indicators on your board yet. Add some below or click Big Picture!
              </div>
            )}
          </div>

          {/* Section 2: Catalog grouped by topic */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <h3
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  color: C.faint,
                  margin: 0,
                }}
              >
                Add from Catalog
              </h3>

              {/* Topic Filter Pills */}
              <div style={{ display: "flex", gap: 4, overflowX: "auto", maxWidth: "100%", paddingBottom: 2 }}>
                <button
                  type="button"
                  onClick={() => setActiveTopic("all")}
                  style={{
                    background: activeTopic === "all" ? C.green : C.raised,
                    color: activeTopic === "all" ? C.backdrop : C.muted,
                    border: `1px solid ${activeTopic === "all" ? C.green : C.line}`,
                    borderRadius: 99,
                    padding: "2px 8px",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    cursor: "pointer",
                  }}
                >
                  All
                </button>
                {TOPICS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTopic(t.id)}
                    style={{
                      background: activeTopic === t.id ? C.green : C.raised,
                      color: activeTopic === t.id ? C.backdrop : C.muted,
                      border: `1px solid ${activeTopic === t.id ? C.green : C.line}`,
                      borderRadius: 99,
                      padding: "2px 8px",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Catalog Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 8,
              }}
            >
              {filteredCatalog.map((item) => {
                const isOnBoard = boardIds.includes(item.id);
                const isFull = boardIds.length >= MAX_BOARD_SIZE;

                return (
                  <div
                    key={item.id}
                    style={{
                      background: C.raised,
                      border: `1px solid ${isOnBoard ? C.green + "44" : C.line}`,
                      borderRadius: 10,
                      padding: "10px 12px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 2,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 9.5,
                            letterSpacing: ".08em",
                            textTransform: "uppercase",
                            color: C.faint,
                          }}
                        >
                          {item.topic}
                        </span>
                      </div>
                      <div
                        style={{
                          fontFamily: "'Bricolage Grotesque', sans-serif",
                          fontWeight: 700,
                          fontSize: 14,
                          color: C.text,
                        }}
                      >
                        {item.eyebrow}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: C.muted,
                          lineHeight: 1.35,
                          marginTop: 4,
                        }}
                      >
                        {item.headline}
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      {isOnBoard ? (
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 10.5,
                            color: C.green,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "3px 8px",
                          }}
                        >
                          ✓ On board
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => add(item.id)}
                          disabled={isFull}
                          style={{
                            background: isFull ? C.panel : "rgba(79, 209, 168, 0.12)",
                            border: `1px solid ${isFull ? C.line : C.green}`,
                            color: isFull ? C.faint : C.green,
                            borderRadius: 6,
                            padding: "4px 10px",
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: isFull ? "not-allowed" : "pointer",
                          }}
                        >
                          {isFull ? "Board full" : "+ Add"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: `1px solid ${C.line}`,
            background: C.panel,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={onResetBigPicture}
              style={{
                background: C.raised,
                border: `1px solid ${C.line}`,
                color: C.text,
                borderRadius: 8,
                padding: "6px 12px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              Reset to Big Picture
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenQuiz();
              }}
              style={{
                background: C.raised,
                border: `1px solid ${C.line}`,
                color: C.text,
                borderRadius: 8,
                padding: "6px 12px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              Retake Quiz
            </button>

            <button
              type="button"
              onClick={onShare}
              style={{
                background: copied ? `${C.green}22` : C.raised,
                border: `1px solid ${copied ? C.green : C.line}`,
                color: copied ? C.green : C.text,
                borderRadius: 8,
                padding: "6px 12px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              {copied ? "✓ Copied" : "Share link (?b=)"}
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: C.green,
              border: "none",
              color: C.backdrop,
              borderRadius: 8,
              padding: "7px 18px",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
