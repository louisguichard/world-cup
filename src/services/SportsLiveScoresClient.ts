import { isApiEnabled } from "../config/apiFlags";
import { rapidApiHeaders, providerByHost } from "../config/rapidApiCatalog";
import {
  SLS_FIFA_RANKINGS_LEAGUE_ID,
  SPORTS_LIVE_SCORES_HOST,
  sportsLiveScoresEndpoints,
} from "../config/sportsLiveScoresEndpoints";
import type { FifaRanking } from "../lib/ratings";
import type {
  SportsLiveScoresLiveResponse,
  SportsLiveScoresMatchBundleResponse,
  SportsLiveScoresOddsResponse,
  SportsLiveScoresRankingsResponse,
} from "../types/sportsLiveScores";
import { normalizeSportsLiveScoresRankings } from "./normalizeSportsLiveScoresRankings";
import { logger } from "./Logger";

const RAPIDAPI_HOST = providerByHost(SPORTS_LIVE_SCORES_HOST)?.host ?? SPORTS_LIVE_SCORES_HOST;

const FIFA_RANKINGS_LEAGUE_IDS = [SLS_FIFA_RANKINGS_LEAGUE_ID, "FIFA", "1"] as const;

let sessionDisabled = false;

export function isSportsLiveScoresDisabled(): boolean {
  return sessionDisabled || !isApiEnabled("sportsLiveScores");
}

function baseUrl(): string {
  if (typeof window === "undefined") return `https://${RAPIDAPI_HOST}`;
  return "/api/sports-live-scores";
}

function headers(): HeadersInit {
  return rapidApiHeaders(RAPIDAPI_HOST);
}

async function fetchJson<T>(path: string): Promise<T | null> {
  if (isSportsLiveScoresDisabled()) return null;
  try {
    const res = await fetch(`${baseUrl()}${path}`, { headers: headers() });
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      sessionDisabled = true;
      logger.warn("SportsLiveScores", `Blocked ${res.status} on ${path}`);
      return null;
    }
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    logger.warn("SportsLiveScores", `Fetch failed ${path}: ${String(err)}`);
    return null;
  }
}

/** Odds by Match ID — returns null when unavailable or quota-blocked. */
export async function fetchSportsLiveScoresOdds(
  matchId: string | number
): Promise<SportsLiveScoresOddsResponse | null> {
  return fetchJson<SportsLiveScoresOddsResponse>(sportsLiveScoresEndpoints.oddsByMatchId(matchId));
}

/** Football live scoreboard. */
export async function fetchSportsLiveScoresFootballLive(): Promise<SportsLiveScoresLiveResponse | null> {
  return fetchJson<SportsLiveScoresLiveResponse>(sportsLiveScoresEndpoints.footballLive());
}

/** Football league standings / rankings for a league id. */
export async function fetchSportsLiveScoresFootballRankings(
  leagueId: string | number = SLS_FIFA_RANKINGS_LEAGUE_ID
): Promise<SportsLiveScoresRankingsResponse | null> {
  return fetchJson<SportsLiveScoresRankingsResponse>(
    sportsLiveScoresEndpoints.footballRankings(leagueId)
  );
}

/** Match lineups (and bundled statistics when upstream provides them). */
export async function fetchSportsLiveScoresFootballMatchLineups(
  matchId: string | number
): Promise<SportsLiveScoresMatchBundleResponse | null> {
  return fetchJson<SportsLiveScoresMatchBundleResponse>(
    sportsLiveScoresEndpoints.footballMatchLineups(matchId)
  );
}

/** Generic sport live feed (`tennis`, `basketball`, …). */
export async function fetchSportsLiveScoresSportLive(
  sport: string
): Promise<SportsLiveScoresLiveResponse | null> {
  return fetchJson<SportsLiveScoresLiveResponse>(sportsLiveScoresEndpoints.sportLive(sport));
}

/**
 * Bootstrap FIFA rankings via Sports Live Scores `Football League Rankings`.
 * Tries `fifa` then a small set of alternate league ids.
 */
export async function fetchSportsLiveScoresFifaRankings(): Promise<Record<string, FifaRanking>> {
  for (const leagueId of FIFA_RANKINGS_LEAGUE_IDS) {
    const raw = await fetchSportsLiveScoresFootballRankings(leagueId);
    const parsed = normalizeSportsLiveScoresRankings(raw);
    if (Object.keys(parsed).length > 0) {
      logger.info(
        `Loaded ${Object.keys(parsed).length} FIFA rankings via league ${leagueId}`,
        "SportsLiveScores"
      );
      return parsed;
    }
  }
  return {};
}
