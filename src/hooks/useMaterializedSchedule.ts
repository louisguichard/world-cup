import { useMemo } from "react";
import {
  getMaterializedScheduleBundle,
  type MaterializedScheduleBundle,
} from "../lib/materializedScheduleCache";
import { buildScheduleOverlayFingerprint } from "../store/selectors/scheduleSelectors";
import { useStore } from "../store";
import type { MergedMatch } from "../types";

export type { MaterializedScheduleBundle };

/** Single memoized pass — schedule + lookup index, stable across live clock ticks. */
export function useMaterializedScheduleBundle(): MaterializedScheduleBundle {
  const teams = useStore((s) => s.teams);
  const overlayFingerprint = useStore((s) =>
    buildScheduleOverlayFingerprint(s.liveMatches, s.groupStandings)
  );

  return useMemo(() => {
    const { liveMatches, groupStandings } = useStore.getState();
    return getMaterializedScheduleBundle(teams, liveMatches, groupStandings);
  }, [teams, overlayFingerprint]);
}

/** Schedule rows with knockout slots resolved from authoritative group standings. */
export function useMaterializedSchedule(): MergedMatch[] {
  return useMaterializedScheduleBundle().schedule;
}
