import { useMemo } from "react";
import { useStore } from "../store";
import { buildQualificationContext } from "../lib/qualification";
import { buildTeamTournamentStatus } from "../lib/teamTournamentStatus";

export function useTeamTournamentStatus(teamId: string | undefined) {
  const teams = useStore((s) => s.teams);
  const liveMatches = useStore((s) => s.liveMatches);
  const matchEvents = useStore((s) => s.matchEvents);
  const standings = useStore((s) => s.groupStandings);

  return useMemo(() => {
    if (!teamId) return null;
    const team = teams[teamId];
    const qualContext = buildQualificationContext(Object.values(liveMatches), Object.values(teams));
    return buildTeamTournamentStatus({
      teamId,
      team,
      matches: Object.values(liveMatches),
      teams,
      matchEvents,
      standings,
    });
  }, [teamId, teams, liveMatches, matchEvents, standings]);
}
