import { describe, expect, it } from "vitest";
import { mapEventsToCommentary } from "./mapEventsToCommentary";
import type { MatchEvent } from "../../types";

describe("mapEventsToCommentary", () => {
  it("converts goals and cards to commentary rows", () => {
    const events: MatchEvent[] = [
      {
        providerId: "1",
        minute: 12,
        type: "goal",
        teamId: "bra",
        playerName: "Vinicius",
        assistName: "Rodrygo",
      },
      {
        providerId: "2",
        minute: 45,
        minuteExtra: 2,
        type: "yellow_card",
        teamId: "arg",
        playerName: "Messi",
      },
    ];

    const rows = mapEventsToCommentary(events);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.text).toContain("Vinicius");
    expect(rows[0]?.text).toContain("Rodrygo");
    expect(rows[1]?.minute).toBe("45+2");
  });
});
