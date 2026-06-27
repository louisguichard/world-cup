/** PLData — Premier League data API on RapidAPI. */
export const PLDATA_HOST = "pldata.p.rapidapi.com";

function q(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

function enc(value: string | number): string {
  return encodeURIComponent(String(value));
}

export const pldataEndpoints = {
  player: (name: string) => `/player/${enc(name)}`,
  players: (query?: Record<string, string | number>) => `/players${q(query ?? {})}`,

  team: (name: string) => `/team/${enc(name)}`,
  teams: (query?: Record<string, string | number>) => `/teams${q(query ?? {})}`,

  club: (name: string) => `/club/${enc(name)}`,
  clubs: (query?: Record<string, string | number>) => `/clubs${q(query ?? {})}`,

  squad: (name: string) => `/squad/${enc(name)}`,
  squadByTeam: (name: string) => `/squad/team/${enc(name)}`,

  manager: (name: string) => `/manager/${enc(name)}`,
  coach: (name: string) => `/coach/${enc(name)}`,

  match: (id: string | number) => `/match/${enc(id)}`,
  matches: (query?: Record<string, string | number>) => `/matches${q(query ?? {})}`,

  fixture: (id: string | number) => `/fixture/${enc(id)}`,
  fixtures: (query?: Record<string, string | number>) => `/fixtures${q(query ?? {})}`,

  standings: (query?: Record<string, string | number>) => `/standings${q(query ?? {})}`,
  table: (query?: Record<string, string | number>) => `/table${q(query ?? {})}`,

  league: (query?: Record<string, string | number>) => `/league${q(query ?? {})}`,
  leagues: (query?: Record<string, string | number>) => `/leagues${q(query ?? {})}`,

  season: (year: string | number) => `/season/${enc(year)}`,
  seasons: (query?: Record<string, string | number>) => `/seasons${q(query ?? {})}`,

  stats: (query?: Record<string, string | number>) => `/stats${q(query ?? {})}`,
  statsTopScorers: (query?: Record<string, string | number>) =>
    `/stats/topscorers${q(query ?? {})}`,

  topscorers: (query?: Record<string, string | number>) => `/topscorers${q(query ?? {})}`,

  search: (query: string) => `/search/${enc(query)}`,

  news: (query?: Record<string, string | number>) => `/news${q(query ?? {})}`,
  transfers: (query?: Record<string, string | number>) => `/transfers${q(query ?? {})}`,
} as const;

/** Root path prefixes accepted by the edge proxy allowlist. */
export const PLDATA_ALLOWED_PREFIXES = [
  "/player/",
  "/players",
  "/team/",
  "/teams",
  "/club/",
  "/clubs",
  "/squad/",
  "/manager/",
  "/coach/",
  "/match/",
  "/matches",
  "/fixture/",
  "/fixtures",
  "/standings",
  "/table",
  "/league",
  "/leagues",
  "/season/",
  "/seasons",
  "/stats",
  "/topscorers",
  "/search/",
  "/news",
  "/transfers",
] as const;

export function isPlDataPathAllowed(path: string): boolean {
  return PLDATA_ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix));
}
