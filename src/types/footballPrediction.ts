import type {
  FootballPredictionLeague,
  FootballPredictionMatch,
  FootballPredictionPerformance,
} from "../services/FootballPredictionClient";

export type FootballPredictionBundle = {
  fetchedAt: string;
  federations: string[];
  markets: string[];
  countries: string[];
  leagues: FootballPredictionLeague[];
  /** Resolved World Cup competition from list-leagues when available. */
  worldCupLeague: FootballPredictionLeague | null;
  performance: FootballPredictionPerformance | null;
  dailyPredictions: FootballPredictionMatch[];
  /** Pre-linked schedule match id → Boggio prediction (built during sync). */
  predictionByMatchId: Record<string, FootballPredictionMatch>;
  /** v1-only — always empty on Boggio v2 API. */
  vipFeatured: FootballPredictionMatch[];
  /** v1-only — always empty on Boggio v2 API. */
  vipScores: FootballPredictionMatch[];
  unavailable: string[];
};

export type FootballPredictionCacheStore = {
  version: 1;
  lastSyncAt: string | null;
  bundle: FootballPredictionBundle | null;
};
