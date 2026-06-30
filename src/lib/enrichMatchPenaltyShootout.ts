import type { MergedMatch, MatchEvent } from "../types";
import { derivePenaltyShootout } from "./derivePenaltyShootout";

/** Attach penalty shootout data from events when available. */
export function enrichMatchPenaltyShootout(
  match: MergedMatch,
  events: MatchEvent[]
): MergedMatch {
  const shootout = derivePenaltyShootout({
    events,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    period: match.period,
    decidedByPenalties: match.decidedByPenalties,
    existing: match.penaltyShootout,
  });
  if (!shootout) return match;
  return {
    ...match,
    penaltyShootout: shootout,
    decidedByPenalties: match.decidedByPenalties ?? true,
  };
}

export function enrichMatchesPenaltyShootouts(
  matches: Record<string, MergedMatch>,
  matchEvents: Record<string, MatchEvent[]>
): Record<string, MergedMatch> {
  const out: Record<string, MergedMatch> = {};
  for (const [key, match] of Object.entries(matches)) {
    const events =
      matchEvents[match.id] ??
      matchEvents[match.matchId ?? ""] ??
      matchEvents[match.espnEventId ?? ""] ??
      [];
    out[key] = enrichMatchPenaltyShootout(match, events);
  }
  return out;
}
