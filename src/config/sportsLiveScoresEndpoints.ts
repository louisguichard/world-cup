/** Sports Live Scores API on RapidAPI. */
export const SPORTS_LIVE_SCORES_HOST = "sports-live-scores.p.rapidapi.com";

/** Playground league id for FIFA men's rankings (`Football League Rankings`). */
export const SLS_FIFA_RANKINGS_LEAGUE_ID = "fifa";

export const sportsLiveScoresEndpoints = {
  /** Odds by Match ID */
  oddsByMatchId: (matchId: string | number) => `/get_odds/${matchId}`,
  /** Football Live Matches */
  footballLive: () => "/football/live",
  /** Football League Rankings — league id e.g. `fifa`, `39` (EPL) */
  footballRankings: (leagueId: string | number) => `/football/rankings/${leagueId}`,
  /**
   * Football Match Lineups (playground also lists Match Statistics; only this path exists upstream).
   * Response may include a `statistics` array when stats are bundled.
   */
  footballMatchLineups: (matchId: string | number) => `/football/match_lineups/${matchId}`,
  /** Generic `{sport}/live` for tennis, basketball, etc. */
  sportLive: (sport: string) => `/${sport}/live`,
} as const;
