import type {
  FootballPredictionLeague,
  FootballPredictionMatch,
  FootballPredictionPerformance,
} from "../services/FootballPredictionClient";

export type FootballPredictionBundle = {
  fetchedAt: string;
  federations: string[];
  markets: string[];
  leagues: FootballPredictionLeague[];
  performance: FootballPredictionPerformance | null;
  /** Merged best picks from Today + Boggio + VIP tiers. */
  dailyPredictions: FootballPredictionMatch[];
  vipFeatured: FootballPredictionMatch[];
  vipScores: FootballPredictionMatch[];
  /** Raw Today API daily pool before merge. */
  todayDaily: FootballPredictionMatch[];
  /** Raw Boggio v2 daily pool before merge. */
  boggioDaily: FootballPredictionMatch[];
  unavailable: string[];
};

export type FootballPredictionCacheStore = {
  version: 1;
  lastSyncAt: string | null;
  bundle: FootballPredictionBundle | null;
};
