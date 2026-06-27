/** RapidAPI SofaScore6 hub — verified path map (2026-06-27). */

export const SOFASCORE6_HOST = "sofascore6.p.rapidapi.com";
export const SOFASCORE6_API_PREFIX = "/api/sofascore/v1";

export const SOFA_FOOTBALL_SPORT_SLUG = "football";
export const SOFA_WC_UNIQUE_TOURNAMENT_ID = 16;
export const SOFA_WC_SEASON_ID = 58210;

function q(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") sp.set(key, String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const sofascore6Endpoints = {
  general: {
    sports: `${SOFASCORE6_API_PREFIX}/general/sports`,
    oddsProviders: `${SOFASCORE6_API_PREFIX}/general/odds-providers`,
  },
  search: {
    all: (query: string) => `${SOFASCORE6_API_PREFIX}/search/all${q({ q: query })}`,
    teams: (query: string) => `${SOFASCORE6_API_PREFIX}/search/teams${q({ q: query })}`,
    players: (query: string) => `${SOFASCORE6_API_PREFIX}/search/players${q({ q: query })}`,
    matches: (query: string) => `${SOFASCORE6_API_PREFIX}/search/matches${q({ q: query })}`,
    managers: (query: string) => `${SOFASCORE6_API_PREFIX}/search/managers${q({ q: query })}`,
    referees: (query: string) => `${SOFASCORE6_API_PREFIX}/search/referees${q({ q: query })}`,
    venues: (query: string) => `${SOFASCORE6_API_PREFIX}/search/venues${q({ q: query })}`,
    uniqueTournaments: (query: string) =>
      `${SOFASCORE6_API_PREFIX}/search/unique-tournaments${q({ q: query })}`,
  },
  match: {
    live: (sportSlug = SOFA_FOOTBALL_SPORT_SLUG) =>
      `${SOFASCORE6_API_PREFIX}/match/live${q({ sport_slug: sportSlug })}`,
    matchesByDate: (date: string, sportSlug = SOFA_FOOTBALL_SPORT_SLUG) =>
      `${SOFASCORE6_API_PREFIX}/match/matches-by-date${q({ date, sport_slug: sportSlug })}`,
    details: (matchId: number | string) =>
      `${SOFASCORE6_API_PREFIX}/match/details${q({ match_id: matchId })}`,
    statistics: (matchId: number | string) =>
      `${SOFASCORE6_API_PREFIX}/match/statistics${q({ match_id: matchId })}`,
    odds: (matchId: number | string) =>
      `${SOFASCORE6_API_PREFIX}/match/odds${q({ match_id: matchId })}`,
    lineups: (matchId: number | string) =>
      `${SOFASCORE6_API_PREFIX}/match/lineups${q({ match_id: matchId })}`,
    votes: (matchId: number | string) =>
      `${SOFASCORE6_API_PREFIX}/match/votes${q({ match_id: matchId })}`,
    comments: (matchId: number | string) =>
      `${SOFASCORE6_API_PREFIX}/match/comments${q({ match_id: matchId })}`,
    incidents: (matchId: number | string) =>
      `${SOFASCORE6_API_PREFIX}/match/incidents${q({ match_id: matchId })}`,
    pointByPoint: (matchId: number | string) =>
      `${SOFASCORE6_API_PREFIX}/match/point-by-point${q({ match_id: matchId })}`,
    bestPlayers: (matchId: number | string) =>
      `${SOFASCORE6_API_PREFIX}/match/best-players${q({ match_id: matchId })}`,
    officialTweets: (matchId: number | string) =>
      `${SOFASCORE6_API_PREFIX}/match/official-tweets${q({ match_id: matchId })}`,
    managers: (matchId: number | string) =>
      `${SOFASCORE6_API_PREFIX}/match/managers${q({ match_id: matchId })}`,
    pregameForm: (matchId: number | string) =>
      `${SOFASCORE6_API_PREFIX}/match/pregame-form${q({ match_id: matchId })}`,
    shotmap: (matchId: number | string) =>
      `${SOFASCORE6_API_PREFIX}/match/shotmap${q({ match_id: matchId })}`,
    playerAveragePositions: (matchId: number | string) =>
      `${SOFASCORE6_API_PREFIX}/match/player-average-positions${q({ match_id: matchId })}`,
    highlights: (matchId: number | string) =>
      `${SOFASCORE6_API_PREFIX}/match/highlights${q({ match_id: matchId })}`,
  },
  category: {
    allCategories: `${SOFASCORE6_API_PREFIX}/category/all-categories`,
    categoryUniqueTournaments: (categoryId: number | string) =>
      `${SOFASCORE6_API_PREFIX}/category/category-unique-tournaments${q({ category_id: categoryId })}`,
  },
  historicalData: {
    scheduledUtForDate: (date: string, uniqueTournamentId = SOFA_WC_UNIQUE_TOURNAMENT_ID) =>
      `${SOFASCORE6_API_PREFIX}/historical-data/scheduled-ut-for-a-specific-date${q({
        date,
        unique_tournament_id: uniqueTournamentId,
      })}`,
    scheduledMatchesForUt: (
      uniqueTournamentId: number | string,
      seasonId: number | string
    ) =>
      `${SOFASCORE6_API_PREFIX}/historical-data/scheduled-matches-for-a-ut${q({
        unique_tournament_id: uniqueTournamentId,
        season_id: seasonId,
      })}`,
  },
  uniqueTournament: {
    details: (uniqueTournamentId: number | string) =>
      `${SOFASCORE6_API_PREFIX}/unique-tournament/details${q({ unique_tournament_id: uniqueTournamentId })}`,
    seasons: (uniqueTournamentId: number | string) =>
      `${SOFASCORE6_API_PREFIX}/unique-tournament/seasons${q({ unique_tournament_id: uniqueTournamentId })}`,
    seasonDetails: (uniqueTournamentId: number | string, seasonId: number | string) =>
      `${SOFASCORE6_API_PREFIX}/unique-tournament/season-details${q({
        unique_tournament_id: uniqueTournamentId,
        season_id: seasonId,
      })}`,
    seasonTopPlayers: (uniqueTournamentId: number | string, seasonId: number | string) =>
      `${SOFASCORE6_API_PREFIX}/unique-tournament/season-top-players${q({
        unique_tournament_id: uniqueTournamentId,
        season_id: seasonId,
      })}`,
    seasonRounds: (uniqueTournamentId: number | string, seasonId: number | string) =>
      `${SOFASCORE6_API_PREFIX}/unique-tournament/season-rounds${q({
        unique_tournament_id: uniqueTournamentId,
        season_id: seasonId,
      })}`,
    seasonTopTeams: (uniqueTournamentId: number | string, seasonId: number | string) =>
      `${SOFASCORE6_API_PREFIX}/unique-tournament/season-top-teams${q({
        unique_tournament_id: uniqueTournamentId,
        season_id: seasonId,
      })}`,
    seasonRoundMatches: (
      uniqueTournamentId: number | string,
      seasonId: number | string,
      roundId: number | string
    ) =>
      `${SOFASCORE6_API_PREFIX}/unique-tournament/season-round-matches${q({
        unique_tournament_id: uniqueTournamentId,
        season_id: seasonId,
        round_id: roundId,
      })}`,
    seasonStandings: (uniqueTournamentId: number | string, seasonId: number | string) =>
      `${SOFASCORE6_API_PREFIX}/unique-tournament/season-standings${q({
        unique_tournament_id: uniqueTournamentId,
        season_id: seasonId,
      })}`,
    seasonCupTrees: (uniqueTournamentId: number | string, seasonId: number | string) =>
      `${SOFASCORE6_API_PREFIX}/unique-tournament/season-cup-trees${q({
        unique_tournament_id: uniqueTournamentId,
        season_id: seasonId,
      })}`,
  },
  team: {
    details: (teamId: number | string) =>
      `${SOFASCORE6_API_PREFIX}/team/details${q({ team_id: teamId })}`,
    statistics: (
      teamId: number | string,
      uniqueTournamentId: number | string,
      seasonId: number | string
    ) =>
      `${SOFASCORE6_API_PREFIX}/team/statistics${q({
        team_id: teamId,
        unique_tournament_id: uniqueTournamentId,
        season_id: seasonId,
      })}`,
    topPlayers: (
      teamId: number | string,
      uniqueTournamentId: number | string,
      seasonId: number | string
    ) =>
      `${SOFASCORE6_API_PREFIX}/team/top-players${q({
        team_id: teamId,
        unique_tournament_id: uniqueTournamentId,
        season_id: seasonId,
      })}`,
    players: (teamId: number | string) =>
      `${SOFASCORE6_API_PREFIX}/team/players${q({ team_id: teamId })}`,
    mediaVideos: (teamId: number | string) =>
      `${SOFASCORE6_API_PREFIX}/team/media-videos${q({ team_id: teamId })}`,
  },
  player: {
    details: (playerId: number | string) =>
      `${SOFASCORE6_API_PREFIX}/player/details${q({ player_id: playerId })}`,
    transferHistory: (playerId: number | string) =>
      `${SOFASCORE6_API_PREFIX}/player/transfer-history${q({ player_id: playerId })}`,
    statisticsSeasons: (playerId: number | string) =>
      `${SOFASCORE6_API_PREFIX}/player/statistics-seasons${q({ player_id: playerId })}`,
    statistics: (
      playerId: number | string,
      uniqueTournamentId: number | string,
      seasonId: number | string
    ) =>
      `${SOFASCORE6_API_PREFIX}/player/statistics${q({
        player_id: playerId,
        unique_tournament_id: uniqueTournamentId,
        season_id: seasonId,
      })}`,
  },
} as const;
