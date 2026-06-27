export const WC2026_HOST = "world-cup-2026.p.rapidapi.com";

export const wc2026Endpoints = {
  teams: () => "/world-cup-2026/teams",
  team: (teamId: string) => `/world-cup-2026/teams/${encodeURIComponent(teamId)}`,
  /** Filtered roster fetch — preferred for production UI. */
  playersByTeam: (teamId: string) =>
    `/world-cup-2026/players?teamId=${encodeURIComponent(teamId)}`,
  /** Unfiltered list — avoid on splash / production UI paths. */
  players: () => "/world-cup-2026/players",
  groups: () => "/world-cup-2026/groups",
} as const;
