import { useMemo } from "react";
import { useStore } from "../../store";
import type { ModuleId } from "../../lib/moduleIds";

type Props = {
  moduleId: ModuleId;
  className?: string;
};

function formatTime(ts: number | null | undefined): string | null {
  if (!ts) return null;
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function LastUpdatedLabel({ moduleId, className = "" }: Props) {
  const moduleAt = useStore((s) => s.moduleFreshness[moduleId]);
  const lastPollAt = useStore((s) => s.lastPollAt);

  const label = useMemo(() => {
    const ts = moduleAt ?? (moduleId === "live-matches" ? lastPollAt : null);
    const formatted = formatTime(ts);
    return formatted ? `Updated ${formatted}` : null;
  }, [moduleAt, lastPollAt, moduleId]);

  if (!label) return null;

  return (
    <span className={`last-updated-label${className ? ` ${className}` : ""}`} aria-live="polite">
      {label}
    </span>
  );
}
