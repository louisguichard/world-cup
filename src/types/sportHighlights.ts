export type HighlightlyCountry = {
  code: string;
  name: string;
  logo?: string | null;
};

export type HighlightlyTeamRef = {
  id: number;
  name: string;
  logo?: string | null;
  type?: string;
};

export type HighlightlyLeagueRef = {
  id: number;
  name: string;
  season?: number;
  logo?: string | null;
};

export type HighlightlyMatchState = {
  description?: string;
  clock?: number | null;
  score?: {
    current?: string | null;
    penalties?: string | null;
  };
};

export type HighlightlyMatch = {
  id: number;
  round?: string;
  date: string;
  country?: HighlightlyCountry;
  homeTeam: HighlightlyTeamRef;
  awayTeam: HighlightlyTeamRef;
  league?: HighlightlyLeagueRef;
  state?: HighlightlyMatchState;
};

export type HighlightlyStatEntry = {
  displayName: string;
  value: number | string;
};

export type HighlightlyTeamStats = {
  team: HighlightlyTeamRef;
  statistics: HighlightlyStatEntry[];
};

export type HighlightlyMatchEvent = {
  team?: HighlightlyTeamRef;
  time?: string;
  type?: string;
  player?: string;
  playerId?: number;
  assist?: string;
  assistingPlayerId?: number;
  substituted?: string;
};

export type HighlightlyVenue = {
  name?: string;
  city?: string;
  country?: string;
  capacity?: string | number;
};

export type HighlightlyReferee = {
  name?: string | null;
  nationality?: string | null;
};

export type HighlightlyForecast = {
  status?: string | null;
  temperature?: string | null;
};

export type HighlightlyPrediction = {
  type?: string;
  modelType?: string;
  description?: string;
  generatedAt?: string;
  probabilities?: {
    home?: string;
    draw?: string;
    away?: string;
  };
};

export type HighlightlyMatchDetail = HighlightlyMatch & {
  venue?: HighlightlyVenue;
  referee?: HighlightlyReferee;
  forecast?: HighlightlyForecast;
  events?: HighlightlyMatchEvent[];
  statistics?: HighlightlyTeamStats[];
  predictions?: {
    prematch?: HighlightlyPrediction[];
    live?: HighlightlyPrediction[];
  };
  news?: Array<{ url?: string; image?: string; title?: string; datePublished?: string }>;
};

export type HighlightlyHighlight = {
  id: number;
  type?: string;
  imgUrl?: string;
  title?: string;
  description?: string;
  url?: string;
  embedUrl?: string;
  channel?: string;
  source?: string;
  match?: HighlightlyMatch;
};

export type HighlightlyPaginated<T> = {
  data: T[];
  pagination?: {
    totalCount?: number;
    offset?: number;
    limit?: number;
  };
  plan?: {
    tier?: string;
    message?: string;
  };
};

export type HighlightlyLineupPlayer = {
  id?: number;
  name: string;
  number?: number;
  position?: string;
};

export type HighlightlyLineups = {
  homeTeam: {
    id: number;
    name: string;
    logo?: string;
    formation?: string;
    substitutes?: HighlightlyLineupPlayer[];
    initialLineup?: HighlightlyLineupPlayer[][];
  };
  awayTeam: {
    id: number;
    name: string;
    logo?: string;
    formation?: string;
    substitutes?: HighlightlyLineupPlayer[];
    initialLineup?: HighlightlyLineupPlayer[][];
  };
};

export type HighlightlyTeamSeasonStats = {
  leagueId?: number;
  leagueName?: string;
  season?: number;
  total?: HighlightlyRecordBlock;
  home?: HighlightlyRecordBlock;
  away?: HighlightlyRecordBlock;
};

type HighlightlyRecordBlock = {
  games?: { played?: number; wins?: number; loses?: number; draws?: number };
  goals?: { scored?: number; received?: number };
};

export type HighlightlyMatchIntro = {
  matchId: string;
  highlightlyMatchId: number | null;
  highlights: HighlightlyHighlight[];
  introHighlight: HighlightlyHighlight | null;
  fetchedAt: string;
  source: "football-highlights-api";
  requestsUsed: number;
  attribution: string;
  status: "available" | "empty" | "quota_exceeded" | "error";
};

export type HighlightlyMatchBundle = {
  highlightlyMatchId: number | null;
  matchDetail: HighlightlyMatchDetail | null;
  statistics: HighlightlyTeamStats[];
  highlights: HighlightlyHighlight[];
  liveEvents: HighlightlyMatchEvent[];
  lineups: HighlightlyLineups | null;
  lastFiveHome: HighlightlyMatch[];
  lastFiveAway: HighlightlyMatch[];
  head2Head: HighlightlyMatch[];
  fetchedAt: number;
  /** Static post-match intro from quota-aware sync. */
  intro?: HighlightlyMatchIntro | null;
  attribution?: string;
};
