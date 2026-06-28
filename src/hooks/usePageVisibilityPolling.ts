import { useCallback } from "react";
import { shouldRunPollFallback } from "../config/liveDataFlags";
import { usePollingGov } from "./usePollingGov";

const DEFAULT_INTERVAL_MS = 2 * 60 * 1000;

/**
 * Polls `onPoll` on an interval while the tab is visible.
 * Skips ticks when SSE is healthy (poll fallback only).
 */
export function usePageVisibilityPolling(
  onPoll: () => void,
  enabled = true,
  intervalMs = DEFAULT_INTERVAL_MS
): void {
  const tick = useCallback(() => {
    if (shouldRunPollFallback()) onPoll();
  }, [onPoll]);

  usePollingGov(tick, intervalMs, enabled);
}
