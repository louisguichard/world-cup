import type { MergedMatch, Team } from "../types";
import { isResultFinalLocked } from "./liveDataContract";
import { mergeCanonicalLockedKnockout } from "./canonicalKnockoutResults";
import { prepareLiveMatchStore } from "./liveMatchStorePipeline";

function lockedCacheEntries(
  cached: Record<string, MergedMatch>
): Record<string, MergedMatch> {
  const locked: Record<string, MergedMatch> = {};
  for (const [key, match] of Object.entries(cached)) {
    if (!isResultFinalLocked(match)) continue;
    const storeKey = match.matchId ?? match.id ?? key;
    locked[storeKey] = { ...match, id: storeKey, matchId: storeKey, locked: true, status: "completed" };
  }
  return locked;
}

/**
 * After boot rebuilds matches from static + ESPN, re-apply locked finals from cache.
 * Locked completed rows beat unlocked boot rows (dedupe priority).
 */
export function mergeBootLiveMatches(
  bootBuilt: Record<string, MergedMatch>,
  cached: Record<string, MergedMatch>,
  teams: Record<string, Team>
): Record<string, MergedMatch> {
  const locked = lockedCacheEntries(cached);
  const merged =
    Object.keys(locked).length === 0
      ? bootBuilt
      : { ...bootBuilt, ...locked };
  return prepareLiveMatchStore(mergeCanonicalLockedKnockout(merged, { force: true }), teams);
}
