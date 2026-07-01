import { useMemo } from "react";
import { isMergedMatchInActivePhase } from "../lib/matchLifecycle";
import { prepareLiveMatchStore } from "../lib/liveMatchStorePipeline";
import { resolveDisplayMatch } from "../lib/resolveDisplayMatch";
import type { MergedMatch } from "../types";
import { useStore } from "../store";
import { useMaterializedScheduleBundle } from "./useMaterializedSchedule";

/** Live-now rows: materialized kickoff/teams first, then lifecycle phase gate. */
export function useActiveLiveDisplayMatches(): MergedMatch[] {
  const liveMatchesMap = useStore((s) => s.liveMatches);
  const teams = useStore((s) => s.teams);
  const { index: materializedIndex } = useMaterializedScheduleBundle();

  return useMemo(
    () =>
      Object.values(prepareLiveMatchStore(liveMatchesMap, teams))
        .map((m) => resolveDisplayMatch(m, materializedIndex))
        .filter((m) => isMergedMatchInActivePhase(m)),
    [liveMatchesMap, materializedIndex, teams]
  );
}
