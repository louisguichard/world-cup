import type { TournamentPlayerStat } from "../../types";
import type { WcStanding } from "../WorldCup2026LiveClient";
import { fetchStandings } from "../WorldCup2026LiveClient";
import { TtlCache } from "../cache/TtlCache";

const TTL_MS = 5 * 60_000; // 5 minutes

export type TournamentStatsBundle = {
  standings: WcStanding[];
  topScorers: TournamentPlayerStat[];
  topAssists: TournamentPlayerStat[];
  cleanSheets: TournamentPlayerStat[];
  fetchedAt: number;
};

const statsCache = new TtlCache<"tournament-stats", TournamentStatsBundle>();

export async function fetchTournamentStats(forceRefresh = false): Promise<TournamentStatsBundle> {
  if (!forceRefresh) {
    const cached = statsCache.get("tournament-stats");
    if (cached) return cached;
  }

  const standings = await fetchStandings();

  // Top scorers, assists, clean sheets not yet available via WC Live API.
  // Return empty arrays as typed placeholders until a provider endpoint exists.
  const bundle: TournamentStatsBundle = {
    standings,
    topScorers: [],
    topAssists: [],
    cleanSheets: [],
    fetchedAt: Date.now()
  };

  statsCache.set("tournament-stats", bundle, TTL_MS);
  return bundle;
}
