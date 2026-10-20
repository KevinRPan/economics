import { useState } from "react";
import { REPORTERS } from "../../../lib/reporters.mjs";

interface Props {
  persona: "bull" | "bear" | "wonk" | "mainstreet";
  size?: number;
  className?: string;
  showBadge?: boolean;
}

export default function ReporterAvatar({ persona, size = 36, className = "", showBadge = false }: Props) {
  const [hasError, setHasError] = useState(false);
  const reporter = REPORTERS[persona] || {
    id: persona,
    name: persona,
    initials: persona.slice(0, 2).toUpperCase(),
    accent: "#86A39F",
    avatar: `/reporters/${persona}.png`,
    title: "Reporter",
  };

  const style = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 border select-none ${className}`}
      style={{
        ...style,
        borderColor: `${reporter.accent}40`,
        background: "#13262A",
      }}
      title={`${reporter.name} (${reporter.title})`}
    >
      {!hasError ? (
        <img
          src={reporter.avatar}
          alt={reporter.name}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setHasError(true)}
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <span
          className="font-mono font-bold text-xs"
          style={{ color: reporter.accent }}
        >
          {reporter.initials}
        </span>
      )}

      {showBadge && (
        <span
          className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-panel"
          style={{ background: reporter.accent }}
        />
      )}
    </div>
  );
}
