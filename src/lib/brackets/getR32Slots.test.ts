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
  };
}

function standing(group: GroupStanding["group"], rows: TeamRecord[]): GroupStanding {
  return { group, rows };
}

describe("getR32Slots", () => {
  it("returns 16 official R32 fixtures", () => {
    expect(ROUND_OF_32_FIXTURES).toHaveLength(16);
    const slots = getR32Slots([], {});
    expect(slots).toHaveLength(16);
    expect(slots[0]?.matchId).toBe("M73");
  });

  it("maps group winners and runners-up to seeds", () => {
    const standings: GroupStanding[] = [
      standing("A", [row("usa", "A", 9), row("mex", "A", 6), row("can", "A", 3), row("per", "A", 0)]),
      standing("B", [row("bra", "B", 9), row("ecu", "B", 6), row("chi", "B", 3), row("bol", "B", 0)]),
    ];
    const teams: Record<string, Team> = {
      usa: { id: "usa", name: "USA", shortName: "USA", abbreviation: "USA", group: "A", rating: 80 },
      mex: { id: "mex", name: "Mexico", shortName: "MEX", abbreviation: "MEX", group: "A", rating: 75 },
      bra: { id: "bra", name: "Brazil", shortName: "BRA", abbreviation: "BRA", group: "B", rating: 90 },
      ecu: { id: "ecu", name: "Ecuador", shortName: "ECU", abbreviation: "ECU", group: "B", rating: 70 },
    };
    const slots = getR32Slots(standings, teams);
    const m73 = slots.find((s) => s.matchId === "M73");
    expect(m73?.homeTeamId).toBe("mex");
    expect(m73?.awayTeamId).toBe("ecu");
    expect(m73?.homeSource).toBe("2A");
    expect(m73?.awaySource).toBe("2B");
  });
});
