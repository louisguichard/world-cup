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

  it("M73 is 1A vs 3E", () => {
    expect(ROUND_OF_32_FIXTURES[0]).toEqual(["M73", "1A", "3E"]);
  });
  it("M74 is 1B vs 3J", () => {
    expect(ROUND_OF_32_FIXTURES[1]).toEqual(["M74", "1B", "3J"]);
  });
  it("M75 is 1D vs 3B", () => {
    expect(ROUND_OF_32_FIXTURES[2]).toEqual(["M75", "1D", "3B"]);
  });
  it("M81 is 2A vs 2B", () => {
    expect(ROUND_OF_32_FIXTURES[8]).toEqual(["M81", "2A", "2B"]);
  });
  it("M84 is 1H vs 2J", () => {
    expect(ROUND_OF_32_FIXTURES[11]).toEqual(["M84", "1H", "2J"]);
  });
  it("M85 is 1C vs 2F", () => {
    expect(ROUND_OF_32_FIXTURES[12]).toEqual(["M85", "1C", "2F"]);
  });
  it("M87 is 1J vs 3H", () => {
    expect(ROUND_OF_32_FIXTURES[14]).toEqual(["M87", "1J", "3H"]);
  });
  it("M88 is 2E vs 2I", () => {
    expect(ROUND_OF_32_FIXTURES[15]).toEqual(["M88", "2E", "2I"]);
  });

  it("M73 resolves 1A winner and 3E third-place qualifier", () => {
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
    const m73 = slots.find((s) => s.matchId === "M73");
    expect(m73?.homeSource).toBe("1A");
    expect(m73?.awaySource).toBe("3E");
    expect(m73?.homeTeamId).toBe("mex");
  });
});
