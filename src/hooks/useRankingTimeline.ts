/** Memoized hook that builds the best-third ranking timeline from store data. */
import { useMemo } from "react";
import { buildRankingTimeline } from "../lib/buildRankingTimeline";
import type { RankingSnapshot } from "../lib/buildRankingTimeline";
import { buildQualificationContext } from "../lib/qualification";
import { useStore } from "../store";

export function useRankingTimeline(): {
  snapshots: RankingSnapshot[];
  presentIndex: number;
  hasData: boolean;
} {
  const liveMatches = useStore((s) => s.liveMatches);
  const teams = useStore((s) => s.teams);
  const groupStandings = useStore((s) => s.groupStandings);
  const matchEvents = useStore((s) => s.matchEvents);

  const snapshots = useMemo(() => {
    const teamsList = Object.values(teams);
    const matches = Object.values(liveMatches).filter((match) => match.group);
    const qualContext = buildQualificationContext(
      Object.values(liveMatches),
      teamsList
    );

    return buildRankingTimeline({
      matches,
      teams: teamsList,
      matchEvents,
      presentStandings: groupStandings,
      presentQualContext: qualContext,
    });
  }, [liveMatches, teams, groupStandings, matchEvents]);

  const presentIndex = Math.max(0, snapshots.length - 1);

  return {
    snapshots,
    presentIndex,
    hasData: snapshots.length > 1,
  };
}
