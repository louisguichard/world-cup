import { useCallback, useEffect, useRef, useState } from "react";

export type ScrollHeaderState = {
  shrunk: boolean;
  scrollY: number;
};

const SHRINK_THRESHOLD = 60;

/**
 * Tracks scroll position of a container element and returns
 * whether the header should be in its compact (shrunk) state.
 */
export function useScrollHeader(
  scrollContainerRef: React.RefObject<HTMLElement | null>
): ScrollHeaderState {
  const [state, setState] = useState<ScrollHeaderState>({ shrunk: false, scrollY: 0 });
  const rafRef = useRef<number | null>(null);

  const handleScroll = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = scrollContainerRef.current;
      if (!el) return;
      const scrollY = el.scrollTop;
      setState({ shrunk: scrollY > SHRINK_THRESHOLD, scrollY });
    });
  }, [scrollContainerRef]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleScroll, scrollContainerRef]);

  return state;
}
