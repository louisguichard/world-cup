/** FIFA Football Player/Team/Stats/Records/Matches API on RapidAPI (Creativesdev). */
export const FIFA_FOOTBALL_DATA_HOST =
  "fifa-football-player-team-stats-records-matches-api-data.p.rapidapi.com";

/** Default WC 2026 stage id from RapidAPI playground samples. */
export const FIFA_WC2026_STAGE_ID = 285063;

function q(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const fifaFootballDataEndpoints = {
  singleMatchVideo: (stage: string | number, id: string | number) =>
    `/fifa-single-match-video/v1/data${q({ stage, id })}`,
  singleMatch: (stage: string | number, id: string | number) =>
    `/fifa-single-match/v1/data${q({ stage, id })}`,
  matchEvents: (stage: string | number, id: string | number) =>
    `/fifa-match-events/v1/data${q({ stage, id })}`,
  matchStats: (stage: string | number, id: string | number) =>
    `/fifa-match-stats/v1/data${q({ stage, id })}`,
  lineups: (stage: string | number, id: string | number) =>
    `/fifa-lineups/v1/data${q({ stage, id })}`,

  teamMatchList: (id: string | number) => `/fifa-team-matchlist/v1/data${q({ id })}`,
  matchList: (stage: string | number) => `/fifa-match-list/v1/data${q({ stage })}`,
  matchesList: (stage: string | number) => `/fifa-matches-list/v1/data${q({ stage })}`,
  stageMatchList: (stage: string | number) => `/fifa-stage-matchlist/v1/data${q({ stage })}`,
  tournamentMatchList: (stage: string | number) =>
    `/fifa-tournament-matchlist/v1/data${q({ stage })}`,
  worldCupMatchList: (stage: string | number) =>
    `/fifa-worldcup-matchlist/v1/data${q({ stage })}`,

  playerList: () => "/fifa-player-list/v1/data",
  playersList: () => "/fifa-players-list/v1/data",
  allPlayers: () => "/fifa-all-players/v1/data",
  playerDetail: (id: string | number) => `/fifa-player-detail/v1/data${q({ id })}`,
  playerDetails: (id: string | number) => `/fifa-player-details/v1/data${q({ id })}`,
  playerImage: (id: string | number) => `/fifa-player-image/v1/data${q({ id })}`,
  playerStats: (id: string | number) => `/fifa-player-stats/v1/data${q({ id })}`,
  playerStatistics: (id: string | number) => `/fifa-player-statistics/v1/data${q({ id })}`,
  playerRecords: (id: string | number) => `/fifa-player-records/v1/data${q({ id })}`,

  teamList: () => "/fifa-team-list/v1/data",
  teamsList: () => "/fifa-teams-list/v1/data",
  allTeams: () => "/fifa-all-teams/v1/data",
  teamDetail: (id: string | number) => `/fifa-team-detail/v1/data${q({ id })}`,
  teamDetails: (id: string | number) => `/fifa-team-details/v1/data${q({ id })}`,
  teamImage: (id: string | number) => `/fifa-team-image/v1/data${q({ id })}`,
  teamStats: (id: string | number) => `/fifa-team-stats/v1/data${q({ id })}`,
  teamStatistics: (id: string | number) => `/fifa-team-statistics/v1/data${q({ id })}`,
  teamRecords: (id: string | number) => `/fifa-team-records/v1/data${q({ id })}`,
} as const;

/** Root path prefixes accepted by the edge proxy allowlist. */
export const FIFA_FOOTBALL_DATA_ALLOWED_PREFIXES = ["/fifa-"] as const;

export function isFifaFootballDataPathAllowed(path: string): boolean {
  return FIFA_FOOTBALL_DATA_ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
}
