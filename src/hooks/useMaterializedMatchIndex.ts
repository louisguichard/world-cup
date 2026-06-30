import { useMaterializedScheduleBundle } from "./useMaterializedSchedule";
import type { MaterializedMatchIndex } from "../lib/resolveDisplayMatch";

/** Materialized schedule lookup keyed by id, matchId, and espnEventId. */
export function useMaterializedMatchIndex(): MaterializedMatchIndex {
  return useMaterializedScheduleBundle().index;
}
