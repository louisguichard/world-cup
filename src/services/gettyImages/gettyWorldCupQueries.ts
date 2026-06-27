import type { ResolvedVenue } from "../../lib/venue/types";

/** Editorial search phrases tuned for FIFA World Cup 2026 coverage. */
export const gettyWorldCupQueries = {
  tournament: () => "FIFA World Cup 2026",
  hostCity: (city: string) => `FIFA World Cup 2026 ${city} host city`,
  venue: (venue: Pick<ResolvedVenue, "stadiumName" | "hostCity" | "fifaOfficialName">) =>
    `FIFA World Cup 2026 ${venue.stadiumName} ${venue.hostCity}`,
  stadium: (stadiumName: string, city?: string) =>
    city ? `FIFA World Cup ${stadiumName} ${city}` : `FIFA World Cup ${stadiumName}`,
  matchFixture: (homeTeam: string, awayTeam: string) =>
    `FIFA World Cup ${homeTeam} vs ${awayTeam} soccer`,
  team: (teamName: string) => `FIFA World Cup 2026 ${teamName} national team`,
  player: (playerName: string) => `${playerName} FIFA World Cup soccer player`,
  goalCelebration: (playerName: string, teamName?: string) =>
    teamName
      ? `${playerName} ${teamName} FIFA World Cup goal`
      : `${playerName} FIFA World Cup goal celebration`,
  events: (phrase?: string) =>
    phrase ? `FIFA World Cup 2026 ${phrase}` : "FIFA World Cup 2026",
} as const;
