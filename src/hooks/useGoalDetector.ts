import { useEffect, useRef, useState } from "react";
import type { MatchEvent } from "../types";
import { resolveLatestGoalEvent } from "../lib/resolveLatestGoalEvent";
import { useStore } from "../store";

export type GoalEvent = {
  matchId: string;
  scoringTeamId: "home" | "away";
  newScore: { home: number; away: number };
  minute?: number;
  minuteExtra?: number;
  playerName?: string;
  scorerEvent?: MatchEvent;
};

const GOAL_DURATION_SEC = 60;

function matchEventsForId(
  matchEvents: Record<string, MatchEvent[]>,
  matchId: string,
  match: { matchId?: string; espnEventId?: string }
): MatchEvent[] {
  return (
    matchEvents[matchId] ??
    (match.matchId ? matchEvents[match.matchId] : undefined) ??
    (match.espnEventId ? matchEvents[match.espnEventId] : undefined) ??
    []
  );
}

/**
 * Watches a match's score. Returns true for 60s after any goal.
 * Also returns the most recent GoalEvent for the banner text.
 */
export function useGoalDetector(matchId: string): {
  isGoalActive: boolean;
  latestGoal: GoalEvent | null;
  secondsRemaining: number;
} {
  const match = useStore((s) => s.liveMatches[matchId]);
  const matchEvents = useStore((s) => s.matchEvents);
  const [isGoalActive, setIsGoalActive] = useState(false);
  const [latestGoal, setLatestGoal] = useState<GoalEvent | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  const prevScoresRef = useRef<{ home: number; away: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startCelebration = (goal: GoalEvent) => {
    clearTimers();
    setLatestGoal(goal);
    setIsGoalActive(true);
    setSecondsRemaining(GOAL_DURATION_SEC);

    intervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    timerRef.current = setTimeout(() => {
      clearTimers();
      setIsGoalActive(false);
      setLatestGoal(null);
      setSecondsRemaining(0);
    }, GOAL_DURATION_SEC * 1000);
  };

  useEffect(() => {
    prevScoresRef.current = null;
    clearTimers();
    setIsGoalActive(false);
    setLatestGoal(null);
    setSecondsRemaining(0);

    return () => {
      clearTimers();
    };
  }, [matchId]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  useEffect(() => {
    if (!match) {
      prevScoresRef.current = null;
      return;
    }

    const home = match.homeScore ?? 0;
    const away = match.awayScore ?? 0;
    const prev = prevScoresRef.current;

    if (prev !== null) {
      let scoringTeamId: "home" | "away" | null = null;
      if (home > prev.home) scoringTeamId = "home";
      else if (away > prev.away) scoringTeamId = "away";

      if (scoringTeamId !== null) {
        const teamId = scoringTeamId === "home" ? match.homeTeamId : match.awayTeamId;
        const teamGoalCount = scoringTeamId === "home" ? home : away;
        const events = matchEventsForId(matchEvents, matchId, match);
        const scorerEvent = resolveLatestGoalEvent(events, teamId, teamGoalCount);

        startCelebration({
          matchId,
          scoringTeamId,
          newScore: { home, away },
          minute: scorerEvent?.minute ?? match.clockMinute,
          minuteExtra: scorerEvent?.minuteExtra ?? match.clockExtra,
          playerName: scorerEvent?.playerName,
          scorerEvent,
        });
      }
    }

    prevScoresRef.current = { home, away };
  }, [
    match,
    match?.homeScore,
    match?.awayScore,
    match?.clockMinute,
    match?.clockExtra,
    match?.homeTeamId,
    match?.awayTeamId,
    match?.matchId,
    match?.espnEventId,
    matchEvents,
    matchId,
  ]);

  if (!match) {
    return { isGoalActive: false, latestGoal: null, secondsRemaining: 0 };
  }

  return { isGoalActive, latestGoal, secondsRemaining };
}
