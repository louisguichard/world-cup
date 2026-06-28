import type { GroupStanding, MergedMatch, Team } from "../types";
import { mergeStandingsPartials } from "../services/adapters/normalizeStandings";
import {
  BOOT_CACHE_SCHEMA_VERSION,
  bootCacheSchemaFields,
  matchesBootCacheSchema,
} from "./bootCacheSchema";
import { BOOT_CACHE_VERSION } from "./bootCacheVersion";
import { readLiveMatchCache, writeLiveMatchCache } from "./liveMatchCache";
import { readStandingsCache, writeStandingsCache } from "./standingsCache";

export { BOOT_CACHE_SCHEMA_VERSION, BOOT_CACHE_VERSION } from "./bootCacheVersion";
export { matchesBootCacheSchema, bootCacheSchemaFields } from "./bootCacheSchema";
export { LIVE_MATCH_CACHE_KEY } from "./liveMatchCache";
export { STANDINGS_CACHE_KEY } from "./standingsCache";

export const BOOT_TEAMS_CACHE_KEY = `wc-boot-teams-v${BOOT_CACHE_VERSION}`;

const LEGACY_CACHE_KEYS = [
  "wc-boot-teams-v1",
  "wc-live-matches-v1",
  "wc-standings-v1",
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

function purgeLegacyBootCaches(): void {
  if (typeof localStorage === "undefined") return;
  for (const key of LEGACY_CACHE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

function readBootTeamsCache(): Record<string, Team> | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(BOOT_TEAMS_CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !matchesBootCacheSchema(parsed)) {
      localStorage.removeItem(BOOT_TEAMS_CACHE_KEY);
      return null;
    }
    if (!isRecord(parsed.teams)) return null;
    return parsed.teams as Record<string, Team>;
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

export function hydrateBootFromCache(): BootCacheHydration {
  purgeLegacyBootCaches();

  const teams = readBootTeamsCache() ?? {};
  const matches = readLiveMatchCache() ?? {};
  const standings = readStandingsCache() ?? [];
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
}
