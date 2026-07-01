import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { buildTournamentPulseViewModel } from "../../lib/buildTournamentPulseViewModel";
import { useMaterializedScheduleBundle } from "../../hooks/useMaterializedSchedule";
import { useTournamentPhase } from "../../hooks/useTournamentPhase";
import { useStore } from "../index";

export function useTournamentPulse() {
  const { isKnockoutActive } = useTournamentPhase();
  const teams = useStore((s) => s.teams);
  const matchEvents = useStore(useShallow((s) => s.matchEvents));
  const { schedule } = useMaterializedScheduleBundle();

  return useMemo(
    () =>
      buildTournamentPulseViewModel({
        schedule,
        matchEvents,
        teams,
        isKnockoutActive,
      }),
    [schedule, matchEvents, teams, isKnockoutActive]
  );
}
