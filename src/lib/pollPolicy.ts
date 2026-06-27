/** Tiered live polling intervals (ms). */
export const POLL_LIVE_MS = 15_000;
export const POLL_IDLE_MS = 300_000;
export const POLL_THIRD_PLACE_LIVE_MS = 15_000;

export function pollIntervalMs(hasLiveMatches: boolean): number {
  return hasLiveMatches ? POLL_LIVE_MS : POLL_IDLE_MS;
}

/** Idle polls skip enrichment + per-match event cascade to conserve quota. */
export function isLightPoll(hasLiveMatches: boolean): boolean {
  return !hasLiveMatches;
}
