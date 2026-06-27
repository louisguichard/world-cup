export type PlDataPlayer = {
  id?: string | number;
  name: string;
  displayName?: string;
  position?: string;
  positionInfo?: string;
  shirtNumber?: number | string;
  age?: number;
  dateOfBirth?: string;
  nationality?: string;
  country?: string;
  currentClub?: string;
  team?: string;
  teamName?: string;
  photoUrl?: string;
  image?: string;
  goals?: number;
  assists?: number;
  appearances?: number;
  minutesPlayed?: number;
  height?: number;
  weight?: number;
  raw?: Record<string, unknown>;
};

export type PlDataTeam = {
  id?: string | number;
  name: string;
  shortName?: string;
  code?: string;
  crestUrl?: string;
  logo?: string;
  stadium?: string;
  manager?: string;
  founded?: number;
  raw?: Record<string, unknown>;
};

export type PlDataMatch = {
  id?: string | number;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status?: string;
  kickoff?: string;
  matchweek?: number;
  raw?: Record<string, unknown>;
};

export type PlDataStandingRow = {
  position: number;
  team: string;
  played?: number;
  won?: number;
  drawn?: number;
  lost?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  goalDifference?: number;
  points?: number;
  raw?: Record<string, unknown>;
};

export type PlDataTopScorer = {
  rank?: number;
  player: string;
  team?: string;
  goals?: number;
  assists?: number;
  raw?: Record<string, unknown>;
};

export type PlDataNewsItem = {
  title: string;
  url?: string;
  publishedAt?: string;
  summary?: string;
  raw?: Record<string, unknown>;
};

export type PlDataTransfer = {
  player: string;
  fromTeam?: string;
  toTeam?: string;
  fee?: string;
  date?: string;
  raw?: Record<string, unknown>;
};
