import type { GroupStanding } from "../types";
import { mergeStandingsPartials } from "../services/adapters/normalizeStandings";
import { bootCacheSchemaFields, matchesBootCacheSchema } from "./bootCacheSchema";
import { BOOT_CACHE_SCHEMA_VERSION, BOOT_CACHE_VERSION } from "./bootCacheVersion";

export const STANDINGS_CACHE_KEY = `wc-standings-v${BOOT_CACHE_VERSION}`;

type StandingsCacheStore = {
  version: typeof BOOT_CACHE_VERSION;
  _schemaVersion: typeof BOOT_CACHE_SCHEMA_VERSION;
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
    if (!isRecord(parsed) || !matchesBootCacheSchema(parsed)) {
      localStorage.removeItem(STANDINGS_CACHE_KEY);
      return null;
    }
    if (!Array.isArray(parsed.standings)) return null;
    return parsed.standings as GroupStanding[];
  } catch {
    return null;
  }
}

export function writeStandingsCache(standings: GroupStanding[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    const merged = mergeStandingsPartials(readStandingsCache() ?? [], standings);
    const store: StandingsCacheStore = {
      ...bootCacheSchemaFields(),
      savedAt: new Date().toISOString(),
      standings: merged,
    };
    localStorage.setItem(STANDINGS_CACHE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}
