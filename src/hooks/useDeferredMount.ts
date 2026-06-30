import { useEffect, useState } from "react";

/** Mount below-fold UI after the browser is idle so tab chrome stays responsive. */
export function useDeferredMount(enabled = true, timeoutMs = 2000): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      return;
    }

    let cancelled = false;
    const run = () => {
      if (!cancelled) setReady(true);
    };

    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(run, { timeout: timeoutMs });
      return () => {
        cancelled = true;
        cancelIdleCallback(id);
      };
    }

    const id = window.setTimeout(run, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [enabled, timeoutMs]);

  return ready;
}
