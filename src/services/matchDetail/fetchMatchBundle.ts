import type { Lineup, MatchEvent, MatchStatisticsBundle, MergedMatch } from "../../types";
import type { WcCommentaryEntry } from "../WorldCup2026LiveClient";
import { fetchCommentary, fetchLineups, fetchStats } from "../WorldCup2026LiveClient";
import { TtlCache } from "../cache/TtlCache";
import { mapWcLineups } from "./mapWcLineups";
import { mapWcStats } from "./mapWcStats";

const TTL_LIVE_MS = 30_000; // 30 seconds for live matches
const TTL_FINISHED_MS = 5 * 60_000; // 5 minutes for finished matches

export type MatchBundle = {
  match: MergedMatch;
  statistics: MatchStatisticsBundle | null;
  lineups: Lineup[];
  commentary: WcCommentaryEntry[];
  events: MatchEvent[];
  fetchedAt: number;
};

const bundleCache = new TtlCache<string, MatchBundle>();

function getTtl(match: MergedMatch): number {
  return match.status === "live" ? TTL_LIVE_MS : TTL_FINISHED_MS;
}

export async function fetchMatchBundle(
  match: MergedMatch,
  wcMatchId: string | null,
  forceRefresh = false
): Promise<MatchBundle> {
  const cacheKey = `bundle-${match.id}-${wcMatchId ?? "noid"}`;

  if (!forceRefresh) {
    const cached = bundleCache.get(cacheKey);
    if (cached) return cached;
  }

  // Fetch all available data in parallel
  const [rawStats, rawLineups, rawCommentary] = await Promise.all([
    wcMatchId ? fetchStats(wcMatchId) : Promise.resolve(null),
    wcMatchId ? fetchLineups(wcMatchId) : Promise.resolve(null),
    wcMatchId ? fetchCommentary(wcMatchId) : Promise.resolve([])
  ]);

  const statistics = rawStats
    ? mapWcStats(match.id, rawStats)
    : null;

  const lineups = mapWcLineups(rawLineups);

  const bundle: MatchBundle = {
    match,
    statistics,
    lineups,
    commentary: rawCommentary ?? [],
    events: [], // populated separately via incident mapping
    fetchedAt: Date.now()
  };

  bundleCache.set(cacheKey, bundle, getTtl(match));
  return bundle;
}

export function invalidateMatchBundle(matchId: string, wcMatchId: string | null): void {
  bundleCache.delete(`bundle-${matchId}-${wcMatchId ?? "noid"}`);
}
