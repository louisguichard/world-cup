import type { MergedMatch, Team } from "../../types";
import { sanitizeLegacyLockedFlag } from "../../lib/liveDataContract";
import { enrichMatchWithScheduleId, resolveOfficialMatchKickoff } from "../../services/ScheduleLinker";
import { buildFixtureRegistry } from "./buildFixtureRegistry";
import { dedupeLiveMatchStore } from "./dedupeLiveMatchStore";
import { resolveFixtureRef } from "./resolveFixtureRef";
import { buildTeamRegistry, canonicalizeMatchTeamIdsWithRegistry } from "./teamRegistry";

export function normalizeLiveMatchRecordWithRegistry(
  match: MergedMatch,
  teams: Record<string, Team>
): MergedMatch {
  const teamRegistry = buildTeamRegistry(teams);
  const fixtureRegistry = buildFixtureRegistry();

  const teamIds = canonicalizeMatchTeamIdsWithRegistry(match, teams, teamRegistry);
  let linked = enrichMatchWithScheduleId({ ...match, ...teamIds }, teams);

  const fixtureId = resolveFixtureRef(linked, teams, fixtureRegistry);
  if (fixtureId) {
    linked = {
      ...linked,
      id: fixtureId,
      matchId: fixtureId,
    };
  }

  return sanitizeLegacyLockedFlag({
    ...linked,
    date: resolveOfficialMatchKickoff(linked),
  });
}

export function normalizeLiveMatchStoreWithRegistry(
  matches: Record<string, MergedMatch>,
  teams: Record<string, Team>
): Record<string, MergedMatch> {
  const normalized: Record<string, MergedMatch> = {};
  for (const [key, match] of Object.entries(matches)) {
    normalized[key] = normalizeLiveMatchRecordWithRegistry(match, teams);
  }
  return dedupeLiveMatchStore(normalized, teams);
}
