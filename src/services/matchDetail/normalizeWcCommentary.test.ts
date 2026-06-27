import { describe, expect, it } from "vitest";
import { normalizeWcCommentaryResponse } from "./normalizeWcCommentary";

describe("normalizeWcCommentaryResponse", () => {
  it("maps API incidents to commentary entries", () => {
    const entries = normalizeWcCommentaryResponse({
      success: true,
      matchId: "CGdvIm6K",
      data: {
        incidents: [
          {
            period: "2nd Half",
            minute: "67'",
            type: "goal",
            side: "home",
            player: "Lee Kang-In",
            text: null,
          },
          {
            period: "2nd Half",
            minute: "59'",
            type: "yellow_card",
            side: "away",
            player: "Coufal V.",
            text: "Yellow card for Coufal V.",
          },
        ],
      },
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]?.text).toContain("Lee Kang-In");
    expect(entries[0]?.type).toBe("goal");
    expect(entries[1]?.text).toContain("Yellow card");
  });
});
