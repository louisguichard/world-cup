import type { AllTimeLeader } from "../data/worldCupAllTimeLeaders";

export type WorldCupAwardEntry = {
  year: number;
  player: string;
  country: string;
  goals?: number;
  note?: string;
};

export type WorldCupWinnerEntry = {
  year: number;
  winner: string;
  runnerUp?: string;
  host?: string;
  finalScore?: string;
  thirdPlace?: string;
};

export type WorldCupTournamentDetail = {
  year: number;
  host?: string;
  winner: string;
  runnerUp?: string;
  thirdPlace?: string;
  topScorer?: WorldCupAwardEntry;
  goldenBall?: WorldCupAwardEntry;
  goldenBoot?: WorldCupAwardEntry;
  goldenGlove?: WorldCupAwardEntry;
  bestYoungPlayer?: WorldCupAwardEntry;
  teamsCount?: number;
  attendance?: number;
  raw?: Record<string, unknown>;
};

export type WorldCupHistoryBundle = {
  fetchedAt: string;
  winners: WorldCupWinnerEntry[];
  worldCups: WorldCupTournamentDetail[];
  goldenBall: WorldCupAwardEntry[];
  goldenBoot: WorldCupAwardEntry[];
  goldenGlove: WorldCupAwardEntry[];
  bestYoungPlayer: WorldCupAwardEntry[];
  /** Per-year detail fetched on demand (merged into bundle over time). */
  yearDetails: Record<string, WorldCupTournamentDetail>;
  unavailable: string[];
  partial: boolean;
};

export type WorldCupHistoryCacheStore = {
  version: 1;
  lastSyncAt: string | null;
  bundle: WorldCupHistoryBundle | null;
};

export type WorldCupHistoryStatsSnapshot = {
  titleLeaders: AllTimeLeader[];
  topScorersFromBoot: AllTimeLeader[];
  awardCounts: {
    goldenBall: number;
    goldenBoot: number;
    goldenGlove: number;
    bestYoungPlayer: number;
  };
  editions: number;
};
