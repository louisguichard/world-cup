/** All Sport Live Stream API — ScoreSwift on RapidAPI. */
export const ALL_SPORT_LIVE_STREAM_HOST = "all-sport-live-stream.p.rapidapi.com";

/** Football slug/id from `/api/v6/sport-id`. */
export const LIVE_STREAM_FOOTBALL_SLUG = "football";
export const LIVE_STREAM_FOOTBALL_SPORT_ID = 3;

function q(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Verified v6 routes (RapidAPI playground "Stream source v5").
 * v4/v5 path prefixes return 404 — aliases in the client map to these.
 */
export const allSportLiveStreamEndpoints = {
  /** All Sport ID (v5 playground name) */
  sportIdsV6: () => "/api/v6/sport-id",
  /** Schedule / match list — requires slug + current_date (YYYY-MM-DD) */
  scheduleV6: (query: { slug: string; current_date: string }) =>
    `/api/v6/matches${q(query)}`,
  /** Play stream + availability check — requires id */
  playStreamV6: (id: string | number, extra?: Record<string, string | number>) =>
    `/api/v6/play-stream${q({ id, ...extra })}`,

  /** Legacy aggregate endpoints (may be slow / unavailable on some plans) */
  allLiveStreamV1: (query?: Record<string, string | number>) =>
    `/api/v1/all-live-stream${q(query ?? {})}`,
  allLiveStreamV2: (query?: Record<string, string | number>) =>
    `/api/v2/all-live-stream${q(query ?? {})}`,
  allStreamsLegacy: () => "/api/all-streams",
} as const;

/** v4 playground aliases → v6 */
export const liveStreamV4Endpoints = {
  allSportsId: () => allSportLiveStreamEndpoints.sportIdsV6(),
  matchList: (query: { slug: string; current_date: string }) =>
    allSportLiveStreamEndpoints.scheduleV6(query),
  checkStreamAvailability: (id: string | number) =>
    allSportLiveStreamEndpoints.playStreamV6(id),
} as const;

/** v5 playground aliases → v6 */
export const liveStreamV5Endpoints = {
  allSportId: () => allSportLiveStreamEndpoints.sportIdsV6(),
  schedule: (query: { slug: string; current_date: string }) =>
    allSportLiveStreamEndpoints.scheduleV6(query),
  playStream: (id: string | number) => allSportLiveStreamEndpoints.playStreamV6(id),
} as const;
