import type { MergedMatch, Team } from "../../types";
import { buildFixtureRegistry } from "./buildFixtureRegistry";
import { isOfficialMatchId } from "./isOfficialMatchId";
import { resolveFixtureRef } from "./resolveFixtureRef";
import { buildTeamRegistry, resolveTeamRef } from "./teamRegistry";

function matchPriority(match: MergedMatch): number {
  let score = 0;
  if (match.locked && match.status === "completed") score += 100;
  else if (match.status === "completed") score += 80;
  else if (match.status === "live") score += 60;
  if (match.matchId && isOfficialMatchId(match.matchId)) score += 20;
  if (match.espnEventId) score += 10;
  if (match.homeScore !== undefined) score += 5;
  return score;
}

function mergeMatchRecords(
  existing: MergedMatch,
  incoming: MergedMatch,
  teams: Record<string, Team>,
  teamRegistry: ReturnType<typeof buildTeamRegistry>
): MergedMatch {
  const pickPrimary = matchPriority(incoming) > matchPriority(existing) ? incoming : existing;
  const pickSecondary = pickPrimary === incoming ? existing : incoming;

  return {
    ...pickSecondary,
    ...pickPrimary,
    homeTeamId: resolveTeamRef(
      pickPrimary.homeTeamId || pickSecondary.homeTeamId,
      teams,
      teamRegistry
    ),
    awayTeamId: resolveTeamRef(
      pickPrimary.awayTeamId || pickSecondary.awayTeamId,
      teams,
      teamRegistry
    ),
    espnEventId: pickPrimary.espnEventId ?? pickSecondary.espnEventId,
    matchId: pickPrimary.matchId ?? pickSecondary.matchId,
    kickoffMs: pickPrimary.kickoffMs ?? pickSecondary.kickoffMs,
    penaltyShootout: pickPrimary.penaltyShootout ?? pickSecondary.penaltyShootout,
  };
}

function canonicalStoreKey(
  match: MergedMatch,
  teams: Record<string, Team>,
  fixtureRegistry: ReturnType<typeof buildFixtureRegistry>
): string {
  const resolved = resolveFixtureRef(match, teams, fixtureRegistry);
  if (resolved) return resolved;
  if (match.matchId && isOfficialMatchId(match.matchId)) return match.matchId;
  return match.id;
}

/** Collapse duplicate ESPN + M## rows; prefer official M## store keys. */
export function dedupeLiveMatchStore(
  matches: Record<string, MergedMatch>,
  teams: Record<string, Team> = {}
): Record<string, MergedMatch> {
  const fixtureRegistry = buildFixtureRegistry();
  const teamRegistry = buildTeamRegistry(teams);
  const groups = new Map<string, MergedMatch>();

  for (const match of Object.values(matches)) {
    const normalized: MergedMatch = {
      ...match,
      homeTeamId: resolveTeamRef(match.homeTeamId, teams, teamRegistry),
      awayTeamId: resolveTeamRef(match.awayTeamId, teams, teamRegistry),
    };

    const fixtureId = resolveFixtureRef(normalized, teams, fixtureRegistry);
    const key = fixtureId ?? canonicalStoreKey(normalized, teams, fixtureRegistry);

    const merged: MergedMatch = {
      ...normalized,
      id: fixtureId ?? normalized.id,
      matchId: fixtureId ?? normalized.matchId,
    };

    const existing = groups.get(key);
    groups.set(
      key,
      existing ? mergeMatchRecords(existing, merged, teams, teamRegistry) : merged
    );
  }

  const out: Record<string, MergedMatch> = {};
  for (const [key, match] of groups) {
    const fixtureId = resolveFixtureRef(match, teams, fixtureRegistry);
    const storeKey = fixtureId ?? key;
    out[storeKey] = {
      ...match,
      id: storeKey,
      matchId: fixtureId ?? match.matchId ?? storeKey,
    };
  }

  return out;
}
