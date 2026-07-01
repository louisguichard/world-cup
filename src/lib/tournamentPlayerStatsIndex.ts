import type { MatchEvent, MergedMatch, Team, TournamentPlayerStat } from "../types";
import { aggregateTournamentStats } from "./aggregateTournamentStats";
import { resolveEventsForMatch } from "./resolveMatchEvents";
import { bootCacheSchemaFields, matchesBootCacheSchema } from "./bootCacheSchema";
import { BOOT_CACHE_SCHEMA_VERSION } from "./bootCacheVersion";

export const TOURNAMENT_PLAYER_STATS_CACHE_KEY = `wc-tournament-player-stats-v${BOOT_CACHE_SCHEMA_VERSION}`;

export type TournamentPlayerStatsSnapshot = {
  topScorers: TournamentPlayerStat[];
  topAssists: TournamentPlayerStat[];
  rebuiltAt: string;
};

type TournamentPlayerStatsCacheStore = {
  version: typeof BOOT_CACHE_SCHEMA_VERSION;
  _schemaVersion: typeof BOOT_CACHE_SCHEMA_VERSION;
  savedAt: string;
  snapshot: TournamentPlayerStatsSnapshot;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isSnapshot(v: unknown): v is TournamentPlayerStatsSnapshot {
  if (!isRecord(v)) return false;
  return Array.isArray(v.topScorers) && Array.isArray(v.topAssists) && typeof v.rebuiltAt === "string";
}

/** Stable fingerprint — recomputes stats only when goal events change. */
export function buildTournamentStatsFingerprint(
  liveMatches: Record<string, MergedMatch>,
  matchEvents: Record<string, MatchEvent[]>
): string {
  const parts: string[] = [];

  for (const match of Object.values(liveMatches)) {
    const id = match.matchId ?? match.id;
    const events = resolveEventsForMatch(match, matchEvents);
    const goalIds = events
      .filter((event) => event.type === "goal")
      .map((event) => event.providerId)
      .sort();
    parts.push(`${id}:${goalIds.join(",")}`);
  }

  parts.sort();
  return parts.join("|");
}

/** Pure rebuild from live matches + event log. */
export function rebuildTournamentPlayerStatsIndex(
  matches: MergedMatch[],
  matchEvents: Record<string, MatchEvent[]>,
  teams?: Record<string, Team>
): TournamentPlayerStatsSnapshot {
  const { topScorers, topAssists } = aggregateTournamentStats({ matches, matchEvents, teams });
  return {
    topScorers,
    topAssists,
    rebuiltAt: new Date().toISOString(),
  };
}

export function readTournamentPlayerStatsCache(): TournamentPlayerStatsSnapshot | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(TOURNAMENT_PLAYER_STATS_CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !matchesBootCacheSchema(parsed)) {
      localStorage.removeItem(TOURNAMENT_PLAYER_STATS_CACHE_KEY);
      return null;
    }
    if (!isSnapshot(parsed.snapshot)) return null;
    return parsed.snapshot;
  } catch {
    return null;
  }
}

export function writeTournamentPlayerStatsCache(snapshot: TournamentPlayerStatsSnapshot): void {
  if (typeof localStorage === "undefined") return;
  if (snapshot.topScorers.length === 0 && snapshot.topAssists.length === 0) return;
  try {
    const store: TournamentPlayerStatsCacheStore = {
      ...bootCacheSchemaFields(),
      savedAt: new Date().toISOString(),
      snapshot,
    };
    localStorage.setItem(TOURNAMENT_PLAYER_STATS_CACHE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}

export function filterGoldenBootRace(
  topScorers: TournamentPlayerStat[],
  minGoals = 3
): TournamentPlayerStat[] {
  return topScorers.filter((stat) => stat.value >= minGoals);
}

export function selectTopScorer2026(topScorers: TournamentPlayerStat[]): TournamentPlayerStat | undefined {
  return topScorers[0];
}
