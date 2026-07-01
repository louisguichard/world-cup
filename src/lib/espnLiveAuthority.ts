import type { Match, MergedMatch, Team } from "../types";
import { isResultFinalLocked } from "./liveDataContract";
import { coerceLiveStatusForKickoff, isMergedMatchEffectivelyLive } from "./matchLifecycle";
import { resolveEspnMergeTarget } from "../services/espnMatchMerge";
import { applyLiveScore } from "../services/DataMerger";

function clearLiveClockFields(match: MergedMatch): MergedMatch {
  return {
    ...match,
    status: "scheduled",
    clockMinute: undefined,
    clockExtra: undefined,
    clockRunning: undefined,
    displayClock: undefined,
    period: undefined,
    homeScore: undefined,
    awayScore: undefined,
  };
}

export function findEspnRowForStoreMatch(
  existing: MergedMatch,
  espnMatches: Match[],
  merged: Record<string, MergedMatch>,
  teams: Record<string, Team>,
  storeKey?: string
): Match | undefined {
  const espnId = existing.espnEventId ?? existing.id;
  const byId = espnMatches.find((m) => m.id === espnId);
  if (byId) return byId;

  for (const candidate of espnMatches) {
    const incoming = applyLiveScore(undefined, { ...candidate, espnEventId: candidate.id }, "espn");
    const { storeKey: targetKey } = resolveEspnMergeTarget(merged, incoming, teams);
    if (targetKey === (storeKey ?? existing.id)) {
      return candidate;
    }
  }

  return undefined;
}

export function espnScoreboardConfirmsLive(
  existing: MergedMatch,
  espnMatches: Match[],
  merged: Record<string, MergedMatch>,
  teams: Record<string, Team>,
  storeKey?: string
): boolean {
  return findEspnRowForStoreMatch(existing, espnMatches, merged, teams, storeKey)?.status === "live";
}

export function shouldDemoteStoredLive(
  existing: MergedMatch,
  espnRow: Match | undefined,
  nowMs = Date.now()
): boolean {
  if (!isMergedMatchEffectivelyLive(existing, nowMs)) return true;
  if (espnRow?.status === "scheduled") return true;
  return false;
}

/**
 * ESPN scoreboard is the primary lifecycle source. Demote store rows promoted by
 * secondary enrichment/consensus, premature upstream live flags, or ESPN scheduled.
 */
export function reconcileEspnLiveAuthority(
  merged: Record<string, MergedMatch>,
  espnMatches: Match[],
  teams: Record<string, Team>,
  nowMs = Date.now()
): string[] {
  const demoted: string[] = [];

  for (const [storeKey, existing] of Object.entries(merged)) {
    if (existing.status !== "live" || isResultFinalLocked(existing)) continue;

    const espnRow = findEspnRowForStoreMatch(existing, espnMatches, merged, teams, storeKey);
    if (!shouldDemoteStoredLive(existing, espnRow, nowMs)) continue;

    merged[storeKey] = clearLiveClockFields(existing);
    demoted.push(storeKey);
  }

  return demoted;
}

/** Normalize a merged row after any write — enforces kickoff gate on persisted status. */
export function normalizeStoredLiveStatus(
  match: MergedMatch,
  nowMs = Date.now()
): MergedMatch {
  return coerceLiveStatusForKickoff(match, nowMs);
}
