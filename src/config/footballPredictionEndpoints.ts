/**
 * RapidAPI Football Prediction API (Boggio Analytics) — v2 paths.
 * @see https://developer.boggio-analytics.com/getting-started/api-endpoints
 */

export const FOOTBALL_PREDICTION_HOST = "football-prediction-api.p.rapidapi.com";
export const FOOTBALL_PREDICTION_API_PREFIX = "/api/v2";

function q(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") sp.set(key, String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** v2 market ids (classic = 1X2). */
export type FootballPredictionMarket =
  | "classic"
  | "over_25"
  | "over_35"
  | "btts"
  | "home_over_05"
  | "home_over_15"
  | "away_over_05"
  | "away_over_15";

export const FOOTBALL_PREDICTION_MARKETS: FootballPredictionMarket[] = [
  "classic",
  "over_25",
  "over_35",
  "btts",
  "home_over_05",
  "home_over_15",
  "away_over_05",
  "away_over_15",
];

/** FIFA World Cup federations — use when prefetching international fixtures. */
export const FOOTBALL_PREDICTION_FEDERATIONS = [
  "UEFA",
  "CONMEBOL",
  "CONCACAF",
  "CAF",
  "AFC",
  "OFC",
] as const;

export type FootballPredictionFederation = (typeof FOOTBALL_PREDICTION_FEDERATIONS)[number];

export const footballPredictionEndpoints = {
  /** Upcoming + historical predictions list. */
  predictions: (opts?: {
    iso_date?: string;
    federation?: string;
    market?: FootballPredictionMarket;
    league?: string;
    season?: string;
    page?: number;
  }) =>
    `${FOOTBALL_PREDICTION_API_PREFIX}/predictions${q({
      iso_date: opts?.iso_date,
      federation: opts?.federation,
      market: opts?.market ?? "classic",
      league: opts?.league,
      season: opts?.season,
      page: opts?.page,
    })}`,

  /** All markets for one fixture id. */
  predictionById: (id: string | number) => `${FOOTBALL_PREDICTION_API_PREFIX}/predictions/${id}`,

  /** Tipster accuracy — last day / 7 / 14 / 30 days. */
  performanceStats: (opts?: { federation?: string; market?: FootballPredictionMarket }) =>
    `${FOOTBALL_PREDICTION_API_PREFIX}/performance-stats${q({
      federation: opts?.federation,
      market: opts?.market ?? "classic",
    })}`,

  listFederations: () => `${FOOTBALL_PREDICTION_API_PREFIX}/list-federations`,
  listMarkets: () => `${FOOTBALL_PREDICTION_API_PREFIX}/list-markets`,
  listCountries: () => `${FOOTBALL_PREDICTION_API_PREFIX}/list-countries`,

  listLeagues: (opts?: { federation?: string; country?: string }) =>
    `${FOOTBALL_PREDICTION_API_PREFIX}/list-leagues${q({
      federation: opts?.federation,
      country: opts?.country,
    })}`,

  listSeasons: (opts?: { league?: string }) =>
    `${FOOTBALL_PREDICTION_API_PREFIX}/list-seasons${q({ league: opts?.league })}`,

  listTeams: (opts?: { league?: string; season?: string }) =>
    `${FOOTBALL_PREDICTION_API_PREFIX}/list-teams${q({
      league: opts?.league,
      season: opts?.season,
    })}`,

  fixtureIds: (opts?: { iso_date?: string; federation?: string; market?: FootballPredictionMarket }) =>
    `${FOOTBALL_PREDICTION_API_PREFIX}/get-list-of-fixture-ids${q({
      iso_date: opts?.iso_date,
      federation: opts?.federation,
      market: opts?.market ?? "classic",
    })}`,

  headToHead: (id: string | number) => `${FOOTBALL_PREDICTION_API_PREFIX}/head-to-head/${id}`,
  homeLeagueStats: (id: string | number) =>
    `${FOOTBALL_PREDICTION_API_PREFIX}/home-league-stats/${id}`,
  awayLeagueStats: (id: string | number) =>
    `${FOOTBALL_PREDICTION_API_PREFIX}/away-league-stats/${id}`,
  homeLast10: (id: string | number) => `${FOOTBALL_PREDICTION_API_PREFIX}/home-last-10/${id}`,
  awayLast10: (id: string | number) => `${FOOTBALL_PREDICTION_API_PREFIX}/away-last-10/${id}`,

  /** Connectivity check. */
  connectionTest: () => `${FOOTBALL_PREDICTION_API_PREFIX}/test`,
} as const;

/** League name hints for World Cup discovery via list-leagues. */
export const FOOTBALL_PREDICTION_WC_LEAGUE_HINTS = [
  "world cup",
  "fifa world cup",
  "wc 2026",
] as const;
