import { useEffect, useRef } from "react";

/**
 * Single interval coordinator — visibility-gated polling for warm-tier hooks.
 * Pauses when the tab is hidden; catch-up fetch when the tab returns.
 */
export function usePollingGov(fn: () => void, intervalMs: number, enabled = true): void {
  const savedFn = useRef(fn);
  useEffect(() => {
    savedFn.current = fn;
  }, [fn]);

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      if (!document.hidden) savedFn.current();
    };

    const onVisibility = () => {
      if (!document.hidden) savedFn.current();
    };

    if (!document.hidden) tick();
    const id = setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs, enabled]);
}
