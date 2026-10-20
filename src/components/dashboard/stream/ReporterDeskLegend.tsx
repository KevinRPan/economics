import { useState } from "react";
import { REPORTERS, REPORTER_IDS } from "../../../lib/reporters.mjs";
import ReporterAvatar from "./ReporterAvatar";

export default function ReporterDeskLegend() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-6 rounded-xl border border-line bg-raised/60 backdrop-blur-sm overflow-hidden transition-all duration-200">
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex -space-x-2 shrink-0">
            {REPORTER_IDS.map((id) => (
              <ReporterAvatar key={id} persona={id as any} size={28} />
            ))}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-sm text-ink truncate">
                Fictional Newsroom Desk
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-panel border border-line text-muted">
                Templated
              </span>
            </div>
            <p className="text-xs text-muted truncate">
              Four recurring perspectives reacting to real numbers without LLMs.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="shrink-0 text-xs font-mono font-medium text-muted hover:text-ink px-2.5 py-1 rounded-md border border-line hover:border-muted/40 transition-colors"
        >
          {isOpen ? "Hide Desk" : "Meet the Desk"}
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-line/60 p-4 bg-panel/80">
          <p className="text-xs text-muted mb-3.5 leading-relaxed">
            Our newsroom desk consists of four fictional archetypes. Every reaction is deterministically selected based on event data — no facts or numbers are ever hallucinated.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(REPORTER_IDS as Array<keyof typeof REPORTERS>).map((id) => {
              const rep = REPORTERS[id];
              return (
                <div
                  key={id}
                  className="flex items-start gap-3 p-2.5 rounded-lg border border-line/70 bg-raised/40"
                >
                  <ReporterAvatar persona={id as any} size={38} showBadge />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-semibold text-sm text-ink truncate">
                        {rep.name}
                      </span>
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.2 rounded font-medium"
                        style={{ color: rep.accent, background: `${rep.accent}15` }}
                      >
                        {rep.id}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-muted/90 truncate mt-0.5">
                      {rep.title}
                    </div>
                    <p className="text-xs text-faint mt-1 line-clamp-2 leading-snug">
                      {rep.bio}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
