export type PaninarrStickerCategory =
  | "player"
  | "manager"
  | "stadium"
  | "hostCity"
  | "legend"
  | "trophy";

export type PaninarrImageAsset = {
  imageUrl: string;
  credit?: string;
  licenseShortName?: string;
  cropPosition?: string;
  source?: string;
};

export type PaninarrPlayerRecord = PaninarrImageAsset & {
  teamId: string;
  displayName: string;
  normalizedName: string;
  squadIndex: number;
  category: "player";
};

export type PaninarrManagerRecord = PaninarrImageAsset & {
  teamId: string;
  displayName: string;
  normalizedName: string;
  category: "manager";
};

export type PaninarrVenueRecord = PaninarrImageAsset & {
  slug: string;
  name: string;
  category: "stadium" | "hostCity";
};

export type PaninarrLegendRecord = PaninarrImageAsset & {
  legendId: string;
  name: string;
  country: string;
  category: "legend";
};

export type PaninarrTrophyId = "world-cup" | "golden-ball" | "golden-boot" | "golden-glove";

export type PaninarrTrophyRecord = PaninarrImageAsset & {
  trophyId: PaninarrTrophyId;
  name: string;
  category: "trophy";
};

export type PaninarrCatalog = {
  version: number;
  syncedAt: string;
  source: string;
  players: PaninarrPlayerRecord[];
  managers: PaninarrManagerRecord[];
  stadiums: PaninarrVenueRecord[];
  hostCities: PaninarrVenueRecord[];
  legends: PaninarrLegendRecord[];
  trophies: PaninarrTrophyRecord[];
};

export type PaninarrSearchEntry = {
  id: string;
  type: PaninarrStickerCategory;
  label: string;
  teamId?: string;
  imageUrl?: string;
  tokens: string[];
};

export type PaninarrSearchResult = {
  id: string;
  type: PaninarrStickerCategory;
  label: string;
  teamId?: string;
  imageUrl?: string;
};
