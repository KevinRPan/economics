export type FilterType = "all" | "board" | "release" | "band-change" | "on-this-day";

interface FilterOption {
  id: FilterType;
  label: string;
  count: number;
}

interface Props {
  activeFilter: FilterType;
  onSelectFilter: (filter: FilterType) => void;
  options: FilterOption[];
}

export default function StreamFilters({ activeFilter, onSelectFilter, options }: Props) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-5 no-scrollbar">
      {options.map((opt) => {
        const isActive = activeFilter === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelectFilter(opt.id)}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-all ${
              isActive
                ? "bg-clear/15 border border-clear text-ink shadow-[0_0_12px_rgba(79,209,168,0.2)]"
                : "bg-raised/60 border border-line text-muted hover:border-muted/40 hover:text-ink"
            }`}
          >
            <span>{opt.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                isActive ? "bg-clear text-backdrop font-bold" : "bg-panel text-faint"
              }`}
            >
              {opt.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
