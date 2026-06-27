export type RapidProxyRoute = {
  host: string;
  /** Exact paths allowed (if set, only these paths match). */
  allowedPaths?: readonly string[];
  /** Path prefix allowlist (path === prefix, starts with prefix, or starts with prefix?). */
  allowedPrefixes?: readonly string[];
  /** Require upstream path to start with this prefix (e.g. SofaScore6 API root). */
  requiredPathPrefix?: string;
  /** Forward mutating HTTP methods; default GET-only for safety. */
  allowMutating?: boolean;
  /** Only allow mutating requests when path starts with one of these prefixes. */
  mutatingPathPrefixes?: readonly string[];
  /** Extra upstream headers (e.g. Zafronix X-API-Key). */
  extraHeaderEnv?: Record<string, string>;
};

/**
 * RapidAPI service registry keyed by URL segment after /api/rapid/.
 * Vercel rewrites map legacy /api/{service}/… paths here.
 */
export const RAPID_PROXY_ROUTES: Record<string, RapidProxyRoute> = {
  "wc-live": {
    host: "world-cup-2026-live-api.p.rapidapi.com",
    allowedPrefixes: [
      "/wc/draw",
      "/wc/live",
      "/wc/standings",
      "/wc/match/",
      "/wc/commentary/",
      "/wc/lineups/",
      "/wc/stats/",
    ],
  },
  wc2026: {
    host: "world-cup-2026.p.rapidapi.com",
    allowedPrefixes: ["/world-cup-2026/teams"],
  },
  footballdata: {
    host: "free-api-live-football-data.p.rapidapi.com",
    allowedPrefixes: ["/football-current-live", "/football-get-matches-by-date"],
  },
  sportapi: {
    host: "sportapi7.p.rapidapi.com",
    allowedPrefixes: ["/api/v1/category/1468/scheduled-events/", "/api/v1/event/"],
  },
  sofascore6: {
    host: "sofascore6.p.rapidapi.com",
    requiredPathPrefix: "/api/sofascore/v1",
  },
  "sofascore-rapid": {
    host: "sofascore.p.rapidapi.com",
  },
  weather: {
    host: "open-weather13.p.rapidapi.com",
    allowedPrefixes: ["/city", "/city/", "/fivedaysforcast/"],
  },
  odds: {
    host: "sports-odds-intelligence-api.p.rapidapi.com",
    allowedPrefixes: ["/soccer/", "/live/", "/odds/"],
  },
  "football-prediction": {
    host: "football-prediction-api.p.rapidapi.com",
  },
  "world-cup-history": {
    host: "world-cup1.p.rapidapi.com",
  },
  "sport-highlights": {
    host: "sport-highlights-api.p.rapidapi.com",
    allowedPrefixes: ["/football/"],
  },
  "sports-live-scores": {
    host: "sports-live-scores.p.rapidapi.com",
    allowedPrefixes: [
      "/get_odds/",
      "/football/",
      "/tennis/",
      "/basketball/",
      "/handball/",
      "/baseball/",
      "/table-tennis/",
      "/table_tennis/",
      "/esports/",
      "/futsal/",
      "/cricket/",
    ],
  },
  "all-sport-live-stream": {
    host: "all-sport-live-stream.p.rapidapi.com",
    allowedPrefixes: ["/api/v6/", "/api/v1/", "/api/v2/", "/api/all-streams"],
  },
  "free-daily-xtream-iptv": {
    host: "free-daily-xtream-iptv-servers.p.rapidapi.com",
    allowedPaths: ["/get"],
  },
  "cloud-api-hub-iptv": {
    host: "cloud-api-hub-iptv-auto-subscriber.p.rapidapi.com",
    allowedPrefixes: ["/subscribe/"],
  },
  tvview: {
    host: "tvview.p.rapidapi.com",
    allowedPaths: ["/getAll"],
  },
  flashlive: {
    host: "flashlive-sports.p.rapidapi.com",
    requiredPathPrefix: "/v1/",
  },
  zafronix: {
    host: "zafronix-fifa-world-cup-api.p.rapidapi.com",
    allowedPrefixes: [
      "/tournaments",
      "/teams",
      "/matches",
      "/bracket",
      "/standings",
      "/stadiums",
      "/trivia",
      "/search",
      "/aggregates",
      "/compare",
      "/health",
      "/players",
      "/referees",
      "/me",
      "/sandbox",
    ],
    allowMutating: true,
    mutatingPathPrefixes: ["/matches/"],
    extraHeaderEnv: { "X-API-Key": "ZAFRONIX_API_KEY" },
  },
};

const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(prefix) || path.startsWith(`${prefix}?`);
}

export function isPathAllowed(route: RapidProxyRoute, path: string): boolean {
  if (route.requiredPathPrefix && !path.startsWith(route.requiredPathPrefix)) {
    return false;
  }
  if (route.allowedPaths) {
    return route.allowedPaths.includes(path);
  }
  if (route.allowedPrefixes) {
    if (path === "/" || path === "") return true;
    return route.allowedPrefixes.some((p) => matchesPrefix(path, p));
  }
  return true;
}

export function isMethodAllowed(route: RapidProxyRoute, method: string, path: string): boolean {
  const upper = method.toUpperCase();
  if (!MUTATING_METHODS.has(upper)) return true;
  if (!route.allowMutating) return false;
  if (!route.mutatingPathPrefixes?.length) return true;
  return route.mutatingPathPrefixes.some((p) => path.startsWith(p));
}

export function buildUpstreamHeaders(
  route: RapidProxyRoute,
  rapidKey: string,
  method: string
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "x-rapidapi-host": route.host,
    "x-rapidapi-key": rapidKey,
  };
  if (MUTATING_METHODS.has(method.toUpperCase())) {
    headers["Content-Type"] = "application/json";
  }
  if (route.extraHeaderEnv) {
    for (const [header, envKey] of Object.entries(route.extraHeaderEnv)) {
      const value = process.env[envKey];
      if (value) headers[header] = value;
    }
  }
  return headers;
}
