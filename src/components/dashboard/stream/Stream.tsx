import { useMemo, useState } from "react";
import type { StreamItem } from "../../../lib/dashboard-types";
import UpNextStrip from "./UpNextStrip";
import ReporterDeskLegend from "./ReporterDeskLegend";
import StreamFilters, { type FilterType } from "./StreamFilters";
import StreamCard from "./StreamCard";

export interface StreamProps {
  items: StreamItem[];
  /** gauge ids on the user's board — the stream may highlight/filter to these */
  boardIds: string[];
}

export default function Stream({ items = [], boardIds = [] }: StreamProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const boardIdSet = useMemo(() => new Set(boardIds), [boardIds]);

  // Compute item counts for filters
  const filterOptions = useMemo(() => {
    const counts = {
      all: items.length,
      board: items.filter((it) => it.indicator && boardIdSet.has(it.indicator)).length,
      release: items.filter((it) => it.kind === "release").length,
      "band-change": items.filter((it) => it.kind === "band-change").length,
      "on-this-day": items.filter((it) => it.kind === "on-this-day").length,
    };

    const options = [{ id: "all" as FilterType, label: "All Items", count: counts.all }];

    if (boardIds.length > 0) {
      options.push({ id: "board" as FilterType, label: "My Board", count: counts.board });
    }

    options.push(
      { id: "release" as FilterType, label: "Releases", count: counts.release },
      { id: "band-change" as FilterType, label: "Band Shifts", count: counts["band-change"] },
      { id: "on-this-day" as FilterType, label: "Factoids", count: counts["on-this-day"] }
    );

    return options;
  }, [items, boardIdSet, boardIds.length]);

  // Filter items based on active chip
  const filteredItems = useMemo(() => {
    if (activeFilter === "board") {
      return items.filter((it) => it.indicator && boardIdSet.has(it.indicator));
    }
    if (activeFilter === "release") {
      return items.filter((it) => it.kind === "release");
    }
    if (activeFilter === "band-change") {
      return items.filter((it) => it.kind === "band-change");
    }
    if (activeFilter === "on-this-day") {
      return items.filter((it) => it.kind === "on-this-day");
    }
    return items;
  }, [items, activeFilter, boardIdSet]);

  return (
    <section className="w-full max-w-3xl mx-auto px-1 sm:px-4 py-2 sm:py-6" aria-label="Newsroom Event Stream">
      {/* 1. Top Strip: Up Next Releases */}
      <UpNextStrip items={items} />

      {/* 2. Newsroom Legend: Meet the Fictional Desk */}
      <ReporterDeskLegend />

      {/* 3. Filter Chips */}
      <StreamFilters
        activeFilter={activeFilter}
        onSelectFilter={setActiveFilter}
        options={filterOptions}
      />

      {/* 4. Stream Cards Feed */}
      {filteredItems.length > 0 ? (
        <div className="space-y-3.5">
          {filteredItems.map((item) => (
            <StreamCard
              key={item.id}
              item={item}
              isPinnedToBoard={Boolean(item.indicator && boardIdSet.has(item.indicator))}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-panel p-8 text-center">
          <p className="font-display font-semibold text-ink text-base mb-1">
            No events found for this filter
          </p>
          <p className="text-xs text-muted max-w-sm mx-auto">
            {activeFilter === "board"
              ? "None of the indicators on your board have recent stream events. Add more indicators to your board above to see them here."
              : "No stream events match the selected category."}
          </p>
          {activeFilter !== "all" && (
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className="mt-3 text-xs font-mono text-clear hover:underline"
            >
              Reset to all events →
            </button>
          )}
        </div>
      )}
    </section>
  );
}
