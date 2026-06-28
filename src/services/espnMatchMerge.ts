import type { MergedMatch, Team } from "../types";
import { resolveCanonicalTeamId } from "../data/wc2026TeamCatalog";
import { applyLiveScore } from "./DataMerger";
import { enrichMatchWithScheduleId } from "./ScheduleLinker";
import { logger } from "./Logger";

export type EspnMergeMode = "id" | "fuzzy" | "new";

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

function normalizeTeamName(name: string): string {
  return name.trim().toLowerCase();
}

function teamNameMatches(team: Team, label: string): boolean {
  const norm = normalizeTeamName(label);
  return (
    normalizeTeamName(team.name) === norm ||
    normalizeTeamName(team.shortName) === norm ||
    normalizeTeamName(team.abbreviation) === norm
  );
}

function sameFixture(
  a: MergedMatch,
  b: MergedMatch,
  teams: Record<string, Team>
): boolean {
  const aHome = teams[a.homeTeamId];
  const aAway = teams[a.awayTeamId];
  const bHome = teams[b.homeTeamId];
  const bAway = teams[b.awayTeamId];
  if (!aHome || !aAway || !bHome || !bAway) {
    return a.homeTeamId === b.homeTeamId && a.awayTeamId === b.awayTeamId;
  }
  return teamNameMatches(aHome, bHome.name) && teamNameMatches(aAway, bAway.name);
}

function lookupTeam(teams: Record<string, Team>, teamId: string): Team | undefined {
  if (teams[teamId]) return teams[teamId];
  return Object.values(teams).find((team) => team.id === teamId);
}

/** Rewrite match team ids to catalog ids (bra, fra, …) so standings stay unified. */
export function canonicalizeMatchTeamIds(
  match: MergedMatch,
  teams: Record<string, Team>
): MergedMatch {
  const homeTeam = lookupTeam(teams, match.homeTeamId);
  const awayTeam = lookupTeam(teams, match.awayTeamId);
  return {
    ...match,
    homeTeamId: resolveCanonicalTeamId(match.homeTeamId, homeTeam),
    awayTeamId: resolveCanonicalTeamId(match.awayTeamId, awayTeam),
  };
}

/**
 * Resolves which existing store entry (if any) should receive an incoming ESPN match.
 * Priority: exact ESPN id → espnEventId pointer → same teams + close kickoff.
 */
export function resolveEspnMergeTarget(
  merged: Record<string, MergedMatch>,
  incoming: MergedMatch,
  teams: Record<string, Team> = {}
): { storeKey: string; mode: EspnMergeMode } {
  // 1. Exact id match (happy path)
  if (merged[incoming.id]) {
    return { storeKey: incoming.id, mode: "id" };
  }

  // 2. Fuzzy: espnEventId pointer, same ids + kickoff, or same nation names + kickoff
  const kickoffMs = Date.parse(incoming.date);
  for (const [key, existing] of Object.entries(merged)) {
    if (existing.espnEventId === incoming.id) {
      return { storeKey: key, mode: "fuzzy" };
    }
    if (Math.abs(Date.parse(existing.date) - kickoffMs) > FOUR_HOURS_MS) continue;
    if (
      existing.homeTeamId === incoming.homeTeamId &&
      existing.awayTeamId === incoming.awayTeamId
    ) {
      return { storeKey: key, mode: "fuzzy" };
    }
    if (sameFixture(existing, incoming, teams)) {
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
  const normalized = canonicalizeMatchTeamIds(incoming, teams);
  const { storeKey, mode } = resolveEspnMergeTarget(merged, normalized, teams);
  const existing = merged[storeKey];

  logger.debug(`[PollingEngine] Match linked by ${mode}`, "espnMatchMerge", {
    incomingId: incoming.id,
    storeKey,
    homeTeamId: normalized.homeTeamId,
    awayTeamId: normalized.awayTeamId
  });

  const homeTeamId = existing?.homeTeamId ?? normalized.homeTeamId;
  const awayTeamId = existing?.awayTeamId ?? normalized.awayTeamId;

  const applied = applyLiveScore(existing, {
    ...normalized,
    homeTeamId,
    awayTeamId,
    espnEventId: incoming.id
  }, "espn");

  merged[storeKey] = enrichMatchWithScheduleId(applied, teams);

  return mode;
}
