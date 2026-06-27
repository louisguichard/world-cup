export const ZAFRONIX_HOST = "zafronix-fifa-world-cup-api.p.rapidapi.com";

/** Root-relative paths on the Zafronix RapidAPI hub (no /fifa/worldcup/v1 prefix). */
export const zafronixEndpoints = {
  health: () => "/health",
  meta: () => "/",
  listTournaments: () => "/tournaments",
  tournament: (year: number | string) => `/tournaments/${year}`,
  teams: () => "/teams",
  team: (name: string) => `/teams/${encodeURIComponent(name)}`,
  teamRoster: (name: string, year = 2026) =>
    `/teams/${encodeURIComponent(name)}/roster?year=${year}`,
  matches: (query?: Record<string, string | number>) => {
    if (!query || Object.keys(query).length === 0) return "/matches";
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      params.set(key, String(value));
    }
    return `/matches?${params.toString()}`;
  },
  matchesLive: () => "/matches/live",
  match: (matchId: string) => `/matches/${encodeURIComponent(matchId)}`,
  matchHistory: (matchId: string) => `/matches/${encodeURIComponent(matchId)}/history`,
  matchResult: (matchId: string) => `/matches/${encodeURIComponent(matchId)}/result`,
  matchPostpone: (matchId: string) => `/matches/${encodeURIComponent(matchId)}/postpone`,
  bracket: (year = 2026) => `/bracket?year=${year}`,
  standings: (year = 2026) => `/standings?year=${year}`,
  players: (query?: Record<string, string | number>) => {
    if (!query || Object.keys(query).length === 0) return "/players";
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      params.set(key, String(value));
    }
    return `/players?${params.toString()}`;
  },
  player: (name: string) => `/players/${encodeURIComponent(name)}`,
  stadiums: () => "/stadiums",
  stadium: (id: string) => `/stadiums/${encodeURIComponent(id)}`,
  compare: (query: Record<string, string>) => {
    const params = new URLSearchParams(query);
    return `/compare?${params.toString()}`;
  },
  trivia: () => "/trivia",
  aggregatesPlayers: () => "/aggregates/players",
  aggregatesChampions: () => "/aggregates/champions",
  search: (query: string) => `/search?q=${encodeURIComponent(query)}`,
  usage: () => "/me/usage",
  sandbox: () => "/sandbox",
} as const;
