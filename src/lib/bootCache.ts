import type { GroupStanding, MergedMatch, Team } from "../types";
import { mergeStandingsPartials } from "../services/adapters/normalizeStandings";
import {
  BOOT_CACHE_SCHEMA_VERSION,
  bootCacheSchemaFields,
  matchesBootCacheSchema,
} from "./bootCacheSchema";
import { BOOT_CACHE_VERSION } from "./bootCacheVersion";
import {
  LIVE_MATCH_CACHE_KEY,
  readLiveMatchCache,
  writeLiveMatchCache,
} from "./liveMatchCache";
import {
  STANDINGS_CACHE_KEY,
  readStandingsCache,
  writeStandingsCache,
} from "./standingsCache";

export { BOOT_CACHE_SCHEMA_VERSION, BOOT_CACHE_VERSION } from "./bootCacheVersion";
export { matchesBootCacheSchema, bootCacheSchemaFields } from "./bootCacheSchema";
export { LIVE_MATCH_CACHE_KEY } from "./liveMatchCache";
export { STANDINGS_CACHE_KEY } from "./standingsCache";

export const BOOT_TEAMS_CACHE_KEY = `wc-boot-teams-v${BOOT_CACHE_VERSION}`;

const LEGACY_TEAMS_KEYS = ["wc-boot-teams-v3", "wc-boot-teams-v2", "wc-boot-teams-v1"] as const;
const LEGACY_MATCH_KEYS = ["wc-live-matches-v3", "wc-live-matches-v2", "wc-live-matches-v1"] as const;
const LEGACY_STANDINGS_KEYS = ["wc-standings-v3", "wc-standings-v2", "wc-standings-v1"] as const;

const ALL_LEGACY_KEYS = [
  ...LEGACY_TEAMS_KEYS,
  ...LEGACY_MATCH_KEYS,
  ...LEGACY_STANDINGS_KEYS,
] as const;

type BootTeamsCacheStore = {
  version: typeof BOOT_CACHE_VERSION;
  _schemaVersion: typeof BOOT_CACHE_SCHEMA_VERSION;
  savedAt: string;
  teams: Record<string, Team>;
};

export type BootCacheHydration = {
  teams: Record<string, Team>;
  matches: Record<string, MergedMatch>;
  standings: GroupStanding[];
  hadCache: boolean;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function removeLegacyKeys(keys: readonly string[]): void {
  if (typeof localStorage === "undefined") return;
  for (const key of keys) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

function readLegacyPayload<T>(
  keys: readonly string[],
  field: string
): T | null {
  if (typeof localStorage === "undefined") return null;
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed)) continue;
      if (field in parsed && parsed[field] != null) {
        return parsed[field] as T;
      }
    } catch {
      /* try next legacy key */
    }
  }
  return null;
}

function readBootTeamsCache(): Record<string, Team> | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(BOOT_TEAMS_CACHE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isRecord(parsed) && matchesBootCacheSchema(parsed) && isRecord(parsed.teams)) {
        return parsed.teams as Record<string, Team>;
      }
      localStorage.removeItem(BOOT_TEAMS_CACHE_KEY);
    }

    const legacyTeams = readLegacyPayload<Record<string, Team>>(LEGACY_TEAMS_KEYS, "teams");
    if (legacyTeams && Object.keys(legacyTeams).length > 0) {
      writeBootTeamsCache(legacyTeams);
      removeLegacyKeys(LEGACY_TEAMS_KEYS);
      return legacyTeams;
    }
    return null;
  } catch {
    return null;
  }
}

function writeBootTeamsCache(teams: Record<string, Team>): void {
  if (typeof localStorage === "undefined") return;
  try {
    const store: BootTeamsCacheStore = {
      ...bootCacheSchemaFields(),
      savedAt: new Date().toISOString(),
      teams,
    };
    localStorage.setItem(BOOT_TEAMS_CACHE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}

function hydrateMatchesFromCache(): Record<string, MergedMatch> {
  const current = readLiveMatchCache();
  if (current && Object.keys(current).length > 0) return current;

  const legacyMatches = readLegacyPayload<Record<string, MergedMatch>>(LEGACY_MATCH_KEYS, "matches");
  if (legacyMatches && Object.keys(legacyMatches).length > 0) {
    writeLiveMatchCache(legacyMatches);
    removeLegacyKeys(LEGACY_MATCH_KEYS);
    return legacyMatches;
  }
  return {};
}

function hydrateStandingsFromCache(): GroupStanding[] {
  const current = readStandingsCache();
  if (current && current.length > 0) return current;

  const legacyStandings = readLegacyPayload<GroupStanding[]>(LEGACY_STANDINGS_KEYS, "standings");
  if (legacyStandings && legacyStandings.length > 0) {
    writeStandingsCache(legacyStandings);
    removeLegacyKeys(LEGACY_STANDINGS_KEYS);
    return legacyStandings;
  }
  return [];
}

/** Drop orphaned legacy keys once current-version caches are populated. */
function pruneUnmigratedLegacyKeys(): void {
  if (typeof localStorage === "undefined") return;
  const hasCurrent =
    localStorage.getItem(BOOT_TEAMS_CACHE_KEY) ||
    localStorage.getItem(LIVE_MATCH_CACHE_KEY) ||
    localStorage.getItem(STANDINGS_CACHE_KEY);
  if (!hasCurrent) return;
  removeLegacyKeys(ALL_LEGACY_KEYS);
}

export function hydrateBootFromCache(): BootCacheHydration {
  const teams = readBootTeamsCache() ?? {};
  const matches = hydrateMatchesFromCache();
  const standings = hydrateStandingsFromCache();
  pruneUnmigratedLegacyKeys();

  const hadCache =
    Object.keys(teams).length > 0 ||
    Object.keys(matches).length > 0 ||
    standings.length > 0;

  return { teams, matches, standings, hadCache };
}

export function persistBootCache(
  teams: Record<string, Team>,
  matches: Record<string, MergedMatch>,
  standings: GroupStanding[]
): void {
  if (Object.keys(teams).length > 0) {
    writeBootTeamsCache(teams);
  }
  if (Object.keys(matches).length > 0) {
    writeLiveMatchCache(matches);
  }
  if (standings.length > 0) {
    const merged = mergeStandingsPartials(readStandingsCache() ?? [], standings);
    writeStandingsCache(merged);
  }
  pruneUnmigratedLegacyKeys();
}
