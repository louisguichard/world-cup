import type { MergedMatch, Team } from "../types";
import { applyLiveScore } from "./DataMerger";
import { enrichMatchWithScheduleId } from "./ScheduleLinker";
import { logger } from "./Logger";

export type EspnMergeMode = "id" | "fuzzy" | "new";

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

/**
 * Resolves which existing store entry (if any) should receive an incoming ESPN match.
 * Priority: exact ESPN id → espnEventId pointer → same teams + close kickoff.
 */
export function resolveEspnMergeTarget(
  merged: Record<string, MergedMatch>,
  incoming: MergedMatch
): { storeKey: string; mode: EspnMergeMode } {
  // 1. Exact id match (happy path)
  if (merged[incoming.id]) {
    return { storeKey: incoming.id, mode: "id" };
  }

  // 2. Fuzzy: find entry whose espnEventId equals incoming id, OR same teams with close kickoff
  const kickoffMs = Date.parse(incoming.date);
  for (const [key, existing] of Object.entries(merged)) {
    if (existing.espnEventId === incoming.id) {
      return { storeKey: key, mode: "fuzzy" };
    }
    if (
      existing.homeTeamId === incoming.homeTeamId &&
      existing.awayTeamId === incoming.awayTeamId &&
      Math.abs(Date.parse(existing.date) - kickoffMs) <= FOUR_HOURS_MS
    ) {
      return { storeKey: key, mode: "fuzzy" };
    }
  }

  // 3. New entry
  return { storeKey: incoming.id, mode: "new" };
}

/**
 * Merges a single ESPN match into the store map, logging how it was linked.
 * Returns the merge mode so callers can track stats.
 */
export function mergeEspnMatchIntoStore(
  merged: Record<string, MergedMatch>,
  incoming: MergedMatch,
  teams: Record<string, Team>
): EspnMergeMode {
  const { storeKey, mode } = resolveEspnMergeTarget(merged, incoming);

  logger.debug(`[PollingEngine] Match linked by ${mode}`, "espnMatchMerge", {
    incomingId: incoming.id,
    storeKey,
    homeTeamId: incoming.homeTeamId,
    awayTeamId: incoming.awayTeamId
  });

  // Preserve the original store key on fuzzy/new merge (set espnEventId pointer)
  const applied = applyLiveScore(merged[storeKey], {
    ...incoming,
    espnEventId: incoming.id
  }, "espn");

  merged[storeKey] = enrichMatchWithScheduleId(applied, teams);

  return mode;
}
