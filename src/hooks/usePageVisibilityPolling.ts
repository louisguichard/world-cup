import { useCallback, useEffect, useRef } from "react";
import { shouldRunPollFallback } from "../config/liveDataFlags";

const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const HIDDEN_GRACE_MS = 10 * 1000; // 10 second grace before pausing

/**
 * Polls `onPoll` every 2 minutes while `document.visibilityState === "visible"`.
 * When the tab becomes hidden, waits 10s grace then pauses.
 * When visible again, fires an immediate poll and restarts the interval.
 */
export function usePageVisibilityPolling(onPoll: () => void, enabled = true): void {
  const onPollRef = useRef(onPoll);
  onPollRef.current = onPoll;

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const graceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (shouldRunPollFallback()) {
        onPollRef.current();
      }
    }, POLL_INTERVAL_MS);
  }, []);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const handleVisible = useCallback(() => {
    if (graceTimeoutRef.current) {
      clearTimeout(graceTimeoutRef.current);
      graceTimeoutRef.current = null;
    }
    if (shouldRunPollFallback()) {
      onPollRef.current();
    }
    startInterval();
  }, [startInterval]);

  const handleHidden = useCallback(() => {
    graceTimeoutRef.current = setTimeout(() => {
      stopInterval();
      graceTimeoutRef.current = null;
    }, HIDDEN_GRACE_MS);
  }, [stopInterval]);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleVisible();
      } else {
        handleHidden();
      }
    };

    if (document.visibilityState === "visible") {
      startInterval();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopInterval();
      if (graceTimeoutRef.current) clearTimeout(graceTimeoutRef.current);
    };
  }, [enabled, handleVisible, handleHidden, startInterval, stopInterval]);
}
