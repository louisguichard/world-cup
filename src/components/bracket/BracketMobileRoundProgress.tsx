import type { Stage } from "../../types";

type Props = {
  stages: Stage[];
  activeStage: Stage;
};

export function BracketMobileRoundProgress({ stages, activeStage }: Props) {
  const index = stages.indexOf(activeStage);
  const current = index >= 0 ? index + 1 : 1;

  return (
    <div className="bracket-mobile-swipe__progress" aria-live="polite">
      <span className="bracket-mobile-swipe__progress-text">
        Round {current} of {stages.length}
      </span>
      <div className="bracket-mobile-swipe__dots" aria-hidden="true">
        {stages.map((stage) => (
          <span
            key={stage}
            className={`bracket-mobile-swipe__dot${stage === activeStage ? " is-active" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
