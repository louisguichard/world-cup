export type LiveStreamSport = {
  id: number;
  slug: string;
  name: string;
};

export type LiveStreamScheduleMatch = {
  id: string;
  title: string;
  homeTeam?: string;
  awayTeam?: string;
  league?: string;
  startTime?: string;
  status?: string;
  isLive?: boolean;
};

export type LiveStreamServer = {
  name?: string;
  url: string;
  type?: string;
};

export type LiveStreamPlayResult = {
  available: boolean;
  streamUrl?: string;
  embedUrl?: string;
  iframeHtml?: string;
  servers: LiveStreamServer[];
  error?: string;
};

export type LiveStreamScheduleResult = {
  matches: LiveStreamScheduleMatch[];
  upstreamError?: string;
  fetchedAt: number;
};

export type LiveStreamMatchBundle = {
  streamMatchId: string | null;
  scheduleMatch: LiveStreamScheduleMatch | null;
  play: LiveStreamPlayResult | null;
  scheduleError?: string;
  fetchedAt: number;
};
