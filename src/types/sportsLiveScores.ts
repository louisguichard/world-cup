export type SportsLiveScoresRankingRow = Record<string, unknown>;

export type SportsLiveScoresRankingsResponse = {
  league_id?: string | number;
  rankings?: SportsLiveScoresRankingRow[];
};

export type SportsLiveScoresOddsResponse = Record<string, unknown>;

export type SportsLiveScoresLiveResponse = Record<string, unknown>;

export type SportsLiveScoresMatchBundleResponse = {
  "Match Id"?: string | number;
  statistics?: SportsLiveScoresRankingRow[];
  lineups?: unknown;
  [key: string]: unknown;
};
