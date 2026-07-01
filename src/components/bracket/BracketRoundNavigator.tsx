import { useCallback, useEffect, useRef } from "react";
import { APP_COPY } from "../../lib/appCopy";
import { bracketStageScrollTarget } from "../../lib/brackets/bracketRoundSwipe";
import { bracketStageShortLabel } from "../../lib/brackets/bracketStageLabels";
import type { Stage } from "../../types";

type Props = {
  stages: Stage[];
  activeStage: Stage;
  onStageSelect: (stage: Stage) => void;
  scrollRootRef: React.RefObject<HTMLElement | null>;
};

export function BracketRoundNavigator({ stages, activeStage, onStageSelect, scrollRootRef }: Props) {
  const copy = APP_COPY.bracket;
  const observerRef = useRef<IntersectionObserver | null>(null);

  const scrollToStage = useCallback(
    (stage: Stage) => {
      const root = scrollRootRef.current;
      if (!root) return;
      const panel = bracketStageScrollTarget(root, stage);
      if (!panel) return;
      const targetLeft = panel.offsetLeft;
      root.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
      onStageSelect(stage);
    },
    [onStageSelect, scrollRootRef]
  );

  useEffect(() => {
    const root = scrollRootRef.current;
    if (!root || stages.length === 0) return;

    observerRef.current?.disconnect();
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target as HTMLElement | undefined;
        const stage = top?.dataset.stage as Stage | undefined;
        if (stage && stages.includes(stage)) {
          onStageSelect(stage);
        }
      },
      { root, threshold: [0.51, 0.65, 0.85] }
    );

    stages.forEach((stage) => {
      const panel = bracketStageScrollTarget(root, stage);
      if (panel) observer.observe(panel);
    });

    observerRef.current = observer;
    return () => observer.disconnect();
  }, [onStageSelect, scrollRootRef, stages]);

  return (
    <nav className="bracket-round-nav" aria-label={copy.roundNavLabel}>
      <div className="bracket-round-nav__track" role="tablist">
        {stages.map((stage) => (
          <button
            key={stage}
            type="button"
            role="tab"
            className={`bracket-round-nav__pill${activeStage === stage ? " is-active" : ""}`}
            aria-selected={activeStage === stage}
            onClick={() => scrollToStage(stage)}
          >
            {bracketStageShortLabel(stage)}
          </button>
        ))}
      </div>
    </nav>
  );
}
