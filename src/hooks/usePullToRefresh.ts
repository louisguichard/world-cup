import { useCallback, useEffect, useRef } from "react";

const PULL_THRESHOLD = 80;
const RESISTANCE = 0.4;

/**
 * Attaches a simple pull-to-refresh touch handler to a scroll container.
 * When the user pulls down from the top by more than `PULL_THRESHOLD` px,
 * `onRefresh` is called once.
 *
 * This is intentionally light-weight — no spinner animation to keep deps minimal.
 */
export function usePullToRefresh(
  containerRef: React.RefObject<HTMLElement | null>,
  onRefresh: () => void,
  enabled = true
): void {
  const startYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const onTouchStart = useCallback((e: TouchEvent) => {
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) return;
    startYRef.current = e.touches[0].clientY;
    pullingRef.current = false;
  }, [containerRef]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (startYRef.current === null) return;
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) {
      startYRef.current = null;
      return;
    }
    const delta = (e.touches[0].clientY - startYRef.current) * RESISTANCE;
    if (delta > PULL_THRESHOLD) {
      pullingRef.current = true;
    }
  }, [containerRef]);

  const onTouchEnd = useCallback(() => {
    if (pullingRef.current) {
      onRefreshRef.current();
    }
    startYRef.current = null;
    pullingRef.current = false;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [enabled, onTouchStart, onTouchMove, onTouchEnd, containerRef]);
}
