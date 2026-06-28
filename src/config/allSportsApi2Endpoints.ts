/** AllSportsAPI2 on RapidAPI — SofaScore-style multi-sport data hub. */
export const ALL_SPORTS_API2_HOST = "allsportsapi2.p.rapidapi.com";

/** Soccer / football slug for `/api/{sport}/…` routes. */
export const ALL_SPORTS_FOOTBALL_SPORT = "football";

/** FIFA World Cup unique tournament id on AllSportsAPI2 / SofaScore. */
export const ALL_SPORTS_WC_UNIQUE_TOURNAMENT_ID = 16;

export const ALL_SPORTS_API2_SPORT_ROOTS = [
  "american-football",
  "baseball",
  "basketball",
  "calendar",
  "category",
  "countries",
  "country",
  "cricket",
  "cycling",
  "esport",
  "football",
  "handball",
  "ice-hockey",
  "img",
  "manager",
  "match",
  "matches",
  "mma",
  "motorsport",
  "placeholder",
  "placeholders",
  "player",
  "rankings",
  "referee",
  "rugby",
  "scheduled-tournaments",
  "search",
  "table-tennis",
  "team",
  "tennis",
  "tournament",
  "tv",
  "venue",
  "volleyball",
] as const;

export type AllSportsApi2SportRoot = (typeof ALL_SPORTS_API2_SPORT_ROOTS)[number];

function q(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/** Substitute `{param}` placeholders in a route template. */
export function resolveAllSportsApi2Route(
  template: string,
  params: Record<string, string | number> = {}
): string {
  return template.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const val = params[key];
    if (val === undefined || val === null) {
      throw new Error(`Missing route param "${key}" for ${template}`);
    }
    return encodeURIComponent(String(val));
  });
}

export const allSportsApi2Endpoints = {
  /** GET /api/search/all?query=… */
  searchAll: (query: string) => `/api/search/all${q({ query })}`,
  searchTeams: (query: string) => `/api/search/teams${q({ query })}`,
  searchPlayers: (query: string) => `/api/search/players${q({ query })}`,
  searchMatches: (query: string) => `/api/search/matches${q({ query })}`,

  tennis: {
    rankings: (type: string) => `/api/tennis/rankings/${encodeURIComponent(type)}`,
    rankingsLive: (type: string) => `/api/tennis/rankings/${encodeURIComponent(type)}/live`,
    event: (id: number | string, segment4: string) =>
      `/api/tennis/event/${encodeURIComponent(String(id))}/${encodeURIComponent(segment4)}`,
    playerRankings: (playerId: number | string) =>
      `/api/tennis/player/${encodeURIComponent(String(playerId))}/rankings`,
    venue: (id: number | string) => `/api/tennis/venue/${encodeURIComponent(String(id))}`,
  },

  football: {
    eventsLive: () => `/api/${ALL_SPORTS_FOOTBALL_SPORT}/events/live`,
    eventsByDate: (day: number | string, month: number | string, year: number | string) =>
      `/api/${ALL_SPORTS_FOOTBALL_SPORT}/events/${day}/${month}/${year}`,
    event: (id: number | string) =>
      `/api/${ALL_SPORTS_FOOTBALL_SPORT}/event/${encodeURIComponent(String(id))}`,
    eventH2H: (customId: string) =>
      `/api/${ALL_SPORTS_FOOTBALL_SPORT}/event/${encodeURIComponent(customId)}/h2h`,
    tournament: (tournamentId: number | string) =>
      `/api/${ALL_SPORTS_FOOTBALL_SPORT}/tournament/${encodeURIComponent(String(tournamentId))}`,
    tournamentSeasonGroups: (tournamentId: number | string, seasonId: number | string) =>
      `/api/${ALL_SPORTS_FOOTBALL_SPORT}/tournament/${tournamentId}/season/${seasonId}/groups`,
    tournamentSeasonStandingsTotal: (tournamentId: number | string, seasonId: number | string) =>
      `/api/${ALL_SPORTS_FOOTBALL_SPORT}/tournament/${tournamentId}/season/${seasonId}/standings/total`,
    uniqueTournament: (tournamentId: number | string) =>
      `/api/${ALL_SPORTS_FOOTBALL_SPORT}/unique-tournament/${encodeURIComponent(String(tournamentId))}`,
    team: (id: number | string) => `/api/${ALL_SPORTS_FOOTBALL_SPORT}/team/${encodeURIComponent(String(id))}`,
    scheduledTournaments: (day: number | string, month: number | string, year: number | string, page = 0) =>
      `/api/${ALL_SPORTS_FOOTBALL_SPORT}/scheduled-tournaments/${day}/${month}/${year}/page/${page}`,
  },

  basketball: {
    tournamentAll: () => "/api/basketball/tournament/all",
    match: (id: number | string, segment4: string) =>
      `/api/basketball/match/${encodeURIComponent(String(id))}/${encodeURIComponent(segment4)}`,
  },

  /** Generic `/api/{sport}/…` builder for any documented route template. */
  sportRoute: (sport: string, template: string, params: Record<string, string | number> = {}) =>
    resolveAllSportsApi2Route(`/api/${sport}${template.startsWith("/") ? template : `/${template}`}`, params),
} as const;
