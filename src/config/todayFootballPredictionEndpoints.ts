/**
 * RapidAPI Today Football Prediction — verified paths.
 * @see https://rapidapi.com/casedoweb-sXAtnI-JXY/api/today-football-prediction
 */

export const TODAY_FOOTBALL_PREDICTION_HOST = "today-football-prediction.p.rapidapi.com";

function q(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") sp.set(key, String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** Today API market codes (1X2 = match result). */
export type TodayFootballPredictionMarket = "1X2" | "OU25" | "bts";

export const TODAY_FOOTBALL_PREDICTION_MARKETS: TodayFootballPredictionMarket[] = [
  "1X2",
  "OU25",
  "bts",
];

export const todayFootballPredictionEndpoints = {
  leagues: () => "/leagues/",

  performanceStats: () => "/stats/performance",

  dailyPredictions: (opts?: {
    page?: number;
    date?: string;
    market?: TodayFootballPredictionMarket;
    league?: string;
  }) =>
    `/predictions/list${q({
      page: opts?.page ?? 1,
      date: opts?.date,
      market: opts?.market,
      league: opts?.league,
    })}`,

  /** PRO+ on paid plans — curated high-confidence picks. */
  vipFeatured: (page = 1) => `/predictions/featured${q({ page })}`,

  /** PRO+ on paid plans — score-line predictions. */
  vipScores: (page = 1) => `/predictions/scores${q({ page })}`,

  predictionDetails: (id: string | number) => `/predictions/${id}`,
} as const;
