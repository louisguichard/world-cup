/** RapidAPI sofascore.p.rapidapi.com — path map (verified 2026-06-27). */

export const SOFASCORE_RAPID_HOST = "sofascore.p.rapidapi.com";

export const SOFA_RAPID_WC_TOURNAMENT_ID = 16;
export const SOFA_RAPID_WC_SEASON_ID = 58210;
export const SOFA_RAPID_FOOTBALL_SPORT_ID = 1;

function q(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") sp.set(key, String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const sofascoreRapidEndpoints = {
  sports: {
    list: () => "/sports/list",
  },
  categories: {
    list: (sportId = SOFA_RAPID_FOOTBALL_SPORT_ID) => `/categories/list${q({ sportId })}`,
    listLive: (sportId = SOFA_RAPID_FOOTBALL_SPORT_ID) => `/categories/list-live${q({ sportId })}`,
  },
  search: {
    query: (query: string, type?: string) => `/search${q({ q: query, type })}`,
  },
  teams: {
    detail: (teamId: number | string) => `/teams/detail${q({ teamId })}`,
    logo: (teamId: number | string) => `/teams/get-logo${q({ teamId })}`,
    squad: (teamId: number | string) => `/teams/get-squad${q({ teamId })}`,
    statistics: (
      teamId: number | string,
      tournamentId = SOFA_RAPID_WC_TOURNAMENT_ID,
      seasonId = SOFA_RAPID_WC_SEASON_ID
    ) => `/teams/get-statistics${q({ teamId, tournamentId, seasonId })}`,
    transfers: (teamId: number | string) => `/teams/get-transfers${q({ teamId })}`,
    rankings: (teamId: number | string) => `/teams/get-rankings${q({ teamId })}`,
    performance: (teamId: number | string) => `/teams/get-performance${q({ teamId })}`,
    tournaments: (teamId: number | string) => `/teams/get-tournaments${q({ teamId })}`,
    nearEvents: (teamId: number | string) => `/teams/get-near-events${q({ teamId })}`,
    statisticsSeasons: (teamId: number | string) =>
      `/teams/get-statistics-seasons${q({ teamId })}`,
    ranks: (teamId: number | string) => `/teams/get-ranks${q({ teamId })}`,
    lastMatches: (teamId: number | string, page = 0) =>
      `/teams/get-last-matches${q({ teamId, page })}`,
    nextMatches: (teamId: number | string, page = 0) =>
      `/teams/get-next-matches${q({ teamId, page })}`,
  },
  tournaments: {
    detail: (tournamentId = SOFA_RAPID_WC_TOURNAMENT_ID) =>
      `/tournaments/detail${q({ tournamentId })}`,
    logo: (tournamentId: number | string) => `/tournaments/get-logo${q({ tournamentId })}`,
    seasons: (tournamentId = SOFA_RAPID_WC_TOURNAMENT_ID) =>
      `/tournaments/get-seasons${q({ tournamentId })}`,
    standings: (
      tournamentId = SOFA_RAPID_WC_TOURNAMENT_ID,
      seasonId = SOFA_RAPID_WC_SEASON_ID
    ) => `/tournaments/get-standings${q({ tournamentId, seasonId })}`,
    topPlayers: (
      tournamentId = SOFA_RAPID_WC_TOURNAMENT_ID,
      seasonId = SOFA_RAPID_WC_SEASON_ID
    ) => `/tournaments/get-top-players${q({ tournamentId, seasonId })}`,
    topTeams: (
      tournamentId = SOFA_RAPID_WC_TOURNAMENT_ID,
      seasonId = SOFA_RAPID_WC_SEASON_ID
    ) => `/tournaments/get-top-teams${q({ tournamentId, seasonId })}`,
    cupTrees: (
      tournamentId = SOFA_RAPID_WC_TOURNAMENT_ID,
      seasonId = SOFA_RAPID_WC_SEASON_ID
    ) => `/tournaments/get-cuptrees${q({ tournamentId, seasonId })}`,
    scheduledEvents: (tournamentId: number | string, seasonId: number | string, date: string) =>
      `/tournaments/get-scheduled-events${q({ tournamentId, seasonId, date })}`,
    liveEvents: (tournamentId: number | string, seasonId: number | string) =>
      `/tournaments/get-live-events${q({ tournamentId, seasonId })}`,
    rounds: (tournamentId: number | string, seasonId: number | string) =>
      `/tournaments/get-rounds${q({ tournamentId, seasonId })}`,
    media: (tournamentId: number | string, seasonId: number | string) =>
      `/tournaments/get-media${q({ tournamentId, seasonId })}`,
  },
  matches: {
    detail: (matchId: number | string) => `/matches/detail${q({ matchId })}`,
    h2h: (matchId: number | string) => `/matches/get-h2h${q({ matchId })}`,
    h2hEvents: (matchId: number | string) => `/matches/get-h2h-events${q({ matchId })}`,
    statistics: (matchId: number | string) => `/matches/get-statistics${q({ matchId })}`,
    lineups: (matchId: number | string) => `/matches/get-lineups${q({ matchId })}`,
    incidents: (matchId: number | string) => `/matches/get-incidents${q({ matchId })}`,
    comments: (matchId: number | string) => `/matches/get-comments${q({ matchId })}`,
    bestPlayers: (matchId: number | string) => `/matches/get-best-players${q({ matchId })}`,
    featuredOdds: (matchId: number | string) => `/matches/get-featured-odds${q({ matchId })}`,
    allOdds: (matchId: number | string) => `/matches/get-all-odds${q({ matchId })}`,
    aiInsights: (matchId: number | string) => `/matches/get-ai-insights${q({ matchId })}`,
    tweets: (matchId: number | string) => `/matches/get-tweets${q({ matchId })}`,
    teamStreaks: (matchId: number | string) => `/matches/get-team-streaks${q({ matchId })}`,
  },
  players: {
    detail: (playerId: number | string) => `/players/detail${q({ playerId })}`,
  },
  tvChannels: {
    list: (eventId: number | string) => `/tvchannels/list${q({ eventId })}`,
    availableCountries: () => "/tvchannels/get-available-countries",
  },
} as const;
