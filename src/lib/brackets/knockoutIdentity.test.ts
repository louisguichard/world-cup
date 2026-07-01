import { describe, expect, it } from "vitest";
import type { GroupStanding, MergedMatch, Team } from "../../types";
import {
  findOfficialR32SlotForLiveMatch,
  liveMatchFitsR32Slot,
  resolveOfficialKnockoutSlotId,
} from "./resolveOfficialKnockoutSlot";

function standing(group: GroupStanding["group"], rows: GroupStanding["rows"]): GroupStanding {
  return { group, rows };
}

describe("knockout identity", () => {
  const teams: Record<string, Team> = {
    ger: { id: "ger", name: "Germany", shortName: "GER", abbreviation: "GER", group: "E", rating: 90 },
    par: { id: "par", name: "Paraguay", shortName: "PAR", abbreviation: "PAR", group: "D", rating: 80 },
    ned: { id: "ned", name: "Netherlands", shortName: "NED", abbreviation: "NED", group: "F", rating: 85 },
    mar: { id: "mar", name: "Morocco", shortName: "MAR", abbreviation: "MAR", group: "C", rating: 82 },
  };

  const standings: GroupStanding[] = [
    standing("E", [
      { teamId: "ger", group: "E", played: 3, wins: 2, draws: 0, losses: 1, goalsFor: 6, goalsAgainst: 2, goalDifference: 4, points: 6, conduct: 0 },
      { teamId: "crc", group: "E", played: 3, wins: 1, draws: 0, losses: 2, goalsFor: 3, goalsAgainst: 4, goalDifference: -1, points: 3, conduct: 0 },
      { teamId: "cuw", group: "E", played: 3, wins: 1, draws: 0, losses: 2, goalsFor: 2, goalsAgainst: 5, goalDifference: -3, points: 3, conduct: 0 },
      { teamId: "civ", group: "E", played: 3, wins: 0, draws: 0, losses: 3, goalsFor: 1, goalsAgainst: 6, goalDifference: -5, points: 0, conduct: 0 },
    ]),
    standing("D", [
      { teamId: "fra", group: "D", played: 3, wins: 3, draws: 0, losses: 0, goalsFor: 7, goalsAgainst: 1, goalDifference: 6, points: 9, conduct: 0 },
      { teamId: "ned", group: "D", played: 3, wins: 2, draws: 0, losses: 1, goalsFor: 5, goalsAgainst: 3, goalDifference: 2, points: 6, conduct: 0 },
      { teamId: "par", group: "D", played: 3, wins: 1, draws: 0, losses: 2, goalsFor: 3, goalsAgainst: 5, goalDifference: -2, points: 3, conduct: 0 },
      { teamId: "per", group: "D", played: 3, wins: 0, draws: 0, losses: 3, goalsFor: 1, goalsAgainst: 7, goalDifference: -6, points: 0, conduct: 0 },
    ]),
    standing("F", [
      { teamId: "ned", group: "F", played: 3, wins: 2, draws: 0, losses: 1, goalsFor: 5, goalsAgainst: 2, goalDifference: 3, points: 6, conduct: 0 },
      { teamId: "par", group: "F", played: 3, wins: 1, draws: 0, losses: 2, goalsFor: 2, goalsAgainst: 4, goalDifference: -2, points: 3, conduct: 0 },
      { teamId: "hai", group: "F", played: 3, wins: 1, draws: 0, losses: 2, goalsFor: 2, goalsAgainst: 3, goalDifference: -1, points: 3, conduct: 0 },
      { teamId: "swe", group: "F", played: 3, wins: 0, draws: 0, losses: 3, goalsFor: 1, goalsAgainst: 5, goalDifference: -4, points: 0, conduct: 0 },
    ]),
    standing("C", [
      { teamId: "bra", group: "C", played: 3, wins: 3, draws: 0, losses: 0, goalsFor: 6, goalsAgainst: 1, goalDifference: 5, points: 9, conduct: 0 },
      { teamId: "crc", group: "C", played: 3, wins: 1, draws: 1, losses: 1, goalsFor: 3, goalsAgainst: 3, goalDifference: 0, points: 4, conduct: 0 },
      { teamId: "mar", group: "C", played: 3, wins: 1, draws: 0, losses: 2, goalsFor: 2, goalsAgainst: 4, goalDifference: -2, points: 3, conduct: 0 },
      { teamId: "cuw", group: "C", played: 3, wins: 0, draws: 0, losses: 3, goalsFor: 0, goalsAgainst: 4, goalDifference: -4, points: 0, conduct: 0 },
    ]),
  ];

  it("maps NED vs MAR to M76 slot seeds (FIFA schedule)", () => {
    const match: MergedMatch = {
      id: "760488",
      homeTeamId: "ned",
      awayTeamId: "mar",
      status: "live",
      source: "espn",
      homeConduct: 0,
      awayConduct: 0,
    };

    expect(liveMatchFitsR32Slot(match, "1F", "3C", standings, teams)).toBe(true);
    expect(liveMatchFitsR32Slot(match, "1E", "3D", standings, teams)).toBe(false);
    expect(findOfficialR32SlotForLiveMatch(match, standings, teams)).toBe("M76");
  });

  it("rejects wrong stored id when team pair belongs to a different slot", () => {
    const match: MergedMatch = {
      id: "M86",
      matchId: "M86",
      homeTeamId: "ned",
      awayTeamId: "mar",
      status: "completed",
      locked: true,
      homeScore: 2,
      awayScore: 1,
      source: "espn",
      homeConduct: 0,
      awayConduct: 0,
    };

    expect(resolveOfficialKnockoutSlotId(match, "M86", standings, teams)).toBe("M76");
  });

  it("maps GER vs PAR to M75 when stored id is wrong", () => {
    const match: MergedMatch = {
      id: "M76",
      matchId: "M76",
      homeTeamId: "ger",
      awayTeamId: "par",
      status: "completed",
      locked: true,
      homeScore: 1,
      awayScore: 1,
      penaltyShootout: { homeScore: 3, awayScore: 4 },
      source: "espn",
      homeConduct: 0,
      awayConduct: 0,
    };

    expect(liveMatchFitsR32Slot(match, "1E", "3D", standings, teams)).toBe(true);
    expect(resolveOfficialKnockoutSlotId(match, "M76", standings, teams)).toBe("M75");
  });
});
