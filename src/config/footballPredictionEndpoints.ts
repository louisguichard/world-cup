/** RapidAPI Today Football Prediction — verified paths (2026-06-27). */

export const FOOTBALL_PREDICTION_HOST = "today-football-prediction.p.rapidapi.com";
export const FOOTBALL_PREDICTION_PREFIX = "";

function q(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") sp.set(key, String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export type FootballPredictionMarket = "1X2" | "OU25" | "bts";

export const footballPredictionEndpoints = {
  leagues: () => "/leagues/",
  performanceStats: () => "/stats/performance",
  dailyPredictions: (opts?: {
    page?: number;
    date?: string;
    market?: FootballPredictionMarket;
    league?: string;
  }) =>
    `/predictions/list${q({
      page: opts?.page ?? 1,
      date: opts?.date,
      market: opts?.market,
      league: opts?.league,
    })}`,
  /** PRO+ only on BASIC plan returns 401 */
  vipFeatured: (page = 1) => `/predictions/featured${q({ page })}`,
  /** PRO+ only on BASIC plan returns 401 */
  vipScores: (page = 1) => `/predictions/scores${q({ page })}`,
} as const;
