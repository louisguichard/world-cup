import { useMemo } from "react";
import { useStore } from "../index";
import type { MergedMatch } from "../../types";

export type ResultsSortOrder = "newest" | "oldest";

export function compareMatchByKickoff(a: MergedMatch, b: MergedMatch, order: ResultsSortOrder): number {
  const delta = Date.parse(b.date) - Date.parse(a.date);
  return order === "newest" ? delta : -delta;
}

export function useCompletedGroupMatches(): MergedMatch[] {
  const matches = useStore((s) => s.liveMatches);

  return useMemo(
    () =>
      Object.values(matches)
        .filter((m) => m.group && m.status === "completed")
        .sort((a, b) => compareMatchByKickoff(a, b, "newest")),
    [matches]
  );
}

export function filterCompletedMatches(
  matches: MergedMatch[],
  options: { teamId?: string; sort?: ResultsSortOrder; limit?: number }
): MergedMatch[] {
  const sort = options.sort ?? "newest";
  let list = matches;
  if (options.teamId) {
    list = list.filter((m) => m.homeTeamId === options.teamId || m.awayTeamId === options.teamId);
  }
  const sorted = [...list].sort((a, b) => compareMatchByKickoff(a, b, sort));
  const limit = options.limit ?? (options.teamId ? 32 : 12);
  return sorted.slice(0, limit);
}

export function useUpcomingGroupMatches(): MergedMatch[] {
  const matches = useStore((s) => s.liveMatches);

  return useMemo(
    () =>
      Object.values(matches)
        .filter((m) => m.group && m.status === "scheduled")
        .sort((a, b) => Date.parse(a.date) - Date.parse(b.date)),
    [matches]
  );
}
