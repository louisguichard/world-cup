import { useTransition } from "react";
import { APP_COPY } from "../../lib/appCopy";
import { useStore } from "../../store";

export function BracketModeToggle() {
  const copy = APP_COPY.bracket;
  const mode = useStore((s) => s.bracketViewMode);
  const setMode = useStore((s) => s.setBracketViewMode);
  const [isPending, startTransition] = useTransition();

  return (
    <div
      className="bracket-toggle"
      role="tablist"
      aria-label={copy.modeLabel}
      data-pending={isPending ? "true" : undefined}
    >
      <button
        type="button"
        role="tab"
        className={mode === "projected" ? "active" : ""}
        aria-selected={mode === "projected"}
        disabled={isPending}
        onClick={() => startTransition(() => setMode("projected"))}
      >
        <span className="bracket-toggle-label">{copy.projectedLabel}</span>
        <span className="bracket-toggle-subtitle">{copy.projectedSubtitle}</span>
        {isPending && mode !== "projected" ? (
          <span className="bracket-toggle-spinner" aria-hidden="true" />
        ) : null}
      </button>
      <button
        type="button"
        role="tab"
        className={mode === "confirmed" ? "active" : ""}
        aria-selected={mode === "confirmed"}
        disabled={isPending}
        onClick={() => startTransition(() => setMode("confirmed"))}
      >
        <span className="bracket-toggle-label">{copy.confirmedLabel}</span>
        <span className="bracket-toggle-subtitle">{copy.confirmedSubtitle}</span>
        {isPending && mode !== "confirmed" ? (
          <span className="bracket-toggle-spinner" aria-hidden="true" />
        ) : null}
      </button>
    </div>
  );
}
