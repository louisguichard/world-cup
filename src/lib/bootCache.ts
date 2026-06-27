import type { GroupStanding, MergedMatch, Team } from "../types";
import { readLiveMatchCache, writeLiveMatchCache } from "./liveMatchCache";
import { readStandingsCache, writeStandingsCache } from "./standingsCache";

export const BOOT_TEAMS_CACHE_KEY = "wc-boot-teams-v1";

type BootTeamsCacheStore = {
  version: 1;
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

function readBootTeamsCache(): Record<string, Team> | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(BOOT_TEAMS_CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1) return null;
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
      version: 1,
      savedAt: new Date().toISOString(),
      teams,
    };
    localStorage.setItem(BOOT_TEAMS_CACHE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}

export function hydrateBootFromCache(): BootCacheHydration {
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
    writeStandingsCache(standings);
  }
}
