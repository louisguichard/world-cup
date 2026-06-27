import { describe, expect, it } from "vitest";
import { resolveLatestGoalEvent } from "./resolveLatestGoalEvent";
import type { MatchEvent } from "../types";

function goal(
  partial: Pick<MatchEvent, "providerId" | "teamId" | "minute"> &
    Partial<Pick<MatchEvent, "minuteExtra" | "playerName">>
): MatchEvent {
  return {
    providerId: partial.providerId,
    teamId: partial.teamId,
    minute: partial.minute,
    minuteExtra: partial.minuteExtra,
    playerName: partial.playerName ?? "Player",
    type: "goal",
  } as MatchEvent;
}

describe("resolveLatestGoalEvent", () => {
  const events = [
    goal({ providerId: "g1", teamId: "usa", minute: 12, playerName: "A" }),
    goal({ providerId: "g2", teamId: "mex", minute: 34, playerName: "B" }),
    goal({ providerId: "g3", teamId: "usa", minute: 67, playerName: "C" }),
  ];

  it("returns the goal at the given count for a team", () => {
    expect(resolveLatestGoalEvent(events, "usa", 1)?.providerId).toBe("g1");
    expect(resolveLatestGoalEvent(events, "usa", 2)?.providerId).toBe("g3");
  });

  it("returns undefined when count is zero or team has no goals", () => {
    expect(resolveLatestGoalEvent(events, "usa", 0)).toBeUndefined();
    expect(resolveLatestGoalEvent(events, "bra", 1)).toBeUndefined();
  });
});
