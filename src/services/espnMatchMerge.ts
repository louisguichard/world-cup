import type { MergedMatch, Team } from "../types";
import { isResultFinalLocked } from "../lib/liveDataContract";
import { isBracketPlaceholderTeamId } from "../lib/brackets/isBracketPlaceholderTeamId";
import { isInternalTeamId } from "../lib/teamIdentity";
import {
  buildFixtureRegistry,
  canonicalizeMatchTeamIdsWithRegistry,
  resolveFixtureRef,
} from "../lib/registry";
import { applyLiveScore } from "./DataMerger";
import { enrichMatchWithScheduleId } from "./ScheduleLinker";
import { logger } from "./Logger";

export type EspnMergeMode = "id" | "fuzzy" | "new";

export function isProtectedFromEspnOverwrite(
  match: MergedMatch | undefined,
  lockedMatchIds?: Record<string, true>,
  storeKey?: string
): boolean {
  if (!match) return false;
  if (match.source === "manual" || isResultFinalLocked(match)) return true;
  if (storeKey && lockedMatchIds?.[storeKey]) return true;
  return false;
}

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

/** Prefer incoming ESPN ids over empty or bracket placeholder store ids. */
export function preferTeamId(existing: string | undefined, incoming: string): string {
  if (!existing?.trim()) return incoming;
  if (isBracketPlaceholderTeamId(existing)) return incoming || existing;
  if (isInternalTeamId(existing) && incoming.trim() && !isInternalTeamId(incoming)) return incoming;
  return existing;
}

/** Rewrite match team ids to catalog ids (bra, fra, …) so standings stay unified. */
export function canonicalizeMatchTeamIds(
  match: MergedMatch,
  teams: Record<string, Team>
): MergedMatch {
  const teamIds = canonicalizeMatchTeamIdsWithRegistry(match, teams);
  return { ...match, ...teamIds };
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
  const fixtureRegistry = buildFixtureRegistry();
  const normalized = canonicalizeMatchTeamIds(incoming, teams);
  const fixtureId = resolveFixtureRef(normalized, teams, fixtureRegistry);

  if (fixtureId) {
    if (merged[fixtureId]) {
      return { storeKey: fixtureId, mode: "id" };
    }
    for (const [key, existing] of Object.entries(merged)) {
      if (existing.matchId === fixtureId || existing.espnEventId === incoming.id) {
        return { storeKey: key, mode: "fuzzy" };
      }
    }
    return { storeKey: fixtureId, mode: "new" };
  }

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
  teams: Record<string, Team>,
  options?: { lockedMatchIds?: Record<string, true> }
): EspnMergeMode {
  const normalized = canonicalizeMatchTeamIds(incoming, teams);
  const { storeKey, mode } = resolveEspnMergeTarget(merged, normalized, teams);
  const existing = merged[storeKey];

  if (isProtectedFromEspnOverwrite(existing, options?.lockedMatchIds, storeKey)) {
    logger.debug("[PollingEngine] Skipping ESPN overwrite for protected match", "espnMatchMerge", {
      storeKey,
      incomingId: incoming.id,
      source: existing?.source,
      locked: existing?.locked,
    });
    return mode;
  }

  logger.debug(`[PollingEngine] Match linked by ${mode}`, "espnMatchMerge", {
    incomingId: incoming.id,
    storeKey,
    homeTeamId: normalized.homeTeamId,
    awayTeamId: normalized.awayTeamId
  });

  const homeTeamId = preferTeamId(existing?.homeTeamId, normalized.homeTeamId);
  const awayTeamId = preferTeamId(existing?.awayTeamId, normalized.awayTeamId);

  const applied = applyLiveScore(existing, {
    ...normalized,
    homeTeamId,
    awayTeamId,
    espnEventId: incoming.id,
  }, "espn");

  const enriched = enrichMatchWithScheduleId(applied, teams);
  const fixtureRegistry = buildFixtureRegistry();
  const resolvedFixture = resolveFixtureRef(enriched, teams, fixtureRegistry);
  const finalMatch: MergedMatch = resolvedFixture
    ? {
        ...enriched,
        id: resolvedFixture,
        matchId: resolvedFixture,
      }
    : enriched;

  merged[storeKey] = finalMatch;

  if (resolvedFixture && storeKey !== resolvedFixture) {
    delete merged[storeKey];
    merged[resolvedFixture] = finalMatch;
  }

  return mode;
}
