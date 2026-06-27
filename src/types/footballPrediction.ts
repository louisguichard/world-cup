import type {
  FootballPredictionLeague,
  FootballPredictionMatch,
  FootballPredictionPerformance,
} from "../services/FootballPredictionClient";

export type FootballPredictionBundle = {
  fetchedAt: string;
  leagues: FootballPredictionLeague[];
  performance: FootballPredictionPerformance | null;
  dailyPredictions: FootballPredictionMatch[];
  vipFeatured: FootballPredictionMatch[];
  vipScores: FootballPredictionMatch[];
  unavailable: string[];
};

export type FootballPredictionCacheStore = {
  version: 1;
  lastSyncAt: string | null;
  bundle: FootballPredictionBundle | null;
};
