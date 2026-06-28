/**
 * Live data refresh policy — SSE primary, polling fallback only.
 */

export const LIVE_DATA_FLAGS = {
  /** When true, polling runs only if SSE is disconnected or unhealthy. */
  ssePrimary: true,
  pollFallbackOnly: true,
} as const;

/** Module-level SSE health (updated by SSEProvider). */
let sseConnected = false;

export function setSseConnectionState(connected: boolean): void {
  sseConnected = connected;
}

export function isSseHealthy(): boolean {
  return LIVE_DATA_FLAGS.ssePrimary && sseConnected;
}

export function shouldRunPollFallback(): boolean {
  if (!LIVE_DATA_FLAGS.pollFallbackOnly) return true;
  return !isSseHealthy();
}
