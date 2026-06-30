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
        onClick={() => {
          // #region agent log
          fetch("http://127.0.0.1:7681/ingest/f800a0a9-8d11-45c6-8805-1b187f693046", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "99cde0" },
            body: JSON.stringify({
              sessionId: "99cde0",
              location: "BracketModeToggle.tsx:click",
              message: "toggle projected",
              data: { from: mode },
              timestamp: Date.now(),
              hypothesisId: "H1",
            }),
          }).catch(() => {});
          // #endregion
          startTransition(() => setMode("projected"));
        }}
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
        onClick={() => {
          // #region agent log
          fetch("http://127.0.0.1:7681/ingest/f800a0a9-8d11-45c6-8805-1b187f693046", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "99cde0" },
            body: JSON.stringify({
              sessionId: "99cde0",
              location: "BracketModeToggle.tsx:click",
              message: "toggle confirmed",
              data: { from: mode },
              timestamp: Date.now(),
              hypothesisId: "H1",
            }),
          }).catch(() => {});
          // #endregion
          startTransition(() => setMode("confirmed"));
        }}
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
