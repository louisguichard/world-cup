/** TVPro API on RapidAPI — IPTV channel listings (apps-oficial.com backend). */
export const TVPRO_API_HOST = "tvpro-api.p.rapidapi.com";

/** RapidAPI partner id required on all requests. */
export const TVPRO_RAPID_API_PARTNER = "jlospino";

/** GET `mod` values documented on the RapidAPI playground. */
export const TVPRO_CHANNEL_MODS = ["tv", "vix", "star"] as const;
export type TvproChannelMod = (typeof TVPRO_CHANNEL_MODS)[number];

const API_TV_BASE = "/apps-oficial.com/apps/views/forms/entretenimiento/api_tv";

function q(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const tvproApiEndpoints = {
  /** GET — public TV channel list (mod: tv | vix | star). */
  channels: (query: { mod: TvproChannelMod; RapidApi?: string }) =>
    `${API_TV_BASE}${q({ RapidApi: TVPRO_RAPID_API_PARTNER, ...query })}`,

  /** POST — authenticate and obtain session token (email + password). */
  token: () => `${API_TV_BASE}/token.php`,

  /** POST — search/filter channels with session token. */
  channelSearch: () => `${API_TV_BASE}/`,
} as const;
