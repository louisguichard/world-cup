export type GettyDisplaySize = {
  name?: string;
  uri?: string;
  isWatermarked?: boolean;
};

export type GettyImageAsset = {
  id?: string | number;
  title?: string;
  caption?: string;
  artist?: string;
  collectionName?: string;
  displayUrl?: string;
  displaySizes?: GettyDisplaySize[];
  thumbUrl?: string;
  previewUrl?: string;
  raw?: Record<string, unknown>;
};

export type GettyEventAsset = {
  id?: string | number;
  name?: string;
  startDate?: string;
  endDate?: string;
  editorialSegment?: string;
  raw?: Record<string, unknown>;
};

export type GettyImageRef = {
  id?: string | number;
  url: string;
  title?: string;
  caption?: string;
  credit: string;
};

export type GettySearchResult<T> = {
  resultCount?: number;
  items: T[];
  raw?: unknown;
};
