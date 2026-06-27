import { describe, expect, it } from "vitest";
import { buildThirdPlaceCutoffScenario } from "./thirdPlaceCutoffScenario";
import type { TeamRecord } from "../types";

function record(
  teamId: string,
  points: number,
  gd: number,
  gf: number
): TeamRecord {
  return {
    teamId,
    group: "A",
    played: 3,
    wins: 1,
    draws: 1,
    losses: 1,
    goalsFor: gf,
    goalsAgainst: gf - gd,
    goalDifference: gd,
    points,
    conduct: 0,
    rating: 1500,
    fifaRank: 10,
  };
}

describe("buildThirdPlaceCutoffScenario", () => {
  it("builds prose lines for rank-8 team", () => {
    const ranked = Array.from({ length: 10 }, (_, i) =>
      record(`t${i}`, 4 - Math.floor(i / 3), 2 - i, 5 + i)
    );
    const scenario = buildThirdPlaceCutoffScenario("t7", ranked, [], {
      lockedGroupMatchCount: {},
      lockedStandingsByGroup: {},
    });
    expect(scenario).not.toBeNull();
    expect(scenario!.rank).toBe(8);
    expect(scenario!.proseLines[0]).toContain("edge of qualification");
    expect(scenario!.proseLines.some((l) => l.includes("#8"))).toBe(true);
    expect(scenario!.keepSummary).toContain("Hold");
  });

  it("returns null when team not in ranked list", () => {
    expect(
      buildThirdPlaceCutoffScenario("missing", [], [], {
        lockedGroupMatchCount: {},
        lockedStandingsByGroup: {},
      })
    ).toBeNull();
  });
});
