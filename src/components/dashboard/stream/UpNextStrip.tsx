import type { StreamItem } from "../../../lib/dashboard-types";

interface Props {
  items: StreamItem[];
}

export default function UpNextStrip({ items }: Props) {
  const upcomingItems = items.filter((it) => it.kind === "upcoming");

  if (upcomingItems.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="w-2 h-2 rounded-full bg-clear animate-pulse" />
        <span className="font-mono text-xs uppercase tracking-wider text-muted font-semibold">
          Up Next on the Calendar
        </span>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-2 pt-0.5 max-w-full no-scrollbar scroll-smooth">
        {upcomingItems.map((it) => {
          // Extract a compact date label from date ISO
          const parts = it.date.slice(5).split("-"); // "10-22"
          const monthNum = parseInt(parts[0], 10);
          const dayNum = parseInt(parts[1], 10);
          const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const monthStr = monthsShort[monthNum - 1] || parts[0];
          const dateLabel = `${monthStr} ${dayNum}`;

          return (
            <a
              key={it.id}
              href={it.href || "#"}
              className="group shrink-0 w-64 p-3 rounded-xl border border-line bg-panel hover:bg-raised/70 hover:border-muted/50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-mono text-[11px] font-semibold text-clear bg-clear/10 border border-clear/20 px-1.5 py-0.5 rounded">
                    {dateLabel}
                  </span>
                  <span className="font-mono text-[10px] text-faint">
                    UPCOMING
                  </span>
                </div>
                <div className="font-display font-bold text-sm text-ink group-hover:text-clear transition-colors line-clamp-1">
                  {it.title.split(" drops ")[0] || it.title}
                </div>
              </div>

              <div className="text-xs text-muted/80 line-clamp-2 mt-2 leading-relaxed">
                {it.body}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
