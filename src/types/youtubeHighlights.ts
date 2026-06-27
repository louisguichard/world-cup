export type YouTubeVideoKind = "highlights" | "pre-match";

export type YouTubeMatchVideo = {
  id: string;
  videoId: string;
  title: string;
  description?: string;
  channelId?: string;
  channelTitle?: string;
  publishedAt?: string;
  thumbnailUrl?: string;
  watchUrl: string;
  embedUrl: string;
  source: "youtube138" | "google-api31";
  provider: "fox" | "telemundo" | "unknown";
  kind: YouTubeVideoKind;
  verified: boolean;
  confidence: number;
};

export type YouTubeRawCandidate = {
  videoId?: string;
  title?: string;
  description?: string;
  channelId?: string;
  channelTitle?: string;
  publishedAt?: string;
  thumbnailUrl?: string;
  url?: string;
  source: "youtube138" | "google-api31";
};

export type WebsiteContact = {
  type?: string;
  label?: string;
  url?: string;
  raw?: Record<string, unknown>;
};

