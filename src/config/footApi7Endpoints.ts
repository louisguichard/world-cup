/**
 * RapidAPI FootAPI7 — SofaScore-style football API.
 * @see https://rapidapi.com/fluis.lacasse/api/footapi7
 */

export const FOOTAPI7_HOST = "footapi7.p.rapidapi.com";
export const FOOTAPI7_API_PREFIX = "/api";

/** FIFA World Cup — tournament/season ids from FootAPI7. */
export const FOOTAPI7_WC_TOURNAMENT_ID = 17;
export const FOOTAPI7_WC_SEASON_ID = 76986;

function q(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") sp.set(key, String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const footApi7Endpoints = {
  search: (query: string) => `${FOOTAPI7_API_PREFIX}/search${q({ q: query })}`,
  leagues: () => `${FOOTAPI7_API_PREFIX}/leagues`,

  tournaments: {
    seasons: (tournamentId: number | string) =>
      `${FOOTAPI7_API_PREFIX}/tournaments/${tournamentId}/seasons`,
  },

  tournament: {
    seasonInfo: (tournamentId: number | string, seasonId: number | string) =>
      `${FOOTAPI7_API_PREFIX}/tournament/${tournamentId}/season/${seasonId}/info`,
    groups: (tournamentId: number | string, seasonId: number | string) =>
      `${FOOTAPI7_API_PREFIX}/tournament/${tournamentId}/season/${seasonId}/groups`,
    standings: (
      tournamentId: number | string,
      seasonId: number | string,
      type: "total" | "home" | "away" = "total"
    ) =>
      `${FOOTAPI7_API_PREFIX}/tournament/${tournamentId}/season/${seasonId}/standings${type === "total" ? "" : `/${type}`}`,
    teams: (tournamentId: number | string, seasonId: number | string) =>
      `${FOOTAPI7_API_PREFIX}/tournament/${tournamentId}/season/${seasonId}/teams`,
    rounds: (tournamentId: number | string, seasonId: number | string) =>
      `${FOOTAPI7_API_PREFIX}/tournament/${tournamentId}/season/${seasonId}/rounds`,
    eventsByRound: (
      tournamentId: number | string,
      seasonId: number | string,
      round: number | string
    ) =>
      `${FOOTAPI7_API_PREFIX}/tournament/${tournamentId}/season/${seasonId}/events/round/${round}`,
    eventsLast: (
      tournamentId: number | string,
      seasonId: number | string,
      page = 0
    ) =>
      `${FOOTAPI7_API_PREFIX}/tournament/${tournamentId}/season/${seasonId}/events/last/${page}`,
    eventsNext: (
      tournamentId: number | string,
      seasonId: number | string,
      page = 0
    ) =>
      `${FOOTAPI7_API_PREFIX}/tournament/${tournamentId}/season/${seasonId}/events/next/${page}`,
    knockout: (tournamentId: number | string, seasonId: number | string) =>
      `${FOOTAPI7_API_PREFIX}/tournament/${tournamentId}/season/${seasonId}/knockout`,
  },

  matches: {
    byDate: (date: string) => `${FOOTAPI7_API_PREFIX}/matches/${date}`,
    live: () => `${FOOTAPI7_API_PREFIX}/matches/live`,
  },

  match: {
    detail: (matchId: number | string) => `${FOOTAPI7_API_PREFIX}/match/${matchId}`,
    incidents: (matchId: number | string) => `${FOOTAPI7_API_PREFIX}/match/${matchId}/incidents`,
    lineups: (matchId: number | string) => `${FOOTAPI7_API_PREFIX}/match/${matchId}/lineups`,
    statistics: (matchId: number | string) =>
      `${FOOTAPI7_API_PREFIX}/match/${matchId}/statistics`,
  },

  event: {
    detail: (eventId: number | string) => `${FOOTAPI7_API_PREFIX}/event/${eventId}`,
    incidents: (eventId: number | string) =>
      `${FOOTAPI7_API_PREFIX}/event/${eventId}/incidents`,
    lineups: (eventId: number | string) => `${FOOTAPI7_API_PREFIX}/event/${eventId}/lineups`,
    statistics: (eventId: number | string) =>
      `${FOOTAPI7_API_PREFIX}/event/${eventId}/statistics`,
  },

  team: {
    detail: (teamId: number | string) => `${FOOTAPI7_API_PREFIX}/team/${teamId}`,
    players: (teamId: number | string) => `${FOOTAPI7_API_PREFIX}/team/${teamId}/players`,
  },

  player: {
    detail: (playerId: number | string) => `${FOOTAPI7_API_PREFIX}/player/${playerId}`,
  },
} as const;
