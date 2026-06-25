import { useMemo } from "react";
import { useStore } from "../index";
import type { MergedMatch } from "../../types";

export function useCompletedGroupMatches(): MergedMatch[] {
  const matches = useStore((s) => s.liveMatches);
  const teams = useStore((s) => s.teams);

  return useMemo(
    () =>
      Object.values(matches)
        .filter((m) => m.group && m.status === "completed")
        .sort((a, b) => Date.parse(b.date) - Date.parse(a.date)),
    [matches, teams]
  );
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
