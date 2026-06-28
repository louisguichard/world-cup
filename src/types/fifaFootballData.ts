export type FifaFootballPlayer = {
  id?: string | number;
  name: string;
  displayName?: string;
  nationality?: string;
  position?: string;
  shirtNumber?: number | string;
  age?: number;
  teamId?: string | number;
  teamName?: string;
  photoUrl?: string;
  imageUrl?: string;
  raw?: Record<string, unknown>;
};

export type FifaFootballTeam = {
  id?: string | number;
  name: string;
  shortName?: string;
  code?: string;
  crestUrl?: string;
  imageUrl?: string;
  raw?: Record<string, unknown>;
};

export type FifaFootballMatch = {
  id?: string | number;
  stageId?: string | number;
  homeTeam?: string;
  awayTeam?: string;
  homeScore?: number;
  awayScore?: number;
  status?: string;
  kickoff?: string;
  raw?: Record<string, unknown>;
};

export type FifaMatchVideoClip = {
  id?: string | number;
  title?: string;
  url?: string;
  embedUrl?: string;
  thumbnailUrl?: string;
  type?: string;
  source?: string;
  raw?: Record<string, unknown>;
};
