import { useTransition } from "react";
import { APP_COPY } from "../../lib/appCopy";
import { useStore } from "../../store";

export function BracketLayoutToggle() {
  const copy = APP_COPY.bracket;
  const layout = useStore((s) => s.bracketLayoutMode);
  const setLayout = useStore((s) => s.setBracketLayoutMode);
  const [isPending, startTransition] = useTransition();

  return (
    <div
      className="bracket-toggle bracket-layout-toggle"
      role="tablist"
      aria-label={copy.layoutLabel}
      data-pending={isPending ? "true" : undefined}
    >
      <button
        type="button"
        role="tab"
        className={layout === "tree" ? "active" : ""}
        aria-selected={layout === "tree"}
        disabled={isPending}
        onClick={() => startTransition(() => setLayout("tree"))}
      >
        <span className="bracket-toggle-label">{copy.treeLabel}</span>
        <span className="bracket-toggle-subtitle">{copy.treeSubtitle}</span>
      </button>
      <button
        type="button"
        role="tab"
        className={layout === "schedule" ? "active" : ""}
        aria-selected={layout === "schedule"}
        disabled={isPending}
        onClick={() => startTransition(() => setLayout("schedule"))}
      >
        <span className="bracket-toggle-label">{copy.scheduleLabel}</span>
        <span className="bracket-toggle-subtitle">{copy.scheduleSubtitle}</span>
      </button>
    </div>
  );
}
