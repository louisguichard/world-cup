import { getAllScheduleEntries } from "../BroadcastLookup";
import type { MergedMatch } from "../../types";

export type ResolvedMatchIds = {
  officialMatchId: string;
  espnEventId: string | null;
  wcMatchId: string | null;
  sofaEventId: string | null;
};

/**
 * Resolve a match by its official schedule ID (e.g. "M89") into all known
 * provider IDs by looking up the live store, then the static schedule.
 *
 * Falls back gracefully — callers must handle null provider IDs.
 */
export function resolveMatchIds(
  officialMatchId: string,
  liveMatches: Record<string, MergedMatch>
): ResolvedMatchIds {
  // 1. Check live matches store (has espnEventId, sofaEventId)
  const liveEntry = findLiveByOfficialId(officialMatchId, liveMatches);
  if (liveEntry) {
    return {
      officialMatchId,
      espnEventId: liveEntry.espnEventId ?? null,
      wcMatchId: liveEntry.matchId ?? null,
      sofaEventId: liveEntry.sofaEventId ?? null
    };
  }

  // 2. Fall back to static schedule for the match number
  const matchNumber = parseInt(officialMatchId.replace(/^M/i, ""), 10);
  if (!isNaN(matchNumber)) {
    const entries = getAllScheduleEntries();
    const entry = entries.find((e) => e.matchNumber === matchNumber);
    if (entry) {
      return {
        officialMatchId,
        espnEventId: null,
        wcMatchId: null,
        sofaEventId: null
      };
    }
  }

  return {
    officialMatchId,
    espnEventId: null,
    wcMatchId: null,
    sofaEventId: null
  };
}

/**
 * Find a live match by checking:
 * 1. `m.matchId === officialMatchId`
 * 2. `m.id === officialMatchId`
 */
function findLiveByOfficialId(
  officialMatchId: string,
  liveMatches: Record<string, MergedMatch>
): MergedMatch | undefined {
  return Object.values(liveMatches).find(
    (m) => m.matchId === officialMatchId || m.id === officialMatchId
  );
}

/**
 * Reverse lookup: given an ESPN event ID, find the official schedule ID.
 */
export function resolveOfficialIdFromEspn(
  espnEventId: string,
  liveMatches: Record<string, MergedMatch>
): string | null {
  const entry = Object.values(liveMatches).find((m) => m.espnEventId === espnEventId);
  return entry?.matchId ?? null;
}
