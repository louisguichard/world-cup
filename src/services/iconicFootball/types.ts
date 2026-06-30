export type IconicFootballClub = {
  id: number;
  name: string;
  logo: string;
};

export type IconicFootballCountry = {
  id: number;
  name: string;
  logo: string;
};

export type IconicFootballPlayer = {
  id: number;
  known_as: string;
  full_name: string;
  img: string;
  prime_season: string;
  prime_position: string;
  preferred_foot: string;
  spd: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
  prime_rating: number;
  club_id?: number;
  country_id?: number;
  club?: IconicFootballClub;
  country?: IconicFootballCountry;
};

export type IconicFootballListMeta = {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
};

export type IconicFootballListResponse = {
  data: IconicFootballPlayer[];
  meta: IconicFootballListMeta;
};

export type IconicPlayerCareer = {
  player: IconicFootballPlayer;
  source: "iconicfootball";
};

export type IconicPlayerRef = {
  id: string;
  displayName: string;
  headshotUrl: string;
  primeRating: number;
  primePosition: string;
  primeSeason: string;
  clubName?: string;
  countryName?: string;
};
