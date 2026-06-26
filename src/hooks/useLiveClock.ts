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
  // Local counter that advances independently of ESPN poll cadence
  const localMinRef = useRef(minute);

  // Sync with server-provided authoritative minute on every ESPN poll
  useEffect(() => {
    localMinRef.current = minute;
    setDisplay(computeDisplay(period, minute, extra));
  }, [period, minute, extra]);

  // Tick the clock forward every 60 s when the match is running.
  // This keeps the display moving between ESPN polls (which arrive every ~15 s
  // but only carry integer-minute granularity, so the raw prop wouldn't change
  // more than once per minute even under perfect conditions).
  useEffect(() => {
    if (!running) return;

    const id = setInterval(() => {
      localMinRef.current += 1;
      setDisplay(computeDisplay(period, localMinRef.current, extra));
    }, 60_000);
    return () => {
      clearInterval(id);
    };
    // `extra` is intentionally excluded: it is only meaningful for 90+N' injury
    // time (second_half overflow), and ESPN provides it accurately on each poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, period]);

  useEffect(() => {
    const onVis = () => setDisplay(computeDisplay(period, localMinRef.current, extra));
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [period, extra]);

  return display;
}
