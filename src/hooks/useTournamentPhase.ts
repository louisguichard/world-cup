import { useMemo } from "react";
import { APP_COPY } from "../lib/appCopy";
import { WC2026, getCurrentPhase, isGroupStageOver, type TournamentPhase } from "../config/tournamentConfig";

const PHASE_LABELS: Record<TournamentPhase, string> = {
  GROUP: APP_COPY.results.stageGroup,
  R32: APP_COPY.results.stageR32,
  R16: APP_COPY.results.stageR16,
  QF: APP_COPY.results.stageQF,
  SF: APP_COPY.results.stageSF,
  FINAL: APP_COPY.results.stageFinal,
  COMPLETE: APP_COPY.results.stageFinal
};

export function useTournamentPhase(now: Date = new Date()) {
  return useMemo(() => {
    const phase = getCurrentPhase(WC2026, now);
    const groupStageOver = isGroupStageOver(WC2026, now);

    return {
      phase,
      isGroupStageOver: groupStageOver,
      isKnockoutActive: groupStageOver,
      activeRoundLabel: PHASE_LABELS[phase]
    };
  }, [now.getTime()]);
}
