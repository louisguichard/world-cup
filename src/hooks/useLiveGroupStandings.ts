import { useMemo } from "react";
import type { GroupLetter, MergedMatch } from "../types";
import { computeLiveGroupStanding, liveTeamIdsInGroup } from "../lib/buildLiveGroupStandings";
import { useStore } from "../store";

export function useLiveGroupStandings(group: GroupLetter | undefined) {
  const liveMatchesMap = useStore((s) => s.liveMatches);
  const teamsRecord = useStore((s) => s.teams);

  return useMemo(() => {
    if (!group) return null;

    const matches = Object.values(liveMatchesMap);
    const teams = Object.values(teamsRecord);
    const standing = computeLiveGroupStanding(group, matches, teams);
    if (!standing) return null;

    return {
      standing,
      liveTeamIds: liveTeamIdsInGroup(matches, group),
      liveMatchCount: matches.filter(
        (match) => match.group === group && match.status === "live"
      ).length,
    };
  }, [group, liveMatchesMap, teamsRecord]);
}

export function useLiveGroupsWithMatches(live: MergedMatch[]) {
  return useMemo(() => {
    const groups = new Set<GroupLetter>();
    for (const match of live) {
      if (match.group) groups.add(match.group);
    }
    return groups;
  }, [live]);
}
