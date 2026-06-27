export type AllSportsApi2Route = {
  method: string;
  name: string;
  route: string;
};

export type AllSportsApi2TennisRankingEntry = {
  id?: number;
  ranking?: number;
  points?: number;
  player?: {
    id?: number;
    name?: string;
    shortName?: string;
    country?: { name?: string; alpha2?: string };
  };
  team?: {
    id?: number;
    name?: string;
    shortName?: string;
    country?: { name?: string; alpha2?: string };
  };
};

export type AllSportsApi2TennisRankings = {
  type: string;
  rankings: AllSportsApi2TennisRankingEntry[];
  fetchedAt: number;
  attribution: string;
  upstreamError?: string;
};

export type AllSportsApi2FootballEvent = {
  id?: number;
  customId?: string;
  status?: { type?: string; description?: string };
  homeTeam?: { id?: number; name?: string; shortName?: string };
  awayTeam?: { id?: number; name?: string; shortName?: string };
  homeScore?: { current?: number; display?: number };
  awayScore?: { current?: number; display?: number };
  startTimestamp?: number;
  tournament?: { name?: string; uniqueTournament?: { id?: number; name?: string } };
};

export type AllSportsApi2FetchMeta = {
  path: string;
  fetchedAt: number;
  attribution: string;
};
