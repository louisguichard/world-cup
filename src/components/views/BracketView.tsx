import { BracketBento } from "../bentos/BracketBento";
import { BestThirdRacePanel } from "../bentos/BestThirdRacePanel";
import { BestThirdTimeline } from "../bentos/BestThirdTimeline";
import { APP_COPY } from "../../lib/appCopy";
import { useStore } from "../../store";

export function BracketView() {
  const copy = APP_COPY.bracket;
  const mode = useStore((s) => s.bracketViewMode);
  const setMode = useStore((s) => s.setBracketViewMode);

  return (
    <div className="bracket-view dashboard-view">
      <section className="hero-panel hero-panel--compact">
        <div className="eyebrow">{copy.eyebrow}</div>
        <h1>
          The road to <span className="accent">{copy.titleAccent}</span>
        </h1>
        <p>{copy.heroLead}</p>
      </section>

      <div className="bracket-toggle" role="tablist" aria-label={copy.modeLabel}>
        <button
          type="button"
          role="tab"
          className={mode === "projected" ? "active" : ""}
          aria-selected={mode === "projected"}
          onClick={() => setMode("projected")}
        >
          <span className="bracket-toggle-label">{copy.projectedLabel}</span>
          <span className="bracket-toggle-subtitle">{copy.projectedSubtitle}</span>
        </button>
        <button
          type="button"
          role="tab"
          className={mode === "confirmed" ? "active" : ""}
          aria-selected={mode === "confirmed"}
          onClick={() => setMode("confirmed")}
        >
          <span className="bracket-toggle-label">{copy.confirmedLabel}</span>
          <span className="bracket-toggle-subtitle">{copy.confirmedSubtitle}</span>
        </button>
      </div>

      <BracketBento />
      <BestThirdRacePanel />
      <BestThirdTimeline />
    </div>
  );
}
