import { resolveCanonicalTeamId, resolveTeamAbbrevFromHint } from "../data/wc2026TeamCatalog";
import { buildKampMatchIndex, getCachedKampRecords } from "../services/kamp/KampMatchesClient";
import { findKampRecordForMatch } from "../services/kamp/linkKampMatch";
import { mapKampGoalsToEvents } from "../services/kamp/mapKampGoalsToEvents";
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

  if (match.status === "completed" && teams) {
    const records = getCachedKampRecords();
    if (records?.length) {
      const index = buildKampMatchIndex(records, resolveTeamAbbrevFromHint);
      const kamp = findKampRecordForMatch(match, index, teams);
      if (kamp?.gols?.length) {
        const mapped = mapKampGoalsToEvents(
          kamp.gols,
          match.homeTeamId,
          match.awayTeamId,
          teams
        );
        if (mapped.length > 0) {
          return normalizeEventsForMatch(mapped, match, teams);
        }
      }
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
