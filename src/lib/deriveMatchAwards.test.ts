import { describe, expect, it } from "vitest";
import type { MatchEvent, MergedMatch } from "../types";
import { deriveMatchAwards } from "./deriveMatchAwards";

const completed: MergedMatch = {
  id: "M1",
  matchId: "M1",
  date: "2026-06-15T18:00:00Z",
  homeTeamId: "bra",
  awayTeamId: "arg",
  status: "completed",
  homeScore: 2,
  awayScore: 0,
  homeConduct: 0,
  awayConduct: 0,
  locked: true,
  source: "manual",
};

describe("deriveMatchAwards", () => {
  it("picks a man of the match from goal contributions", () => {
    const events: MatchEvent[] = [
      {
        providerId: "1",
        minute: 12,
        type: "goal",
        teamId: "bra",
        playerName: "Richarlison",
      },
      {
        providerId: "2",
        minute: 44,
        type: "goal",
        teamId: "bra",
        playerName: "Richarlison",
        assistName: "Paquetá",
      },
    ];

    const rows = deriveMatchAwards({
      matches: [completed],
      matchEvents: { M1: events },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.awards.some((a) => a.kind === "man_of_the_match")).toBe(true);
    expect(rows[0]?.awards.find((a) => a.kind === "man_of_the_match")?.playerName).toBe("Richarlison");
  });

  it("shows pending state when no events exist", () => {
    const rows = deriveMatchAwards({ matches: [completed], matchEvents: {} });
    expect(rows[0]?.awards).toHaveLength(0);
  });
});
