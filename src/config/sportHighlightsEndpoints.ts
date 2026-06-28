/** Highlightly Football Highlights API on RapidAPI (football-highlights-api). */
export const SPORT_HIGHLIGHTS_HOST = "football-highlights-api.p.rapidapi.com";

export const HIGHLIGHTLY_WC_LEAGUE_ID = 1635;
export const HIGHLIGHTLY_WC_SEASON = 2026;

/** Soft cap — BASIC plan is ~100 requests/month. */
export const HIGHLIGHTLY_MONTHLY_REQUEST_LIMIT = 100;

function q(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const sportHighlightsEndpoints = {
  countries: () => "/countries",
  country: (countryCode: string) => `/countries/${encodeURIComponent(countryCode)}`,

  leagues: (query?: Record<string, string | number>) => `/leagues${q(query ?? {})}`,
  league: (id: number | string) => `/leagues/${encodeURIComponent(String(id))}`,

  teams: (query?: Record<string, string | number>) => `/teams${q(query ?? {})}`,
  team: (id: number | string) => `/teams/${encodeURIComponent(String(id))}`,
  teamStatistics: (teamId: number | string, query?: Record<string, string | number>) =>
    `/teams/statistics/${encodeURIComponent(String(teamId))}${q(query ?? {})}`,

  matches: (query?: Record<string, string | number>) => `/matches${q(query ?? {})}`,
  match: (id: number | string) => `/matches/${encodeURIComponent(String(id))}`,

  highlights: (query?: Record<string, string | number>) => `/highlights${q(query ?? {})}`,
  highlight: (id: number | string) => `/highlights/${encodeURIComponent(String(id))}`,
  highlightGeoRestrictions: (id: number | string) =>
    `/highlights/geo-restrictions/${encodeURIComponent(String(id))}`,

  bookmakers: (query?: Record<string, string | number>) => `/bookmakers${q(query ?? {})}`,
  bookmaker: (id: number | string) => `/bookmakers/${encodeURIComponent(String(id))}`,

  odds: (query?: Record<string, string | number>) => `/odds${q(query ?? {})}`,
  standings: (query?: Record<string, string | number>) => `/standings${q(query ?? {})}`,

  lastFiveGames: (teamId: number | string) => `/last-five-games${q({ teamId })}`,
  head2Head: (teamIdOne: number | string, teamIdTwo: number | string) =>
    `/head-2-head${q({ teamIdOne, teamIdTwo })}`,

  lineups: (matchId: number | string) => `/lineups/${encodeURIComponent(String(matchId))}`,
  statistics: (matchId: number | string) => `/statistics/${encodeURIComponent(String(matchId))}`,
  liveEvents: (matchId: number | string) => `/events/${encodeURIComponent(String(matchId))}`,
  boxScore: (matchId: number | string) => `/box-score/${encodeURIComponent(String(matchId))}`,

  players: (query?: Record<string, string | number>) => `/players${q(query ?? {})}`,
  player: (id: number | string) => `/players/${encodeURIComponent(String(id))}`,
  playerStatistics: (id: number | string, query?: Record<string, string | number>) =>
    `/players/${encodeURIComponent(String(id))}/statistics${q(query ?? {})}`,
} as const;
