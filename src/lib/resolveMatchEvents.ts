import type { MatchEvent, MergedMatch } from "../types";

/** Resolves events for a match from the store map (multiple key aliases). */
export function resolveEventsForMatch(
  match: MergedMatch,
  matchEvents: Record<string, MatchEvent[]>
): MatchEvent[] {
  const keys = [match.id, match.matchId, match.espnEventId].filter(Boolean) as string[];
  for (const key of keys) {
    const hit = matchEvents[key];
    if (hit?.length) return hit;
  }
  return [];
}
