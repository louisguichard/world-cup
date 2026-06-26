import { BracketBento } from "../bentos/BracketBento";
import { BestThirdRacePanel } from "../bentos/BestThirdRacePanel";
import { useStore } from "../../store";

export function BracketView() {
  const mode = useStore((s) => s.bracketViewMode);
  const setMode = useStore((s) => s.setBracketViewMode);

  return (
    <div className="bracket-view dashboard-view">
      <section className="hero-panel hero-panel--compact">
        <div className="eyebrow">Knockout stage</div>
        <h1>
          The road to <span className="accent">MetLife.</span>
        </h1>
        <p>Round of 32 through the final — projected from live standings or locked to confirmed scores.</p>
      </section>

      <div className="bracket-toggle" role="tablist" aria-label="Bracket mode">
        <button
          type="button"
          role="tab"
          className={mode === "projected" ? "active" : ""}
          aria-selected={mode === "projected"}
          onClick={() => setMode("projected")}
        >
          <span className="bracket-toggle-label">Projected</span>
          <span className="bracket-toggle-subtitle">
            Based on current group standings. Teams shown may change as remaining matches are played. Projected teams
            shown in indigo.
          </span>
        </button>
        <button
          type="button"
          role="tab"
          className={mode === "confirmed" ? "active" : ""}
          aria-selected={mode === "confirmed"}
          onClick={() => setMode("confirmed")}
        >
          <span className="bracket-toggle-label">Confirmed</span>
          <span className="bracket-toggle-subtitle">
            Only teams mathematically through after completing all 3 group matches. Unconfirmed slots show as TBD.
          </span>
        </button>
      </div>

      <BracketBento />
      <BestThirdRacePanel />
    </div>
  );
}
