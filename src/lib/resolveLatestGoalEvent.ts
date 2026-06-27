import type { MatchEvent } from "../types";

const GOAL_TYPES = new Set<MatchEvent["type"]>(["goal", "own_goal"]);

/** Returns the Nth goal for a team (1-based count), sorted by minute. */
export function resolveLatestGoalEvent(
  events: MatchEvent[],
  teamId: string,
  teamGoalCount: number
): MatchEvent | undefined {
  if (teamGoalCount <= 0) return undefined;

  const teamGoals = events
    .filter((e) => GOAL_TYPES.has(e.type) && e.teamId === teamId)
    .sort(
      (a, b) =>
        a.minute - b.minute ||
        (a.minuteExtra ?? 0) - (b.minuteExtra ?? 0) ||
        a.providerId.localeCompare(b.providerId)
    );

  if (teamGoals.length === 0) return undefined;
  return teamGoals[Math.min(teamGoalCount, teamGoals.length) - 1];
}
