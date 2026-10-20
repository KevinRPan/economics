import type { StreamItem } from "../../../lib/dashboard-types";
import { REPORTERS } from "../../../lib/reporters.mjs";
import ReporterAvatar from "./ReporterAvatar";

interface Props {
  item: StreamItem;
  isPinnedToBoard?: boolean;
}

function formatRelativeDate(isoStr: string): string {
  if (!isoStr) return "";
  const parts = isoStr.slice(0, 10).split("-").map(Number);
  const itemDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const diffDays = Math.round((todayUtc.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays === -1) return "Tomorrow";
  if (diffDays < -1) return `in ${Math.abs(diffDays)}d`;
  if (diffDays > 1 && diffDays < 7) return `${diffDays}d ago`;

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parts[1] - 1]} ${parts[2]}`;
}

export default function StreamCard({ item, isPinnedToBoard = false }: Props) {
  const dateStr = formatRelativeDate(item.date);

  // Kind chip configuration
  let kindLabel = "RELEASE";
  let kindColor = "#4FD1A8"; // green
  let kindBg = "rgba(79,209,168,0.12)";
  let kindBorder = "rgba(79,209,168,0.25)";

  if (item.kind === "band-change") {
    kindLabel = "BAND SHIFT";
    kindColor = "#F2B544"; // amber
    kindBg = "rgba(242,181,68,0.12)";
    kindBorder = "rgba(242,181,68,0.25)";
  } else if (item.kind === "on-this-day") {
    kindLabel = "FACTOID";
    kindColor = "#5BA8D0"; // cool blue
    kindBg = "rgba(91,168,208,0.12)";
    kindBorder = "rgba(91,168,208,0.25)";
  } else if (item.kind === "upcoming") {
    kindLabel = "UP NEXT";
    kindColor = "#86A39F"; // faint
    kindBg = "rgba(134,163,159,0.12)";
    kindBorder = "rgba(134,163,159,0.25)";
  }

  return (
    <article
      className="rounded-xl border border-line bg-panel p-4 sm:p-5 shadow-sm hover:border-muted/40 transition-all relative overflow-hidden"
      data-kind={item.kind}
      data-indicator={item.indicator}
    >
      {/* Top row: Kind chip + Date */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-[10px] font-bold tracking-wider px-2 py-0.5 rounded border"
            style={{ color: kindColor, background: kindBg, borderColor: kindBorder }}
          >
            {kindLabel}
          </span>
          {isPinnedToBoard && (
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-raised border border-line text-clear">
              ★ On Your Board
            </span>
          )}
        </div>

        <time
          dateTime={item.date}
          className="font-mono text-xs text-muted/80"
          title={item.date}
        >
          {dateStr}
        </time>
      </div>

      {/* Title */}
      <h3 className="font-display font-bold text-base sm:text-lg text-ink leading-snug mb-1.5">
        {item.href ? (
          <a
            href={item.href}
            className="hover:text-clear transition-colors inline-flex items-center gap-1 group"
          >
            <span>{item.title}</span>
            <span className="text-muted/60 group-hover:text-clear group-hover:translate-x-0.5 transition-all text-sm">
              →
            </span>
          </a>
        ) : (
          item.title
        )}
      </h3>

      {/* Body blurb */}
      {item.body && (
        <p className="text-xs sm:text-sm text-muted leading-relaxed mb-3">
          {item.body}
        </p>
      )}

      {/* Reporter reaction bubbles */}
      {item.reactions && item.reactions.length > 0 && (
        <div className="mt-3.5 pt-3 border-t border-line/60 space-y-2.5">
          {item.reactions.map((rx, idx) => {
            const personaMeta = REPORTERS[rx.persona];
            const personaName = personaMeta?.name || rx.persona;
            const personaTitle = personaMeta?.title || "Reporter";
            const accent = personaMeta?.accent || "#86A39F";

            return (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-2.5 rounded-lg border bg-raised/50"
                style={{ borderColor: `${accent}30` }}
              >
                <ReporterAvatar persona={rx.persona} size={30} showBadge />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5 mb-0.5">
                    <span className="font-display font-semibold text-xs text-ink truncate">
                      {personaName}
                    </span>
                    <span className="font-mono text-[10px] text-faint truncate">
                      {personaTitle.split("·")[0]}
                    </span>
                  </div>
                  <blockquote className="text-xs text-ink/90 leading-relaxed italic">
                    "{rx.text}"
                  </blockquote>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}
