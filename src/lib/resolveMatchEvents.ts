import { resolveCanonicalTeamId } from "../data/wc2026TeamCatalog";
import type { MatchEvent, MergedMatch, Team } from "../types";

/** Resolves events for a match from the store map (multiple key aliases). */
export function resolveEventsForMatch(
  match: MergedMatch,
  matchEvents: Record<string, MatchEvent[]>,
  teams?: Record<string, Team>
): MatchEvent[] {
  const keys = [match.id, match.matchId, match.espnEventId].filter(Boolean) as string[];
  for (const key of keys) {
    const hit = matchEvents[key];
    if (hit?.length) {
      return teams ? normalizeEventsForMatch(hit, match, teams) : hit;
    }
  }
  return [];
}

/** Align event team ids with catalog ids on the match (ESPN numeric → jor, arg, …). */
export function normalizeEventsForMatch(
  events: MatchEvent[],
  match: Pick<MergedMatch, "homeTeamId" | "awayTeamId">,
  teams: Record<string, Team>
): MatchEvent[] {
  const homeCanon = resolveCanonicalTeamId(match.homeTeamId, teams[match.homeTeamId]);
  const awayCanon = resolveCanonicalTeamId(match.awayTeamId, teams[match.awayTeamId]);

  return events.map((event) => {
    if (event.teamId === match.homeTeamId || event.teamId === match.awayTeamId) {
      return event;
    }

    const sideCanon = resolveCanonicalTeamId(event.teamId, teams[event.teamId]);
    if (sideCanon === homeCanon) {
      return { ...event, teamId: match.homeTeamId };
    }
    if (sideCanon === awayCanon) {
      return { ...event, teamId: match.awayTeamId };
    }
    return event;
  });
}
