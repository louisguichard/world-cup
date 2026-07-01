import type { MergedMatch } from "../types";
import { shouldRunLivePolling } from "../lib/liveDataContract";

export const LIVE_DATA_FLAGS = {
  /** SSE connected (heartbeats / future EntityUpdated events). */
  ssePrimary: true,
  /** When true, skip polling only outside live windows while SSE is healthy. */
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

export function shouldRunPollFallback(liveMatches: MergedMatch[] = []): boolean {
  if (!LIVE_DATA_FLAGS.pollFallbackOnly) return true;
  if (shouldRunLivePolling(liveMatches)) return true;
  return !isSseHealthy();
}
