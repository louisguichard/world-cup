import { describe, expect, it } from "vitest";
import type { GroupStanding, MergedMatch, Team } from "../../types";
import { liveMatchFitsR32Slot, resolveOfficialKnockoutSlotId } from "./resolveOfficialKnockoutSlot";

describe("resolveOfficialKnockoutSlot", () => {
  const teams: Record<string, Team> = {
    ger: { id: "ger", name: "Germany", shortName: "GER", abbreviation: "GER", group: "E", rating: 90 },
    par: { id: "par", name: "Paraguay", shortName: "PAR", abbreviation: "PAR", group: "D", rating: 80 },
  };

  const standings: GroupStanding[] = [
    {
      group: "E",
      rows: [
        { teamId: "ger", group: "E", played: 3, wins: 2, draws: 0, losses: 1, goalsFor: 6, goalsAgainst: 2, goalDifference: 4, points: 6, conduct: 0 },
        { teamId: "crc", group: "E", played: 3, wins: 1, draws: 0, losses: 2, goalsFor: 3, goalsAgainst: 4, goalDifference: -1, points: 3, conduct: 0 },
        { teamId: "cuw", group: "E", played: 3, wins: 1, draws: 0, losses: 2, goalsFor: 2, goalsAgainst: 5, goalDifference: -3, points: 3, conduct: 0 },
        { teamId: "civ", group: "E", played: 3, wins: 0, draws: 0, losses: 3, goalsFor: 1, goalsAgainst: 6, goalDifference: -5, points: 0, conduct: 0 },
      ],
    },
    {
      group: "D",
      rows: [
        { teamId: "fra", group: "D", played: 3, wins: 3, draws: 0, losses: 0, goalsFor: 7, goalsAgainst: 1, goalDifference: 6, points: 9, conduct: 0 },
        { teamId: "ned", group: "D", played: 3, wins: 2, draws: 0, losses: 1, goalsFor: 5, goalsAgainst: 3, goalDifference: 2, points: 6, conduct: 0 },
        { teamId: "par", group: "D", played: 3, wins: 1, draws: 0, losses: 2, goalsFor: 3, goalsAgainst: 5, goalDifference: -2, points: 3, conduct: 0 },
        { teamId: "per", group: "D", played: 3, wins: 0, draws: 0, losses: 3, goalsFor: 1, goalsAgainst: 7, goalDifference: -6, points: 0, conduct: 0 },
      ],
    },
  ];

  it("trusts stored bracket match id before seed or venue heuristics", () => {
    const match: MergedMatch = {
      id: "M75",
      matchId: "M75",
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
    expect(resolveOfficialKnockoutSlotId(match, "M75", standings, teams)).toBe("M75");
  });

  it("resolves by seed when stored id is not a bracket match id", () => {
    const match: MergedMatch = {
      id: "espn-401547",
      homeTeamId: "ger",
      awayTeamId: "par",
      status: "live",
      source: "espn",
      homeConduct: 0,
      awayConduct: 0,
    };

    expect(resolveOfficialKnockoutSlotId(match, "espn-401547", standings, teams)).toBe("M76");
  });
});
