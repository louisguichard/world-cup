import { useMemo } from "react";
import { buildEliminationStory } from "../lib/eliminationStory";
import {
  buildQualificationContext,
  computeQualificationStatus,
} from "../lib/qualification";
import { useStore } from "../store";

export function useEliminationStory(teamId: string | null) {
  const teams = useStore((s) => s.teams);
  const liveMatches = useStore((s) => s.liveMatches);
  const standings = useStore((s) => s.groupStandings);
  const matchEvents = useStore((s) => s.matchEvents);

  const qualContext = useMemo(
    () => buildQualificationContext(Object.values(liveMatches), Object.values(teams)),
    [liveMatches, teams]
  );

  const qual = useMemo(
    () => (teamId ? computeQualificationStatus(teamId, standings, qualContext) : null),
    [teamId, standings, qualContext]
  );

  const story = useMemo(() => {
    if (!teamId) return null;
    const team = teams[teamId];
    if (!team) return null;
    if (qual?.canQualify && qual.lifeState !== "eliminated") return null;

    return buildEliminationStory({
      teamId,
      team,
      matches: Object.values(liveMatches),
      teams: Object.values(teams),
      matchEvents,
      standings,
      qualContext,
    });
  }, [teamId, teams, liveMatches, matchEvents, standings, qualContext, qual]);

  return { story, qual };
}
