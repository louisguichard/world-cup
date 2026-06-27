import type { GroupStanding } from "../types";

export const STANDINGS_CACHE_KEY = "wc-standings-v1";

type StandingsCacheStore = {
  version: 1;
  savedAt: string;
  standings: GroupStanding[];
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function readStandingsCache(): GroupStanding[] | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STANDINGS_CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1) return null;
    if (!Array.isArray(parsed.standings)) return null;
    return parsed.standings as GroupStanding[];
  } catch {
    return null;
  }
}

export function writeStandingsCache(standings: GroupStanding[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    const store: StandingsCacheStore = {
      version: 1,
      savedAt: new Date().toISOString(),
      standings,
    };
    localStorage.setItem(STANDINGS_CACHE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}
