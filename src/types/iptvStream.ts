export type XtreamServerCredentials = {
  serverUrl: string;
  username: string;
  password: string;
  port?: string;
  protocol?: "http" | "https";
  name?: string;
};

export type IptvSubscriptionResult = {
  countryCode: string;
  plan: string;
  m3uUrl?: string;
  credentials?: XtreamServerCredentials;
  rawMessage?: string;
};

export type IptvLiveChannel = {
  streamId: string;
  name: string;
  category?: string;
  streamUrl?: string;
};

export type IptvStreamLookupResult = {
  available: boolean;
  sources: Array<"xtreamDaily" | "cloudSubscriber" | "tvview">;
  credentials: XtreamServerCredentials[];
  m3uUrls: string[];
  channels: IptvLiveChannel[];
  servers: Array<{ name?: string; url: string; type?: string }>;
  error?: string;
  fetchedAt: number;
};
