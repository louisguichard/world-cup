import catalog from "../../config/rapidapi-catalog.json";

export type RapidApiEndpoint = {
  id: string;
  fn: string;
  path: string;
  acceptStatuses?: number[];
  resolveKeys?: string[];
  skipIfUnresolved?: boolean;
};

export type RapidApiProvider = {
  id: string;
  label: string;
  host: string;
  marketplaceSlug: string;
  testPath: string;
  client: string;
  devProxyPrefix?: string;
  endpoints?: RapidApiEndpoint[];
};

export const RAPIDAPI_PROVIDERS = catalog as RapidApiProvider[];

export function rapidApiMarketplaceUrl(slug: string): string {
  return `https://rapidapi.com/${slug}`;
}

/** Browser-side RapidAPI headers — key only in dev (proxies inject server-side). */
export function rapidApiHeaders(host: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-rapidapi-host": host,
  };

  const devKey = import.meta.env.VITE_RAPIDAPI_KEY;
  if (import.meta.env.DEV && devKey) {
    headers["x-rapidapi-key"] = devKey;
  }

  return headers;
}

export function providerByHost(host: string): RapidApiProvider | undefined {
  return RAPIDAPI_PROVIDERS.find((p) => p.host === host);
}
