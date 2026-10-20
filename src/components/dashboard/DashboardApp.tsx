import { useState, useEffect, useCallback } from "react";
import { C } from "../../lib/gauges.mjs";
import {
  BIG_PICTURE_BOARD,
  encodeBoard,
  loadStoredBoard,
  saveStoredBoard,
  resolveInitialBoard,
} from "../../lib/board.mjs";
import type { MarketsData, RecessionData } from "../../lib/types";
import type { HistoriesData, StreamItem } from "../../lib/dashboard-types";

import DeskTicker from "./DeskTicker";
import BreakingChips from "./BreakingChips";
import BoardGrid from "./BoardGrid";
import OnboardingQuizModal from "./OnboardingQuizModal";
import BoardEditModal from "./BoardEditModal";

import Stream from "./stream/Stream";
import SignalLab from "./signal/SignalLab";

export interface DashboardAppProps {
  markets: MarketsData;
  recession: RecessionData;
  verdicts: any;
  histories: HistoriesData;
  streamItems: StreamItem[];
}

export type TabKey = "board" | "wire" | "signal";

export default function DashboardApp({
  markets,
  recession,
  verdicts,
  histories,
  streamItems,
}: DashboardAppProps) {
  const [boardIds, setBoardIds] = useState<string[]>(BIG_PICTURE_BOARD);
  const [activeTab, setActiveTab] = useState<TabKey>("board");
  const [showQuiz, setShowQuiz] = useState<boolean>(false);
  const [showEdit, setShowEdit] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Sync board to URL search parameter ?b= without reloading or wiping ?s=
  const syncUrlAndStorage = useCallback((ids: string[]) => {
    saveStoredBoard(ids);
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        const encoded = encodeBoard(ids);
        if (encoded) {
          url.searchParams.set("b", encoded);
        } else {
          url.searchParams.delete("b");
        }
        window.history.replaceState(null, "", url.toString());
      } catch {
        /* ignore on environments without full URL support */
      }
    }
  }, []);

  // Initialize board state with precedence: URL > localStorage > quiz
  useEffect(() => {
    const search = typeof window !== "undefined" ? window.location.search : "";
    const stored = loadStoredBoard();
    const resolved = resolveInitialBoard({
      urlSearch: search,
      storedBoard: stored,
      defaultBoard: BIG_PICTURE_BOARD,
    });

    setBoardIds(resolved.board);

    if (resolved.source === "quiz") {
      setShowQuiz(true);
      syncUrlAndStorage(resolved.board);
    } else if (resolved.source === "url") {
      // Save URL board to storage for persistence
      saveStoredBoard(resolved.board);
    }
  }, [syncUrlAndStorage]);

  function handleUpdateBoard(newIds: string[]) {
    setBoardIds(newIds);
    syncUrlAndStorage(newIds);
  }

  function handleResetBigPicture() {
    handleUpdateBoard(BIG_PICTURE_BOARD);
  }

  async function handleShare() {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    url.searchParams.set("b", encodeBoard(boardIds));
    const shareUrl = url.toString();

    if (navigator.share) {
      try {
        await navigator.share({
          title: "My Economy Desk — econ.kpan.dev",
          text: `Check out my personal economy board (${boardIds.length} indicators):`,
          url: shareUrl,
        });
        return;
      } catch {
        /* fall back to clipboard */
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard write failure fallback */
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.backdrop,
        color: C.text,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* ── Top Newsroom Masthead ────────────────────────────────────────── */}
      <header
        style={{
          borderBottom: `1px solid ${C.line}`,
          background: "rgba(14, 26, 28, 0.7)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "14px 20px 10px",
          }}
        >
          {/* Masthead Top Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <a
                href="/"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11.5,
                  color: C.muted,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                ← All Cards
              </a>
              <span style={{ color: C.line }}>/</span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  color: C.faint,
                }}
              >
                LIVE DESK
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10.5,
                  color: C.green,
                  background: "rgba(79, 209, 168, 0.1)",
                  border: "1px solid rgba(79, 209, 168, 0.25)",
                  borderRadius: 99,
                  padding: "3px 9px",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: C.green,
                    boxShadow: `0 0 6px ${C.green}`,
                  }}
                />
                Live Client Desk
              </span>
            </div>
          </div>

          {/* Masthead Title & Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: 14,
            }}
          >
            <div>
              <h1
                style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontWeight: 700,
                  fontSize: 28,
                  letterSpacing: "-.015em",
                  color: C.text,
                  margin: "0 0 4px",
                }}
              >
                Your Economy Desk
              </h1>
              <p
                style={{
                  fontSize: 13,
                  color: C.muted,
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                Your personal arrangement of macro indicators, cross-signals, and live releases.
              </p>
            </div>

            {/* Quick Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                onClick={() => setShowQuiz(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "rgba(79, 209, 168, 0.1)",
                  border: "1px solid rgba(79, 209, 168, 0.3)",
                  color: C.green,
                  borderRadius: 8,
                  padding: "7px 12px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <span>✦</span>
                <span>Customize / Quiz</span>
              </button>

              <button
                type="button"
                onClick={() => setShowEdit(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: C.panel,
                  border: `1px solid ${C.line}`,
                  color: C.text,
                  borderRadius: 8,
                  padding: "7px 12px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11.5,
                  cursor: "pointer",
                }}
              >
                <span>⚙</span>
                <span>Edit ({boardIds.length})</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: copied ? `${C.green}25` : C.panel,
                  border: `1px solid ${copied ? C.green : C.line}`,
                  color: copied ? C.green : C.text,
                  borderRadius: 8,
                  padding: "7px 12px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11.5,
                  cursor: "pointer",
                }}
              >
                <span>{copied ? "✓" : "↗"}</span>
                <span>{copied ? "Copied!" : "Share"}</span>
              </button>
            </div>
          </div>

          {/* Navigation Bar / Tabs */}
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              marginTop: 14,
              borderTop: `1px solid ${C.line}44`,
              paddingTop: 8,
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("board")}
              style={{
                background: activeTab === "board" ? C.raised : "transparent",
                border: `1px solid ${activeTab === "board" ? C.line : "transparent"}`,
                borderRadius: 8,
                padding: "6px 14px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11.5,
                fontWeight: activeTab === "board" ? 700 : 500,
                color: activeTab === "board" ? C.text : C.muted,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>✦</span>
              <span>The Board ({boardIds.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("wire")}
              style={{
                background: activeTab === "wire" ? C.raised : "transparent",
                border: `1px solid ${activeTab === "wire" ? C.line : "transparent"}`,
                borderRadius: 8,
                padding: "6px 14px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11.5,
                fontWeight: activeTab === "wire" ? 700 : 500,
                color: activeTab === "wire" ? C.text : C.muted,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>⚡</span>
              <span>Wire Stream</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("signal")}
              style={{
                background: activeTab === "signal" ? C.raised : "transparent",
                border: `1px solid ${activeTab === "signal" ? C.line : "transparent"}`,
                borderRadius: 8,
                padding: "6px 14px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11.5,
                fontWeight: activeTab === "signal" ? 700 : 500,
                color: activeTab === "signal" ? C.text : C.muted,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>⚗</span>
              <span>Signal Lab</span>
            </button>
          </nav>
        </div>
      </header>

      {/* ── Top Ticker ─────────────────────────────────────────────────── */}
      <DeskTicker
        boardIds={boardIds}
        markets={markets}
        recession={recession}
        verdicts={verdicts}
      />

      {/* ── Main Content Area ──────────────────────────────────────────── */}
      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "16px 20px 48px",
        }}
      >
        {/* Breaking regime shift chips */}
        <BreakingChips verdicts={verdicts} />

        {/* ── MOBILE VIEW (< 1024px) ───────────────────────────────────── */}
        <div className="block lg:hidden" style={{ marginTop: 8 }}>
          {activeTab === "board" && (
            <BoardGrid
              boardIds={boardIds}
              markets={markets}
              recession={recession}
              verdicts={verdicts}
              onOpenEdit={() => setShowEdit(true)}
              onOpenQuiz={() => setShowQuiz(true)}
              onShare={handleShare}
              copied={copied}
              onResetBigPicture={handleResetBigPicture}
            />
          )}

          {activeTab === "wire" && (
            <div
              style={{
                background: C.panel,
                border: `1px solid ${C.line}`,
                borderRadius: 16,
                padding: 18,
              }}
            >
              <h2
                style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: C.text,
                  margin: "0 0 14px",
                }}
              >
                Live Event Wire
              </h2>
              <Stream items={streamItems} boardIds={boardIds} />
            </div>
          )}

          {activeTab === "signal" && (
            <div
              style={{
                background: C.panel,
                border: `1px solid ${C.line}`,
                borderRadius: 16,
                padding: 18,
              }}
            >
              <h2
                style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: C.text,
                  margin: "0 0 14px",
                }}
              >
                Signal Lab
              </h2>
              <SignalLab histories={histories} boardIds={boardIds} />
            </div>
          )}
        </div>

        {/* ── DESKTOP VIEW (≥ 1024px) ──────────────────────────────────── */}
        <div className="hidden lg:block" style={{ marginTop: 8 }}>
          {activeTab === "signal" ? (
            /* Dedicated Signal Lab Full View when signal tab clicked */
            <div
              style={{
                background: C.panel,
                border: `1px solid ${C.line}`,
                borderRadius: 16,
                padding: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <h2
                  style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontSize: 22,
                    fontWeight: 700,
                    color: C.text,
                    margin: 0,
                  }}
                >
                  Signal Lab
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab("board")}
                  style={{
                    background: C.raised,
                    border: `1px solid ${C.line}`,
                    color: C.muted,
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  ← Back to Board
                </button>
              </div>
              <SignalLab histories={histories} boardIds={boardIds} />
            </div>
          ) : activeTab === "wire" ? (
            /* Dedicated Wire Stream View when wire tab clicked */
            <div
              style={{
                background: C.panel,
                border: `1px solid ${C.line}`,
                borderRadius: 16,
                padding: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <h2
                  style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontSize: 22,
                    fontWeight: 700,
                    color: C.text,
                    margin: 0,
                  }}
                >
                  Wire Stream
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab("board")}
                  style={{
                    background: C.raised,
                    border: `1px solid ${C.line}`,
                    color: C.muted,
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  ← Back to Board
                </button>
              </div>
              <Stream items={streamItems} boardIds={boardIds} />
            </div>
          ) : (
            /* Standard Desk Layout: Board Main Column + Stream Sidebar, Signal Lab below */
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "start" }}>
                {/* Board Main Column */}
                <div>
                  <BoardGrid
                    boardIds={boardIds}
                    markets={markets}
                    recession={recession}
                    verdicts={verdicts}
                    onOpenEdit={() => setShowEdit(true)}
                    onOpenQuiz={() => setShowQuiz(true)}
                    onShare={handleShare}
                    copied={copied}
                    onResetBigPicture={handleResetBigPicture}
                  />
                </div>

                {/* Stream Sidebar */}
                <aside
                  style={{
                    background: C.panel,
                    border: `1px solid ${C.line}`,
                    borderRadius: 16,
                    padding: "18px 20px",
                    position: "sticky",
                    top: 140,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 14,
                      borderBottom: `1px solid ${C.line}44`,
                      paddingBottom: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: C.green, fontSize: 13 }}>⚡</span>
                      <h3
                        style={{
                          fontFamily: "'Bricolage Grotesque', sans-serif",
                          fontSize: 17,
                          fontWeight: 700,
                          color: C.text,
                          margin: 0,
                        }}
                      >
                        Live Wire
                      </h3>
                    </div>
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 10,
                        color: C.faint,
                        textTransform: "uppercase",
                      }}
                    >
                      NEWSROOM FEED
                    </span>
                  </div>
                  <Stream items={streamItems} boardIds={boardIds} />
                </aside>
              </div>

              {/* Signal Lab full-width below */}
              <section
                style={{
                  background: C.panel,
                  border: `1px solid ${C.line}`,
                  borderRadius: 16,
                  padding: 24,
                  marginTop: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                    borderBottom: `1px solid ${C.line}44`,
                    paddingBottom: 12,
                  }}
                >
                  <div>
                    <h2
                      style={{
                        fontFamily: "'Bricolage Grotesque', sans-serif",
                        fontSize: 22,
                        fontWeight: 700,
                        color: C.text,
                        margin: "0 0 4px",
                      }}
                    >
                      Signal Lab
                    </h2>
                    <p
                      style={{
                        fontSize: 13,
                        color: C.muted,
                        margin: 0,
                      }}
                    >
                      Cross-signal backtesting against historical recessions and market events.
                    </p>
                  </div>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10.5,
                      letterSpacing: ".08em",
                      textTransform: "uppercase",
                      color: C.faint,
                      background: C.raised,
                      padding: "4px 8px",
                      borderRadius: 6,
                    }}
                  >
                    HISTORICAL ENGINE
                  </span>
                </div>

                <SignalLab histories={histories} boardIds={boardIds} />
              </section>
            </div>
          )}
        </div>
      </main>

      {/* ── Modals ────────────────────────────────────────────────────── */}
      <OnboardingQuizModal
        isOpen={showQuiz}
        onClose={() => setShowQuiz(false)}
        onApplyBoard={handleUpdateBoard}
      />

      <BoardEditModal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        boardIds={boardIds}
        onUpdateBoard={handleUpdateBoard}
        onOpenQuiz={() => setShowQuiz(true)}
        onShare={handleShare}
        copied={copied}
        onResetBigPicture={handleResetBigPicture}
      />
    </div>
  );
}
