import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../types";
import { hasDisplayableMatchEvents } from "./matchDisplayEvents";

describe("hasDisplayableMatchEvents", () => {
  it("returns true when a displayable event exists", () => {
    const events: MatchEvent[] = [
      {
        providerId: "1",
        minute: 42,
        type: "goal",
        teamId: "bra",
        playerName: "Player",
      },
    ];
    expect(hasDisplayableMatchEvents(events)).toBe(true);
  });

  it("returns false for empty or non-displayable events", () => {
    expect(hasDisplayableMatchEvents([])).toBe(false);
  });
});
