import { BracketBento } from "../bentos/BracketBento";
import { BestThirdRacePanel } from "../bentos/BestThirdRacePanel";
import { BestThirdTimeline } from "../bentos/BestThirdTimeline";
import { BracketModeToggle } from "../bracket/BracketModeToggle";
import { BracketLayoutToggle } from "../bracket/BracketLayoutToggle";
import { usePreferBracketTreeDuringKnockout } from "../../hooks/usePreferBracketTreeDuringKnockout";
import { APP_COPY } from "../../lib/appCopy";

export function BracketView() {
  const copy = APP_COPY.bracket;
  usePreferBracketTreeDuringKnockout();

  return (
    <div className="bracket-view dashboard-view">
      <section className="hero-panel hero-panel--compact">
        <div className="eyebrow">{copy.eyebrow}</div>
        <h1>
          The road to <span className="accent">{copy.titleAccent}</span>
        </h1>
        <p>{copy.heroLead}</p>
      </section>

      <div className="bracket-controls" aria-label={copy.controlsAriaLabel}>
        <BracketModeToggle />
        <BracketLayoutToggle />
      </div>

      <BracketBento />
      <BestThirdRacePanel />
      <BestThirdTimeline />
    </div>
  );
}
