import { useCallback, useEffect, useRef } from "react";
import type { QualificationMatchContext } from "../../lib/qualification";
import { bracketStageShortLabel } from "../../lib/brackets/bracketStageLabels";
import {
  bracketStageScrollTarget,
  resolveAdjacentBracketStage,
} from "../../lib/brackets/bracketRoundSwipe";
import { APP_COPY } from "../../lib/appCopy";
import type { BracketMatch, GroupStanding, MergedMatch, Stage, Team } from "../../types";
import { BracketCard } from "./BracketCard";
import { BracketMobileRoundProgress } from "./BracketMobileRoundProgress";
import { BracketRoundNavigator } from "./BracketRoundNavigator";

type Props = {
  stages: Stage[];
  activeStage: Stage;
  onStageChange: (stage: Stage) => void;
  orderedByStage: Record<Stage, BracketMatch[]>;
  teamsById: Record<string, Team>;
  mode: "confirmed" | "projected";
  standings: GroupStanding[];
  liveMatches: Record<string, MergedMatch>;
  qualContext: QualificationMatchContext;
  onTeamSelect: (teamId: string) => void;
  onMatchSelect: (matchId: string) => void;
  pathHighlight?: Set<string> | null;
  showPathHighlight?: boolean;
};

export function BracketMobileRoundSwipe({
  stages,
  activeStage,
  onStageChange,
  orderedByStage,
  teamsById,
  mode,
  standings,
  liveMatches,
  qualContext,
  onTeamSelect,
  onMatchSelect,
  pathHighlight = null,
  showPathHighlight = false,
}: Props) {
  const copy = APP_COPY.bracket;
  const swipeRef = useRef<HTMLDivElement>(null);

  const handleStageSelect = useCallback(
    (stage: Stage) => {
      onStageChange(stage);
    },
    [onStageChange]
  );

  const scrollToStage = useCallback(
    (stage: Stage) => {
      const root = swipeRef.current;
      if (!root) return;
      const panel = bracketStageScrollTarget(root, stage);
      if (!panel) return;
      root.scrollTo({ left: panel.offsetLeft, behavior: "smooth" });
      onStageChange(stage);
    },
    [onStageChange]
  );

  useEffect(() => {
    const root = swipeRef.current;
    if (!root) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const active = document.activeElement;
      if (active instanceof HTMLElement && active.closest("button, a, input, textarea")) return;

      const delta = event.key === "ArrowRight" ? 1 : -1;
      const next = resolveAdjacentBracketStage(stages, activeStage, delta);
      if (!next) return;

      event.preventDefault();
      scrollToStage(next);
    };

    root.addEventListener("keydown", onKeyDown);
    return () => root.removeEventListener("keydown", onKeyDown);
  }, [activeStage, scrollToStage, stages]);

  useEffect(() => {
    const root = swipeRef.current;
    if (!root) return;
    const panel = bracketStageScrollTarget(root, activeStage);
    if (!panel) return;
    const targetLeft = panel.offsetLeft;
    if (Math.abs(root.scrollLeft - targetLeft) > 8) {
      root.scrollTo({ left: targetLeft, behavior: "smooth" });
    }
  }, [activeStage]);

  return (
    <div className="bracket-mobile-swipe">
      <BracketRoundNavigator
        stages={stages}
        activeStage={activeStage}
        onStageSelect={handleStageSelect}
        scrollRootRef={swipeRef}
      />
      <p className="bracket-scroll-hint bracket-mobile-swipe__hint">{copy.mobileRoundSwipeHint}</p>
      <BracketMobileRoundProgress stages={stages} activeStage={activeStage} />
      <div
        className="bracket-mobile-swipe__viewport"
        ref={swipeRef}
        tabIndex={0}
        aria-label={copy.mobileRoundSwipeLabel}
      >
        <div className="bracket-mobile-swipe__track">
          {stages.map((stage) => (
            <section
              key={stage}
              className="bracket-mobile-swipe__panel"
              data-stage={stage}
              aria-labelledby={`bracket-mobile-stage-${stage}`}
            >
              <header className="bracket-mobile-swipe__panel-head">
                <h3 id={`bracket-mobile-stage-${stage}`}>{bracketStageShortLabel(stage)}</h3>
                <span className="bracket-mobile-swipe__match-count">
                  {orderedByStage[stage].length}{" "}
                  {orderedByStage[stage].length === 1 ? "match" : "matches"}
                </span>
              </header>
              <div className="bracket-mobile-swipe__list">
                {orderedByStage[stage].map((match) => (
                  <div className="bracket-mobile-swipe__cell" key={match.id} data-match-id={match.id}>
                    <BracketCard
                      match={match}
                      teamsById={teamsById}
                      mode={mode}
                      variant="schedule"
                      standings={standings}
                      liveMatches={liveMatches}
                      qualContext={qualContext}
                      onTeamSelect={onTeamSelect}
                      onMatchSelect={onMatchSelect}
                      pathHighlighted={showPathHighlight && Boolean(pathHighlight?.has(match.id))}
                      pathDimmed={showPathHighlight && !pathHighlight?.has(match.id)}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
