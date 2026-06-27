/** Cached SofaScore team profile — refreshed at most once per day. */

export type SofaTeamPlayer = {
  id: number;
  name: string;
  shortName?: string;
  position?: string;
  jerseyNumber?: string;
  shirtNumber?: number;
  imagePath?: string;
  clubName?: string;
  marketValue?: { value: number; currency: string };
};

export type SofaTeamStatistics = {
  goalsScored?: number;
  goalsConceded?: number;
  assists?: number;
  shots?: number;
  shotsOnTarget?: number;
  averageBallPossession?: number;
  cleanSheets?: number;
  yellowCards?: number;
  redCards?: number;
  avgRating?: number;
  corners?: number;
  bigChances?: number;
  successfulDribbles?: number;
  accuratePassesPercentage?: number;
};

export type SofaTeamMedia = {
  id: number;
  title: string;
  description?: string;
  thumbnailUrl?: string;
};

export type SofaTeamDetails = {
  id: number;
  name: string;
  shortName?: string;
  nameCode?: string;
  imagePath?: string;
  managerName?: string;
  ranking?: number;
  userCount?: number;
  fifaRanking?: number;
};

export type SofaTeamMatchSummary = {
  id: number;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  tournament?: string;
  status?: string;
};

export type TeamProfileBundle = {
  abbrev: string;
  sofaTeamId: number;
  fetchedAt: string;
  details: SofaTeamDetails | null;
  players: SofaTeamPlayer[];
  statistics: SofaTeamStatistics | null;
  media: SofaTeamMedia[];
  lastMatches: SofaTeamMatchSummary[];
  nextMatches: SofaTeamMatchSummary[];
  tournamentNames: string[];
  /** Endpoints not available on subscribed hub — recorded for diagnostics. */
  unavailable: string[];
  source: "sofascore-rapid" | "sofascore6";
};

export type TeamProfileCacheStore = {
  version: 2;
  lastGlobalSyncAt: string | null;
  profiles: Record<string, TeamProfileBundle>;
};

export type TournamentProfileBundle = {
  fetchedAt: string;
  uniqueTournamentId: number;
  name?: string;
  slug?: string;
  imagePath?: string;
  seasons: Array<{ id: number; name: string; year: string }>;
  standingsGroups: Array<{ id: number; name: string; rows: Array<{ teamName: string; position: number; points: number }> }>;
  topPlayers: Array<{ name: string; team: string; rating: number }>;
  topTeams: Array<{ name: string; rating: number }>;
  cupTreeNames: string[];
};
