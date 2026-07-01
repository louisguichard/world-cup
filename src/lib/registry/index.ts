export type {
  CanonicalMatchId,
  CanonicalTeamId,
  FixtureRegistry,
  FixtureRegistryEntry,
  TeamAliasKind,
  TeamRegistry,
} from "./types";

export { buildFixtureRegistry } from "./buildFixtureRegistry";
export { isOfficialMatchId } from "./isOfficialMatchId";
export {
  buildTeamRegistry,
  canonicalizeMatchTeamIdsWithRegistry,
  resolveTeamRef,
} from "./teamRegistry";
export { resolveFixtureRef, lookupLiveMatch } from "./resolveFixtureRef";
export { dedupeLiveMatchStore } from "./dedupeLiveMatchStore";
export {
  normalizeLiveMatchRecordWithRegistry,
  normalizeLiveMatchStoreWithRegistry,
} from "./normalizeWithRegistry";

import { buildFixtureRegistry } from "./buildFixtureRegistry";

let cachedFixtureRegistry = buildFixtureRegistry();

/** Refresh fixture index (tests only — schedule is static in production). */
export function resetFixtureRegistryForTests(): void {
  cachedFixtureRegistry = buildFixtureRegistry();
}

export function getFixtureRegistry() {
  return cachedFixtureRegistry;
}
