import {
  buildMaterializedMatchIndex,
  type MaterializedMatchIndex,
} from "./resolveDisplayMatch";
import { materializeFullSchedule } from "./materializeFullSchedule";
import { readStandingsCache } from "./standingsCache";
import { buildScheduleOverlayFingerprint } from "../store/selectors/scheduleSelectors";
import { useStore } from "../store";
import type { GroupStanding, MergedMatch, Team } from "../types";

export type MaterializedScheduleBundle = {
  schedule: MergedMatch[];
  index: MaterializedMatchIndex;
};

let cachedFingerprint = "";
let cachedBundle: MaterializedScheduleBundle = {
  schedule: [],
  index: new Map(),
};

function effectiveStandings(groupStandings: GroupStanding[]): GroupStanding[] {
  if (groupStandings.length > 0) return groupStandings;
  return readStandingsCache() ?? [];
}

/** One materialized schedule per overlay fingerprint — shared by all hooks/components. */
export function getMaterializedScheduleBundle(
  teams: Record<string, Team>,
  liveMatches: Record<string, MergedMatch>,
  groupStandings: GroupStanding[]
): MaterializedScheduleBundle {
  const fingerprint = buildScheduleOverlayFingerprint(liveMatches, groupStandings);
  if (fingerprint === cachedFingerprint && cachedBundle.schedule.length > 0) {
    return cachedBundle;
  }

  const standings = effectiveStandings(groupStandings);
  const schedule = materializeFullSchedule(teams, liveMatches, standings);
  const index = buildMaterializedMatchIndex(schedule);
  cachedFingerprint = fingerprint;
  cachedBundle = { schedule, index };
  return cachedBundle;
}

/** Read-through cache using current store snapshot. */
export function getMaterializedScheduleBundleFromStore(): MaterializedScheduleBundle {
  const { teams, liveMatches, groupStandings } = useStore.getState();
  return getMaterializedScheduleBundle(teams, liveMatches, groupStandings);
}

/** Test-only reset. */
export function resetMaterializedScheduleCache(): void {
  cachedFingerprint = "";
  cachedBundle = { schedule: [], index: new Map() };
}
