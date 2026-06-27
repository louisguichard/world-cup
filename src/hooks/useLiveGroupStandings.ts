import { useMemo } from "react";
import type { GroupLetter, MergedMatch } from "../types";
import { useStore } from "../store";

export function useLiveGroupStandings(group: GroupLetter | undefined) {
  const liveMatchesMap = useStore((s) => s.liveMatches);
  const groupStandings = useStore((s) => s.groupStandings);

  return useMemo(() => {
    if (!group) return null;

    const matches = Object.values(liveMatchesMap);
    const standing = groupStandings.find((entry) => entry.group === group);
    if (!standing) return null;

    const liveTeamIds = new Set<string>();
    for (const match of matches) {
      if (match.group !== group || match.status !== "live") continue;
      liveTeamIds.add(match.homeTeamId);
      liveTeamIds.add(match.awayTeamId);
    }

    return {
      standing,
      liveTeamIds,
      liveMatchCount: matches.filter(
        (match) => match.group === group && match.status === "live"
      ).length,
    };
  }, [group, liveMatchesMap, groupStandings]);
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
