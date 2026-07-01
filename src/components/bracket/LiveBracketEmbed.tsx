import { BracketBento } from "../bentos/BracketBento";
import { BentoErrorBoundary } from "../shared/ErrorBoundary";
import { APP_COPY } from "../../lib/appCopy";
import { useStore } from "../../store";
import { BracketModeToggle } from "./BracketModeToggle";

export function LiveBracketEmbed() {
  const copy = APP_COPY.live;
  const setActiveTab = useStore((s) => s.setActiveTab);
  const setBracketLayoutMode = useStore((s) => s.setBracketLayoutMode);

  const openFullBracketTree = () => {
    setBracketLayoutMode("tree");
    setActiveTab("bracket");
  };

  return (
    <section className="dashboard-section live-bracket-embed" aria-label={copy.bracketAriaLabel}>
      <div className="section-heading compact">
        <div>
          <div className="section-kicker">{copy.bracketKicker}</div>
          <h2 className="section-title-text">{copy.bracketTitle}</h2>
          <p className="section-note">{copy.bracketLead}</p>
          <p className="section-note live-bracket-embed__tree-note">{copy.bracketTreeNote}</p>
          <button
            type="button"
            className="live-bracket-embed__tree-link"
            onClick={openFullBracketTree}
          >
            {copy.openFullBracketTree} →
          </button>
        </div>
      </div>

      <div className="bracket-view live-bracket-embed__panel">
        <div className="bracket-controls bracket-controls--embed">
          <BracketModeToggle />
        </div>
        <BentoErrorBoundary bento="BracketBento">
          <BracketBento embedded forceLayoutMode="schedule" />
        </BentoErrorBoundary>
      </div>
    </section>
  );
}
