import { useState, useEffect } from "react";
import { C } from "../../lib/gauges.mjs";
import { TOPICS, buildStarterBoard, BIG_PICTURE_BOARD } from "../../lib/board.mjs";

interface OnboardingQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyBoard: (boardIds: string[]) => void;
}

export default function OnboardingQuizModal({
  isOpen,
  onClose,
  onApplyBoard,
}: OnboardingQuizModalProps) {
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function toggleTopic(id: string) {
    setSelectedTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  function handleBuild() {
    const starter = buildStarterBoard(selectedTopics);
    onApplyBoard(starter);
    onClose();
  }

  function handleBigPicture() {
    onApplyBoard(BIG_PICTURE_BOARD);
    onClose();
  }

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
          maxWidth: 520,
          width: "100%",
          padding: "26px 24px",
          position: "relative",
          boxShadow: "0 24px 64px -16px rgba(0,0,0,0.85)",
          color: C.text,
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            background: "transparent",
            border: "none",
            color: C.faint,
            fontSize: 20,
            cursor: "pointer",
            lineHeight: 1,
            padding: 4,
          }}
          aria-label="Close"
        >
          ✕
        </button>

        {/* Eyebrow */}
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10.5,
            letterSpacing: ".14em",
            textTransform: "uppercase",
            color: C.green,
            marginBottom: 6,
          }}
        >
          DESK SETUP · 30 SECONDS
        </div>

        {/* Question Title */}
        <h2
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "-.01em",
            color: C.text,
            margin: "0 0 8px",
          }}
        >
          What do you worry about most?
        </h2>

        <p
          style={{
            fontSize: 13.5,
            lineHeight: 1.5,
            color: C.muted,
            margin: "0 0 20px",
          }}
        >
          Select the topics that matter to your financial reality. We'll assemble a personal desk
          of 6–8 starter indicators tuned to what you want to track.
        </p>

        {/* Topics Selection Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 10,
            marginBottom: 20,
          }}
        >
          {TOPICS.map((topic) => {
            const isSelected = selectedTopics.includes(topic.id);
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => toggleTopic(topic.id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  textAlign: "left",
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: isSelected ? "rgba(79, 209, 168, 0.1)" : C.raised,
                  border: `1px solid ${isSelected ? C.green : C.line}`,
                  cursor: "pointer",
                  transition: "all .15s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Bricolage Grotesque', sans-serif",
                      fontWeight: 700,
                      fontSize: 15,
                      color: isSelected ? C.green : C.text,
                    }}
                  >
                    {topic.label}
                  </span>
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      border: `1.5px solid ${isSelected ? C.green : C.faint}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9,
                      color: C.backdrop,
                      background: isSelected ? C.green : "transparent",
                    }}
                  >
                    {isSelected && "✓"}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "Inter, system-ui, sans-serif",
                    fontSize: 11.5,
                    color: C.muted,
                    lineHeight: 1.35,
                  }}
                >
                  {topic.desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            borderTop: `1px solid ${C.line}`,
            paddingTop: 16,
          }}
        >
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleBuild}
              disabled={selectedTopics.length === 0}
              style={{
                flex: "1 1 200px",
                background: selectedTopics.length > 0 ? C.green : C.raised,
                color: selectedTopics.length > 0 ? C.backdrop : C.faint,
                border: "none",
                borderRadius: 10,
                padding: "12px 18px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                fontWeight: 700,
                cursor: selectedTopics.length > 0 ? "pointer" : "not-allowed",
                transition: "background .15s",
              }}
            >
              Build my board {selectedTopics.length > 0 ? `(${selectedTopics.length} picked) →` : ""}
            </button>

            <button
              type="button"
              onClick={handleBigPicture}
              style={{
                flex: "1 1 200px",
                background: "rgba(242, 181, 68, 0.12)",
                border: "1px solid rgba(242, 181, 68, 0.35)",
                color: C.amber,
                borderRadius: 10,
                padding: "12px 16px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
                transition: "background .15s",
              }}
            >
              ⚡ Just show me the big picture
            </button>
          </div>

          <div style={{ textAlign: "center", marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: C.faint,
                fontSize: 12,
                cursor: "pointer",
                textDecoration: "underline",
                padding: 4,
              }}
            >
              Skip and keep default desk
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
