import { useEffect, useRef, useState } from "react";
import type { MatchPeriod } from "../types";

export type ClockDisplay = {
  label: string;
  running: boolean;
};

export function computeDisplay(
  period: MatchPeriod,
  minute: number,
  extra?: number
): ClockDisplay {
  switch (period) {
    case "not_started":
      return { label: "KO", running: false };
    case "half_time":
      return { label: "HT", running: false };
    case "first_half":
    case "second_half":
    case "extra_time_first":
    case "extra_time_second":
      if (period === "second_half" && minute >= 90 && extra) {
        return { label: `90+${extra}'`, running: true };
      }
      return { label: `${minute}'`, running: true };
    case "extra_time_break":
      return { label: "ET Break", running: false };
    case "penalties":
      return { label: "PENS", running: false };
    case "full_time":
      return { label: "FT", running: false };
    case "postponed":
      return { label: "PST", running: false };
    case "interrupted":
      return { label: "INT", running: false };
    default: {
      const _exhaustive: never = period;
      return _exhaustive;
    }
  }
}

export function useLiveClock(
  period: MatchPeriod,
  minute: number,
  extra?: number,
  running = false
): ClockDisplay {
  const [display, setDisplay] = useState(() => computeDisplay(period, minute, extra));
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    setDisplay(computeDisplay(period, minute, extra));

    if (!running) return;

    const tick = () => {
      setDisplay(computeDisplay(period, minute, extra));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [period, minute, extra, running]);

  useEffect(() => {
    const onVis = () => setDisplay(computeDisplay(period, minute, extra));
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [period, minute, extra]);

  return display;
}
