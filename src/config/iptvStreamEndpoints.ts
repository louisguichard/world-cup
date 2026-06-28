/** Free Daily Xtream IPTV Servers — RapidAPI. */
export const FREE_DAILY_XTREAM_IPTV_HOST = "free-daily-xtream-iptv-servers.p.rapidapi.com";

/** Cloud API Hub IPTV Auto Subscriber — RapidAPI. */
export const CLOUD_API_HUB_IPTV_HOST = "cloud-api-hub-iptv-auto-subscriber.p.rapidapi.com";
/** TVView IPTV index — RapidAPI. */
export const TVVIEW_IPTV_HOST = "tvview.p.rapidapi.com";

function q(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const iptvStreamEndpoints = {
  /** Daily rotating Xtream server list / credentials */
  dailyXtreamGet: () => "/get",
  /**
   * Auto-subscribe plan (verified playground path).
   * countryCode examples: FR, US, GB, DE
   */
  subscribeNoAdults: (query: { countryCode: string; plan?: string }) => {
    const plan = query.plan ?? "1year_no_adults";
    return `/subscribe/${plan}${q({ countryCode: query.countryCode })}`;
  },
  /** TVView catalog */
  tvViewGetAll: () => "/getAll",
} as const;

/** Default country when match venue / user locale is unknown */
export const IPTV_DEFAULT_COUNTRY_CODE = "US";
