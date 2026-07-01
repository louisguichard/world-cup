import { getBroadcast } from "../services/BroadcastLookup";
import { isBracketPlaceholderTeamId } from "./brackets/isBracketPlaceholderTeamId";
import type { MergedMatch } from "../types";

export type MaterializedMatchIndex = Map<string, MergedMatch>;

function venueFromBroadcast(matchId: string | undefined): string | undefined {
  if (!matchId) return undefined;
  const chip = getBroadcast(matchId);
  if (!chip) return undefined;
  return `${chip.venue.name}, ${chip.venue.city}`;
}

function preferTeamId(raw: string | undefined, materialized: string | undefined): string {
  if (!materialized?.trim()) return raw?.trim() ?? "";
  if (!raw?.trim()) return materialized;
  if (isBracketPlaceholderTeamId(raw)) return materialized;
  return raw;
}

/** Build lookup index from materialized schedule rows. */
export function buildMaterializedMatchIndex(schedule: MergedMatch[]): MaterializedMatchIndex {
  const index: MaterializedMatchIndex = new Map();
  for (const match of schedule) {
    index.set(match.id, match);
    if (match.matchId) index.set(match.matchId, match);
    if (match.espnEventId) index.set(match.espnEventId, match);
  }
  return index;
}

function lookupMaterialized(raw: MergedMatch, index: MaterializedMatchIndex): MergedMatch | undefined {
  return (
    index.get(raw.id) ??
    (raw.matchId ? index.get(raw.matchId) : undefined) ??
    (raw.espnEventId ? index.get(raw.espnEventId) : undefined)
  );
}

/** Merge live store row with materialized schedule for display (teams, venue, matchId). */
export function resolveDisplayMatch(
  raw: MergedMatch,
  index: MaterializedMatchIndex
): MergedMatch {
  const materialized = lookupMaterialized(raw, index);
  if (!materialized) {
    const matchId = raw.matchId;
    const venue = raw.venue ?? venueFromBroadcast(matchId);
    return venue && venue !== raw.venue ? { ...raw, venue } : raw;
  }

  const matchId = raw.matchId ?? materialized.matchId;
  const venue =
    raw.venue ?? materialized.venue ?? venueFromBroadcast(matchId ?? materialized.matchId);

  return {
    ...raw,
    matchId,
    venue,
    date: materialized.date ?? raw.date,
    kickoffMs: materialized.kickoffMs ?? raw.kickoffMs,
    stage: raw.stage ?? materialized.stage,
    group: raw.group ?? materialized.group,
    homeTeamId: preferTeamId(raw.homeTeamId, materialized.homeTeamId),
    awayTeamId: preferTeamId(raw.awayTeamId, materialized.awayTeamId),
    espnEventId: raw.espnEventId ?? materialized.espnEventId,
  };
}
