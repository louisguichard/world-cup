import { describe, expect, it } from "vitest";
import { getR32Slots, ROUND_OF_32_FIXTURES } from "./getR32Slots";
import type { GroupStanding, Team, TeamRecord } from "../../types";

function row(teamId: string, group: GroupStanding["group"], points: number): TeamRecord {
  return {
    teamId,
    played: 3,
    wins: points >= 3 ? 1 : 0,
    draws: 0,
    losses: 0,
    goalsFor: points,
    goalsAgainst: 0,
    goalDifference: points,
    points,
    conduct: 0,
    group,
    rating: 1500,
  };
}

function standing(group: GroupStanding["group"], rows: TeamRecord[]): GroupStanding {
  return { group, rows };
}

describe("ROUND_OF_32_FIXTURES — source of truth enforcement", () => {
  it("has exactly 16 fixtures", () => {
    expect(ROUND_OF_32_FIXTURES).toHaveLength(16);
  });

  it("M73 is 2A vs 2B (FIFA schedule / ESPN)", () => {
    expect(ROUND_OF_32_FIXTURES[0]).toEqual(["M73", "2A", "2B"]);
  });
  it("M74 is 1C vs 2F", () => {
    expect(ROUND_OF_32_FIXTURES[1]).toEqual(["M74", "1C", "2F"]);
  });
  it("M79 is 1A vs 3E", () => {
    expect(ROUND_OF_32_FIXTURES.find(([id]) => id === "M79")).toEqual(["M79", "1A", "3E"]);
  });
  it("M75 is 1E vs 3D", () => {
    expect(ROUND_OF_32_FIXTURES.find(([id]) => id === "M75")).toEqual(["M75", "1E", "3D"]);
  });
  it("M83 is 1H vs 2J", () => {
    expect(ROUND_OF_32_FIXTURES.find(([id]) => id === "M83")).toEqual(["M83", "1H", "2J"]);
  });
  it("M77 is 2E vs 2I", () => {
    expect(ROUND_OF_32_FIXTURES.find(([id]) => id === "M77")).toEqual(["M77", "2E", "2I"]);
  });

  it("M79 resolves 1A winner and 3E third-place qualifier", () => {
    const standings: GroupStanding[] = [
      standing("A", [row("mex", "A", 9), row("can", "A", 6), row("usa", "A", 3), row("per", "A", 0)]),
      standing("E", [row("ger", "E", 9), row("esp", "E", 6), row("ecu", "E", 3), row("arg", "E", 0)]),
    ];
    const teams: Record<string, Team> = {
      mex: { id: "mex", name: "Mexico", shortName: "MEX", abbreviation: "MEX", group: "A", rating: 80 },
      ecu: { id: "ecu", name: "Ecuador", shortName: "ECU", abbreviation: "ECU", group: "E", rating: 70 },
    };
    const slots = getR32Slots(standings, teams, {
      lockedGroupMatchCount: { A: 6, E: 6 },
      lockedStandingsByGroup: {},
    });
    const m79 = slots.find((s) => s.matchId === "M79");
    expect(m79?.homeSource).toBe("1A");
    expect(m79?.awaySource).toBe("3E");
    expect(m79?.homeTeamId).toBe("mex");
  });
});
